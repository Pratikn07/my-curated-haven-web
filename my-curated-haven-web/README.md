# My Curated Haven

Next.js site for https://mycuratedhaven.com/. Commands run from this directory. Git commands run from the repository root.

## Setup

Node `24.5.0` is pinned in `.nvmrc`. npm `11.5.1` is the package manager. The production host uses the Node 24 line and may not match this exact patch.

```bash
npm ci
```

No environment variables are required. See `.env.example`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run test:e2e` | Playwright against the production server |
| `npm run verify` | Lint, typecheck, build, then browser tests |

Install Playwright browsers once before the first local run:

```bash
npx playwright install chromium webkit
```

`npm run test:e2e` expects `npm run build` to have finished. `npm run verify` builds first.

CI runs these checks from `.github/workflows/web-ci.yml`. It does not use production credentials.
