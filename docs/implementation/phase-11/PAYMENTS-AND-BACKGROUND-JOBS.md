# Payments and background jobs

## Critical requirement

A paid customer must receive durable access without revisiting the return page. New sales must remain separate from fulfilment, refunds, existing owners and optional analytics. Inline processing in a request is not evidence of a deployed durable worker.

Phase 8 owns the payment model. Phase 11 operationalises its inbox, canonical verification, source-based rights projection and recovery contracts. Fix the current source findings before treating these runbooks as executable.

## Job inventory

Cadences and batch sizes are proposals. Confirm hosting limits, provider limits and actual volume during rehearsal. Each job needs a named owner, authenticated trigger, environment check, last-success signal and runbook.

| Job | Proposed cadence | Contract and output |
| --- | --- | --- |
| Durable inbox worker | Every minute or queue-triggered equivalent | Claim due items with leases/fencing, verify canonical provider facts, commit one business transition, record retry/dead-letter state |
| Pending attempt reconciliation | Every 5 minutes | Resolve ambiguous/open attempts by durable references, never blindly create a replacement charge |
| Provider/ledger overlap reconciliation | Hourly during launch, daily broader audit | Paginate provider changes with overlap, detect missing ledger events and wrong/missing effective rights |
| Access/source integrity | Every 5 minutes during launch | Compare confirmed eligible purchase/native/support sources with projected access, report mismatches without broad automatic grants |
| Receipt/access-message delivery | Every minute or queued equivalent | Deduplicated approved message, delivery/failure/bounce status, no dependency on optional tracking consent |
| Optional analytics export | Separate scheduled batch after approval | Honour consent/withdrawal and environment, retry separately, never hold payment transaction open |
| Manifest/configuration check | On release and daily | Approved price/mode/currency, manifest hash, three-free count, source project and essential flags |
| Retention/cleanup | Daily with reviewed policy | Remove expired optional/test data, preserve required operational/financial records and deletion suppression |

Scheduler configuration is part of the release artifact. Test stale credentials, overlapping executions, disabled schedules, daylight/timezone assumptions and provider outage. Prefer UTC schedules with explicit ownership. Do not expose an unauthenticated public “run worker” endpoint.

## Worker and reconciliation rules

Persist a verified event before acknowledging successful durable receipt. If storage is unavailable, return a retryable failure. Processing must resume from stored work after process death, deployment or lease expiration.

Use bounded batches, bounded provider timeouts and no database transaction across remote network calls. Persist retry state with backoff/jitter. After the accepted retry limit, quarantine for review and alert. Never silently discard an order-related event.

The same business transition might arrive through webhook, reconciliation and return-page recovery. All paths must use one idempotent ledger/projection contract with concurrency protection. A duplicate provider event is not a second purchase. An event marked received is not necessarily fulfilled.

Advance reconciliation checkpoints only after all pages in the bounded window are durably processed. Re-scan an overlap window to catch late updates. Record provider occurrence time, ingestion time and completion time separately. Reconciliation includes missing provider-to-ledger orders, so a completely missed webhook is visible.

Verify account, mode, payment status, amount/currency, configured Price/quantity and order/release binding from canonical objects. Do not equate Checkout completion with successful delayed payment. Do not fabricate charge IDs or hard-code test mode in genuine provider flows.

## Refunds, disputes and independent rights

Implement the approved Phase 8 policy for pending/failed/successful refunds, partial refunds and disputes. Process unique successful financial adjustments and paginate provider objects. Record disputed payment state separately from refund state.

Recompute effective access from all valid purchase, native and support sources. Refunding an old order must not revoke a newer valid purchase. Winning a dispute must not restore an independently refunded/expired source. Keep manual support grants reasoned, bounded and audited.

Operator refund actions require verified order, amount/currency, reason, current provider state and appropriate authority. Use provider idempotency and reconcile the result before informing the customer. Do not mark access revoked as proof a refund was sent.

## Receipt and access delivery

Decide whether Stripe sends the payment receipt and whether the app sends a separate access message. Avoid two conflicting “receipt” templates. A receipt confirms payment. An access message points to the account/library and reflects actual access state.

Do not send “ready to use” before the entitlement transaction commits. A failed message must not undo a valid purchase. A recovered queue must not send many duplicate confirmations. Persist message type/version, order and deduplication key, delivery state and approved minimal diagnostic data.

Confirm sender, support reply path and purchased-library URL. Do not place a raw provider Session ID, privileged token or paid recipe body in a public message URL. Auth recovery uses the approved sign-in flow.

## Stop behaviour matrix

| Control | Stops | Continues |
| --- | --- | --- |
| New checkout disabled | New/replacement purchase creation under the approved policy | Existing Session recovery, webhook receipt, ledger processing, valid owner reads |
| Offer sale disabled | New sale of the affected offer | Historical order/manifest lookup and access already purchased |
| Optional analytics disabled | Optional browser capture/provider export | Necessary financial records, support and fulfilment |
| Worker maintenance | Processing for a bounded monitored interval | Durable receipt, backlog alert and subsequent recovery |
| Unsafe recipe withdrawn | Affected public/owned content according to approved correction policy | Other valid recipes, purchase history and support handling |

## Operator tooling

Provide restricted lookups for order state, provider references, rights sources, inbox attempts and reconciliation status. Show amounts in currency minor units internally, formatted by currency rules for people. Do not assume every currency uses two decimals.

Support should trigger a safe reconciliation command, not edit the projected entitlement table directly. Every mutation records operator, time, reason and before/after references. Separate readonly finance/report roles from operational write roles.

Reference: [Stripe webhook guidance](https://docs.stripe.com/webhooks). The application must remain correct with duplicate and out-of-order delivery. Verify enabled methods and current provider retry behaviour during implementation.
