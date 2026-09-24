# Phase 11 implementation handoff

## Starting state

The package defines 18 tasks and 64 acceptance scenarios. All remain pending/not run until candidate-specific evidence exists. Current main includes account, commerce, analytics and access-hardening source. Payment findings and operational readiness still require implementation and verification.

Use [baseline and decisions](LAUNCH-BASELINE-AND-DECISIONS.md) first. No production credentials are needed for this documentation PR. When implementation needs secrets, use the approved provider/hosting secret store and share only the non-secret project/environment references in the work record.

## Suggested implementation PRs

| PR | Tasks | Review focus |
| --- | --- | --- |
| 1. Commerce trust fixes | P11-02, linked Phase 8/10 findings | Missing signature, canonical payment validation, mock isolation, environment fail-closed |
| 2. Production configuration and delivery | P11-01/P11-03–P11-05 | Correct project, sender, manifest and commercial record |
| 3. Durable jobs and rollout gate | P11-06/P11-07 | Independent recovery, authenticated scheduler, direct server eligibility and stop |
| 4. Monitoring and runbooks | P11-08–P11-11 | Alerts, recovery, support and content corrections |
| 5. Launch evidence | P11-12–P11-14 | Exact candidate, stage decisions, authorised promotion and communications |
| 6. First-month operations | P11-15–P11-18 | Stable operations, measured outcomes and Phase 12 input |

Avoid combining a critical payment fix with a broad visual redesign. Keep permanent regression tests for meaningful boundaries. Honour repository checks for every implementation PR. A passed documentation PR does not satisfy the operational acceptance gates.

## Task-to-evidence mapping

| Tasks | Primary scenario families | Required records |
| --- | --- | --- |
| P11-01–P11-05 | OP-R, OP-S05/S06 | Candidate, decisions, configuration, content/sender proof |
| P11-06/P11-07 | OP-P, OP-C01–C05 | Job registry, worker recovery, rollout control tests |
| P11-08–P11-11 | OP-M, OP-D05–D08, OP-B, OP-S | Alerts, incident, rollback, restore and case rehearsal |
| P11-12–P11-14 | OP-D, OP-C, L-G01–L-G05 | Production preflight and staged go/hold/stop decisions |
| P11-15–P11-18 | OP-A, L-G06 | Daily logs, weekly review, cost record and closure |

## Execution records to create later

```text
docs/implementation/phase-11/evidence/<release-id>/
  RELEASE-RECORD.md
  READINESS-AND-DECISIONS.md
  STAGE-LOG.md
  CASE-RESULTS.csv
  OPERATIONS-HANDOFF.md
  INCIDENT-SUMMARY.md
  WEEKLY-REVIEW.md
  PHASE-11-CLOSURE.md
```

This layout is proposed, not evidence already created. Use restricted storage for sensitive operational details and put redacted references in the public summaries.

## Release record template

```markdown
# Release <ID>
Status: pending
Scope and current stage: pending
Source SHA / production deployment ID: pending
Product DB reference / migration head: pending
Content manifest hash / free recipe revisions: pending
Commercial and privacy policy versions: pending
Stripe account/mode/API/Price references: pending
Rollout mode/version and control owner: pending
Worker/scheduler version and last success: pending
Auth/receipt sender verification: pending
Monitoring primary/backup and coverage: pending
Safe rollback artifact and compatibility proof: pending
Backup/recovery point and measured RTO/RPO: pending
Phase 10 gate evidence and Phase 11 L-G results: pending
Approved exceptions and expiry: pending
Next decision, owner and time: pending
```

## Stage record template

```markdown
# Stage <L0–L5> decision
Decision: HOLD until evidence is complete
Candidate/configuration/content versions: pending
Planned exposure and server eligibility: pending
Approved staffing window and backup: pending
Start/end UTC and local operating timezone: pending
Invited households / genuine buyers / confirmed orders: pending
Pending access / refunds / financial mismatches: pending
Critical alerts, incidents and unresolved cases: pending
Observation/sample limits: pending
Stop-control and job-freshness evidence: pending
Approved communications and sender: pending
Decision owner, next review and evidence links: pending
```

## Case register template

```csv
scenario_id,candidate,environment,actor,executed_at,status,expected,actual,evidence_ref,defect_or_incident,owner
OP-R01,pending,pending,release_lead,,not_run,pending,pending,,,pending
```

Use separate rows for different environments/devices where required. A sandbox result must not be relabeled production. Do not mark provider validation passed from a simulated checkout route.

## Incident summary template

```markdown
# Incident <ID>
Severity, start time and detection source: pending
Affected stage/candidate/services: pending
Verified customer/transaction impact: pending
Containment action and time: pending
Lead, engineering, support and backup: pending
Recovery actions and authorisation references: pending
Provider/ledger/access reconciliation: pending
Targeted retest and reopen decision: pending
Root cause and preventive owner/action: pending
Restricted detail reference and sanitised public summary: pending
```

## Weekly review template

```markdown
# Week <N>
Question and customer outcome: pending
Cohort/window and denominators: pending
Paid/access, refund, support and cost observations: pending
Optional analytics coverage and Instagram freshness: pending
Evidence limits and alternative explanations: pending
One proposed change and guardrail: pending
Owner, review date and stop condition: pending
Result and next decision: pending
```

## Handoff checklist

- Approved scope and candidate match production configuration and content.
- B01–B05 have verified fixes, with new-source findings reassessed before release.
- Every required task/scenario has evidence, or the release remains explicitly blocked.
- Existing parenting identities, recipe IDs and independent rights are preserved.
- Production payments come from genuine authorised sales. All payment testing uses sandbox/test mode.
- Operators know how to stop new sales while preserving fulfilment and existing rights.
- Support, job ownership, backup/restore and alert routing have a working backup owner.
- First-month conclusions state sample and consent limits. Optional Instagram data stays separate.
- Phase 12 receives evidence and proposed scope, not an automatic promise of added features.

If the operating prerequisites are incomplete, report “plan complete, launch preparation blocked” with exact owners/actions. Do not equate a merge with an operational launch.

## Phase 12 continuation

Use the [Phase 12 implementation plan](../phase-12/IMPLEMENTATION-PLAN.md) after preparing the operating evidence above. Research and synthetic prototypes proceed separately from customer exposure. Phase 12 preserves a hold decision when evidence is sparse and requires a new feature charter before any parenting expansion.
