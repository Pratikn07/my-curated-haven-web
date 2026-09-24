# My Curated Haven implementation plans

This folder is the shared home for implementation plans. Each phase has its own directory, detailed tasks, acceptance criteria and handoff notes.

Planning status and product delivery status are separate. Merging a plan does not implement its application changes.

## Published plans

| Phase | Focus | Start here | Delivery status |
| --- | --- | --- | --- |
| 1 | Preserve existing work, align public routes and recipe-first messaging | [Phase 1 overview](phase-1/README.md) | Implementation source present, [recorded evidence](phase-1/IMPLEMENTATION-EVIDENCE.md) |
| 2 | Repeatable setup, CI, tests, protected previews and release checks | [Phase 2 overview](phase-2/README.md) | Setup source present, [recorded evidence](phase-2/IMPLEMENTATION-EVIDENCE.md) |
| 3 | Mobile-first design system, components, layouts and print patterns | [Phase 3 overview](phase-3/README.md) | Design source present, [recorded evidence](phase-3/IMPLEMENTATION-EVIDENCE.md) |
| 4 | Backend security, recipe data, access rules and migrations | [Phase 4 overview](phase-4/README.md) | Implementation source present, [recorded evidence](phase-4/IMPLEMENTATION-EVIDENCE.md) |
| 5 | Recipe structure, editorial review, and catalog ingestion | [Phase 5 overview](phase-5/README.md) | Catalog audited, mapping rules defined, [handoff complete](phase-5/IMPLEMENTATION-HANDOFF.md) |
| 6 | Public free recipes, browsing, filters, detail and print | [Phase 6 overview](phase-6/README.md) | Implementation source present, [recorded evidence](phase-6/IMPLEMENTATION-EVIDENCE.md) |
| 7 | Optional accounts and private saved recipes | [Phase 7 overview](phase-7/README.md) | Implementation source merged in PR #15, [recorded evidence](phase-7/IMPLEMENTATION-EVIDENCE.md), integrated launch QA pending |
| 8 | One-time checkout, purchased recipe access, refunds and recovery | [Phase 8 overview](phase-8/README.md) | Implementation source merged in PR #18, [recorded evidence](phase-8/IMPLEMENTATION-EVIDENCE.md), commercial approval and launch QA pending |
| 9 | Recipe funnel analytics, payment measurement and Tiny Soho attribution | [Phase 9 overview](phase-9/README.md) | Implementation source merged in PR #20, [recorded evidence](phase-9/IMPLEMENTATION-EVIDENCE.md), optional export disabled by default |
| 10 | Launch QA, integrated journeys, security and release evidence | [Phase 10 overview](phase-10/README.md) | Plan documented, QA execution and launch approval pending |
| 11 | Staged launch, operations, support and first-month review | [Phase 11 overview](phase-11/README.md) | Plan documented, production preparation and launch execution pending |

## Product direction

My Curated Haven remains the brand and https://mycuratedhaven.com/ remains the official domain. “Recipes by Tiny Soho, inside My Curated Haven.” connects the audience to the product.

The first recipe launch serves parents feeding toddlers. Offer three complete free recipes, one defined paid collection through a one-time purchase, and printable recipe pages. Expand parenting features gradually after recipe demand is understood.

Reuse the existing parenting-app recipe catalog by default. A framework change does not require a replacement catalog or a new database. Preserve source identity and reviewed content when adapting recipes for the web.

See [confirmed scope and unresolved decisions](phase-1/PRODUCT-SCOPE.md). Do not infer a collection count, price, refund policy or future-addition entitlement from these plans.

## Execution order

1. Start Phase 1 inventory and preservation planning.
2. Establish Phase 2 setup, CI and preview safeguards.
3. Implement and verify the Phase 1 application changes using those safeguards.
4. Complete the [Phase 3 design foundation](phase-3/README.md) and its remaining verification.
5. Establish the [Phase 4 backend foundation](phase-4/README.md) before public recipe and purchase work.
6. Complete Phase 5 source mapping, recipe review and selection of the three free recipes.
7. Deliver the [Phase 6 free recipe experience](phase-6/README.md). Frontend work can proceed with protected synthetic fixtures, but public release requires the backend and content gates.
8. Add [Phase 7 accounts and saved recipes](phase-7/README.md), preserving anonymous free access and verified native identity continuity.
9. Deliver [Phase 8 one-time checkout and purchased access](phase-8/README.md), including legacy access hardening, verified payment, refunds and recovery, before enabling purchase analytics.
10. Implement [Phase 9 measurement](phase-9/README.md) progressively as recipe, account and payment features become available. Keep Instagram automation separate from product data.
11. Execute [Phase 10 launch QA](phase-10/README.md) against the integrated release candidate, close blocking defects and hand the evidence to Phase 11.
12. Execute [Phase 11 staged launch and operations](phase-11/README.md), establish production controls, expand only after stage gates and review the first 30 days.

Phase 1 documentation originally merged through [PR #1](https://github.com/Pratikn07/my-curated-haven-web/pull/1). Main now also contains Phase 1–3 implementation source and evidence files. Those files report work at their recorded commits and list outstanding checks. Source presence is not a fresh verification of current production behaviour.

## Roadmap context

| Phase | Planned area | Detailed plan |
| --- | --- | --- |
| 0 | Product and commercial decisions | Current decisions recorded in Phase 1 scope |
| 3 | Mobile-first design system | [Detailed Phase 3 plan](phase-3/IMPLEMENTATION-PLAN.md) |
| 4 | Backend security and data foundation | [Detailed Phase 4 plan](phase-4/IMPLEMENTATION-PLAN.md) |
| 5 | Recipe structure and editorial review | [Detailed Phase 5 plan](phase-5/IMPLEMENTATION-PLAN.md) |
| 6 | Free recipe experience | [Detailed Phase 6 plan](phase-6/IMPLEMENTATION-PLAN.md) |
| 7 | Accounts and favourites | [Detailed Phase 7 plan](phase-7/IMPLEMENTATION-PLAN.md) |
| 8 | One-time checkout and purchased access | [Detailed Phase 8 plan](phase-8/IMPLEMENTATION-PLAN.md) |
| 9 | Analytics | [Detailed Phase 9 plan](phase-9/IMPLEMENTATION-PLAN.md) |
| 10 | Launch QA | [Detailed Phase 10 plan](phase-10/IMPLEMENTATION-PLAN.md) |
| 11 | Staged launch and operations | [Detailed Phase 11 plan](phase-11/IMPLEMENTATION-PLAN.md) |
| 12 | Evidence-led parenting expansion | Not written in this package |

Some work overlaps. Define analytics events before feature instrumentation, and enforce paid-content access before exposing paid recipes.

## Folder convention

Use `docs/implementation/phase-N/` for each future phase. Add a README linking to the detailed plan and supporting documents. Keep one authoritative plan per phase and update this index when a new phase is added.

Record task IDs, dependencies, file targets, verification and remaining questions. Mark work complete only with execution evidence. Preserve older phase links rather than renaming directories during routine updates.
