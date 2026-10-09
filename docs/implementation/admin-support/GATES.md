# Gates: Phase 3 customer support

OWNS: the Phase 3 acceptance ledger (A1–A20 from the design, section 13) and the UI plan's support gates. Plans: [domain](../../superpowers/plans/2026-10-07-admin-customer-support-phase-three.md), [UI](../../superpowers/plans/2026-10-07-admin-console-phase-three-ui.md). Policy decisions: [POLICY-MATRIX.md](POLICY-MATRIX.md). Runbook: [ops/ADMIN-SUPPORT.md](../../../ops/ADMIN-SUPPORT.md).

## Baseline (2026-10-09)

- Branch `codex/admin-support-phase-three` from `origin/main` at `aafab9b` ("[Phase 2] Admin collections and publishing UI (#104)"), which contains Phase 1, its audit fixes and Phase 2.
- Production database: every migration on `main` applied on 2026-10-09 (68 of 68, latest `20261008001300`), after a backup. Collection stage `disabled`; no collection rows yet.
- Still open from earlier phases (they gate release, not development): Phase 1 owner walkthrough, independent review and release check; Phase 2 gates A1–A12 and U1–U4; production `COMMERCE_DATABASE_URL` (approved, set by the owner); the catalog and tag imports.
- Owned local stack: `mch-admin-support-test`, ports 54360–54369 (API 54361, DB 54362), workdir `.superpowers/sdd/2026-10-09-admin-support/local` (ignored). Never the default stack (54321/54322) or an earlier phase's stack.

## Owner decisions (2026-10-09, in chat)

- **Go-ahead to build Phase 3** while the earlier phases' release gates stay open. Development only; nothing is enabled in production.
- **A new Support role.** Customer purchase and access details are visible only to staff given the Support role, and to the owner. Existing recipe and collection roles see no customer data. Refund preparation, approval and submission stay owner-only.
- **No repurchase while a dispute hold is open.** A buyer whose purchase source is held by an open formal dispute cannot buy the same collection again until it is resolved; the page tells them access is on hold and to contact support.
- **Agents may run approved access repairs**, through the Phase 2 operator pattern: the agent asks the exact question, records the answer, and applies only that repair. Refunds and dispute emails are never agent-executed.
- **Agent repair approvals last 30 minutes**, matching the collection operator. Refund approvals keep the plan's 5 minutes.

## Plan corrections (from the reconciliation against `aafab9b`)

The plans were written before Phase 1's audit fixes and Phase 2 existed in code. These corrections apply to every task; each task records any further change in its progress entry.

**Migrations.** Every proposed `20261007*` timestamp sorts before the applied `20261008001300`. Keep each time part and use date `20261009`, which preserves the plan's order:

| Plan | Now |
| --- | --- |
| `20261007010100_admin_support_schema` … `20261007011600_support_dispute_notices` | `20261009010100` … `20261009011600` (same suffixes) |
| Task 5 additive follow-up, if needed | `20261009010250` |
| UI `20261007220000_admin_home_support_results` | `20261009220000` |

**SQL suites.** Plan suites 26–39 collide with Phase 2 (26–28). Domain suites move to a contiguous block: 26→70, 27→71, 28→72, 29→73, 30→74, 31→75, 32→76, 33→77, 34→78, 35→79, 36→80, 37→81, 38→82, 39→83. The UI keeps 57.

**Conventions carried over from Phase 1 and 2.**
- Conflicts use SQLSTATE `PT409`, never `40001`: PostgREST retries `40001` in a loop (`20261008000310_admin_conflict_not_retryable.sql`). Plan Tasks 13–15 tests change accordingly, and new codes such as `ADM_STALE` join `AdminCode` and `KNOWN_CODES`.
- Every writer sets `lock_timeout` 5 s, through its authority check or `ALTER FUNCTION … SET lock_timeout`, so suite 27's bounded-writer check keeps passing.
- Admin commands are server actions (`"use server"`), as in Phase 1 and 2, not `/api/admin/support/*` route handlers. Same-origin protection comes from Next.js server actions.
- Authority: the role-to-permission map in `private.admin_permissions` gains a `support` role and `support.*` permissions; a `support_workspace_settings` stage table and `private.support_assert` follow `collection_assert`. There is no separate `console_enabled` switch.
- Navigation lives in `src/lib/admin/navigation.ts` (not `AdminShell.tsx`); `/admin` must land support-only staff on Support, not on a denied recipes page.
- The agent channel reuses the Phase 2 pattern (a NOLOGIN group, a registry keyed by `session_user`, owner registration and revocation, one-use attestations with evidence reference, `operator:<login>` executor) instead of four new logins.
- Purchase holds (formal disputes) are stored separately from `access_sources.is_eligible`, so a hold does not lift Phase 2's protection of recipes delivered as additions (`collection_protected_members`).
- The current payment writer is `private.record_payment_and_grant_access` in `20261008000600_collection_checkout_reservation.sql`, not the September guard migration.
- Support never writes Phase 2's `collection_access_policies`; buyer-group decisions stay with collection publication.

## Acceptance (A1–A20)

Each gate needs the evidence named in the design, section 13. Unchecked means not yet evidenced.

- [ ] A1 — Scope and integration. Progress: baseline integrated (`aafab9b`), runner and ledger established (Task 1).
- [ ] A2 — Authority and privacy.
- [ ] A3 — Exact identity.
- [ ] A4 — Historical truth.
- [ ] A5 — Access explanation.
- [ ] A6 — Financial binding.
- [ ] A7 — Verified missing fulfilment.
- [ ] A8 — Projection repair.
- [ ] A9 — Refund and dispute lifecycle.
- [ ] A10 — Multiple sources.
- [ ] A11 — Approval integrity.
- [ ] A12 — Concurrency and replay.
- [ ] A13 — Atomicity and recovery.
- [ ] A14 — Agent parity.
- [ ] A15 — Workflow and rollout.
- [ ] A16 — Refund authority and exact amount.
- [ ] A17 — Refund concurrency and replay.
- [ ] A18 — Refund uncertainty and durable recovery.
- [ ] A19 — Refund outcome and release.
- [ ] A20 — Dispute notices and accepted policy.

## Progress

Progress (Task 1, 2026-10-09): the admin test runner exports `bundleAdminSql(source, knownIncludes)`, which inlines only the known fixtures and refuses any other `\i`/`\ir`/`\include`; it accepts the new owned project `mch-admin-support-test` and the new fixture `supabase/test-fixtures/admin-support.sql`.

Evidence: `tests/admin/support-runner.test.mjs` 3/3 and `collections-runner.test.mjs` 3/3. Baseline on the owned stack after a clean replay of `main`: every database suite 769/769 (32 files).

Progress (Task 2, 2026-10-09): support and reconciliation contracts (`src/lib/payments/reconciliation/contracts.ts`, `src/lib/admin/support/contracts.ts`), strict decoders (`decodeProposal`, `decodeOperation`), exact lookup parsing (`parseLookup`: email, user id, support reference in both formats, or provider id with account and mode), canonical JSON and the material-facts digest, and an allowlist logger (`safeSupportLog`). `AdminCode` gains `STALE`, `RATE_LIMITED` and `OUTCOME_UNKNOWN`. Changes from the plan: the support history type is `SupportHistoryPage` (the admin contracts already have a `HistoryPage`); support references accept `MCH-` plus 1–6 letters or digits, which covers Phase 2's hex and the older base-36 form; refund and notice contracts wait for Tasks 23 and 27. The canonical form sorts keys by UTF-16 code unit; the database's matching digest arrives with proposals (Task 13), checked against this file's golden vector.

Evidence: `support-contracts` 6/6, `support-digest` 5/5, `support-redaction` 3/3, `rpc` (new support codes). Admin unit 101/101, typecheck and lint pass.

Progress (Task 3, 2026-10-09): migration `20261009010100_admin_support_schema.sql`.
- Two console roles: `support_viewer` (`support.read`) and `support_operator` (read, case notes, provider checks, preparing repairs, applying approved repairs). The owner holds every support permission; approving repairs, refunds and dispute notices stays owner-only. Recipe and collection roles have no `support.*` permission, and support roles have no recipe or collection permission.
- `private.support_workspace_settings` holds the support stage (`disabled` → `inspection` → `diagnosis` → `repair`), starting `disabled`.
- `private.support_assert(permission, stage)` checks the permission name, bounds lock waits (5 s), then identity, `aal2`, the support stage and current membership. It does not consult the recipe console stage.
- `admin_console_context` adds `supportStage`. A switched-off recipe console stays closed except to staff who can read support while support is on.
- Team assignment accepts the two support roles; the Team page lists them as "Support (view only)" and "Support".
- `private.support_consume_budget(actor, kind)` keeps per-minute counters (lookup 30, provider check 10); only internal wrappers call it.
- `private.support_canonical_json` and `private.support_digest` match the TypeScript canonical form and digest (shared golden vectors).

Ruling: no `console_enabled` master switch and no separate support grants table. Support has its own stage, so recipe editing and support can each be switched off alone; the server's `ADMIN_CONSOLE_ENABLED` still closes the whole console. Delegating approval beyond the owner is a later, explicit decision; when it comes, it adds a role or a grants table then. Cost if wrong: one more migration to add delegation.

Ruling: the support context is the existing console context with `supportStage`, not a second `admin_support_context`. Cost if wrong: none; the context returns only the caller's own roles and permissions at any assurance level, and every support read checks `aal2` itself.

Evidence: suite `70_admin_support_access.test.sql` 41/41 (switched off by default; anonymous, `aal1`, recipe editor and customer with forged JWT metadata refused; stages unlock in order; operators cannot approve, refund or send notices; the owner can; support roles cannot read recipes and recipe roles carry no support permission; support works with the recipe console switched off while recipe staff stay locked out; revocation is immediate; unknown permissions, stages, roles and budget kinds are refused; budgets refuse the 31st lookup in a minute; canonical JSON and both golden digests match TypeScript; lock waits bounded; no direct browser access). All database suites on a clean replay 810/810 (33 files); generated types unchanged. Browser (chromium-desktop): admin access, Home and collection access 14/14. Admin unit 101/101, typecheck and lint pass. Navigation and the landing page for support-only staff come with the inspection workflow (Task 7).

Progress (Task 4, 2026-10-09): migration `20261009010200_admin_support_reads.sql`; `src/lib/admin/support/repository.ts` (`lookupSupport`, `loadSupportOrder`, `loadSupportCustomer`) with strict read decoders.
- `admin_support_lookup` matches exactly: emails after trim and lower-case on the account or any linked identity (the same rule as Team lookup), never `LIKE`, substrings or address rewriting; support references in Phase 2's hex and the older short form; account ids, including a closed account found only through orders it owned; provider ids (checkout session, payment, charge, refund, dispute) only within an explicit account and mode and only with `support.provider.inspect`. Several matches are ambiguous. Each lookup spends the per-minute budget and is refused with `ADM_RATE_LIMITED` (`PT429`) past it.
- `admin_support_order` returns the order's frozen terms (release, manifest, refund and access policy, price, currency). A missing older field stays null and the read is marked incomplete; the current offer never fills it. The immutable release manifest supplies the recipe list for older orders. The collection's current title is labelled as current; the title at purchase is unknown because orders never stored it. Payment state comes from a recorded payment, else from the checkout attempt (a closed attempt with no payment is unknown, not unpaid). Provider ids and the binding appear only with `support.provider.inspect`. Stripe `warning_*` disputes are inquiries.
- `admin_support_customer` lists a person's orders newest first, 25 a page with a validated cursor, test and live separately labelled. A closed account has no email and is unavailable.

Evidence: suite `71_admin_support_reads.test.sql` 46/46; `support-query` 5/5; real database output for every fixture order decodes with the TypeScript decoders for a viewer (no provider details) and an operator. Admin unit 106/106, typecheck and lint pass; generated types refreshed.

Progress (Task 5, 2026-10-09): `private.support_access_explanation(user, collection)` in `20261009010200_admin_support_reads.sql` (still unreleased, so extended in place), `public.admin_support_access(order)`, the explanation embedded in `admin_support_order`, `loadSupportAccess`, and `summariseSupportAccess` in `src/lib/admin/support/access.ts`.
- It uses the Phase 2 rules the customer's library and recipe pages use: releases held through a valid entitlement supply their own recipes; the delivered release adds its recipes only when a held release's source has an `additions-v1` decision (`collection_release_policy`). Original-only and undecided buyer groups get no additions. Withdrawn recipes are listed as held. Each source shows its kind, origin release, eligibility and reason (for example `fully_refunded`), dates and additions decision.
- `dependencyToken` is a digest of everything the explanation depends on (delivered release, publication, recipe sets, sources, entitlements), so a later repair prepared against it can be refused when anything changes. `resolverVersion` is `phase2-additions-v1`.
- Reading an explanation writes nothing. The summary helper never turns an unavailable explanation into denied or zero recipes, and counts a recipe once.

Ruling: the explanation follows the current entitlement projection, so it agrees with what the customer sees today. The plan's "no bridging of disjoint validity periods" changes that projection itself and belongs to Task 11 (`project_user_entitlement` takes the earliest start and latest end of a buyer's valid sources). Cost if wrong: until Task 11, an explanation can show access across a gap between two sources, exactly as the customer's pages do.

Evidence: suite 71 now 65/65 (adds: three approved additions explained from the original source; five originals kept; a withdrawn recipe shown as held; the source names its decision; recipe-by-recipe agreement with `recipe_access_release`; original-only and undecided groups get no additions and show the decision as unknown; a separate valid grant still gives access after a full refund, with the refunded source explained; a refunded purchase alone gives none; reading changes no access; the dependency token changes with access and with a recipe returning; the public read returns the resolver version; the order read embeds the explanation; browser roles cannot call the private function). `support-access` 3/3. Every database suite 875/875 (34 files). Admin unit 109/109, typecheck and lint pass.

Progress (Task 6, 2026-10-09): migration `20261009010300_admin_support_cases.sql`; case, queue, history and redaction calls in `src/lib/admin/support/repository.ts` with strict decoders.
- `admin_support_case` creates a case and appends, amends or moves it. The order and account must agree (a case's account is the order's owner principal; a closed account can have a case). Exact command keys, the seven categories and five states, optimistic versions (`PT409` on a stale version), and replay through the shared operation ledger (same id and request returns the same case; a changed request is refused). An amendment must point at a note on the same case; nothing is edited in place. Resolving needs a recorded outcome; reopening continues the same case.
- Every change is an immutable event. Note text (1–2,000 characters) sits beside its event; notes are refused with `ADM_BLOCKED` until the owner sets `note_retention_days`, while everything else keeps working. `admin_support_redact_note` is owner-only, clears the text and records who, when and why without copying it.
- `admin_support_history` lists case activity on an order, newest first, 25 a page; the order read embeds the first page. Customer reads list the person's cases.
- `admin_support_queue` lists items needing attention from local records only: orders in review, unresolved cases, pending or failed refunds, open disputes and inquiries, per mode, 25 a page. An ordinary open checkout is not a failure. Provider job and observation signals join it with Tasks 10–12.
- `private.support_read_audit` records each successful lookup, order, customer, access, history and queue read by actor, kind, what was found and outcome, never the search term or returned data. It is append-only.

Ruling: only successful reads are audited; a refused read raises before anything can be written in the same transaction. Refusals already surface as `ADM_DENIED`/`ADM_MFA_REQUIRED` to the caller. Cost if wrong: no record of denied support reads; adding one needs a separate logging path outside the transaction.

Ruling: cases with no order appear in both the test and live queues, labelled with the queue's mode, since an account-only case has no payment mode. Cost if wrong: an account case shows twice across the two queues.

Evidence: suite `72_admin_support_cases.test.sql` 40/40 (case status changes no access; stale versions, viewers, contradictory order and account, missing target, unknown category and extra fields refused; closed-account cases; a command cannot move a case to another order; notes blocked until retention is set, length-limited, amendments limited to the same case with the original kept; events cannot be edited; resolving needs an outcome and reopening keeps history; replay returns the same case and a changed request is refused; only the owner redacts, the text is gone with the reason recorded and no copy anywhere; the timeline lists activity without redacted text; customer reads list cases; the queue shows a dispute inquiry and an open case, not an ordinary unpaid checkout, only the requested mode, and refuses an unknown mode; lookups are audited by what was found, never the email searched; nothing is audited for reads that did not happen). `support-cases` 3/3; real case, timeline, queue and customer output decodes. Every database suite 915/915 (35 files). Admin unit 112/112, typecheck and lint pass.

Progress (Task 7 with UI Task 1, 2026-10-09): the inspection workflow.
- Pages: `/admin/support` (exact search and the attention list, live or test), `/admin/support/customers/[userId]` (orders and cases; a closed account shows no email) and `/admin/support/orders/[orderId]`. The order page shows seven separate states (checkout, payment, refunds, disputes, purchase sources, access to the collection, account), the terms at purchase with unknown fields left unknown, the access explanation, cases and an activity timeline, with "Stripe last confirmed" kept apart from "read from our records". All pages are dynamic and uncached.
- The search runs through a server action, so an email stays in the request body and never reaches a URL. A found order or account opens by its internal id; not found, ambiguous and unconfirmed results open nothing. Stripe-id search appears only for staff who may inspect provider details.
- Cases: support operators open cases and, once the owner has set a retention period, add notes; viewers see cases read-only. Activity refreshes after each change.
- Navigation gains a Support link (group "Customers") for support readers while support is on; `/admin` sends support-only staff to Support. `admin_support_cases(order, cursor)` lists an order's cases and whether notes are on.

Ruling: the plan's `/api/admin/support/lookup` and `/case` route handlers are server actions (`src/lib/admin/support/actions.ts`), the pattern Phase 1 and 2 use for every admin command; Next.js server actions only accept same-origin posts. `supportJson`/`assertSupportOrigin` are therefore not needed. Cost if wrong: none for browsers; a non-browser client would need its own route later.

Ruling: the support privacy checks extend `admin-privacy.spec.ts`, which CI already runs in its analytics-instrumented build, instead of a separate `admin-support-privacy.spec.ts` that the main browser step would run without instrumentation. Cost if wrong: none; the same sink checks run.

Evidence: browser spec `admin-support-inspection.spec.ts` 7/7 on chromium-desktop and 14/14 on chromium-mobile and webkit-mobile (a recipe editor sees no customer data and no Support link; a support viewer lands on Support, finds a customer by exact email typed in a different case with spaces, with no email in any URL, and reads the seven states, the frozen terms and the additions decision, with no Stripe ids and no case controls; references and plus-variant emails that match nothing open nothing, and Stripe-id search is hidden from viewers; an older order shows unknown terms; an operator opens a case, notes stay off until a retention period is set, then a note appears in the activity while access stays unchanged; aal1 gets the verification gate, a closed account reads as closed, and revocation takes effect on the next read; the order page fits 320 px and is sent with `no-store`). `admin-privacy.spec.ts` 6/6 on an instrumented build (the new support case sends nothing to the analytics sink and no email or reference reaches it). Suite 72 now 42/42. Navigation unit 6/6; admin unit 114/114; typecheck and lint pass. CI requires the new spec and at least three support admin suites.
Further evidence: every database suite on a clean replay 917/917 (35 files). Every admin browser spec on chromium-desktop, default build: 82 passed, 4 skipped; one correction case failed while the database suites were running against the same stack at the same time and passed 4/4 when rerun alone (the SQL fixtures hold an active owner and console settings for their duration). Run browser and database suites one after the other.

Progress (Task 8, 2026-10-09): migration `20261009010400_commerce_eligibility_policy.sql`; `evaluatePurchase` and `validateBinding` in `src/lib/payments/reconciliation/policy.ts` (`binding.ts` re-exports the check).
- A purchase source is `blocked` when it cannot be judged (no approved policy, evidence from another account or mode, a different checkout, amount or currency, an order that never recorded its price, an unknown payment, an unclassified dispute, conflicting records for one refund or dispute, a non-positive or fractional amount), `ineligible` when the facts exclude it (not paid or still processing, successful refunds adding up to the captured total, a formal dispute held or lost, an inactive account, a manual hold, an ended fixed term), and otherwise `eligible`. Pending, partial and failed refunds and inquiries keep access. A failed refund never clears another exclusion. `dispute_open` is listed when a policy keeps access during review, so restoration can still be refused.
- `private.commerce_access_policies` maps an order's refund and access policy versions to approved rules, with approver and evidence; rows cannot be edited, and rules outside the accepted policy or with unknown fields are refused. No mapping is installed: existing `v1` orders stay blocked until the owner approves one. `private.commerce_evaluate` is the SQL twin. The evaluator per order and observation (`commerce_evaluate_purchase`) arrives with observations in Task 10.
- One case table (`tests/fixtures/eligibility-matrix.mjs`, 28 cases covering every condition in design section 9.2 plus currency, duplicate, amount, zero-decimal, term and binding cases) drives both: `scripts/support-eligibility-matrix.mjs` renders it as the SQL fixture `support-eligibility-matrix.sql`, and a unit test fails if that file is out of date. New npm script `test:reconciliation:unit`, also in `verify` and CI.

Evidence: `reconciliation-policy` 31/31 (all 28 cases, the plan's hold regression, binding problems, fixture in sync). Suite `73_admin_support_policy.test.sql` 37/37 (the SQL twin gives the identical result for all 28 cases; nothing is installed; mappings are returned only for their version pair, cannot be edited and reject out-of-policy or unknown fields; note retention changes no access; browsers cannot read mappings). Typecheck and lint pass.

Progress (Task 9, 2026-10-09): `src/lib/payments/reconciliation/provider-read.ts` (pure: `readProviderFacts`, `unknownFinancialFacts`, `classifyDispute`) and `stripe-provider.ts` (server-only `createStripeReader`).
- Reading is bounded: 100 items a page, at most 20 pages per list, a 20-second total budget with each call limited to the time left, and two retries for rate limits, timeouts and provider errors. A page cap, a repeated cursor, a failed page, inaccessible disputes, conflicting records for one id, an item bound to another payment or charge, another currency or an unknown status makes the read incomplete or blocked, with a named reason. Refunds and disputes are returned in identity order.
- A failed checkout read returns explicitly unknown facts (no capture, no currency, payment unknown); it never looks like a paid order with no adjustments. A session that names another order is its own blocker (`session_order_mismatch`).
- The Stripe reader takes the account from the server's key (`accounts.retrieve()`), never from the order or the browser; checks the session's `client_reference_id` against the order; lists refunds by the session's payment and disputes by its charge. It creates and changes nothing.

Ruling: no change to `src/lib/payments/stripe.ts`. The reader accepts a client and defaults to the server's existing one, so a separate restricted read key can be passed in when one is provisioned. Line-item composition is not re-read; the captured amount and currency are compared with the order's frozen price instead (`amount_mismatch`, `currency_mismatch` in the evaluator). Cost if wrong: a session with the right total but different line items would not be flagged; checkout only ever creates one line item per order.

Evidence: `reconciliation-provider` 10/10 (a failed second refund page, a complete read, 101 refunds over two pages in identity order, page cap, repeated cursor, conflicting ids, foreign items, unknown status, wrong account and mode, inaccessible disputes, a failed checkout read as unknown, bounded rate-limit retries and recovery, a call timing out, dispute classification, a session naming another order). All payment unit tests 41/41; typecheck and lint pass. No test calls Stripe.
