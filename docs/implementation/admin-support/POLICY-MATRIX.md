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

- Retention periods for support notes, diagnostics and observations, approval and financial evidence, and notice content and recipients. Until recorded, the affected features stay disabled in production; development uses synthetic values.
- Market-specific customer wording for terms and the dispute notice.
- Stripe live readiness (event subscriptions and API version, a restricted refund key, refund notification settings) and an email sender for notices.
