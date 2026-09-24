# Payment data, states and consistency

## Invariants

1. The server derives order ownership from a verified existing account.
2. Each order attempt references one immutable commercial offer and collection release.
3. One provider Session and one successful payment belong to at most one order in the same provider account/mode.
4. A browser never creates a paid state or writes an entitlement.
5. Access exists when at least one verified source for the user/release remains eligible, subject to account and content availability.
6. Refunding order A does not remove access supported by order B or a valid native grant.
7. Payment, access projection and durable side-effect scheduling commit consistently.
8. New checkout is refused while ownership or a previous payment outcome is unresolved.

## Database boundary

Keep financial tables in the existing unexposed `private` schema. Do not expose that schema through PostgREST for browser access. Recommended backend integration: a server-only pooled TLS PostgreSQL connection using a dedicated commerce role with narrow grants. Pin the chosen driver and verify host/runtime compatibility. Customer-facing reads return owner-checked DTOs from server handlers.

Use caller-scoped Supabase clients for recipe reads. A commerce worker needs no broad user-profile read access. Where entitlement writes require a narrowly privileged database function, place the function in `private`, fix the search path, fully qualify objects and restrict execution to the dedicated backend role. Never expose a generic “grant access” RPC to authenticated users. Test privileges, RLS and default EXECUTE grants.

If the deployment cannot support the proposed database connection, document and test an equivalent narrow server-to-database boundary before coding. Do not silently expose private tables or use an all-purpose admin client for every page.

## Proposed relations

Final SQL names should follow repository conventions. This contract defines minimum fields and constraints, not an already applied migration.

| Relation | Minimum fields and purpose | Required constraints |
| --- | --- | --- |
| `private.commercial_offers` | ID, release ID, provider account/mode, Product/Price IDs, currency, base minor amount, tax mode, quantity, terms/refund/access-policy versions, sale enabled flag, manifest hash | Positive amount, quantity one, nonrecurring mapping, immutable commercial fields once referenced |
| `private.release_manifests` | Release ID, approved ordered member snapshot, reviewed content versions, review identity/time and checksum | One immutable approved snapshot per sold release |
| `private.purchase_orders` | Order ID, opaque support reference, stable internal owner principal, nullable current auth user ID, offer/release IDs, snapshot, attempt state, Session ID, idempotency key, lease/version fields and timestamps | Unique account/mode/Session when present, unique idempotency key, one unresolved attempt per active user/release |
| `private.provider_payments` | Order ID, provider account/mode, PaymentIntent and Charge IDs, provider status, captured amount/currency, paid time, last verified time | Unique provider account/mode/payment identity, nonnegative minor amounts, immutable order binding |
| `private.payment_refunds` | Provider refund ID, order/payment IDs, amount/currency, current status, occurrence and verification times | Unique provider account/mode/refund ID, no repeated adjustment on duplicate events |
| `private.payment_disputes` | Provider dispute ID, order/payment IDs, classification, status, deadline, current access effect | Unique dispute identity and verified payment binding |
| `private.payment_events` | Event ID, account/mode/version/type, object ID, receipt time, payload hash, processing state, retry/lease data and sanitised failure code | Unique account/mode/event ID, bounded retained payload, claim fencing |
| `private.access_sources` | User/release, source kind/ID, eligibility, reason, valid window and audit timestamps | Unique source kind/ID/release, explicit provenance, no client writes |
| `private.commerce_outbox` | Semantic side-effect key, order ID, kind, minimal payload, delivery state and retry data | Unique semantic key, independent bounded retries |

Reuse `private.access_events` for entitlement audit where its fields support the requirements. Add explicit order/source/reason fields through a forward migration if needed. Do not store unrestricted provider payloads inside generic audit metadata.

Preserve the existing `public.access_entitlements` unique user/release projection and its `active`, `revoked`, `expired` states. Do not invent a `suspended` state without a deliberate schema migration. Record suspension/review reasons privately and project no active grant while every source is ineligible.

## Identity, deletion and record retention

The stable owner principal is a private identifier for an order owner, linked to the verified auth UUID at creation. Keep the historical reference auditable without enabling account recreation from an email. On account closure, remove product access, null or pseudonymise the current auth link under the approved retention policy and preserve required financial records. Do not cascade-delete orders.

An account re-created with the same email does not inherit the old order automatically. Restoration requires a verified support/account-recovery process. Support cannot transfer ownership based only on a forwarded receipt.

## Attempt state machine

| Attempt state | Meaning | Replacement checkout |
| --- | --- | --- |
| `creating` | Local order reserved, provider call not resolved | Block, recover the same attempt |
| `creation_unknown` | Provider call timed out or local Session persistence failed | Block until reconciled |
| `open` | Known unpaid, unexpired hosted Session | Reuse |
| `processing` | Provider payment processing or Session complete awaiting resolution | Block |
| `review` | Binding/configuration conflict or unresolved anomaly | Block until reviewed |
| `closed` | Canonically resolved attempt with no resumable Session | Recheck ownership, allow a new attempt only if eligible |

Keep financial status separate: unpaid, processing, paid, partially refunded, fully refunded and disputed observations are not interchangeable with checkout attempt state. Do not overwrite historical paid time when a refund occurs. Track current refund/dispute facts and calculate access eligibility from the policy version.

A known failed card attempt inside an open hosted Session need not close the local order. The same Session often supports a user retry. Read the canonical Session/PaymentIntent state before offering a replacement.

## Concurrency and transaction model

For checkout creation, lock a stable user/release reservation and enforce a partial uniqueness constraint for unresolved attempt states. Persist the attempt before any provider network call. Release the SQL transaction before calling Stripe. Write back only through a comparison against the same attempt ID/version. Treat a lost response as unknown, not failure.

For event processing, first claim an inbox event, then acquire a durable per-order processing lease before fetching canonical provider state. The lease has an increasing fencing token. After network reads, commit only if the token and observed row version remain current. If the lease expires or another worker changes the order, discard the snapshot and refetch. Never hold a database transaction open across slow provider calls.

When projecting user/release access, lock a stable user/release row so two different orders cannot race their combined entitlement calculation. Use the same lock order in fulfilment, adjustments and support tooling. Retry serialization conflicts with bounded backoff.

Provider state still changes asynchronously. Store verification timestamps, fetch all relevant adjustment records and recheck through later events/reconciliation. Never clear a known refund/dispute because a partial provider response omitted its record. A stale success notification does not override a later recorded adverse adjustment without fresh verification.

## Entitlement projection

Evaluate each source using verified facts and its approved policy. For Stripe purchases, require paid state, valid binding, approved amount/currency, resolved review flags and permitted refund/dispute state. For legacy/native sources, use the verified source's own validity rules. Never convert every existing entitlement to a Stripe source.

Within one transaction: persist current facts, update source eligibility, compute all currently eligible sources and their validity coverage, update the public entitlement, append the audit event and enqueue eligible side effects. An audit or projection failure rolls back the transaction.

With multiple time-limited grants, set projection validity to the current continuous access interval. Do not bridge a gap between disjoint future intervals. Schedule recalculation at the next source boundary and test both future starts and expirations. If no eligible source remains, revoke/expire the projection with a private reason. Reactivation clears stale revoked timestamps only after legitimate source eligibility returns.

Initial live scope should use one explicitly approved access-duration policy. If C09 establishes a finite term, implement exact source boundaries before launch. Leaving `expires_at` null is not permission to advertise lifetime access.

## Amounts and adjustments

Use integer minor units and provider-supported currency metadata. Avoid floating-point comparisons and assumptions about decimal places. Store price subtotal, tax and captured total separately. Initial discounts/shipping are zero and validated. Compare against the order's historical offer, not the current website price.

Successful refunds aggregate by unique refund identity. Pending/failed/cancelled refunds remain visible without becoming successful money adjustments. Full refund is determined against captured payment, accounting for earlier successful partial refunds. Dispute funds and payout balances remain separate measures. No sum across currencies without an approved conversion method.

## Public DTOs

Return only order support reference, collection title/release, permitted amount/currency summary, payment display state, access display state, timestamps and safe next action. Never return webhook payloads, provider secrets, customer objects, billing addresses, receipt-email history or another user's internal IDs. Unknown and other-owner IDs use the same neutral response shape.
