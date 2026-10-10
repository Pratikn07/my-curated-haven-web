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

## Payment reconciliation

A verified Stripe answer is applied to an order by one database writer (`private.commerce_reconcile_core`). It records the payment, refunds and disputes Stripe reported, judges the purchase under the order's approved policy, updates that purchase's access and writes the audit event and any confirmation email in one transaction. Other access (app purchases, grants) is never touched. Without an approved policy for the order's versions it records the facts and leaves access as it is ("blocked: policy_missing").

The older payment and refund procedures still serve the live webhook until Task 12 moves it to the shared writer, which needs the v1 policy approved first. They are guarded: a replayed payment success cannot restore a purchase that refunds or a dispute removed, and a refund must belong to its payment's order and currency.

Before applying migration `20261009010600_commerce_reconciliation.sql` to production, run this read-only check. It must return no rows; the migration's new constraints refuse to apply otherwise, and nothing is relinked automatically.

```sql
SELECT 'refund' AS kind, r.provider_refund_id AS provider_id, r.order_id, p.order_id AS payment_order_id
FROM private.payment_refunds r JOIN private.provider_payments p ON p.id = r.payment_id WHERE r.order_id <> p.order_id
UNION ALL
SELECT 'dispute', d.provider_dispute_id, d.order_id, p.order_id
FROM private.payment_disputes d JOIN private.provider_payments p ON p.id = d.payment_id WHERE d.order_id <> p.order_id;
```

## Webhooks and recovery

Every signed Stripe event is stored once per account, mode and event id, with the order it concerns. When the verifier login is registered and the order's policy is approved, the event is claimed under a fence, the order is re-checked with Stripe and the answer goes through the shared writer; the event body only identifies the order. Otherwise the guarded older processing handles the delivery, so purchases keep working while no policy is approved. Revoking the verifier login (above) is the emergency stop for automated reconciliation: webhooks fall back to the older path.

A retryable failure (Stripe unreachable, a check already running, an order not yet known) answers 500 so Stripe delivers again, and the inbox waits 1, 2, 4 … up to 60 minutes between attempts. After 10 attempts an event is set aside (`dead_letter`), as are events whose evidence needs a person.

Recovery, on demand, for one mode at a time. A dry run (the default) prints counts only:

```bash
node scripts/commerce-reconcile.mjs --mode test --limit 10
```

`--apply` re-checks due events and orders left open for 15 minutes, under each order's approved policy; at most 100 per run. It never scans Stripe or creates checkouts, and orders without an approved policy are counted as `policy_missing`. It needs `SUPPORT_VERIFIER_DATABASE_URL` and, to apply, the Stripe key for that mode.

## Agent-run repairs (operator channel)

An agent may apply an approved access repair, never a refund or a dispute notice. It works through its own database login, registered by the database owner with separate rights to record approvals (attest) and to apply them (execute); neither is the verifier login. Operator proposals and approvals last 30 minutes.

Database-owner steps, once per environment:

1. `CREATE ROLE mch_support_agent LOGIN PASSWORD '<generated>' IN ROLE mch_support_operator;`
2. `SELECT private.support_operator_register('mch_support_agent', 'Support agent', '<owner user id>', true, true);` (attest, execute)
3. Give the agent `SUPPORT_OPERATOR_DATABASE_URL` for that login, and `SUPPORT_VERIFIER_DATABASE_URL` for the verifier login, in its own runtime environment only.
4. To stop it at once: `SELECT private.support_operator_revoke('mch_support_agent');`

The agent's sequence (from `my-curated-haven-web/`):

```bash
node scripts/admin-support-operator.mjs --preview --order <order id> --observation <observation id> --kind reconcile_order --reason "<why>" --human <support user id> --operation <new uuid>
```

It shows the order reference, the Stripe mode and account, the digest, expiry and every effect. The agent asks the owner about exactly that preview. When the owner says yes, the agent writes a private approval file (owner-writable only, at most 4 KB) with exactly `proposalId`, `digest`, `humanId` (the owner) and `evidenceReference` (where the answer was given, up to 200 characters, never the transcript), then:

```bash
node scripts/admin-support-operator.mjs --attest-file ./approval.json
```

```bash
node scripts/admin-support-operator.mjs --execute --proposal <proposal id> --operation <new uuid> --mode test --account acct_…
```

`--mode` and `--account` have no default and must match the proposal's order. Execution gets fresh evidence from the verifier; if it differs from what was approved, nothing is applied and a new preview is needed. Repeating the same `--execute` returns the stored receipt.

Trust limitation: the database checks the login, the owner's current authority and the exact proposal, but cannot prove the owner said yes. Each operator approval therefore stores the login that recorded it and the evidence reference, and the operation stores the human and the executing login separately.

## Stages, retention and metrics

The support stage moves only through `admin_support_set_stage(stage, reason, operation)`, called by the owner signed in with MFA. Turning support down (`disabled`, `inspection`) always works. `diagnosis` needs a registered verifier and an observation retention period; `repair` also needs a note retention period and an approved access policy. `admin_support_readiness()` lists what each stage still needs. Retention periods live in `private.support_workspace_settings` (`note_retention_days` 1–3650, `observation_retention_days` 30–3650) and are set by the database owner once the owner has decided them.

Run retention regularly with `admin_support_retention_run(operation)` (owner, any stage). It clears note text past its period (keeping who, when and why, plus a case event) and strips provider ids from provider checks past theirs, keeping amounts, statuses, dates and the evidence digest. Anything a pending proposal, approval or operation relies on is skipped; nothing is deleted. Repeating an operation id returns its first result.

`admin_support_metrics(mode)` gives support readers counts for one mode: waiting provider checks and the oldest one's age, the webhook backlog, orders whose newest check disagrees with their purchase source, why repairs were blocked, repair outcomes and post-checks (last 30 days). It holds no ids, emails, notes or provider data. Support log lines keep only an operation id, a code, a reference and a state.

## Local verification stack

Run Phase 3 database work against the owned local project `mch-admin-support-test`, never the default stack (54321/54322) or an earlier phase's stack.

- Workdir: `.superpowers/sdd/2026-10-09-admin-support/local` (ignored). Its `supabase/config.toml` is a copy of the repository config with `project_id = "mch-admin-support-test"` and ports 54360–54369 (API 54361, DB 54362). `migrations`, `seed.sql`, `tests` and `test-fixtures` are symlinks to the repository `supabase/` folders.
- Start: `supabase start --workdir .superpowers/sdd/2026-10-09-admin-support/local -x studio,imgproxy,vector,logflare,edge-runtime,realtime,supavisor`
- Replay migrations: `supabase db reset --local --workdir .superpowers/sdd/2026-10-09-admin-support/local`
- Suites (from `my-curated-haven-web/`): `node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-09-admin-support/local [suite.test.sql ...]`; `--all` runs every database suite.
- Read local keys with `supabase status --workdir … -o env` into a file or the shell; never print or commit them.
- Provider checks in browser tests read the local payment records instead of Stripe: set `SUPPORT_VERIFIER_DATABASE_URL` to the owned stack's database and `SUPPORT_PROVIDER_FIXTURE=local-ledger`. The fixture reader runs only without `VERCEL_ENV` and only for test-mode orders. Specs that need a verifier register the local login and remove it afterwards.
- Run support browser specs with `--workers=1`. They switch the single support stage; two browsers running at once can restore each other's stage and leave it changed (database suite 70 then fails "support starts switched off").
