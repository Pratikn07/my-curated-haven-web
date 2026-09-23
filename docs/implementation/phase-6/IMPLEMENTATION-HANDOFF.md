# Phase 6 implementation handoff

## Brief for the implementer

Build the public free recipe experience for My Curated Haven using existing parenting-app recipes. Reuse the Phase 3 components and theme. Verify the Phase 4 data boundary and complete the Phase 5 editorial handoff before public release.

Read [the detailed plan](IMPLEMENTATION-PLAN.md), [recipe reuse requirements](EXISTING-RECIPE-REUSE.md) and [validation gates](VALIDATION-AND-RELEASE.md) first.

## Suggested pull requests

| Slice | Tasks | Review focus |
| --- | --- | --- |
| Source and read contracts | P6-01, P6-02 | Existing-data mapping, privacy, error semantics and backend prerequisites |
| Listing and filters | P6-03, P6-04 | Mobile usability, URL state and honest results |
| Detail and print | P6-05, P6-06 | Recipe fidelity, complete output and print pagination |
| Discovery and release | P6-07 through P6-10 | Navigation, sitemap, accessibility, regressions and release evidence |

If Phase 4 or content review is incomplete, land reusable components with protected synthetic fixtures. Do not connect public routes to unverified data or present fixture work as a finished recipe launch.

## Ownership

The product/content owner selects and approves the three free recipes, their public wording, images and editorial changes. The technical owner verifies source identity, adapters, access enforcement, cache behaviour and release checks.

The user has already chosen the brand, audience, three-free-recipe model and future one-time paid collection. Do not reopen these decisions as routine implementation questions.

Escalate only concrete blockers such as an inaccessible source project, missing content rights or conflicting recipe versions. Record the blocker and continue independent work.

## Completion tracker

| Task | Initial status | Evidence required |
| --- | --- | --- |
| P6-01 | Pending | Verified existing source and content mapping |
| P6-02 | Pending | Public contract and access-test results |
| P6-03 | Pending | Working listing and correct detail links |
| P6-04 | Pending | URL, filter and failure-state checks |
| P6-05 | Pending | Complete approved free detail pages |
| P6-06 | Pending | A4 and Letter print inspection |
| P6-07 | Pending | Navigation, metadata and sitemap validation |
| P6-08 | Pending | Mobile, accessibility and performance findings |
| P6-09 | Pending | Passing required CI and regression evidence |
| P6-10 | Pending | Production verification and rollback record |

## Open decisions and defaults

- Actual three free recipe IDs: content-owner selection from the existing catalog.
- Initial filter groups: show only useful groups supported by reviewed data.
- Approved public slugs and images: establish in the source mapping.
- Backend project and final schema: verify through Phase 4, reuse the existing project where suitable.
- Paid contents, price, refund terms, future additions and access duration: remain Phase 8/product decisions.
- Phase 5 detailed plan: still unwritten at this baseline, with its required content handoff explicitly preserved here.

## Explicit exclusions

No recipe regeneration, duplicate catalog by default, customer account requirement, synced favourites, checkout, unlimited AI, milestone tracking, nutrition estimation, invented ratings, personalized age advice or full parenting-app port.

A future web expansion can reuse this foundation after recipe demand is understood. Phase 6 should prove the cooking experience first.
