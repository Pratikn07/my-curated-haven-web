# Phase 12 implementation plan

Status: planning complete when this package is reviewed and merged. All tasks below start pending. A task becomes complete only with linked execution evidence. This plan authorises no production release, charge, outreach or private-data migration.

## Scope and working order

The goal is one evidence-backed expansion decision and, only if selected, one bounded feature pilot. Preserve the existing recipe product throughout. Read [baseline and decisions](BASELINE-AND-DECISIONS.md) before coding. The conditional planner supplies a concrete possible slice, not a predetermined roadmap commitment.

Use four work groups: evidence and selection, contracts and prototype, selected implementation, pilot and decision. Work on documentation and synthetic prototypes while gathering evidence. Do not begin a production migration or real cohort exposure before the relevant gates pass.

| Task | Depends on | Lead | Output |
| --- | --- | --- | --- |
| P12-01 | Phase 11 handoff | Product + engineering | Current baseline and entry decision |
| P12-02 | P12-01 | Product + measurement | Evidence inventory |
| P12-03 | P12-01 | Engineering + native maintainer | Reuse/compatibility inventory |
| P12-04 | P12-02 | Product/research | Problem brief |
| P12-05 | P12-03/P12-04 | Product + design | Candidate comparison |
| P12-06 | P12-05 | Product owner | Feature charter or hold decision |
| P12-07 | P12-03/P12-06 | Engineering | Identity/project/access contract |
| P12-08 | P12-06/P12-07 | Product + data owner | Data lifecycle and commercial policy |
| P12-09 | P12-06/P12-08 | Design + engineering | Usable mobile prototype |
| P12-10 | P12-07/P12-08/P12-09 | Engineering | Additive data contract and migrations |
| P12-11 | P12-10 | Engineering | Secure server operations and feature gate |
| P12-12 | P12-09/P12-11 | Engineering + design | Selected web workflow |
| P12-13 | P12-12 | Engineering + content | Print, unavailable and lifecycle behaviour |
| P12-14 | P12-06/P12-11 | Measurement + engineering | Consent-safe metrics |
| P12-15 | P12-10–P12-14 | QA + native maintainer | Feature and regression evidence |
| P12-16 | P12-13/P12-15 | Operations + engineering | Support, recovery and release readiness |
| P12-17 | P12-14/P12-16 | Product + release lead | Approved pilot preflight |
| P12-18 | P12-17 | Operations + product | Bounded pilot execution |
| P12-19 | P12-18 | Product + measurement | Outcome and expansion decision |
| P12-20 | P12-06 or P12-19 | Product + engineering | Closure and next scoped backlog |

Role assignments need names and backups before execution. No arbitrary deadline overrides a blocked dependency.

## P12-01: establish the current baseline

Read current main in both repos, Phase 10 gates, Phase 11 operating evidence and Phase 7/8 remediation status. Record source SHAs, live deployment IDs, migration heads, feature/checkout configuration and evidence timestamps. Separate verified production facts from source presence and historical notes.

Recheck B12-03 through B12-05 rather than assuming their status persists. Map each unresolved defect to an owner, affected workflow and release gate. Choose planning-only, research-ready or customer-pilot-ready entry status.

Targets: `BASELINE-AND-DECISIONS.md`, Phase 10/11 evidence references, proposed execution `BASELINE.md`.

Done when the entry status and exact blockers are reviewable. No unverified claim of successful launch or stable payments. Verify with EX-E01/02/10 and X-G01.

## P12-02: assemble recipe-launch evidence

Collect approved operational aggregates, mature usage cohorts, support themes, editorial problems and campaign context. Record window, counts, denominators, consent coverage and missing data for each measure. Check whether broken access, weak acquisition or the available recipe set explains the signal before inferring feature demand.

Keep Instagram statistics separate from product conversion. Do not export personal production rows into the repository. Use existing Phase 9 definitions and link restricted evidence through redacted references.

Targets: `RESEARCH-AND-EVIDENCE.md`, Phase 9 dashboards, proposed `RESEARCH-SUMMARY.md`.

Done when each candidate problem has evidence or an explicit evidence gap. Verify EX-E03–E06 and EX-M01/02/09.

## P12-03: inventory native reuse and shared consumers

Refresh the source map for recipes, saves, preferences, articles, child profiles, tips, milestones and chat. Inspect services, schema, ownership and release consumers. Label each unit reuse unchanged, adapt, defer or replace for a documented reason.

Check for an existing planning module before creating a new entity. Confirm migration authority and preserve repository gitlinks. Record native sign-in, saves and recipe access checks required by any shared change. Do not deploy a native fix from this web planning task.

Targets: `NATIVE-REUSE-AND-COMPATIBILITY.md`, proposed compatibility record.

Done when reuse decisions have source SHAs and contracts, with no assumption of private-data portability. Verify EX-S01/02/10 and EX-D01.

## P12-04: validate one recurring parent problem

Approve recruitment purpose and contact channel. Run the research script with the proposed adult sample, capturing consent and limits. Ask about recent behaviour and workarounds before showing features. Include nonreturning buyers and free users where reachable.

Synthesize recurring needs, conflicting observations and alternative causes. Remove private family details. No invented quotes, unsolicited outreach or public research recordings. Apply the proposed discovery floor or record an alternative before interpretation.

Targets: restricted notes, redacted problem brief, `RESEARCH-AND-EVIDENCE.md`.

Done when a problem has enough evidence for comparison or the decision explicitly stays research/hold. Verify EX-E07/08/09/10.

## P12-05: compare the smallest interventions

Compare recipe fixes, saved organisation, planner or reviewed resources against the same problem. Apply hard filters, then score with evidence and confidence. Include hold. Estimate engineering, privacy, editorial, support and recurring cost.

Use synthetic low-fidelity flows to test the named task. Do not select by feature count, sunk native development effort or social-media likes. State why improving the current recipe workflow is insufficient if selecting a new feature.

Targets: candidate scorecard and `FEATURE-SELECTION.md`.

Done when the recommendation includes alternatives and missing evidence. Verify EX-S01–S05.

## P12-06: approve scope or close with hold

Write the feature charter with target user, one outcome, included operations, exclusions, data needs, route, access, duration, metric, cost ceiling and stop criteria. Resolve D12-02 through D12-05 and assign D12-09 ownership.

For the planner, adopt or explicitly revise the conditional specification. For another feature, write an equivalent acceptance addendum before build. If hold wins, record the next evidence question and review owner. Mark P12-07–P12-19 not applicable only where no selected implementation follows.

Targets: `FEATURE-CHARTER.md` or `HOLD-DECISION.md` in the future evidence directory.

Done when X-G02 passes or the decision path closes honestly. Verify EX-S06–S10.

## P12-07: settle identity, project and authority

Verify web/native project references and auth identity boundaries. Establish one migration authority per shared database. Check existing roles, exposed schemas, views/RPCs and protected recipe access. Derive actors from verified auth and define feature eligibility independently from recipe entitlements.

If projects differ, preserve recipe source IDs through the current ingestion contract. Do not join private users by email or copy auth tables. Block shared private-data integration until a separate identity design passes review.

Targets: `src/lib/supabase/`, `src/lib/data/access.ts`, schema inventory and access matrix.

Done when the selected architecture has allow/deny rules for every operation and actor. Verify EX-D01–D06 and EX-C01–C05.

## P12-08: define lifecycle and offer boundaries

Record fields, purpose, retention, owner access, export and deletion for the selected feature. Keep the initial planner free of child and health records. Review support visibility, backup deletion replay and account closure language.

Approve the pilot duration/end policy before recruitment. Preserve initial recipe purchase rights and exclude automatic conversion. If new commercial terms are required, resolve the separate offer decision before paid work.

Targets: `DATA-AND-PRIVACY.md`, `ACCESS-AND-COMMERCIAL-POLICY.md`, privacy/account/support copy proposals.

Done when D12-08/D12-12/D12-13 have explicit decisions. Verify EX-D07–D10 and EX-C06–C10.

## P12-09: prove the mobile workflow

Build a protected synthetic prototype using existing tokens, UI primitives and account layout. Include empty, loading, success, unavailable, failed save, conflict, session expiry and pilot-ended states. Test the full choose-save-return task before polishing.

Review phone layout, keyboard/screen-reader behaviour, long titles, zoom and print. The proposal keeps the brand and recipe navigation. Reject a forced child-profile wizard or unrelated redesign.

Targets: `src/design-review/` or isolated prototype, `MOBILE-PRODUCT-AND-THEME.md`.

Done when the declared usability floor and critical accessibility checks pass or scope is revised. Verify EX-U01–U10.

## P12-10: implement the minimal data layer

Only after the schema inventory, create an additive migration for selected persistence, constraints, indexes and privileges. Define atomic version checking, quota enforcement and retry semantics. Use synthetic records and generate types from a clean replay.

For planner entries, enforce owner-parent relationships, valid week dates and unique day selection. No recipe bodies or child records in planner storage. Establish direct API denial or equivalent RLS/RPC enforcement. Review query plans for bounded reads.

Targets: root `supabase/migrations/`, `supabase/tests/database/`, `src/lib/types/database.ts`.

Done when clean replay, type drift and allow/deny tests pass. Verify EX-D01–D06 and EX-P01–P07. No hosted migration inferred from local success.

## P12-11: implement guarded operations and eligibility

Implement server-only feature mode, verified actor resolution, input allowlists, data operations and typed errors. Validate accessible recipes at assignment and read. Coordinate ownership, expected version and mutation in a transaction.

Missing feature configuration fails closed. A local fixture flag must not grant access in preview/production. Test direct API/RPC calls, revoked eligibility and stale sessions. Keep operational errors distinct from empty data and unavailable recipes.

Targets: proposed `src/lib/features/eligibility.ts`, `src/lib/data/meal-plans.ts`, `src/lib/actions/meal-plans.ts`.

Done when authorised operations work and bypass attempts fail without writes or content exposure. Verify EX-D02–D06, EX-P04–P10 and EX-O01/02.

## P12-12: implement the selected web workflow

Connect the approved mobile prototype to guarded operations. Preserve current recipe links, auth return paths and private cache headers. For the planner, render one week with seven day cards and an accessible recipe picker. Show save success only after commit.

Handle two-device conflicts explicitly. Keep failed intent only in local component memory, then reload server truth after uncertain outcomes. Do not introduce offline synchronisation or public plan URLs.

Targets: proposed `src/app/account/meal-plan/`, `src/components/planning/`, account entry and existing UI components.

Done when the complete task works across devices and all specified states render correctly. Verify EX-P01–P10 and EX-U01–U07.

## P12-13: complete print, access loss and lifecycle

Add owner-only print/export for the approved weekly list. Recheck recipe rights before generating output. Preserve existing complete recipe print pages. Test withdrawn/refunded recipes, independent entitlements, account switching and owner deletion.

Implement the agreed read/export/delete wind-down behaviour and update support/account copy. Avoid promising completed account deletion if only a request flow exists. Validate no protected body reaches a download, cache or metadata surface.

Targets: proposed private print/export route, `src/styles/recipe-print.css`, account/support copy and lifecycle data operations.

Done when lifecycle and print scenarios pass with manual print evidence. Verify EX-D07–D10, EX-U08/09, EX-C04/05/09 and EX-O08/09.

## P12-14: instrument the approved question

Add allowlisted events and properties through the existing Phase 9 pipeline. Respect consent, provider opt-out and analytics failure isolation. Record operational counts separately and redact private identifiers and plan contents.

Build the cohort report with maturity dates, denominators, feature version and missing-data flags. Register thresholds before enrolment. Validate deductions against a small synthetic known-answer dataset, including consent withdrawal and immature cohorts.

Targets: `src/lib/analytics/events.ts`, `schema.ts`, `sanitize.ts`, provider/client integration and proposed pilot report.

Done when measurement matches the declared definitions without blocking feature use. Verify EX-M01–M10.

## P12-15: run integrated and native compatibility QA

Execute the acceptance matrix on the exact candidate. Include two-user isolation, direct API bypass, stale tokens, conflicts, lost-access recipes, lifecycle, mobile browsers and cache leakage. Retest three free recipes, saves, purchased library, checkout and refund recovery as affected.

Run native compatibility checks for shared auth/schema changes. If native runtime or hosted environment is unavailable, mark blocked, not passed. Preserve CI gates and never replace meaningful tests with mocks merely to obtain green status.

Targets: root DB tests, web Playwright suites, manual evidence and native compatibility record.

Done when X-G03 and X-G04 pass with no unresolved critical defects. Required cases skipped without an approved non-applicability rationale block release.

## P12-16: rehearse operations and recovery

Name support/engineering owners and backups. Test feature mode changes, alerts, account recovery, owner-only exports, backup coverage and safe rollback. Prove recipe access and payment workers continue during a pilot stop.

Rehearse a failed save, another-account report, unavailable recipe and pilot retirement using synthetic data. Set actual support coverage and cost ceilings. Keep sensitive case details outside public docs.

Targets: `ROLLOUT-AND-OPERATIONS.md`, Phase 11 runbooks, proposed rehearsal record.

Done when operators reproduce containment/recovery and X-G05 readiness evidence exists. Verify EX-O01–O09.

## P12-17: approve the pilot candidate

Freeze candidate SHA, migration/config versions, content references, eligibility policy, cohort definition and experiment charter. Check the Phase 11 baseline again for intervening changes. Approve participant copy, duration and end policy.

Perform a production configuration review and no-charge smoke under the approved release process. No synthetic live payment test. Customer outreach requires the named sender and approved channel. A green documentation PR is not this approval.

Targets: pilot release record and case register.

Done when X-G01–X-G05 all pass for the same candidate and operators record the explicit exposure decision. Verify EX-O04/05/10 and EX-C10.

## P12-18: execute the bounded pilot

Start with the proposed five-person stage, observe failures and support, then expand only to the approved ceiling. Enforce eligibility server-side. Record start/end, actor counts, changes, support load and incidents. No automatic public launch after an elapsed timer.

Maintain recipe operations independently. Stop on privacy/access/data-loss events, and pause new enrolment when support or cost exceeds the agreed ceiling. Use approved communications and data retention only.

Targets: stage log, restricted participant register, weekly pilot review.

Done when the observation window is complete or an explicit stop is recorded. Verify EX-M08–M10 and EX-O01–O10.

## P12-19: decide continue, revise, retire or hold

Assess predeclared measures with raw counts and mature denominators. Include negative feedback, consent gaps, acquisition differences, support time and costs. Separate measured behaviour from claimed customer benefit.

Continue only with a scoped next release and ongoing owner. Revise with one clear problem and a new experiment version. Retire through the agreed lifecycle. Hold if evidence is insufficient. Do not use sunk development effort as a success criterion.

Targets: outcome review, D12-14 and X-G06.

Done when the decision has evidence, limits, actions and owners. Verify EX-E10, EX-S10, EX-M10 and EX-O10.

## P12-20: close the phase and maintain a bounded backlog

Publish a redacted closure record describing decision path or pilot path. Link actual PRs, deployments, test results, operating outcomes and remaining risks. Mark unselected tasks/scenarios not applicable with the recorded reason. No fake implementation evidence for a hold decision.

Rank the next three opportunities using the same evidence framework. Child profiles, milestones, AI or family sharing need separate feature-specific plans before implementation. Preserve source, remove expired pilot access and verify retention cleanup ownership.

Targets: `IMPLEMENTATION-HANDOFF.md`, execution `PHASE-12-CLOSURE.md`, shared implementation index.

Done when another maintainer understands what shipped, what did not, who owns remaining data and what evidence should drive the next choice.
