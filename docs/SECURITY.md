# Security & data governance

## Authorization model

| Layer | Mechanism |
|---|---|
| Edge | `proxy.ts` refreshes the Supabase session and redirects anonymous users away from `/portal`, `/review`, `/admin` and `/researcher`. |
| Server | Every layout, page and server action calls the data access layer (`requireUser`, `requireReviewer`, `requireAdmin`, `requireResearcher`), which re-validates the JWT with Supabase Auth and reads roles from the database. |
| Database | RLS on **every** table; guard triggers (`contributions_guard`, `users_guard`, `user_roles_guard`, immutability of `text_content` v1 and `reviews`); `SECURITY DEFINER` RPCs that check roles explicitly. |
| Storage | Private buckets. Uploads only into `{auth.uid()}/…`. Reads are limited to your own files, or files attached to a contribution you may view. Export downloads require `can_access_dataset` on a published release. Bucket MIME and size limits (50 MB) are enforced. |
| Service | The processing service uses the service-role key server-side only, authenticates callers with a constant-time token comparison, and fails closed when no token is configured. |

Notable rules enforced by the database:

- Users can't change their own roles or `is_active`. Only super admins grant or revoke admin roles, and a super admin can't remove their own super-admin role.
- Contributors can only move their records draft → submitted, changes_requested → submitted, or → withdrawn. Records lock once under review.
- Reviewers can't review their own contributions. Reject and request-changes decisions need a comment. Only linguists and admins can revisit final decisions.
- Restricted cultural items are visible only to the contributor, linguists and admins, and are never included in datasets.
- Releases need approval from an administrator other than their creator (four-eyes rule).
- Audit logs are written by triggers and can't be edited from the application.

The security integration suite (`tests/integration/security.test.mjs`) attacks
these rules as each role.

## Application security

- HTTPS with HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy, and a permissions policy (microphone limited to the site's own origin).
- Rate limiting backed by Postgres (works across serverless instances): sign-in, registration, password reset, confirmation resend, the contact form, and a per-user hourly submission cap (`max_contributions_per_hour`).
- Input validation with Zod on the server, and constraint checks in the database.
- File uploads: client-side type and size pre-checks, bucket MIME allow-lists, size limits, SHA-256 checksums verified by the processing service, and only safe filename characters in storage keys.
- No account enumeration: password-reset and resend responses are identical whether or not the account exists.
- Secrets live only in environment variables. `.env*` files are git-ignored except `.env.example`.

## POPIA alignment

The platform is designed to support compliance with the Protection of Personal
Information Act. It is not a substitute for legal review or an appointed
Information Officer.

| POPIA condition | Implementation |
|---|---|
| Accountability | Audit logs, consent history, rights decisions with recorded evidence, documented procedures (this file, DEPLOYMENT.md). |
| Processing limitation / minimality | Only display name and email (kept in `auth.users`) are required. Speaker data is a pseudonym, with optional age band and gender. No ID numbers, addresses or phone numbers. IP addresses are stored only as truncated SHA-256 hashes for rate limiting. |
| Purpose specification | Five separate permissions per contribution (collection, research, public publication, AI training, commercial). Recording consent and AI-training consent for audio. |
| Further processing limitation | Dataset builds include only items whose permissions match the dataset's access level and licence. |
| Information quality | Human review; versioned corrections; contributors can see and respond to feedback. |
| Openness | Public privacy policy, terms, governance page and data cards. |
| Security safeguards | See above. |
| Data subject participation | Profile editing, per-contribution permission changes, withdrawal, and a privacy request channel (contact topic "Privacy / POPIA"). |

## Copyright & cultural sensitivity

- Documents default to `rights_status = pending_verification`. Extracted text from documents that are copyrighted (or of unknown status) never enters a dataset until a linguist or admin verifies the rights and records the evidence.
- Contributors classify cultural knowledge as public, community or restricted. Reviewers and linguists can reclassify it.

## Development data

`scripts/seed-dev.mjs` creates role accounts and **synthetic** contributions whose
text is explicitly marked `[SYNTHETIC TEST DATA]`. It refuses to run against a
non-local Supabase unless `ALLOW_REMOTE_SEED=1` (intended for staging). Never run
it in production.

## Reporting vulnerabilities

Report security issues privately via the contact form (topic "Privacy / POPIA"),
not in public issues.
