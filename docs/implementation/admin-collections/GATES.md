# Gates: Phase 2 admin collections and publishing UI

OWNS: docs/implementation/admin-collections/**, ops/ADMIN-COLLECTIONS.md, my-curated-haven-web/scripts/test-admin-db.mjs, my-curated-haven-web/scripts/admin-collections-*.mjs, my-curated-haven-web/src/lib/admin/collections/**, my-curated-haven-web/src/lib/admin/home/**, my-curated-haven-web/src/lib/collections/**, my-curated-haven-web/src/lib/payments/collection-reservation.ts, my-curated-haven-web/src/lib/admin/recipe-corrections.ts, my-curated-haven-web/src/components/admin/collections/**, my-curated-haven-web/src/components/admin/AdminHome.tsx, my-curated-haven-web/src/components/admin/AdminShell.tsx, my-curated-haven-web/src/app/admin/collections/**, my-curated-haven-web/src/app/admin/page.tsx, my-curated-haven-web/tests/admin/collections-*.test.mjs, my-curated-haven-web/tests/e2e/admin-collections-*.spec.ts, my-curated-haven-web/tests/e2e/admin-home.spec.ts, supabase/migrations/*admin_collections*.sql, supabase/migrations/*collection_*.sql, supabase/migrations/*admin_recipe_corrections*.sql, supabase/migrations/*admin_home_publishing*.sql, supabase/test-fixtures/admin-collections.sql, supabase/tests/database/*admin_collections*.test.sql, supabase/tests/database/*admin_home_publishing*.test.sql

Scope: Implement the approved Phase 2 collection domain and protected UI against merged Phase 1, with publication and release kept behind the plan's coupled safety gates.

Baseline: `origin/main` and this branch started at `2df211aba6d241a1e737510802cfa889660fe755` on 2026-10-08. Phase 1 PR #102 is merged; its local SQL/unit/build/browser evidence is recorded in `docs/implementation/admin-recipes/GATES.md`. Phase 1 owner walkthrough, independent review and authenticated release verification remain open in that ledger. This Phase 2 branch does not close those gates.

Ruling: The owner's current instruction authorises implementation of the written Phase 2 plans. It does not authorise Phase 2 production activation. Keep the publication stage disabled until coupled access, checkout, public reader, approval, UI and owner gates pass.

Handover: On 2026-10-08 the owner stopped the Codex session and handed this branch to Claude Code with its uncommitted runner, runner test and this ledger. Phase 2 backend and UI tasks run together on this branch in the dependency order of both plans.

Ruling: The plan's default selector `^\d+_admin_` would drop `10_recipe_admin_access.test.sql`, which `web-ci.yml` excludes from the plain pgTAP run because its name contains `admin`. The runner default matches `admin` anywhere in the name instead, so CI's two steps still cover every suite. Cost if wrong: an existing access suite stops running in CI without a failure.

Ruling: `parseCollectionQuery` returns `Result<CollectionQuery>`, like Phase 1's `parseLibraryQuery`, so invalid URL filters are rejected rather than silently widened.

Baseline (Task 1, 2026-10-08): owned local stack `mch-admin-collections-test` on 54350–54359 replayed all migrations through `20261007233000`; non-admin pgTAP 10 files / 123 tests PASS; admin runner 9 files / 265 tests PASS (`ADMIN_DATABASE_PASSED`); runner unit tests 3/3 PASS. No pre-existing failures.

Ruling: The plan's `20261007` migration timestamps precede the applied Phase 1 audit migrations through `20261007233000`. Allocate every Phase 2 migration after that timestamp in dependency order; update all references and verification commands before implementation. Cost if wrong: migration replay or production upgrade could execute in the wrong order.

- [ ] A1: Existing collection experience is reconciled against source mappings; inspection and public browser paths preserve intended behavior.
  EVIDENCE: pending; importer discrepancy report, browser regression and owner walkthrough required.
- [ ] A2: Published recipe counts use actual members with explicit availability across empty, small and over twelve member fixtures.
  EVIDENCE: pending; contract, SQL and browser evidence required.
- [ ] A3: Draft preparation is private and cannot alter a public collection before publication.
  EVIDENCE: pending; SQL deny matrix and public projection comparison required.
- [ ] A4: Exact human approval, current membership, MFA, freshness and role separation govern publication.
  EVIDENCE: pending; SQL and browser owner/separated reviewer cases required.
- [ ] A5: Purchased release manifests and protected members survive collection changes.
  EVIDENCE: pending; historical, refunded, sealed, pending and offer fixtures required.
- [ ] A6: Approved additions reach eligible existing buyers without synthetic access grants or a second payment.
  EVIDENCE: pending; app, REST, body and storage parity required.
- [ ] A7: Revocation, expiry and refunds continue to restrict access through uncached personal authority.
  EVIDENCE: pending; source and entitlement matrix required.
- [ ] A8: Checkout uses a frozen offer and release reservation and handles stale or cross-release pending attempts.
  EVIDENCE: pending; checkout, webhook and concurrency fixtures required.
- [ ] A9: Approved recipe corrections reach existing buyers with full archive, exact approval and global tag impact.
  EVIDENCE: pending; cross-collection correction and stale approval tests required.
- [ ] A10: Restricted operator commands preserve the same invariants and separate authoriser from executor.
  EVIDENCE: pending; restricted-principal and attestation tests required.
- [ ] A11: Publication is atomic, idempotent and recoverable without a duplicate publication after refresh failure.
  EVIDENCE: pending; rollback, race, receipt and refresh tests required.
- [ ] A12: Phase 1 prerequisite, Phase 2 owner walkthrough, independent review and authorised release evidence are complete.
  EVIDENCE: pending; Phase 1 owner/release gates remain open. Phase 2 release requires separate authority.
- [ ] U1: Inventory and collection detail show listing, sales, published and draft states independently to authorised staff on desktop and phone.
  EVIDENCE: pending; browser permission and 320px inspection tests required.
- [ ] U2: Editing, preview and impact explain protected members, buyer additions and source failures from protected backend evidence.
  EVIDENCE: pending; editing/review browser and impact SQL tests required.
- [ ] U3: Exact final publication, durable receipts, history and refresh-only recovery work on desktop and phone.
  EVIDENCE: pending; publication, access and keyboard/zoom browser tests required.
- [ ] U4: Publishing Home uses real independent recipe and collection attention feeds and safe recent receipts.
  EVIDENCE: pending; SQL and browser feed-failure/permission tests required.
