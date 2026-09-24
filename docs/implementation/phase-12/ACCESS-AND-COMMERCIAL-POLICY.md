# Access and commercial policy

## Preserve the initial promise

The first purchase covers a clearly defined recipe collection under its approved offer terms. A later feature must not reduce previously granted recipe access or silently introduce a subscription. Do not overwrite historical order amounts, release membership or terms to simplify expansion.

The selected pilot needs a separate feature eligibility rule. Eligibility answers whether the user has joined the pilot. Recipe entitlement answers which recipes the user is allowed to read. Both are required for a protected recipe inside the planner. A pilot invite never grants all paid content.

## Proposed access matrix

| Actor/state | Three free recipes | Previously purchased recipes | Planner pilot | Planner recipe choices |
| --- | --- | --- | --- | --- |
| Anonymous | Read/print | No | No | None |
| Signed-in nonbuyer, not enrolled | Read/print/save | No | No | None |
| Enrolled nonbuyer | Read/print/save | No | Yes during eligibility | Current free recipes only |
| Buyer, not enrolled | Read/print/save | Valid grant | No | None |
| Enrolled buyer | Read/print/save | Valid grant | Yes during eligibility | Free plus currently entitled recipes |
| Buyer with refunded source | Read/print/save | Evaluate remaining independent grants | Pilot state unchanged unless separately ended | Re-evaluate current recipe rights |
| Pilot ended | Read/print/save | Valid grant | Approved read/export/delete window only | No new assignments |
| Account closed/suspended | Public access as anonymous | Follow verified account/access policy | No private access | None |

Saved recipe availability follows Phase 7. Removing a stale bookmark remains possible under the owner contract. Public recipe access must not require a profile, research consent or pilot sign-up.

## Pilot recommendation

Use an opt-in, time-bounded, free research pilot for one feature. Show duration, current capability, support contact and data handling before enrolment. No card collection, automatic conversion, future-feature bundle or unlimited usage promise.

This is a recommendation awaiting D12-04. No invitation, charge or grant is issued by merging the plan. If commercial validation needs a price test, define a truthful nonbinding research question or a separately approved real offer. Do not collect payment for a misleading unavailable product.

## Future offer choices

| Choice | Required decisions before release |
| --- | --- |
| Include feature as a free improvement | Eligibility, support cost, duration and clear limits |
| Separate one-time product | Exact deliverable, release/version, price/currency, refund terms and access duration |
| Subscription | Separate business decision, recurring value, renewal/cancellation, cost and existing-buyer treatment |
| New recipe collection | New membership manifest and versioned offer using Phase 5/8 contracts |

No choice is approved here. Avoid “all future recipes included” or “lifetime access” unless the business explicitly defines and approves the promise. Existing buyers receive whichever rights their original offer granted, regardless of the later pricing decision.

## Commercial integrity tests

Verify the original checkout still sells the original release and excludes unapproved parenting tools. The account page must distinguish owned collections from optional pilot tools. Recipe purchase emails and receipts do not claim planner ownership. Stopping the pilot does not alter order or entitlement rows.

If a future feature has a paid grant, model its source and revocation independently from recipe collection access. Partial refunds, chargebacks, repurchases and native subscriptions need explicit precedence. Do not reuse a single `isPremium` field for unrelated rights.

All payment testing uses provider sandbox/test mode. Never self-purchase and refund in live mode to test. Genuine production sales follow the Phase 11 authorised rollout and reconciliation process.
