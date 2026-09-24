# Phase 11: staged launch and operations

Status: detailed implementation plan. Production preparation, launch execution and operational sign-off are pending.

Phase 10 establishes whether a named release candidate meets the product's QA gates. Phase 11 takes the approved candidate into production, exposes paid checkout gradually, keeps purchases and recipe access reliable, and turns early customer experience into a measured operating routine.

The recommended route is a small invited paid cohort before a wider Tiny Soho announcement. Three complete free recipes stay publicly readable without an account. Checkout eligibility is enforced on the server during the invited stage. A hidden link or a small Instagram post does not restrict access or guarantee low traffic.

## Package map

| Document | Purpose |
| --- | --- |
| [Implementation plan](IMPLEMENTATION-PLAN.md) | Eighteen tasks, dependencies, owners, source targets and acceptance evidence |
| [Launch baseline and decisions](LAUNCH-BASELINE-AND-DECISIONS.md) | Current source, launch blockers, commercial decisions and authority |
| [Production readiness](PRODUCTION-READINESS.md) | Hosting, domain, Supabase, auth mail, Stripe, secrets and configuration |
| [Release and rollback](RELEASE-AND-ROLLBACK.md) | Candidate promotion, database changes, deployment rollback and restore |
| [Staged rollout](STAGED-ROLLOUT.md) | Cohorts, server gates, expansion criteria and stop decisions |
| [Payments and background jobs](PAYMENTS-AND-BACKGROUND-JOBS.md) | Fulfilment, reconciliation, refunds, receipts and job ownership |
| [Monitoring and incidents](MONITORING-AND-INCIDENTS.md) | Operational signals, thresholds, alert routing and incident response |
| [Support operations](SUPPORT-OPERATIONS.md) | Account/access help, refunds, case handling and customer communication |
| [Content and launch communications](CONTENT-AND-LAUNCH-COMMUNICATIONS.md) | Recipe publication, Tiny Soho funnel, consistent offer and safe updates |
| [First 30 days](FIRST-30-DAYS.md) | Daily/weekly routines, measurement, costs and Phase 12 decisions |
| [Validation and acceptance](VALIDATION-AND-ACCEPTANCE.md) | Sixty-four launch/operations scenarios and final acceptance gates |
| [Implementation handoff](IMPLEMENTATION-HANDOFF.md) | PR sequence, release register and reusable execution templates |

## Product boundaries

My Curated Haven stays at https://mycuratedhaven.com/. Use “Recipes by Tiny Soho, inside My Curated Haven.” Serve parents feeding toddlers with simple recipes for busy families.

Offer exactly three complete free recipes, one clearly defined paid collection, a one-time purchase and printable recipe pages. Preserve existing parenting-app recipe IDs, verified user identity and independently valid native rights. Keep Instagram automation in its separate Supabase project.

The first purchase excludes unlimited AI, milestones and future parenting features. A $15 synthetic offer in source is not approved launch pricing. Collection membership, price/currency, refund terms, future additions and hosted access wording need an explicit decision record.

## Completion meaning

Merging this plan does not open checkout, deploy a database migration, send an announcement or spend money. Phase 11 implementation is complete only after the approved rollout, operating controls and evidence pass the acceptance gates. All task and scenario statuses start pending/not run.

The source baseline was checked on 2026-09-24. Recheck source, provider configuration and Phase 10 evidence before execution. No production credentials are needed to write this plan.
