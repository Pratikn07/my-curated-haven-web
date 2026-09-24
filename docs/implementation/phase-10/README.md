# Phase 10: launch QA

This change implements the QA harness and evidence handoff. The paid-release recommendation remains **NO-GO** until candidate-specific staging, commercial, editorial, real-device and operations evidence is complete. See [execution status](evidence/phase10-qa/TASK-STATUS.md) and the [release decision](evidence/phase10-qa/RELEASE-DECISION.md).

Phase 10 proves whether the recipe product is ready for parents to use and buy. A parent should arrive from Tiny Soho, read three complete free recipes, find a clearly described collection, pay once, recover access on another device and print usable recipe pages. The same release must protect private data, existing parenting-app rights and paid content when providers fail or messages arrive twice.

This package defines the implementation work needed to build that evidence. Merging these documents does not certify the app or enable sales. Phase 11 owns staged launch execution and monitoring after the gates pass.

The machine-readable case register is generated from the scenario tables in this package and the tagged Playwright results. CI publishes a sanitized per-run summary. A passing source check may establish partial automated coverage; it does not clear an owner, provider, content, device or production gate.

## Reading order

| Document | Purpose |
| --- | --- |
| [Implementation plan](IMPLEMENTATION-PLAN.md) | Sixteen ordered tasks, dependencies, file targets and completion evidence |
| [Release scope and baseline](RELEASE-SCOPE-AND-BASELINE.md) | Verified source state, missing prerequisites and the exact release candidate |
| [Test strategy and fixtures](TEST-STRATEGY-AND-FIXTURES.md) | Environments, actors, test data, commands and safe evidence handling |
| [Customer journey matrix](CUSTOMER-JOURNEY-MATRIX.md) | Repeatable discovery, account, purchase and recovery scenarios |
| [Security, privacy and payments](SECURITY-PRIVACY-AND-PAYMENTS.md) | Direct API, RLS, ownership, payment races and consent checks |
| [Mobile, accessibility and print](MOBILE-ACCESSIBILITY-AND-PRINT.md) | Real-device coverage, keyboard and screen-reader checks, printed output |
| [Performance, SEO and content](PERFORMANCE-SEO-AND-CONTENT.md) | Measured budgets, discoverability and recipe editorial review |
| [CI and environment reliability](CI-AND-ENVIRONMENT-RELIABILITY.md) | Required checks, skipped tests, image-download failures and evidence validity |
| [Defects and release gates](DEFECTS-AND-RELEASE-GATES.md) | Blocking rules, retest scope and accountable sign-off |
| [Rollback and operations rehearsal](ROLLBACK-AND-OPERATIONS-REHEARSAL.md) | Checkout stop, fulfilment recovery, restore rehearsal and support readiness |
| [Implementation handoff](IMPLEMENTATION-HANDOFF.md) | Suggested PR sequence, evidence templates and Phase 11 handoff |

## Fixed product boundaries

- My Curated Haven is the product at https://mycuratedhaven.com/.
- Use “Recipes by Tiny Soho, inside My Curated Haven.”
- Serve parents feeding toddlers with simple recipes for busy families.
- Keep exactly three complete free recipes available without an account.
- Offer one defined recipe collection through a one-time purchase, with mobile web access and printable pages.
- Reuse parenting-app recipes, source IDs and verified identity. Preserve independently valid native rights.
- Keep Instagram automation in its separate Supabase project.
- Exclude unlimited AI, milestones and future parenting tools from this purchase.

Price, currency, exact paid membership, refund terms, future additions and hosted access duration still require decisions. QA verifies an approved promise. QA does not invent one.

The initial baseline was inspected on 2026-09-23 and refreshed on 2026-09-24 after Phases 7–9 merged. Refresh the baseline and deployment status when implementation starts. All P10 tasks and QA scenarios start as **not run**, unless an execution record supplies evidence for a named candidate.
