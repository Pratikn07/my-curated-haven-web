# Phase 9: analytics and recipe funnel measurement

Status: detailed implementation plan. No tracking, database migration, provider account or production dashboard is enabled by this package.

## Outcome

Understand whether Tiny Soho brings parents to My Curated Haven, whether the three free recipes are useful, whether the paid collection converts, and whether purchasers return to use recipes. Use the findings to choose the next product improvement before expanding parenting features.

Keep the product promise: **simple toddler recipes for busy families**, with **Recipes by Tiny Soho, inside My Curated Haven.** Reuse the parenting recipe IDs. The Instagram automation database remains a separate system.

## Package

| Document | Purpose |
| --- | --- |
| [Implementation plan](IMPLEMENTATION-PLAN.md) | Twelve ordered tasks, dependencies, file targets and acceptance criteria |
| [Measurement and events](MEASUREMENT-AND-EVENTS.md) | Event definitions, ownership, denominators and trustworthy purchase reporting |
| [Architecture and privacy](ARCHITECTURE-AND-PRIVACY.md) | Provider recommendation, consent, data boundaries and legacy search exposure |
| [Instagram attribution](INSTAGRAM-ATTRIBUTION.md) | Campaign links, separate source data and limits of attribution |
| [Dashboards and decisions](DASHBOARDS-AND-DECISIONS.md) | Founder reporting, reconciliations and weekly decisions |
| [Validation and release](VALIDATION-AND-RELEASE.md) | Test cases, staged rollout, disable switches and completion gates |
| [Implementation handoff](IMPLEMENTATION-HANDOFF.md) | PR slices, unresolved choices and delivery evidence |

## Scope and dependencies

Included: explicit recipe events, optional analytics consent, campaign attribution, confirmed payment metrics, aggregate Instagram reporting, a small set of private dashboards, data quality checks and a weekly review process.

Excluded: advertising pixels, retargeting, session recordings, child profiles, health profiling, automatic marketing messages, A/B testing infrastructure, a custom business intelligence product and person-level Instagram matching.

Baseline inspected: repository main `aa7f0bda36dc2b78a05c578288d992411c26d46f`, 2026-09-23. Phase 4 and Phase 5 implementation source and recorded evidence exist. Phase 6 and Phase 7 are documented plans at this baseline. The shared roadmap assigns payments to Phase 8, but its detailed package is absent at this commit. Treat Phase 8 interfaces below as requirements to agree with its implementation, not existing functions or tables.

Begin event contracts and test fixtures now. Enable each feature's instrumentation only when its underlying phase is implemented. Free recipe measurement does not wait for checkout. Purchase reporting does wait for a tested Phase 8 ledger and fulfilment process.

See the [shared index](../README.md). No credentials are needed to review this plan.
