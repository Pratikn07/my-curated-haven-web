# Mobile, accessibility and performance evidence

Reviewed: 2026-09-24
Candidate: local production build on the homepage-vision implementation branch

## Responsive and visual review

- Playwright’s responsive sweep checked 320, 390, 768 and 1280 CSS-pixel widths with no horizontal overflow. The three full-page screenshots are linked in [the asset manifest](ASSET-MANIFEST.md).
- Independent full-page visual review found no blocker in hierarchy, recipe-first navigation, purchase boundary, preview labeling or crop at 390, 768 and 1280 px. The reviewer suggested checking small-screen label/caption size during content approval and reducing repeated “Back to recipes” links if they prove repetitive; these did not block this candidate.
- The mobile cross-route navigation check opens the menu from `/about`, follows “What’s ahead,” closes the menu, focuses the destination and confirms the target is in view.
- The manual Impeccable visual detector returned an empty finding list for the changed UI targets.

## Automated checks

Commands passed on the candidate before documentation-only evidence updates:

```text
npm run lint
npm run typecheck
npm run test:homepage:unit
npm run test:phase10:unit
npm run build -- --webpack
npm run check:routes
npm run test:e2e -- tests/e2e/homepage-vision.spec.ts tests/e2e/analytics-consent.spec.ts tests/e2e/analytics-contract.spec.ts tests/e2e/public-site.spec.ts --workers=1
```

The focused Playwright command completed with **92 passed, 10 skipped** across Chromium desktop, Chromium mobile and WebKit mobile. Skips are the explicitly project-scoped desktop/mobile variants. The axe assertion runs on Chromium desktop and found no critical or serious tagged violations; it does not establish manual contrast, keyboard or assistive-technology acceptance.

The public-route check passed against the freshly built local server. The broader 285-case suite was attempted with one worker but did not finish: the local `next-server` processes saturated CPU, the localhost health request timed out, and early Commerce V10 and design-system cases timed out. That run was stopped before a final report; its status is inconclusive and it is not counted as a pass.

## Preliminary local transfer sample

One unthrottled Chromium sample used a 390 × 844 viewport, device scale factor 3, the local production build and a fresh browser context. It is a local diagnostic snapshot, not a representative phone/network profile:

| Measurement | Sample | Limit of evidence |
| --- | ---: | --- |
| Initial transfer including navigation | 396,824 bytes | Localhost, no network/CPU throttle; optional analytics remained unconsented |
| Encoded JavaScript resources | 222,678 bytes | Current route only; no pre-change comparison |
| Optimized hero image response | 47,086 encoded bytes; 47,386 transferred | One `w=1200`, `q=75` responsive request at DPR 3 |
| Largest Contentful Paint | 208 ms | Single local lab sample; not a field result or agreed throttled profile |
| Cumulative Layout Shift | 0.0000 | Single local lab sample |

The current hero request and initial transfer are below the plan’s proposed absolute byte limits in this sample. The **25 KB added route-JS budget is unverified** because there is no measured same-profile baseline. LCP/CLS targets also remain unverified on an agreed phone/network profile. No field-performance claim is made.

## Manual checks still required for launch acceptance

200% zoom, long-string stress, keyboard traversal of all controls, real screen-reader review, manual contrast and target-size review, real iOS/Android and Instagram browser coverage, and a repeatable throttled performance baseline have not been completed. See [case results](CASE-RESULTS.csv).
