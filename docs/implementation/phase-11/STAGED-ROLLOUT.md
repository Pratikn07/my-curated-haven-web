# Staged rollout

## Recommended stages

Sizes and windows below are proposed starting limits, not approved schedules or statistical guarantees. Record D11-09 before use. Extend observation after incidents, sparse purchases or missing provider evidence. Never manufacture live transactions to meet a stage threshold.

| Stage | Exposure | Minimum observation and evidence | Exit decision |
| --- | --- | --- | --- |
| L0 Rehearsal | Protected staging, synthetic users and provider test mode | Phase 10 gates, worker/stop/restore rehearsal and completed production packet | Release lead accepts readiness |
| L1 Production prepared | Production artifact, three free recipes, new checkout disabled, no new launch promotion | Proposed 2 staffed hours, real-content smoke, correct environment, jobs/alerts and rollback target | Approve invited stage only if all hard gates pass |
| L2 Invited paid launch | Proposed 10–20 invited households, server eligibility by verified account | At least 48 hours, all genuine orders reconciled, proposed 5 distinct genuine buyers with access observed, no unresolved major defect | Expand, hold for more evidence, or stop |
| L3 Limited expansion | Proposed up to 100 eligible households, another controlled placement | At least 72 hours, proposed 20 cumulative genuine buyers, support and job capacity acceptable | Approve public checkout/announcement or hold |
| L4 Wider Tiny Soho release | Public checkout plus approved wider promotion | Staffed opening window and at least 7 days of daily operations review | Enter routine operations when stability gates pass |
| L5 Routine operation | Ongoing free discovery and paid collection sales | First-30-days review, resolved recurring incidents, sustainable ownership and budget | Close Phase 11 and consider Phase 12 |

The buyer counts are operational sampling proposals, not conversion goals or proof of a low failure rate. If traffic/purchases are insufficient, hold or document a revised exposure decision while retaining all hard QA/payment/privacy gates. Zero failures in five orders is weak statistical evidence.

## Server control contract

The current `CHECKOUT_ENABLED` environment switch does not implement the complete staged control. Add a reviewed private rollout record and adapter before L2. Proposed fields: mode, version, effective time, operator, reason, eligibility list/group and stop state. Store recipient details only where needed, with restricted access.

For each checkout request:

1. Verify server-side identity and valid existing ownership first. Owners should reach their library.
2. Read the authoritative rollout state. Missing/unavailable state rejects new checkout safely.
3. Require invited membership for invited mode. Bind membership to the verified UUID, never a browser-provided email or campaign query.
4. Require the approved active offer and immutable release manifest.
5. Reserve/recover the idempotent attempt under the Phase 8 concurrency rules, then create/reuse the provider Session.
6. Record the rollout version on the attempt for audit without changing existing ownership on later stage transitions.

Existing payment completion and purchased access must not depend on current invitation membership. Removing an invitation stops new eligible sales, not access to a completed purchase.

Use server checks on every entrypoint including direct POST and retry/replacement paths. A client flag, secret URL, navigation change or UTM value is not an eligibility control. Test concurrent requests and stale caches after every mode change.

Do not add an arbitrary hard cap on successful purchases unless separately designed. A reliable capacity cap must account for reserved and open Sessions atomically, including Sessions completed after checkout stops. This plan bounds invitations and monitors traffic, not an exact financial cap.

## Universal stage-entry checks

- Same tested candidate, migrations, content and commercial settings, or approved retest record.
- No unresolved S0/S1 defect, unknown payment mismatch or confirmed paid customer lacking access without an active recovery case.
- Required alerts fresh, assigned operator and backup available, support inbox covered.
- Independent fulfilment/reconciliation healthy, no stale unprocessed event backlog.
- Stop control recently verified and safe rollback artifact identified.
- Required communication approved for recipients, content and timing.

Do not carry a stale go decision to a different build or offer. A legal/policy/currency change needs renewed approval, not only a CTA edit.

## Hold and stop rules

Hold expansion on weak sample, increased support load, missing optional funnel data or uncertainty about a noncritical regression. Keep the current safe cohort and collect evidence.

Stop new sales immediately for confirmed duplicate/wrong charge, unsafe payment simulation, cross-user/paid-content leak, lost valid ownership, unsupported material recipe safety concern or inability to observe critical payment health. The incident operator uses the rehearsed control, then informs the release owner.

Pause promotion when traffic exceeds the tested envelope, operators lose coverage or support backlog grows beyond the accepted threshold. If service integrity is also affected, stop new sales. Do not remove existing buyers' rights to reduce load.

## Low traffic and off-hours

No purchases during an observation window does not validate fulfilment. Keep genuine sandbox/no-return evidence separate from real sales. Do not compensate with self-purchases, fake customers or misleading scarcity.

Before leaving the staffed launch window, record whether checkout stays available and who receives critical alerts. During L2/L3, default to stopping new sales if no operator/backup is reachable. Existing Sessions and owners still require durable processing and a support path.

## Stage decision record

Record stage, start/end times, cohort count, genuine buyer/order count, pending/refunded cases, incidents, support load, job/alert freshness, decision, owner, next review and evidence. Use UTC in technical records and the agreed local timezone in operator schedules.

A marketing invitation cap is not a visitor cap. Links get shared. Monitor all incoming traffic and keep server eligibility intact until L4 explicitly opens checkout.
