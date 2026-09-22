# My Curated Haven implementation plans

This folder is the shared home for implementation plans. Each phase has its own directory, detailed tasks, acceptance criteria and handoff notes.

Planning status and product delivery status are separate. Merging a plan does not implement its application changes.

## Published plans

| Phase | Focus | Start here | Delivery status |
| --- | --- | --- | --- |
| 1 | Preserve existing work, align public routes and recipe-first messaging | [Phase 1 overview](phase-1/README.md) | Plan documented, application implementation not verified |
| 2 | Repeatable setup, CI, tests, protected previews and release checks | [Phase 2 overview](phase-2/README.md) | Plan documented, engineering setup not implemented by these documents |
| 3 | Mobile-first design system, components, layouts and print patterns | [Phase 3 overview](phase-3/README.md) | Plan documented, design implementation not completed by these documents |

## Product direction

My Curated Haven remains the brand and https://mycuratedhaven.com/ remains the official domain. “Recipes by Tiny Soho, inside My Curated Haven.” connects the audience to the product.

The first recipe launch serves parents feeding toddlers. Offer three complete free recipes, one defined paid collection through a one-time purchase, and printable recipe pages. Expand parenting features gradually after recipe demand is understood.

See [confirmed scope and unresolved decisions](phase-1/PRODUCT-SCOPE.md). Do not infer a collection count, price, refund policy or future-addition entitlement from these plans.

## Execution order

1. Start Phase 1 inventory and preservation planning.
2. Establish Phase 2 setup, CI and preview safeguards.
3. Implement and verify the Phase 1 application changes using those safeguards.
4. Implement the [Phase 3 design foundation](phase-3/README.md), then continue to later product phases.

Phase 1 documentation is merged through [PR #1](https://github.com/Pratikn07/my-curated-haven-web/pull/1). This is not evidence of a completed Phase 1 website revamp.

## Roadmap context

| Phase | Planned area | Detailed plan |
| --- | --- | --- |
| 0 | Product and commercial decisions | Current decisions recorded in Phase 1 scope |
| 3 | Mobile-first design system | [Detailed Phase 3 plan](phase-3/IMPLEMENTATION-PLAN.md) |
| 4 | Backend security and data foundation | Not written in this package |
| 5 | Recipe structure and editorial review | Not written in this package |
| 6 | Free recipe experience | Not written in this package |
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
