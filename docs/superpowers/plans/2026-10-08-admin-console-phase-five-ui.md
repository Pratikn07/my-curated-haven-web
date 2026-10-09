# Admin Console Phase 5 Operations, History and Governance UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the owner one place to see what needs attention, how trustworthy that evidence is, and where to act. Phase 5 screens must use the console's existing layout and status language, and must never look like they can approve, repair, refund, publish or restore anything.

**Architecture:** Refine the functional operations components created by the [Phase 5 domain plan](2026-10-07-admin-operations-phase-five.md) (Tasks 10, 11, 16, 18 and 19) using the shared shell, record frame and vocabulary from the [admin console UX design](../specs/2026-10-07-admin-console-ux-design.md). Keep **one landing page**: Home at `/admin` stays the entry point and, once 5A is active, reads its attention rows from the Phase 5 overview read instead of the per-module Home feeds. `/admin/overview` becomes the full, filterable attention list behind Home's "See all" links. 5A UI (Tasks 1–4) and 5B UI (Tasks 5–7) release independently; Task 8 closes each release.

**Tech Stack:** Next.js 16, React 19, TypeScript, existing admin tokens in `src/styles/tokens.css` and `src/styles/admin.css`, Phase 5 operations RPCs/DTOs, Playwright with the guarded `admin-operations-fixtures.ts` synthetic fixtures.

**Spec:** [Admin console UX design](../specs/2026-10-07-admin-console-ux-design.md), sections 2–4 and 9–11; [Phase 5 design](../specs/2026-10-07-admin-operations-phase-five-design.md), sections 6–12 and 16–20. The UX design scoped Phase 5 out; this plan adds Phase 5 gates UX9–UX12 below without changing UX1–UX8.

## Global Constraints

- Invoke `$unlazy` and create the `AGENTS.md` acceptance ledger before the first code edit. Recheck the integrated Phase 5 contracts, operations stage, shared `console_enabled` gate and which source adapters are actually active.
- **Native remains selected**, matching the domain plan. Execute with `superpowers:executing-plans` in-session and obtain an independent final review.
- No acknowledge, assign, dismiss, snooze, close, mark-reviewed, restore, download, redeploy, refund, repair, publish or settings-edit control appears on any Phase 5 screen. The only command is the owner's **Run check now** on Health in Monitoring stage.
- Category, freshness, coverage, health result and integration state are separate axes. Never merge them into one green or red badge. A stale earlier success is not current health, and a failed check is not a stale success.
- Zero is shown only when the backend returns non-null counts and complete coverage. In every other case show the specific Partial, Unavailable or Not checked state.
- Hidden sources leave no trace for staff. No hidden module names, counts, badges, outage notes or pagination totals appear in HTML, RSC payloads or `aria` text. Only the owner sees "Not integrated" rows.
- Every destination link comes from the server's `destination` field. Never build a URL in the browser from a source name or ID.
- No email, note text, provider ID or financial value appears in Phase 5 rows, URLs, tooltips, analytics, replay or error text. Report figures stay inside Phase 4 report pages.
- This plan adds no migration and no new source of truth. If a screen needs a field the DTO lacks, stop and amend the domain contract; do not derive it in the browser.

## Decision: one landing page

The Phase 2/3 UI plans make `/admin` a Home page with Publishing and Customer support lanes. The Phase 5 domain plan (Task 10) proposes making `/admin/overview` the landing route. Two "what needs me" pages fed by different queries would disagree. This plan settles it:

| Route | Job | Data source |
| --- | --- | --- |
| `/admin` (Home) | Landing summary: top items per lane, Continue work, Recent results, source coverage strip | Phase 5 `loadOverview` when operations stage ≥ Inspection and the operator has `ops.overview.read`; otherwise the existing Phase 2/3 Home feeds |
| `/admin/overview` (Attention) | Full attention list with filters, paging and category grouping | Phase 5 `loadOverview` only |

Home lanes map sources as follows: **Publishing** = `recipes`, `collections`, `campaigns`. **Customer support** = `support`. **Operations** (new, owner-only by default) = `public`, `deployment`, `recovery`, `team`, `reports`. Inside each lane, rows sort by the backend order (category, deadline, first observed, ID). Each lane shows at most five rows plus a **See all** link to `/admin/overview?sources=…`.

Owner-approved amendment (2026-10-08): domain Task 10 now keeps Home as the landing route and exposes `loadOverview` for it, instead of making Overview the landing route. Rollback (stage Disabled) returns Home to the Phase 2/3 feeds, which satisfies the design's rollback rule (section 21) without a redirect change.

## Phase 5 UX gates

| Gate | Observable UI requirement | Tasks |
| --- | --- | --- |
| UX9 | Home and Attention share one data source and show category, freshness and coverage as separate labels; zero only on complete coverage | 1–3 |
| UX10 | Item evidence and History explain provenance (first observed here, last confirmed, original vs recorded time, missing approver) and route only to the original workflow | 2, 4 |
| UX11 | Health, deployment and recovery keep result, freshness, coverage, integration and verification gaps distinct, with no restore or redeploy control | 5–6 |
| UX12 | Team access review and report status show recorded evidence only and never grant or reveal finance or support data through operations authority | 7 |

## Review Focus

1. A recipe-only staff member opens Home, Attention, History and a guessed support item URL: no support rows, counts, lane heading or outage text appear anywhere, including the RSC payload (Tasks 1–4).
2. An urgent dispute item's latest check fails: the row keeps **Urgent** with a **Stale** badge and the last confirmed time. It is not downgraded and not listed twice (Tasks 2–3).
3. The Mac uploads yesterday's backup receipt today: Recovery shows the backup's real finish time and age, partial storage coverage and "Restore not verified" (Task 6).
4. The owner clicks **Run check now** and the response is lost: reload shows the original receipt state, and the button stays blocked by the active run instead of starting a second one (Task 5).
5. Only Recipes is integrated: Home and Attention say "Coverage: Recipes only" to the owner, show no zero for other sources, and staff see no planned-module names (Tasks 1–3).

## Status vocabulary

All Phase 5 screens use these exact labels through one component. Times always show the configured timezone.

| Axis | Values shown | Rules |
| --- | --- | --- |
| Category | Urgent · Needs attention · Routine work · Needs verification | Text label plus position; never colour alone |
| Freshness | Current · Stale (last completed {time}) · Not checked | Shown next to category or result, never instead of it |
| Coverage | Complete · Partial ({n} of {m} sources) · Unavailable | Staff counts use only their permitted sources |
| Health result | Pass · Degraded · Fail · Unknown | Pass carries its scope sentence from `purpose` |
| Integration (owner only) | Active · Disabled · Not integrated | Disabled is a normal state when intended |
| Times | First observed here · Last confirmed · Source checked · Received | "First observed here" never reads as the incident start |

## File responsibility map

| File | UI responsibility |
| --- | --- |
| `my-curated-haven-web/src/components/admin/operations/OpsStatus.tsx` | One status-axes component for the vocabulary above |
| `my-curated-haven-web/src/lib/admin/navigation.ts`, `src/components/admin/AdminShell.tsx` | Grouped navigation: Workspace (Home, Attention, History), Publishing, Operations (Customer support, Health, Recovery), Insights, Access (Team) |
| `my-curated-haven-web/src/components/admin/AdminRecordFrame.tsx` | Optional `eyebrow` and `states` props so item evidence can reuse the frame; recipe defaults unchanged |
| `my-curated-haven-web/src/components/admin/operations/{Overview,AttentionList,SourceCoverage,ItemEvidence}.tsx`, `src/app/admin/overview/page.tsx`, `src/app/admin/operations/items/[itemId]/page.tsx` | Attention list and item evidence, refined from domain Task 10 |
| `my-curated-haven-web/src/lib/admin/home/repository.ts`, `src/components/admin/AdminHome.tsx`, `src/app/admin/page.tsx` | Home switched to Phase 5 data with fallback to Phase 2/3 feeds |
| `my-curated-haven-web/src/components/admin/operations/History.tsx`, `src/app/admin/history/page.tsx` | Administrative history, refined from domain Task 11 |
| `my-curated-haven-web/src/components/admin/operations/{Health,Recovery,Governance}.tsx`, `src/app/admin/operations/{health,recovery}/page.tsx` | Health with manual refresh and deployment card; Recovery; governance evidence |
| `my-curated-haven-web/src/components/admin/AdminTeam.tsx` | Access review section on the existing Team page |
| `my-curated-haven-web/src/lib/analytics/private-paths.ts` and its tests | Exclusion for every new admin route and return context |
| `my-curated-haven-web/tests/e2e/admin-operations-{overview,home,history,health,recovery,governance}.spec.ts` | Role, state, privacy and responsive acceptance |
| `docs/implementation/admin-operations/GATES.md` | Observed UI evidence for UX9–UX12 |

The domain plan creates most of these files in a plain working form. This plan is the presentation pass on those exact files and adds no separate data path.

---

### Task 1: Shared status vocabulary and grouped navigation

**Depends on:** Phase 5 domain Tasks 2–3 (contracts and authority) and Phase 1 shell. Phase 2–4 UI navigation entries, where integrated.

**Files:** Create `operations/OpsStatus.tsx`, `tests/admin/ops-status.test.mjs`. Modify `src/lib/admin/navigation.ts`, `AdminShell.tsx`, `AdminRecordFrame.tsx`, `src/styles/admin.css`, `tests/e2e/admin-access.spec.ts`.

**Interfaces:** `OpsStatus({ category?, freshness?, coverage?, result?, integration?, lastCompletedAt? })` renders each supplied axis as its own labelled item in a `<dl>`. `adminNavigation(operator, pathname)` returns groups `{ label, links[] }`; a link exists only when the operator holds its read capability and the stage allows it.

- [ ] Add a unit test that `OpsStatus` with `result:"pass", freshness:"stale"` renders both "Pass" and "Stale (last completed …)" and never a single combined label. Add browser cases: owner sees Workspace/Operations groups; recipe-only staff sees no Attention, History, Health or Recovery links when lacking `ops.*`; ops stage Disabled hides all Phase 5 links. Run them first and expect failures.
- [ ] Implement `OpsStatus` with text labels and existing token roles (terracotta for urgent/fail, sage for pass, ink outline for verification and unknown). Status words never rely on colour alone.
- [ ] Group navigation per UX spec section 2, adding Attention and History under Workspace and Health and Recovery under Operations. Replace the single "Publishing" rail label with per-group labels. Phone layout keeps wrapped, labelled rows at 320px.
- [ ] Add optional `eyebrow` (default "Recipe workspace") and `states` (default Live/Working revision) props to `AdminRecordFrame`. Rerun Phase 1 inspection specs to prove recipes are unchanged.
- [ ] Run unit, access and inspection specs on desktop and both mobile projects, plus lint and typecheck. Commit Task 1 files.

### Task 2: Attention list and item evidence

**Depends on:** Domain Tasks 9–10 and Task 1.

**Files:** Modify `operations/{Overview,AttentionList,SourceCoverage,ItemEvidence}.tsx`, `src/app/admin/overview/page.tsx`, `src/app/admin/operations/items/[itemId]/page.tsx`, `tests/e2e/admin-operations-overview.spec.ts`.

**Interfaces:** Pages call `loadOverview(query)` and `loadItem(itemId)` and pass safe DTOs only. Filters (`sources`, `categories`, `q`, `cursor`) live in the URL through `parseOpsQuery`; `q` accepts safe title or reference text only.

- [ ] Add browser cases for: four category groups in order; a stale urgent item showing Urgent + Stale + last confirmed time once; `counts:null` rendering "Partial" with no numbers; a genuine empty complete scope showing **Nothing needs your action right now**; one adapter unavailable while others load; source-derived fallback (`occurrence:null`) showing no first-observed time or item-history link; authority lost between list and item. Run them first.
- [ ] Attention page: heading "Attention", a `SourceCoverage` strip above the list, filters that survive navigation, then groups **Urgent**, **Needs attention**, **Routine work**, **Needs verification**. Each row shows title, source, one reason, deadline when present, `OpsStatus`, first observed here or "Current source read", and one **Open {source}** link from `destination`. Desktop uses a table; phone uses labelled cards. 25 rows per page with a **More** cursor link and no page totals unless counts are non-null.
- [ ] Distinguish these states with distinct copy: Loading, No matches (keep filters, offer **Reset filters**), Nothing needs your action (complete only), Partial, No authorised sources, Unavailable (with last successful check if known).
- [ ] Item evidence page: reuse `AdminRecordFrame` with eyebrow "Attention item" and states **Condition** (active/resolved) and **Evidence** (freshness + coverage). The main column shows the explanation, evidence list (observed, received, source checked, generation, producer label) and resolution reference when resolved. The action panel shows only **Open {source}** plus the line "Viewing this item does not acknowledge it. It clears when {source} reports the condition is gone."
- [ ] Test that no button matches `/dismiss|close|acknowledge|refund|publish|repair/i` on either page. Run the overview spec on all three projects, lint and typecheck. Commit Task 2 files.

### Task 3: Home reads Phase 5 attention with a safe fallback

**Depends on:** Task 2, Phase 2 UI Task 4 (Publishing Home) and, for the support lane, Phase 3 UI Task 4.

**Files:** Modify `src/lib/admin/home/repository.ts`, `src/components/admin/AdminHome.tsx`, `src/app/admin/page.tsx`, `tests/e2e/admin-home.spec.ts`, `tests/e2e/admin-operations-home.spec.ts`.

**Interfaces:** `loadAdminHome(context)` returns `{ mode: "operations" | "modules", lanes, continueWork, recentResults, coverage }`. Mode is `operations` only when the ops stage is Inspection or Monitoring and the operator has `ops.overview.read`; it then calls `loadOverview` once and splits rows into lanes by source. Otherwise it returns the unchanged Phase 2/3 envelopes. `continueWork` and `recentResults` keep using the existing Phase 2/3 reads in both modes.

- [ ] Add cases for: owner in operations mode with three lanes; recipe-only staff with only Publishing; ops stage switched to Disabled mid-session returning Home to module mode on the next request; Operations lane hidden from staff without `ops.health.read`; a lane count matching the Attention page for the same filter. Run them first.
- [ ] Render lanes in order Publishing, Customer support, Operations. Each lane shows up to five rows, its own `OpsStatus` coverage, and **See all** to `/admin/overview?sources=…`. An empty lane with complete coverage says **Nothing needs your action right now** with an inventory link; a partial lane says which permitted source is missing.
- [ ] Keep Continue work and Recent results below the lanes, unchanged. Show no financial figures, vanity metrics or report values on Home; a report source problem appears only as an Operations row linking to the report.
- [ ] Recipe-only 5A: when only Recipes is integrated, the owner sees "Coverage: Recipes only" and owner-only "Not integrated" rows in the coverage strip; staff see only their lanes.
- [ ] Run Home specs in both modes on all projects, 320/375px and 200% zoom, plus lint, typecheck and build. Commit Task 3 files.

### Task 4: Administrative history

**Depends on:** Domain Tasks 8 and 11, and Task 1.

**Files:** Modify `operations/History.tsx`, `src/app/admin/history/page.tsx`, `tests/e2e/admin-operations-history.spec.ts`, `tests/e2e/admin-privacy.spec.ts`.

**Interfaces:** Page uses `loadOperationsHistory(parseHistoryQuery(searchParams))`. Filters: 7/30/90-day presets, custom range up to 90 days, source, action, result, safe target ID and operation ID.

- [ ] Add cases for: missing approver labelled **Human approval not recorded**; legacy actor-only rows labelled **Actor only (older record)**; original time vs recorded time both visible; partial source history banner; a 91-day custom range rejected with an inline error that keeps other filters; revocation during paging; no private note text in DOM or URL. Run them first.
- [ ] Columns on desktop: When (original), Recorded, Source, Action, Result, Target, Authorised by, Executed by, Reason, Open. Phone cards keep every label. Result uses the shared words from UX spec section 10 (Committed; refresh pending, Applied; verification pending, Outcome unknown) and never shows success for unknown outcomes.
- [ ] When coverage is partial, show "History from {sources} only. This is not the complete audit trail." above the table. **Open** appears only when the server returns a permitted destination.
- [ ] Add `/admin/overview`, `/admin/operations/*` and `/admin/history` to the private-path tests with a public positive control. Run history and privacy specs on all projects, lint and typecheck. Commit Task 4 files.

### Task 5: Health, manual refresh and deployment evidence

**Depends on:** Domain Tasks 14, 16 and 19 (deployment part), and Task 1. 5B only.

**Files:** Modify `operations/Health.tsx`, `operations/Governance.tsx`, `src/app/admin/operations/health/page.tsx`, `tests/e2e/admin-operations-health.spec.ts`, `tests/e2e/admin-operations-governance.spec.ts`.

**Interfaces:** `loadHealth()` returns `HealthCheck[]`; `requestOperationsRefresh({ operationId, checkId })` returns `JobReceipt`; receipts reload through `admin_ops_receipt`. Deployment uses `deploymentVerdict` output and `DeploymentEvidence` fields as delivered.

- [ ] Add cases for: current fail next to stale pass on different checks; a started run not refreshing an old completion; Inspection stage showing the button disabled with "Checks run in Monitoring stage only"; rate limit message with the next allowed time; lost response recovered by receipt on reload; a deployment with `servingRevision:null` showing **Unknown**, not Verified. Run them first.
- [ ] One row per check: purpose (with scope sentence), `OpsStatus` result/freshness/coverage/integration, last real completion, definition and target, producer label. No overall "All systems healthy" banner; the page header shows coverage only.
- [ ] **Run check now** appears per check only with `ops.check.run` and Monitoring stage. After submit, show receipt states Queued, Running, Complete, Partial, Failed, Outcome unknown or Disabled in a polite live region. While a run is active, the button reads "Check running" and is disabled.
- [ ] Deployment card lists four separate rows (Provider status, Expected revision, Smoke script revision, Serving revision) then the verdict Verified, Mismatch or Unknown with its reason. No redeploy or rollback link.
- [ ] Run health and governance specs on all projects, lint and typecheck. Commit Task 5 files.

### Task 6: Recovery readiness

**Depends on:** Domain Tasks 17–18 and Task 1. 5B only, owner-only.

**Files:** Modify `operations/Recovery.tsx`, `src/app/admin/operations/recovery/page.tsx`, `tests/e2e/admin-operations-recovery.spec.ts`.

**Interfaces:** `loadRecovery()` returns `RecoveryView` (`coverage`, `restoreVerified`, completion freshness, last rehearsal, measured duration or null).

- [ ] Add cases for: yesterday's backup uploaded today keeping its real finish time; database included with storage unknown giving **Partial**; no receipt for 40 hours; operator-reported rehearsal vs independently verified; staff denied. Run them first.
- [ ] Render three separate panels answering the design's three questions. **Backup finished**: finish time, timezone, age, freshness. **What it covers**: per-component table (database, roles and grants, auth, `recipe-images`, `recipe-previews`) with Included, Excluded or Unknown and the consistency window. **Restore tested**: date, artifact, checks passed and omitted, duration or "Not measured", and the provenance label **Operator-reported** or **Independently verified**.
- [ ] Missing-receipt copy: "No backup receipt for {hours} hours. This doesn't prove the backup failed; the Mac reporter may be offline. Check the backup on the Mac." Show "Restore not verified" whenever `restoreVerified` is false. The only link is the runbook; no restore, download or attest control.
- [ ] Run the recovery spec on all projects, lint and typecheck. Commit Task 6 files.

### Task 7: Team access review and report status

**Depends on:** Domain Task 19 (governance part) and Phase 4 UI Task 3 for report links. 5B only.

**Files:** Modify `AdminTeam.tsx`, `operations/Governance.tsx`, `src/app/admin/team/page.tsx`, `tests/e2e/admin-operations-governance.spec.ts`.

**Interfaces:** `loadGovernance()` returns `{ reviewDue: boolean | null; lastReviewAt: string | null }`. Report status comes from Phase 4 `ReportResult.state` and watermark only.

- [ ] Add cases for: no review record showing "No access review recorded" and a routine prompt; review older than 90 days creating a Routine work item; no "Mark reviewed" button; staff with operations authority but no finance grant seeing no report values or Finance link. Run them first.
- [ ] Add an **Access review** section to Team showing last recorded review, the 90-day reminder and the existing grants table. Do not show last login or inactivity. Grant and revoke stay in the existing Team controls.
- [ ] Report problems show as Operations rows ("Finance report source stale since {time}") linking to the Phase 4 report page. No figures leave Phase 4 pages; disabled analytics shows **Disabled** as a normal state.
- [ ] Run governance and Team specs on all projects, lint and typecheck. Commit Task 7 files.

### Task 8: Verify each Phase 5 UI release

**Depends on:** Tasks 1–4 for a 5A release, Tasks 5–7 for 5B, and domain Tasks 20–22 for the same release.

**Files:** Modify `tests/e2e/admin-operations-*.spec.ts` as needed; update `docs/implementation/admin-operations/GATES.md` with observed results.

- [ ] Run every Phase 5 browser spec under owner, recipe-only, support-only, revoked and `aal1` actors on desktop Chromium, mobile Chromium and mobile WebKit against a production build.
- [ ] Check keyboard order, focus after filter changes and refresh, 44px touch targets, 320/375px and 200% zoom with no horizontal overflow, and status words readable without colour.
- [ ] Inspect HTML and RSC payloads for staff to confirm no hidden source names, counts or outage text. Confirm admin routes stay out of analytics and replay with the public positive control passing.
- [ ] Capture synthetic screenshots of Home (operations mode), Attention, item evidence, History, Health and Recovery for owner review; label them illustrative. The owner walkthrough stays open until the owner completes it.
- [ ] Record UX9–UX12 evidence and which sources the release covers in `GATES.md`. A recipe-only 5A release states that UX9–UX12 are met for Recipes only. Commit.

## Acceptance crosswalk

| Phase 5 runtime gate (domain plan) | UI tasks that show it |
| --- | --- |
| A1 source fidelity, A6 partial collection | 2, 3 |
| A2 authority and scope | 1–4, 8 |
| A4 priority and uncertainty, A5 lifecycle | 2, 3 |
| A7 history integrity | 4 |
| A8 liveness, A12 manual refresh | 5 |
| A13 backup evidence, A14 restore readiness | 6 |
| A15 deployment identity | 5 |
| A16 access governance, A17 reports | 7 |
| A18 privacy, A19 disable and rollback | 3, 4, 8 |

A green UI run is not evidence that producers, schedules, backups or production activation work. Those remain domain plan gates A3, A9–A11 and A20.

## Handoff

Execute this plan alongside the domain plan: Tasks 1–4 after domain Tasks 9–11, Tasks 5–7 after domain Tasks 16–19. If Phases 2–4 are not integrated, ship a labelled recipe-only 5A and leave other lanes absent rather than empty.
