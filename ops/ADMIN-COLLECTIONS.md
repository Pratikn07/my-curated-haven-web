# Admin collections operations

Phase 2 adds private collection drafts, human review and publication to the admin console. It shares the console's `private.admin_memberships`, `aal2` requirement and `ADMIN_CONSOLE_ENABLED` server flag. Collections also have their own database stage in `collection_workspace_settings`: `disabled`, `inspection`, `editing`, `publication`. It starts `disabled`. An action needs the server flag, the console stage and the collection stage to all permit it.

Publication stays disabled until every coupled gate in `docs/implementation/admin-collections/GATES.md` passes: buyer access (A5–A7), checkout reservation (A8), atomic publication (A11), public reader cutover and the owner walkthrough (A12). Enabling it with the old release-only reader or slug-only checkout is unsafe.

Sections below are filled in by the tasks that own them: catalog import (Task 4), source cutover (Task 13), publication and refresh recovery (Task 14), recipe corrections and tags (Task 15), operator SQL (Task 16) and the gated release steps (Task 18).

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

## Recipe corrections and tags (Task 15)

A recipe people have bought (sealed release, live offer on sale, pending live checkout or live payment) can only change through a correction. On the recipe's publish page the owner or a publisher sees "Correction to a purchased recipe", the collections it reaches and any private collection draft that will need a new review, ticks the acknowledgement and uses "Publish correction". The database (`admin_recipe_correct`) requires the same recipe identity, an exactly approved revision, the current impact token and a fresh image check; campaign promises still block. It archives the previous complete snapshot with reason, authoriser, executor and affected releases. It never changes collection membership, releases, offers, prices or orders. Emergency withdrawal stays owner-only; a withdrawn recipe comes back through a reviewed correction.

Reviewed tags live in `private.recipe_tag_versions`, one row per recipe content version, with the vocabulary in `private.recipe_tag_categories` and `private.recipe_tag_values` (seeded by migration from `recipe-tags.json`). Until a recipe's tags are imported its snapshot has no tags and nothing changes. After import, tags are edited in the recipe editor from the vocabulary only, reviewed with the rest of the snapshot, and each publication or correction records its version's tags.

Tag import, run from `my-curated-haven-web/` against the named database:

1. Dry run (default): `node scripts/admin-recipe-tags-import.mjs --db-url-env <ENV_NAME> --out tags-report.json`. The report lists each recipe as `import`, `unchanged`, `different` (already has reviewed tags; change it through review), `missing_recipe`, `missing_body` or `invalid`, and names open recipe drafts and collection drafts that include it.
2. The owner reviews the report. Importing changes each imported recipe's active hash: open recipe drafts must rebase and collection drafts must update their recipe references before review. Run the tag import before the collection import where possible.
3. Apply: `node scripts/admin-recipe-tags-import.mjs --db-url-env <ENV_NAME> --apply-private --report tags-report.json --authoriser <owner-uuid> --reason "<why>"`. It refuses a report that no longer matches the source and database, records tags only for current versions without tags, with import provenance, and writes one audit entry per recipe.

## Operator channel (Task 16)

An agent can prepare and publish a collection update, or a recipe correction, through its own database login instead of the browser. It never uses a service-role key and never sets browser identity claims. The database checks three things: the login is a registered operator, the named human holds the authority now, and the proposal is exactly the current one. It does not check that the human really said yes. That is why every attestation records the evidence reference, an optional excerpt (at most 500 characters), the time the question was asked and the operator who recorded it. Browser MFA rules are unchanged.

Registration is a reviewed manual step by the database owner; no migration ever registers a real login:

```sql
CREATE ROLE agent_login LOGIN PASSWORD '<generated, stored in the operator secret store>';
GRANT mch_collection_operator TO agent_login;
SELECT private.collection_operator_register('agent_login', 'Agent label', '<owner user uuid>');
-- To stop it:
SELECT private.collection_operator_revoke('agent_login');
```

`mch_collection_operator` has no login, no table access and execute rights on six procedures only: `collection_operator_prepare`, `collection_operator_preview`, `recipe_operator_preview`, `collection_operator_attest`, `collection_operator_publish` and `recipe_operator_correct`. The operator is the database session user; `SET ROLE` does not change it, so an unregistered or revoked login is refused even inside the group.

Call sequence with `scripts/admin-collections-operator.mjs` (the connection string names the operator login):

1. Optional preparation for a named editor: `private.collection_operator_prepare('{"action":"start"|"save","human_id":…,…}')` uses the same draft cores and validation as the editor. History records the human as `saved_by` and `operator:<login>` as executor.
2. `preview --collection <id> --out proposal.json` (or `preview-recipe --recipe <id>`). It prints readiness, buyer groups without an additions decision and the exact question to ask: "Approve and publish this update to <collection>?"
3. The agent asks the human exactly that question and records where they answered.
4. `attest --proposal proposal.json --human <uuid> --evidence-ref <ref> --proposed-at <time asked> --reason <why> [--evidence-excerpt …] [--approve-now] [--decision release:source:policy …]`. The human must currently hold `collection.publish` (and `collection.review` with `--approve-now`) or `recipe.publish`, and every undecided buyer group needs a decision. Returns the authorisation id, valid for 30 minutes and only for the operator that recorded it.
5. `publish --authorisation <id>` or `correct --authorisation <id>`. The human's authority, the stages and the exact candidate, base and evidence are checked again, then the shared publication or correction core runs. The attestation is consumed with the receipt; repeating the same `--operation` returns that receipt, and a different operation is a conflict.

History keeps the three identities apart: the human authoriser, the operator executor (`operator:<login>`) and the attestation id on the review decision. The operator cannot refresh the public pages; the receipt shows "Refresh pending" until someone with publish access uses Retry refresh in the workspace or the pages revalidate on their hourly schedule.

## Local verification stack

Run Phase 2 database work against the owned local project `mch-admin-collections-test`, never the default stack (54321/54322) or the Phase 1 stack (54340–54349).

- Workdir: `.superpowers/sdd/2026-10-07-admin-collections/local` (ignored). Its `supabase/config.toml` is a copy of the repository config with `project_id = "mch-admin-collections-test"` and ports 54350–54359 (API 54351, DB 54352). `migrations`, `seed.sql`, `tests` and `test-fixtures` are symlinks to the repository `supabase/` folders.
- Start: `supabase start --workdir .superpowers/sdd/2026-10-07-admin-collections/local -x studio,imgproxy,vector,logflare,edge-runtime,realtime,supavisor`
- Replay migrations: `supabase db reset --local --workdir .superpowers/sdd/2026-10-07-admin-collections/local`
- Admin suites (from `my-curated-haven-web/`): `node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-07-admin-collections/local [suite.test.sql ...]`. With no filenames it runs every `*admin*` suite, the same set CI routes to this runner. `--all` runs every database suite.
- Read local keys with `supabase status --workdir … -o env` into the shell; never print or commit them.
