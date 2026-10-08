# Admin Console Phase 1 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the working recipe admin screens into the approved, accessible recipe workspace with a dedicated Preview & changes step and a truthful final publication decision.

**Architecture:** Keep the Phase 1 database and server actions authoritative. Add presentation components and two protected recipe routes around the current detail/editor flow; use existing snapshots, digest, review and impact contracts. Do not activate a Home page until the later-phase attention feeds exist.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, existing CSS tokens/Tailwind, Supabase RPCs, Playwright and the existing admin SQL fixture harness.

**Spec:** [Admin console UX design](../specs/2026-10-07-admin-console-ux-design.md), sections 2, 4, 5 and 9–11. Domain authority remains in [Phase 1 design](../specs/2026-10-04-admin-recipe-workspace-design.md) and [Phase 1 implementation plan](2026-10-04-admin-recipe-workspace.md).

## Global Constraints

- Before the first product-code edit, invoke `$unlazy`, create the `AGENTS.md` acceptance ledger, and inspect the then-current branch, migrations and Phase 1 remediation status.
- Coordinate with [Phase 1 audit remediation](2026-10-07-admin-phase-one-audit-remediation.md): its Team, library, history, withdrawal and WebKit fixes own those functional gaps. Apply this UI plan against their integrated interfaces; do not overwrite parallel changes.
- Preserve the Phase 1 `/admin` → `/admin/recipes` redirect and show only authorised Recipes and owner-only Team navigation. No synthetic Home, Collections, Support or Campaigns links.
- Private pages and actions still require current database membership, `aal2`, stage and capability. Visual hiding never grants authority. Keep private content out of analytics, replay, public URLs and shared caches.
- A saved draft does not alter the public recipe. A reviewed publication is an exact, fresh decision; a committed write with pending refresh must not be submitted twice.
- Test only against the owned local synthetic fixture stack. Do not infer deployment from a local build or PR check.

## Review Focus

1. A viewer or revoked editor reaches a private deep link: the route shows the correct denied/MFA state and no draft data (Tasks 1, 3, 6).
2. A 320px phone or 200% zoom opens a long recipe: navigation, comparison and the primary action remain visible without horizontal page scrolling (Tasks 1, 3, 6).
3. A saved legacy ingredient or instruction shape cannot be safely rendered: Preview names the unavailable portion and editing preserves the original JSON (Task 3).
4. Impact or approved digest changes between preview and final confirmation: the page blocks publication and returns to fresh comparison (Task 4).
5. Publication commits but the browser loses the response or refresh fails: the operator retrieves the committed operation and retries only refresh (Task 4).

## File responsibility map

| File | Responsibility |
| --- | --- |
| `my-curated-haven-web/src/components/admin/AdminShell.tsx` | Permission-scoped shell, active navigation, public-site and sign-out exits |
| `my-curated-haven-web/src/components/admin/AdminRecordFrame.tsx`, `AdminState.tsx` | Reusable header/evidence/action layout and words for private states |
| `my-curated-haven-web/src/styles/admin.css`, `src/app/globals.css` | Scoped console density and responsive layout using existing tokens |
| `my-curated-haven-web/src/components/admin/AdminLibrary.tsx`, `AdminInspection.tsx`, `AdminRecipeUsage.tsx` | Recipe inventory, readable detail/usage and next-action placement |
| `my-curated-haven-web/src/lib/admin/recipe-display.ts`, `src/components/admin/AdminRecipePreview.tsx`, `AdminRecipeChanges.tsx` | Read-only saved-snapshot rendering and structured field changes |
| `my-curated-haven-web/src/app/admin/recipes/[recipeId]/preview/page.tsx` | Protected dedicated Preview & changes route |
| `my-curated-haven-web/src/app/admin/recipes/[recipeId]/publish/page.tsx`, `src/components/admin/AdminRecipeDecision.tsx` | Fresh final publication effect and operation receipt presentation |
| `my-curated-haven-web/src/components/admin/AdminRecipeEditor.tsx`, `AdminRecipeReview.tsx`, `AdminRecipePublication.tsx`, `AdminTeam.tsx` | Connect existing save/review/publish/Team actions to the new layout |
| `my-curated-haven-web/tests/e2e/admin-{access,inspection,editing,review,publication}.spec.ts`, `tests/admin/recipe-display.test.mjs` | Permission, keyboard, mobile, preview and exact-action regression |

`my-curated-haven-web` is the web package; commands below run there unless noted. Use the actual integrated interface names if remediation has changed them, and record that adjustment in the acceptance ledger before editing.

---

### Task 1: Build the honest shell and shared record layout

**Files:** Modify `src/components/admin/AdminShell.tsx`, `src/app/globals.css`, `tests/e2e/admin-access.spec.ts`; create `src/components/admin/AdminRecordFrame.tsx`, `AdminState.tsx`, `src/styles/admin.css`.

**Interfaces:** `AdminShell` consumes the current `AdminContext`; `AdminRecordFrame` receives `title`, `liveState`, `workingState`, `checkedAt`, `actions` and `children` as display-only props. Later phases may reuse the frame without importing recipe actions.

- [ ] Add a browser case for viewer versus owner navigation, current-page indication, public-site/sign-out links and 320px overflow. Run `npm run test:e2e -- tests/e2e/admin-access.spec.ts --project=chromium-desktop`; expect the new shell assertions to fail.

```ts
await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Recipes" })).toHaveAttribute("aria-current", "page");
await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Collections" })).toHaveCount(0);
```

- [ ] Compose the existing permission-scoped links as labelled navigation, reuse `SignOutButton` from `src/components/account`, and style a compact left column on desktop and wrapped labelled rows on phone. The shell must show current operator and link to the public site. Do not make the stage label look like a success badge.

```tsx
const links = [{ href: "/admin/recipes", label: "Recipes", allowed: context.operator.permissions.includes("recipe.read") }];
if (context.operator.permissions.includes("team.manage")) links.push({ href: "/admin/team", label: "Team", allowed: true });
```

- [ ] Add `AdminRecordFrame` with a semantic heading, separate Live and Working labels, a checked-at/source line, a main evidence region and an action aside that precedes long evidence in phone reading order. Scope CSS under `.admin-console`; use `--canvas`, `--surface`, `--action`, `--border-control`, `--focus`, spacing and radius tokens. Preserve the existing global focus ring.
- [ ] Rerun access browser cases at desktop and 320px, then `npm run lint` and `npm run typecheck`. Commit only Task 1 files.

### Task 2: Make the library and inspection readable

**Depends on:** Task 1 and remediation Tasks 4 and 6.

**Files:** Modify `src/components/admin/AdminLibrary.tsx`, `AdminInspection.tsx`, `src/app/admin/recipes/page.tsx`, `src/app/admin/recipes/[recipeId]/page.tsx`, `tests/e2e/admin-inspection.spec.ts`; create `src/components/admin/AdminRecipeUsage.tsx`.

**Interfaces:** Consume `LibraryResult`, `RecipeDetail`, `Usage` and `HistoryPage`; keep `parseLibraryQuery` and `safeAdminReturn` as URL guards. Use the paged history contract from remediation.

- [ ] Add a fixture browser test that searches, filters, paginates, opens a recipe and returns to the same selected row with focus. Assert distinct empty, no-match and source-unavailable states and a campaign-source-unknown usage message. Run the focused desktop inspection spec and see those assertions fail first.
- [ ] Style desktop rows and mobile labelled cards with image/missing-image state, publication, review/readiness, collection reference, change time and Open action. Counts come from the same `LibraryResult` as rows; a failed result must not render zero.
- [ ] Use `safeAdminReturn` for the detail and edit routes before appending `selected`; render usage as labelled free-slot, collection/release and campaign sections with source freshness. History shows actor, action, reason and result with the remediation cursor control. Keep `recipeId` in the private route but never append draft text or email to query strings.

```ts
const base = safeAdminReturn(typeof query.returnTo === "string" ? query.returnTo : null);
const url = new URL(base, "https://admin.local");
url.searchParams.set("selected", recipeId);
const returnTo = `${url.pathname}${url.search}`;
```

- [ ] Rerun inspection on desktop/mobile and add a malicious external `returnTo` case. Run `npm run test:admin:unit`, `npm run lint`, `npm run typecheck`; commit Task 2 files.

### Task 3: Connect the editor to dedicated Preview & changes

**Depends on:** Tasks 1–2 and remediation Task 7's saved-input gate.

**Files:** Create `src/lib/admin/recipe-display.ts`, `src/components/admin/AdminRecipeChanges.tsx`, `src/app/admin/recipes/[recipeId]/preview/page.tsx`, `tests/admin/recipe-display.test.mjs`; modify `AdminRecipeEditor.tsx`, `AdminRecipePreview.tsx`, `tests/e2e/admin-editing.spec.ts` and `admin-review.spec.ts`.

**Interfaces:** `toRecipeDisplay(snapshot: RecipeSnapshot): {ok:true;ingredients:{text:string}[];steps:{step:number;text:string}[]} | {ok:false;reason:string}` returns typed ordered rows or an explicit unsupported-content result. `AdminRecipeChanges` consumes `diffSnapshots(active, working.snapshot)`; it never writes. The route loads `getAdminContext()`, `loadAdminRecipe(recipeId)` and fresh `loadAdminImpact(recipeId)` under current authority and renders only a saved `working` revision.

- [ ] Test malformed/legacy body data, missing image, long steps, unchanged fields and a saved private title. Test a denied viewer and 320px comparison. Run the new unit test and focused editing/review browser specs; expect the missing route and conversion to fail.
- [ ] Make the editor show Unsaved changes, Saving, Saved at, Failed and Conflict states with the current explicit Save. After a successful save, link to `/admin/recipes/[recipeId]/preview`; no unsaved candidate is smuggled through a URL. Preserve the current in-memory failed-save and conflict-rebase behavior.
- [ ] Render Published today and Proposed revision side by side on desktop and in that order on phone. Convert only supported structured fields to readable lists using existing `formatIngredient`/`normalizeInstructions` semantics; give each panel unique heading IDs and label unsupported values rather than serialising JSON into the reading surface. Show structured field/order/image-alt changes and version/digest in the impact panel.

```tsx
if (!detail.working) return <AdminState kind="empty" message="No saved working revision to preview." />;
return <AdminRecipeChanges active={detail.active} candidate={detail.working.snapshot} revision={detail.working} />;
```

- [ ] Keep a reviewer path from Preview to the existing exact submission/decision controls. Add a changed-after-approval test: the old approval remains in history but no longer makes the new digest publishable. Rerun unit/browser specs, lint and typecheck; commit Task 3 files.

### Task 4: Give publication a final effect page and receipt recovery

**Depends on:** Task 3 and remediation Tasks 1–3.

**Files:** Create `src/app/admin/recipes/[recipeId]/publish/page.tsx`, `src/components/admin/AdminRecipeDecision.tsx`, a forward-only `supabase/migrations/20261007215500_admin_recipe_receipt_read.sql`, `supabase/tests/database/59_admin_recipe_receipts.test.sql`; modify `src/components/admin/AdminRecipePublication.tsx`, `src/lib/admin/context.ts`, `src/lib/admin/actions.ts`, `tests/e2e/admin-publication.spec.ts` and the owned admin DB runner/CI discovery.

**Interfaces:** `loadAdminRecipeOperations(recipeId): Promise<Result<MutationReceipt[]>>` returns at most ten recent committed publish/withdraw receipts for the current actor and recipe, using DB-derived actor, current membership, `aal2` and `recipe.read`. A specific operation ID can be matched within that bounded list after reload. The final page loads the current detail and impact, displays the exact candidate/base/affected references, and calls the existing publish action with a fresh `impactToken`; the DB checks the token again under its locks.

- [ ] Write SQL cases for bounded same-actor receipt recovery, cross-actor/recipe denial, revoked membership and `aal1` denial. Add browser cases for stale impact, unknown campaign usage, commit-plus-refresh failure and lost-response reload. Run suite 59 and the focused publication spec; expect the new read/page assertions to fail.
- [ ] Add a narrow authenticated read RPC over `private.admin_operations` scoped to the requesting actor, target recipe and publication/withdrawal action, sorted by committed time and capped at ten. Return only committed receipts, not request payloads or unrelated audits. Wire a strict server decoder; never grant direct table SELECT to the browser role.
- [ ] Move publication confirmation out of inspection into `/publish`. `AdminRecipeDecision` presents evidence and embeds the existing `AdminRecipePublication` command handler instead of making a second publisher. The page names changed fields, exact revision/version/digest, current live state, free/collection/campaign impact, checked-at time, reason and permitted actor action. A failed/unknown material check disables the write. The action re-reads impact immediately before submitting, and `CONFLICT` returns to Preview & changes with the changed fact named.

```tsx
const blocked = !detail.working || detail.working.state !== "approved" ||
  detail.readiness.checks.some((check) => check.severity === "blocker" && check.state !== "pass");
return <button type="submit" disabled={blocked || pending}>Publish this approved revision</button>;
```

- [ ] Show committed version and operation reference after success. If refresh is pending, retain the operation ID in page state. After reload, use `loadAdminRecipeOperations` to show the actor's latest committed receipt and its refresh status as **Unconfirmed** until a check/retry supplies fresh evidence; recovery invokes only `retryRefreshAction`, never `publishRevisionAction`. Keep withdrawal's separate emergency/acknowledgement flow and exact fresh-impact guard from remediation.
- [ ] Register suite 59 in the owned admin DB runner/CI discovery. Rerun receipt SQL, publication/review/browser specs on desktop and mobile, `npm run lint`, `npm run typecheck`; commit Task 4 files. Do not call a pending refresh "Published everywhere."

### Task 5: Finish the owner Team presentation

**Depends on:** Task 1 and remediation Task 5.

**Files:** Modify `src/components/admin/AdminTeam.tsx`, `src/app/admin/team/page.tsx`, `tests/e2e/admin-access.spec.ts`.

**Interfaces:** Consume the remediation `listStaff()` typed owner read and existing exact lookup/assignment/revocation actions. Role names describe Phase 1 recipe capabilities only; later capabilities remain separately granted.

- [ ] Add a browser test for confirmed exact-account lookup, role explanation, reasoned assignment, active/revoked row and immediate non-owner denial. Run the access spec; expect the presentation assertions to fail.

```ts
await expect(page.getByRole("heading", { name: "Current team" })).toBeVisible();
await expect(page.getByRole("button", { name: "Revoke access" })).toBeVisible();
```

- [ ] Group search, selected account, capability explanation, required reason, final confirmation and current members. Show grant/revoke actor and time from authoritative rows. Preserve ambiguous/unconfirmed/unavailable lookup states and prevent duplicate submission.
- [ ] Rerun access browser spec, lint and typecheck; commit Task 5 files.

### Task 6: Verify the complete Phase 1 UI journey

**Depends on:** Tasks 1–5 and audit-remediation acceptance A1–A7.

**Files:** Extend `tests/e2e/admin-{access,inspection,editing,review,publication,privacy}.spec.ts`; update `docs/implementation/admin-recipes/GATES.md` with observed evidence only.

- [ ] Run the synthetic owner journey: library → detail → edit → save/reload → Preview & changes → submit/review exact digest → final effect → publish → public recipe → receipt/refresh history. Check viewer/editor/reviewer/publisher/owner authority separately, including immediate revocation and `aal1` denial.
- [ ] Test 320 and 375 CSS pixels, 200% zoom, keyboard-only focus order, visible labels, 44px touch targets, no horizontal page overflow and `@axe-core/playwright` critical violations. Test malformed body, source outage, stale impact, save conflict, refresh pending and selected-row return focus.
- [ ] Run the focused admin SQL suites, `npm run test:admin:unit`, all admin Playwright specs in `chromium-desktop`, `chromium-mobile` and `webkit-mobile`, then `npm run lint`, `npm run typecheck` and `npm run build`. Record exact commands/results in `GATES.md`; resolve failures before claiming the UI complete.
- [ ] Review the changed files and the UX design gates UX2, UX3, UX7 and UX8 against actual browser evidence. Commit only the test/evidence files that changed. Release or deployment remains a separate, authorised phase decision.

## Handoff to later UI plans

After Phase 1 is integrated, implement [Collections UI](2026-10-07-admin-console-phase-two-ui.md), [Support UI](2026-10-07-admin-console-phase-three-ui.md), then [Campaigns and reports UI](2026-10-07-admin-console-phase-four-ui.md) as their protected domain contracts land. Home is introduced by the Phase 2 plan only when two real authorised feeds are available; Phase 3 adds its restricted support lane. Each later plan tests UX1/UX2/UX7/UX8 as applicable.
