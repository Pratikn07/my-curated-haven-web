# Phase 10 defect register

No new product defect was established by the QA-harness implementation. That is not evidence that the release has no defects: several integrated scenarios, staging/provider checks, privacy review and manual device checks remain unrun or blocked.

The previously documented unsigned-webhook and mock-checkout source gaps were rechecked at `de47ca0` and addressed in merged PR #31. Its repository checks passed. Provider-backed payment, refund/dispute policy, deployed configuration, and full Phase 8/10 matrices still require separate evidence.

## Found in the 2026-09-26 audit

| ID | Severity | Scenario | Found | Fix and retest |
| --- | --- | --- | --- | --- |
| D10-01 | P1 | QA-M09 print | Printed recipes had no title, summary, time or yield; 3 pages each | Print CSS no longer hides the recipe's own header; photo frame 2.2 in. Regression test fails on the old CSS, passes on the fix. Retest real print dialogs after deploy |
| D10-02 | P2 | QA-P01 performance | Home preloaded a below-the-fold recipe image beside the hero | `priority` removed from home recipe cards. Re-measure after deploy |
| D10-03 | P3 | QA-M05 accessibility | `/recipes` skipped from `h1` to `h3` on mobile | Screen-reader `h2` added over the results |

If a CI or manual scenario fails, add its scenario ID, severity, candidate/environment, reproducible steps, redacted evidence, owner, containment, fix PR/SHA and retest result. Do not close a defect on merge alone.
