# Admin collections operations

Phase 2 adds private collection drafts, human review and publication to the admin console. It shares the console's `private.admin_memberships`, `aal2` requirement and `ADMIN_CONSOLE_ENABLED` server flag. Collections also have their own database stage in `collection_workspace_settings`: `disabled`, `inspection`, `editing`, `publication`. It starts `disabled`. An action needs the server flag, the console stage and the collection stage to all permit it.

Publication stays disabled until every coupled gate in `docs/implementation/admin-collections/GATES.md` passes: buyer access (A5–A7), checkout reservation (A8), atomic publication (A11), public reader cutover and the owner walkthrough (A12). Enabling it with the old release-only reader or slug-only checkout is unsafe.

Sections below are filled in by the tasks that own them: catalog import (Task 4), source cutover (Task 13), publication and refresh recovery (Task 14), operator SQL (Task 16) and the gated release steps (Task 18).

## Catalog import (Task 4)

`scripts/admin-collections-import.mjs` maps the 20 configured collections (`src/config/collections.ts`) and the reviewed tag data (`docs/implementation/recipe-collections/recipe-tags.json`) to private candidates and checks them against a database. Run it from `my-curated-haven-web/`. It reads the connection string from the environment variable you name; there is no default target, and it prints only the host, port and database.

1. Dry run (the default). Inventory queries run in a `READ ONLY` transaction. The JSON report holds candidates, discrepancies, blocked collections, display-only hints and tag evidence, plus `reportDigest`. It contains no customer or order identifiers.
   `node scripts/admin-collections-import.mjs --db-url-env <ENV_NAME> --out import-report.json`
2. The owner reviews the report. Blockers: `RECIPE_MISSING`, `RECIPE_UNREVIEWED`, `TAGS_MISSING`, `COVER_INVALID`, `COVER_UNVERIFIED`, `COLLECTION_DUPLICATE_SLUG`, `MEMBERSHIP_MISMATCH` (configured members differ from a sold or committed release; never unioned), `ORDER_SNAPSHOT_INCOMPLETE`, `ACCESS_POLICY_UNKNOWN` (buyers of a release with no recorded additions policy). Suggestions: `COLLECTION_IDENTITY_NEW`, `DATABASE_ONLY_COLLECTION`, `TAGS_CHANGED`, `TEST_ACTIVITY`.
3. Private apply, only with the reviewed report and the active console owner as authoriser:
   `node scripts/admin-collections-import.mjs --db-url-env <ENV_NAME> --apply-private --report import-report.json --authoriser <owner-uuid> --reason "<why>"`
   It refuses if the source files or database changed since the report (digest mismatch). In one transaction, for each unblocked collection it creates a missing identity as `unlisted`, records `collection_sources` (mode stays `legacy`, with source SHA and candidate digest), stores a listed collection's current presentation as an `imported` baseline publication with its current-publication pointer, and writes audit and operation rows with executor `catalog-import` and the named human authoriser. Blocked collections are skipped.

Apply never writes `collection_publication_projection`, switches source mode, creates review decisions, enables sales, changes releases, free slots or entitlements. Imported placement notes stay `fit: "unverified"`. Re-applying the same content reports `unchanged`; a collection imported earlier with different content is skipped and must change through a reviewed draft.

## Storefront source (Task 13)

The collection pages, bookcase, series, showroom chapters, sitemap and the recipes-page shelf read collections through `src/lib/collections/publication.ts`. The server setting `COLLECTIONS_SOURCE_BACKEND` chooses the backend:

- `legacy` (default when unset): every collection comes from `src/config/collections.ts`, exactly as before. No collection database read.
- `registry`: each collection follows `private.collection_sources.source_mode`. `legacy` collections are served whole from config; `database` collections only from `public.collection_publication_projection` plus current recipe facts. Display hints that are not part of a publication (showroom chapter flag, placeholder price) still come from config. Unlisted collections leave the shelf but keep their page by link; retired ones leave the storefront, and buyers keep them in their library.

Registry mode never falls back to config when the database read fails; the read throws so a cached page keeps serving its last committed version. Once any collection has a database publication in production, registry-compatible builds are the rollback floor: switching back to `legacy` would show stale configured content for that collection. A commerce lookup failure on a collection page reads "Purchase unavailable right now", never "Opening soon" or a guessed price.

Cutover order: deploy with `registry` while every collection is still `legacy` (pages unchanged), confirm parity, then publish collections one at a time through the admin (each first publication switches that collection to `database` in the same transaction).

## Publication and refresh recovery (Task 14)

Publishing happens on `/admin/collections/<id>/publish` ("Review collection effect"). The page shows the exact revision and digest, the recipe and page changes, buyers today, any buyer group without an additions decision (Give additions or Original only, recorded with the reason), sales and checkout effect, and who is recorded. An owner (publish and review permission) uses "Approve and publish", which records the approval of that exact revision in the same transaction. A publisher without review permission can only use "Publish approved revision" after a reviewer approved it. A stale page returns `ADM_CONFLICT` and publishes nothing.

Each non-imported publication writes a row in `private.collection_refresh_jobs` in its own transaction, with the page paths taken from the publication (`/collections`, the collection page, both series pages, `/collections/test`, `/recipes`, `/sitemap.xml` and the two admin pages). Straight after the commit the server action claims that job (`private.collection_refresh_claim`, 2-minute lease, at most 10 attempts), calls `revalidatePath` for each stored path and finishes it (`private.collection_refresh_finish`). The worker procedures are not granted to `anon` or `authenticated`; only the server's database pool can call them.

If the refresh fails or the server stops after the commit, the publication stays committed and its receipt shows "Refresh pending". Receipts appear under Publications on the workspace and the publish page (`admin_collection_receipts`). "Retry refresh" needs the caller to still hold `collection.publish` in the publication stage (`admin_collection_refresh_allowed`), reuses the stored paths and never calls the publication RPC again. Customer access reads are not cached, so a pending refresh only delays public page content, never what a buyer can open.

To inspect jobs as an operator:

```sql
SELECT operation_id, state, attempts, error_ref, created_at, completed_at
FROM private.collection_refresh_jobs WHERE state <> 'complete' ORDER BY created_at;
```

A job with 10 attempts is no longer claimed; check the cause (`error_ref`) first, then reset `attempts` deliberately before retrying from the workspace. History offers "Copy into new draft" for earlier publications; the copy keeps every recipe buyers own today and goes through review again.

## Local verification stack

Run Phase 2 database work against the owned local project `mch-admin-collections-test`, never the default stack (54321/54322) or the Phase 1 stack (54340–54349).

- Workdir: `.superpowers/sdd/2026-10-07-admin-collections/local` (ignored). Its `supabase/config.toml` is a copy of the repository config with `project_id = "mch-admin-collections-test"` and ports 54350–54359 (API 54351, DB 54352). `migrations`, `seed.sql`, `tests` and `test-fixtures` are symlinks to the repository `supabase/` folders.
- Start: `supabase start --workdir .superpowers/sdd/2026-10-07-admin-collections/local -x studio,imgproxy,vector,logflare,edge-runtime,realtime,supavisor`
- Replay migrations: `supabase db reset --local --workdir .superpowers/sdd/2026-10-07-admin-collections/local`
- Admin suites (from `my-curated-haven-web/`): `node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-07-admin-collections/local [suite.test.sql ...]`. With no filenames it runs every `*admin*` suite, the same set CI routes to this runner. `--all` runs every database suite.
- Read local keys with `supabase status --workdir … -o env` into the shell; never print or commit them.
