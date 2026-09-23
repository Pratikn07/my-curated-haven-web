# Refunds, disputes, recovery and support

## Policy before automation

The owner must approve C05–C09 before live checkout. The table below is a proposed starting policy for implementation review, not a published refund promise. Store the approved policy version on the order.

| Verified condition | Proposed source eligibility | Support action |
| --- | --- | --- |
| Paid, no adverse adjustment | Eligible within access term | Normal access |
| Refund requested internally but not submitted | Unchanged | Review eligibility and explain next step |
| Provider refund pending/requires action | Retain access unless another restriction applies | Track pending status, do not say refunded |
| Successful partial refund below full captured amount | Retain access | Show amount refunded, record rationale |
| Successful full refund, including accumulated partials | This order no longer supplies access | Confirm current refund state, recompute other sources |
| Refund failed/cancelled | Recompute from current facts, do not label successful | Investigate alternate resolution if money was promised back |
| Informational dispute/inquiry | Do not automatically revoke | Classify and route to support |
| Formal open chargeback/dispute | Suspend this order's source if approved by C07 | Track deadline and evidence |
| Dispute won/closed favourably | Restore only if other requirements hold | Recompute against refunds, terms and account state |
| Dispute lost | This order no longer supplies access | Record outcome and apply approved support policy |

If the owner chooses different pending/partial/dispute treatment, update state tests and customer wording before launch. Do not infer permanent revocation from one generic `charge.dispute.created` event without classification.

## Initial refund workflow

1. A customer contacts the monitored Support route and provides an order support reference.
2. The operator verifies ownership through the established account/support process. Do not request card numbers or auth codes.
3. Retrieve current provider payment, prior successful/pending refunds and disputes. Confirm the remaining refundable amount and applicable policy.
4. Record the decision, operator, reason, requested amount/currency and support case in the restricted audit trail.
5. An authorised operator submits the approved refund in Stripe Dashboard. No public refund endpoint is needed.
6. Webhooks/reconciliation retrieve the refund's actual status and recompute source eligibility.
7. Communicate the verified state. A submitted or pending refund is not a completed refund.
8. Confirm all remaining valid access sources before explaining whether collection access continues.

This planning task authorises no real refund or customer message. During operation, follow the approved business support workflow. A future refund API needs server idempotency, operator authorisation, amount limits and its own test matrix before use.

## Refund correctness

Store each provider refund once by its stable identity. Distinguish lifecycle status from money amount. Sum only current successful adjustments for reporting and evaluate late failures/returns through canonical provider state. A previously successful refund later becoming failed requires a new audited transition and human visibility, not a silent history rewrite.

If a refund status changes after access revocation, recompute eligibility according to the approved policy. Do not blindly reactivate while a dispute, account closure, manual hold or full remaining refund still disqualifies access. Keep manual fraud/support holds separate from provider refund status so their reason and owner are explicit.

Never submit another refund simply because a webhook was delayed. Verify the provider first. An open dispute and a separate refund create a risk of duplicate reimbursement. Follow the provider's current supported process and route ambiguous cases for review.

## Old order and repurchase examples

| History | Expected access |
| --- | --- |
| Order A paid, then fully refunded | No access from A |
| A refunded, later order B paid for the same release | Active through B |
| Late duplicate refund event for A arrives after B | B stays active |
| A paid and B accidentally paid | One visible collection, two financial records, duplicate-charge review |
| A refunded but valid native access exists | Access continues through native source |
| A disputed and B paid | Recompute each source, do not revoke B because A changed |
| A's finite term ends, B starts later | No access during the gap between terms |

The public unique user/release entitlement is a projection over these sources. It is not a replacement for their financial history.

## Support recovery scenarios

**Paid but locked:** verify the order owner, canonical provider state, policy flags and projection error. Re-run the shared fulfilment service. Never ask the customer to purchase again as the first fix. Use a separate audited support access source only when policy authorises temporary compensation. Do not edit Stripe payment state to force access.

**No receipt:** confirm the payment and receipt state without transferring ownership to a newly supplied email. The customer still uses the account library. Resend through approved tools after verification, with delivery deduplication.

**Different email entered at Checkout:** billing/receipt details do not change the account selected before payment. Explain the purchase account and follow Phase 7 account recovery. No email-only identity merge.

**Lost access to email:** use the established account-recovery process. A forwarded receipt or public order ID alone is insufficient. Record verified account transfer decisions, revoke stale access where appropriate and recompute sources.

**Price/manifest mismatch:** hold fulfilment for review, stop affected new checkout and inspect the historical offer and provider line items. Honour or refund through the approved resolution. Do not grant an arbitrary current release to hide the mismatch.

**Content withdrawn:** preserve the purchase, show the owner a clear unavailable state and apply the approved replacement/refund process. The three free recipes remain separately accessible if unaffected.

**Account closure:** warn about purchased-access consequences through Phase 7's confirmed closure flow. Stop new checkout, invalidate private access, resolve pending payments and preserve financial records under the retention policy. Recreating the email address does not automatically restore ownership.

## Operator access and evidence

Restrict Stripe Dashboard and support tools to named roles. Keep permission to issue money movements narrower than permission to inspect status. Record actions with timestamps, order reference, reason, policy version and outcome. Avoid raw customer messages in generic analytics tables.

Track dispute deadlines and evidence requests as operational cases. Do not automatically submit generic evidence or concede a dispute through an analytics event. The plan does not define a legal position for the business.

## Primary references

- [Stripe refund statuses and handling](https://docs.stripe.com/refunds)
- [Stripe dispute response workflow](https://docs.stripe.com/disputes/responding)

The access effects, account-recovery rules and support ownership above are project policies to approve. They are separate from the payment provider's status model.
