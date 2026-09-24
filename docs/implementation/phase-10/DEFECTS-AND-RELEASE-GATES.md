# Defects and release gates

## Defect severity

| Severity | Definition and examples | Release handling |
| --- | --- | --- |
| S0 critical | Secret/personal-data exposure, cross-user access, wrong charges, lost confirmed ownership, unsafe published content | Stop affected exposure/sales, preserve evidence, fix and retest. No routine waiver |
| S1 major | Core journey blocked on a supported device, auth recovery broken, wrong refund projection, required checks unexecuted, no working rollback | Full paid launch blocked until resolved and verified |
| S2 moderate | Noncritical usability defect with reliable workaround, isolated layout issue, optional dashboard discrepancy while disabled | Named owner, impact, workaround and dated fix. Explicit release-owner acceptance required |
| S3 minor | Cosmetic issue with no material readability, access or comprehension impact | Track with owner, does not alone block launch |

Severity follows customer impact, not ease of fixing. A tiny CSS change can resolve a serious hidden payment button. Missing evidence is a gate gap even if no defect has yet been reproduced.

## Required defect record

Record defect ID, title, linked scenario, severity, candidate/environment, reproducible steps, expected/actual, affected actors and scope, redacted evidence, owner, implementation PR, fixed SHA and retest result. Include a containment action for an active security/payment problem.

On fix, run the failing case plus adjacent boundary tests. After an auth/RLS/cache change, repeat account A/B and anonymous/buyer checks. After ledger/webhook changes, repeat duplicate, out-of-order, recovery and refund/repurchase tests. After palette/layout changes, repeat affected accessibility, phone and print checks. After content changes, reapprove affected recipe revisions and metadata.

Close a defect only after verification on the current candidate. “Merged fix” and “verified fixed” are different states.

## Launch gates

Every gate starts pending. Each row needs an owner, candidate-specific evidence and a decision.

| Gate | Required evidence | Blocking rule |
| --- | --- | --- |
| G01 Scope and commercial truth | Candidate record, approved manifest/price/currency/refund/future-additions/access terms | Any material unresolved promise blocks paid launch |
| G02 Backend and compatibility | Clean migration replay, pgTAP, type drift, legacy path closure, native identity/rights regression | Missing/failed access or migration check blocks |
| G03 Free experience | QA-J01–QA-J08 on supported browser projects | Three complete free recipes, discovery and print must work anonymously |
| G04 Accounts | QA-J09–QA-J14, cross-account tests | Verified identity, recovery and private saves must work for included account scope |
| G05 Payments and ownership | QA-J15–QA-J24 and QA-S01–QA-S12, provider-to-ledger-to-access evidence | Wrong/duplicate charge, lost access, missing payment implementation or unresolved critical race blocks |
| G06 Security and privacy | QA-S13–QA-S24, secrets/payload review, actual direct API checks | Exposure, paid bypass or unproven required boundary blocks |
| G07 Mobile/accessibility/print | QA-M01–QA-M12, required real-device and manual evidence | Broken core path, serious accessibility barrier or incomplete recipe print blocks |
| G08 Content and promises | QA-P08–QA-P10, every launch recipe review row | Unreviewed safety/accuracy concern or false commercial claim blocks |
| G09 Performance and SEO | QA-P01–QA-P07, accepted lab budgets, crawler/metadata proof | Paid-content leak or broken discoverability blocks. Lesser performance exception needs impact and owner approval |
| G10 Measurement | QA-A01–QA-A08 if enabled, disabled-path evidence otherwise | Privacy leak or incorrect authoritative order accounting blocks. Optional analytics/Instagram unavailability alone does not |
| G11 Operational readiness | QA-O01–QA-O08, support owner, kill switch and restore/reconcile rehearsal | Inability to stop unsafe sales or recover ownership blocks |
| G12 Candidate integrity | Required PR checks, final staging smoke, defect register, configuration parity | Stale evidence, unresolved S0/S1, missing mandatory run or source/config drift blocks |

These are product launch gates, separate from repository merge checks. A documentation PR can pass CI while G01–G12 remain pending. A future application PR can merge for development without granting permission to sell publicly.

## Exceptions and scope changes

No routine exception for data exposure, incorrect charging, unverifiable rights, unsupported safety claims or bypassing required repository checks. Fix and retest.

For S2/S3 exceptions, record the exact user impact, supported workaround, owner, expiry/fix date and reason launch remains acceptable. The product owner approves the concrete exception. An engineer should not silently reduce the device matrix, performance target or test coverage after a failure.

Mark not applicable only when the feature is genuinely outside the agreed release scope. Disabled optional analytics is a legitimate case. Unimplemented checkout in a full paid launch is blocked. Free-only launch requires a separate explicit scope decision and updated offer/navigation.

## Decision record

The release lead compiles a recommendation, with gate owners confirming their areas. The product owner accepts the commercial and remaining customer-facing risk. The operations owner confirms support coverage and rollback readiness.

Allowed decisions:

- **No-go:** list failed gates, responsible owners and evidence needed for reevaluation.
- **Go for the specified staged release:** all hard gates pass, accepted minor exceptions recorded, exact candidate/configuration named.

A go recommendation is time-bound to the recorded candidate and settings. Any material change requires an impact review and relevant retest. Phase 11 performs deployment/promotion and post-deployment verification according to its authorised rollout plan.
