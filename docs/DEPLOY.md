# Deploy — Math for AI

## Vercel (recommended)

1. Import https://github.com/t4tarzan/math-for-ai in Vercel
2. Set **Root Directory** to `apps/web`
3. Add environment variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | For deploy + waitlist + auth | Neon, Supabase, or Railway Postgres. Must support pgvector for capstones later. |
| `AUTH_SECRET` | **Required for auth** | Generate: `openssl rand -base64 32` |
| `GITHUB_ID` / `GITHUB_SECRET` | Optional | GitHub OAuth app credentials |
| `NEXT_PUBLIC_GITHUB_ENABLED` | Optional | Set `true` when GitHub OAuth is configured |
| `NEXT_PUBLIC_APP_URL` | Recommended | Production: `https://math.wntap.org` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Optional | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional | Default `https://us.i.posthog.com` |

4. Deploy — build runs `next build` inside `apps/web`

### Database options

**Neon (free tier):**
```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Supabase:**
```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Without `DATABASE_URL`, waitlist falls back to local file (not suitable for serverless production).

---

## Local + Docker

```bash
npm run infra:up          # Postgres on localhost:5433
cd apps/web && npm run dev # App on http://localhost:7790
```

Copy `apps/web/.env.example` → `apps/web/.env.local`:
```
DATABASE_URL=postgresql://m4ai:m4ai@localhost:5433/m4ai
```

---

## Pre-deploy checklist

- [ ] `npm run compile:lessons` (refresh catalog from upstream)
- [ ] `cd apps/web && npm run build`
- [ ] `DATABASE_URL` set on Vercel
- [ ] Test `/api/health/db` after first deploy
- [ ] Set `AUTH_SECRET` and test sign up / sign in
- [ ] Test waitlist on landing page
- [ ] Test `/demo/07-docker-for-ai` deploy flow

---

## Custom domain

Production host: **https://math.wntap.org**

Git pushes to `main` deploy production via Vercel Git integration (root directory `apps/web`).

If DNS is not on Vercel nameservers, add a CNAME:

```
math.wntap.org  CNAME  cname.vercel-dns.com
```
