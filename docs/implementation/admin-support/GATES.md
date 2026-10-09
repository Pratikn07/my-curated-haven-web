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
