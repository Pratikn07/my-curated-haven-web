# Rollback and operations rehearsal

## Scope and proposed targets

Run these drills on isolated staging with synthetic orders and Stripe test mode. Writing this plan does not authorise live charges, refunds, customer messages, destructive production restore or production configuration changes.

Agree operational targets before rehearsal. Proposed initial targets: detect a checkout/fulfilment alert within five minutes during the staffed launch window, disable new checkout within five minutes of the operator decision, and investigate any confirmed payment with no active access after five minutes. These are internal test targets, not a customer service-level promise.

Propose a 60-minute staging recovery-time objective for the first restore rehearsal. Select the recovery-point objective from actual database backup capability and demonstrate how provider reconciliation restores payment/access facts after the snapshot. Do not claim zero data loss for saved recipes or other non-provider data without evidence.

## Operational cases

| ID | Drill | Pass evidence |
| --- | --- | --- |
| QA-O01 | Disable new checkout while one session is open and another payment is awaiting fulfilment | New attempts rejected clearly. Existing provider sessions handled per documented policy. Webhook, reconciliation, owner reading and refund processing remain alive |
| QA-O02 | Stop worker, accumulate signed paid events, restart after lease expiry | Durable backlog drains once, correct rights activate, no duplicate business/export effects, alert fires and clears |
| QA-O03 | Make database unavailable during checkout and during webhook delivery | No acknowledged lost event, no false success or repurchase advice. Provider retry/recovery restores state after DB recovery |
| QA-O04 | Make Stripe API unavailable during ambiguous creation/reconciliation | Attempt remains recoverable, bounded retries, no blind second charge, useful operator signal |
| QA-O05 | Roll back app version after a forward-compatible schema change | Old build can safely operate or checkout stays stopped. No destructive down migration of orders/rights, current manifests preserved |
| QA-O06 | Restore staging snapshot into a new isolated target, reconcile later provider events | Measured restore time, migration/version check, all confirmed test payments recovered and independent rights preserved. No unintended outbound email/webhook/export |
| QA-O07 | Support handles paid-but-pending, wrong-account, suspected duplicate and approved refund scenarios | Minimal identity verification and order lookup, no emailed secrets, no informal unaudited entitlement edit, clear escalation and correct approved policy |
| QA-O08 | Trigger alerts for pending access, repeated worker failures, ledger mismatch and privacy defect | Named recipient/backup, safe diagnostic fields, documented response and successful containment. Analytics outage alone does not stop fulfilment |

## Checkout stop versus whole-system shutdown

The checkout switch prevents new purchase attempts. It must not disable the webhook endpoint, durable worker, refunds, reconciliation or existing owners' reads. Document separately whether already-created Checkout sessions are allowed to complete, expired by an operator, or treated through recovery. Never assume a local flag cancels a session already hosted by Stripe.

Test a return page after the switch changes. A customer who paid before the stop still needs fulfilment and a support path. Do not delete the pending order to “reset” a failed attempt.

## Database restore rehearsal

1. Capture a synthetic baseline containing free content, saved rows, a valid native right and confirmed purchases.
2. Take a staging backup or use the provider-supported recovery method. Record backup timestamp and coverage, including storage separately where relevant.
3. Add later synthetic payment/refund events and one non-provider change to expose the recovery gap.
4. Restore into a new isolated project/target with outbound jobs and emails disabled.
5. Check schema, manifest, users, storage dependencies and configuration. Do not reconnect live credentials.
6. Reconcile provider test-mode facts since the snapshot, with overlap and deduplication. Rebuild rights from all surviving valid sources.
7. Assert recovered totals, access and missing non-provider writes. Record actual RPO/RTO and required remediation.
8. Re-enable only test-mode workers, repeat a controlled journey, then document clean-up.

A backup existing in a dashboard is not restore evidence. App deployment rollback is not database rollback. Avoid destructive schema rollback once real orders depend on the newer model. Prefer a forward fix or compatible application version while checkout remains stopped.

## Support readiness

The support address shown in the current site is `support@mycuratedhaven.com`. Verify routing and staffed ownership through an authorised test, not by assuming a mailto link proves delivery. Do not send messages to anyone as part of writing this plan.

Prepare internal response drafts for: pending access, sign-in trouble, accidental second attempt, refund request, recipe correction and outage. Use order references and verified account ownership, not full card details. Explain expected next action without exposing internal infrastructure or promising a refund policy still unapproved.

Support tooling must record operator, reason, time and before/after state for any authorised action. Prefer reconciliation or a documented grant source over manual edits to the entitlement projection. A refund and access revocation are related policy actions, not interchangeable database updates.

## Phase 11 handoff

Hand over the tested switch, runbooks, alert routing, actual recovery timings, unresolved noncritical limitations and exact candidate. Phase 11 defines the first audience cohort, traffic expansion, observation window and production smoke.

Use sandbox/test mode for payment tests. Stripe prohibits testing in live mode with real payment details. Verify live merchant configuration through provider settings and observe genuine customer transactions only after the authorised launch. Do not use staff self-purchases/refunds as QA. See [Phase 11 production readiness](../phase-11/PRODUCTION-READINESS.md) and [Stripe testing guidance](https://docs.stripe.com/testing). This clarification supersedes the earlier suggestion of a controlled live test payment.
