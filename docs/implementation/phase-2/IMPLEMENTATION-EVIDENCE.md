# Phase 2 implementation evidence

Status: setup implemented locally. CI, merge blocking, and a signed-in preview review are recorded after the pull request runs. Production is not changed by this branch.

## Source

- Branch: `phase-2-delivery-foundation-b7k2`
- Base: `phase-1-site-foundation-k7m2` at `0857e36`
- Application directory: `my-curated-haven-web/`
- Gitlinks left unchanged: `parenting_app`, `SuperClaude_Framework`

Phase 1 application code is already on this base, so the browser suite covers the current public site, including deferred-route 404s. Those checks are not skipped.

## Runtime

| Item | Value |
| --- | --- |
| Local Node | 24.5.0, pinned in `.nvmrc` |
| npm | 11.5.1, declared as `packageManager` |
| Engines | Node 24 only (`>=24 <25`) |
| Host Node | Vercel project uses the Node 24 line. The exact production patch is controlled by Vercel and is not claimed to be 24.5.0. |
| Next.js | 16.3.6, locked |
| Playwright | 1.63.0 |

`npm ci` is the clean install. A later `npm ci` must not rewrite the lockfile.

## Security patch

`next@16.0.7` was inside the vulnerable range for critical advisories fixed only in 16.3.3 or later, including unauthenticated remote code execution (GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4). This branch installs `next@16.3.6` and `eslint-config-next@16.3.6` only. React stays on 19.2.0.

Next.js 16.3 renames `middleware.ts` to `proxy.ts`. The deferred-route 404 moved with that rename. Browser tests cover the same responses.

`npm audit` after the patch reports 9 remaining findings in development tooling (`brace-expansion`, `browserslist`, `flatted`, `js-yaml`, `minimatch`, `picomatch`, and lower-severity packages). They were not blanket-upgraded.

## Host, recorded without changing settings

- Vercel project: `my-curated-haven-web` (`prj_UOge0Wtvr6AtdoAhdGKc76E2RqKr`)
- Application root used by the existing preview: `my-curated-haven-web`
- Production branch: `main`. A push to `main` creates a Production deployment.
- Canonical domain: https://mycuratedhaven.com/ stays public.
- Last known-good production deployment before this work: source `4dabbaa`, created `2026-09-22T20:32:42Z`.
- Preview protection: an anonymous request to the Phase 1 preview returned HTTP 302 to Vercel SSO and `x-robots-tag: noindex`.
- Repository rulesets: none. `main` is not branch-protected. This account has not been shown to have ruleset admin rights. That gate stays incomplete until an owner applies it.

## Local checks

Node 24.5.0. No production credentials.

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed. `next typegen` is supported in Next 16.3.6. |
| `npm run build` | Passed. Google fonts downloaded through `next/font` during the build. |
| `npm run test:e2e` | 42 tests discovered. 37 passed, 5 skipped because they belong to the other viewport. Chromium desktop, Chromium at 390px, and WebKit at 390px. |

The production build is served on `http://127.0.0.1:3000` by Playwright and closed when the run finishes.

## Still outside this phase

- Required status check on `main` until an owner can create the ruleset after the first green `web-quality` run.
- Signed-in review of the new preview. Anonymous denial is the check this branch can perform.
- No Stripe, Supabase, recipe data, or design-system replacement.
