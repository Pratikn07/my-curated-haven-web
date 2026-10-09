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
