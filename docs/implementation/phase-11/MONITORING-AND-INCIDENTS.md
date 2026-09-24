# Monitoring and incidents

## Monitoring design

Use operational telemetry for service health and necessary transaction recovery. Keep optional behavioural analytics subject to the Phase 9 consent contract. Operational monitoring must not become an excuse to collect recipe search text, child details or full customer journeys.

Each monitor needs query/source, calculation, evaluation interval, environment, threshold, minimum denominator, owner, backup, runbook and last successful evaluation. An unavailable monitor is unknown, not healthy.

## Proposed launch alerts

Accept or revise these targets before launch. Keep absolute triggers for low-volume severe failures. Percentage thresholds alone hide failures when only a few parents buy.

| Signal | Definition and proposed trigger | Response |
| --- | --- | --- |
| Confirmed payment without usable access | Distinct eligible succeeded orders lacking a qualifying effective right for over 5 minutes, excluding approved refund/dispute/expiry outcomes | Page engineering, open customer recovery case, stop expansion. Stop new sales if unresolved or repeated |
| Provider payment missing from ledger | Canonical paid provider object absent after reconciliation grace window | Page engineering, recover binding, do not ask customer to repay |
| Wrong/duplicate charge or cross-user access | One verified occurrence | Immediate new-sale stop, incident lead and containment |
| Inbox backlog | Oldest due unprocessed item over 5 minutes or repeated failures for an order | Check worker/leases/provider/DB, pause sales if fulfilment is at risk |
| Job freshness | Critical 1-minute job misses 3 intervals, or reconciliation exceeds twice its cadence | Page operator, distinguish scheduler failure from empty queue |
| Recipe dependency failure | Two consecutive content-aware synthetic failures 1 minute apart | Investigate real free/owned read paths, stop promotion if product unavailable |
| Checkout application errors | At least 3 eligible attempts fail within 5 minutes, or over 5% of at least 20 eligible attempts fail | Investigate server/provider errors, exclude normal card declines and user cancellations from application failure count |
| Auth/receipt delivery | Provider outage, repeated delivery failure or unexpected bounce spike | Preserve free access, pause affected acquisition, recover queue/support |
| DB resources | Sustained connection use above an accepted limit, proposed 80%, or rising timeout rate | Review pool/concurrency and slow queries, reduce new sales before resource exhaustion |
| Configuration drift | Wrong account/mode/project/manifest, synthetic published content or missing signing secret | Immediate affected-sale stop and revalidation |
| Support capacity | Proposed 5 unresolved access/payment cases or oldest exceeds accepted response target | Assign backup, hold expansion, inspect common cause |
| Costs | Proposed 70% budget warning, 90% review/hold | Investigate bot/loop/export usage. Do not automatically disable valid purchased access |

For the 5-minute paid/access target, measure from provider-confirmed payment time, not return-page time. Also record ingestion delay. Compare effective access under the approved source policy, not merely a row with the word active.

Alert on a separate daily provider-versus-ledger audit so missing webhook events do not disappear from a ledger-only dashboard. Group by environment/account/currency and exclude synthetic activity. Never sum unrelated currencies into one unlabeled revenue number.

## Dashboard minimum

Show current rollout stage/version, production candidate, recent health, oldest inbox age, last worker/reconcile success, confirmed paid/access-pending count, unresolved financial mismatches, refund states, support load and backup freshness. Show the timestamp and stale/unknown state for every external source.

Link restricted operational records through authorised tooling. Public screenshots should contain aggregate/synthetic data only. Do not embed secret-bearing URLs, raw webhook payloads, auth codes, email addresses or full provider objects in shared evidence.

## Incident levels

| Level | Example | Initial action |
| --- | --- | --- |
| I0 critical | Data leak, wrong charge, forged entitlement, unsafe paid-content exposure | Stop affected new sales/exposure, page lead and preserve redacted evidence |
| I1 major | Confirmed buyers cannot read, prolonged auth/DB outage, failed critical recovery job | Contain, stop expansion or new sales, assign recovery and support owners |
| I2 limited | Isolated recoverable issue, minor UI regression, optional reporting outage | Triage during staffed window, document workaround and next review |

Severity mapping follows Phase 10 S0–S3 customer impact. Operators should not downgrade a financial/privacy failure because only one person reports the problem.

## Incident procedure

1. Acknowledge the alert and create an incident ID. Record start time, stage, candidate and affected service.
2. Verify scope through safe readonly queries and provider status. Do not run intrusive production probes against real accounts.
3. Apply the smallest effective containment: stop new checkout, pause promotion, withdraw one unsafe recipe or isolate a leaking route. Preserve safe owner access where possible.
4. Assign incident lead, engineering recovery and support communication owners. If one person holds all roles, record the backup and capacity limit.
5. Reconcile affected orders and rights before reopening. Do not use a database grant as proof of provider payment.
6. Communicate only verified impact and recovery steps through authorised channels. Avoid promised resolution times without evidence.
7. Run targeted regression and a fresh operational check on the fixed candidate.
8. Record recovery time, impacted customers/transactions, financial adjustments, root cause and preventive work. Review within two working days as a proposed cadence.

Keep a timeline of decisions and mutations. For a potential privacy incident, involve the designated business/privacy adviser to determine applicable notifications. Do not invent reporting deadlines in a technical runbook.

## On-call coverage

Set proposed acknowledgement within 5 minutes during the staffed launch window, matching Phase 10's operational target. Record actual coverage hours and who takes over. Do not advertise 24/7 support unless staffed and tested.

Test primary and backup notification paths before each major launch stage through authorised recipients. If nobody is reachable, keep L2/L3 new sales disabled and hold wider promotion. Existing purchases still require reliable automated recovery.
