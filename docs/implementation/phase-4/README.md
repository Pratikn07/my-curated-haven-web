# Phase 4: backend security and data foundation

[All implementation plans](../README.md)

Status: implemented. The schema is in production on `ccrgvammglkvdlaojgzv` (PR #11, 2026-09-22). The 2026-09-25 audit closed the legacy access holes; see [IMPLEMENTATION-EVIDENCE.md](IMPLEMENTATION-EVIDENCE.md#audit-2026-09-25) and the production migration rules in [MIGRATION-AND-ROLLOUT.md](MIGRATION-AND-ROLLOUT.md#production-migration-state-and-rules).

## Outcome

Build a verified backend foundation for three complete free recipes and one defined paid collection. Public previews, protected content and customer access have separate contracts. Prepare for later account and payment features without importing the full parenting database.

## Read in order

1. [Detailed implementation plan](IMPLEMENTATION-PLAN.md)
2. [Architecture, source audit and environment decisions](ARCHITECTURE.md)
3. [Data contracts and ownership](DATA-CONTRACTS.md)
4. [Security, access rules and server integration](SECURITY-AND-ACCESS.md)
5. [Migration and rollout plan](MIGRATION-AND-ROLLOUT.md)
6. [Validation and acceptance](VALIDATION.md)
7. [Implementation handoff](IMPLEMENTATION-HANDOFF.md)

## Current evidence

Reviewed on 2026-09-23:

- Web main: 05bddc837fb4ad6755e68ef897f1752ec3ee4d06.
- Native source: 5e5caa73f5a5d0705572739dd881a96abe9be23b in Pratikn07/parenting-app.
- Web main now contains Phase 1–3 implementation code, evidence documents, a web-quality workflow and Playwright tests.
- The web package declares Next.js ^16.3.6 and React 19.2.0. No Supabase client package or backend migrations were found in the inspected web tree.
- Evidence files report completed local/CI work with remaining preview, accessibility and production-verification limitations. Those historical reports are not new test runs by this task.
- The connected Supabase project list returned only insta-automation.
- The native repository records a different project reference. Its active database, policies and deployment state were not inspected.
- No live tables, customer records, tokens or storage objects were read for this plan.

The correct product database is unresolved. Connected access to an Instagram automation database is not evidence of a recipe backend.

## Scope

Deliver a project/environment decision, isolated local schema, explicit grants and row policies, storage boundaries, typed data access, Next.js server/client foundations, synthetic tests and a staged migration procedure.

Create the entitlement read model needed to test protected content. Real purchases, Stripe webhooks and customer-facing account flows belong to later phases.

## Dependencies

- [Phase 1 decisions](../phase-1/PRODUCT-SCOPE.md) define commercial scope and open terms.
- [Phase 2 delivery foundation](../phase-2/README.md) supplies CI, previews and release checks.
- [Phase 3 presentation contracts](../phase-3/COMPONENT-SPECIFICATION.md) define public-preview and authorized-content states.
- Phase 5 reviews and imports real recipes.
- Phase 6 exposes recipe browsing and detail pages.
- Phase 7 implements account and favourites journeys.
- Phase 8 creates trusted purchase-derived entitlements.

Price, collection membership, refunds, future additions and hosted access duration remain owner decisions. Local fixtures are not purchase promises.

## Completion boundary

Local foundation is complete when migrations replay and the access matrix passes with synthetic identities. Shared-environment readiness additionally requires verified project ownership, deployment settings and restore evidence.

Missing target access blocks remote changes, not writing the schema proposal or running isolated tests. Record those states separately.
