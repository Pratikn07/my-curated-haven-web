# Gates: Phase 1 admin recipe workspace

OWNS: supabase/migrations/20261005*.sql, supabase/tests/database/1*_admin_*.sql, supabase/test-fixtures/admin-console.sql, my-curated-haven-web/src/**, my-curated-haven-web/tests/**, my-curated-haven-web/scripts/**, my-curated-haven-web/package.json, .github/workflows/web-ci.yml, ops/ADMIN-CONSOLE.md, docs/implementation/admin-recipes/**, docs/superpowers/plans/2026-10-04-admin-recipe-workspace.md

Scope: Complete the approved owner-first multi-admin recipe workspace in three local increments, with independent review; production activation remains a separate release gate.

- [x] R1: Current database permissions and MFA deny unauthorized requests; legacy inspection survives
  CHECK: npm run test:admin:gate -- access
  EXPECT: ADMIN_GATE_ACCESS_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: DB 11 (43) + 10 (21) PASS with real Auth JWTs verified out-of-band (aal1→aal2 via TOTP, ADM_MFA_REQUIRED/ADM_DENIED/ADM_OWNER_PROTECTED observed); browser access spec 4/4 on chromium-desktop --workers=1 (signed-out 307+returnTo+noindex, aal1 MFA wall, owner assign, viewer guard)

- [x] R2: Confirmed staff assignment, owner protection and immediate revocation work
  CHECK: npm run test:admin:gate -- team
  EXPECT: ADMIN_GATE_TEAM_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: DB assign/revoke/replay + owner-protect PASS (audit assertion hardened to baseline-relative); browser owner lookup→assign→revoke flow passes with real users; stale-session revocation covered in DB matrix

- [x] R3: Library counts, filters, readiness and dependency failures match fixtures
  CHECK: npm run test:admin:gate -- reads
  EXPECT: ADMIN_GATE_READS_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: DB 12 (26: literal %/_/unicode/UUID, 25+2 pagination, views, usage) PASS; admin units 9/9; browser library→detail→back with query+focus passes on chromium-desktop --workers=1

- [x] R4: Private draft edits preserve active public content and rights
  CHECK: npm run test:admin:gate -- revisions
  EXPECT: ADMIN_GATE_REVISIONS_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: DB 13 (37) + 14 (11) PASS; browser save/reload keeps working revision with byte-identical active catalog/body/alt (image metadata too); editor validation, read-only identity, compare/merge, rebase, real-object image select + availability check covered in Task 8/9 suites

- [x] R5: Concurrent edits and retries produce one valid transition
  CHECK: npm run test:admin:gate -- concurrency
  EXPECT: ADMIN_GATE_CONCURRENCY_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: two-connection lock-barrier races on the owned stack (chromium-desktop --workers=1): simultaneous starts serialize to one head (loser provably blocked, then shares the head); simultaneous saves admit one v2 winner and one 40001/ADM_CONFLICT loser with final working_version=2 and 2 revisions

- [x] R6: Human decisions bind exactly to current submitted snapshot and issues
  CHECK: npm run test:admin:gate -- review
  EXPECT: ADMIN_GATE_REVIEW_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: DB 15 (32: invalid submits, stale/conflict/double decisions, role separation, no-change, invalidation, resubmission, legacy isolation) PASS; browser editor→reviewer→approve with issue resolution + viewer observation on desktop and mobile, reopen acknowledgement; decisions carry real actor + exact digest

- [x] R7: Publication is atomic and refresh retry never republishes
  CHECK: npm run test:admin:gate -- publication
  EXPECT: ADMIN_GATE_PUBLICATION_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: DB 16 (75 after audit remediation: exact publish, first-body version 1, injected-fault rollback, receipt replay, image identity, stale campaign impact, ordinary and emergency withdrawal) passed after clean local migration replay. Desktop and WebKit publication browser flows passed, including public read and named campaign-only owner acknowledgement.

- [x] R8: Commercial, sealed and campaign boundaries prevent unsafe corrections
  CHECK: npm run test:admin:gate -- impact
  EXPECT: ADMIN_GATE_IMPACT_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: SQL 16 proves campaign-only withdrawal needs owner acknowledgement, a changed campaign revision rejects the old token, and missing or malformed snapshots block impact and writes. The database recomputes usage and token under locks. Desktop and WebKit screens name the campaign, block a stale page and require acknowledgement.

- [x] R9: Direct entry and SPA navigation suppress optional admin telemetry
  CHECK: npm run test:admin:gate -- privacy
  EXPECT: ADMIN_GATE_PRIVACY_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: privacy units 2/2; installed posthog-js 1.434.15 against intercepted loopback sink — public positive control captures, direct admin entry leaks no admin identifiers, signed-in admin navigation sends zero requests; client/trackers/Provider all gate admin; proxy private/no-store + noindex verified

- [ ] R10: Full keyboard workflow and narrow layouts retain recoverable state
  CHECK: npm run test:admin:gate -- workflow
  EXPECT: ADMIN_GATE_WORKFLOW_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: narrow-layout admin access, editing, inspection and publication cases passed in the final 72/72 Chromium desktop, Chromium mobile and WebKit mobile matrix on a production build. The owner review of final synthetic screens remains unmet, so this gate stays open.

- [x] R11: Existing customer recipe and campaign access remains correct
  CHECK: npm run test:admin:gate -- regression
  EXPECT: ADMIN_GATE_REGRESSION_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: legacy pgTAP 01-09 (123) PASS + admin pgTAP 10-16 (219) PASS on clean `supabase db reset`; full desktop browser suite 156 passed with every failure explained and re-verified green in its required profile — instrumented build: admin set green (access/editing/inspection 8, concurrency 2, publication 1, review 2, privacy 3) plus readers (saved-recipe-access + data-access 15 passed/1 skipped; public-site + saved-recipes 24 passed/1 skipped/4 conditional did-not-run); default build: analytics 3, public-site deferred-text, stories scroll/analytics 2, OTP specs 2 (saved-recipes, commerce) all pass, and publication + review pass 3/3 on chromium-mobile. The 8 full-suite failures on a single profile are environmental, not branch regressions: analytics/public-site/stories-analytics assume the default build, OTP specs need mailpit on 54324 (relayed locally when multi-stack), and the branch diff touches no stories/campaigns/analytics/mail code. Anonymous reads return only promised free-slot recipes; entitled/non-entitled, legacy inspection, staff-no-purchase, save/print/canonical and campaign counts stable.

- [x] R12: Required local checks and synthetic migration rehearsal pass
  CHECK: npm run test:admin:gate -- release
  EXPECT: ADMIN_GATE_RELEASE_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: local subgate met at the original Phase 1 head. On the UI/audit branch, a clean reset replayed all forward migrations through `20261007233000`; admin pgTAP 265/265, admin units 27/27, lint, typecheck, production build and the final three-project admin browser matrix 72/72 passed. Committed/deployed/external subgates remain open; see ops/ADMIN-CONSOLE.md.

- [ ] OWNER: Owner reviews final screens and confirms workflow fit
  EVIDENCE: unmet; remaining action: owner walks the inspection/edit/review/publication screens on synthetic data and confirms fit (closes R10).

- [ ] REVIEW: Independent whole-branch review has no unresolved critical or important findings
  EVIDENCE: unmet; remaining action: independent review of branch `codex/admin-recipe-workspace-design` requested with this package.

- [ ] DEPLOY: After separately authorized release, deployed SHA, flags, owner bootstrap and authenticated journey verified
  EVIDENCE: unmet; deployment not authorized in implementation scope.
