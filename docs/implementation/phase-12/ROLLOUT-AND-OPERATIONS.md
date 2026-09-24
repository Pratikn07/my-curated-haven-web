# Rollout and operations

## Release prerequisites

Use the approved Phase 10/11 release process. Phase 12 does not waive unresolved payment remediation, hosted migration gaps, content review, support readiness or backup recovery. Reference candidate-specific evidence and refresh any evidence invalidated by subsequent code/configuration changes.

Keep the planner independently switchable from checkout and recipe access. Stopping a feature must not stop payment webhooks, refund reconciliation or purchased recipe reads. Never roll back to a deployment with a known payment or access vulnerability.

## Proposed feature modes

| Mode | New enrolment | Planner writes | Existing owner reads | Export/delete |
| --- | --- | --- | --- | --- |
| Off before launch | No | No | No pilot records expected | No pilot records expected |
| Invited | Verified allowlist only | Active participants | Active participants | Owner only |
| Paused enrolment | No | Existing participants unless write risk exists | Existing participants | Owner only |
| Read-only | No | No assignments/replacements | Existing owners during approved window | Allow owner export/delete |
| Retired | No | No | Approved wind-down window only, then unavailable | Available during window, then policy cleanup |
| Emergency disabled | No | No | Deny affected feature reads while investigating | Support-led recovery until safe |

Evaluate server mode and actor eligibility on every sensitive operation. Missing/malformed configuration fails closed for the pilot. Local test overrides must not operate in preview or production. A public environment variable, query parameter, source-map flag or hidden navigation link is not access enforcement.

If exposed database writes exist, mode and eligibility rules must hold there too. Prefer a single reviewed server/RPC path and revoke bypassing grants. Eligibility changes must affect existing sessions without relying solely on an old JWT claim.

## Stage sequence

1. **Synthetic local/staging:** validate schema, two-user isolation, concurrency, lost access, print and rollback. No private production data.
2. **Staff rehearsal:** named verified test accounts in the approved environment. Walk through enrolment, support and feature stop. All payment testing stays in sandbox.
3. **Small pilot:** proposed first 5 adult participants with staffed observation. Check task success, support and access before adding more.
4. **Full invited pilot:** grow only to the approved 15–25 participant target. Observe the full experiment window and mature cohorts.
5. **Decision:** continue as another bounded pilot, revise, retire or approve a separately scoped wider release.

Each stage has an actor list, candidate/config version, start/end, operator, evidence and go/hold/stop decision. Invitations require explicit channel authorisation and approved copy. No communications are sent by this planning PR.

## Monitoring and stop rules

| Signal | Proposed action | Owner |
| --- | --- | --- |
| Cross-user read/write or private cache exposure | Emergency-disable affected surface immediately, preserve evidence, investigate and notify through approved incident process | Engineering + incident lead |
| Incorrect recipe grant or revoked recipe body exposed | Stop affected pilot path, repair source access, verify commerce independently | Engineering |
| Lost/overwritten saved week | Stop writes, preserve current rows and mutation receipts, recover affected plan | Engineering + support |
| Repeated mutation errors | Alert on 3 consecutive synthetic failures or 5 service errors in 15 minutes, with request counts | Operations |
| Elevated error ratio | Investigate above 2% over at least 100 valid attempts, with latency/baseline context | Operations |
| Conflict response | Expected concurrency signal, monitor confusion rather than treating every conflict as an outage | Product |
| Support/cost ceiling exceeded | Hold new enrolment and review scope | Product + operations |
| Recipe access or payment regression | Hold expansion and follow Phase 11 incident process | Release lead |

Thresholds are proposals to calibrate before launch. Small volume needs count-based alerts because ratios alone are unstable. Use synthetic accounts and minimal identifiers in logs. Do not log recipe combinations, child data, tokens or full request bodies.

## Rollback and data compatibility

Use additive schema changes so the prior safe application continues serving recipes. Feature-off should be the first containment action for a feature-local defect. Revert the feature deployment only after checking migration compatibility and preserving existing payment fixes.

Do not drop planner tables during emergency rollback. Keep data for recovery and the promised export/delete window. If corruption requires restore, restore to an isolated environment, compare owner/week/version and replay only reviewed records. Do not restore the whole product database over newer orders or entitlements to recover one plan.

Record backup coverage, recovery point and deletion-replay behaviour. Phase 11 recovery evidence must cover any new persistent entity. Storage objects, if later introduced, need their own recovery plan. The initial pilot proposes none.

## Support runbook additions

For “my plan disappeared,” verify the signed-in account, week and feature mode without requesting a password or code. Inspect a restricted correlation reference and version history. Do not ask the user to send child information or complete recipe screenshots. Avoid changing a plan on the customer's behalf without a clear authorised support action.

For “recipe unavailable,” distinguish withdrawal, lost entitlement, an expired session and a temporary service failure. Do not offer a new purchase as the default remedy. Check independent valid rights first. For a confirmed data loss, explain the recovery status and next update through the established support channel.

## Pilot retirement

Prepare the end notice before recruitment. State the last edit date, read/export/delete period and where existing purchased recipes remain available. No automatic paid conversion. Keep owner controls working throughout the promised window, then execute the approved cleanup with a count/reconciliation record.

Remove pilot navigation, routes and analytics only after checking stored links, support instructions and data access commitments. Preserve source in Git. Record why the pilot ended, what evidence was learned and which parts are reusable. Avoid orphaned tables, silent data retention or indefinite unowned feature flags.
