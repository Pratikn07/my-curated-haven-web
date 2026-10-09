# Admin collections operations

Phase 2 adds private collection drafts, human review and publication to the admin console. It shares the console's `private.admin_memberships`, `aal2` requirement and `ADMIN_CONSOLE_ENABLED` server flag. Collections also have their own database stage in `collection_workspace_settings`: `disabled`, `inspection`, `editing`, `publication`. It starts `disabled`. An action needs the server flag, the console stage and the collection stage to all permit it.

Publication stays disabled until every coupled gate in `docs/implementation/admin-collections/GATES.md` passes: buyer access (A5–A7), checkout reservation (A8), atomic publication (A11), public reader cutover and the owner walkthrough (A12). Enabling it with the old release-only reader or slug-only checkout is unsafe.

Sections below are filled in by the tasks that own them: catalog import (Task 4), source cutover (Task 13), refresh recovery (Task 14), operator SQL (Task 16) and the gated release steps (Task 18).

## Local verification stack

Run Phase 2 database work against the owned local project `mch-admin-collections-test`, never the default stack (54321/54322) or the Phase 1 stack (54340–54349).

- Workdir: `.superpowers/sdd/2026-10-07-admin-collections/local` (ignored). Its `supabase/config.toml` is a copy of the repository config with `project_id = "mch-admin-collections-test"` and ports 54350–54359 (API 54351, DB 54352). `migrations`, `seed.sql`, `tests` and `test-fixtures` are symlinks to the repository `supabase/` folders.
- Start: `supabase start --workdir .superpowers/sdd/2026-10-07-admin-collections/local -x studio,imgproxy,vector,logflare,edge-runtime,realtime,supavisor`
- Replay migrations: `supabase db reset --local --workdir .superpowers/sdd/2026-10-07-admin-collections/local`
- Admin suites (from `my-curated-haven-web/`): `node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-07-admin-collections/local [suite.test.sql ...]`. With no filenames it runs every `*admin*` suite, the same set CI routes to this runner. `--all` runs every database suite.
- Read local keys with `supabase status --workdir … -o env` into the shell; never print or commit them.
