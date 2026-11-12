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
