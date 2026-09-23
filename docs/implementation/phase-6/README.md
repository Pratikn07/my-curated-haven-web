# Phase 6: the free recipe experience

Status: implementation plan. Application changes are not delivered by this documentation PR.

## Outcome

Parents arriving from Tiny Soho should discover three complete, reviewed toddler recipes, find a useful option on a phone, cook from the recipe page and print it without creating an account.

Use the existing parenting-app recipe catalog as the starting point. Phase 6 builds its web experience. It does not commission a replacement catalog, regenerate recipes with AI or assume a new database is required.

Brand: **My Curated Haven**. Domain: https://mycuratedhaven.com/. Attribution: **Recipes by Tiny Soho, inside My Curated Haven.**

## Read this package

| Document | Purpose |
| --- | --- |
| [Implementation plan](IMPLEMENTATION-PLAN.md) | Ordered tasks, dependencies, file targets and acceptance criteria |
| [Existing recipe reuse](EXISTING-RECIPE-REUSE.md) | Source audit, content handoff and web data contract |
| [Browsing and filters](BROWSING-AND-FILTERS.md) | Listing, search, URL state, mobile filters and result states |
| [Detail, print and discovery](DETAIL-PRINT-AND-DISCOVERY.md) | Recipe pages, images, printing and search visibility |
| [Validation and release](VALIDATION-AND-RELEASE.md) | Checks, release gates, monitoring and rollback |
| [Implementation handoff](IMPLEMENTATION-HANDOFF.md) | Suggested PR sequence, ownership and completion record |

## Boundaries

Included: public recipe listing, search and useful filters, complete free recipe pages, printable pages, accessible mobile interactions, honest loading and error states, navigation and sitemap integration.

Deferred: customer accounts and synced favourites to Phase 7, one-time checkout and purchased access to Phase 8, full analytics integration to Phase 9. Do not add nonfunctional Save or Buy buttons. Browser bookmarks and printing are sufficient for this phase.

Three complete recipes are free. A future paid collection remains one defined purchase. Price, collection contents, refund terms, future additions and access duration remain unresolved. Phase 6 must not imply unlimited recipes, a subscription or access to future parenting tools.

## Dependencies

The [Phase 3 foundation](../phase-3/README.md) supplies the design system. The [Phase 4 plan](../phase-4/README.md) defines proposed access boundaries, but its backend implementation remains pending at this plan's baseline.

Phase 5 covers recipe structure and editorial review. No separate Phase 5 package exists in the reviewed main branch. Writing Phase 6 now does not complete or skip that work. Frontend work can progress with clearly marked synthetic fixtures in local and protected preview environments. Public release requires the actual existing catalog to be audited, three free recipes approved, and the Phase 4 security gates passed.

See the [shared index](../README.md) for the full roadmap.
