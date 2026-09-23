# Webhooks, fulfilment and recovery

## Durable receipt boundary

The webhook route is a public HTTPS endpoint authenticated by Stripe signature verification. Keep the ordinary browser POST CSRF checks on checkout/refund/account routes. Exempt only the provider webhook route from browser-origin requirements. Never exempt the whole commerce API.

Read raw request bytes once, enforce a reasonable body limit and verify the signature with the environment's endpoint secret and the supported SDK. Do not parse/re-serialise JSON before verification. Keep timestamp tolerance enabled. Verify destination account context, expected live/test mode, supported event version and event type.

For relevant valid events, atomically insert a minimal inbox envelope keyed by account/mode/event ID. Store object IDs, event type/version, receipt time, payload hash and enough verified references to recover processing. Fetch canonical objects during work. If raw payload retention is needed for debugging, use encrypted restricted storage with a short approved retention period, not application logs.

Respond successfully only after durable receipt commits. Duplicate already-durable events return success. Database failure returns a retryable non-success so provider delivery repeats. A valid unsupported event is safely ignored with a minimal counter. A malformed or invalid-signature event receives rejection and never enters payment processing.

## Required event families

Verify exact event names and object formats against the pinned endpoint version when implementing.

| Event family | Action |
| --- | --- |
| `checkout.session.completed` | Reconcile the bound order, grant only when verified paid |
| `checkout.session.async_payment_succeeded` | Reconcile delayed success through the same fulfilment service |
| `checkout.session.async_payment_failed` | Record verified failure, preserve any independent access source |
| `checkout.session.expired` | Resolve attempt only after canonical unpaid/no-processing checks |
| `refund.created`, `refund.updated`, `refund.failed` | Retrieve refund and linked payment, update adjustments and recompute access |
| `charge.refunded` | Reconcile all related refund records, without counting the notification itself as another refund |
| `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed` | Retrieve dispute/payment, apply approved policy and support deadline |

PaymentIntent events are optional repair triggers if the implementation needs them. They must resolve through the existing bound order service, never a second grant writer. Subscribe only to supported relevant events. Dashboard configuration changes must not enable event types without a defined outcome.

## Worker execution model

Use the private inbox as durable work. A protected scheduled runner claims due events in bounded batches with row locks/skip-locked semantics, attempts count, lease expiry and fencing token. A successful webhook receipt optionally prompts a durable queue wakeup if the selected host supports one. A process-local promise after sending the HTTP response is not a delivery mechanism.

Choose and record the actual runner during P8-09. Recommended target is a minute-level protected scheduled invocation using existing platform facilities, with a verified plan/runtime limit. If the host cannot meet the recovery target, provision a suitable durable runner before live sales. Do not assume a particular free hosting tier supports the schedule.

Use bounded exponential backoff with jitter for transient API/DB errors. Separate invalid binding/configuration failures into `needs_review`, with a named operator alert. After a documented retry limit, mark dead-letter and retain the recoverable record. A permanent error must not loop indefinitely or silently disappear.

An orphan event with no mapped order is quarantined. Investigate account/mode, metadata and creation-unknown attempts. Do not assign the payment to an account by email. Valid unrelated payments in the same Stripe account must not gain recipe access.

## Canonical verification checklist

Before granting access, verify all of the following through local immutable records and retrieved provider objects:

- Expected provider account and live/test mode.
- Session ID mapped to the local order, with matching opaque order reference and offer binding.
- Session mode is one-time payment, and payment status is paid for this positive-price product.
- PaymentIntent/Charge identity belongs to this Session and order, with successful captured funds rather than an uncaptured authorisation.
- Exactly one expected Price/Product line item, quantity one and expected currency.
- Base subtotal matches the historical approved Price. No unapproved discounts, shipping, currency conversion or additional line items.
- Tax behaviour and final provider totals match the approved policy. Calculations are complete where required.
- Release remains a valid frozen purchased product. It need not remain open for new sales.
- Current refund, dispute, account-closure and manual-review facts permit access.

Neither `status=complete` alone nor the customer's return URL proves payment. A `no_payment_required` result is outside the initial positive-price/no-promotion contract and enters review unless the product scope changes explicitly.

Do not wait for a bank payout to fulfil a validated customer payment. Do not accept a webhook's metadata in place of the local owner/offer record.

## One fulfilment function

All webhook processing, return-page refreshes, scheduled reconciliation and operator repair call one domain service. Browser requests provide only an owner-checked reference. They do not provide payment truth or choose the granted release.

Suggested service sequence:

1. Claim work and acquire the per-order fenced lease.
2. Load the immutable local order and snapshot version.
3. Retrieve canonical Session/payment and all relevant adjustments outside a SQL transaction.
4. Validate binding, money and current access eligibility. Preserve known adverse facts if provider retrieval is incomplete.
5. Begin a short database transaction. Recheck lease token and version, then lock the user/release projection.
6. Upsert verified facts and source eligibility, recompute combined entitlement, append access audit and enqueue semantic side effects.
7. Mark this work completed and commit. Roll back all database changes if any required write fails.
8. Deliver emails/optional analytics independently from the outbox.

The provider fetch and database commit are not one distributed transaction. Leases, version checks, deduplication and reconciliation address the boundary. Document and monitor the remaining interval before a newly changed provider state reaches the app.

## Ordering, replay and race handling

Provider events arrive more than once and out of order. Receipt time or event creation time is not a reliable total ordering rule. Keep every relevant event identity, but apply verified object state through semantic transitions.

Examples:

| Sequence | Expected outcome |
| --- | --- |
| Success arrives twice, concurrently | One paid transition, one access source and one semantic receipt job |
| Refund arrives before delayed success notification | Retrieve both facts, never grant based only on old success |
| Worker lease expires during provider call | Old worker fails fence check and discards its snapshot |
| Order A refund races with order B payment | User/release lock computes access from both source rows |
| Payment succeeds during Session expiry request | Retrieve final state, fulfil paid order and refuse a replacement |
| Price changes after Session creation | Validate against the historical order snapshot |
| Release is retired after payment begins | Fulfil valid existing purchase, stop new sale creation |
| Account is closed while payment processes | Preserve payment record, suppress access and route to support/refund policy |

Canonical adjustment retrieval must paginate complete relevant collections. An absent item on the first page is not proof of no refund. Retain object-level verification times and re-fetch on stale versions. Manual replays use the same service and cannot bypass validation.

## Return-page acceleration

The return page reads owned status first. A rate-limited authenticated POST refresh schedules or invokes the same bounded verification service. Avoid side-effecting GET requests. If background fulfilment already completed, return current access. If verification cannot complete quickly, keep the pending UI and durable work rather than timing out the entire page.

Webhooks and reconciliation remain sufficient when the customer never returns, closes the tab or loses connectivity. The return path is a convenience, not the only fulfilment mechanism.

## Side effects and receipts

Use distinct semantic keys such as order-paid, first-access-ready and refund-ID/status transition. A duplicate webhook is not another customer email. Record send attempts and provider delivery references.

Use provider idempotency where the email service supports it. Otherwise document delivery uncertainty after a send timeout and avoid claiming exactly-once email. Operator recovery handles ambiguous outcomes. Receipt failure must not affect the order or entitlement transaction.

## Official references

- [Stripe fulfilment](https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted)
- [Stripe webhook delivery and signatures](https://docs.stripe.com/webhooks)
- [Refund lifecycle](https://docs.stripe.com/refunds)

The durable inbox, fenced leases, database projection and recovery policy are this project's design, not guarantees supplied by the provider.
