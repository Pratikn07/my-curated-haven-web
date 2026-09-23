# Phase 2 implementation evidence

Status: setup implemented, CI passed, and the main ruleset blocks a failing check. Production is not changed by this branch. A signed-in preview review is still a human step.

## Source

- Branch: `phase-2-delivery-foundation-b7k2`
- Base: `phase-1-site-foundation-k7m2` at `0857e36`
- Application directory: `my-curated-haven-web/`
- Gitlink commits left unchanged: `parenting_app` `b92605d`, `SuperClaude_Framework` `8f12b19`
- `.gitmodules` was added because those gitlinks had no URL file. `actions/checkout` failed with `No url found for submodule path` until the URLs were recorded. CI still checks out with `submodules: false`, so it does not clone them.

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
- Repository ruleset `main`, id `23852646`: https://github.com/Pratikn07/my-curated-haven-web/rules/23852646
- It requires a pull request, the `web-quality` check, and an up-to-date branch. It blocks force-push and deletion. Required approving reviews: 0. Bypass actors: none.

## Local checks

Node 24.5.0. No production credentials.

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed. `next typegen` is supported in Next 16.3.6. |
| `npm run build` | Passed. Google fonts downloaded through `next/font` during the build. |
| `npm run test:e2e` | 42 tests discovered. 37 passed, 5 skipped because they belong to the other viewport. Chromium desktop, Chromium at 390px, and WebKit at 390px. |

The production build is served on `http://127.0.0.1:3000` by Playwright and closed when the run finishes.

## CI and merge gate

| Result | Link |
| --- | --- |
| Passing `web-quality` on `7f82282` | https://github.com/Pratikn07/my-curated-haven-web/actions/runs/35801270099 |
| Job name reported by GitHub | `web-quality` |
| Deliberate failure, not merged | https://github.com/Pratikn07/my-curated-haven-web/actions/runs/35801473801 |
| Pull request for that failure | https://github.com/Pratikn07/my-curated-haven-web/pull/6 , closed |
| Merge state while the check was failing | `BLOCKED` |

The failing pull request was closed and its branch deleted. It was not merged.

## Preview

- Implementation pull request: https://github.com/Pratikn07/my-curated-haven-web/pull/5
- Preview: https://my-curated-haven-web-git-ph-8aaf86-pratik-r-nandoskars-projects.vercel.app
- Anonymous request on 2026-09-23: HTTP 302 to Vercel SSO, `x-robots-tag: noindex`
- Signed-in confirmation of the preview pages was not done from this session.

## Still outside this phase

- Signed-in review of the preview pages. Anonymous access is already denied.
- No Stripe, Supabase, recipe data, or design-system replacement.
- Production deployment. Merging this pull request to `main` would deploy it.
