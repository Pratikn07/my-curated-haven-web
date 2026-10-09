# Admin support operations

Phase 3 adds customer support to the admin console: look up a purchase, explain who has access and why, diagnose against Stripe, and apply owner-approved repairs, exceptional refunds and dispute notices. It is in development. Nothing here is enabled in production, and no section below authorises a production change; each step needs the owner's explicit go-ahead.

Gates: `docs/implementation/admin-support/GATES.md`. Policy: `docs/implementation/admin-support/POLICY-MATRIX.md`.

## Who can do what

- Support staff (the new Support role) can look up purchases, read access explanations, open cases and prepare repairs.
- The owner approves repairs and is the only person who can prepare, approve and submit refunds or approve a dispute notice.
- A registered agent login may apply an exact repair the owner approved within the last 30 minutes. Agents never move money or send email.

## Cases and notes

Support staff open a case on an order, an account, or both (they must agree). Cases move through open, investigating, waiting on the customer, waiting on the provider and resolved; resolving needs the recorded outcome, and reopening keeps the history. Every change is kept as an event that cannot be edited.

Notes contain personal details, so they stay off until the owner records how long they are kept. Until then a note is refused with `ADM_BLOCKED`, and everything else keeps working. To turn notes on, the owner sets the number of days in the database (owner-approved value only):

```sql
UPDATE private.support_workspace_settings SET note_retention_days = <days>, updated_by = '<owner user id>', updated_at = now(),
 reason = '<why this period>';
```

The owner can redact a note's text (`admin_support_redact_note`); the text is cleared and the reason, time and owner are recorded. Every support read is audited by who read, what kind of read, what was found and the outcome, never by what was searched for.

## Provider checks (diagnosis)

With the support stage at `diagnosis` or later, staff who may inspect provider details (owner, Support) see a "Stripe check" section on each order and can ask Stripe about it. A check only reads Stripe and records the answer as an immutable observation; it changes no payment, access or order. Each person may run 5 checks a minute.

The server reads Stripe and records the answer through its own database login, set in `SUPPORT_VERIFIER_DATABASE_URL`. Without it, checks report "unavailable" and nothing falls back to another connection. A deployed site refuses a local address. Database-owner steps, once per environment:

1. Create the login as a member of the verifier group (the group can only claim checks and record answers):
   `CREATE ROLE mch_support_verifier LOGIN PASSWORD '<generated>' IN ROLE mch_commerce_verifier;`
2. Register it, naming the owner's user id: `SELECT private.commerce_verifier_register('mch_support_verifier', 'Vercel support verifier', '<owner user id>');`
3. Set `SUPPORT_VERIFIER_DATABASE_URL` in Vercel to a pooler URL for that login, then redeploy.
4. To stop checks at once: `SELECT private.commerce_verifier_revoke('mch_support_verifier');` Checks then fail as unavailable and record nothing.

Never set `SUPPORT_PROVIDER_FIXTURE` on a deployment; it is ignored there anyway.

## Local verification stack

Run Phase 3 database work against the owned local project `mch-admin-support-test`, never the default stack (54321/54322) or an earlier phase's stack.

- Workdir: `.superpowers/sdd/2026-10-09-admin-support/local` (ignored). Its `supabase/config.toml` is a copy of the repository config with `project_id = "mch-admin-support-test"` and ports 54360–54369 (API 54361, DB 54362). `migrations`, `seed.sql`, `tests` and `test-fixtures` are symlinks to the repository `supabase/` folders.
- Start: `supabase start --workdir .superpowers/sdd/2026-10-09-admin-support/local -x studio,imgproxy,vector,logflare,edge-runtime,realtime,supavisor`
- Replay migrations: `supabase db reset --local --workdir .superpowers/sdd/2026-10-09-admin-support/local`
- Suites (from `my-curated-haven-web/`): `node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-09-admin-support/local [suite.test.sql ...]`; `--all` runs every database suite.
- Read local keys with `supabase status --workdir … -o env` into a file or the shell; never print or commit them.
- Provider checks in browser tests read the local payment records instead of Stripe: set `SUPPORT_VERIFIER_DATABASE_URL` to the owned stack's database and `SUPPORT_PROVIDER_FIXTURE=local-ledger`. The fixture reader runs only without `VERCEL_ENV` and only for test-mode orders. Specs that need a verifier register the local login and remove it afterwards.
- Run support browser specs with `--workers=1`. They switch the single support stage; two browsers running at once can restore each other's stage and leave it changed (database suite 70 then fails "support starts switched off").
