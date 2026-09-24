# Implementation handoff

## Package status

This package contains 20 tasks and 80 acceptance scenarios. Tasks are pending and scenarios are not run. Phase 12 has no selected expansion feature yet. The weekly planner is a concrete conditional blueprint. No child data, schema change, pilot invite or payment is part of this documentation change.

## Proposed implementation PR sequence

| PR | Tasks | Scope and review focus |
| --- | --- | --- |
| 1. Evidence and decision | P12-01–P12-06 | Baseline, research synthesis, source reuse, candidate comparison and charter/hold |
| 2. Data/access contracts | P12-07/P12-08/P12-10 | Project authority, rights, additive schema, RLS, retention and compatibility |
| 3. Protected prototype and operations | P12-09/P12-11 | Mobile flow, verified actor, feature eligibility, atomic mutations |
| 4. Selected product slice | P12-12/P12-13 | End-to-end workflow, print, unavailable/access-loss and deletion |
| 5. Measurement and readiness | P12-14–P12-17 | Consent-safe events, regression evidence, operations and pilot release record |
| 6. Pilot results and closure | P12-18–P12-20 | Actual exposure, outcome, retirement/continuation and next scoped backlog |

PR 2 waits for the approved prototype/data design even if PR 3 later contains its production code. Keep migrations and their enforcement tests together. If selection chooses hold, PR 1 plus a closure record completes the decision path. Do not create empty implementation PRs to match this table.

Each implementation PR explains the customer problem, changed behaviour, source reuse, access impact, checks run, remaining blocked evidence and rollback. Review native changes in the native repository under its instructions. Do not mix unrelated native refactors with the web pilot.

## Effort planning

Proposed planning ranges, not delivery promises: baseline/research setup 2–3 engineering/product days, interviews and synthesis 1–2 calendar weeks depending on recruitment, prototype/selection 2–4 working days, selected planner implementation 5–10 engineering days, integrated/manual readiness 3–5 working days, pilot observation 28 calendar days plus any required cohort maturity extension.

Assumptions: one small manual planner, no child records, no new billing, existing UI and access contracts usable, one engineering lead with product/content/support input. Hosted schema conflicts, payment remediation, native runtime issues or a different selected feature require a new estimate. Research and operations are real work and must receive budget.

Do not add these ranges into a firm launch date before prerequisite ownership and availability are confirmed. Recipe launch repair belongs to its existing backlog and should not be hidden inside a planner estimate.

## Execution records to create later

```text
docs/implementation/phase-12/evidence/<decision-or-pilot-id>/
  BASELINE.md
  RESEARCH-SUMMARY.md
  REUSE-AND-COMPATIBILITY.md
  FEATURE-CHARTER.md  or  HOLD-DECISION.md
  DATA-AND-ACCESS-DECISIONS.md
  CASE-RESULTS.csv
  RELEASE-RECORD.md
  STAGE-LOG.md
  OUTCOME-REVIEW.md
  PHASE-12-CLOSURE.md
```

These files do not exist merely because this layout appears here. Keep private contacts, recordings, credentials and raw account records in an approved restricted system. The repo contains redacted summaries and restricted-evidence references.

## Feature charter template

```text
Status: proposed
Problem ID, owner and evidence:
Target segment and recurring job:
Selected feature and alternatives rejected:
Included actions and explicit exclusions:
Native source reused, commit and adaptation:
Web/native project map and migration owner:
Data fields, purpose, retention and deletion:
Recipe rights and feature eligibility rule:
Mobile route, prototype result and accessibility needs:
Pilot duration, cohort, primary metric and maturity window:
Sample floor, targets, guardrails and stop rules:
Support owner/backup, cost ceiling and coverage:
End notice, export/delete period and data cleanup:
Approved decisions and remaining blockers:
```

## Release record template

```text
Status: HOLD until all applicable gates pass
Selected charter/experiment version:
Web SHA/deployment and native version checked:
Database reference/migration head and migration authority:
Feature mode/config version and eligibility owner:
Existing recipe release/offer/access baseline:
Phase 10/11 prerequisite evidence:
X-G01 through X-G05 evidence:
Manual device/print and native compatibility evidence:
Safe rollback, recovery and deletion-replay evidence:
Approved participant cohort and communication channel:
Operator, backup, coverage and release approval:
Start/end dates and next review:
```

## Outcome review template

```text
Decision: continue / revise / retire / hold
Original question and registered thresholds:
Actual enrolment, consent coverage and mature denominators:
Primary result, raw counts and uncertainty:
Usability, negative feedback and support burden:
Recipe/payment/privacy guardrail outcomes:
Costs versus ceiling and effort versus estimate:
Concurrent changes and alternative explanations:
Data retained/deleted and next lifecycle action:
Next bounded scope, owner and review date:
Evidence references and explicit approval:
```

## Final handoff checks

- Existing recipe identities, three-free-recipe access and original purchase rights are preserved.
- Native reuse is documented. Source existence is not claimed as deployed compatibility.
- No project, migration, account-linking or commercial decision is inferred from an old plan.
- Selected pilot has one customer outcome and a bounded scope. Unselected features stay deferred.
- Analytics definitions include consent coverage, raw counts and cohort maturity.
- Every applicable release scenario has evidence. Missing real-device or native checks remain visible.
- Operators know how to stop the pilot without interrupting recipe access or payment recovery.
- Research/pilot data has an owner and end date. Retirement has a usable export/delete path.
- Closure distinguishes plan complete, decision complete, implemented, piloted and wider release approved.

## Direction after Phase 12

Do not preapprove Phase 13 as a full parenting migration. Use the outcome review to select the next bounded improvement. Child profiles, milestones, AI, family sharing and community each require demand evidence, a minimal feature contract, privacy/security review, operating ownership and a fresh implementation plan.

If recipes are useful but growth is weak, improve acquisition, offer clarity or content before expanding product scope. If operations are unstable, stabilise. If the pilot succeeds, expand only the validated behaviour and preserve the original recipe funnel.
