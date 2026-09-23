# Dashboards and weekly decisions

## Four views

| View | Questions and measures | Source |
| --- | --- | --- |
| Acquisition | Which registered Tiny Soho placements bring observed sessions and free recipe opens? What social data is fresh? | Optional analytics plus separate Instagram aggregates |
| Recipe usefulness | Which recipes are opened, saved and requested for print? How often does search return nothing? | Optional recipe/account events |
| Commerce and access | How many orders paid? What amounts were captured/refunded? Did each buyer receive access? | Phase 8 ledger and provider reconciliation |
| Return usage | Do observed browsers return to recipes or the purchased library on later days? | Optional mature browser cohorts |

Use provider dashboards and restricted existing reporting tools. A new admin application is outside scope. Dashboard URLs, query definitions and owner names belong in implementation evidence after setup.

## Standard report header

Every report includes reporting dates, UTC timezone or an explicit alternative, refreshed-at time, data-source status, environment, collection release, currency and metric-contract version. For each percentage show numerator and denominator. Keep raw counts visible when the sample is small.

Behavioural reports cover consenting observed browsers. Commerce totals cover all valid live orders. Show the percentage of confirmed orders with eligible analytics linkage as attribution coverage. Do not describe this as a site-wide consent rate because declined visitors are not fully counted by optional analytics.

## Commerce reconciliation

Display unique confirmed orders, distinct purchasing accounts, gross captured amount, successful full and partial refunds, captured amount less refunds, pending payment attempts, paid orders without active access and oldest pending fulfilment age. These are distinct rows with explicit currency.

Reconcile records using the same provider account, live/test mode and occurrence-time window. Use a daily rerun of at least the preceding seven days to catch delayed events, plus a separate adjustment report for older refunds and disputes. Record the watermark and last successful run. A zero mismatch result is meaningful only when both sources refreshed successfully.

The initial integrity goal is no unexplained paid orders missing access and no unexplained ledger/provider mismatch. Set an operational alert for paid access pending more than five minutes as a proposed starting threshold. Assign its owner and tune against the final Phase 8 service target. This is an engineering alert threshold, not a customer promise.

Confirmed order counts remain unchanged by refunds. Refund adjustments change the relevant amount and access policy outcomes. Do not count an entitlement restoration as a new purchase. Bank payouts and profit require separate financial reporting.

## Weekly review

Review the same seven-day window each week and compare with the prior comparable window. Mark launch-day spikes, campaigns and product changes. Use mature cohorts for return and delayed-payment conversion. Do not set arbitrary conversion targets before there is a baseline.

Use this decision record:

| Field | Required entry |
| --- | --- |
| Question | One concrete product question |
| Observation | Counts, denominator, date window and source links |
| Confidence limits | Consent coverage, freshness, missing sources and small samples |
| Proposed action | One change with a stated hypothesis |
| Guardrail | What must remain healthy, such as access delivery or free-recipe usability |
| Owner and review date | Named person and next comparison window |
| Result | What changed and whether the evidence supports continuing |

Illustrative interpretations, not automatic decisions:

- High social reach with few observed recipe visits suggests checking the link, call to action and attribution before redesigning the product.
- Recipe use with little collection interest suggests reviewing the collection's contents and placement.
- Checkout creation with unpaid mature attempts suggests checking price clarity and the payment experience after ruling out a reporting fault.
- Confirmed payment without access is an operational defect requiring immediate attention.
- Repeat recipe use supports improving recipe discovery. It does not alone prove demand for milestone tracking or AI tools.

No A/B testing platform is needed for launch. Keep a simple change log and avoid drawing causal conclusions from uncontrolled before/after comparisons. Do not expand parenting features based only on followers, likes or a handful of events.
