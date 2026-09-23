# Phase 8: one-time checkout and purchased recipe access

Status: detailed implementation plan. Documentation only. This package does not enable payments, modify databases, issue refunds or send customer messages.

## Outcome

A parent explores three complete free recipes, understands the paid collection, signs in, pays once through Stripe Checkout and receives reliable access to the purchased recipes and printable pages. Returning customers recover access through their existing account. Support resolves payment and access problems from an auditable record.

Keep **My Curated Haven**, https://mycuratedhaven.com/ and **Recipes by Tiny Soho, inside My Curated Haven.** The initial promise is **simple toddler recipes for busy families**.

## Read this package in order

| Document | Purpose |
| --- | --- |
| [Implementation plan](IMPLEMENTATION-PLAN.md) | Eighteen tasks, dependencies, proposed code targets and acceptance criteria |
| [Commercial decisions](COMMERCIAL-DECISIONS.md) | Confirmed scope, unresolved launch decisions and customer promises |
| [Existing system and required changes](EXISTING-SYSTEM-AND-CHANGES.md) | Repository findings, existing recipe reuse and gaps to close |
| [Customer experience](CUSTOMER-EXPERIENCE.md) | Sales page, sign-in, hosted checkout, pending payment and owned library |
| [Payment data and states](PAYMENT-DATA-AND-STATES.md) | Order ledger, constraints, ownership, concurrency and entitlement projection |
| [Checkout implementation](CHECKOUT-IMPLEMENTATION.md) | Stripe setup, request contracts, price validation and duplicate prevention |
| [Webhooks and fulfilment](WEBHOOKS-AND-FULFILMENT.md) | Durable receipt, verified payment, worker processing and recovery |
| [Recipe access and security](RECIPE-ACCESS-AND-SECURITY.md) | Existing RLS, legacy data, storage, printing, caches and native compatibility |
| [Refunds and support](REFUNDS-AND-SUPPORT.md) | Refunds, disputes, repurchases, lost access and account lifecycle |
| [Operations and rollout](OPERATIONS-AND-ROLLOUT.md) | Environment setup, reconciliation, incidents, rollout and rollback |
| [Validation matrix](VALIDATION-MATRIX.md) | Required scenarios, expected results and release evidence |
| [Implementation handoff](IMPLEMENTATION-HANDOFF.md) | PR slices, owners, decisions, estimates and Phase 9 interface |

## Baseline and dependencies

Refreshed main: `dae5aed5024d29d2e0e4edebeab7e4ab9582e737`, 2026-09-23. Phase 4, Phase 5 and Phase 6 implementation source exists. Their evidence describes recorded checks, not a new audit of hosted production. Phase 7 is a plan at this baseline. Phase 9 analytics planning is merged.

Phase 8 depends on Phase 6 recipe reading/printing and Phase 7 verified identity, session recovery and transactional email readiness. Start data contracts and test fixtures before those phases finish. Do not enable live checkout until the integrated journey passes.

Use the verified parenting/product Supabase project and existing recipe UUIDs. Instagram automation uses a separate database and has no role in payment authority. The source catalog's recorded 70 recipes does not establish the paid collection's size or contents.

## Initial delivery boundary

Included: one defined collection, one-time payment, an account-bound purchase, hosted Stripe Checkout, server-verified payment, purchased recipe reading/printing, receipts, refund handling, recovery and operational reporting.

Excluded: subscriptions, cart/multiple products, gifts, household sharing, coupon campaigns, marketplace payouts, saved-card upsells, affiliate payouts, unlimited AI, milestone tracking and future parenting tools. A downloadable whole-book PDF is optional future scope. Printable individual recipe pages are required now.

Prices, currency, paid membership, refund terms, future additions and access duration require explicit product decisions. Synthetic test values permit engineering progress. They are never published as final commercial promises.

See the [shared index](../README.md) and [Phase 9 handoff](IMPLEMENTATION-HANDOFF.md#phase-9-contract).
