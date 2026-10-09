# Gates: Phase 1 admin console UI implementation PR

OWNS: my-curated-haven-web/src/components/admin/**, my-curated-haven-web/src/components/layout/SiteFrame.tsx, my-curated-haven-web/src/components/layout/SiteShell.tsx, my-curated-haven-web/src/app/admin/**, my-curated-haven-web/src/lib/admin/**, my-curated-haven-web/src/styles/admin.css, my-curated-haven-web/src/app/globals.css, my-curated-haven-web/src/app/recipes/[slug]/page.tsx, my-curated-haven-web/src/lib/recipes/format.ts, my-curated-haven-web/src/lib/types/database.ts, my-curated-haven-web/src/proxy.ts, my-curated-haven-web/next.config.ts, my-curated-haven-web/scripts/test-admin-db.mjs, my-curated-haven-web/tests/admin/**, my-curated-haven-web/tests/e2e/admin-*.spec.ts, supabase/migrations/*admin*sql, supabase/tests/database/*admin*sql, ops/ADMIN-CONSOLE.md, docs/implementation/admin-recipes/GATES.md, GATES.md

Scope: Deliver the approved Phase 1 recipe admin UI and close the seven confirmed Phase 1 audit gaps on the integrated database contracts. Create a clearly named UI implementation PR and merge it after required checks pass.

Audit acceptance, reconciled against `docs/superpowers/plans/2026-10-07-admin-phase-one-audit-remediation.md`:

- [x] A1: Campaign-only withdrawal names the promise and requires owner acknowledgement with a fresh impact token. Missing or malformed campaign snapshots block writes. SQL 16 and desktop/WebKit publication cases passed.
- [x] A2: Asset verification loads the saved revision on the server and the database binds bucket, object name, ID, version and digest. Forged object/path and publication checks passed in SQL 14/16; desktop/WebKit valid-image editor flow passed.
- [x] A3: A catalog-only recipe can publish its first body atomically at version 1. SQL 16 passed first insert, injected-fault rollback and receipt replay assertions.
- [x] A4: Owner Team lists current and revoked staff, with reasoned revoke and non-owner denial. Access browser matrix and SQL 11 passed.
- [x] A5: Library and inspection retain URL filters and selected-row return, show readable usage and a narrow layout. Inspection cases passed on desktop, Chromium mobile and WebKit.
- [x] A6: History is bounded and uses a stable timestamp/UUID cursor; SQL 60 covers 27 events, equal timestamps, bad cursor and recipe scoping; browser inspection passes.
- [x] A7: WebKit mobile editor and withdrawal controls retain input through hydration. The final three-project admin matrix passed 72/72 cases on the production build.
- [ ] Owner workflow review: owner sees the final synthetic inspection, editor, preview, review, publication and Team screens before release readiness is claimed.

- [x] G1: The protected admin shell shows only permitted destinations, the active destination, operator and public-site/sign-out exits at desktop and phone widths, without duplicating the public site header or footer.
  CHECK: npm run test:e2e -- tests/e2e/admin-access.spec.ts --project=chromium-desktop --project=chromium-mobile
  EXPECT: passed
  CWD: my-curated-haven-web
  EVIDENCE: admin access cases passed 15/15 on Chromium desktop, Chromium mobile and WebKit mobile after the site-shell correction; assertions confirm one main landmark, an admin skip target and no public navigation or footer.

- [x] G2: Recipe inventory and inspection support filters, selected-row return, readable usage and history, and honest empty/unavailable states.
  CHECK: npm run test:e2e -- tests/e2e/admin-inspection.spec.ts --project=chromium-desktop --project=chromium-mobile
  EXPECT: passed
  CWD: my-curated-haven-web
  EVIDENCE: inspection browser cases passed on all three projects in the final 72-case matrix; pgTAP history cursor suite 60 passed 7 assertions.

- [x] G3: A saved working revision has a private, accessible Preview & changes page that preserves legacy source content and exact review state.
  CHECK: npm run test:e2e -- tests/e2e/admin-editing.spec.ts tests/e2e/admin-review.spec.ts --project=chromium-desktop --project=chromium-mobile
  EXPECT: passed
  CWD: my-curated-haven-web
  EVIDENCE: editing/review browser cases passed on desktop and mobile; focused WebKit reopen and unsaved-leave cases passed; recipe-display unit cases passed.

- [x] G4: Final publication names its exact effect, blocks stale/unknown impact, and recovers a committed receipt without resubmitting the write.
  CHECK: npm run test:e2e -- tests/e2e/admin-publication.spec.ts --project=chromium-desktop --project=webkit-mobile
  EXPECT: passed
  CWD: my-curated-haven-web
  EVIDENCE: desktop and mobile publication flows passed in the final 72-case matrix, including stale campaign impact, committed receipt recovery, public page read and withdrawal; receipt pgTAP suite 59 passed 8 assertions.

- [x] G5: Owner Team presents current staff and reasoned grant/revoke actions; non-owners cannot read or mutate it.
  CHECK: npm run test:e2e -- tests/e2e/admin-access.spec.ts --project=chromium-desktop
  EXPECT: passed
  CWD: my-curated-haven-web
  EVIDENCE: owner lookup, grant, list and revoke passed on desktop/mobile and a focused WebKit rerun; viewer access denial passed in the browser matrix.

- [x] G6: The integrated Phase 1 admin suite, lint, typecheck, build and relevant database checks pass on the current branch.
  EVIDENCE: clean local migration replay through `20261007233000`; admin pgTAP 265/265; admin units 27/27; lint, typecheck and production build passed; the final Chromium desktop, Chromium mobile and WebKit mobile admin browser matrix passed 72/72.

- [ ] G7: A PR titled as UI implementation is pushed, checks pass, and its merged GitHub state is verified.
  EVIDENCE: pending. This UI branch is stacked on PR #99, which remains open and conflicts with main; merging the UI PR into its base does not mean the admin console is on main.

Ruling: The UI PR is scoped to Phase 1 because Phases 2–4 have approved UI plans but their domain operations are not yet implemented. Production activation and runtime verification are separate release gates.
