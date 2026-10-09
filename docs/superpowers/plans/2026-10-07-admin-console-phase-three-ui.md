# Admin Console Phase 3 Support and Home UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give authorised operators a clear purchase/access diagnosis and exact repair/refund/notice decisions, then add restricted Customer support to the existing Publishing Home.

**Architecture:** Consume the separately authorised support DTOs, proposals, approvals, operations and receipts from the [Phase 3 domain plan](2026-10-07-admin-customer-support-phase-three.md). Extend the Phase 2 Publishing Home with a protected Support attention read and a bounded support-receipt summary; keep source failures independent. The UI never constructs provider facts or financial authority.

**Tech Stack:** Next.js 16, React 19, TypeScript, existing admin frame/tokens, Supabase protected reads, support same-origin commands, pgTAP and Playwright synthetic fixtures.

**Spec:** [Admin console UX design](../specs/2026-10-07-admin-console-ux-design.md), sections 2–4, 7 and 9–11; [Phase 3 design](../specs/2026-10-07-admin-customer-support-phase-three-design.md).

## Global Constraints

- Invoke `$unlazy` and create the `AGENTS.md` acceptance ledger before any code edit. Recheck integrated contracts, migration filenames and stage flags; preserve unrelated work.
- Phase 2's authoritative access resolver and Phase 3's protected lookup, queue, diagnosis, repair, refund and notice commands must be integrated before their corresponding UI actions appear.
- `support.read` is distinct from recipe/collection rights. Provider IDs require the narrower inspection capability; refunds and notices require their own owner capabilities. Revocation and `aal1` fail on fresh reads and writes.
- Email, notes, raw provider IDs and financial totals stay out of Home rows, URLs, optional analytics/replay, public caches and default logs. A receipt holder does not become the order owner.
- Financial, access, provider and action states never collapse into one success indicator. An unknown submit/send outcome blocks a second attempt until receipt recovery resolves it.

## Review Focus

1. Exact email lookup yields ambiguous or unconfirmed: the UI shows that state without selecting an order or putting email in the URL (Task 1).
2. Paid order with another valid access source: a full refund preview changes only the qualifying purchase source and shows effective access truthfully (Task 3).
3. Provider read or resolver fails: missing evidence is unavailable, not unpaid or no access (Tasks 1–2).
4. A repair commits but post-check fails, or a refund/notice outcome is unknown: recovery retrieves the same operation without another write (Tasks 2–3).
5. Recipe-only staff open Home or support deep links: support rows, totals, receipts and RSC payloads remain absent (Task 4).

## File responsibility map

| File | UI responsibility |
| --- | --- |
| `my-curated-haven-web/src/components/admin/support/{SupportSearch,SupportQueue,OrderWorkspace,AccessExplanation,SupportTimeline,ProviderDiagnosis}.tsx` | Exact lookup, seven state axes, provenance, safe next action |
| `my-curated-haven-web/src/components/admin/support/{RepairPreview,RepairResult,RefundPreview,RefundResult,DisputeNotice}.tsx` | Separate exact decisions, dispatch/post-check truth and receipt recovery |
| `my-curated-haven-web/src/app/admin/support/page.tsx`, `src/app/admin/support/orders/[orderId]/page.tsx` | Protected queue and order route; focused decision steps stay within the order workspace |
| `my-curated-haven-web/src/lib/admin/home/{contracts,repository}.ts`, `src/lib/admin/support/{contracts,decode,repository}.ts` | Extend Home and the protected support queue DTO with safe priority facts |
| `my-curated-haven-web/src/components/admin/AdminHome.tsx`, `src/app/admin/page.tsx`, `src/components/admin/AdminShell.tsx` | Add Support lane and navigation to the existing Home |
| `supabase/migrations/20261007220000_admin_home_support_results.sql`, `supabase/tests/database/57_admin_home_support.test.sql` | Current-actor, bounded safe Support result summaries after support migrations |
| `my-curated-haven-web/tests/e2e/admin-support-{inspection,diagnosis,repair,refunds,privacy}.spec.ts`, `admin-home.spec.ts` | Authenticated browser and privacy acceptance |

The support components and most routes are created by the domain plan. This plan refines their presentation after their owning contracts exist; the Home files already exist from Phase 2. If an integrated migration has taken the proposed timestamp, choose the next unused forward timestamp and record that adjustment before creating it.

---

### Task 1: Present exact lookup and a readable order explanation

**Depends on:** Phase 3 domain Tasks 3–7 and Phase 2 resolver integration.

**Files:** Modify `support/SupportSearch.tsx`, `SupportQueue.tsx`, `OrderWorkspace.tsx`, `AccessExplanation.tsx`, `SupportTimeline.tsx`, `src/app/admin/support/page.tsx`, `orders/[orderId]/page.tsx`, `AdminShell.tsx`, `tests/e2e/admin-support-inspection.spec.ts`, `admin-support-privacy.spec.ts`.

**Interfaces:** Consume `LookupResult`, `SupportRead<OrderSupportDto>`, `AccessExplanation` and `SupportQueuePage` from `src/lib/admin/support/contracts.ts`. Show `checkedAt`, `complete`, `resolverVersion` and `providerVerifiedAt` according to their own meaning.

- [ ] Add browser assertions for found/not-found/unconfirmed/ambiguous/unavailable lookup; a paid order with denied/unavailable access; provider-versus-local freshness; recipe-only denial; 320px layout. Run the focused inspection/privacy specs before presentation changes.
- [ ] Keep email in a POST/action body and local form state; navigate by internal order ID only after an authorised result. Label provider-ID lookup advanced and show it only with `support.provider.inspect`. Treat a person presenting a receipt separately from the recorded owner principal.
- [ ] Apply the shared record frame to the order page. Present seven labelled axes: checkout attempt, captured payment, refunds, disputes, source eligibility, effective collection access and account availability. Below them show original purchase terms/release, approved additions, content holds, source lineage, provider/ledger/resolver timestamps and a timeline separating facts, inferences and actions.

```tsx
const order = supportRead.value;
const complete = supportRead.complete;
const axes: {label:string;value:string}[] = [
  {label:"Checkout attempt", value:order.attemptState},
  {label:"Payment", value:order.paymentState},
  {label:"Refund", value:complete ? order.refunds.map((fact) => fact.status).join(", ") || "None recorded" : "Unavailable"},
  {label:"Dispute", value:complete ? order.disputes.map((fact) => fact.status).join(", ") || "None recorded" : "Unavailable"},
  {label:"Source eligibility", value:order.access?.sources.map((source) => source.eligible ? "Eligible" : "Ineligible").join(", ") ?? "Unavailable"},
  {label:"Effective access", value:order.access?.effective ?? "Unavailable"},
  {label:"Account", value:order.accountState},
];
return <OrderWorkspace order={order} axes={axes} access={order.access} />;
```

- [ ] A source outage shows Unavailable and a safe Retry, never a zero balance or no-access conclusion. Rerun inspection/privacy specs, support read SQL suites, lint and typecheck; commit Task 1 files.

### Task 2: Show exact repair effects and post-check truth

**Depends on:** Phase 3 domain Tasks 8–17.

**Files:** Modify `support/ProviderDiagnosis.tsx`, `RepairPreview.tsx`, `RepairResult.tsx`, `OrderWorkspace.tsx`, `tests/e2e/admin-support-diagnosis.spec.ts`, `admin-support-repair.spec.ts`.

**Interfaces:** Consume `RepairProposal`, `OperationStatus` and `RepairReceipt`. Only the server-side command can prepare/approve/apply; UI passes the exact proposal ID/digest and operation ID from the protected response.

- [ ] Add an owner/staff browser case with complete observation, stale proposal, incomplete provider read, separate reviewer/executor, committed repair plus failed post-check and lost-response operation lookup. Run diagnosis/repair specs and capture failing assertions.
- [ ] Make Check provider status the first next action. Open a focused RepairPreview step inside the protected order workspace for exact proposal review: observed provider mode/account, source/owner binding, policy and resolver version, before/after eligibility, before/after effective access, recipe effects, checked-at/expiry and required reason. If the page reloads before approval, prepare a fresh proposal; the server rechecks current capability and proposal validity at approval.
- [ ] Label state `applied` with `verification:"pending"` as **Applied; verification pending**. Restore `OperationStatus` from the protected operation endpoint after reload; offer only post-check/recovery, never a second apply button with a new operation ID.

```tsx
if ("verification" in operation && operation.verification !== "verified") {
  return <RepairResult title="Applied; verification pending" operationId={operation.operationId} />;
}
```

- [ ] Rerun diagnosis/repair browser specs, relevant operation SQL suites, lint/typecheck; commit Task 2 files.

### Task 3: Separate owner refund and dispute notice decisions

**Depends on:** Phase 3 domain Tasks 23–27 and Task 1 above.

**Files:** Modify `support/RefundPreview.tsx`, `RefundResult.tsx`, `DisputeNotice.tsx`, `OrderWorkspace.tsx`, `tests/e2e/admin-support-refunds.spec.ts`; extend `tests/e2e/admin-support-privacy.spec.ts` and `admin-support-dispute-notices.spec.ts`.

**Interfaces:** Consume `RefundProposal`, `RefundReceipt`, `DisputeNoticeDraft`, `NoticeReceipt` and their protected status readers. Never accept amount, recipient, provider key or approval identity from an untrusted browser field after proposal creation.

- [ ] Test full/partial fixed amounts, pending/refunded/reserved capacity, another valid access source, owner-only capability, duplicate click, provider outcome unknown, formal-versus-inquiry dispute and exact recipient preview. Run focused refund/notice browser specs first.
- [ ] Use a focused owner-only RefundPreview step for original payment mode/currency, captured/successful/pending/reserved amounts, fixed proposed amount, policy version, predicted qualifying-source effect, other valid access and exact owner reason. Keep **Approve and submit refund** distinct from repair. Result has separate provider state and local reconciliation state.
- [ ] Use a focused owner-only DisputeNotice step for verified recipient, subject/body, effective access wording and expiry before **Approve and send**. A draft or webhook never sends. If the page reloads before approval, prepare a new exact preview. For `outcome_unknown`, show the same operation and status lookup; disable a new submit/send until safe recovery yields a known outcome.

```tsx
const unresolved = receipt.state === "outcome_unknown" || receipt.state === "dispatching";
return <button type="button" disabled={unresolved || pending}>Prepare another refund</button>;
```

- [ ] Rerun refund/notice browser specs and SQL suites, privacy, lint and typecheck; commit Task 3 files.

### Task 4: Add the restricted Customer support Home lane

**Depends on:** Phase 2 Publishing Home acceptance; Phase 3 protected support queue, cases and receipt reads; Tasks 1–3 above.

**Files:** Create `supabase/migrations/20261007220000_admin_home_support_results.sql`, `supabase/tests/database/57_admin_home_support.test.sql`; modify `src/lib/admin/home/contracts.ts`, `repository.ts`, `src/lib/admin/support/contracts.ts`, `decode.ts`, `repository.ts`, `src/components/admin/AdminHome.tsx`, `src/app/admin/page.tsx`, `AdminShell.tsx`, `tests/e2e/admin-home.spec.ts`, `docs/implementation/admin-support/GATES.md`.

**Interfaces:** Extend `SupportQueuePage.items` with `deadlineAt:string|null` and `accessConsequence:"blocked"|"at_risk"|"none"|"unknown"`, derived only from verified dispute/access facts. Extend `loadAdminHome(context: AdminContext)` with a separate Support envelope using that queue; label its bounded `items.length` as items shown, not the unknown full queue total. `admin_home_support_results(10)` returns at most ten current-actor-authorised safe repair/refund/notice status summaries, including durable pending/unknown operations. Preserve the Phase 2 recipe/collection envelopes and `admin_home_publishing_results` unchanged.

- [ ] Add SQL tests for recipe-only, support-only, owner, revoked and `aal1` actors; verify support results cannot reveal another account's note, email, amount or provider ID. Include a verified formal-dispute deadline versus an unverified/inquiry event and a paid-but-unfulfilled access consequence. Add browser tests for separate lanes, deadline ordering, support source unavailable versus zero, safe support reference, pending/unknown outcome and 320px layout. Run suite 57 and `admin-home.spec.ts` before implementation.
- [ ] Extend the protected support attention query/strict DTO decoder with verified `deadlineAt` and `accessConsequence`; do not invent a deadline from a case note or receipt. Add the read-only support-result RPC with current DB membership, `aal2`, `support.read`, active stage and a hard limit of ten. Select permitted durable repair/refund/notice operation IDs, safe support reference, outcome label and time; exclude notes, emails, money, provider IDs and raw request/response JSON. Return no row for a recipe-only actor. Test SQL access directly; do not grant browser SELECT on private support ledgers.
- [ ] Extend `loadAdminHome` with independent protected Support queue and result calls only when `support.read` is current. Sort verified deadlines first, then blocked/at-risk access and observed age; keep the provider observation time visible. One failed Support call displays **Unavailable** while Publishing remains usable. Continue work may include permitted cases; result links reopen protected operation/detail routes and recheck authority.

```ts
const supportFeeds = context.operator.permissions.includes("support.read")
  ? [loadSupportAttention(), loadSupportRecentResults()]
  : [Promise.resolve(null), Promise.resolve(null)];
const [support, supportResults] = await Promise.allSettled(supportFeeds);
```

- [ ] Show Customer support only with `support.read`; do not expose its count, rows or results in the HTML/RSC payload of a recipe-only or collection-only Home. If its authorised queue has no rows, say **Nothing needs your action right now** with a Support inventory link. Keep Publishing unchanged and omit future Campaigns/Finance tiles.
- [ ] Register SQL suite 57 in the owned admin DB runner/CI discovery. Rerun support and Home browser tests under all permission roles, 320/375px and 200% zoom. Check keyboard focus, 44px touch targets, no horizontal overflow, admin privacy/analytics, lint/typecheck/build. Record Phase 3/UI gate evidence in `GATES.md`; commit Task 4 files.

## Handoff

[Phase 4 UI](2026-10-07-admin-console-phase-four-ui.md) adds authorised Campaigns and reports to the existing shell/Home only as their protected contracts activate. This plan closes UX1 and UX5 plus support portions of UX2/UX7/UX8. A functional Home is not proof that payments, provider observations or customer access have been live verified.
