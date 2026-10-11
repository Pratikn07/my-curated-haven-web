# Support policy matrix

The access and money rules support applies, with where each decision came from. Feature approval here is not approval of any individual customer's repair, refund or email: each of those still needs its own exact approval.

## Accepted policy for new collection purchases (`support-policy-2026-10`)

Source: the Phase 3 design decision register and section 9.2, accepted by the owner on 2026-10-07; repurchase rule added by the owner on 2026-10-09.

| Verified financial condition | Effect |
| --- | --- |
| Paid, no disqualifying adjustment, account valid | The purchase source is eligible. |
| Refund requested, pending or requires action | No revocation because a request exists. Shown as follow-up. |
| Successful partial refund below the captured total | The source stays eligible. |
| Successful cumulative full refund | Only that purchase source becomes ineligible. Other sources and their additions are recomputed and kept. |
| Refund later failed, canceled or returned | Re-evaluate the complete current facts; never reactivate blindly. |
| Inquiry or early warning | Surfaced for review; no automatic revocation. |
| Formal dispute open | That purchase source is held (stored separately from its eligibility). Manual restoration is blocked while it is open. Other sources compose normally. The buyer cannot buy the same collection again until it is resolved. |
| Dispute won | Re-evaluate payment, refunds, account and holds; winning alone does not force restoration. |
| Dispute lost | That payment no longer supplies access; unrelated rights stay. |
| Missing policy or unknown provider classification | Explain the uncertainty and block new repair. |

Duration: no scheduled time-based expiry of purchased collections. Refund, dispute, content and account restrictions remain separate. This is not a promise of perpetual service.

Refunds: no general refund promise and no advertised money-back window. Exceptional, individually owner-approved full or partial refunds only, through the admin, to the original payment method. Stripe reasons offered: `requested_by_customer` and `duplicate` (never `fraudulent`).

Dispute notices: a neutral email prepared for the owner to preview and approve exactly; never sent automatically from a webhook.

Additions: buyers of a release receive later approved additions where Phase 2 records `additions-v1` for their buyer group (owner decision 2026-10-09: existing buyer groups get additions). Support explains this; it never creates a purchase or grant for an addition.

## Reconciling earlier commercial proposals

The Phase 8 proposals in `docs/implementation/phase-8/COMMERCIAL-DECISIONS.md` predate these decisions.

| Earlier proposal | Status now |
| --- | --- |
| C05 Refund eligibility, window and route | Superseded for new purchases: no general refund promise; exceptional owner-approved refunds. The support route stays a monitored channel. |
| C06 Partial-refund access | Confirmed: access retained. |
| C07 Access during pending refunds and disputes | Superseded by the table above (pending retains; formal dispute holds only that source). |
| C08 Sell the named release without later collections | Superseded by the owner's 2026-10-09 additions decision. Offers tagged `v1` are not mapped to original-only by support. |
| C09 Hosted access duration | Superseded: no scheduled expiry, no lifetime claim. |

Historical orders keep the terms frozen in their order snapshot. An order whose policy version has no explicit mapping here is explained as unknown and blocks repair until it is mapped.

## Still open (activation, not development)

- Retention periods for support notes, diagnostics and observations, approval and financial evidence, and notice content and recipients. Until recorded, the affected features stay disabled in production; development uses synthetic values. The database enforces this: `admin_support_set_stage` refuses `diagnosis` without a registered verifier and an observation retention period, and refuses `repair` without a note retention period and an approved access policy as well (`admin_support_readiness` lists what is missing).
- The approved access policy for the `v1` terms existing orders carry. Without it, automated reconciliation leaves those orders to the guarded older webhook path and repairs are blocked as `policy_missing`.
- A verified sender for purchase confirmations (`commerce_settings.purchase_confirmation_delivery`). Until then no receipt or repair claims an email.
- Market-specific customer wording for terms and the dispute notice.
- Stripe live readiness (event subscriptions and API version, a restricted refund key, refund notification settings) and an email sender for notices.

## Who may do what (operations)

| Action | Who | Stage |
| --- | --- | --- |
| Read private support metrics (counts per mode only) | Support readers and the owner | inspection or later |
| Run retention (clear expired note text, minimise expired provider checks) | Owner, signed in with MFA | any, including disabled |
| See what each stage still needs; change the support stage | Owner, signed in with MFA | any; diagnosis and repair only when nothing is missing |
| Prepare, record an approval for, or apply an access repair as an agent | A registered operator login, for a named human who holds the right now | repair |
| Refund, or send a dispute notice, as an agent | Nobody | never |

Limits per person per minute: 30 exact lookups, 5 provider checks, 5 new repair executions, 5 refund preparations, 3 new refunds, 5 notice preparations. Repeating an operation never counts again.

## Refunds (owner-approved exceptions)

Refunds stay exceptions the owner approves one exact amount at a time; nothing here is a customer-facing refund promise.

| Rule | Value |
| --- | --- |
| Who may check, prepare, approve, reserve and submit | The owner, signed in with MFA. Support staff and agent logins never can. |
| Exception categories | `duplicate_charge`, `billing_error`, `unresolved_delivery`, `required_remedy` (a category never bypasses approval) |
| Reason sent to Stripe | `requested_by_customer` or `duplicate` only; never `fraudulent`, no other destination or fee fields |
| Amount | Full remaining (fixed when prepared) or a whole number of minor units up to what is still refundable |
| Still refundable | Captured, minus successful and pending refunds, minus local reservations not yet visible at Stripe (each refund counted once) |
| Blocked when | No approved access policy, incomplete or mismatched evidence, a refund already in flight, an open formal dispute, nothing left |
| Approval lasts | Five minutes, or until the proposal expires if sooner |
| Email | None; a refund never sends a purchase confirmation |
| Submission switch | `refund_submission_enabled`, off by default; reading earlier results always works |

## Dispute notices (owner-approved)

| Rule | Value |
| --- | --- |
| Who may prepare, approve and send | The owner, signed in with MFA. Support staff and agent logins never can; nothing is sent from a webhook. |
| When | Only for a formal dispute that is open (`needs_response`, `under_review`), from the newest complete Stripe check of the order, at most 15 minutes old |
| Recipient | The customer's current verified sign-in email; a closed account, a missing or unconfirmed email blocks the notice |
| Text | Template `dispute-opened-v1` only: plain text, no links, tracking, marketing or request to buy again; it states the customer's actual access (another source keeps the collection, or this purchase is paused) |
| Approval lasts | Five minutes, bound to the exact recipient, subject, text, dispute version and access |
| Sends per dispute | At most one that was or may have been sent; an unknown outcome is never resent |
| Delivery | A provider message id means accepted, never delivered |
| Retention | `notice_retention_days` (unset blocks preparing); after it, recipient and text are removed unless the dispute is open or the send is unresolved; digests and receipts stay |
| Send switch | `dispute_notice_enabled`, off by default, and the repair stage; answers are recorded even when it is off |
| Answering the bank | Always in the Stripe Dashboard; the email never responds to the dispute |
