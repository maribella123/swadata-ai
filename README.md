# AfriLang Research

**Preserving African Languages. Powering African Intelligence.**

AfriLang Research is a multilingual African language data collection, preservation and
curation platform. Native speakers, translators, linguists, educators and
researchers contribute and validate language data — starting with **siSwati** and
covering all 11 official South African spoken languages, with a registry ready for
the wider African language family — to support Small Language Models and other
African language AI.

| Layer | Technology |
|---|---|
| Web app | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui-pattern components, Lucide, Recharts |
| Data / auth / files | Supabase: PostgreSQL 17 + Row Level Security, Supabase Auth, private Storage buckets |
| Processing | Python 3.12 FastAPI service: PyMuPDF, python-docx, EbookLib, Tesseract OCR, ffmpeg, pandas/pyarrow, Hugging Face Datasets, optional faster-whisper |
| AI Lab | Separate scripts (Transformers, PEFT LoRA/QLoRA, sacrebleu), not run inside the platform |
| Deployment | Vercel (web), Supabase (DB/auth/storage), Render (processing, Docker) |

## What's included

- **Public website**: home (with live database statistics), about, supported languages and language detail pages, how it works, contribute, research, dataset repository with public data cards, contact, privacy (POPIA), terms, and data governance & licensing.
- **Authentication**: registration with consent capture, email verification (works across devices via `token_hash` links), login, logout, password reset, and profile management.
- **Seven roles**: contributor, translator, reviewer, linguist, researcher, admin and super admin. Roles are enforced in Postgres (RLS, guard triggers, `SECURITY DEFINER` RPCs) and again on the server. The UI only mirrors those checks.
- **Contributor portal**: dashboard, text, documents (bulk ingestion), audio (browser recording or upload), translation, conversations, cultural knowledge, my contributions (versions, reviews, editable permissions, resubmission) and profile (languages spoken, default consents, consent history).
- **Reviewer/linguist portal**: review queue, claim and assign, approve / reject / request changes, corrections saved as new versions, 1–5 quality scores, audio playback, side-by-side translation comparison, document segment review, rights verification, review history and workload monitoring.
- **Admin portal**: overview and analytics charts, users and roles, access requests, contributions, documents, audio, languages and varieties (activate or deactivate), categories and translation tasks, datasets and releases (build, export, four-eyes approval, publish, retire), AI Lab registry, consent and governance, processing jobs, messages, audit log and system settings.
- **Researcher portal**: dataset search and filters, documentation, versions, statistics, a provenance sample, restricted-access requests, permission-checked downloads, benchmarks and models.
- **Processing service**: text extraction from PDF, DOCX, TXT and EPUB, with OCR for scans. It keeps page, paragraph and stanza boundaries; segments text into sentences or stanzas; detects poetry; and finds exact and near duplicates. It also handles Unicode normalisation, text statistics, audio metadata, optional Whisper transcription, consent-aware dataset builds with contributor- and duplicate-aware splits, and exports to CSV, JSON, JSONL, TXT, Parquet and WAV (zip).

## Repository layout

```
web/                    Next.js application (deploy to Vercel; root directory = web)
  src/app/(site)        public website
  src/app/(auth)        login, register, password reset
  src/app/portal        contributor portal
  src/app/review        reviewer & linguist portal
  src/app/admin         administrator portal
  src/app/researcher    researcher portal
  src/app/api           download route (permission-checked signed URLs)
  src/lib               Supabase clients, data access layer, validation
  e2e/                  Playwright end-to-end tests
services/processing/    FastAPI processing service + worker (deploy to Render)
services/ai-lab/        model training/evaluation scaffolding (runs off-platform)
supabase/migrations/    schema, functions, RLS, storage, reference data
supabase/templates/     branded auth emails
scripts/seed-dev.mjs    DEV ONLY: role accounts + clearly-labelled synthetic data
tests/integration/      security & RLS tests against a live Supabase
docs/                   architecture, deployment, API, security, testing report
```

## Quick start (local)

Prerequisites: Node 20+, Docker, Python 3.12+, Tesseract and ffmpeg (for OCR/audio).

```bash
npm install
```

```bash
npx supabase start
```

`supabase start` prints local keys. Put them into `web/.env.local` (copy
`web/.env.example`) and `services/processing/.env` (copy `.env.example`).

```bash
npx supabase db reset
```

```bash
SUPABASE_SERVICE_ROLE_KEY=<local service key> SUPABASE_ANON_KEY=<local anon key> npm run seed:dev
```

```bash
cd web && npm install && npm run dev
```

```bash
cd services/processing && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt && .venv/bin/uvicorn app.main:app --port 8000
```

Open http://localhost:3000. Local emails (verification, password reset) are in
Mailpit at http://127.0.0.1:54324. Dev accounts created by the seed script
(`superadmin@`, `admin@`, `linguist@`, `reviewer@`, `researcher@`, `contributor@`
`swadata.test`) use the password printed by the script. These accounts and the
synthetic data exist **only** in development, and the seed refuses to run against
a remote project unless explicitly allowed.

To make the first real administrator in production, see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#first-administrator).

## Documentation

- [Architecture](docs/ARCHITECTURE.md): system design, data model, data layers, workflows
- [Deployment](docs/DEPLOYMENT.md): Supabase, Vercel and Render setup; environments; backups
- [API](docs/API.md): database RPCs, Next.js routes, processing-service endpoints
- [Security & governance](docs/SECURITY.md): RLS model, POPIA alignment, consent, rights
- [Testing](docs/TESTING.md): how to run the tests, plus the latest test report
- [Photo credits](docs/PHOTO_CREDITS.md)

## Principles

- No fake statistics: every number comes from the database.
- No unverified machine translations or machine-generated language data. Synthetic test data is clearly labelled and only exists in development.
- No English-centric "correction" of African languages. Normalisation is limited to Unicode NFC and whitespace.
- Originals are never overwritten. Corrections are versions, and reviews are append-only.
- Consent is purpose-specific (collection, research, public release, AI training, commercial use), recorded, and revocable.
