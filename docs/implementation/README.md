# My Curated Haven implementation plans

This folder is the shared home for implementation plans. Each phase has its own directory, detailed tasks, acceptance criteria and handoff notes.

Planning status and product delivery status are separate. Merging a plan does not implement its application changes.

## Published plans

| Phase | Focus | Start here | Delivery status |
| --- | --- | --- | --- |
| 1 | Preserve existing work, align public routes and recipe-first messaging | [Phase 1 overview](phase-1/README.md) | Implementation source present, [recorded evidence](phase-1/IMPLEMENTATION-EVIDENCE.md) |
| 2 | Repeatable setup, CI, tests, protected previews and release checks | [Phase 2 overview](phase-2/README.md) | Setup source present, [recorded evidence](phase-2/IMPLEMENTATION-EVIDENCE.md) |
| 3 | Mobile-first design system, components, layouts and print patterns | [Phase 3 overview](phase-3/README.md) | Design source present, [recorded evidence](phase-3/IMPLEMENTATION-EVIDENCE.md) |
| 4 | Backend security, recipe data, access rules and migrations | [Phase 4 overview](phase-4/README.md) | Plan documented, backend implementation pending |
| 6 | Public free recipes, browsing, filters, detail and print | [Phase 6 overview](phase-6/README.md) | Plan documented, implementation and content handoff pending |

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

Phase 1 documentation originally merged through [PR #1](https://github.com/Pratikn07/my-curated-haven-web/pull/1). Main now also contains Phase 1–3 implementation source and evidence files. Those files report work at their recorded commits and list outstanding checks. Source presence is not a fresh verification of current production behaviour.

## Roadmap context

| Phase | Planned area | Detailed plan |
| --- | --- | --- |
| 0 | Product and commercial decisions | Current decisions recorded in Phase 1 scope |
| 3 | Mobile-first design system | [Detailed Phase 3 plan](phase-3/IMPLEMENTATION-PLAN.md) |
| 4 | Backend security and data foundation | [Detailed Phase 4 plan](phase-4/IMPLEMENTATION-PLAN.md) |
| 5 | Recipe structure and editorial review | Not written in this package |
| 6 | Free recipe experience | [Detailed Phase 6 plan](phase-6/IMPLEMENTATION-PLAN.md) |
| 7 | Accounts and favourites | Not written in this package |
| 8 | One-time checkout and purchased access | Not written in this package |
| 9 | Analytics | Not written in this package |
| 10 | Launch QA | Not written in this package |
| 11 | Staged launch and operations | Not written in this package |
| 12 | Evidence-led parenting expansion | Not written in this package |

Some work overlaps. Define analytics events before feature instrumentation, and enforce paid-content access before exposing paid recipes.

## Folder convention

Use `docs/implementation/phase-N/` for each future phase. Add a README linking to the detailed plan and supporting documents. Keep one authoritative plan per phase and update this index when a new phase is added.

Record task IDs, dependencies, file targets, verification and remaining questions. Mark work complete only with execution evidence. Preserve older phase links rather than renaming directories during routine updates.
