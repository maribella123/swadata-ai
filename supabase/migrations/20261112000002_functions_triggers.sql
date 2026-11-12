-- =============================================================================
-- SwaData AI — authorization helpers, workflow RPCs, triggers
-- Authorization is enforced here and in RLS; the frontend only mirrors it.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so they can read user_roles under RLS)
-- ---------------------------------------------------------------------------
create or replace function public.current_roles()
returns public.app_role[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(r.key), '{}')
  from public.user_roles ur join public.roles r on r.id = ur.role_id
  join public.users u on u.id = ur.user_id
  where ur.user_id = auth.uid() and u.is_active
$$;

create or replace function public.has_any_role(wanted public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.users u on u.id = ur.user_id
    where ur.user_id = auth.uid() and u.is_active and r.key = any (wanted)
  )
$$;

create or replace function public.has_role(wanted public.app_role)
returns boolean language sql stable as $$ select public.has_any_role(array[wanted]) $$;

create or replace function public.is_admin()
returns boolean language sql stable as $$ select public.has_any_role('{admin,super_admin}') $$;

create or replace function public.is_reviewer()
returns boolean language sql stable as $$ select public.has_any_role('{reviewer,linguist,admin,super_admin}') $$;

create or replace function public.is_researcher()
returns boolean language sql stable as $$ select public.has_any_role('{researcher,linguist,admin,super_admin}') $$;

create or replace function public.can_see_restricted()
returns boolean language sql stable as $$ select public.has_any_role('{linguist,admin,super_admin}') $$;

-- True when the statement runs inside a SECURITY DEFINER routine or as the
-- service role, i.e. not as a plain API user.
create or replace function public.is_privileged_context()
returns boolean language sql stable as $$
  select current_user not in ('authenticated', 'anon')
$$;

create or replace function public.can_view_contribution(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.contributions c
    where c.id = cid and (
      c.contributor_id = auth.uid()
      or (public.is_reviewer() and (c.sensitivity <> 'restricted' or public.can_see_restricted()))
    )
  )
$$;

create or replace function public.owns_open_contribution(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.contributions c
    where c.id = cid and c.contributor_id = auth.uid()
      and c.status in ('draft', 'submitted', 'changes_requested')
  )
$$;

-- ---------------------------------------------------------------------------
-- Audit logging
-- ---------------------------------------------------------------------------
create or replace function public.write_audit(p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;
revoke all on function public.write_audit(text, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_details jsonb := '{}';
begin
  if tg_op = 'DELETE' then
    v_id := old.id;
    v_details := jsonb_build_object('old', to_jsonb(old));
  elsif tg_op = 'INSERT' then
    v_id := new.id;
    v_details := jsonb_build_object('new', to_jsonb(new));
  else
    v_id := new.id;
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}')
      into v_details
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o on o.key = n.key
    where n.value is distinct from o.value and n.key not in ('updated_at');
    if v_details = '{}'::jsonb then return new; end if;
    v_details := jsonb_build_object('changes', v_details);
  end if;
  -- never copy large bodies into the audit log
  v_details := v_details #- '{new,body}' #- '{old,body}';
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, v_id, v_details);
  return coalesce(new, old);
end $$;

create trigger audit_user_roles after insert or delete on public.user_roles
  for each row execute function public.audit_trigger();
create trigger audit_languages after insert or update or delete on public.languages
  for each row execute function public.audit_trigger();
create trigger audit_language_varieties after insert or update or delete on public.language_varieties
  for each row execute function public.audit_trigger();
create trigger audit_categories after insert or update or delete on public.content_categories
  for each row execute function public.audit_trigger();
create trigger audit_licenses after insert or update or delete on public.data_licenses
  for each row execute function public.audit_trigger();
create trigger audit_datasets after insert or update or delete on public.datasets
  for each row execute function public.audit_trigger();
create trigger audit_releases after insert or update on public.dataset_releases
  for each row execute function public.audit_trigger();
create trigger audit_access_requests after insert or update on public.dataset_access_requests
  for each row execute function public.audit_trigger();
create trigger audit_consents after insert or update on public.consents
  for each row execute function public.audit_trigger();
create trigger audit_settings after insert or update on public.system_settings
  for each row execute function public.audit_trigger();
create trigger audit_permissions after insert or update on public.contribution_permissions
  for each row execute function public.audit_trigger();

-- Contributions: only audit status / layer / sensitivity transitions.
create or replace function public.audit_contribution_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'insert', 'contributions', new.id,
            jsonb_build_object('type', new.type, 'status', new.status, 'language_id', new.language_id));
  elsif new.status is distinct from old.status or new.data_layer is distinct from old.data_layer
        or new.sensitivity is distinct from old.sensitivity then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'status_change', 'contributions', new.id, jsonb_build_object(
      'status', jsonb_build_object('from', old.status, 'to', new.status),
      'data_layer', jsonb_build_object('from', old.data_layer, 'to', new.data_layer),
      'sensitivity', jsonb_build_object('from', old.sensitivity, 'to', new.sensitivity)));
  end if;
  return new;
end $$;
create trigger audit_contributions after insert or update on public.contributions
  for each row execute function public.audit_contribution_status();

-- Document rights changes are governance events.
create or replace function public.audit_document_rights()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.rights_status is distinct from old.rights_status
     or new.permission_ai_training is distinct from old.permission_ai_training
     or new.permission_to_digitise is distinct from old.permission_to_digitise
     or new.copyright_status is distinct from old.copyright_status then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'rights_change', 'documents', new.id, jsonb_build_object(
      'rights_status', jsonb_build_object('from', old.rights_status, 'to', new.rights_status),
      'copyright_status', jsonb_build_object('from', old.copyright_status, 'to', new.copyright_status),
      'permission_ai_training', jsonb_build_object('from', old.permission_ai_training, 'to', new.permission_ai_training),
      'notes', new.rights_notes));
  end if;
  return new;
end $$;
create trigger audit_documents_rights after update on public.documents
  for each row execute function public.audit_document_rights();

-- ---------------------------------------------------------------------------
-- New auth user -> profile + contributor role + terms consent
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 120);
begin
  insert into public.users (id, display_name) values (new.id, v_name)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_id)
  select new.id, r.id from public.roles r where r.key = 'contributor'
  on conflict do nothing;

  if coalesce((new.raw_user_meta_data ->> 'accepted_terms')::boolean, false) then
    insert into public.consents (user_id, consent_type, granted, policy_version)
    values (new.id, 'platform_terms', true, coalesce(new.raw_user_meta_data ->> 'policy_version', '2026-11')),
           (new.id, 'data_collection', true, coalesce(new.raw_user_meta_data ->> 'policy_version', '2026-11'));
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------
-- Users cannot elevate themselves or reactivate themselves.
create or replace function public.users_guard()
returns trigger language plpgsql as $$
begin
  if public.is_privileged_context() or public.is_admin() then
    return new;
  end if;
  if new.is_active is distinct from old.is_active or new.id is distinct from old.id
     or new.created_at is distinct from old.created_at then
    raise exception 'Not allowed to change protected profile fields' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger users_guard before update on public.users
  for each row execute function public.users_guard();

-- Contributors may only move their own records through permitted states.
create or replace function public.contributions_guard()
returns trigger language plpgsql as $$
begin
  if public.is_privileged_context() or public.is_admin() then
    return new;
  end if;

  if new.contributor_id is distinct from old.contributor_id or new.type is distinct from old.type
     or new.data_layer is distinct from old.data_layer or new.reviewed_at is distinct from old.reviewed_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Not allowed to change protected contribution fields' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status = 'submitted') or
      (old.status = 'changes_requested' and new.status = 'submitted') or
      (old.status in ('draft', 'submitted', 'changes_requested') and new.status = 'withdrawn')
    ) then
      raise exception 'Status transition % -> % is not permitted', old.status, new.status using errcode = '42501';
    end if;
    if new.status = 'submitted' then new.submitted_at := now(); end if;
  elsif old.status not in ('draft', 'submitted', 'changes_requested') then
    raise exception 'This contribution is locked while under review or after a decision' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger contributions_guard before update on public.contributions
  for each row execute function public.contributions_guard();

-- Original text versions are immutable; corrections create new versions.
create or replace function public.text_content_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'text_content rows are immutable; create a new version instead' using errcode = '42501';
end $$;
create trigger text_content_no_update before update on public.text_content
  for each row execute function public.text_content_immutable();

create or replace function public.reviews_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'reviews are append-only' using errcode = '42501';
end $$;
create trigger reviews_no_update before update on public.reviews
  for each row execute function public.reviews_immutable();

-- Only a super admin can grant or revoke admin / super_admin.
create or replace function public.user_roles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_key public.app_role;
begin
  select key into v_key from public.roles where id = coalesce(new.role_id, old.role_id);
  if current_user in ('postgres', 'supabase_admin', 'service_role') and auth.uid() is null then
    return coalesce(new, old); -- migrations, seeds, service role scripts
  end if;
  if v_key in ('admin', 'super_admin') and not public.has_role('super_admin') then
    raise exception 'Only a super administrator can change administrator roles' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' and v_key = 'super_admin' and old.user_id = auth.uid() then
    raise exception 'You cannot remove your own super administrator role' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger user_roles_guard before insert or delete on public.user_roles
  for each row execute function public.user_roles_guard();

-- Per-user submission rate limit (configurable in system_settings).
create or replace function public.contributions_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit integer;
  v_count integer;
begin
  select coalesce((value #>> '{}')::integer, 120) into v_limit
  from public.system_settings where key = 'max_contributions_per_hour';
  v_limit := coalesce(v_limit, 120);
  select count(*) into v_count from public.contributions
  where contributor_id = new.contributor_id and created_at > now() - interval '1 hour';
  if v_count >= v_limit then
    raise exception 'Submission limit reached (% per hour). Please try again later.', v_limit using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger contributions_rate_limit before insert on public.contributions
  for each row execute function public.contributions_rate_limit();

-- Generic rate limiter for server-side use (contact form, auth endpoints).
create or replace function public.check_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_row public.rate_limits;
begin
  insert into public.rate_limits as rl (bucket, hits, window_start) values (p_bucket, 1, now())
  on conflict (bucket) do update set
    hits = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning * into v_row;
  return v_row.hits <= p_max;
end $$;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Automatic quality checks + job queueing
-- ---------------------------------------------------------------------------
create or replace function public.text_content_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_dup uuid;
begin
  if new.version = 1 then
    update public.contributions set content_hash = new.normalized_hash where id = new.contribution_id;

    select tc.contribution_id into v_dup from public.text_content tc
    join public.contributions c on c.id = tc.contribution_id
    where tc.normalized_hash = new.normalized_hash and tc.contribution_id <> new.contribution_id
      and c.status not in ('rejected', 'withdrawn')
    order by tc.created_at limit 1;

    insert into public.quality_checks (contribution_id, check_type, passed, details)
    values (new.contribution_id, 'exact_duplicate', v_dup is null,
            case when v_dup is null then '{}'::jsonb else jsonb_build_object('duplicate_of', v_dup) end);

    insert into public.quality_checks (contribution_id, check_type, passed, score, details)
    values (new.contribution_id, 'length', new.char_count >= 2, new.char_count,
            jsonb_build_object('chars', new.char_count, 'words', new.word_count));
  end if;
  return new;
end $$;
create trigger text_content_after_insert after insert on public.text_content
  for each row execute function public.text_content_after_insert();

create or replace function public.enqueue_document_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.processing_jobs (job_type, entity_id, created_by, payload)
  values ('document_extract', new.id, auth.uid(),
          jsonb_build_object('file_type', new.file_type, 'is_scanned', new.is_scanned, 'is_poetry', new.is_poetry));
  return new;
end $$;
create trigger documents_enqueue after insert on public.documents
  for each row execute function public.enqueue_document_job();

create or replace function public.enqueue_audio_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.processing_jobs (job_type, entity_id, created_by)
  values ('audio_analyze', new.id, auth.uid());
  return new;
end $$;
create trigger audio_enqueue after insert on public.audio_assets
  for each row execute function public.enqueue_audio_job();

-- Worker claims the next job atomically (service role only).
create or replace function public.claim_next_job(p_types public.job_type[] default null)
returns public.processing_jobs language plpgsql security definer set search_path = public as $$
declare
  v_job public.processing_jobs;
begin
  select * into v_job from public.processing_jobs
  where (status = 'queued' or (status = 'processing' and locked_at < now() - interval '30 minutes'))
    and attempts < max_attempts
    and (p_types is null or job_type = any (p_types))
  order by created_at
  for update skip locked
  limit 1;
  if v_job.id is null then return null; end if;
  update public.processing_jobs
     set status = 'processing', attempts = attempts + 1, locked_at = now(), started_at = coalesce(started_at, now())
   where id = v_job.id
  returning * into v_job;
  return v_job;
end $$;
revoke all on function public.claim_next_job(public.job_type[]) from public, anon, authenticated;
grant execute on function public.claim_next_job(public.job_type[]) to service_role;

-- ---------------------------------------------------------------------------
-- Contribution submission (SECURITY INVOKER: atomic, RLS still applies)
-- ---------------------------------------------------------------------------
create or replace function public.submit_contribution(p jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_type  public.contribution_type := (p ->> 'type')::public.contribution_type;
  v_id    uuid;
  v_perm  jsonb := coalesce(p -> 'permissions', '{}');
  v_msg   jsonb;
  v_seq   integer := 0;
  v_text  text;
  v_path  text;
  v_lang  uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not coalesce((v_perm ->> 'allow_collection')::boolean, false) then
    raise exception 'You must grant permission for data collection to submit' using errcode = '22023';
  end if;

  select id into v_lang from public.languages where id = (p ->> 'language_id')::uuid and is_active;
  if v_lang is null then
    raise exception 'Please choose an active language' using errcode = '22023';
  end if;

  insert into public.contributions (contributor_id, type, status, language_id, variety_id, category_id, title,
                                    source_type, is_original, source_reference, license_id, sensitivity, metadata, submitted_at)
  values (v_uid, v_type,
          case when coalesce((p ->> 'draft')::boolean, false) then 'draft'::public.contribution_status else 'submitted' end,
          v_lang,
          nullif(p ->> 'variety_id', '')::uuid,
          nullif(p ->> 'category_id', '')::uuid,
          left(coalesce(p ->> 'title', ''), 300),
          coalesce(nullif(p ->> 'source_type', ''), 'original'),
          coalesce((p ->> 'is_original')::boolean, true),
          left(coalesce(p ->> 'source_reference', ''), 1000),
          nullif(p ->> 'license_id', '')::uuid,
          coalesce(nullif(p ->> 'sensitivity', ''), 'public')::public.sensitivity_level,
          coalesce(p -> 'metadata', '{}'),
          case when coalesce((p ->> 'draft')::boolean, false) then null else now() end)
  returning id into v_id;

  insert into public.contribution_permissions (contribution_id, allow_collection, allow_research, allow_public_release,
                                               allow_ai_training, allow_commercial, rights_holder, declaration_text, declared_by)
  values (v_id, true,
          coalesce((v_perm ->> 'allow_research')::boolean, false),
          coalesce((v_perm ->> 'allow_public_release')::boolean, false),
          coalesce((v_perm ->> 'allow_ai_training')::boolean, false),
          coalesce((v_perm ->> 'allow_commercial')::boolean, false),
          left(coalesce(v_perm ->> 'rights_holder', ''), 300),
          coalesce(v_perm ->> 'declaration_text', ''),
          v_uid);

  if v_type = 'text' then
    insert into public.text_content (contribution_id, version, body, context, is_original, created_by)
    values (v_id, 1, p ->> 'body', coalesce(p ->> 'context', ''), true, v_uid);

  elsif v_type = 'translation' then
    insert into public.translations (contribution_id, source_id, source_language_id, target_language_id,
                                     source_text, target_text, domain, notes)
    values (v_id, nullif(p ->> 'source_id', '')::uuid, (p ->> 'source_language_id')::uuid, v_lang,
            p ->> 'source_text', p ->> 'target_text', coalesce(nullif(p ->> 'domain', ''), 'general'), coalesce(p ->> 'notes', ''));
    insert into public.text_content (contribution_id, version, body, context, is_original, created_by)
    values (v_id, 1, p ->> 'target_text', coalesce(p ->> 'notes', ''), true, v_uid);

  elsif v_type = 'conversation' then
    if jsonb_array_length(coalesce(p -> 'messages', '[]')) < 2 then
      raise exception 'A conversation needs at least two messages' using errcode = '22023';
    end if;
    for v_msg in select * from jsonb_array_elements(p -> 'messages') loop
      v_seq := v_seq + 1;
      insert into public.conversation_messages (contribution_id, seq, speaker_role, speaker_label, text, gloss_en)
      values (v_id, v_seq, v_msg ->> 'speaker_role', coalesce(v_msg ->> 'speaker_label', ''),
              v_msg ->> 'text', coalesce(v_msg ->> 'gloss_en', ''));
      v_text := concat_ws(E'\n', v_text, (v_msg ->> 'speaker_role') || ': ' || (v_msg ->> 'text'));
    end loop;
    insert into public.text_content (contribution_id, version, body, is_original, created_by)
    values (v_id, 1, v_text, true, v_uid);

  elsif v_type = 'cultural' then
    insert into public.cultural_metadata (contribution_id, kind, original_expression, meaning, literal_translation,
                                          usage_context, region_origin, community_origin, access_notes)
    values (v_id, (p ->> 'kind')::public.cultural_kind, p ->> 'original_expression', coalesce(p ->> 'meaning', ''),
            coalesce(p ->> 'literal_translation', ''), coalesce(p ->> 'usage_context', ''),
            coalesce(p ->> 'region_origin', ''), coalesce(p ->> 'community_origin', ''), coalesce(p ->> 'access_notes', ''));
    insert into public.text_content (contribution_id, version, body, context, is_original, created_by)
    values (v_id, 1, p ->> 'original_expression', coalesce(p ->> 'usage_context', ''), true, v_uid);

  elsif v_type = 'audio' then
    v_path := p ->> 'storage_path';
    if v_path is null or split_part(v_path, '/', 1) <> v_uid::text then
      raise exception 'Invalid audio storage path' using errcode = '42501';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'audio' and name = v_path) then
      raise exception 'Audio file not found in storage. Please upload again.' using errcode = '22023';
    end if;
    insert into public.audio_assets (contribution_id, storage_path, original_filename, mime_type, file_size_bytes,
                                     duration_seconds, recording_method, speaker_pseudonym, speaker_age_band, speaker_gender,
                                     recording_environment, prompt_text, transcript, transcript_source, consent_recording,
                                     consent_ai_training, checksum_sha256)
    values (v_id, v_path, coalesce(p ->> 'original_filename', ''), p ->> 'mime_type', (p ->> 'file_size_bytes')::bigint,
            nullif(p ->> 'duration_seconds', '')::numeric, coalesce(nullif(p ->> 'recording_method', ''), 'upload'),
            p ->> 'speaker_pseudonym', coalesce(nullif(p ->> 'speaker_age_band', ''), 'undisclosed'),
            coalesce(nullif(p ->> 'speaker_gender', ''), 'undisclosed'), coalesce(p ->> 'recording_environment', ''),
            coalesce(p ->> 'prompt_text', ''), coalesce(p ->> 'transcript', ''),
            case when coalesce(p ->> 'transcript', '') = '' then 'none' else 'contributor' end,
            coalesce((p ->> 'consent_recording')::boolean, false),
            coalesce((p ->> 'consent_ai_training')::boolean, false), nullif(p ->> 'checksum_sha256', ''));
    if coalesce(p ->> 'transcript', '') <> '' then
      insert into public.text_content (contribution_id, version, body, is_original, created_by, change_note)
      values (v_id, 1, p ->> 'transcript', true, v_uid, 'Contributor transcript');
    end if;

  elsif v_type = 'document' then
    v_path := p ->> 'storage_path';
    if v_path is null or split_part(v_path, '/', 1) <> v_uid::text then
      raise exception 'Invalid document storage path' using errcode = '42501';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'documents' and name = v_path) then
      raise exception 'Document not found in storage. Please upload again.' using errcode = '22023';
    end if;
    insert into public.documents (contribution_id, storage_path, original_filename, mime_type, file_type, file_size_bytes,
                                  checksum_sha256, title, author, publication_year, publisher, source, isbn, genre,
                                  copyright_status, license_id, permission_to_digitise, permission_ai_training,
                                  is_scanned, is_poetry, rights_status)
    values (v_id, v_path, p ->> 'original_filename', p ->> 'mime_type', p ->> 'file_type', (p ->> 'file_size_bytes')::bigint,
            nullif(p ->> 'checksum_sha256', ''), p ->> 'title', coalesce(p ->> 'author', ''),
            nullif(p ->> 'publication_year', '')::smallint, coalesce(p ->> 'publisher', ''), coalesce(p ->> 'doc_source', ''),
            coalesce(p ->> 'isbn', ''), coalesce(nullif(p ->> 'genre', ''), 'other'),
            coalesce(nullif(p ->> 'copyright_status', ''), 'unknown')::public.copyright_status,
            nullif(p ->> 'license_id', '')::uuid,
            coalesce((p ->> 'permission_to_digitise')::boolean, false),
            coalesce((p ->> 'permission_ai_training')::boolean, false),
            coalesce((p ->> 'is_scanned')::boolean, false),
            coalesce((p ->> 'is_poetry')::boolean, false),
            'pending_verification');
  else
    raise exception 'Unsupported contribution type' using errcode = '22023';
  end if;

  return v_id;
end $$;
grant execute on function public.submit_contribution(jsonb) to authenticated;

-- Contributor resubmits after "changes requested" with a new text version.
create or replace function public.resubmit_contribution(p_contribution_id uuid, p_body text, p_note text default '')
returns integer language plpgsql security invoker set search_path = public as $$
declare
  v_version integer;
begin
  if not exists (select 1 from public.contributions where id = p_contribution_id
                 and contributor_id = auth.uid() and status = 'changes_requested') then
    raise exception 'Only your own contributions with requested changes can be resubmitted' using errcode = '42501';
  end if;
  if coalesce(btrim(p_body), '') <> '' then
    select coalesce(max(version), 0) + 1 into v_version from public.text_content where contribution_id = p_contribution_id;
    insert into public.text_content (contribution_id, version, body, is_original, created_by, change_note)
    values (p_contribution_id, v_version, p_body, false, auth.uid(), coalesce(p_note, 'Contributor revision'));
  end if;
  update public.contributions set status = 'submitted' where id = p_contribution_id;
  return v_version;
end $$;
grant execute on function public.resubmit_contribution(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Review workflow (SECURITY DEFINER with explicit authorization)
-- ---------------------------------------------------------------------------
create or replace function public.claim_review(p_contribution_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_c public.contributions;
begin
  if not public.is_reviewer() then
    raise exception 'Reviewer role required' using errcode = '42501';
  end if;
  select * into v_c from public.contributions where id = p_contribution_id for update;
  if v_c.id is null or not public.can_view_contribution(p_contribution_id) then
    raise exception 'Contribution not found' using errcode = 'P0002';
  end if;
  if v_c.contributor_id = auth.uid() then
    raise exception 'You cannot review your own contribution' using errcode = '42501';
  end if;
  if exists (select 1 from public.review_assignments where contribution_id = p_contribution_id and status = 'active'
             and reviewer_id <> auth.uid()) then
    raise exception 'Already assigned to another reviewer' using errcode = 'P0001';
  end if;
  insert into public.review_assignments (contribution_id, reviewer_id, assigned_by)
  values (p_contribution_id, auth.uid(), auth.uid())
  on conflict do nothing;
  if v_c.status = 'submitted' then
    update public.contributions set status = 'in_review' where id = p_contribution_id;
  end if;
end $$;
grant execute on function public.claim_review(uuid) to authenticated;

create or replace function public.assign_reviewer(p_contribution_id uuid, p_reviewer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role('{linguist,admin,super_admin}') then
    raise exception 'Only linguists and administrators can assign reviews' using errcode = '42501';
  end if;
  if not exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
                 where ur.user_id = p_reviewer_id and r.key in ('reviewer', 'linguist', 'admin', 'super_admin')) then
    raise exception 'Selected user is not a reviewer' using errcode = '22023';
  end if;
  if exists (select 1 from public.contributions where id = p_contribution_id and contributor_id = p_reviewer_id) then
    raise exception 'A contributor cannot review their own work' using errcode = '22023';
  end if;
  update public.review_assignments set status = 'released', completed_at = now()
   where contribution_id = p_contribution_id and status = 'active';
  insert into public.review_assignments (contribution_id, reviewer_id, assigned_by)
  values (p_contribution_id, p_reviewer_id, auth.uid());
  update public.contributions set status = 'in_review' where id = p_contribution_id and status = 'submitted';
  perform public.write_audit('assign_reviewer', 'contributions', p_contribution_id, jsonb_build_object('reviewer_id', p_reviewer_id));
end $$;
grant execute on function public.assign_reviewer(uuid, uuid) to authenticated;

create or replace function public.submit_review(
  p_contribution_id uuid,
  p_decision public.review_decision,
  p_comment text default '',
  p_scores jsonb default '{}',
  p_corrected_text text default null,
  p_sensitivity public.sensitivity_level default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_c        public.contributions;
  v_new      public.contribution_status;
  v_version  integer;
  v_review   uuid;
  v_latest   text;
  v_k        text;
begin
  if not public.is_reviewer() then
    raise exception 'Reviewer role required' using errcode = '42501';
  end if;
  select * into v_c from public.contributions where id = p_contribution_id for update;
  if v_c.id is null or not public.can_view_contribution(p_contribution_id) then
    raise exception 'Contribution not found' using errcode = 'P0002';
  end if;
  if v_c.contributor_id = auth.uid() then
    raise exception 'You cannot review your own contribution' using errcode = '42501';
  end if;
  if v_c.status in ('draft', 'withdrawn') then
    raise exception 'This contribution is not open for review' using errcode = 'P0001';
  end if;
  if v_c.status in ('approved', 'rejected') and not public.has_any_role('{linguist,admin,super_admin}') then
    raise exception 'Only linguists or administrators can revisit a final decision' using errcode = '42501';
  end if;
  if p_decision in ('reject', 'request_changes') and coalesce(btrim(p_comment), '') = '' then
    raise exception 'Please explain the decision in a comment' using errcode = '22023';
  end if;
  -- validate score scale 1..5
  for v_k in select jsonb_object_keys(coalesce(p_scores, '{}')) loop
    if v_k not in ('accuracy', 'fluency', 'context', 'naturalness', 'audio_quality', 'transcript_accuracy', 'cultural_accuracy', 'overall')
       or (p_scores ->> v_k)::numeric not between 1 and 5 then
      raise exception 'Invalid score %', v_k using errcode = '22023';
    end if;
  end loop;

  -- Corrections never overwrite the original: they become a new version.
  if p_corrected_text is not null and btrim(p_corrected_text) <> '' then
    select body into v_latest from public.text_content where contribution_id = p_contribution_id order by version desc limit 1;
    if v_latest is distinct from p_corrected_text then
      select coalesce(max(version), 0) + 1 into v_version from public.text_content where contribution_id = p_contribution_id;
      insert into public.text_content (contribution_id, version, body, is_original, created_by, change_note)
      values (p_contribution_id, v_version, p_corrected_text, false, auth.uid(), 'Reviewer correction');
      if v_c.type = 'audio' then
        update public.audio_assets set transcript = p_corrected_text, transcript_source = 'reviewer'
         where contribution_id = p_contribution_id;
      end if;
    end if;
  end if;
  if v_version is null then
    select max(version) into v_version from public.text_content where contribution_id = p_contribution_id;
  end if;

  v_new := case p_decision
             when 'approve' then 'approved'
             when 'reject' then 'rejected'
             when 'request_changes' then 'changes_requested'
             else case when v_c.status = 'submitted' then 'in_review' else v_c.status end
           end;

  insert into public.reviews (contribution_id, reviewer_id, decision, comment, scores, text_version, previous_status, new_status)
  values (p_contribution_id, auth.uid(), p_decision, coalesce(p_comment, ''), coalesce(p_scores, '{}'), v_version, v_c.status, v_new)
  returning id into v_review;

  update public.contributions
     set status = v_new,
         data_layer = case when v_new = 'approved' then 'validated'::public.data_layer
                           when v_new in ('rejected', 'changes_requested') then 'raw'::public.data_layer
                           else data_layer end,
         sensitivity = coalesce(p_sensitivity, sensitivity),
         reviewed_at = case when p_decision in ('approve', 'reject') then now() else reviewed_at end
   where id = p_contribution_id;

  if p_decision in ('approve', 'reject', 'request_changes') then
    update public.review_assignments set status = 'completed', completed_at = now()
     where contribution_id = p_contribution_id and status = 'active';
  end if;

  if p_scores <> '{}'::jsonb then
    insert into public.quality_checks (contribution_id, check_type, passed, score, details, checked_by)
    values (p_contribution_id, 'reviewer_scores', p_decision = 'approve',
            (select avg(value::numeric) from jsonb_each_text(p_scores)), p_scores, auth.uid());
  end if;
  return v_review;
end $$;
grant execute on function public.submit_review(uuid, public.review_decision, text, jsonb, text, public.sensitivity_level) to authenticated;

-- Reviewers approve or reject extracted document segments in bulk.
create or replace function public.review_extractions(p_ids uuid[], p_status public.item_review_status)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  if not public.is_reviewer() then
    raise exception 'Reviewer role required' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.document_extractions e
    join public.documents d on d.id = e.document_id
    join public.contributions c on c.id = d.contribution_id
    where e.id = any (p_ids) and (c.contributor_id = auth.uid() or not public.can_view_contribution(c.id))
  ) then
    raise exception 'You cannot review these segments' using errcode = '42501';
  end if;
  update public.document_extractions
     set status = p_status, reviewed_by = auth.uid(), reviewed_at = now()
   where id = any (p_ids);
  get diagnostics v_count = row_count;
  perform public.write_audit('review_extractions', 'document_extractions', null,
                             jsonb_build_object('count', v_count, 'status', p_status));
  return v_count;
end $$;
grant execute on function public.review_extractions(uuid[], public.item_review_status) to authenticated;

-- Rights verification for documents (linguists / admins).
create or replace function public.verify_document_rights(
  p_document_id uuid, p_status public.rights_status, p_notes text,
  p_copyright public.copyright_status default null, p_ai_training boolean default null, p_license uuid default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role('{linguist,admin,super_admin}') then
    raise exception 'Only linguists and administrators can verify rights' using errcode = '42501';
  end if;
  if coalesce(btrim(p_notes), '') = '' then
    raise exception 'Please record the evidence for this rights decision' using errcode = '22023';
  end if;
  update public.documents
     set rights_status = p_status,
         rights_notes = p_notes,
         rights_verified_by = auth.uid(),
         rights_verified_at = now(),
         copyright_status = coalesce(p_copyright, copyright_status),
         permission_ai_training = coalesce(p_ai_training, permission_ai_training),
         license_id = coalesce(p_license, license_id)
   where id = p_document_id;
  if not found then raise exception 'Document not found' using errcode = 'P0002'; end if;
end $$;
grant execute on function public.verify_document_rights(uuid, public.rights_status, text, public.copyright_status, boolean, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Role management
-- ---------------------------------------------------------------------------
create or replace function public.set_user_role(p_user_id uuid, p_role public.app_role, p_grant boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  if p_role in ('admin', 'super_admin') and not public.has_role('super_admin') then
    raise exception 'Only a super administrator can change administrator roles' using errcode = '42501';
  end if;
  if p_role = 'contributor' and not p_grant then
    raise exception 'The contributor role cannot be removed; deactivate the account instead' using errcode = '22023';
  end if;
  select id into v_role from public.roles where key = p_role;
  if p_grant then
    insert into public.user_roles (user_id, role_id, granted_by) values (p_user_id, v_role, auth.uid())
    on conflict do nothing;
  else
    if p_role = 'super_admin' and p_user_id = auth.uid() then
      raise exception 'You cannot remove your own super administrator role' using errcode = '42501';
    end if;
    delete from public.user_roles where user_id = p_user_id and role_id = v_role;
  end if;
end $$;
grant execute on function public.set_user_role(uuid, public.app_role, boolean) to authenticated;

create or replace function public.set_user_active(p_user_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot deactivate your own account' using errcode = '22023';
  end if;
  if not p_active and exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
                              where ur.user_id = p_user_id and r.key = 'super_admin')
     and not public.has_role('super_admin') then
    raise exception 'Only a super administrator can deactivate a super administrator' using errcode = '42501';
  end if;
  update public.users set is_active = p_active where id = p_user_id;
  perform public.write_audit(case when p_active then 'activate_user' else 'deactivate_user' end, 'users', p_user_id, '{}');
end $$;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;

-- Admin user directory (email comes from auth.users; admins only).
create or replace function public.admin_list_users(p_search text default '', p_limit integer default 50, p_offset integer default 0)
returns table (
  id uuid, email text, display_name text, affiliation text, is_active boolean, created_at timestamptz,
  last_sign_in_at timestamptz, email_confirmed boolean, roles public.app_role[], contribution_count bigint, total_count bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  return query
  with base as (
    select u.id, au.email::text as email, u.display_name, u.affiliation, u.is_active, u.created_at,
           au.last_sign_in_at, au.email_confirmed_at is not null as email_confirmed,
           coalesce((select array_agg(r.key order by r.rank) from public.user_roles ur join public.roles r on r.id = ur.role_id
                     where ur.user_id = u.id), '{}') as roles,
           (select count(*) from public.contributions c where c.contributor_id = u.id) as contribution_count
    from public.users u join auth.users au on au.id = u.id
    where p_search = '' or u.display_name ilike '%' || p_search || '%' or au.email ilike '%' || p_search || '%'
  )
  select b.*, count(*) over () as total_count from base b
  order by b.created_at desc
  limit least(p_limit, 200) offset greatest(p_offset, 0);
end $$;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Dataset access
-- ---------------------------------------------------------------------------
create or replace function public.can_access_dataset(p_dataset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.datasets d
    where d.id = p_dataset_id and d.is_active and (
      d.access_level = 'public'
      or (d.access_level = 'registered' and auth.uid() is not null)
      or public.is_admin()
      or exists (select 1 from public.dataset_access_requests r
                 where r.dataset_id = d.id and r.requester_id = auth.uid() and r.status = 'approved'
                   and (r.expires_at is null or r.expires_at > now()))
    )
  )
$$;

create or replace function public.decide_access_request(p_request_id uuid, p_status public.request_status, p_note text, p_days integer default 365)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  update public.dataset_access_requests
     set status = p_status, decision_note = coalesce(p_note, ''), decided_by = auth.uid(), decided_at = now(),
         expires_at = case when p_status = 'approved' then now() + make_interval(days => greatest(p_days, 1)) else null end
   where id = p_request_id;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
end $$;
grant execute on function public.decide_access_request(uuid, public.request_status, text, integer) to authenticated;

create or replace function public.approve_release(p_release_id uuid, p_publish boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_r public.dataset_releases;
begin
  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  select * into v_r from public.dataset_releases where id = p_release_id for update;
  if v_r.id is null then raise exception 'Release not found' using errcode = 'P0002'; end if;
  if v_r.build_status <> 'completed' or v_r.record_count = 0 then
    raise exception 'Only successfully built, non-empty releases can be approved' using errcode = 'P0001';
  end if;
  if v_r.created_by = auth.uid() and not public.has_role('super_admin') then
    raise exception 'A release must be approved by a different administrator (four-eyes rule)' using errcode = '42501';
  end if;
  update public.dataset_releases
     set status = case when p_publish then 'published'::public.release_status else 'approved' end,
         approved_by = auth.uid(), approved_at = now(),
         published_at = case when p_publish then now() else published_at end
   where id = p_release_id;
end $$;
grant execute on function public.approve_release(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Public, aggregate-only statistics (no personal data)
-- ---------------------------------------------------------------------------
create or replace function public.platform_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'languages_supported', (select count(*) from public.languages where is_active),
    'languages_registered', (select count(*) from public.languages),
    'registered_contributors', (select count(*) from public.users where is_active),
    'approved_text', (select count(*) from public.contributions where status = 'approved' and type in ('text', 'cultural', 'conversation'))
                     + (select count(*) from public.document_extractions e where e.status = 'approved'),
    'audio_recordings', (select count(*) from public.contributions where status = 'approved' and type = 'audio'),
    'audio_hours', (select round(coalesce(sum(a.duration_seconds), 0) / 3600.0, 2) from public.audio_assets a
                    join public.contributions c on c.id = a.contribution_id where c.status = 'approved'),
    'translations', (select count(*) from public.contributions where status = 'approved' and type = 'translation'),
    'datasets_available', (select count(distinct dataset_id) from public.dataset_releases where status = 'published'),
    'total_submissions', (select count(*) from public.contributions where status <> 'draft'),
    'generated_at', now()
  )
$$;
grant execute on function public.platform_stats() to anon, authenticated;

create or replace function public.language_stats()
returns table (code text, name text, submissions bigint, approved bigint, audio_seconds numeric)
language sql stable security definer set search_path = public as $$
  select l.code, l.name,
         count(c.id) filter (where c.status <> 'draft'),
         count(c.id) filter (where c.status = 'approved'),
         coalesce(sum(a.duration_seconds) filter (where c.status = 'approved'), 0)
  from public.languages l
  left join public.contributions c on c.language_id = l.id
  left join public.audio_assets a on a.contribution_id = c.id
  where l.is_active
  group by l.code, l.name, l.sort_order
  order by l.sort_order
$$;
grant execute on function public.language_stats() to anon, authenticated;

-- Contributor recognition: opt-in only, approved counts only.
create or replace function public.top_contributors(p_limit integer default 8)
returns table (display_name text, public_handle text, approved bigint, languages text[])
language sql stable security definer set search_path = public as $$
  select u.display_name, u.public_handle, count(c.id),
         array_agg(distinct l.name)
  from public.users u
  join public.contributions c on c.contributor_id = u.id and c.status = 'approved'
  join public.languages l on l.id = c.language_id
  where u.show_in_recognition and u.is_active
  group by u.id
  order by count(c.id) desc
  limit least(p_limit, 50)
$$;
grant execute on function public.top_contributors(integer) to anon, authenticated;

-- Time series for admin analytics.
create or replace function public.admin_activity_series(p_days integer default 30)
returns table (day date, submissions bigint, approvals bigint, reviews bigint, signups bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  return query
  select d::date,
         (select count(*) from public.contributions c where c.created_at::date = d::date and c.status <> 'draft'),
         (select count(*) from public.reviews r where r.created_at::date = d::date and r.decision = 'approve'),
         (select count(*) from public.reviews r where r.created_at::date = d::date),
         (select count(*) from public.users u where u.created_at::date = d::date)
  from generate_series(current_date - (least(p_days, 365) - 1), current_date, interval '1 day') d
  order by 1;
end $$;
grant execute on function public.admin_activity_series(integer) to authenticated;

create or replace function public.reviewer_workload()
returns table (reviewer_id uuid, display_name text, active_assignments bigint, reviews_30d bigint, approvals_30d bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_any_role('{linguist,admin,super_admin}') then
    raise exception 'Linguist or administrator role required' using errcode = '42501';
  end if;
  return query
  select u.id, u.display_name,
         (select count(*) from public.review_assignments a where a.reviewer_id = u.id and a.status = 'active'),
         (select count(*) from public.reviews r where r.reviewer_id = u.id and r.created_at > now() - interval '30 days'),
         (select count(*) from public.reviews r where r.reviewer_id = u.id and r.decision = 'approve' and r.created_at > now() - interval '30 days')
  from public.users u
  where exists (select 1 from public.user_roles ur join public.roles ro on ro.id = ur.role_id
                where ur.user_id = u.id and ro.key in ('reviewer', 'linguist'))
  order by 3 desc, 2;
end $$;
grant execute on function public.reviewer_workload() to authenticated;
