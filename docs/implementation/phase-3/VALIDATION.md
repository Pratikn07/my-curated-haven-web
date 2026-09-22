# Phase 3 validation and acceptance

Status: specification. No application checks are recorded as passed by this documentation merge.

Use the actual Phase 2 runner once implemented. Do not confuse merged setup plans with installed test infrastructure.

## Acceptance matrix

| ID | Area | Required evidence |
| --- | --- | --- |
| D01 | Brand | Correct My Curated Haven spelling and Tiny Soho attribution |
| D02 | Tokens | Semantic role usage in actual components, not only swatches |
| D03 | Colour | Normal text meets 4.5:1, qualifying large text meets 3:1 |
| D04 | Fonts | Computed families resolve correctly, no undefined or circular aliases |
| D05 | Narrow layout | No loss of content or page-level horizontal scrolling at 320px |
| D06 | Text scaling | Useful content remains readable at 200% text sizing |
| D07 | Touch | Primary standalone controls meet the chosen 44px minimum target |
| D08 | Keyboard | Logical order, visible focus and operable navigation |
| D09 | Overlay | Correct dialog focus, dismissal, background isolation and return |
| D10 | Motion | Reduced-motion mode removes nonessential animation |
| D11 | Static content | Main copy remains visible when client animation is unavailable |
| D12 | States | Busy, no-result, failure, disabled and missing-image states are distinct |
| D13 | Public boundary | No fixture route, sample price or unbuilt destination in production |
| D14 | Phase 1 continuity | Deferred route behaviour and legal/support access preserved |
| D15 | Print | Letter and A4 output is readable with complete quantities and steps |
| D16 | Performance | Production-build comparison identifies material regressions |
| D17 | Verification | Install, lint, types, build and focused browser checks pass |
| D18 | Handoff | Design choices, fixture status and later feature dependencies recorded |

The 44px target is a product design choice. WCAG 2.2's minimum target-size criterion uses 24 by 24 CSS pixels with exceptions. Do not label the product's stricter target as the universal WCAG requirement. Reference: [W3C target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

For reflow, check the equivalent of 320 CSS pixels, including 400% zoom on a 1280px-wide viewport, without loss of function. Test real layouts rather than assuming media queries guarantee compliance. Reference: [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

## Focused automated coverage

Extend Phase 2 tests rather than adding a second browser runner.

1. Verify public header and footer destinations.
2. Open and close mobile navigation with keyboard and pointer.
3. Check focused controls are visible and not covered by sticky UI.
4. Assert no horizontal document overflow at 320 and 390px.
5. Check visible headings and main content with reduced-motion preferences.
6. Exercise filter Apply and Cancel in the isolated harness.
7. Confirm busy controls prevent duplicate activation in a local example.
8. Verify no-result and error examples show different recovery text.
9. Confirm test fixtures are absent from the production route tree and delivered payloads.
10. Scan touched pages with a compatible automated accessibility tool, such as axe through Playwright.

Do not snapshot entire DOM trees or assert style constants against themselves. Add visual snapshots only for a specific stable layout which needs regression protection.

## Manual accessibility review

Use keyboard and a screen reader on the touched flows. Verify labels, headings, errors, menu state and dialog announcements. Check the actual focus ring against each surrounding surface.

Review essential text in default, hover, focus and error states. Test actual image/overlay backgrounds. Disabled styling still needs to communicate why an action is unavailable.

Review zoom, long labels, narrow landscape orientation, touch targets and on-screen keyboard behaviour. Automated tools supplement these checks and do not certify the whole product.

## Browser and content matrix

| Dimension | Minimum sample |
| --- | --- |
| Width | 320, 390, 768 and 1280px |
| Engines | Chromium and WebKit for touched mobile flows |
| Device | One actual phone/Safari check where available, report if unavailable |
| Preference | Reduced motion, default motion |
| Content | Long title, long ingredient, absent image, unknown metadata |
| State | Empty, error, loading, unavailable and access-preview fixtures |
| Print | Letter and A4 |

Do not broaden checks beyond this matrix without a concrete remaining risk.

## Performance verification

Measure the same production-build page before and after the change with recorded device/network conditions. Keep results distinct from production user measurements.

Use Core Web Vitals as product targets: LCP at or below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below 0.1, assessed at the 75th percentile when field data exists.

A lab run does not establish field INP or prove production targets. Before traffic exists, use lab LCP/CLS, interaction inspection and bundle/network comparison to identify regressions.

Reference: [Web Vitals](https://web.dev/articles/vitals).

Record loaded image sizes, font requests and JavaScript changes on representative routes. The goal is to remove unnecessary client work and avoid oversized media, not to invent a universal byte budget before measuring the baseline.

## Print checks

Inspect browser print preview and a saved PDF from the isolated example. Confirm all ingredients, quantities and steps remain present, including long pages. Check headings near page boundaries and test with background printing disabled.

Printed examples are not approved downloadable products. Do not claim a public export feature exists until a later phase implements and verifies access.

## Release gate and rollback

Use Phase 2's release process after the implementation is authorized.

Require passing checks, reviewed public copy, protected preview evidence, fixture exclusion and before/after examples. Keep a known-good deployment. Revert focused component/style changes through a normal PR if needed.

Check Home, About, Support, Privacy, Terms and implemented deferred routes after release. Do not change routes or bypass protections to repair a colour/layout regression.

## Evidence template

- Source baseline and implementation SHA:
- Preview deployment:
- Accepted design reference:
- Token/contrast review:
- Browser and viewport results:
- Keyboard/screen-reader results:
- Reduced-motion results:
- Fixture exclusion evidence:
- Print evidence:
- Performance comparison:
- Known limitations:
- Product/design reviewer:
- Release and rollback reference:
