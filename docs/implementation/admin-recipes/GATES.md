# Gates: Phase 1 admin recipe workspace

OWNS: supabase/migrations/20261005*.sql, supabase/tests/database/1*_admin_*.sql, supabase/test-fixtures/admin-console.sql, my-curated-haven-web/src/**, my-curated-haven-web/tests/**, my-curated-haven-web/scripts/**, my-curated-haven-web/package.json, .github/workflows/web-ci.yml, ops/ADMIN-CONSOLE.md, docs/implementation/admin-recipes/**, docs/superpowers/plans/2026-10-04-admin-recipe-workspace.md

Scope: Complete the approved owner-first multi-admin recipe workspace in three local increments, with independent review; production activation remains a separate release gate.

- [ ] R1: Current database permissions and MFA deny unauthorized requests; legacy inspection survives
  CHECK: npm run test:admin:gate -- access
  EXPECT: ADMIN_GATE_ACCESS_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R2: Confirmed staff assignment, owner protection and immediate revocation work
  CHECK: npm run test:admin:gate -- team
  EXPECT: ADMIN_GATE_TEAM_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R3: Library counts, filters, readiness and dependency failures match fixtures
  CHECK: npm run test:admin:gate -- reads
  EXPECT: ADMIN_GATE_READS_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R4: Private draft edits preserve active public content and rights
  CHECK: npm run test:admin:gate -- revisions
  EXPECT: ADMIN_GATE_REVISIONS_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R5: Concurrent edits and retries produce one valid transition
  CHECK: npm run test:admin:gate -- concurrency
  EXPECT: ADMIN_GATE_CONCURRENCY_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R6: Human decisions bind exactly to current submitted snapshot and issues
  CHECK: npm run test:admin:gate -- review
  EXPECT: ADMIN_GATE_REVIEW_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R7: Publication is atomic and refresh retry never republishes
  CHECK: npm run test:admin:gate -- publication
  EXPECT: ADMIN_GATE_PUBLICATION_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R8: Commercial, sealed and campaign boundaries prevent unsafe corrections
  CHECK: npm run test:admin:gate -- impact
  EXPECT: ADMIN_GATE_IMPACT_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R9: Direct entry and SPA navigation suppress optional admin telemetry
  CHECK: npm run test:admin:gate -- privacy
  EXPECT: ADMIN_GATE_PRIVACY_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R10: Full keyboard workflow and narrow layouts retain recoverable state
  CHECK: npm run test:admin:gate -- workflow
  EXPECT: ADMIN_GATE_WORKFLOW_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R11: Existing customer recipe and campaign access remains correct
  CHECK: npm run test:admin:gate -- regression
  EXPECT: ADMIN_GATE_REGRESSION_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] R12: Required local checks and synthetic migration rehearsal pass
  CHECK: npm run test:admin:gate -- release
  EXPECT: ADMIN_GATE_RELEASE_PASSED
  CWD: my-curated-haven-web
  EVIDENCE: pending

- [ ] OWNER: Owner reviews final screens and confirms workflow fit
  EVIDENCE: pending; final screens not yet implemented

- [ ] REVIEW: Independent whole-branch review has no unresolved critical or important findings
  EVIDENCE: pending

- [ ] DEPLOY: After separately authorized release, deployed SHA, flags, owner bootstrap and authenticated journey verified
  EVIDENCE: pending; deployment not authorized in implementation scope
