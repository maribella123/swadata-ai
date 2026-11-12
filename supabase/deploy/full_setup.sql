-- SwaData AI: complete database setup (all migrations combined, in order).
-- How to use: Supabase Dashboard > SQL Editor > New query > paste this whole file > Run.
-- Run ONCE on an empty project. Source of truth: supabase/migrations/*.sql


-- ===== 20261112000001_core_schema.sql =====
-- =============================================================================
-- SwaData AI — core schema
-- Multilingual African language data collection, preservation & AI platform.
--
-- Conventions
--   * UUID primary keys (gen_random_uuid()).
--   * Large binaries (audio, documents, exports) live in private Supabase
--     Storage buckets; tables only hold bucket + path references.
--   * Original submissions are never overwritten: text corrections create new
--     rows in text_content (versioned), reviews are append-only.
--   * Data layers: raw -> validated -> curated -> model_ready.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
create type public.app_role as enum (
  'contributor', 'translator', 'reviewer', 'linguist', 'researcher', 'admin', 'super_admin'
);

create type public.contribution_type as enum (
  'text', 'document', 'audio', 'translation', 'conversation', 'cultural'
);

create type public.contribution_status as enum (
  'draft', 'submitted', 'in_review', 'changes_requested', 'approved', 'rejected', 'withdrawn'
);

create type public.data_layer as enum ('raw', 'validated', 'curated', 'model_ready');

create type public.review_decision as enum ('approve', 'reject', 'request_changes', 'comment');

create type public.processing_status as enum ('pending', 'queued', 'processing', 'completed', 'failed', 'not_applicable');

create type public.copyright_status as enum (
  'own_work', 'public_domain', 'open_licence', 'copyrighted_with_permission',
  'copyrighted_no_permission', 'unknown'
);

create type public.rights_status as enum ('unverified', 'pending_verification', 'verified', 'rejected');

create type public.sensitivity_level as enum ('public', 'community', 'restricted');

create type public.proficiency_level as enum ('native', 'fluent', 'intermediate', 'learner');

create type public.extraction_kind as enum ('heading', 'paragraph', 'sentence', 'stanza', 'line');

create type public.item_review_status as enum ('pending', 'approved', 'rejected');

create type public.consent_type as enum (
  'platform_terms', 'data_collection', 'research_use', 'public_publication',
  'ai_training', 'commercial_use', 'audio_recording'
);

create type public.cultural_kind as enum (
  'proverb', 'idiom', 'folklore', 'traditional_story', 'greeting',
  'historical_expression', 'indigenous_term', 'oral_history'
);

create type public.dataset_type as enum (
  'monolingual_text', 'parallel_text', 'conversation', 'instruction', 'cultural', 'speech'
);

create type public.access_level as enum ('public', 'registered', 'restricted');

create type public.release_status as enum ('draft', 'pending_approval', 'approved', 'published', 'retired');

create type public.data_split as enum ('train', 'validation', 'test');

create type public.export_format as enum ('csv', 'json', 'jsonl', 'txt', 'parquet', 'wav');

create type public.request_status as enum ('pending', 'approved', 'rejected', 'revoked');

create type public.job_type as enum ('document_extract', 'audio_analyze', 'audio_transcribe', 'dataset_build', 'dataset_export');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Normalised content hash used for duplicate detection. NFC + collapse ASCII
-- whitespace + trim + lower-case. Mirrored exactly by services/processing
-- (app/nlp/text.py: content_hash) — keep the two in sync. Deliberately language-agnostic: no stemming, spelling
-- or grammar normalisation (avoids English-centric assumptions).
create or replace function public.content_hash(input text)
returns text language sql immutable parallel safe as $$
  select case when input is null then null else
    encode(extensions.digest(
      lower(btrim(regexp_replace(normalize(input, NFC), '[ \t\n\r\f\v]+', ' ', 'g'))), 'sha256'), 'hex')
  end
$$;

create or replace function public.word_count(input text)
returns integer language sql immutable parallel safe as $$
  select coalesce(array_length(regexp_split_to_array(btrim(coalesce(input, '')), '\s+'), 1), 0)
         - case when btrim(coalesce(input, '')) = '' then 1 else 0 end
$$;

-- ---------------------------------------------------------------------------
-- Identity & access
-- ---------------------------------------------------------------------------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         public.app_role not null unique,
  name        text not null,
  description text not null default '',
  rank        smallint not null default 0,
  created_at  timestamptz not null default now()
);

-- Public profile for each auth user. Email stays in auth.users only
-- (data minimisation, POPIA). No ID numbers, addresses or phone numbers.
create table public.users (
  id                   uuid primary key references auth.users (id) on delete cascade,
  display_name         text not null default '' check (char_length(display_name) <= 120),
  public_handle        text unique check (public_handle ~ '^[a-z0-9_]{3,32}$'),
  bio                  text not null default '' check (char_length(bio) <= 1000),
  affiliation          text not null default '' check (char_length(affiliation) <= 200),
  region               text not null default '' check (char_length(region) <= 120),
  country_code         char(2) not null default 'ZA',
  show_in_recognition  boolean not null default false,
  is_active            boolean not null default true,
  onboarded_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  role_id     uuid not null references public.roles (id) on delete restrict,
  granted_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (user_id, role_id)
);
create index user_roles_user_idx on public.user_roles (user_id);

-- ---------------------------------------------------------------------------
-- Language registry
-- ---------------------------------------------------------------------------
create table public.languages (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique check (code ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'), -- BCP-47
  iso639_3        char(3) not null unique,
  name            text not null,
  native_name     text not null,
  family          text not null default '',
  region          text not null default '',
  countries       text[] not null default '{}',
  script          text not null default 'Latn',
  speakers_note   text not null default '',
  description     text not null default '',
  is_official_za  boolean not null default false,
  is_priority     boolean not null default false,
  is_active       boolean not null default false,
  sort_order      integer not null default 100,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger languages_updated_at before update on public.languages
  for each row execute function public.set_updated_at();
create index languages_active_idx on public.languages (is_active, sort_order);

create table public.language_varieties (
  id           uuid primary key default gen_random_uuid(),
  language_id  uuid not null references public.languages (id) on delete cascade,
  code         text not null,
  name         text not null,
  region       text not null default '',
  description  text not null default '',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (language_id, code)
);

create table public.user_languages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  language_id  uuid not null references public.languages (id) on delete cascade,
  variety_id   uuid references public.language_varieties (id) on delete set null,
  proficiency  public.proficiency_level not null default 'native',
  created_at   timestamptz not null default now(),
  unique (user_id, language_id)
);

create table public.content_categories (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z0-9_]+$'),
  name        text not null,
  description text not null default '',
  applies_to  public.contribution_type[] not null default '{}',
  is_active   boolean not null default true,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);

create table public.data_licenses (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique,
  name                  text not null,
  url                   text,
  allows_commercial     boolean not null default false,
  requires_attribution  boolean not null default true,
  share_alike           boolean not null default false,
  description           text not null default '',
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Contributions (parent record for every submission type)
-- ---------------------------------------------------------------------------
create table public.contributions (
  id              uuid primary key default gen_random_uuid(),
  contributor_id  uuid not null references public.users (id) on delete restrict,
  type            public.contribution_type not null,
  status          public.contribution_status not null default 'submitted',
  data_layer      public.data_layer not null default 'raw',
  language_id     uuid not null references public.languages (id) on delete restrict,
  variety_id      uuid references public.language_varieties (id) on delete set null,
  category_id     uuid references public.content_categories (id) on delete set null,
  title           text not null default '' check (char_length(title) <= 300),
  source_type     text not null default 'original'
                  check (source_type in ('original', 'oral', 'published', 'archive', 'educational', 'community', 'other')),
  is_original     boolean not null default true,
  source_reference text not null default '' check (char_length(source_reference) <= 1000),
  license_id      uuid references public.data_licenses (id) on delete set null,
  sensitivity     public.sensitivity_level not null default 'public',
  content_hash    text,
  metadata        jsonb not null default '{}'::jsonb,
  submitted_at    timestamptz,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger contributions_updated_at before update on public.contributions
  for each row execute function public.set_updated_at();
create index contributions_contributor_idx on public.contributions (contributor_id, created_at desc);
create index contributions_queue_idx on public.contributions (status, type, created_at);
create index contributions_language_idx on public.contributions (language_id, status);
create index contributions_hash_idx on public.contributions (content_hash) where content_hash is not null;

-- Five separate, explicit permissions (POPIA-aligned purpose specification).
create table public.contribution_permissions (
  id                    uuid primary key default gen_random_uuid(),
  contribution_id       uuid not null unique references public.contributions (id) on delete cascade,
  allow_collection      boolean not null check (allow_collection), -- must be true to submit
  allow_research        boolean not null default false,
  allow_public_release  boolean not null default false,
  allow_ai_training     boolean not null default false,
  allow_commercial      boolean not null default false,
  rights_holder         text not null default '' check (char_length(rights_holder) <= 300),
  declaration_text      text not null default '',
  declared_by           uuid not null references public.users (id) on delete restrict,
  declared_at           timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger contribution_permissions_updated_at before update on public.contribution_permissions
  for each row execute function public.set_updated_at();

-- Versioned text. version 1 = the original submission and is immutable.
create table public.text_content (
  id               uuid primary key default gen_random_uuid(),
  contribution_id  uuid not null references public.contributions (id) on delete cascade,
  version          integer not null check (version >= 1),
  body             text not null check (char_length(body) between 1 and 200000),
  context          text not null default '' check (char_length(context) <= 4000),
  is_original      boolean not null default false,
  change_note      text not null default '',
  created_by       uuid not null references public.users (id) on delete restrict,
  char_count       integer generated always as (char_length(body)) stored,
  word_count       integer generated always as (public.word_count(body)) stored,
  normalized_hash  text generated always as (public.content_hash(body)) stored,
  created_at       timestamptz not null default now(),
  unique (contribution_id, version)
);
create index text_content_hash_idx on public.text_content (normalized_hash);

create table public.translation_sources (
  id           uuid primary key default gen_random_uuid(),
  language_id  uuid not null references public.languages (id) on delete restrict,
  text         text not null check (char_length(text) between 1 and 2000),
  domain       text not null default 'general',
  notes        text not null default '',
  is_active    boolean not null default true,
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.translations (
  id                  uuid primary key default gen_random_uuid(),
  contribution_id     uuid not null unique references public.contributions (id) on delete cascade,
  source_id           uuid references public.translation_sources (id) on delete set null,
  source_language_id  uuid not null references public.languages (id) on delete restrict,
  target_language_id  uuid not null references public.languages (id) on delete restrict,
  source_text         text not null check (char_length(source_text) between 1 and 5000),
  target_text         text not null check (char_length(target_text) between 1 and 5000),
  domain              text not null default 'general',
  notes               text not null default '',
  source_hash         text generated always as (public.content_hash(source_text)) stored,
  created_at          timestamptz not null default now(),
  check (source_language_id <> target_language_id)
);
create index translations_source_hash_idx on public.translations (source_language_id, source_hash);

create table public.audio_assets (
  id                     uuid primary key default gen_random_uuid(),
  contribution_id        uuid not null unique references public.contributions (id) on delete cascade,
  storage_bucket         text not null default 'audio',
  storage_path           text not null unique,
  original_filename      text not null default '',
  mime_type              text not null check (mime_type in (
                           'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3',
                           'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac')),
  file_size_bytes        bigint not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  checksum_sha256        text,
  duration_seconds       numeric(10, 3),
  sample_rate            integer,
  channels               smallint,
  codec                  text,
  recording_method       text not null default 'upload' check (recording_method in ('browser', 'upload')),
  speaker_pseudonym      text not null check (char_length(speaker_pseudonym) between 1 and 60),
  speaker_age_band       text not null default 'undisclosed'
                         check (speaker_age_band in ('undisclosed', '18-24', '25-34', '35-49', '50-64', '65+')),
  speaker_gender         text not null default 'undisclosed'
                         check (speaker_gender in ('undisclosed', 'female', 'male', 'non_binary', 'other')),
  recording_environment  text not null default '' check (char_length(recording_environment) <= 200),
  prompt_text            text not null default '',
  transcript             text not null default '',
  transcript_source      text not null default 'none' check (transcript_source in ('none', 'contributor', 'automatic', 'reviewer')),
  transcription_status   public.processing_status not null default 'not_applicable',
  transcription_model    text,
  analysis_status        public.processing_status not null default 'pending',
  consent_recording      boolean not null check (consent_recording),
  consent_ai_training    boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger audio_assets_updated_at before update on public.audio_assets
  for each row execute function public.set_updated_at();

create table public.documents (
  id                      uuid primary key default gen_random_uuid(),
  contribution_id         uuid not null unique references public.contributions (id) on delete cascade,
  storage_bucket          text not null default 'documents',
  storage_path            text not null unique,
  original_filename       text not null,
  mime_type               text not null,
  file_type               text not null check (file_type in ('pdf', 'docx', 'txt', 'epub', 'image')),
  file_size_bytes         bigint not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  checksum_sha256         text,
  title                   text not null check (char_length(title) between 1 and 400),
  author                  text not null default '',
  publication_year        smallint check (publication_year between 1500 and 2100),
  publisher               text not null default '',
  source                  text not null default '',
  isbn                    text not null default '',
  genre                   text not null default 'other'
                          check (genre in ('book', 'poetry', 'article', 'story', 'dictionary', 'educational', 'religious', 'government', 'other')),
  copyright_status        public.copyright_status not null default 'unknown',
  license_id              uuid references public.data_licenses (id) on delete set null,
  permission_to_digitise  boolean not null default false,
  permission_ai_training  boolean not null default false,
  rights_status           public.rights_status not null default 'pending_verification',
  rights_verified_by      uuid references public.users (id) on delete set null,
  rights_verified_at      timestamptz,
  rights_notes            text not null default '',
  is_scanned              boolean not null default false,
  is_poetry               boolean not null default false,
  page_count              integer,
  extraction_status       public.processing_status not null default 'queued',
  extraction_error        text,
  extraction_stats        jsonb not null default '{}'::jsonb,
  extracted_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
create index documents_checksum_idx on public.documents (checksum_sha256);

create table public.document_extractions (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid not null references public.documents (id) on delete cascade,
  seq              integer not null,
  page_number      integer,
  paragraph_index  integer,
  kind             public.extraction_kind not null,
  text             text not null,
  normalized_hash  text generated always as (public.content_hash(text)) stored,
  is_duplicate     boolean not null default false,
  duplicate_of     uuid,
  ocr_confidence   numeric(5, 2),
  status           public.item_review_status not null default 'pending',
  reviewed_by      uuid references public.users (id) on delete set null,
  reviewed_at      timestamptz,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  unique (document_id, seq)
);
create index document_extractions_hash_idx on public.document_extractions (normalized_hash);
create index document_extractions_status_idx on public.document_extractions (document_id, status);

create table public.conversation_messages (
  id               uuid primary key default gen_random_uuid(),
  contribution_id  uuid not null references public.contributions (id) on delete cascade,
  seq              integer not null check (seq >= 1),
  speaker_role     text not null check (speaker_role ~ '^[a-z_]{1,30}$'),
  speaker_label    text not null default '' check (char_length(speaker_label) <= 60),
  text             text not null check (char_length(text) between 1 and 5000),
  gloss_en         text not null default '',
  created_at       timestamptz not null default now(),
  unique (contribution_id, seq)
);

create table public.cultural_metadata (
  id                   uuid primary key default gen_random_uuid(),
  contribution_id      uuid not null unique references public.contributions (id) on delete cascade,
  kind                 public.cultural_kind not null,
  original_expression  text not null check (char_length(original_expression) between 1 and 20000),
  meaning              text not null default '',
  literal_translation  text not null default '',
  usage_context        text not null default '',
  region_origin        text not null default '',
  community_origin     text not null default '',
  access_notes         text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger cultural_metadata_updated_at before update on public.cultural_metadata
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Review, quality & annotation
-- ---------------------------------------------------------------------------
create table public.review_assignments (
  id               uuid primary key default gen_random_uuid(),
  contribution_id  uuid not null references public.contributions (id) on delete cascade,
  reviewer_id      uuid not null references public.users (id) on delete cascade,
  assigned_by      uuid references public.users (id) on delete set null,
  status           text not null default 'active' check (status in ('active', 'completed', 'released')),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create unique index review_assignments_one_active on public.review_assignments (contribution_id) where status = 'active';
create index review_assignments_reviewer_idx on public.review_assignments (reviewer_id, status);

create table public.reviews (
  id               uuid primary key default gen_random_uuid(),
  contribution_id  uuid not null references public.contributions (id) on delete cascade,
  reviewer_id      uuid not null references public.users (id) on delete restrict,
  decision         public.review_decision not null,
  comment          text not null default '' check (char_length(comment) <= 5000),
  scores           jsonb not null default '{}'::jsonb, -- e.g. {accuracy, fluency, context, naturalness} 1-5
  text_version     integer,
  previous_status  public.contribution_status,
  new_status       public.contribution_status,
  created_at       timestamptz not null default now()
);
create index reviews_contribution_idx on public.reviews (contribution_id, created_at);
create index reviews_reviewer_idx on public.reviews (reviewer_id, created_at desc);

create table public.quality_checks (
  id               uuid primary key default gen_random_uuid(),
  contribution_id  uuid not null references public.contributions (id) on delete cascade,
  check_type       text not null,
  passed           boolean not null,
  score            numeric,
  details          jsonb not null default '{}'::jsonb,
  checked_by       uuid references public.users (id) on delete set null, -- null = automated
  created_at       timestamptz not null default now()
);
create index quality_checks_contribution_idx on public.quality_checks (contribution_id);

create table public.annotations (
  id               uuid primary key default gen_random_uuid(),
  contribution_id  uuid not null references public.contributions (id) on delete cascade,
  annotator_id     uuid not null references public.users (id) on delete restrict,
  text_version     integer,
  start_offset     integer check (start_offset >= 0),
  end_offset       integer check (end_offset >= start_offset),
  label            text not null check (char_length(label) between 1 and 80),
  value            text not null default '',
  note             text not null default '',
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Consent & governance
-- ---------------------------------------------------------------------------
create table public.consents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  consent_type  public.consent_type not null,
  policy_version text not null default '2026-11',
  granted       boolean not null,
  granted_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, consent_type, created_at desc);

create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Datasets
-- ---------------------------------------------------------------------------
create table public.datasets (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  name                    text not null,
  summary                 text not null default '',
  description             text not null default '',
  dataset_type            public.dataset_type not null,
  access_level            public.access_level not null default 'restricted',
  license_id              uuid references public.data_licenses (id) on delete set null,
  intended_use            text not null default '',
  limitations             text not null default '',
  processing_methodology  text not null default '',
  is_benchmark            boolean not null default false,
  is_active               boolean not null default true,
  created_by              uuid references public.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger datasets_updated_at before update on public.datasets
  for each row execute function public.set_updated_at();

create table public.dataset_releases (
  id                uuid primary key default gen_random_uuid(),
  dataset_id        uuid not null references public.datasets (id) on delete cascade,
  version           text not null check (version ~ '^\d+\.\d+\.\d+$'),
  status            public.release_status not null default 'draft',
  language_codes    text[] not null default '{}',
  collection_start  date,
  collection_end    date,
  record_count      integer not null default 0,
  split_config      jsonb not null default '{"train": 0.8, "validation": 0.1, "test": 0.1, "seed": 42}'::jsonb,
  stats             jsonb not null default '{}'::jsonb,
  quality_summary   jsonb not null default '{}'::jsonb,
  provenance        jsonb not null default '{}'::jsonb,
  notes             text not null default '',
  build_status      public.processing_status not null default 'pending',
  build_error       text,
  created_by        uuid references public.users (id) on delete set null,
  approved_by       uuid references public.users (id) on delete set null,
  approved_at       timestamptz,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (dataset_id, version)
);
create trigger dataset_releases_updated_at before update on public.dataset_releases
  for each row execute function public.set_updated_at();

create table public.dataset_items (
  id               uuid primary key default gen_random_uuid(),
  release_id       uuid not null references public.dataset_releases (id) on delete cascade,
  contribution_id  uuid not null references public.contributions (id) on delete restrict,
  item_ref         text not null default '',  -- e.g. extraction id or message group
  split            public.data_split not null,
  language_code    text not null,
  record           jsonb not null,
  created_at       timestamptz not null default now(),
  unique (release_id, contribution_id, item_ref)
);
create index dataset_items_release_idx on public.dataset_items (release_id, split);

create table public.dataset_exports (
  id               uuid primary key default gen_random_uuid(),
  release_id       uuid not null references public.dataset_releases (id) on delete cascade,
  format           public.export_format not null,
  storage_bucket   text not null default 'dataset-exports',
  storage_path     text,
  file_size_bytes  bigint,
  record_count     integer,
  checksum_sha256  text,
  status           public.processing_status not null default 'queued',
  error            text,
  requested_by     uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz,
  unique (release_id, format)
);

create table public.dataset_access_requests (
  id             uuid primary key default gen_random_uuid(),
  dataset_id     uuid not null references public.datasets (id) on delete cascade,
  requester_id   uuid not null references public.users (id) on delete cascade,
  institution    text not null check (char_length(institution) between 2 and 200),
  purpose        text not null check (char_length(purpose) between 20 and 4000),
  ethics_reference text not null default '',
  status         public.request_status not null default 'pending',
  decided_by     uuid references public.users (id) on delete set null,
  decided_at     timestamptz,
  decision_note  text not null default '',
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);
create unique index dataset_access_one_pending on public.dataset_access_requests (dataset_id, requester_id) where status = 'pending';

-- ---------------------------------------------------------------------------
-- African Language AI Lab (infrastructure only; training runs off-platform)
-- ---------------------------------------------------------------------------
create table public.models (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  name            text not null,
  base_model      text not null default '',
  architecture    text not null default '',
  parameter_count bigint,
  language_codes  text[] not null default '{}',
  hf_repo         text not null default '',
  description     text not null default '',
  status          text not null default 'planned' check (status in ('planned', 'training', 'evaluating', 'released', 'archived')),
  created_by      uuid references public.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger models_updated_at before update on public.models
  for each row execute function public.set_updated_at();

create table public.training_runs (
  id                  uuid primary key default gen_random_uuid(),
  model_id            uuid not null references public.models (id) on delete cascade,
  dataset_release_id  uuid references public.dataset_releases (id) on delete set null,
  method              text not null default 'lora' check (method in ('full', 'lora', 'qlora', 'tokenizer', 'other')),
  config              jsonb not null default '{}'::jsonb,
  status              text not null default 'planned' check (status in ('planned', 'running', 'succeeded', 'failed', 'cancelled')),
  metrics             jsonb not null default '{}'::jsonb,
  compute_notes       text not null default '',
  started_at          timestamptz,
  finished_at         timestamptz,
  created_by          uuid references public.users (id) on delete set null,
  created_at          timestamptz not null default now()
);

create table public.evaluations (
  id                uuid primary key default gen_random_uuid(),
  model_id          uuid not null references public.models (id) on delete cascade,
  training_run_id   uuid references public.training_runs (id) on delete set null,
  benchmark_dataset_id uuid references public.datasets (id) on delete set null,
  benchmark_name    text not null,
  language_code     text not null,
  metrics           jsonb not null default '{}'::jsonb,
  notes             text not null default '',
  created_by        uuid references public.users (id) on delete set null,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Operations
-- ---------------------------------------------------------------------------
create table public.processing_jobs (
  id           uuid primary key default gen_random_uuid(),
  job_type     public.job_type not null,
  entity_id    uuid not null,
  status       public.processing_status not null default 'queued',
  attempts     smallint not null default 0,
  max_attempts smallint not null default 3,
  payload      jsonb not null default '{}'::jsonb,
  result       jsonb not null default '{}'::jsonb,
  error        text,
  created_by   uuid references public.users (id) on delete set null,
  locked_at    timestamptz,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index processing_jobs_queue_idx on public.processing_jobs (status, created_at) where status in ('queued', 'processing');
create index processing_jobs_entity_idx on public.processing_jobs (entity_id);

create table public.contact_messages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 120),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  organisation  text not null default '' check (char_length(organisation) <= 200),
  topic         text not null default 'general' check (topic in ('general', 'partnership', 'research', 'data_rights', 'privacy', 'press')),
  message       text not null check (char_length(message) between 10 and 5000),
  status        text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at    timestamptz not null default now()
);

create table public.system_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null,
  description text not null default '',
  is_public   boolean not null default false,
  updated_by  uuid references public.users (id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.rate_limits (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null,
  hits        integer not null default 1,
  window_start timestamptz not null default now(),
  unique (bucket)
);


-- ===== 20261112000002_functions_triggers.sql =====
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


-- ===== 20261112000003_rls_policies.sql =====
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


-- ===== 20261112000004_storage.sql =====
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


-- ===== 20261112000005_reference_data.sql =====
-- =============================================================================
-- SwaData AI — reference data required in every environment
-- (No personal data. No synthetic contributions — see supabase/seed.sql for
--  clearly-labelled synthetic development data.)
-- =============================================================================

insert into public.roles (key, name, description, rank) values
  ('contributor', 'Contributor', 'Submits language data: text, audio, documents, translations, conversations and cultural knowledge.', 10),
  ('translator', 'Translator', 'Contributes and refines translations between African languages and English.', 20),
  ('reviewer', 'Reviewer', 'Validates submissions for accuracy, quality and appropriateness.', 30),
  ('linguist', 'Linguist', 'Senior reviewer: assigns reviews, verifies rights, handles culturally restricted material and final decisions.', 40),
  ('researcher', 'Researcher', 'Searches, requests and downloads permitted datasets for research.', 35),
  ('admin', 'Administrator', 'Manages users, languages, datasets, releases and platform governance.', 50),
  ('super_admin', 'Super Administrator', 'Full control including administrator role management.', 60)
on conflict (key) do nothing;

-- BCP-47 codes (ISO 639-1 where it exists, otherwise ISO 639-3) and ISO 639-3.
insert into public.languages (code, iso639_3, name, native_name, family, region, countries, is_official_za, is_priority, is_active, sort_order, description) values
  ('ss',  'ssw', 'siSwati',    'siSwati',    'Niger-Congo › Bantu › Nguni',        'Southern Africa', '{SZ,ZA}', true, true, true, 1,
   'Official language of Eswatini and one of South Africa''s official languages, spoken mainly in Mpumalanga. SwaData AI''s founding priority language.'),
  ('zu',  'zul', 'isiZulu',    'isiZulu',    'Niger-Congo › Bantu › Nguni',        'Southern Africa', '{ZA}', true, false, true, 2,
   'The most widely spoken home language in South Africa, concentrated in KwaZulu-Natal and Gauteng.'),
  ('xh',  'xho', 'isiXhosa',   'isiXhosa',   'Niger-Congo › Bantu › Nguni',        'Southern Africa', '{ZA}', true, false, true, 3,
   'Spoken widely in the Eastern and Western Cape; known for its click consonants.'),
  ('nr',  'nbl', 'isiNdebele', 'isiNdebele', 'Niger-Congo › Bantu › Nguni',        'Southern Africa', '{ZA}', true, false, true, 4,
   'South African (Southern) isiNdebele, spoken mainly in Mpumalanga, Gauteng and Limpopo.'),
  ('st',  'sot', 'Sesotho',    'Sesotho',    'Niger-Congo › Bantu › Sotho-Tswana', 'Southern Africa', '{ZA,LS}', true, false, true, 5,
   'Official language of Lesotho and South Africa, spoken widely in the Free State and Gauteng.'),
  ('tn',  'tsn', 'Setswana',   'Setswana',   'Niger-Congo › Bantu › Sotho-Tswana', 'Southern Africa', '{ZA,BW}', true, false, true, 6,
   'National language of Botswana and an official language of South Africa, spoken widely in North West province.'),
  ('nso', 'nso', 'Sepedi',     'Sepedi',     'Niger-Congo › Bantu › Sotho-Tswana', 'Southern Africa', '{ZA}', true, false, true, 7,
   'Also known as Sesotho sa Leboa (Northern Sotho), spoken mainly in Limpopo and Gauteng.'),
  ('ve',  'ven', 'Tshivenda',  'Tshivenḓa',  'Niger-Congo › Bantu › Venda',        'Southern Africa', '{ZA,ZW}', true, false, true, 8,
   'Spoken mainly in Limpopo province of South Africa and in southern Zimbabwe.'),
  ('ts',  'tso', 'Xitsonga',   'Xitsonga',   'Niger-Congo › Bantu › Tswa-Ronga',   'Southern Africa', '{ZA,MZ,ZW,SZ}', true, false, true, 9,
   'Spoken in Limpopo and Mpumalanga, and across southern Mozambique.'),
  ('af',  'afr', 'Afrikaans',  'Afrikaans',  'Indo-European › Germanic',            'Southern Africa', '{ZA,NA}', true, false, true, 10,
   'A West Germanic language developed in Southern Africa, spoken across South Africa and Namibia.'),
  ('en',  'eng', 'English',    'English',    'Indo-European › Germanic',            'Global',          '{ZA}', true, false, true, 11,
   'An official South African language and the platform''s default pivot language for translation.'),
  -- Expandable African language registry (inactive until an administrator activates them)
  ('sw',  'swa', 'Kiswahili',  'Kiswahili',  'Niger-Congo › Bantu',                 'East Africa',     '{TZ,KE,UG,CD}', false, false, false, 20, ''),
  ('yo',  'yor', 'Yoruba',     'Èdè Yorùbá', 'Niger-Congo › Volta-Niger',           'West Africa',     '{NG,BJ}', false, false, false, 21, ''),
  ('ig',  'ibo', 'Igbo',       'Asụsụ Igbo', 'Niger-Congo › Volta-Niger',           'West Africa',     '{NG}', false, false, false, 22, ''),
  ('ha',  'hau', 'Hausa',      'Harshen Hausa', 'Afro-Asiatic › Chadic',            'West Africa',     '{NG,NE}', false, false, false, 23, ''),
  ('am',  'amh', 'Amharic',    'አማርኛ',       'Afro-Asiatic › Semitic',              'East Africa',     '{ET}', false, false, false, 24, ''),
  ('sn',  'sna', 'chiShona',   'chiShona',   'Niger-Congo › Bantu',                 'Southern Africa', '{ZW}', false, false, false, 25, ''),
  ('nd',  'nde', 'Northern Ndebele', 'isiNdebele (Zimbabwe)', 'Niger-Congo › Bantu › Nguni', 'Southern Africa', '{ZW}', false, false, false, 26, ''),
  ('rw',  'kin', 'Kinyarwanda', 'Ikinyarwanda', 'Niger-Congo › Bantu',              'East Africa',     '{RW}', false, false, false, 27, ''),
  ('rn',  'run', 'Kirundi',    'Ikirundi',   'Niger-Congo › Bantu',                 'East Africa',     '{BI}', false, false, false, 28, ''),
  ('so',  'som', 'Somali',     'Af-Soomaali', 'Afro-Asiatic › Cushitic',            'East Africa',     '{SO,ET,DJ,KE}', false, false, false, 29, ''),
  ('om',  'orm', 'Oromo',      'Afaan Oromoo', 'Afro-Asiatic › Cushitic',           'East Africa',     '{ET,KE}', false, false, false, 30, ''),
  ('ti',  'tir', 'Tigrinya',   'ትግርኛ',       'Afro-Asiatic › Semitic',              'East Africa',     '{ER,ET}', false, false, false, 31, ''),
  ('ny',  'nya', 'Chichewa',   'Chichewa',   'Niger-Congo › Bantu',                 'Southern Africa', '{MW,ZM,MZ}', false, false, false, 32, ''),
  ('ln',  'lin', 'Lingala',    'Lingála',    'Niger-Congo › Bantu',                 'Central Africa',  '{CD,CG}', false, false, false, 33, ''),
  ('lg',  'lug', 'Luganda',    'Oluganda',   'Niger-Congo › Bantu',                 'East Africa',     '{UG}', false, false, false, 34, ''),
  ('ki',  'kik', 'Gikuyu',     'Gĩkũyũ',     'Niger-Congo › Bantu',                 'East Africa',     '{KE}', false, false, false, 35, ''),
  ('wo',  'wol', 'Wolof',      'Wolof',      'Niger-Congo › Atlantic',              'West Africa',     '{SN,GM}', false, false, false, 36, ''),
  ('ak',  'aka', 'Akan',       'Akan',       'Niger-Congo › Kwa',                   'West Africa',     '{GH}', false, false, false, 37, ''),
  ('ff',  'ful', 'Fula',       'Fulfulde',   'Niger-Congo › Atlantic',              'West Africa',     '{SN,GN,NG,CM}', false, false, false, 38, ''),
  ('mg',  'mlg', 'Malagasy',   'Malagasy',   'Austronesian',                        'Indian Ocean',    '{MG}', false, false, false, 39, ''),
  ('loz', 'loz', 'Silozi',     'Silozi',     'Niger-Congo › Bantu › Sotho-Tswana',  'Southern Africa', '{ZM,NA}', false, false, false, 40, ''),
  ('ng',  'ndo', 'Oshiwambo (Ndonga)', 'Oshindonga', 'Niger-Congo › Bantu',         'Southern Africa', '{NA}', false, false, false, 41, ''),
  ('naq', 'naq', 'Khoekhoe',   'Khoekhoegowab', 'Khoe-Kwadi',                       'Southern Africa', '{NA,ZA}', false, false, false, 42, '')
on conflict (code) do nothing;

update public.languages set script = 'Ethi' where code in ('am', 'ti');

-- Country-level varieties only; finer dialect varieties should be added by linguists.
insert into public.language_varieties (language_id, code, name, region, description)
select l.id, v.code, v.name, v.region, v.description
from (values
  ('ss', 'ss-SZ', 'siSwati (Eswatini)', 'Eswatini', 'siSwati as spoken in Eswatini.'),
  ('ss', 'ss-ZA', 'siSwati (South Africa)', 'Mpumalanga, South Africa', 'siSwati as spoken in South Africa, mainly Mpumalanga.'),
  ('st', 'st-ZA', 'Sesotho (South Africa)', 'South Africa', ''),
  ('st', 'st-LS', 'Sesotho (Lesotho)', 'Lesotho', ''),
  ('tn', 'tn-ZA', 'Setswana (South Africa)', 'South Africa', ''),
  ('tn', 'tn-BW', 'Setswana (Botswana)', 'Botswana', ''),
  ('ts', 'ts-ZA', 'Xitsonga (South Africa)', 'South Africa', ''),
  ('ts', 'ts-MZ', 'Xichangana (Mozambique)', 'Mozambique', ''),
  ('af', 'af-ZA', 'Afrikaans (South Africa)', 'South Africa', ''),
  ('af', 'af-NA', 'Afrikaans (Namibia)', 'Namibia', ''),
  ('en', 'en-ZA', 'South African English', 'South Africa', '')
) as v(lang, code, name, region, description)
join public.languages l on l.code = v.lang
on conflict (language_id, code) do nothing;

insert into public.content_categories (key, name, description, applies_to, sort_order) values
  ('sentence', 'Individual sentences', 'Single natural sentences.', '{text}', 1),
  ('paragraph', 'Paragraphs', 'Connected passages of a few sentences.', '{text}', 2),
  ('long_form', 'Long-form text', 'Essays, reports and extended writing.', '{text,document}', 3),
  ('everyday_expression', 'Everyday expressions', 'Common phrases used in daily life.', '{text,audio,translation}', 4),
  ('question_answer', 'Questions and answers', 'Question and answer pairs.', '{text,conversation}', 5),
  ('educational', 'Educational material', 'Teaching and learning content.', '{text,document,conversation,audio}', 6),
  ('story', 'Stories', 'Narratives and short stories.', '{text,document,audio}', 7),
  ('technical_terminology', 'Technical terminology', 'Terms for science, technology, health, law and more.', '{text,translation}', 8),
  ('poetry', 'Poems and literature', 'Poetry, praise poetry and literary works.', '{text,document,audio}', 9),
  ('news', 'News and current affairs', 'Factual reporting.', '{text,document,translation}', 10),
  ('read_speech', 'Read speech', 'A speaker reading a provided prompt aloud.', '{audio}', 11),
  ('spontaneous_speech', 'Spontaneous speech', 'Natural, unscripted speech.', '{audio}', 12),
  ('dictionary', 'Dictionaries and word lists', 'Lexicographic material.', '{document}', 13),
  ('health', 'Health', 'Health and wellbeing content.', '{text,translation,conversation}', 14),
  ('agriculture', 'Agriculture', 'Farming and food systems.', '{text,translation,conversation}', 15),
  ('government', 'Government and civic', 'Civic information and public services.', '{text,document,translation}', 16)
on conflict (key) do nothing;

insert into public.data_licenses (code, name, url, allows_commercial, requires_attribution, share_alike, description) values
  ('CC-BY-4.0', 'Creative Commons Attribution 4.0', 'https://creativecommons.org/licenses/by/4.0/', true, true, false, 'Reuse for any purpose with attribution.'),
  ('CC-BY-SA-4.0', 'Creative Commons Attribution-ShareAlike 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/', true, true, true, 'Reuse with attribution; derivatives under the same licence.'),
  ('CC-BY-NC-4.0', 'Creative Commons Attribution-NonCommercial 4.0', 'https://creativecommons.org/licenses/by-nc/4.0/', false, true, false, 'Non-commercial reuse with attribution.'),
  ('CC0-1.0', 'Creative Commons Zero 1.0 (Public Domain Dedication)', 'https://creativecommons.org/publicdomain/zero/1.0/', true, false, false, 'No rights reserved.'),
  ('SWADATA-RESEARCH-1.0', 'SwaData Community Research Licence 1.0', null, false, true, false, 'Non-commercial research and AI model development only, with attribution to SwaData AI contributors. Redistribution of raw data not permitted.'),
  ('PERMISSION-GRANTED', 'All rights reserved — written permission granted', null, false, true, false, 'Copyrighted material used under explicit written permission from the rights holder. Not for public redistribution.')
on conflict (code) do nothing;

insert into public.datasets (slug, name, summary, dataset_type, access_level, license_id, intended_use, limitations, processing_methodology, is_benchmark)
select v.slug, v.name, v.summary, v.dtype::public.dataset_type, v.access::public.access_level, l.id, v.intended, v.limitations,
  'Collected through SwaData AI with per-item consent. Only contributions approved by at least one reviewer, with permission for AI training and research, are included. Unicode NFC normalisation and whitespace normalisation only; no automatic spelling or grammar correction. Exact duplicates are removed by normalised hash. Splits are contributor-aware (all items from one contributor fall in one split) and duplicate-aware.',
  v.bench
from (values
  ('swadata-monolingual-text', 'SwaData Monolingual Text', 'Validated monolingual sentences, paragraphs and approved document extracts.', 'monolingual_text', 'registered', 'SWADATA-RESEARCH-1.0',
   'Language modelling, tokenizer training and SLM pre-training for African languages.', 'Coverage varies by language and domain. Not representative of all dialects.', false),
  ('swadata-parallel-translations', 'SwaData Parallel Translations', 'Human translations between African languages and English, reviewed for accuracy and fluency.', 'parallel_text', 'registered', 'SWADATA-RESEARCH-1.0',
   'Machine translation training and evaluation.', 'Translations reflect individual translators; multiple valid translations may exist.', false),
  ('swadata-conversations', 'SwaData Conversations', 'Structured multi-turn dialogues with speaker roles.', 'conversation', 'registered', 'SWADATA-RESEARCH-1.0',
   'Conversational AI and dialogue modelling.', 'Dialogues are contributor-authored and may be scripted.', false),
  ('swadata-instructions', 'SwaData Instruction Tuning', 'Instruction/response pairs derived from approved question-answer conversations.', 'instruction', 'restricted', 'SWADATA-RESEARCH-1.0',
   'Instruction tuning of small language models.', 'Derived automatically from conversations; review before use.', false),
  ('swadata-cultural', 'SwaData Cultural Language Data', 'Proverbs, idioms, greetings and oral traditions with meanings and context.', 'cultural', 'restricted', 'SWADATA-RESEARCH-1.0',
   'Culturally grounded evaluation and preservation research.', 'Restricted-sensitivity items are always excluded.', false),
  ('swadata-speech', 'SwaData Speech & Transcription', 'Consented speech recordings with reviewed transcripts and pseudonymous speaker metadata.', 'speech', 'restricted', 'SWADATA-RESEARCH-1.0',
   'Automatic speech recognition and text-to-speech research.', 'Speaker demographics are self-reported and optional.', false),
  ('swadata-mt-benchmark', 'SwaData Translation Benchmark', 'Held-out evaluation set of reviewed translations for benchmarking models.', 'parallel_text', 'registered', 'SWADATA-RESEARCH-1.0',
   'Evaluation only — must not be used for training.', 'Small; intended for comparative evaluation.', true)
) as v(slug, name, summary, dtype, access, lic, intended, limitations, bench)
left join public.data_licenses l on l.code = v.lic
on conflict (slug) do nothing;

insert into public.system_settings (key, value, description, is_public) values
  ('max_contributions_per_hour', '120', 'Per-user submission limit.', false),
  ('max_upload_mb', '50', 'Maximum upload size in megabytes.', true),
  ('policy_version', '"2026-11"', 'Current privacy/terms policy version.', true),
  ('transcription_enabled', 'false', 'Whether automatic transcription is offered (requires the processing service with Whisper).', true),
  ('retention_rejected_days', '365', 'Days to keep rejected contributions before purge review.', false),
  ('registration_open', 'true', 'Whether new registrations are accepted.', true)
on conflict (key) do nothing;

-- English prompts contributors can translate (source text only; no machine translations).
insert into public.translation_sources (language_id, text, domain)
select l.id, s.text, s.domain from public.languages l,
(values
  ('Good morning. How did you sleep?', 'everyday'),
  ('Please wash your hands before eating.', 'health'),
  ('The clinic opens at eight o''clock in the morning.', 'health'),
  ('Where is the nearest school?', 'everyday'),
  ('We planted maize after the first rains.', 'agriculture'),
  ('My grandmother tells us stories every evening.', 'culture'),
  ('How much does a taxi to town cost?', 'everyday'),
  ('Remember to drink clean water every day.', 'health'),
  ('The meeting has been moved to Thursday afternoon.', 'everyday'),
  ('Children should go to school every day.', 'education'),
  ('Please speak slowly so that I can understand.', 'everyday'),
  ('The river is full after the storm.', 'everyday')
) as s(text, domain)
where l.code = 'en';


-- ===== 20261112000006_release_lifecycle.sql =====
-- Retiring a published release keeps its record and provenance but removes it
-- from the public repository and blocks further downloads.
create or replace function public.retire_release(p_release_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  update public.dataset_releases set status = 'retired' where id = p_release_id;
  if not found then raise exception 'Release not found' using errcode = 'P0002'; end if;
end $$;
grant execute on function public.retire_release(uuid) to authenticated;


-- Record migrations so 'supabase db push' later knows they are applied.
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261112000001', 'core_schema'),
  ('20261112000002', 'functions_triggers'),
  ('20261112000003', 'rls_policies'),
  ('20261112000004', 'storage'),
  ('20261112000005', 'reference_data'),
  ('20261112000006', 'release_lifecycle')
on conflict (version) do nothing;

select 'SwaData AI setup complete: ' || count(*) || ' tables' as result
from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';
