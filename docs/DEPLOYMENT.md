# Deployment

Target topology: **Supabase** (Postgres, Auth, Storage) + **Vercel** (Next.js, root
directory `web`) + **Render** (processing service, Docker, `render.yaml`) + **GitHub**.

Use three separate Supabase projects and matching Vercel and Render environments:

| Environment | Supabase project | Vercel | Render |
|---|---|---|---|
| development | local (`npx supabase start`) | `npm run dev` | `uvicorn` locally |
| staging | `swadata-staging` | Preview deployments (staging env vars) | `swadata-processing-staging` |
| production | `swadata-prod` | Production deployment | `swadata-processing` |

Never reuse production keys in staging, and never commit any key.

## 1. Supabase

1. Create the project (region close to users, e.g. `af-south-1` / Cape Town where available).
2. Link and push the migrations:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref <project-ref>
   ```
   ```bash
   npx supabase db push
   ```
   This creates the schema, RLS policies, functions, storage buckets and reference data (languages, roles, categories, licences, dataset definitions).
3. **Auth → URL configuration**: set the Site URL to `https://<your-domain>` and add `https://<your-domain>/**` to the redirect URLs.
4. **Auth → Email templates**: paste `supabase/templates/confirmation.html`, `recovery.html` and `email_change.html`. They use `{{ .SiteURL }}/auth/confirm?token_hash=…`, which works across devices.
5. **Auth → Providers → Email**: enable "Confirm email". **Auth → Policies**: set minimum password length to 8 with letters and digits, matching `supabase/config.toml`.
6. **Auth → SMTP**: configure a production SMTP provider (Supabase's built-in mailer is rate-limited).
7. **Database → Backups**: enable Point-in-Time Recovery on production and schedule a regular `pg_dump` to off-site storage. Test a restore every quarter.
8. From **Project Settings → API Keys**, keep the **publishable** key (`sb_publishable_…`, safe for the browser — older projects call it the *anon* key) and the **secret** key (`sb_secret_…`, server-only — older projects call it *service_role*). Either format works everywhere below.

### First administrator

After the first person registers and verifies their email, promote them in the SQL editor (this is the only manual role grant):

```sql
insert into public.user_roles (user_id, role_id)
select u.id, r.id from auth.users u cross join public.roles r
where u.email = 'founder@example.org' and r.key in ('admin', 'super_admin')
on conflict do nothing;
```

Grant every later role from Admin → Contributors & roles. Each grant is audit-logged.

## 2. Processing service (Render)

1. New → Blueprint → select the repository. `render.yaml` defines `swadata-processing` (Docker, `services/processing`).
2. Set the secret environment variables:
   - `SUPABASE_URL` = `https://<ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = service-role key (secret)
   - `PROCESSING_SERVICE_TOKEN` = a long random string, e.g. `openssl rand -hex 32`
   - `CORS_ORIGINS` = `https://<your-domain>`
3. Optional transcription: install `requirements-optional.txt` in the image and set `WHISPER_MODEL` (e.g. `small`). Use a larger instance or a GPU. Whisper does not support most South African languages; see ARCHITECTURE.md.
4. Check `GET https://<render-url>/health`. The worker starts automatically (`WORKER_ENABLED=true`). For heavy loads, run additional replicas: claiming uses `FOR UPDATE SKIP LOCKED`, so replicas never take the same job.

## 3. Web app (Vercel)

1. Import the repository and set **Root Directory** to `web`.
2. Environment variables (Production and Preview, with different values):
   - `NEXT_PUBLIC_SITE_URL` = `https://<your-domain>`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only, used for rate limiting and download audit)
   - `PROCESSING_SERVICE_URL` = Render URL; `PROCESSING_SERVICE_TOKEN` = same value as on Render
   - `NEXT_PUBLIC_APP_ENV` = `production` / `staging`
   - `LOGIN_RATE_LIMIT_PER_5MIN` = `10`
3. Deploy. HTTPS and HSTS are applied automatically (security headers live in `next.config.ts`).
4. Add your custom domain, then update the Supabase Site URL and redirect URLs to match.

## 4. Post-deploy checklist

- [ ] Register a test account, verify the email, sign in, reset the password.
- [ ] Promote the first administrator (SQL above).
- [ ] Upload a small PDF and confirm Admin → Processing jobs shows `completed`.
- [ ] Record an audio clip and confirm the duration is measured.
- [ ] Create a dataset release, export it, have a **second** admin approve it, then download it as a researcher.
- [ ] Run the security suite against **staging**: `SUPABASE_URL=… SUPABASE_ANON_KEY=… npm run test:security` (after `ALLOW_REMOTE_SEED=1 npm run seed:dev` on staging only).
- [ ] Never run `seed:dev` against production.

## Operations

- **Retention**: Admin → Consent & governance shows rejected items past the retention period (`retention_rejected_days`). Process deletions under your documented POPIA retention policy.
- **Data subject requests**: these arrive under Admin → Messages (topic "Privacy / POPIA"). Deleting the auth user cascades to the profile, roles, consents and languages. Contributions are `ON DELETE RESTRICT`, so decide whether to anonymise or delete them first.
- **Monitoring**: watch Admin → Processing jobs for failures, Render logs, and the Supabase logs and advisors.
- **Rotating secrets**: rotate `PROCESSING_SERVICE_TOKEN` on Render and Vercel together. If the service-role key is ever exposed, rotate it in Supabase immediately.
