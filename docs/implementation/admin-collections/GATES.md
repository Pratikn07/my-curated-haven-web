# Gates: Phase 2 admin collections and publishing UI

OWNS: docs/implementation/admin-collections/**, ops/ADMIN-COLLECTIONS.md, my-curated-haven-web/scripts/test-admin-db.mjs, my-curated-haven-web/scripts/admin-collections-*.mjs, my-curated-haven-web/src/lib/admin/collections/**, my-curated-haven-web/src/lib/admin/home/**, my-curated-haven-web/src/lib/collections/**, my-curated-haven-web/src/lib/payments/collection-reservation.ts, my-curated-haven-web/src/lib/admin/recipe-corrections.ts, my-curated-haven-web/src/components/admin/collections/**, my-curated-haven-web/src/components/admin/AdminHome.tsx, my-curated-haven-web/src/components/admin/AdminShell.tsx, my-curated-haven-web/src/app/admin/collections/**, my-curated-haven-web/src/app/admin/page.tsx, my-curated-haven-web/tests/admin/collections-*.test.mjs, my-curated-haven-web/tests/e2e/admin-collections-*.spec.ts, my-curated-haven-web/tests/e2e/admin-home.spec.ts, supabase/migrations/*admin_collections*.sql, supabase/migrations/*collection_*.sql, supabase/migrations/*admin_recipe_corrections*.sql, supabase/migrations/*admin_home_publishing*.sql, supabase/test-fixtures/admin-collections.sql, supabase/tests/database/*admin_collections*.test.sql, supabase/tests/database/*admin_home_publishing*.test.sql

Scope: Implement the approved Phase 2 collection domain and protected UI against merged Phase 1, with publication and release kept behind the plan's coupled safety gates.

Baseline: `origin/main` and this branch started at `2df211aba6d241a1e737510802cfa889660fe755` on 2026-10-08. Phase 1 PR #102 is merged; its local SQL/unit/build/browser evidence is recorded in `docs/implementation/admin-recipes/GATES.md`. Phase 1 owner walkthrough, independent review and authenticated release verification remain open in that ledger. This Phase 2 branch does not close those gates.

Ruling: The owner's current instruction authorises implementation of the written Phase 2 plans. It does not authorise Phase 2 production activation. Keep the publication stage disabled until coupled access, checkout, public reader, approval, UI and owner gates pass.

Handover: On 2026-10-08 the owner stopped the Codex session and handed this branch to Claude Code with its uncommitted runner, runner test and this ledger. Phase 2 backend and UI tasks run together on this branch in the dependency order of both plans.

Ruling: The plan's default selector `^\d+_admin_` would drop `10_recipe_admin_access.test.sql`, which `web-ci.yml` excludes from the plain pgTAP run because its name contains `admin`. The runner default matches `admin` anywhere in the name instead, so CI's two steps still cover every suite. Cost if wrong: an existing access suite stops running in CI without a failure.

Ruling: `parseCollectionQuery` returns `Result<CollectionQuery>`, like Phase 1's `parseLibraryQuery`, so invalid URL filters are rejected rather than silently widened.

Baseline (Task 1, 2026-10-08): owned local stack `mch-admin-collections-test` on 54350–54359 replayed all migrations through `20261007233000`; non-admin pgTAP 10 files / 123 tests PASS; admin runner 9 files / 265 tests PASS (`ADMIN_DATABASE_PASSED`); runner unit tests 3/3 PASS. No pre-existing failures.

Progress (Task 3, 2026-10-08): migrations `20261008000100_admin_collections_schema.sql` and `20261008000200_admin_collections_reads.sql` add private collection tables, `collection.*` role permissions, a collection stage that starts `disabled`, the listed-only public projection and four authenticated reads. `17_admin_collections_access.test.sql` 33/33 PASS: aal1/anon/customer/revoked-staff denial, both stage switches, all five roles read, independent published/draft/commerce states, known zero buyers, protected purchased members, bounded history paging, no draft columns in the public projection, immutable history and current-publication series uniqueness. Full regression on a clean replay: non-admin 123/123, admin 298/298. Real RPC output decodes with `decodeCollectionDetail`/`decodeCollectionLibrary`. Readiness in the detail read is a not-ready placeholder until Task 8; impact `affectedCampaignSlugs` is empty until Task 8 and buyer counts do not yet separate test-mode entitlements (Task 8/10).

Progress (Task 4, 2026-10-08): `catalog-import.ts` + `scripts/admin-collections-import.mjs` (dry run by default; `--apply-private` needs a reviewed report whose digest still matches, the active owner as authoriser and a reason). Unit tests 12/12 (all 20 identities, reuse of DB identities, empty collection, missing/unreviewed recipes, duplicate slug, changed source, all tag categories kept, sold-membership mismatch blocks without union, unknown access policy, incomplete order snapshot, unverified cover, no order identifiers in the report, placeholder prices kept out of snapshots). Local rehearsal on `mch-admin-collections-test`: seed-only dry run → 20 candidates, 19 blocked by 145 `RECIPE_MISSING` (seed has no catalog recipes), all 19 covers verified; with reviewed synthetic catalog rows for every configured slug → 0 blocked, 145 members; stale report and non-owner authoriser refused; apply → 20 imported baselines; fresh dry run + re-apply → 20 unchanged; afterwards public projection rows 0, all sources `legacy`, identities `unlisted`, review decisions 0, entitlements and enabled offers unchanged; imported rows decode through the library and detail reads. Fixed during rehearsal: library rows now show the current publication's listing state instead of the private identity row (`17_…` 34/34; admin 299/299 on clean replay). A1 still needs the production dry-run report reviewed by the owner and browser parity.

Progress (Task 5 + UI Task 1, 2026-10-08): collection library `/admin/collections` and workspace `/admin/collections/[id]` built to the approved record layout (shared `AdminRecordFrame`, new `eyebrow`). Collections navigation needs `collection.read` and a non-disabled collection stage (`admin_console_context` now returns `collectionStage`, migration `20261008000250`). Listing, browsing, sales, publication and private draft are separate labels; buyer impact unavailable is shown as unknown, not zero. Filter URLs are validated and redirected to a canonical form; the back link only returns to the collection list. Detail read now carries identity, sales state, recipe titles, history cursor, authoriser email and checked-at time (`17_…` 39/39; admin 304/304 on clean replay). Unit 60/60. Browser `admin-collections-inspection.spec.ts` 24/24 on a production build (chromium-desktop, chromium-mobile, webkit-mobile): distinct states, filtered list and focus return, no-match/unknown-filter/not-found/external-returnTo, collection stage off hides nav and blocks pages, aal1 sees no data, customer denied and no buyer identity in owner HTML, 320px cards without horizontal scroll, keyboard reach (WebKit uses Option+Tab). Full admin browser regression on the default build 87/87 (Phase 1 63 + collections 24, three projects). Privacy spec 12/12 on the instrumented build, including a new public-to-admin collections case with zero sink requests after admin pages load. Phase 1 fixes found here: `admin-access` navigation case now sets the collection stage explicitly (it previously depended on the stage another spec left behind) and the collections fixture restores the stage it found; `admin.css` used an undefined `--space-5` token in 6 rules (silently 0 spacing on recipe and collection history, list indents and paddings), now `--space-6`. Screenshots of library and workspace at 1280px and 375px reviewed.

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
