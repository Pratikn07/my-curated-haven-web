# Implementation release record

Status: implementation candidate reviewed; merge and production status pending final GitHub verification.
Content version: `hv-2026-09-24`
Presentation state: `preparation`

## Candidate and integration

- Source branch: `codex/homepage-vision-implementation`
- Starting main SHA: `8e58812be52a0a5d4ad5c1062c810bf43b399ed6`
- Implementation PR: pending
- Candidate SHA / merge SHA: pending
- Hosting deployment ID / official-domain result: pending
- The earlier plan was merged as PR #33. This implementation is tracked independently and is not Phase 13.

## Verification performed

- Lint, TypeScript, homepage state-contract tests, Phase 10 unit tests, and production build passed.
- Public route check passed on the local production build.
- Focused cross-browser suite: 92 passed, 10 skipped, one worker.
- Full 285-case E2E suite: inconclusive; the local server saturated CPU and timed out before a final suite report. No full-suite pass is claimed.
- UI detector returned no findings. The independent screenshot review found no blocking visual issue.
- See [case results](CASE-RESULTS.csv) and [mobile/performance evidence](MOBILE-AND-PERFORMANCE.md).

## Release gates

| Gate | Status | Evidence / next action |
| --- | --- | --- |
| HV-G01 scope, presentation state and truthful claims | Candidate passes source and automated copy checks | Preparation remains default; content-owner approval of rendered copy is still needed. |
| HV-G02 asset provenance, rights and privacy | **Blocked** | Synthetic preview text is used, but hero-photo permission/rights owner are not documented. Confirm before treating the asset as launch-cleared. |
| HV-G03 data, navigation and access regression | Partial | Focused route, analytics and unit suites passed; broad regression run was inconclusive after local server saturation. |
| HV-G04 mobile, accessibility, performance and measurement | **Blocked** | Responsive captures and desktop critical/serious axe check passed. Manual zoom/keyboard/screen-reader/device review and same-profile performance baseline remain. |
| HV-G05 candidate understood and deployable | **Blocked** | Five-person comprehension, named release/content owner, rollback rehearsal and post-merge official-domain evidence remain. |

## Current boundary and follow-up

This record covers implementation and the requested GitHub integration. A merge is not evidence that all release gates above passed. Do not move to `free_ready` or `collection_ready` until an owner verifies anonymous recipe availability or the exact approved offer and updates the versioned content state. Keep the static previews informational; no live Chat, Shop or Bloom features are part of this change.

After PR creation, record its URL and required checks. After merge, record the merge SHA and inspect GitHub deployment evidence. If main promotes automatically, verify the official domain from a fresh browser and record what is actually deployed; do not infer hosting state from the merge alone. Record the actual domain and rollback artifact before claiming a release.
