# Validation and acceptance

All 80 scenarios start **not run**. The matrix specifies future execution, not evidence produced by this planning PR. Record expected and actual results, actor, environment, candidate/config version, execution date, evidence reference and defect for each case.

Planner-specific scenarios apply only if the planner is selected. For another feature, approve an equivalent feature-specific addendum before coding. For hold, mark build cases not applicable with the linked decision. Never call skipped, blocked or not-applicable cases passed.

## Actors and environments

Use anonymous visitor, synthetic nonbuyer A, buyer B, independent user C, enrolled/unenrolled variants, refunded/expired buyer, suspended actor, and owner/admin operator. Include two devices for the same user and separate sessions for different users. Use sandbox payments and synthetic data in local/staging. Manual hosted checks follow approved release controls.

## Evidence and research

| ID | Scenario | Required result |
| --- | --- | --- |
| EX-E01 | Compare source, deployment and historical evidence | Each status names its actual environment and date |
| EX-E02 | Phase 11 closure absent | Customer pilot stays blocked, research-only work is labelled |
| EX-E03 | Read launch metrics with missing periods | Missing values show unavailable, never zero |
| EX-E04 | Analyse consented usage beside all-order totals | Separate denominators and coverage are visible |
| EX-E05 | Review an immature return cohort | Exclude from mature denominator and state count |
| EX-E06 | Compare Instagram engagement and purchases | No follower-to-purchase conversion claim without a valid link/denominator |
| EX-E07 | Recruit and record an adult participant | Channel permission and recording consent are separate |
| EX-E08 | Participant volunteers child/health details | Notes and repo summary omit unnecessary sensitive details |
| EX-E09 | Synthesise conflicting interviews | Negative evidence and sample composition remain visible |
| EX-E10 | Evidence is sparse or no recurring problem found | Hold/research decision, no fabricated demand |

## Selection and reuse

| ID | Scenario | Required result |
| --- | --- | --- |
| EX-S01 | Existing native feature available | Reuse assessment includes contract/security, not automatic port |
| EX-S02 | Search for existing planner data | New schema proposed only after gap documented |
| EX-S03 | Candidate score lacks evidence | Mark unknown and block final recommendation |
| EX-S04 | High-scoring feature has an access/privacy blocker | Hard filter overrides score |
| EX-S05 | Existing recipe improvement solves the problem | Compare improvement explicitly before expansion |
| EX-S06 | Planner selected | Charter defines one recipe/day, exclusions and conditional spec version |
| EX-S07 | Resources/other branch selected | Feature-specific acceptance addendum replaces planner assumptions |
| EX-S08 | Scope request adds AI, child profile or sharing | New decision and review, no silent scope growth |
| EX-S09 | Prototype reveals poor task completion | Revise/retest or hold before building persistence |
| EX-S10 | Hold or retirement chosen | Named review/data owner and honest task status |

## Data and security

| ID | Scenario | Required result |
| --- | --- | --- |
| EX-D01 | Compare local/hosted schema and migration consumers | Explicit project map and one migration authority |
| EX-D02 | Anonymous calls private route/API/RPC | No private records, no mutation and no metadata leak |
| EX-D03 | User A requests B's plan or entry | Denial on page, server action, REST/RPC and export |
| EX-D04 | Submit forged owner or move an entry to B's plan | Ownership invariant enforced without writes |
| EX-D05 | Bypass server UI through exposed table/view/function | Equivalent RLS/privilege boundary, no broader access |
| EX-D06 | Change user metadata/local flag or use stale eligibility | No grant of pilot or recipe rights |
| EX-D07 | Delete a week with entries | Atomic owner-only deletion, no other account impact |
| EX-D08 | Export data after recipe access is lost | Only owner records, unavailable marker without protected content |
| EX-D09 | Close/suspend account while old token exists | Behaviour matches promised termination timing across exposed interfaces |
| EX-D10 | Restore backup containing deleted planner records | Deletion replay before access, recovery action recorded |

## Planner behaviour and concurrency

| ID | Scenario | Required result |
| --- | --- | --- |
| EX-P01 | Open a new week, assign recipe, reload | Persisted expected date/recipe for the correct owner |
| EX-P02 | Concurrently create the same owner/week | One plan, consistent response, no orphan entries |
| EX-P03 | Repeat assignment request after a timeout | Same logical result, no duplicate entry or misleading success |
| EX-P04 | Reuse request UUID with different payload | Conflict with no second mutation |
| EX-P05 | Two devices edit from the same version | One commit, second conflict, no silent overwrite |
| EX-P06 | Invalid week/day, oversized input or quota breach | Bounded validation error and no partial write |
| EX-P07 | Week crosses DST, leap day or calendar year | Stable calendar dates and correct seven-day range |
| EX-P08 | Database unavailable during load/save | Explicit retryable failure, not empty/saved state |
| EX-P09 | Recipe revoked or withdrawn between selection and reload | No body exposure, owner replace/remove works |
| EX-P10 | Remove/delete twice or reference inaccessible IDs | Consistent owner-safe outcome, no existence leak |

## Mobile, accessibility and print

| ID | Scenario | Required result |
| --- | --- | --- |
| EX-U01 | Render 320/390/768/1280 widths and long titles | No horizontal overflow or hidden actions |
| EX-U02 | Use keyboard through picker and week controls | Logical order, visible focus and restored focus |
| EX-U03 | Use VoiceOver/screen reader | Labels, state announcements and day context understandable |
| EX-U04 | Zoom/text resize and on-screen keyboard | Content/actions remain reachable |
| EX-U05 | Reduced motion and loading states | No required animation or disappearing content |
| EX-U06 | Test real iPhone Safari and Android Chrome | Core task complete with recorded browser/device versions |
| EX-U07 | Test Instagram in-app entry and auth return | Valid session/return path or clear verified fallback |
| EX-U08 | Print A4 and US Letter | Readable dates/titles, no clipping or account/child details |
| EX-U09 | Private response appears in cache/metadata/prefetch inspection | No cross-user content or public caching |
| EX-U10 | Compare recipe-route performance and palette states | Approved budgets and rendered contrast pass |

## Commercial and compatibility

| ID | Scenario | Required result |
| --- | --- | --- |
| EX-C01 | Anonymous reads all three free recipes | Complete read/print remains available |
| EX-C02 | Buyer without pilot enrolment opens collection | Existing valid purchase access unchanged |
| EX-C03 | Enrolled nonbuyer uses picker | Only currently free accessible choices |
| EX-C04 | Enrolled buyer loses one purchase source | No content from revoked source unless another valid grant applies |
| EX-C05 | User holds independent native/other valid right | Approved compatibility preserves the independent right |
| EX-C06 | Native old client signs in and saves recipes | Supported identity and bookmark behaviour preserved |
| EX-C07 | Switch accounts on a shared browser | No previous account's plan or saved state remains visible |
| EX-C08 | Inspect original checkout, receipt and collection copy | No added parenting/AI/subscription promise |
| EX-C09 | Pilot expires or is retired | Recipe entitlements unchanged, wind-down controls available |
| EX-C10 | Test payment-related regression | Sandbox only, required Phase 8/10 evidence valid before exposure |

## Measurement and decisions

| ID | Scenario | Required result |
| --- | --- | --- |
| EX-M01 | User declines analytics | Feature works, no optional behavioural tracking |
| EX-M02 | User revokes prior consent | Later optional events stop under Phase 9 contract |
| EX-M03 | Add child ID, plan date, note or unknown event field | Sanitizer rejects disallowed payload |
| EX-M04 | Duplicate mutation/analytics retry | Operational and primary behavioural counts deduplicate as specified |
| EX-M05 | Failed write emits event | No successful-write event before commit |
| EX-M06 | Analytics provider fails | Feature remains usable, bounded isolated error handling |
| EX-M07 | Known synthetic cohort computes activation/return | Expected raw counts and maturity rules match |
| EX-M08 | Decision floor or consent coverage insufficient | Inconclusive/extend/hold, no invented retention rate |
| EX-M09 | Unknown campaign or stale Instagram snapshot | Unknown/stale label, no guessed attribution |
| EX-M10 | Final review after thresholds are registered | Original thresholds retained, changes versioned with limitations |

## Operations and lifecycle

| ID | Scenario | Required result |
| --- | --- | --- |
| EX-O01 | Missing flag or nonlocal fixture override | Pilot fails closed |
| EX-O02 | Direct endpoint call after pilot eligibility revoked | Current server/data boundary denies as specified |
| EX-O03 | Stop new enrolment or switch read-only | Correct operation matrix, no recipe/commerce interruption |
| EX-O04 | Release candidate changes after QA | Affected evidence invalidated and retested before promotion |
| EX-O05 | Expand beyond first five participants | Recorded stage approval and cohort ceiling enforced |
| EX-O06 | Simulate cross-user/data-loss incident | Emergency stop, evidence preservation and named response |
| EX-O07 | Roll back feature deployment | Prior safe recipe app works, payment fixes/data preserved |
| EX-O08 | Recover one corrupted plan | Isolated recovery, no overwrite of newer commerce or other owners |
| EX-O09 | Pilot end reaches approved retention deadline | Notice/window honoured, cleanup counts and owner recorded |
| EX-O10 | Close phase after continue/revise/retire/hold | Outcome evidence, support/data ownership and next scope explicit |

## Acceptance gates

| Gate | Requirement | Evidence |
| --- | --- | --- |
| X-G01 | Baseline trustworthy and customer exposure prerequisites satisfied | Phase 10/11 records, refreshed defects, environment map |
| X-G02 | Problem, scope and pilot terms approved | Research synthesis, scorecard, charter or hold decision |
| X-G03 | Data, identity and rights safe | DB allow/deny, constraints, concurrency, lifecycle and compatibility results |
| X-G04 | Product usable and regression-safe | Mobile/manual print, accessibility, browser, performance and recipe regression results |
| X-G05 | Measurement and operations ready | Event contract, known-answer report, flags, incident/rollback rehearsal and support owners |
| X-G06 | Evidence supports an explicit outcome | Mature cohort review or recorded limits, costs, customer feedback and closure |

For a decision-only closure, X-G01 covers accurate baseline status rather than asserting launch readiness. X-G02 and X-G06 require the hold/research decision. X-G03–X-G05 are not applicable when no feature is built or exposed, with the rationale recorded. No customer pilot is allowed through this exception.

## Verification execution

Run repository CI unchanged. For implementation, use targeted unit/integration tests for validation, version conflicts and sanitization, pgTAP for privileges/ownership, and Playwright for integrated browser journeys. Real-device, screen-reader and paper/PDF print checks remain manual where automation does not represent the user environment.

Use a case register with `scenario_id,candidate,environment,actor,executed_at,status,expected,actual,evidence_ref,defect,owner`. Status is one of not_run, passed, failed, blocked or not_applicable. No secrets, private user IDs or raw research data in public evidence.
