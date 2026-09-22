# Test strategy and acceptance matrix

## Test the shipped state

Phase 1 plans are merged. Phase 1 application changes are not established by that merge.

Start Phase 2 tests against current working routes. Add changed-behaviour assertions alongside the source change. Do not introduce permanent skipped tests, environment switches accepting both old and new behaviour, or false claims of future-route coverage.

## Initial browser suite

| ID | Area | Assertion |
| --- | --- | --- |
| T01 | Homepage | Successful load, visible main content and expected brand |
| T02 | Public routes | About, Support, Privacy and Terms load without a server error |
| T03 | Brand navigation | Brand link from a secondary page returns to / |
| T04 | Mobile menu | Menu opens, intended link is reachable and navigation works |
| T05 | Support | Support destination and expected contact link are present |
| T06 | Internal links | Current header/footer links resolve to intended internal destinations |
| T07 | Mobile fit | Core header and interactive controls fit at small width |
| T08 | Browser health | No uncaught application exception during tested flows |

T08 should use a narrow policy for known external-resource noise. Do not ignore all console or page errors.

Do not assert the old AI/parenting headline as a permanent contract. Brand, route function and usable structure are more durable baseline checks.

## Phase 1 integration tests

Add these in the Phase 1 code PR after the minimum Phase 2 runner is ready:

| ID | Area | Assertion |
| --- | --- | --- |
| T09 | Deferred routes | Selected old URLs return 404, except a documented Contact redirect |
| T10 | Content delivery | Old page bodies are absent from HTML, RSC responses and loaded route assets |
| T11 | Public navigation | Deferred links are absent across desktop, mobile, footer and body content |
| T12 | Discovery | Sitemap contains only the approved public URLs |
| T13 | Metadata | Official domain/brand and intended indexing treatment |
| T14 | Menu accessibility | Expanded state, focus visibility, Escape and close-on-selection |
| T15 | Transition scope | No Buy or recipe destination appears before implementation |

For T10, use unique representative text from each preserved page and inspect more than the visible DOM. Search the production output for accidental imports of deferred content and verify the relevant network responses. Do not scan the preserved source and treat its existence as a leak.

Source files retained in a public repository are not confidential. This test protects the website delivery boundary, not repository visibility or historical caches.

## Viewport and browser coverage

Initial automated projects: Chromium desktop and mobile-sized Chromium. Use 390px for routine mobile checks and a focused 320px narrow-width case.

Before releasing changed Phase 1 mobile navigation, add WebKit and manually review the touched flow on Safari where available. Emulation is not proof of real-device behaviour.

Avoid full screenshot baselines for every page. Capture screenshots as failure evidence. Use visual comparison only for a specific layout regression.

## Test isolation

- Run against a local production-mode server in the required CI job.
- Use fixtures without real parent or child data.
- Do not click email-send, checkout or external purchase actions.
- Do not call Supabase merely to test static page rendering.
- Use one fresh browser context per test.
- Avoid global mutable test state and dependence on test order.
- Use role/name locators and observable behaviour.
- Keep network waits tied to actual events, not arbitrary delays.

## CI acceptance evidence

| Gate | Evidence required |
| --- | --- |
| Reproducible install | Clean npm ci leaves dependency manifests unchanged |
| Types | Route type generation and strict TypeScript pass |
| Static checks | Lint passes without new suppressed failures |
| Build | Production build succeeds |
| Browser suite | Actual nonzero test count and passing outcomes |
| Failure handling | Deliberate failure produces a failed job |
| Merge block | Required-check rule blocks the failing PR state |
| Recovery | Corrected PR receives a passing result |
| Artifacts | Failure evidence present without confidential data |
| Preview access | Anonymous denied, authorized reviewer reaches expected SHA |

Passing lint or host deployment alone does not satisfy the browser gates.

## Handling baseline failures

Record the failing assertion or command, affected file and reproduction. Fix relevant setup or source problems with the smallest justified change. Do not rename the check, skip the route or replace assertions with “page exists” to make CI green.

If an unrelated baseline failure is substantial, isolate the fix and explain its dependency. Complete independent setup first. Do not claim Phase 2 complete while a required gate fails.

## Definition of done

All bootstrap tests run and pass. Phase 1-specific tests have a clear implementation owner and land with the associated source changes. The deliberate-failure exercise is recorded. An external settings blocker is recorded as an incomplete task.

Reference: [Next.js Playwright guide](https://nextjs.org/docs/app/guides/testing/playwright), which recommends testing production code.
