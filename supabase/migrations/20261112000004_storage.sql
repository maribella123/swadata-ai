-- =============================================================================
-- SwaData AI — private storage buckets & object policies
-- Paths: {user_id}/{uuid}/{sanitised-filename}
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('audio', 'audio', false, 52428800, array[
    'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3', 'audio/webm',
    'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac']),
  ('documents', 'documents', false, 52428800, array[
    'application/pdf', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/epub+zip', 'image/png', 'image/jpeg', 'image/tiff', 'image/webp']),
  ('dataset-exports', 'dataset-exports', false, null, null)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Uploads: only into your own folder.
create policy "contrib uploads: insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('audio', 'documents') and (storage.foldername(name))[1] = auth.uid()::text);

-- Reads: your own files, or files attached to a contribution you may view.
create policy "contrib uploads: read own or reviewable" on storage.objects for select to authenticated
  using (
    bucket_id in ('audio', 'documents') and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.audio_assets a where a.storage_path = name and bucket_id = 'audio'
                 and public.can_view_contribution(a.contribution_id))
      or exists (select 1 from public.documents d where d.storage_path = name and bucket_id = 'documents'
                 and public.can_view_contribution(d.contribution_id))
    )
  );

-- Deletes: only your own files that are not yet attached to a submission
-- (e.g. discarding a recording before submitting). Submitted originals are preserved.
create policy "contrib uploads: delete unattached own" on storage.objects for delete to authenticated
  using (
    bucket_id in ('audio', 'documents') and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.audio_assets a where a.storage_path = name)
    and not exists (select 1 from public.documents d where d.storage_path = name)
  );

-- Dataset exports: written by the processing service (service role);
-- downloadable only for published releases the user may access.
create policy "dataset exports: read permitted" on storage.objects for select to authenticated
  using (
    bucket_id = 'dataset-exports' and (
      public.is_admin()
      or exists (
        select 1 from public.dataset_exports e
        join public.dataset_releases r on r.id = e.release_id
        where e.storage_path = name and e.status = 'completed' and r.status = 'published'
          and public.can_access_dataset(r.dataset_id))
    )
  );
create policy "dataset exports: public read" on storage.objects for select to anon
  using (
    bucket_id = 'dataset-exports' and exists (
      select 1 from public.dataset_exports e
      join public.dataset_releases r on r.id = e.release_id
      join public.datasets d on d.id = r.dataset_id
      where e.storage_path = name and e.status = 'completed' and r.status = 'published' and d.access_level = 'public')
  );
