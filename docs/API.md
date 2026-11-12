# API reference

SwaData AI exposes three surfaces:

1. **Supabase (PostgREST + RPC)**, used by the web app with the user's JWT. Every table is protected by RLS.
2. **Next.js routes and server actions**, which handle forms, auth and downloads.
3. **Processing service**, an internal FastAPI service secured with a shared bearer token.

## 1. Database RPCs (`supabase.rpc(name, args)`)

| Function | Who | Purpose |
|---|---|---|
| `platform_stats()` | anyone | Aggregate counts for the homepage (approved data only). |
| `language_stats()` | anyone | Submitted and approved counts and speech seconds per active language. |
| `top_contributors(p_limit)` | anyone | Opt-in contributor recognition (approved counts only). |
| `current_roles()` | authenticated | The caller's roles. |
| `submit_contribution(p jsonb)` | authenticated | Atomic submission of any contribution type, including permissions. *Security invoker: RLS applies.* |
| `resubmit_contribution(id, body, note)` | owner | Resubmits after "changes requested", optionally adding a new text version. |
| `claim_review(id)` | reviewer+ | Self-assign a submission (status becomes `in_review`). |
| `assign_reviewer(id, reviewer_id)` | linguist, admin | Assign to a reviewer (never the contributor). |
| `submit_review(id, decision, comment, scores, corrected_text, sensitivity)` | reviewer+ | Records the decision; a correction becomes a new version; updates status and data layer. Reviewers can't review their own work; only linguists and admins can revisit final decisions. |
| `review_extractions(ids[], status)` | reviewer+ | Bulk approve or reject document segments. |
| `verify_document_rights(id, status, notes, copyright, ai_training, licence)` | linguist, admin | Rights decision; notes are required as evidence. |
| `set_user_role(user, role, grant)` | admin (admin roles: super admin only) | Grant or revoke roles. |
| `set_user_active(user, active)` | admin | Deactivate or reactivate an account. |
| `admin_list_users(search, limit, offset)` | admin | User directory including email (from `auth.users`). |
| `admin_activity_series(days)` | admin | Daily submissions, approvals, reviews and signups. |
| `reviewer_workload()` | linguist, admin | Active assignments and 30-day review counts per reviewer. |
| `can_access_dataset(dataset_id)` | anyone | Access check (public / registered / approved request). |
| `decide_access_request(id, status, note, days)` | admin | Approve, reject or revoke a restricted-dataset request. |
| `approve_release(id, publish)` | admin (not the creator, unless super admin) | Four-eyes approval and publication. |
| `retire_release(id)` | admin | Withdraws a published release. |
| `claim_next_job(types[])` | service role only | Worker queue (FOR UPDATE SKIP LOCKED). |
| `check_rate_limit(bucket, max, window)` | service role only | Fixed-window limiter used by server actions. |

### `submit_contribution` payload

Common fields: `type`, `language_id`, `variety_id?`, `category_id?`, `title?`,
`source_type`, `is_original`, `source_reference?`, `license_id?`, `sensitivity`,
`draft?`, `metadata?`, and `permissions` (`allow_collection` must be `true`;
`allow_research`, `allow_public_release`, `allow_ai_training`, `allow_commercial`,
`rights_holder?`).

| type | extra fields |
|---|---|
| `text` | `body`, `context?` |
| `translation` | `source_language_id`, `source_text`, `target_text`, `source_id?`, `domain?`, `notes?` (`language_id` = target) |
| `conversation` | `messages[]` of `{speaker_role, speaker_label?, text, gloss_en?}` (≥ 2) |
| `cultural` | `kind`, `original_expression`, `meaning?`, `literal_translation?`, `usage_context?`, `region_origin?`, `community_origin?`, `access_notes?` |
| `audio` | `storage_path` (`{uid}/…` in bucket `audio`), `mime_type`, `file_size_bytes`, `duration_seconds?`, `recording_method`, `speaker_pseudonym`, `speaker_age_band?`, `speaker_gender?`, `recording_environment?`, `prompt_text?`, `transcript?`, `consent_recording: true`, `consent_ai_training`, `checksum_sha256?` |
| `document` | `storage_path` (bucket `documents`), `original_filename`, `mime_type`, `file_type` (`pdf/docx/txt/epub/image`), `file_size_bytes`, `title`, `author?`, `publication_year?`, `publisher?`, `doc_source?`, `isbn?`, `genre`, `copyright_status`, `permission_to_digitise`, `permission_ai_training`, `is_scanned`, `is_poetry`, `checksum_sha256?` |

The web app validates the same payload with Zod (`web/src/lib/validation.ts`) before calling the RPC.

## 2. Next.js routes

| Route | Method | Notes |
|---|---|---|
| `/auth/confirm?token_hash&type&next` | GET | Verifies email, recovery and email-change links. |
| `/auth/callback?code&next` | GET | PKCE code exchange (default Supabase templates). |
| `/auth/signout` | POST | Ends the session. |
| `/api/datasets/download?export=<uuid>` | GET | Checks the export row (RLS), `can_access_dataset`, and the storage policy, then redirects to a 5-minute signed URL. Each download is audit-logged. Anonymous users are sent to sign in unless the dataset is public. |

Server actions live next to their pages (`app/**/actions.ts`). Each one re-checks the session through the data access layer (`lib/auth.ts`), validates input with Zod, and then calls RLS-protected queries or RPCs.

## 3. Processing service

Base URL: `PROCESSING_SERVICE_URL`. Every endpoint except `/health` requires
`Authorization: Bearer <PROCESSING_SERVICE_TOKEN>`. If no token is configured, the
service rejects all calls (fail closed). Interactive OpenAPI docs are at `/docs`.

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Status, version, Tesseract/ffmpeg availability, transcription configuration. |
| `/v1/jobs/kick` | POST | Wakes the background worker (jobs are durable in Postgres). |
| `/v1/jobs/run?limit=20` | POST | Processes up to *limit* queued jobs synchronously (cron/testing). |
| `/v1/text/analyze` | POST | `{text, language?, identify_language?}` returns the normalised text, `content_hash`, paragraphs, sentences, statistics (words, unique words, type-token ratio, UTF-8 bytes, scripts) and optional advisory language ID. Rate-limited. |
| `/v1/text/dedupe` | POST | `{texts: [...]}` returns exact and near-duplicate flags. |

Job types handled by the worker: `document_extract`, `audio_analyze`,
`audio_transcribe`, `dataset_build`, `dataset_export`. Database triggers enqueue
them on upload, and admin actions enqueue them for builds, exports and retries.

Example:

```bash
curl -s -X POST "$PROCESSING_SERVICE_URL/v1/text/analyze" -H "Authorization: Bearer $PROCESSING_SERVICE_TOKEN" -H "Content-Type: application/json" -d '{"text":"Sawubona. Unjani?","language":"ss"}'
```
