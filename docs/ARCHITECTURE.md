# Architecture

AfriLang Research is a **modular monolith**: one Next.js application (all portals) plus one
Python processing service, sharing a single Supabase project. There are no
microservices beyond the processing service, which exists because document,
OCR, audio and dataset work needs Python libraries and long-running jobs.

```
 Browser ──HTTPS──▶ Next.js (Vercel)
   │                 ├─ Server Components / Server Actions (session from cookie, re-validated)
   │                 ├─ proxy.ts (session refresh, gate /portal /review /admin /researcher)
   │                 └─ /api/datasets/download (RLS + RPC + storage-policy checked)
   │                        │ anon key + user JWT (RLS applies)
   ├──── direct upload ─────┼──────────────▶ Supabase Storage (private buckets: audio, documents, dataset-exports)
   │     (XHR with progress, user JWT, storage RLS)
   ▼                        ▼
                     Supabase Postgres ◀── service role ── FastAPI processing service (Render)
                     ├─ RLS on every table                ├─ worker: claim_next_job() (SKIP LOCKED)
                     ├─ SECURITY DEFINER workflow RPCs    ├─ extraction / OCR / segmentation / dedupe
                     ├─ guard + audit triggers            ├─ audio probe / optional Whisper
                     └─ processing_jobs (durable queue)   └─ dataset build & export
```

## Key decisions

| Decision | Reason |
|---|---|
| Authorization lives in Postgres (RLS, guard triggers, RPCs) | It can't be bypassed by a buggy page or a direct API call. The UI only mirrors it. |
| Workflow mutations (`submit_review`, `set_user_role`, `approve_release`, …) are RPCs | Multi-table changes stay atomic, and each RPC checks roles itself. |
| `submit_contribution` is `SECURITY INVOKER` | A whole submission is inserted in one transaction while RLS still applies to every row. |
| Durable job queue in Postgres (`processing_jobs`) | Jobs survive restarts. Inserting documents or audio enqueues jobs via triggers. The Next.js app only "kicks" the worker; nothing is lost if the service is down. |
| Files go straight from the browser to private Storage | Large uploads skip the serverless functions and show real progress. Storage RLS limits uploads to `{user_id}/…`. |
| Cache Components disabled | Nearly every page depends on the session and live data, so classic dynamic rendering is simpler and correct. |

## Data model (main tables)

- **Identity**: `users` (profile; email stays in `auth.users`), `roles`, `user_roles`, `user_languages`
- **Registry**: `languages` (BCP-47 + ISO 639-3, active flag), `language_varieties`, `content_categories`, `data_licenses`
- **Contributions**: `contributions` (parent; type, status, data layer, sensitivity, provenance) with one-to-one or one-to-many children `contribution_permissions`, `text_content` (versioned), `translations`, `translation_sources`, `audio_assets`, `documents`, `document_extractions`, `conversation_messages`, `cultural_metadata`
- **Quality**: `reviews` (append-only), `review_assignments`, `quality_checks`, `annotations`
- **Governance**: `consents` (append-only history), `audit_logs` (trigger-written), `contact_messages`, `system_settings`, `rate_limits`
- **Datasets**: `datasets`, `dataset_releases`, `dataset_items` (snapshot record + split), `dataset_exports`, `dataset_access_requests`
- **AI Lab**: `models`, `training_runs`, `evaluations`
- **Ops**: `processing_jobs`

All primary keys are UUIDs. Foreign keys, check constraints, unique indexes and
query indexes are defined in `supabase/migrations/20261112000001_core_schema.sql`.

## Data layers

| Layer | Meaning | Set by |
|---|---|---|
| `raw` | As submitted. Original files plus text version 1. | submission |
| `validated` | Approved by a reviewer who is not the contributor. | `submit_review` |
| `curated` | Selected into a dataset release (deduplicated, permission-filtered). | dataset build |
| `model_ready` | Exported in a release format. | dataset export |

Raw material is never deleted by processing. Corrections create new
`text_content` versions, and version 1 is immutable (an `UPDATE` trigger blocks it).

## Contribution lifecycle

`draft → submitted → in_review → approved | rejected | changes_requested → (resubmitted) …`, or `withdrawn` by the contributor.
Contributors can only make the transitions allowed by `contributions_guard`. Reviewers
change status only through `submit_review`. Restricted cultural items are visible
only to the contributor, linguists and admins.

## Document ingestion pipeline

1. The browser computes a SHA-256 checksum and uploads the file to `documents/{uid}/{uuid}/{name}`.
2. `submit_contribution` checks the path prefix and that the object exists, records metadata, rights and permissions, and sets `rights_status = pending_verification`.
3. A trigger enqueues a `document_extract` job, and the worker:
   - downloads the file and verifies the checksum;
   - extracts text (PyMuPDF blocks, DOCX paragraphs/headings/tables, EPUB chapters, TXT with encoding detection), falling back to Tesseract OCR for scanned or text-poor pages;
   - detects poetry (flag, genre or heuristic) and keeps stanzas with their line breaks; splits prose into sentences, tagged with page and paragraph index;
   - flags exact duplicates (against other documents and text contributions) and near duplicates (character 5-gram Jaccard) within the document;
   - stores `document_extractions` and extraction statistics, then marks the document `completed` or `failed` with a user-readable reason.
4. Reviewers approve or reject segments. A linguist or admin verifies rights, with the evidence recorded.
5. Only approved, non-duplicate segments of **rights-verified** documents with digitisation and AI-training permission can enter a dataset.

## Dataset build

`dataset_build` collects approved contributions matching the dataset type and
languages, then applies these rules:

- Permission filters: research use and AI training are always required; public publication too for public datasets; commercial use too for commercially licensed datasets.
- Restricted items are excluded.
- Exact duplicates are removed.
- Splits are **contributor-aware and duplicate-aware**: a union-find groups items by contributor and shared keys (same source sentence, same document, same conversation), so a group never spans train and test. Assignment is deterministic per seed.
- Contributors are replaced with release-scoped pseudonyms.

The build writes statistics, quality and provenance metadata. Exports write the
files plus a data card (README.md / datacard.json) to the private `dataset-exports`
bucket. Publishing requires a second administrator (`approve_release`).

## Language handling

- Text normalisation is NFC plus control-character and whitespace normalisation only. No spelling, grammar or casing changes are stored.
- `content_hash` is identical in SQL and Python (tested), so duplicates are detected consistently.
- Language identification is optional and advisory. Common detectors do not support siSwati, isiNdebele, Sepedi or Tshivenda, so the contributor's own language choice is always authoritative.
- Automatic transcription uses Whisper only for its training languages. Output for other languages is flagged as an unreliable draft, and drafts are excluded from speech datasets until a human transcript exists.
- OCR defaults to Tesseract `eng` (Latin script). Characters with diacritics need custom traineddata (see `services/processing/Dockerfile`).

## Extending to new languages

An admin registers the language (BCP-47 + ISO 639-3) and activates it in
Admin → Languages. No code changes are needed: forms, filters, statistics and
datasets all read from the registry.
