# Testing

## How to run

Start the stack first: `npx supabase start`, `npx supabase db reset`, `npm run seed:dev` (with local keys), the web app on :3000 and the processing service on :8000. See the README.

| Suite | Command | Covers |
|---|---|---|
| Processing unit tests | `cd services/processing && .venv/bin/python -m pytest` | Normalisation, hashing, sentence/paragraph/stanza segmentation, poetry detection, statistics, exact and near duplicates, contributor-aware splitting, PDF/DOCX/TXT/OCR extraction, API auth (fails closed) |
| Security / RLS integration | `SUPABASE_ANON_KEY=… npm run test:security` | Acts as every role against a live Supabase: data isolation, privilege escalation, guard triggers, immutability, review rules, restricted content, storage policies, four-eyes release approval, dataset access |
| End-to-end (Playwright) | `cd web && NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run test:e2e` | All public pages (desktop + mobile, no horizontal scroll, no JS errors), live stats vs database, contact form, auth gating, registration → email verification → profile, every contribution form, document upload + extraction, review with correction + versions, admin role management, role-based denial |
| Static checks | `cd web && npm run lint && npm run typecheck && npm run build` | ESLint (Next + React hooks rules), TypeScript strict, production build |

When running E2E repeatedly from one machine, raise `LOGIN_RATE_LIMIT_PER_5MIN`
and `CONTACT_RATE_LIMIT_PER_HOUR` in `web/.env.local`. Otherwise the rate limiters
(correctly) block the test traffic.

## Test report (12 November 2026, local Supabase stack)

All results come from a freshly reset database with dev seed data.

| Suite | Result |
|---|---|
| Processing unit tests (pytest) | **21 passed** |
| SQL ↔ Python `content_hash` parity (9 edge cases: tabs, CRLF, NBSP, decomposed diacritics, Ethiopic) | **all match** |
| Security / RLS integration (node:test) | **15 / 15 passed** |
| End-to-end (Playwright, desktop + Pixel 7) | **38 / 38 passed**, two consecutive runs |
| ESLint | **0 errors, 0 warnings** |
| TypeScript (`tsc --noEmit`) | **0 errors** |
| `next build` | **succeeded** (55 routes) |

### Manually verified workflows (scripted, against real services)

- **Document ingestion**: uploads went through the browser UI to Storage and the worker:
  - PDF: 2 pages, 8 sentence segments with page and paragraph boundaries; 3 exact in-document duplicates flagged.
  - TXT poem: 3 stanzas, line breaks preserved.
  - Scanned PNG: Tesseract OCR, mean confidence 95.8%, text exact.
- **Audio**: WAV upload probed by ffprobe (3.000 s, 44.1 kHz, mono, PCM). Analysis status and quality check were recorded.
- **Dataset pipeline**:
  - Rights verification blocked for plain reviewers and allowed for linguists.
  - Segment approval, then contribution approval.
  - Release builds for monolingual text, speech and parallel text.
  - 13 exports (CSV, JSON, JSONL, TXT, Parquet, WAV zip) all completed.
  - The creator's own approval was blocked (four-eyes); a super admin then published.
  - The researcher was denied the restricted speech export at the storage layer until the access request was approved, then downloaded it with pseudonymised speakers.
  - Download through `/api/datasets/download` returned a correctly named file and was audit-logged. Anonymous access redirected to sign-in.

### Defects found and fixed during testing

| Defect | Fix |
|---|---|
| `INSERT … RETURNING` on contributions failed RLS: the STABLE helper couldn't see the row being inserted | Ownership is checked inline in the select policy. |
| SQL `btrim` vs Python `strip` and `\s` semantics differed, so some duplicates were missed | Both now use an identical ASCII-whitespace definition; a parity test was added. |
| `z.union` hid which contribution field failed validation | Switched to a discriminated union on `type`. |
| Empty publication year rejected under Zod 4 | Field made a plain optional. |
| Conversation form hydration mismatch (random IDs during SSR) | Deterministic initial keys. |
| A failed server action after upload left orphaned files | `submit()` is now awaitable; uploads are removed on failure. |
| Dataset splitter put the largest contributor group in validation when there were few contributors | Largest clusters are placed first; evaluation splits are seeded only when there are enough clusters. A test was added. |
| Role checkboxes waited for a server round-trip, and the popover closed after each change | Optimistic state with rollback; component no longer re-keyed. |
| Seed script raced the API restart after `db reset` | Waits for readiness. |
| setState-in-effect lint errors (menus closing on navigation) and an impure `Date.now()` in render with a hardcoded retention period | Derived "open on pathname" state; the configured retention setting is used. |

### Not verified in this environment

- **Docker image build** for the processing service. Inside this sandbox, Docker Hub first rate-limited the base-image pull (HTTP 429), and then the build container couldn't resolve `deb.debian.org`. The Dockerfile is standard, and the service was verified natively with the same dependencies (Tesseract 5.3, ffmpeg, Python 3.13). Render builds it with normal network access.
- **Whisper transcription**: optional and not installed (heavy model download). The code path fails clearly ("not configured") when disabled.
- **Production deployment**: requires the owner's Supabase, Vercel and Render accounts (see DEPLOYMENT.md).
- **Real microphone recording**: headless Chromium has no microphone. Recording uses the standard MediaRecorder API, and the upload path it shares with file uploads is tested.
- **Formal accessibility audit** (screen reader, axe) and load testing have not been run. Semantic landmarks, labels, focus styles, a skip link, reduced-motion support and contrast-checked colours are in place.
