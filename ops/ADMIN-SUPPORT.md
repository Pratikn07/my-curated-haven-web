# Admin support operations

Phase 3 adds customer support to the admin console: look up a purchase, explain who has access and why, diagnose against Stripe, and apply owner-approved repairs, exceptional refunds and dispute notices. It is in development. Nothing here is enabled in production, and no section below authorises a production change; each step needs the owner's explicit go-ahead.

Gates: `docs/implementation/admin-support/GATES.md`. Policy: `docs/implementation/admin-support/POLICY-MATRIX.md`.

## Who can do what

- Support staff (the new Support role) can look up purchases, read access explanations, open cases and prepare repairs.
- The owner approves repairs and is the only person who can prepare, approve and submit refunds or approve a dispute notice.
- A registered agent login may apply an exact repair the owner approved within the last 30 minutes. Agents never move money or send email.

## Local verification stack

Run Phase 3 database work against the owned local project `mch-admin-support-test`, never the default stack (54321/54322) or an earlier phase's stack.

- Workdir: `.superpowers/sdd/2026-10-09-admin-support/local` (ignored). Its `supabase/config.toml` is a copy of the repository config with `project_id = "mch-admin-support-test"` and ports 54360–54369 (API 54361, DB 54362). `migrations`, `seed.sql`, `tests` and `test-fixtures` are symlinks to the repository `supabase/` folders.
- Start: `supabase start --workdir .superpowers/sdd/2026-10-09-admin-support/local -x studio,imgproxy,vector,logflare,edge-runtime,realtime,supavisor`
- Replay migrations: `supabase db reset --local --workdir .superpowers/sdd/2026-10-09-admin-support/local`
- Suites (from `my-curated-haven-web/`): `node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-09-admin-support/local [suite.test.sql ...]`; `--all` runs every database suite.
- Read local keys with `supabase status --workdir … -o env` into a file or the shell; never print or commit them.
