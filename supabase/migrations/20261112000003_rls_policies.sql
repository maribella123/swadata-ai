-- =============================================================================
-- SwaData AI — Row Level Security
-- Every table has RLS enabled. Writes that cross trust boundaries (reviews,
-- role changes, release approval) only happen through SECURITY DEFINER RPCs
-- in the previous migration, which perform their own authorization.
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'roles','users','user_roles','languages','language_varieties','user_languages','content_categories',
    'data_licenses','contributions','contribution_permissions','text_content','translation_sources','translations',
    'audio_assets','documents','document_extractions','conversation_messages','cultural_metadata',
    'review_assignments','reviews','quality_checks','annotations','consents','audit_logs','datasets',
    'dataset_releases','dataset_items','dataset_exports','dataset_access_requests','models','training_runs',
    'evaluations','processing_jobs','contact_messages','system_settings','rate_limits']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- RLS is enabled but not forced: SECURITY DEFINER helpers owned by the table
-- owner can read across rows (needed for role checks without recursion).

-- ---------------------------------------------------------------------------
-- Reference data: readable by everyone, writable by admins
-- ---------------------------------------------------------------------------
create policy roles_read on public.roles for select using (true);

create policy languages_read on public.languages for select using (true);
create policy languages_admin_write on public.languages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy varieties_read on public.language_varieties for select using (true);
create policy varieties_admin_write on public.language_varieties for all to authenticated
  using (public.has_any_role('{linguist,admin,super_admin}')) with check (public.has_any_role('{linguist,admin,super_admin}'));

create policy categories_read on public.content_categories for select using (true);
create policy categories_admin_write on public.content_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy licenses_read on public.data_licenses for select using (true);
create policy licenses_admin_write on public.data_licenses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy settings_public_read on public.system_settings for select using (is_public or public.is_admin());
create policy settings_admin_write on public.system_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Users & roles
-- ---------------------------------------------------------------------------
create policy users_self_read on public.users for select to authenticated
  using (id = auth.uid() or public.is_reviewer() or public.is_admin());
create policy users_self_update on public.users for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.has_role('linguist'));
-- Inserts/deletes happen through set_user_role(); admins may also manage directly (guarded by trigger).
create policy user_roles_admin_insert on public.user_roles for insert to authenticated with check (public.is_admin());
create policy user_roles_admin_delete on public.user_roles for delete to authenticated using (public.is_admin());

create policy user_languages_own on public.user_languages for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_languages_staff_read on public.user_languages for select to authenticated
  using (public.is_reviewer());

-- ---------------------------------------------------------------------------
-- Contributions
-- ---------------------------------------------------------------------------
-- Ownership is checked inline so INSERT ... RETURNING works (a STABLE helper
-- cannot see the row being inserted within the same statement).
create policy contributions_read on public.contributions for select to authenticated
  using (contributor_id = auth.uid() or public.can_view_contribution(id));
create policy contributions_insert_own on public.contributions for insert to authenticated
  with check (contributor_id = auth.uid() and status in ('draft', 'submitted') and data_layer = 'raw');
create policy contributions_update_own on public.contributions for update to authenticated
  using (contributor_id = auth.uid() or public.is_admin())
  with check (contributor_id = auth.uid() or public.is_admin());
create policy contributions_delete_draft on public.contributions for delete to authenticated
  using ((contributor_id = auth.uid() and status = 'draft') or public.has_role('super_admin'));

create policy permissions_read on public.contribution_permissions for select to authenticated
  using (public.can_view_contribution(contribution_id));
create policy permissions_insert_own on public.contribution_permissions for insert to authenticated
  with check (declared_by = auth.uid() and public.owns_open_contribution(contribution_id));
-- Contributors may narrow (or widen) consent on their own work at any time.
create policy permissions_update_own on public.contribution_permissions for update to authenticated
  using (exists (select 1 from public.contributions c where c.id = contribution_id and c.contributor_id = auth.uid()))
  with check (allow_collection and exists (select 1 from public.contributions c where c.id = contribution_id and c.contributor_id = auth.uid()));

create policy text_read on public.text_content for select to authenticated
  using (public.can_view_contribution(contribution_id));
create policy text_insert_own on public.text_content for insert to authenticated
  with check (created_by = auth.uid() and public.owns_open_contribution(contribution_id));

create policy translations_read on public.translations for select to authenticated
  using (public.can_view_contribution(contribution_id));
create policy translations_insert_own on public.translations for insert to authenticated
  with check (public.owns_open_contribution(contribution_id));

create policy tsources_read on public.translation_sources for select using (is_active or public.is_reviewer());
create policy tsources_staff_write on public.translation_sources for all to authenticated
  using (public.has_any_role('{linguist,admin,super_admin}')) with check (public.has_any_role('{linguist,admin,super_admin}'));

create policy audio_read on public.audio_assets for select to authenticated
  using (public.can_view_contribution(contribution_id));
create policy audio_insert_own on public.audio_assets for insert to authenticated
  with check (public.owns_open_contribution(contribution_id) and split_part(storage_path, '/', 1) = auth.uid()::text);

create policy documents_read on public.documents for select to authenticated
  using (public.can_view_contribution(contribution_id));
create policy documents_insert_own on public.documents for insert to authenticated
  with check (public.owns_open_contribution(contribution_id) and split_part(storage_path, '/', 1) = auth.uid()::text
              and rights_status in ('unverified', 'pending_verification'));

create policy extractions_read on public.document_extractions for select to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id and public.can_view_contribution(d.contribution_id)));

create policy messages_read on public.conversation_messages for select to authenticated
  using (public.can_view_contribution(contribution_id));
create policy messages_insert_own on public.conversation_messages for insert to authenticated
  with check (public.owns_open_contribution(contribution_id));

create policy cultural_read on public.cultural_metadata for select to authenticated
  using (public.can_view_contribution(contribution_id));
create policy cultural_insert_own on public.cultural_metadata for insert to authenticated
  with check (public.owns_open_contribution(contribution_id));

-- ---------------------------------------------------------------------------
-- Review data
-- ---------------------------------------------------------------------------
create policy reviews_read on public.reviews for select to authenticated
  using (public.can_view_contribution(contribution_id));

create policy assignments_read on public.review_assignments for select to authenticated
  using (reviewer_id = auth.uid() or public.has_any_role('{linguist,admin,super_admin}'));

create policy quality_read on public.quality_checks for select to authenticated
  using (public.can_view_contribution(contribution_id));

create policy annotations_read on public.annotations for select to authenticated
  using (public.can_view_contribution(contribution_id));
create policy annotations_reviewer_insert on public.annotations for insert to authenticated
  with check (annotator_id = auth.uid() and public.is_reviewer() and public.can_view_contribution(contribution_id));
create policy annotations_own_delete on public.annotations for delete to authenticated
  using (annotator_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Consent & governance
-- ---------------------------------------------------------------------------
create policy consents_own_read on public.consents for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy consents_own_insert on public.consents for insert to authenticated
  with check (user_id = auth.uid());
create policy consents_own_revoke on public.consents for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());

create policy contact_insert on public.contact_messages for insert to anon, authenticated with check (status = 'new');
create policy contact_admin on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_admin_update on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- rate_limits: no policies (service role / definer functions only)

-- ---------------------------------------------------------------------------
-- Datasets
-- ---------------------------------------------------------------------------
-- Dataset documentation (data cards) is public so the repository is transparent.
create policy datasets_read on public.datasets for select using (is_active or public.is_admin());
create policy datasets_admin_write on public.datasets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy releases_read on public.dataset_releases for select
  using (status = 'published' or public.is_admin());
create policy releases_admin_insert on public.dataset_releases for insert to authenticated
  with check (public.is_admin() and status in ('draft', 'pending_approval') and created_by = auth.uid());
create policy releases_admin_update on public.dataset_releases for update to authenticated
  using (public.is_admin() and status in ('draft', 'pending_approval'))
  with check (public.is_admin() and status in ('draft', 'pending_approval', 'retired'));

-- Items (provenance) visible to anyone with access to a published release.
create policy items_read on public.dataset_items for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.dataset_releases r where r.id = release_id and r.status = 'published'
      and public.can_access_dataset(r.dataset_id)));

create policy exports_read on public.dataset_exports for select
  using (public.is_admin() or exists (
    select 1 from public.dataset_releases r where r.id = release_id and r.status = 'published'));
create policy exports_admin_insert on public.dataset_exports for insert to authenticated
  with check (public.is_admin() and requested_by = auth.uid());

create policy access_requests_own on public.dataset_access_requests for select to authenticated
  using (requester_id = auth.uid() or public.is_admin());
create policy access_requests_insert on public.dataset_access_requests for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending' and public.is_researcher());

-- ---------------------------------------------------------------------------
-- AI Lab
-- ---------------------------------------------------------------------------
create policy models_read on public.models for select to authenticated using (public.is_researcher());
create policy models_admin on public.models for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy runs_read on public.training_runs for select to authenticated using (public.is_researcher());
create policy runs_admin on public.training_runs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy evals_read on public.evaluations for select to authenticated using (public.is_researcher());
create policy evals_admin on public.evaluations for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Processing jobs
-- ---------------------------------------------------------------------------
create policy jobs_read on public.processing_jobs for select to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Admins may re-queue failed jobs.
create policy jobs_admin_update on public.processing_jobs for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy jobs_admin_insert on public.processing_jobs for insert to authenticated
  with check (public.is_admin());
