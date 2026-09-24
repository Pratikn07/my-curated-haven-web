# Phase 8 implementation handoff

## PR sequence

Keep each implementation PR reviewable. Merge behind disabled checkout until the end-to-end gates pass. The sequence below groups the eighteen tasks by dependency and risk.

| Slice | Tasks | Main deliverable | Review owner |
| --- | --- | --- | --- |
| A: verified inputs | P8-01, P8-02 | Environment/rights inventory, C01–C14, reviewed recipe manifest | Product, content and engineering |
| B: access hardening | P8-03 | Legacy read closure, release freezing and native compatibility | Backend/security |
| C: commerce state | P8-04 | Private ledger, constraints, source provenance and migration evidence | Backend |
| D: provider and sales UI | P8-05, P8-06, P8-07 | Sandbox config, truthful sales states and account binding | Full-stack and product |
| E: checkout | P8-08 | Retry-safe creation, reservation and recovery contract | Backend/payments |
| F: fulfilment | P8-09, P8-10 | Durable inbox, worker, verification and atomic access projection | Backend/payments |
| G: customer delivery | P8-11, P8-12, P8-13 | Pending/return UI, library/print and receipt handling | Frontend and support |
| H: adjustments/operations | P8-14, P8-15, P8-16 | Refund/dispute correctness, reconciliation and analytics interface | Payments, operations and data |
| I: validation/release | P8-17, P8-18 | Completed matrix, rollout, rollback and handover | Engineering and product owner |

Slices D UI work and early test fixtures proceed while B/C mature. Slice E must wait for the state/identity contracts. No live sale precedes F, G, H and I. A merged Phase 8 plan is not a merged payment implementation.

## Suggested engineering ownership

Assign one accountable implementer for the order/access domain to prevent independent grant writers. A second reviewer should examine identity binding, SQL privileges, release immutability, retries and refund races. This is a team review recommendation, not an instruction to spawn automated agents.

The founder owns commercial decisions and business/provider activation. The content owner signs the existing recipe manifest. Engineering owns migrations, environment isolation, tests and recovery. Support owns verification scripts and customer resolution. Operations owns worker health, reconciliation and incident coverage.

Estimate after P8-01 against the actual Phase 6/7 implementation and available runner. Treat access hardening, payment consistency and recovery as separate deliverables from sales-page styling. Avoid a delivery date based only on adding a Buy button.

## Proposed file map

| Area | Targets |
| --- | --- |
| Domain/configuration | `src/lib/payments/config.ts`, `types.ts`, `stripe.ts`, `identity.ts` |
| Storage/services | `src/lib/payments/repository.ts`, `checkout.ts`, `fulfilment.ts`, `adjustments.ts` |
| Background operations | `src/lib/payments/inbox.ts`, `worker.ts`, `reconcile.ts`, `notifications.ts` |
| HTTP | `src/app/api/checkout/route.ts`, `src/app/api/stripe/webhook/route.ts`, owner-only order status/refresh routes |
| UI | Collection sale page, checkout return/cancel, account collections and existing recipe/print components |
| Existing boundaries | `src/lib/data/access.ts`, `recipes.ts`, Phase 7 session/return helpers |
| Database | CLI-generated forward migrations, private commerce schema, existing entitlement projection, pgTAP tests |
| Validation | Payment policy/contract tests, local DB concurrency tests, `tests/e2e/commerce.spec.ts` |
| Configuration/docs | `.env.example`, lockfiles, CI, commercial decision record and implementation evidence |

App paths are relative to `my-curated-haven-web/`. Final filenames should follow the implemented app conventions. Avoid introducing another independent authentication client, recipe catalog or analytics event vocabulary.

## Phase 9 contract

Align with [Phase 9 event definitions](../phase-9/MEASUREMENT-AND-EVENTS.md).

| Event | Authoritative point | Stable fields |
| --- | --- | --- |
| `checkout_created` | Provider Session bound to committed order attempt | Opaque attempt reference, release ID, occurrence time |
| `purchase_confirmed` | Verified paid transition committed | Opaque order reference, release, currency, paid minor amount, paid time |
| `purchase_access_activated` | First committed paid-source access activation for the order | Opaque order reference, release, activation delay |
| `refund_confirmed` | Unique successful refund adjustment committed | Opaque refund/order references, amount/currency, occurrence time |

Each event has a semantic deduplication key and schema version. Restoration after a dispute is not another purchase or first activation. Refund failure after prior success needs an adjustment/reconciliation record and updated reporting, not deletion of history.

The private all-order ledger remains complete regardless of optional analytics consent. Optional provider export uses Phase 9's consent and revocation checks. Do not send auth UUIDs, email addresses, billing data, full provider objects or raw URLs. Analytics outage/rejection does not affect entitlement delivery.

Phase 9's original README recorded Phase 8's absence at its historical baseline. This package supplies the missing detailed plan. Both phases still require implementation and verified integration.

## Evidence required before completion

- Baseline/deployed SHA, implementation PR links and target environment.
- Approved C01–C14 and immutable paid manifest with preserved source recipe IDs.
- Current project/identity/native-rights evidence, without credentials.
- Applied migrations, clean replay, generated types and effective privilege/RLS results.
- Provider account/mode, SDK/API/event versions and approved Product/Price mapping.
- Retry/concurrency, no-return fulfilment, duplicate/out-of-order webhook and refund/repurchase results.
- Full direct-access audit across legacy/current tables, APIs, storage, caching and print.
- Real mobile journey coverage and honest gaps.
- Worker/reconciliation/alert evidence, receipt tests and support owner.
- Rollback rehearsal and disabled-new-checkout recovery evidence.

Create `IMPLEMENTATION-EVIDENCE.md` during delivery. Do not mark these checks passed merely because the plan lists them.

## Next phases

Phase 9 consumes trustworthy business events and reports coverage. Phase 10 receives the complete launch QA matrix, policy/configuration checks and mobile journeys. Phase 11 receives operational runbooks, named owners and recovery procedures. Phase 12 receives recipe demand evidence, with no automatic entitlement to future parenting features.

## Definition of done

A verified customer pays once for the approved release, receives access without depending on a browser redirect, returns through the existing account, reads/prints the right recipes and receives accurate support through refunds or provider failure. Nonbuyers cannot obtain protected content through alternate paths. All valid prior rights remain supported. Commercial decisions, tests, operations and rollback have recorded evidence.

This definition applies to the eventual Phase 8 implementation. The current deliverable is its detailed planning package.
