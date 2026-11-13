# AfriLang Datasets — web app

Next.js 16 application containing the public website and the contributor,
reviewer, administrator and researcher portals. See the repository
[README](../README.md) and [docs/](../docs) for architecture, deployment and API.

```bash
cp .env.example .env.local   # fill in Supabase + processing-service values
npm install
npm run dev                  # http://localhost:3000
npm run lint && npm run typecheck && npm run build
npm run test:e2e             # Playwright (needs local Supabase + seed + processing service)
```

Deploy on Vercel with **Root Directory = `web`**.
