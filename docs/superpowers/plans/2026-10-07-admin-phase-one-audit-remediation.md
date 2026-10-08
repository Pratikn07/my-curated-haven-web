# Admin Phase One Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the seven confirmed gaps in the Phase One admin recipe workspace before treating the Phase One pull request as release ready.

**Architecture:** Keep the database as the authority for permissions, revision identity, publication, withdrawal, impact, and history. Add forward-only SQL migrations and focused regression fixtures, then connect existing server actions to complete owner-facing workflows. Preserve the active public recipe until an atomic publish succeeds.

**Tech Stack:** PostgreSQL/Supabase migrations and pgTAP; Next.js 16, React 19, TypeScript; Playwright on Chromium desktop, Chromium mobile, and WebKit mobile.

**Spec:** [Approved Phase One design](../specs/2026-10-04-admin-recipe-workspace-design.md).

**Audit target:** [Phase One implementation PR #99](https://github.com/Pratikn07/my-curated-haven-web/pull/99) at audited head `45ca05941efd9ce7bfc0e897e0b9048b00b22750`. Recheck its head before implementation. This plan can merge to `main` independently; its code paths and migrations describe PR #99 and are not yet present on `main`.

## Global Constraints

- The console is for existing recipes only. Phase One does not create recipes, edit prices, alter free slots or collection membership, change entitlements, or author campaigns.
- Derive the actor from `auth.uid()` and current database membership. Require `aal2` for protected operations; owner alone manages Team and emergency withdrawal.
- A save changes only the working revision. A reviewed, exact-digest publication changes the public projection atomically and preserves the prior active content and audit trail.
- A missing or unavailable impact or asset check blocks the relevant operation. Never interpret an unknown dependency as an empty one.
- Keep committed migrations immutable; use new timestamped migrations to replace functions and evolve tables. Do not reset or modify a shared or production database to test this plan.
- Before the first code edit, invoke and follow `$unlazy` and create the implementation acceptance ledger required by `AGENTS.md`. Keep unrelated user work unstaged.

## Review Focus

1. A published campaign references a recipe that has no free slot: ordinary withdrawal must require the owner to acknowledge that campaign and must reject a stale impact token (Task 1).
2. A client substitutes another storage path while keeping an approved revision ID and digest: verification and publication must reject the substituted object (Task 2).
3. A catalog recipe has no `recipe_bodies` row: the first reviewed publish must create version 1 exactly once, with no public change on failure (Task 3).
4. More than 25 audit events, including events with equal timestamps: pages must be bounded, stable, non-overlapping, and complete (Task 4).
5. A mobile editor input is filled before hydration: the saved revision must contain the typed title, or the UI must make the editor unavailable until it can retain input (Task 7).

## Acceptance ledger

| Gate | Requested outcome | Closing evidence |
| --- | --- | --- |
| A1 | Campaign references govern withdrawal | SQL test for campaign-only recipe, acknowledgement, stale token, missing snapshot; owner UI names affected campaign |
| A2 | Asset proof belongs to the saved revision | Forged path/object tests and a legitimate check/publish test; no privileged path derived from client snapshot |
| A3 | First publication works without a body row | SQL first-publish and injected-fault rollback tests; public page remains unchanged until commit |
| A4 | Team can inspect and revoke access | Owner browser flow shows active/revoked assignments, actor/time and reasoned revoke; non-owner denied |
| A5 | Library and inspection are usable | Search, filters, pagination and readable usage/history work at desktop and narrow widths, retaining URL state and focus |
| A6 | History is genuinely paged | Database and browser tests cover 26+ events, equal timestamps and invalid cursors |
| A7 | WebKit editor is reliable | Root cause demonstrated with trace; exact failed flow green in WebKit mobile and complete admin browser suite |
| Release | Phase One meets its original gates | All A1–A7 plus R1–R12 reconciled in `GATES.md`, owner walkthrough of synthetic screens, green PR checks; deploy/runtime verification is a separate authorized release step |

## File responsibility map

| File or group | Responsibility |
| --- | --- |
| `supabase/migrations/20261007010000_admin_campaign_withdraw_guard.sql` | Populate trusted campaign usage and bind withdrawal to a fresh impact token under the existing locks |
| `supabase/migrations/20261007011000_admin_asset_identity_guard.sql` | Bind a checked storage object to the saved revision's expected bucket/name; close the old recording route |
| `supabase/migrations/20261007012000_admin_first_body_publish.sql` | Create or update `recipe_bodies` in the same publication transaction |
| `supabase/migrations/20261007013000_admin_history_pagination.sql` | Implement one stable keyset cursor and bounded detail preview |
| `supabase/tests/database/17_admin_phase_one_remediation.test.sql` | SQL regressions for campaigns, asset identity, first body and pagination; split only if fixture isolation requires it |
| `my-curated-haven-web/src/lib/admin/{contracts,recipes,assets,actions,context}.ts` | Type and server boundaries for impact, assets, Team list and history |
| `my-curated-haven-web/src/components/admin/{AdminTeam,AdminLibrary,AdminInspection,AdminRecipePublication}.tsx` | Owner-facing controls and state; add small focused child components if these files become hard to review |
| `my-curated-haven-web/src/app/admin/{team,recipes,recipes/[recipeId]}/page.tsx` | Load and validate route state before rendering |
| `my-curated-haven-web/tests/e2e/admin-{access,inspection,editing,publication}.spec.ts` | Browser regressions, accessibility and mobile verification |
| `docs/implementation/admin-recipes/GATES.md` and `ops/ADMIN-CONSOLE.md` | Evidence ledger, operating steps and rollback wording |

The four migration filenames are proposed next timestamps; check for newer migrations before creating them. All steps below run from the repository root unless a command begins with `cd my-curated-haven-web`.

---

### Task 1: Campaign-aware withdrawal and fresh impact confirmation

**Files:** Create `supabase/migrations/20261007010000_admin_campaign_withdraw_guard.sql`; test `supabase/tests/database/17_admin_phase_one_remediation.test.sql`; modify `my-curated-haven-web/src/lib/admin/contracts.ts`, `my-curated-haven-web/src/lib/admin/recipes.ts`, `my-curated-haven-web/src/components/admin/AdminRecipePublication.tsx`, and `my-curated-haven-web/tests/e2e/admin-publication.spec.ts`.

**Interfaces:** `admin_recipe_usage(recipe_id)` returns `Usage.campaigns` from the current recorded campaign snapshot and sets `sourceRevision` to that deployment revision. If no valid snapshot is recorded, `sourceRevision` is null and readers display an unavailable campaign check; write paths reject it. `WithdrawCommand` gains `impactToken: string`; `withdrawAdminRecipe` passes `impact_token` to `admin_recipe_withdraw`.

The SQL write guard must test campaign references themselves, not use free slots as a proxy:

```sql
IF usage->>'sourceRevision' IS NULL THEN
  RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADM_BLOCKED';
END IF;
SELECT EXISTS (SELECT 1 FROM jsonb_array_elements(usage->'campaigns')) INTO camp_refs;
IF (p_command->>'impact_token') IS DISTINCT FROM token THEN
  RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
END IF;
```

- [ ] Add a fixture whose published campaign includes the target slug in `recipeSlugs` while `free_recipe_slots` has no matching row. Assert `admin_recipe_usage` reports the campaign and ordinary publisher withdrawal fails. Assert owner acknowledgement succeeds only with a matching impact token. Change the campaign revision between impact read and withdrawal and assert `ADM_CONFLICT` with no archive, publication, or audit mutation. Assert a missing current snapshot yields `sourceRevision: null`, a visible unavailable read state, and a blocking impact/withdrawal error. Add the owner confirmation browser assertion naming the campaign.
- [ ] Run `cd my-curated-haven-web && node scripts/test-admin-db.mjs --workdir . 17_admin_phase_one_remediation.test.sql`; the new campaign cases must fail before the migration. Run the focused browser test using `npm run test:e2e -- tests/e2e/admin-publication.spec.ts --project=chromium-desktop` once the local app/DB fixture is ready.
- [ ] In the new migration, replace `admin_recipe_usage` to read `admin_console_settings.campaign_revision` and its matching `admin_campaign_snapshots.configuration`. Filter published campaigns containing the recipe slug; include slug, status, recipeSlugs, promisedCount and deploymentRevision. Represent an absent/malformed snapshot with `sourceRevision: null` so recipe inspection remains available, but make `admin_recipe_impact`, `admin_revision_publish`, and `admin_recipe_withdraw` fail closed on that value. Replace `admin_recipe_withdraw` so `camp_refs` is derived from `usage->'campaigns'` (and retain the separate free-slot promise guard), recompute the same digest shape as `admin_recipe_impact` while holding its dependency locks, and compare `impact_token` before writing. Continue to require owner plus acknowledgement for a public promise; continue to require owner emergency authority for sealed/commercial exposure. Pass the returned token from the confirmation load through the TypeScript command and show the actual impacted names before acknowledgement.
- [ ] Rerun the focused SQL and browser cases. Verify both negative cases leave the active recipe and audit count unchanged. Stage the migration, SQL test, command contract, recipe service, publication component and browser spec named above; commit with `git commit -m "fix: bind recipe withdrawal to campaign impact"`.

### Task 2: Bind asset checks to a saved revision and its storage name

**Files:** Create `supabase/migrations/20261007011000_admin_asset_identity_guard.sql`; modify `my-curated-haven-web/src/lib/admin/assets.ts`, `my-curated-haven-web/src/lib/admin/actions.ts`, `my-curated-haven-web/src/lib/admin/contracts.ts`, `supabase/tests/database/17_admin_phase_one_remediation.test.sql`, and `my-curated-haven-web/tests/e2e/admin-editing.spec.ts`.

**Interfaces:** `verifyAdminAsset(recipeId: string, revisionId: string)` loads the saved revision server-side and returns the existing `{objectId, checkedAt, available}` shape. The database recorder checks `revision_id`, `digest`, bucket, object name and object ID against the stored revision and `storage.objects`. Publication verifies the same identity again inside its transaction.

The action boundary accepts identifiers, never a client snapshot:

```ts
const saved = await loadAdminRevision(recipeId, revisionId);
if (!saved.ok) return saved;
const parsed = parseRecipeAsset(saved.value.snapshot.image.path, supabaseOrigin);
```

- [ ] Add a SQL case with approved revision A pointing to object A and existing object B. Attempt to record/check object B for A, then publish; both must fail. Include a valid A check/publish and an object replacement or version change after checking. Add a browser action test passing a forged revision object/path and prove the server ignores it or returns `INVALID`.
- [ ] Run `cd my-curated-haven-web && node scripts/test-admin-db.mjs --workdir . 17_admin_phase_one_remediation.test.sql`; the forged-object assertion must fail on the old recorder. Run `npm run test:e2e -- tests/e2e/admin-editing.spec.ts --project=chromium-desktop` for the action boundary.
- [ ] Change the action to accept only recipe and revision UUIDs. Load that revision through `loadAdminRevision(recipeId, revisionId)` on the authenticated server path, then parse **its saved** `snapshot.image.path` with `parseRecipeAsset`. Query storage by `bucket_id='recipe-previews' AND name=$1`; check the public object URL derived from that saved name. In the migration, add the checked object name/bucket to `recipe_asset_checks`, replace the private recorder with a signature that validates revision digest and saved path identity, and make the old signature unavailable. On publication, compare the latest fresh check's name/bucket with the saved candidate and the locked `storage.objects` row, as well as ID/version. Use one canonical path-to-name policy across server and SQL, including full same-origin URLs and `recipe-previews/` paths; reject encodings the SQL guard cannot normalize unambiguously.
- [ ] Rerun focused SQL and browser cases, including valid image verification. Commit the exact task files with `git commit -m "fix: bind admin asset checks to saved revisions"`.

### Task 3: Atomic first publication of a catalog-only recipe

**Files:** Create `supabase/migrations/20261007012000_admin_first_body_publish.sql`; extend `supabase/tests/database/17_admin_phase_one_remediation.test.sql` and `my-curated-haven-web/tests/e2e/admin-publication.spec.ts`.

**Interfaces:** `admin_revision_publish` keeps its JSON command/receipt contract. A missing `recipe_bodies` row becomes version 1; an existing row increments exactly once.

The body write should return the committed version from the upsert, not from a prior `SELECT` that can find no row:

```sql
INSERT INTO public.recipe_bodies (recipe_id, content_version, ingredients, instructions, yield,
  yield_structured, reviewed_notes, allergen_review_state, allergens, storage_notes)
VALUES (cmd_recipe, 1, candidate->'body'->'ingredients', candidate->'body'->'instructions',
  candidate->'body'->>'yield', candidate->'body'->'yieldStructured',
  candidate->'body'->>'reviewedNotes', candidate->'body'->>'allergenReviewState',
  CASE WHEN candidate->'body'->'allergens' IS NULL OR candidate->'body'->'allergens' = 'null'::jsonb
    THEN NULL ELSE ARRAY(SELECT jsonb_array_elements_text(candidate->'body'->'allergens')) END,
  candidate->'body'->>'storageNotes')
ON CONFLICT (recipe_id) DO UPDATE SET
  content_version = public.recipe_bodies.content_version + 1,
  ingredients = EXCLUDED.ingredients, instructions = EXCLUDED.instructions,
  yield = EXCLUDED.yield, yield_structured = EXCLUDED.yield_structured,
  reviewed_notes = EXCLUDED.reviewed_notes, allergen_review_state = EXCLUDED.allergen_review_state,
  allergens = EXCLUDED.allergens, storage_notes = EXCLUDED.storage_notes, updated_at = now()
RETURNING content_version INTO new_version;
```

- [ ] Add a catalog-only draft fixture with no `recipe_bodies` row. Save a complete body, submit/approve/check image, publish, and assert body version 1, one review record, one archive, one audit event and published public content. Inject the existing publication fault before commit and assert no body/catalog/review/archive mutation. Repeat an operation ID and assert no second version.
- [ ] Run `cd my-curated-haven-web && node scripts/test-admin-db.mjs --workdir . 17_admin_phase_one_remediation.test.sql`; the first-publish assertion must fail on the current `UPDATE`-only path.
- [ ] In a new `CREATE OR REPLACE FUNCTION public.admin_revision_publish` migration, retain all existing authorization, review, impact, lock, asset and archive checks. Replace the `SELECT ... INTO new_version` plus `UPDATE` with an `INSERT ... ON CONFLICT (recipe_id) DO UPDATE ... RETURNING content_version INTO new_version` based on the candidate body; set 1 on insert and `recipe_bodies.content_version + 1` on conflict. Keep the body upsert, catalog projection and review/audit writes in the same transaction. Confirm table constraints and trigger behavior before finalizing the statement.
- [ ] Rerun the SQL case, existing `16_admin_recipe_publication.test.sql`, and focused browser publication flow. Commit task files with `git commit -m "fix: publish first recipe body atomically"`.

### Task 4: Bounded history with a stable cursor

**Files:** Create `supabase/migrations/20261007013000_admin_history_pagination.sql`; modify `my-curated-haven-web/src/lib/admin/context.ts`, `my-curated-haven-web/src/components/admin/AdminInspection.tsx`, `my-curated-haven-web/src/app/admin/recipes/[recipeId]/page.tsx`, and the SQL/browser inspection tests.

**Interfaces:** `admin_recipe_history(recipe_id, cursor, limit)` returns `{events, nextCursor}`. Cursor encodes **both** `(at, id)` with a validated, opaque string; detail returns the first bounded page through the same helper. `loadAdminHistory(recipeId, cursor)` already exists.

The SQL page must limit rows **before** aggregation and use both sort keys:

```sql
SELECT a.id, a.at, a.action
FROM private.admin_audit a
WHERE a.recipe_id = p_recipe_id
  AND (p_cursor IS NULL OR (a.at, a.id) < (cursor_at, cursor_id))
ORDER BY a.at DESC, a.id DESC
LIMIT lim + 1;
```

- [ ] Insert 27+ audit events for one recipe, including two with identical `at`. Assert detail returns at most 25, page 1 and page 2 have no repeated IDs and together cover all events, a bad cursor is `ADM_INVALID`, and a different recipe cannot leak events. Assert nextCursor is non-null exactly when another page exists.
- [ ] Run `cd my-curated-haven-web && node scripts/test-admin-db.mjs --workdir . 17_admin_phase_one_remediation.test.sql`; the current all-event detail or null-cursor assertions must fail.
- [ ] Use keyset ordering `(at DESC, id DESC)` and fetch `limit + 1` rows before JSON aggregation. Encode last emitted row as a strict timestamp/UUID cursor and decode it defensively; filter later pages using `(a.at,a.id) < (cursor_at,cursor_id)`. Make `admin_recipe_detail` call the same bounded page routine rather than aggregating all history. Render a “Load older history” control using `loadAdminHistory`, preserving current events and showing a recoverable error on failure. Show action, actor, time, reason and result in readable labels, without leaking raw UUIDs as the only explanation.
- [ ] Rerun SQL and inspection browser tests. Commit the exact task files with `git commit -m "fix: page admin recipe history"`.

### Task 5: Finish owner Team management

**Files:** Modify `my-curated-haven-web/src/lib/admin/actions.ts`, `my-curated-haven-web/src/app/admin/team/page.tsx`, `my-curated-haven-web/src/components/admin/AdminTeam.tsx`, and `my-curated-haven-web/tests/e2e/admin-access.spec.ts`.

**Interfaces:** `listStaff(): Promise<Result<StaffRow[]>>` calls `admin_staff_list`; `AdminTeam` receives the initial typed list. Existing `revokeStaff({userId,reason,operationId})` remains the write interface.

The page loads staff through the owner-scoped RPC before rendering:

```ts
const staff = await listStaff();
if (!staff.ok) return <p role="status">Team list unavailable. Try again.</p>;
return <AdminTeam initialStaff={staff.value} />;
```

- [ ] Add an owner browser flow asserting an active assignment's roles, grant actor/time, a reasoned revoke confirmation, then revoked status/actor/time after refresh. Add a non-owner page/RPC denial and owner self-revoke protection check. Keep exact-email lookup; do not add a broad customer directory.
- [ ] Run `cd my-curated-haven-web && npm run test:e2e -- tests/e2e/admin-access.spec.ts --project=chromium-desktop`; the list/revoke UI assertions must fail before implementation.
- [ ] Add the typed list server action using `adminRpc` and `admin_staff_list`, load it in `team/page.tsx`, and render active and revoked rows. Give each active non-owner row a Revoke action with visible identity, required reason and final confirmation; disable duplicate submissions, preserve form state on error, and reload the authoritative list on success. Show permission/unavailable states without displaying private customer data beyond the existing staff row.
- [ ] Rerun owner and non-owner tests and the SQL access test `11_admin_console_access.test.sql`. Commit exact task files with `git commit -m "feat: complete owner team listing and revocation"`.

### Task 6: Complete the library and inspection workflow

**Files:** Modify `my-curated-haven-web/src/components/admin/AdminLibrary.tsx`, `my-curated-haven-web/src/components/admin/AdminInspection.tsx`, `my-curated-haven-web/src/app/admin/recipes/page.tsx`, and `my-curated-haven-web/tests/e2e/admin-inspection.spec.ts`. Add a focused `AdminLibraryControls.tsx` or `AdminUsage.tsx` only if it keeps state handling simpler.

**Interfaces:** Use the existing `parseLibraryQuery`, `LibraryQuery`, `LibraryResult.summary`, `filteredTotal`, and `Usage` contracts. Query, filter and page state remains in `/admin/recipes` URL; selected-row return/focus behavior remains in `AdminLibraryFocus`.

Controls must submit a shareable URL rather than keeping filters only in React state:

```tsx
<form method="get" action="/admin/recipes">
  <label htmlFor="admin-search">Search recipes</label>
  <input id="admin-search" name="q" defaultValue={result.query.q} />
  <button type="submit">Apply filters</button>
</form>
```

- [ ] Add browser cases for a title search, view/publication/review/collection filters, page navigation with more than 25 recipes, clear filters, no-results state, back navigation and selected-row focus. On inspection, assert readable free-slot, collection/release and campaign references plus an unavailable usage state; test at 390×844 and with keyboard-only navigation.
- [ ] Run `cd my-curated-haven-web && npm run test:e2e -- tests/e2e/admin-inspection.spec.ts --project=chromium-desktop`; the missing controls/usage assertions must fail. Run the same focused spec under `--project=chromium-mobile` for the narrow layout gap.
- [ ] Build labelled GET controls for `q`, `view`, `publication`, `review` and `collections`; preserve chosen values in the URL, reset page to 1 when filters change, and make previous/next links retain filters and selection behavior. Render the existing summary counts and readiness/dependency state in both table and cards. Replace raw `JSON.stringify(detail.usage)` with labelled sections showing references and impact language; explicitly show a null `sourceRevision` as “Campaign usage check unavailable” and show the last successful check only if its timestamp exists in persisted data. Keep route validation in `parseLibraryQuery` and do not trust return URLs outside `/admin`.
- [ ] Rerun desktop/mobile inspection tests and unit tests for `parseLibraryQuery` if its behavior changes. Commit exact task files with `git commit -m "feat: complete admin library and inspection controls"`.

### Task 7: Resolve the WebKit mobile editor failure and close R10

**Files:** Investigate `my-curated-haven-web/src/components/admin/AdminRecipeEditor.tsx` and its actual state owner; change only the component/hydration boundary shown by evidence. Modify `my-curated-haven-web/tests/e2e/admin-publication.spec.ts` and, if needed, `my-curated-haven-web/tests/e2e/admin-editing.spec.ts`. Update `docs/implementation/admin-recipes/GATES.md` and `ops/ADMIN-CONSOLE.md` after verification.

**Interfaces:** Keep the current explicit Save draft receipt and user-visible `Saved at` state. The persisted revision title must equal the typed title before review/publish proceeds.

The regression must assert stored content after reload, not just the toast:

```ts
await page.getByLabel("Title", { exact: true }).fill("Published candidate title");
await page.getByRole("button", { name: "Save draft", exact: true }).click();
await expect(page.getByRole("status").filter({ hasText: "Saved at" })).toBeVisible();
await page.reload();
await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Published candidate title");
```

- [ ] Reproduce the failed `webkit-mobile` publication test at PR head, inspect its Playwright trace and editor state around hydration, input and Save. The latest observed web-quality failure was [run 37716875817](https://github.com/Pratikn07/my-curated-haven-web/actions/runs/37716875817/job/113115260008): title reverted and `Saved at` was absent. Do not infer the cause solely from that symptom.
- [ ] Add a regression that waits for a user-observable editor-ready state, fills the title, saves, reloads the revision and asserts the persisted title exactly matches. Include a save-error/focus-recovery case and a keyboard traversal of library → inspection → edit → review → publish at narrow width. Run `cd my-curated-haven-web && npm run test:e2e -- tests/e2e/admin-publication.spec.ts --project=webkit-mobile`; first capture a failing trace against the old behavior.
- [ ] Fix the demonstrated cause: if hydration can replace controlled input state, make initial revision data stable and prevent interaction until hydration completes; if stale closure or navigation causes the loss, fix that state transition. Keep the test waiting for a meaningful ready signal and comparing stored data; do not merely raise the timeout or add a blind sleep.
- [ ] Run the WebKit publication case, all three projects for admin e2e specs, `npm run lint`, `npm run typecheck`, `npm run test:admin:unit`, and `npm run build`. Update R10 only after the owner has reviewed the final synthetic screens; record the exact test evidence and any remaining owner action instead of marking it complete early. Commit exact task files with `git commit -m "fix: retain mobile admin editor input and verify workflow"`.

## Integration and release decision

- [ ] Run the full admin database suite including the new SQL file against the **owned local** Supabase stack: `cd my-curated-haven-web && node scripts/test-admin-db.mjs --workdir . 10_recipe_admin_access.test.sql 11_admin_console_access.test.sql 12_admin_recipe_reads.test.sql 13_admin_recipe_revisions.test.sql 14_admin_recipe_assets.test.sql 15_admin_recipe_reviews.test.sql 16_admin_recipe_publication.test.sql 17_admin_phase_one_remediation.test.sql`. The script's default discovery stops at 16.
- [ ] Run `cd my-curated-haven-web && npm run test:e2e -- tests/e2e/admin-*.spec.ts --project=chromium-desktop --project=chromium-mobile --project=webkit-mobile`, then repository lint/typecheck/build and `git diff --check`. Confirm no production or shared DB URLs were used by the test harness.
- [ ] Reconcile every Phase One design gate R1–R12 with `GATES.md`, record the synthetic owner walkthrough and the current PR head/checks, and ensure the PR description lists these seven remediations. A green build alone is insufficient while an acceptance gate remains open.
- [ ] For an authorized release, apply migrations before enabling writes, verify the deployed SHA and authenticated owner/staff read/write paths with narrow synthetic data, then check public recipe access. Roll back new console operations with the application flag **and** DB stage while preserving revisions, audits, archives and public customer access; repair published content through a new reviewed revision or the recorded emergency path. Do not treat this plan or a green PR as deployment evidence.

## Plan self-review

This is an audit-remediation plan for the existing Phase One implementation, not a new Phase Two feature. Tasks 1–4 close the database integrity and scaling findings; Tasks 5–6 complete the approved owner and inspection workflows; Task 7 closes the demonstrated mobile failure and the outstanding R10 workflow gate. Each Review Focus case has a test in its owning task. No production mutation is required to validate the plan itself.
