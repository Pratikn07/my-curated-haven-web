# Admin Console Phase 2 Collections UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the protected collection workflow visually consistent with Recipes while keeping publication, listing, sales and purchased-member effects visibly separate.

**Architecture:** Consume the collection contracts and commands delivered by the [Phase 2 domain plan](2026-10-07-admin-collections-phase-two.md). Reuse the Phase 1 admin shell/record frame; apply the approved UX to collection inventory, editing, comparison, final effect and receipts. Once both protected Publishing attention feeds and safe receipt reads are active, Phase 2 turns `/admin` into a Publishing-only Home; Phase 3 adds its restricted Customer support lane.

**Tech Stack:** Next.js 16, React 19, TypeScript, existing console tokens, collection read/action RPCs, Playwright and the Phase 2 synthetic fixtures.

**Spec:** [Admin console UX design](../specs/2026-10-07-admin-console-ux-design.md), sections 2, 4, 6 and 9–11; [Phase 2 design](../specs/2026-10-06-admin-collections-phase-two-design.md).

## Global Constraints

- Invoke `$unlazy` and write the `AGENTS.md` acceptance ledger before any code change. Recheck the integrated file names and Stage 2 backend gates before editing.
- Domain plan Tasks 3–5 must supply current `collection.read` and strict protected inventory/detail reads before this UI appears. Its Tasks 6–14 own the draft, impact, review, publication, buyer access and receipts; this UI plan does not replace them.
- Do not infer sales from listing or listing from publication. Existing buyers retain protected purchased members; an unknown impact blocks review/publication.
- No customer identity or raw payment fact is required on the collection screen. Keep private draft previews within authenticated, no-store admin routes.
- Preserve Phase 1 recipe functionality and show Collections navigation only to an operator with current `collection.read` and an active useful stage. Keep the existing `/admin` redirect until the Home acceptance gate in Task 4 passes.

## Review Focus

1. A collection is listed but sales disabled: the inventory must show both facts separately (Task 1).
2. A purchased member is dragged or keyboard-moved toward removal: the UI explains protection and the write still denies removal (Task 2).
3. An eight-member draft follows a five-member publication: the preview counts additions correctly and does not suggest an extra purchase (Task 2).
4. A recipe or source asset changes after approval: the final action returns to an updated readiness/impact check (Task 2).
5. Publication commits but refresh is pending: the exact receipt remains retrievable and retry refresh does not publish again (Task 3).

Home also tests the spec's cross-domain threshold: if one authorised attention source fails, the other remains useful and the failure says Unavailable rather than zero (Task 4).

## File responsibility map

| File | UI responsibility |
| --- | --- |
| `my-curated-haven-web/src/components/admin/AdminShell.tsx`, `AdminRecordFrame.tsx` | Add authorised Collections nav and reuse shared record layout |
| `my-curated-haven-web/src/components/admin/collections/CollectionLibrary.tsx`, `CollectionWorkspace.tsx`, `CollectionHistory.tsx` | Inventory, independent states, sources, current/draft/next action |
| `my-curated-haven-web/src/components/admin/collections/CollectionEditor.tsx`, `CollectionContents.tsx` | Explicit save, selected/order controls and protected-member explanation |
| `my-curated-haven-web/src/components/admin/collections/CollectionPreview.tsx`, `CollectionReview.tsx`, `CollectionPublication.tsx` | Published/draft comparison, buyer impact, exact human decision and receipt |
| `my-curated-haven-web/src/app/admin/collections/[collectionId]/page.tsx`, `src/app/admin/collections/[collectionId]/preview/page.tsx`, `src/app/admin/collections/[collectionId]/publish/page.tsx` | Protected detail, comparison and final decision routes |
| `my-curated-haven-web/tests/e2e/admin-collections-{inspection,editing,review,publication,access}.spec.ts` | Browser gates; reuse the domain plan's owned synthetic fixture |
| `my-curated-haven-web/src/lib/admin/home/{contracts,repository}.ts`, `src/components/admin/AdminHome.tsx`, `src/app/admin/page.tsx` | Authorised Publishing Home from recipe and collection attention/receipt reads |
| `supabase/migrations/20261007215900_admin_home_publishing_results.sql`, `supabase/tests/database/56_admin_home_publishing.test.sql` | Bounded current-actor recipe/collection recent results; no private table grant |
| `my-curated-haven-web/tests/e2e/admin-home.spec.ts` | Publishing Home activation, privacy and unavailable-source browser gates |

These component names are the domain plan's exact proposed files. Its functional tasks create most of them; this plan refines those implementations rather than creating duplicate components.

---

### Task 1: Integrate collection inventory and record layout

**Depends on:** Phase 1 UI shell and Phase 2 domain Tasks 3–5.

**Files:** Modify `AdminShell.tsx`, `collections/CollectionLibrary.tsx`, `collections/CollectionWorkspace.tsx`, `collections/CollectionHistory.tsx`, `tests/e2e/admin-collections-inspection.spec.ts`, `admin-collections-access.spec.ts`.

**Interfaces:** Consume `CollectionRow` and `CollectionDetail` from `src/lib/admin/collections/contracts.ts`; distinguish `listingState`, `availability`, `publicationId`, `publishedCount`, `draftCount`, `workingState` and `commerceState` without deriving one from another.

- [ ] Add an authorised-owner and denied-recipe-only browser case. Add listed/sales-disabled, coming-soon, no draft, source-unavailable and 320px card assertions. Run the focused inspection/access browser specs and capture failing new assertions.

```ts
await expect(page.getByText("Listed", { exact: true })).toBeVisible();
await expect(page.getByText("Sales disabled", { exact: true })).toBeVisible();
await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Collections" })).toBeVisible();
```

- [ ] Add Collections to the shell only when the integrated context grants `collection.read`; keep its destination hidden for recipe-only staff. Apply `AdminRecordFrame` to the collection detail with separate Published and Working labels, source/checked-at text, Overview/Contents/Readiness/History sections and a specific next action.
- [ ] Keep search/filter/page in validated URL state and selected-row focus on return. Show published and draft recipe counts independently, commerce availability as its own label, and source failure as unavailable rather than zero.
- [ ] Rerun inspection/access tests in desktop and mobile, plus collection query/decode unit tests, lint and typecheck; commit Task 1 files.

### Task 2: Make editing, comparison and buyer impact legible

**Depends on:** Phase 2 domain Tasks 6–9 and the protected-member impact evaluator.

**Files:** Modify `collections/CollectionEditor.tsx`, `CollectionContents.tsx`, `CollectionPreview.tsx`, `CollectionReview.tsx`, `tests/e2e/admin-collections-editing.spec.ts`, `admin-collections-review.spec.ts`; create `src/app/admin/collections/[collectionId]/preview/page.tsx` as the dedicated private comparison route.

**Interfaces:** Consume `CollectionRevision`, `CollectionSnapshot`, `CollectionImpact` and `CollectionReadiness`. Never reconstruct buyer impact from client-side row counts; use `impact.protectedRecipeIds`, `eligibleBuyerCount`, checks, source revision and digest from the protected evaluator.

- [ ] Test a saved five-to-eight addition, ordered member change, protected-member removal denial, unsupported cover and source-unavailable impact. Run review/editing browser specs first; expect comparison and explanation assertions to fail.
- [ ] Keep the editor's explicit Save, unsaved-navigation prompt, conflict comparison and keyboard move controls. Put Protected purchased recipe explanation at the disabled removal control. A draft may contain an ineligible recipe; the private save succeeds while review/publication is blocked.
- [ ] Build a dedicated authenticated comparison: Published today versus Proposed revision, changed copy/cover/order/member counts, eligible additions, protected removals, current offer consequence, recipe-level blockers, source revision, checked-at time and exact review digest. Use the shared record frame; stacked phone reading order is published then proposed then impact.

```tsx
const added = proposed.members.filter((member) => !published.members.some((old) => old.recipeId === member.recipeId));
return <p>{`Published: ${published.members.length} recipes. Draft: ${proposed.members.length}. ${added.length} additions are proposed.`}</p>;
```

- [ ] State that eligible existing buyers receive approved additions without a new payment only when the protected policy/impact confirms it. Do not promise access from the illustrative count alone. An unknown impact produces a blocker with a safe Retry action.
- [ ] Rerun editing/review specs at desktop/phone and the Phase 2 impact SQL suite, lint and typecheck; commit Task 2 files.

### Task 3: Finish exact publication, history and mobile acceptance

**Depends on:** Phase 2 domain Tasks 10–14 and Tasks 1–2 above.

**Files:** Modify `collections/CollectionPublication.tsx`, `CollectionHistory.tsx`, `src/app/admin/collections/[collectionId]/page.tsx`, `tests/e2e/admin-collections-publication.spec.ts`, `admin-collections-access.spec.ts`; create `src/app/admin/collections/[collectionId]/publish/page.tsx`; update `docs/implementation/admin-collections/GATES.md` with observed results.

**Interfaces:** Use the domain plan's `approveAndPublishCollection`, `refreshCollectionPublication`, `retryCollectionRefresh` and `CollectionReceipt`. Publish from an exact reviewed candidate/base/impact token and show `refreshState` independently.

- [ ] Test a stale protected-member digest, active offer/pending checkout, owner combined action, separated reviewer/publisher roles and a committed receipt with refresh pending. Run focused publication/access browser specs and confirm new assertions fail.

```ts
await expect(page.getByRole("heading", { name: "Review collection effect" })).toBeVisible();
await expect(page.getByText("Refresh pending", { exact: true })).toBeVisible();
```

- [ ] Present `/admin/collections/[collectionId]/publish` as the final decision page with exact version, changed members, buyer effect, offer/checkout effect, source checked-at, human authoriser, reason and the specific permitted action. On conflict, return to Preview & changes with updated evidence; no optimistic success copy.
- [ ] Show durable publication and release IDs, added count and public refresh state. Recovery uses the receipt and refresh-only command. History offers Copy into new draft rather than mutating a purchased release.
- [ ] Verify 320/375px and 200% zoom, keyboard ordering, focus after conflict, no private analytics/replay and no horizontal scrolling. Run Phase 2 browser suite, relevant SQL, lint, typecheck and build. Record exact results in `GATES.md`; commit Task 3 files.

### Task 4: Activate a Publishing-only Home when both feeds are real

**Depends on:** Phase 1 recipe attention/receipt read and Phase 2 domain Tasks 5 and 14; Tasks 1–3 above.

**Files:** Create `src/lib/admin/home/contracts.ts`, `repository.ts`, `src/components/admin/AdminHome.tsx`, `tests/e2e/admin-home.spec.ts`, `supabase/migrations/20261007215900_admin_home_publishing_results.sql`, `supabase/tests/database/56_admin_home_publishing.test.sql`; modify `src/app/admin/page.tsx`, `AdminShell.tsx`, `docs/implementation/admin-collections/GATES.md`.

**Interfaces:** `loadAdminHome(context: AdminContext)` returns separate recipe and collection attention envelopes with `state:"ready"|"unavailable"|"unauthorised"`, bounded safe rows, count from the same authorised inventory query and checked-at time. `admin_home_publishing_results(10)` returns at most ten safe same-actor committed recipe/collection publication receipts, no private request JSON. Continue work uses current authorised working revisions only.

- [ ] Add SQL/browser cases for recipe-only, collection-only, owner, revoked and `aal1` actors; two active feeds, one unavailable feed, zero authorised rows, current drafts and a committed refresh-pending receipt. Run suite 56 and `admin-home.spec.ts` before implementation.
- [ ] Add the narrow read RPC over committed recipe/collection operation ledgers. Check current DB membership, `aal2`, exact domain read permission and stage for each returned row; return operation ID, safe object reference, action/result and time only. Limit to ten, sort newest first and grant no direct table SELECT.
- [ ] Query recipe `view:"attention"` and collection `attention:true` independently only when permitted. Use the inventory's `filteredTotal`/`total` for counts; order safety/availability blockers before submitted review and eligible publication, with each row's age/last change visible. A rejected source yields Unavailable, not zero. Show Publishing, Continue work and Recent results; omit Customer support until that protected domain is active.

```ts
const feeds = [
  context.operator.permissions.includes("recipe.read") ? loadRecipeAttention() : Promise.resolve(null),
  context.operator.permissions.includes("collection.read") ? loadCollectionAttention() : Promise.resolve(null),
];
const [recipes, collections] = await Promise.allSettled(feeds);
```

- [ ] Switch `/admin` from redirect to Home only after the two real source integrations and this gate pass. Keep the authorised inventory link for an empty lane, safe result links that recheck permission, and no synthetic future modules. Test 320/375px, 200% zoom, keyboard focus, no overflow or admin analytics/replay.
- [ ] Register suite 56 in the owned DB runner/CI. Run Home and prior admin browser specs, suite 56, lint, typecheck and build. Record exact results in `GATES.md`; commit Task 4 files.

## Handoff

The [Phase 3 UI plan](2026-10-07-admin-console-phase-three-ui.md) adds restricted Customer support to this Publishing Home after its queue and receipt reads are integrated. This phase closes UX4 and the first Home version of UX1, plus collection portions of UX2/UX7/UX8; no collection screen alone proves customer access or production readiness.
