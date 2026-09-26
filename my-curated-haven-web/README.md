# My Curated Haven

Next.js site for https://mycuratedhaven.com/. Commands run from this directory. Git and Supabase commands run from the repository root.

## Setup

You need:

- Node `24.5.0` (pinned in `.nvmrc`) and npm `11.5.1`. The production host uses the Node 24 line and may not match this exact patch.
- Docker, running, for the local Supabase stack.
- The Supabase CLI. CI uses version `2.104.0`.

```bash
npm ci
cp .env.example .env.local
```

`.env.example` holds the local Supabase URL and publishable key. They only work against the local stack, and they are the same values CI uses. `COMMERCE_DATABASE_URL` is optional locally: the app falls back to the local database on port `54322`. Never put production credentials in `.env.local`.

Start the local database from the repository root:

```bash
cd .. && supabase start && supabase db reset
```

`supabase db reset` applies every migration in `supabase/migrations/` and loads `supabase/seed.sql`, which holds synthetic recipes only. Stop the stack with `supabase stop`.

Don't run `supabase config push`. `supabase/config.toml` is local-only and would overwrite the hosted auth settings.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm run test:phase10:unit` | Phase 10 target-guard and result-accounting unit tests |
| `npm run test:homepage:unit` | Homepage content and readiness unit tests |
| `npm run test:data:unit` | Data-layer tests: backend errors return typed failures, never empty success |
| `npm run build` | Production build (Turbopack, same as Vercel) |
| `npm run start` | Serve the production build |
| `npm run test:e2e` | Playwright against the production server. Needs the local Supabase stack |
| `npm run verify` | Everything above in CI order: lint, typecheck, unit tests, build, browser tests |
| `npm run smoke:production` | Read-only checks against https://mycuratedhaven.com |

Install Playwright browsers once before the first local run:

```bash
npx playwright install chromium webkit
```

`npm run test:e2e` expects `npm run build` to have finished. `npm run verify` builds first.

Database checks run from the repository root: `supabase test db` runs the pgTAP access tests. `supabase gen types typescript --local` must match `src/lib/types/database.ts`.

## CI and production

- `.github/workflows/web-ci.yml` runs `web-quality` and `backend-quality` on every pull request, against a local Supabase in the runner. It never uses production credentials. Both checks must pass before merging to `main`.
- A merge to `main` deploys production on Vercel.
- `.github/workflows/production-smoke.yml` runs `npm run smoke:production` after each successful production deploy and every hour.
- Release and rollback steps: `docs/implementation/phase-2/PREVIEW-AND-RELEASE.md`.
