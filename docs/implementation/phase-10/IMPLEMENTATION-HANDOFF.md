# Phase 10 implementation handoff

## Starting position

The original plan began with all sixteen tasks and all 86 scenarios pending/not run. The current main baseline is `52393454d3388be7c5a6954996a9eda54e767ed4`; this execution adds a guarded test runner and machine-readable scenario accounting plus a candidate-specific NO-GO handoff. The current task status and evidence are recorded in [`evidence/phase10-qa/`](evidence/phase10-qa/). This is not paid-launch certification; no test-mode provider run, owner approval or real-device review is inferred.

The Phase 8 remediation source is merged in PR #31 and its repository checks passed. The last known-good production rollback target is Vercel deployment `6647364838`, source SHA `52393454d3388be7c5a6954996a9eda54e767ed4` ([deployment](https://my-curated-haven-c4g25koj1-pratik-r-nandoskars-projects.vercel.app)); a named staging candidate and its configuration still need to be identified by the release owner. Phase 9 optional measurement may remain off only with the disabled-path isolation evidence and a documented scope decision.

This execution uses one user-requested implementation PR for the available harness and evidence. The suggested PR grouping below remains a planning aid; merging this implementation does not close the staging and approval work that depends on external owners and systems.

## Suggested PR sequence

| PR group | Work | Review focus |
| --- | --- | --- |
| 1. QA foundation | P10-01–P10-03, fixture guards, mandatory-test accounting, CI reliability | Safe targets, no weakening of checks, reproducibility |
| 2. Customer journeys | P10-04–P10-06, free/account/payment E2E | Actual user outcomes, server-backed ownership, recovery |
| 3. Trust boundaries | P10-07–P10-08, races, RLS, cache, legacy access | Cross-user isolation and money/access correctness |
| 4. Experience and content | P10-09–P10-11, focused UI/performance/content fixes | Supported mobile use, accessibility, truthful offer and complete recipes |
| 5. Measurement and recovery | P10-12–P10-13 | Consent, ledger reconciliation, kill switch and restore |
| 6. Final evidence | P10-14–P10-16 | Current candidate, resolved defects, explicit go/no-go and handoff |

Split demonstrated application fixes from large test additions where this improves review. Keep one regression test per meaningful failure boundary, rather than tests mirroring private helper implementation. Do not rewrite the whole theme or catalog as part of routine QA.

## Evidence layout to create during execution

```text
docs/implementation/phase-10/evidence/<candidate>/
  RELEASE-RECORD.md
  CASE-RESULTS.csv
  DEFECTS.md
  CONTENT-REVIEW.csv
  DEVICE-AND-PRINT-REVIEW.md
  PERFORMANCE.md
  RECOVERY-REHEARSAL.md
  RELEASE-DECISION.md
```

This is a proposed directory layout, not files already created or completed. Keep only sanitised public-safe summaries here. Link restricted artifacts by approved reference when they contain sensitive diagnostics. No credentials, production personal data or paid recipe bodies should be copied into this public repo as test evidence.

## Release record template

```markdown
# Release candidate: <ID>
Status: not run / in progress / no-go / ready for specified staged launch
Scope: <full paid recipe release, or separately approved scope>
Source SHA and build/deployment ID: <values>
Environment and protected URL: <values>
Product DB reference and migration head: <non-secret values>
Runtime, lockfile, CLI and database image: <versions>
Collection release and manifest checksum: <values>
Free recipe IDs and reviewed revisions: <values>
Stripe account/mode/API and price reference: <non-secret values>
Commercial/privacy/refund policy versions: <values>
Flags and analytics contract/provider mode: <values>
Fixture version and execution window: <values>
Owners: <release, engineering, QA, editorial, commerce/support>
Changes since previous candidate: <impact and retest scope>
```

## Case result template

```csv
scenario_id,test_or_manual_record,candidate,environment,actor,device_version,executed_at,status,expected,actual,evidence_ref,defect_id,owner
QA-J01,pending,pending,staging,anonymous,pending,,not_run,pending,pending,,,pending
```

Populate one row for each required scenario/device combination. A case run on three devices needs identifiable results for all three, not one ambiguous pass. Result summaries must state not-run/blocked counts and applicability exclusions.

## Scenario inventory and ownership

| Family | IDs | Count | Primary owner |
| --- | --- | --- | --- |
| Customer journeys | QA-J01–QA-J24 | 24 | Frontend/auth/commerce QA |
| Payment/security | QA-S01–QA-S24 | 24 | Backend and commerce engineering |
| Mobile/accessibility/print | QA-M01–QA-M12 | 12 | Frontend QA and editorial |
| Performance/SEO/content | QA-P01–QA-P10 | 10 | Frontend and editorial |
| Measurement | QA-A01–QA-A08 | 8 | Analytics engineering |
| Operations/recovery | QA-O01–QA-O08 | 8 | Operations and support |

Total: 86 integrated scenarios, plus existing phase-specific test suites. These IDs are acceptance scenarios, not a claim of 86 automated tests. Split complex scenarios into individual tests where isolation and diagnosis benefit.

## Content review template

```csv
source_uuid,slug,collection_release,content_revision,reviewer,reviewed_at,ingredients_method,yield_time,allergens_diet,storage_notes,image_rights,status,blocking_issue
pending,pending,pending,pending,pending,,pending,pending,pending,pending,pending,not_reviewed,
```

Require review for every launch member and the three free recipes. Keep the approved collection manifest authoritative. Do not add an item to “round up” the marketing count.

## Release decision template

```markdown
# Release decision for <candidate>
Decision: NO-GO until completed
Decision time and release owner: pending
G01–G12: pending, each with owner and evidence reference
Mandatory cases: passed <n>, failed <n>, blocked <n>, not run <n>
Applicability exclusions: <IDs, reasons and approved scope>
Open S0/S1 defects: pending review
Accepted S2/S3 exceptions: <impact, workaround, owner, expiry>
Required CI run and exact tested SHA: pending
Configuration/content parity check: pending
Support owner and coverage: pending
Checkout stop and recovery proof: pending
Phase 11 rollout constraints and handoff: pending
Next action: <named person and concrete action>
```

## Completion checklist

- All P10-01–P10-16 tasks have execution evidence or a documented dependency blocker.
- A final go recommendation requires every hard gate passed, with no mandatory case hidden by a skip.
- Exact source, schema, content, commercial settings and provider configuration match the evidence.
- Real-device, manual accessibility, print and recovery records supplement automation.
- Commercial decisions have explicit owner approval and no placeholder policy is published.
- Phase 11 receives the tested artifact and runbooks. Public launch is not implied by this plan's merge.

If prerequisites remain absent, the honest completion state is “QA harness ready, release blocked by prerequisites”. Do not call the product launch-ready until those dependencies and tests are complete.

## Phase 11 package

Continue with the [staged launch and operations plan](../phase-11/README.md). Its refreshed baseline records later access-hardening fixes, outstanding commerce findings and production operating prerequisites. Payment tests use sandbox/test mode, not staff self-purchases in live mode.
