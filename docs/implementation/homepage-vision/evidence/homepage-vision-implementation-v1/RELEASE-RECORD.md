# Implementation release record

Status: post-merge integration record for PR #36. Release approval remains subject to the follow-up gates below.
Content version: `hv-2026-09-24`
Presentation state: `preparation`

## Candidate and integration

- Source branch: `codex/homepage-vision-implementation`
- Initial branch base SHA: `8e58812be52a0a5d4ad5c1062c810bf43b399ed6`
- PR compare base SHA after rebase: `90c2615de26d11d8bb6ea882b6f2c9287161ffac`
- Initial implementation commit: `02aab78`; PR #36 includes the follow-up error-diagnostic, documented preview-format clarification, and regression-test selector fix. Final PR head: `bdee74c3b392605d2965bd588982e98d2cc00e85`.
- Implementation PR: #36 merged on 2026-09-25; PR head `bdee74c3b392605d2965bd588982e98d2cc00e85`; merge SHA `17ad9de969ed4b8776fe1337b2823f54975fe93b`
- PR URL: https://github.com/Pratikn07/my-curated-haven-web/pull/36
- PR checks: [Web CI run 36077335279](https://github.com/Pratikn07/my-curated-haven-web/actions/runs/36077335279) passed web-quality and backend-quality on the PR head.
- Main-branch CI: [Web CI run 36077996034](https://github.com/Pratikn07/my-curated-haven-web/actions/runs/36077996034) passed web-quality and backend-quality on the merge SHA; the full browser suite passed 239 tests with 49 skipped.
- Vercel deployment: GitHub deployment `6651058948` for merge SHA `17ad9de969ed4b8776fe1337b2823f54975fe93b` completed successfully at `2026-09-25T00:32:53Z`. Deployment target: https://my-curated-haven-hrlvbr68z-pratik-r-nandoskars-projects.vercel.app
- Official-domain check: an uncached HTTP GET to https://mycuratedhaven.com/ returned the new preparation-page title, the preparation status, and the “What's ahead” and story sections.
- The earlier plan was merged as PR #33. This implementation is tracked independently and is not Phase 13.
- Following the source review, the approved visual default was clarified: version 1 uses semantic HTML illustrations for feature previews and retains raster/image metadata requirements only for raster variants. See the dated amendment in `PREVIEW-ASSETS.md`.

## Verification performed

- Lint, TypeScript, homepage state-contract tests, Phase 10 unit tests, and production build passed locally and in PR CI.
- Public route check passed on the local production build.
- Focused cross-browser suite: 92 passed, 10 skipped, one worker.
- Homepage recipe errors emit only bounded internal categories for configuration, query, upstream and unexpected failures; empty/mismatched slot conditions have separate diagnostics. Raw provider messages are not logged.
- The local full E2E run was inconclusive after the local server saturated CPU and timed out. GitHub PR CI and merged-main CI passed the complete browser suite: 239 passed and 49 skipped on each run.
- UI detector returned no findings. The independent screenshot review found no blocking visual issue.
- See [case results](CASE-RESULTS.csv) and [mobile/performance evidence](MOBILE-AND-PERFORMANCE.md).

## Release gates

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| HV-G01 scope, presentation state and truthful claims | Candidate passes source and automated copy checks | Preparation remains default; content-owner approval of rendered copy is still needed. |
| HV-G02 asset provenance, rights and privacy | **Blocked** | Synthetic preview text is used, but hero-photo permission/rights owner are not documented. Confirm before treating the asset as launch-cleared. |
| HV-G03 data, navigation and access regression | Automated regression passed | PR and merged-main CI passed web-quality and backend-quality, including the complete browser suite; the local full-suite attempt was inconclusive after server saturation. |
| HV-G04 mobile, accessibility, performance and measurement | **Blocked** | Responsive captures and desktop critical/serious axe check passed. Manual zoom/keyboard/screen-reader/device review and same-profile performance baseline remain. |
| HV-G05 candidate understood and deployable | **Blocked** | Post-merge deployment and official-domain checks passed. Five-person comprehension, a named release/content owner and rollback rehearsal remain. |

## Current boundary and follow-up

This record covers implementation and the requested GitHub integration. A merge is not evidence that all release gates above passed. Do not move to `free_ready` or `collection_ready` until an owner verifies anonymous recipe availability or the exact approved offer and updates the versioned content state. Keep the static previews informational; no live Chat, Shop or Bloom features are part of this change.

The requested PR, required checks, merge SHA, GitHub deployment status and official-domain response are recorded above. Keep the content in `preparation` until asset rights, content-owner approval, comprehension, manual accessibility, performance-baseline and rollback gates have named evidence. Record the rollback artifact before claiming a release.
