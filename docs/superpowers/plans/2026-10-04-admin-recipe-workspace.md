# Admin Recipe Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the owner and authorised staff a secure workflow to inspect existing recipes, prepare private revisions, review them and publish eligible changes without changing customer access or commercial promises implicitly.

**Architecture:** Extend the existing Next.js application, Supabase Auth and private recipe-draft authority. Narrow authenticated RPCs enforce current membership, MFA, revision identity and atomic writes; the current public catalog/body tables remain the reader projection. Deliver inspection, private editing and reviewed publication as three independently gated increments of the same workflow.

**Tech Stack:** Existing Node 24, Next.js 16, React 19, TypeScript, Supabase Auth/PostgreSQL/Storage, pgTAP, Node test runner and Playwright. Keep the installed dependency set; no new admin framework, paid review service or image-generation service.

**Spec:** [Approved Phase 1 design](../specs/2026-10-04-admin-recipe-workspace-design.md).

## Global Constraints

The following constraints are copied from the approved design; every task inherits them.

- “Console membership is separate from the existing recipe-inspection role.”
- “Revocation is checked on every read/action and takes effect immediately for the console; a stale JWT does not retain permissions.”
- “The web flow cannot remove or downgrade the owner.”
- “Enforce second-factor assurance for console reads and writes using Supabase's authenticator enrollment/challenge flow.”
- “Do not route the console through a browser service-role client or expose the private schema.”
- “Admin routes have private/no-store responses and no cross-user cache sharing.”
- “Suppress optional analytics, SDK page capture, autocapture, identify calls and session replay for the admin workspace, including navigation into it from an already instrumented public page.”
- “Extend the existing private.recipe_drafts rather than create a competing draft authority.”
- “The slug and UUID are read-only in Phase 1 so existing links keep their identity.”
- “Existing structured data must round-trip without silently dropping fields the editor does not expose.”
- “Save draft is explicit; there is no silent autosave in Phase 1.”
- “A no-change save creates no new revision or review invalidation.”
- “Only an explicit approve decision for the exact candidate digest, with zero unresolved blockers, clears the new workflow's review requirement.”
- “The owner may edit, review and publish their own revision because the first operating model has one person.”
- “Corrections to recipes referenced by sealed releases, active commercial offers or historical purchases are blocked from ordinary Phase 1 publication until the collection correction/version policy is explicitly supported in Phase 2.”
- “All database changes commit together or none do.”
- “After commit, the app revalidates affected recipe/list/campaign displays.”
- “Below 768 CSS pixels the library uses labelled rows/cards and detail content stacks; all actions remain available without requiring the whole page to scroll horizontally. Verify at 320 and 375 CSS pixels and at desktop widths.”
- “Phase 1 is complete only when A, B and C meet their gates.”

Additional execution constraints: use the repository's `.nvmrc` and package lock, invoke `$unlazy` before the first code edit, create a proportionate implementation acceptance ledger, preserve unrelated owner changes, and run the repository-required checks. Do not merge, push, migrate production, bootstrap a production identity or deploy solely because this planning document exists.

## Review Focus

These five less obvious conditions have explicit tests assigned below.

1. An email may match multiple auth identities: refuse automatic assignment and return no list of other identities. Task 1.
2. A no-change save after approval must preserve the approval, version and audit cardinality. Task 7.
3. A recipe may contain unrecognised ingredient/structured-yield properties: preserve them through edit/save and flag unsupported values rather than discard them. Tasks 6 and 8.
4. An active image object may disappear after review: deny publication and keep the existing recipe intact. Tasks 9 and 12.
5. A public page may already have an initialised analytics SDK, with an identity lookup pending, when navigation enters admin: stop capture before admin content mounts and discard the late identify operation. Task 3.

---

## Delivery order and definition of done

| Increment | Tasks | Usable result | Activation gate |
| --- | --- | --- | --- |
| A: trusted inspection | 1–5 | MFA entry, owner Team management, searchable library, recipe preview/readiness/usage/history | R1–R3, R9 and read-only R10–R12 evidence |
| B: working revisions | 6–9 | Private working revisions, explicit saves, image selection, comparison and conflict recovery | R4–R5, editing R8–R11 evidence |
| C: reviewed publication | 10–14 | Review/issues, exact-revision publication, withdrawal and refresh recovery | All R1–R12; owner screen review and release evidence |

Start implementation with Increment A. Complete each task's integration and checks before moving to the next; the task's test examples pin behaviour and are not substitutes for its full acceptance matrix. A task is reviewable independently even though later tasks consume its contracts. These are dependency groups, not calendar or effort estimates.

**Current evidence:** approved design and source inspection only. No implementation test in this plan has been executed, no application/migration changes exist, and no release is authorised by this document.

### Working checkout and source baseline

Use `/Users/pratik.nandoskar/.codex/worktrees/admin-recipe-design/my-curated-haven-web`, branch `codex/admin-recipe-workspace-design`, based on main `e0cc25b816efa30665080741b03fbdc3e61019fe`. The original checkout contains unrelated owner edits and an untracked collection plan; leave those untouched. Before code, inspect newer main changes and reconcile affected interfaces without discarding this worktree.

All paths below are relative to that repository root. `WEB` in explanatory prose means `my-curated-haven-web`; shell commands specify their working directory explicitly. Proposed migration names are ordered after the existing migrations; confirm they are still free before creating them.

## File responsibilities

| Files to create | Responsibility |
| --- | --- |
| `supabase/migrations/20261005000100_admin_console_access.sql` | Membership, protected owner, stage settings, narrow context/team functions, staff read predicate, append-only audit/operation foundations |
| `supabase/migrations/20261005000500_admin_recipe_reads.sql` | Snapshot projection, authoritative validation/readiness, paginated list/detail/history/usage RPCs |
| `supabase/migrations/20261005001000_admin_recipe_revisions.sql` | Extend recipe_drafts, immutable revisions, save/rebase concurrency, image metadata |
| `supabase/migrations/20261005001500_admin_recipe_reviews.sql` | Exact-digest submission, issues and human decisions |
| `supabase/migrations/20261005002000_admin_recipe_publication.sql` | Atomic publish/withdraw, archive, impact locking, operation replay |
| `supabase/tests/database/11_admin_console_access.test.sql` | Membership/MFA/direct-call/Team/stage matrix |
| `supabase/tests/database/12_admin_recipe_reads.test.sql` | Independent expected library/readiness/usage fixtures |
| `supabase/tests/database/13_admin_recipe_revisions.test.sql` | Snapshot preservation, save/rebase/idempotency/concurrency |
| `supabase/tests/database/14_admin_recipe_reviews.test.sql` | Exact-digest review and issue lifecycle |
| `supabase/tests/database/15_admin_recipe_publication.test.sql` | Atomic publication, rollback, impact and withdrawal |
| `supabase/test-fixtures/admin-console.sql` | Transaction-local synthetic pgTAP data/helpers; never a production migration |
| `my-curated-haven-web/src/lib/admin/contracts.ts` | Shared DTOs, command inputs and safe result types |
| `my-curated-haven-web/src/lib/admin/query.ts` | Pure admin URL/filter parsing and return-navigation validation |
| `my-curated-haven-web/src/lib/admin/rpc.ts` | Typed request-scoped RPC adapter; safe failure classification |
| `my-curated-haven-web/src/lib/admin/context.ts` | Server-only verified user/context/assurance guard |
| `my-curated-haven-web/src/lib/admin/recipes.ts` | Server-only batched recipe read/write orchestration |
| `my-curated-haven-web/src/lib/admin/campaign-usage.ts` | Deployed-config campaign references and deployment provenance |
| `my-curated-haven-web/src/lib/admin/snapshot.ts` | Lossless editor patches/diffs; never computes the authoritative review hash |
| `my-curated-haven-web/src/lib/admin/assets.ts` | Existing recipe-images object validation and metadata/provenance DTOs |
| `my-curated-haven-web/src/lib/admin/asset-path.ts` | Pure recipe-bucket path validation, importable in Node tests |
| `my-curated-haven-web/src/lib/admin/refresh.ts` | Revalidation after a committed operation; refresh-only retry |
| `my-curated-haven-web/src/lib/admin/refresh-result.ts` | Pure committed/refresh-pending result handling |
| `my-curated-haven-web/src/lib/admin/actions.ts` | Server actions with strict inputs and server-derived identity |
| `my-curated-haven-web/src/components/admin/` | Focused AdminShell, MFA, Team, Library, Inspection, Preview, Editor, Compare, Review and Publication controls |
| `my-curated-haven-web/src/components/analytics/AdminPrivacyBoundary.tsx` | Suppress SDK and late identity work before admin children mount |
| `my-curated-haven-web/src/app/admin/` | Protected route layout, Recipes/detail/edit/Team pages and loading/error boundaries |
| `my-curated-haven-web/tests/admin/*.test.mjs` | Pure query, RPC errors, snapshot, privacy and refresh tests |
| `my-curated-haven-web/tests/e2e/admin-fixtures.ts` | Local-only Node auth/DB/TOTP fixture support; no browser privileged client |
| `my-curated-haven-web/tests/e2e/admin-access.spec.ts` | Real local Auth/MFA/Team and denied routes |
| `my-curated-haven-web/tests/e2e/admin-inspection.spec.ts` | Library/detail read workflow and responsive navigation |
| `my-curated-haven-web/tests/e2e/admin-editing.spec.ts` | Real private saving, reopen, no-op, conflict and rebase |
| `my-curated-haven-web/tests/e2e/admin-concurrency.spec.ts` | Two-connection lock-barrier draft/impact race tests |
| `my-curated-haven-web/tests/e2e/admin-publication.spec.ts` | Real review/publish/withdraw/refresh and public-reader checks |
| `my-curated-haven-web/tests/e2e/admin-privacy.spec.ts` | Installed SDK at an intercepted local sink, direct entry and public-to-admin transition |
| `ops/ADMIN-CONSOLE.md` | Restricted owner bootstrap, stage activation, backup/rollback and assurance recovery |
| `docs/implementation/admin-recipes/GATES.md` | Implementation acceptance ledger with actual evidence and unmet gates |

| Existing files to modify | Bounded change |
| --- | --- |
| `my-curated-haven-web/src/lib/types/database.ts` | Regenerate public types from local migrations; no hand-edited schema guesses |
| `my-curated-haven-web/src/proxy.ts` | Private headers for /admin and existing session refresh; retain current route handling |
| `my-curated-haven-web/src/components/layout/SiteShell.tsx` | Admin privacy boundary/public-shell separation; keep public navigation behaviour |
| `my-curated-haven-web/src/components/analytics/AnalyticsProvider.tsx` | Guard all capture/identify callbacks with current path, including late async resolution |
| `my-curated-haven-web/src/lib/analytics/private-paths.ts` | Segment-safe admin prefix predicate |
| `my-curated-haven-web/src/lib/analytics/posthog.ts` | Direct-entry SDK suppression, event filtering and supported temporary capture controls |
| `my-curated-haven-web/src/lib/analytics/client.ts`, `provider.ts` | Refuse admin custom events and prevent mock/remote fallback leakage |
| `my-curated-haven-web/src/lib/data/recipes.ts` | Active persisted image metadata in existing typed readers |
| `my-curated-haven-web/src/app/recipes/[slug]/page.tsx` | Read persisted image alt/description with a safe legacy fallback |
| `my-curated-haven-web/package.json` | Admin unit test script and inclusion in verify |
| `.github/workflows/web-ci.yml` | Run admin units and real admin browser/RPC integration in existing required jobs |
| `my-curated-haven-web/tests/e2e/analytics.spec.ts`, `analytics-contract.spec.ts` | Prove public tracking still behaves as intended after admin isolation |
| `my-curated-haven-web/tests/e2e/data-access.spec.ts`, `recipes.spec.ts`, `saved-recipes.spec.ts`, `saved-recipe-access.spec.ts` | Add only relevant existing-reader regressions; keep established synthetic fixtures intact |

Use existing `RecipeIngredients`, `RecipeMethod`, `RecipeStorageNotes` and `AllergenInformation` in preview. Do not refactor the public recipe page, the auth system or payments wholesale. Additional client components belong under `src/components/admin/` and remain small enough to review by responsibility.

## Shared contracts and database choices

Task 1 creates `contracts.ts`. The following names are fixed interfaces consumed by later tasks. SQL JSON results use these camelCase keys; generated Supabase types supply the RPC arguments.

```ts
import type { Json } from "@/lib/types/database";
export type AdminRole = "owner" | "viewer" | "editor" | "reviewer" | "publisher";
export type Permission = "recipe.read" | "recipe.edit" | "recipe.review"
  | "recipe.publish" | "recipe.withdraw" | "recipe.emergency_withdraw" | "team.manage";
export type ConsoleStage = "disabled" | "inspection" | "editing" | "publication";
export type AdminCode = "AUTH_REQUIRED" | "MFA_REQUIRED" | "DENIED" | "DISABLED"
  | "INVALID" | "NOT_FOUND" | "CONFLICT" | "UNAVAILABLE" | "BLOCKED";
export type Result<T> = { ok: true; value: T }
  | { ok: false; code: AdminCode; reference: string; fields?: Record<string, string> };
export type Operator = { id: string; email: string; roles: AdminRole[]; permissions: Permission[] };
export type AdminContext = { stage: ConsoleStage; operator: Operator; assurance: "aal1" | "aal2" };
export type ContextResult = Result<AdminContext>;
export type PublicationState = "draft" | "published" | "withdrawn";
export type ReviewState = "unreviewed" | "submitted" | "approved" | "changes_requested" | "rejected";
export type LibraryView = "all" | "attention" | "awaiting_review" | "ready" | "published" | "withdrawn";
export type LibraryQuery = { q: string; collections: string[]; publication: PublicationState[];
  review: ReviewState[]; view: LibraryView; page: number; pageSize: 25 };
export type Check = { code: string; scope: string; state: "pass" | "fail" | "unknown";
  severity: "blocker" | "suggestion"; explanation: string; origin: "validation" | "human" | "source" };
export type Readiness = { targetDigest: string; review: ReviewState; checks: Check[];
  needsAttention: boolean; awaitingReview: boolean; readyToPublish: boolean;
  needsVerification: boolean; evaluatedAt: string };
export type RecipeSnapshot = { recipeId: string; slug: string;
  catalog: { title: string; publicSummary: string; totalMinutes: number | null;
    mealLabels: string[]; dietLabels: string[] };
  body: null | { ingredients: Json; instructions: Json; yield: string;
    yieldStructured: Json; reviewedNotes: string | null;
    allergenReviewState: "unknown" | "reviewed_listed" | "reviewed_no_allergens";
    allergens: string[] | null; storageNotes: string | null };
  image: { path: string; alt: string | null; description: string | null;
    objectId: string | null; objectVersion: string | null } };
export type Base = { contentVersion: number | null; activeHash: string };
export type Revision = { id: string; draftId: string; recipeId: string; version: number;
  digest: string; base: Base; state: "draft" | "submitted" | "approved" | "changes_requested"
    | "rejected" | "published" | "superseded"; submissionId: string | null;
  snapshot: RecipeSnapshot; savedAt: string; savedBy: string };
export type Usage = { checkedAt: string; sourceRevision: string | null;
  freeSlots: number[];
  releases: { id: string; collectionId: string; title: string; version: number; state: string;
    sealed: boolean; liveOffer: boolean; pendingLiveAttempt: boolean;
    historicalLivePayment: boolean; testActivity: boolean }[];
  campaigns: { slug: string; status: "draft" | "published"; recipeSlugs: string[];
    promisedCount: number; deploymentRevision: string | null }[] };
export type RecipeRow = { id: string; slug: string; title: string; imagePath: string;
  publication: PublicationState; readiness: Readiness;
  collections: { id: string; title: string }[]; changedAt: string };
export type LibraryResult = { rows: RecipeRow[]; filteredTotal: number;
  summary: Record<LibraryView, number>; query: LibraryQuery; sourceRevision: string;
  checkedAt: string; dependencyChecks: Check[] };
export type AuditEvent = { id: string; actorId: string; action: string; recipeId: string | null;
  revisionId: string | null; digest: string | null; beforeRef: string | null;
  afterRef: string | null; requestId: string; at: string; reason: string | null; result: string };
export type HistoryPage = { events: AuditEvent[]; nextCursor: string | null };
export type LegacyReview = { id: string; contentVersion: number; reviewerKind: string;
  reviewer: string; verdict: string; openBlockers: number; reviewedAt: string };
export type RecipeDetail = { active: RecipeSnapshot; publication: PublicationState;
  contentVersion: number | null; activeHash: string; working: Revision | null;
  readiness: Readiness; usage: Result<Usage>; legacyReviews: LegacyReview[];
  history: HistoryPage; checkedAt: string };
export type StaffMatch = { userId: string; email: string };
export type StaffRow = StaffMatch & { roles: AdminRole[]; active: boolean;
  grantedBy: string; grantedAt: string; revokedBy: string | null; revokedAt: string | null };
export type Asset = { objectId: string; objectVersion: string; path: string; bucket: "recipe-images";
  available: boolean; provenance: "recorded_approval" | "requires_review" };
export type Operation = { operationId: string; recipeId: string; reason: string };
export type DraftCommand = Operation & { expectedVersion: number; expectedDigest: string;
  base: Base; snapshot: RecipeSnapshot; reopenReviewed: boolean };
export type MutationReceipt = { operationId: string; recipeId: string;
  revisionId: string | null; version: number; digest: string; noChange: boolean;
  committedAt: string; publication: PublicationState };
export type ReviewCommand = Operation & { revisionId: string; expectedVersion: number;
  expectedDigest: string; submissionId: string; decision: "approve" | "changes_requested" | "reject";
  resolvedIssueIds: string[] };
export type PublishCommand = Operation & { revisionId: string; expectedVersion: number;
  expectedDigest: string; base: Base; impactToken: string };
export type WithdrawCommand = Operation & { base: Base; impactToken: string;
  emergency: boolean; acknowledgePromiseImpact: boolean };
export type RefreshReceipt = { operationId: string; state: "complete" | "pending" };
```

`Json` intentionally preserves unsupported structured values in a draft. SQL validates safe representability on save and stricter publishable structure at submission/publication. The authoritative digest is SHA-256 of a database-normalised JSONB snapshot (`extensions.digest(convert_to(snapshot::text, 'UTF8'), 'sha256')`); clients treat it as opaque. Never compare a JavaScript JSON.stringify hash with PostgreSQL JSONB text.

### Storage invariants

| Table/function | Concrete contract |
| --- | --- |
| `private.admin_memberships` | user_id auth FK; role; active; grant/revoke actor/time/reason; unique(user_id, role); one protected active owner |
| `private.admin_console_settings` | Singleton stage, updated_at/by/reason; defaults disabled; writable only by restricted operator |
| `private.admin_operations` | actor_id + operation_id unique; action/target; canonical request hash; result JSON; committed_at; a reused ID with a different payload is INVALID |
| `private.admin_audit` | Append-only ID/actor/action/target/revision/digest/before/after/request/time/reason/result; no raw recipe JSON |
| `private.recipe_drafts` | Retain legacy rows; add workflow_schema, lifecycle, base_version/hash, working_version, current_revision_id, actors; one open schema-1 head per recipe |
| `private.recipe_revisions` | Immutable id/draft/recipe/version/full snapshot/digest/base/actor/time; unique(draft_id, version) |
| `private.recipe_review_decisions` | Immutable revision/digest/decision/reviewer/time/reason; decisions never mutate old evidence |
| `private.recipe_revision_issues` | Stable issue ID/code/field/severity/origin/explanation with immutable creation and resolution events bound to a digest |
| `private.recipe_active_archives` | Full pre-publication catalog/body/image/control-state snapshots and before/after references |
| `private.recipe_asset_checks` | Candidate-digest/object identity/version/availability/provenance/check time; unknown/unavailable is not a pass |
| `private.admin_campaign_snapshots` | Trusted deployed configuration/revision/hash; activated by restricted operator, compared with application config |
| `private.admin_recipe_status(uuid)` | One SQL readiness evaluator, includes missing body, validation, issues, exact review, base match, usage and image check freshness |
| `private.admin_assert(permission, minimum_stage)` | Read auth.uid and JWT aal, current membership and DB stage every call; never posted actor/role |

`ADMIN_CONSOLE_ENABLED=false` is an additional server route kill switch. DB stage independently gates direct RPCs: disabled denies all private console reads/actions; inspection permits reads and owner Team actions; editing adds draft operations; publication adds review/publish/withdraw. The trusted operator changes both activation settings together; feature flags never replace permission/MFA enforcement. A rollback sets DB stage disabled as well as the route flag so direct RPC operations stop.

Console context is the only pre-MFA RPC. It returns only the caller's membership/assurance/stage eligibility, not recipe, team or audit data. Preserve the existing `public.user_roles` and `public.is_recipe_admin()` implementation and legacy RLS policies. Add a separate `public.is_console_recipe_reader()` predicate requiring active recipe.read, aal2 and enabled DB stage to additive catalog/body SELECT policies. Do not grant catalog/body UPDATE to authenticated users.

All public RPCs use SECURITY DEFINER only when needed to cross the private-schema boundary, `SET search_path = ''`, fully qualified objects, explicit EXECUTE revokes/grants and `private.admin_assert`. Revoke anonymous execution, apart from no-data access-denied handling. Private functions are not exposed through PostgREST. Audit/revision protection triggers reject UPDATE/DELETE even if a future grant accidentally becomes wider; privileged recovery remains a documented operator action.

### Test fixture contracts

The SQL fixture creates synthetic owner/viewer/editor/reviewer/publisher/customer accounts in the test transaction, independent recipe/release/offer/payment cases and two distinguishable legacy reviews. Fixed IDs use the `91000000-…` recipe and `92000000-…` user namespaces. It exposes test-only `pg_temp.admin_claims(user_id uuid, aal text) RETURNS void`, `pg_temp.admin_recipe(label text) RETURNS uuid`, `pg_temp.admin_digest(label text) RETURNS text`, and `pg_temp.admin_version(label text) RETURNS integer`; the label map belongs in pg_temp, not the application.

`admin-fixtures.ts` exports `createAdminFixture(label: string, roles: AdminRole[]): Promise<AdminFixture>`; `AdminFixture` provides `userId`, `email`, `recipeId`, `recipeSlug`, `login(page: Page, assurance?: "aal1" | "aal2"): Promise<void>`, `snapshot(): Promise<RecipeDetail>`, `active(): Promise<RecipeSnapshot>`, `revoke(): Promise<void>`, `outOfBandTitle(title: string): Promise<void>`, `operationCount(operationId: string): Promise<number>`, and `dispose(): Promise<void>`. It also exports `totp(secret: string, now?: number): string` using Node crypto and `readTelemetry(requests: string[]): Json[]` for decoded local SDK payloads. Both SQL and browser helpers are created alongside the first task that uses them.

Call `validatePhase10Targets` from `scripts/phase10-target-guard.mjs` before connecting or creating users. For these destructive synthetic fixtures additionally require loopback app, Auth and PostgreSQL hosts, even though the existing guard supports allowlisted staging reads. Use existing secure local configuration; never print keys, MFA secrets, passwords, auth/storage-state contents or database connection strings. Keep auth fixture state in ignored test output and delete it through dispose. No fixture creates a production role or sends an invitation.

Browser fixtures reuse one synthetic confirmed owner to respect the singleton owner invariant, create uniquely labelled recipe/staff rows, and use title `Synthetic [label]` with a published baseline recipe. `dispose` closes sessions/connections and removes only exact fixture IDs using the restricted local operator recovery path, including related immutable test records; it does not disable protections or delete unrelated rows. Use serial workers for admin browser scenarios because settings/owner are shared. Disabled-stage tests use rolled-back SQL fixtures or a separate local server instance, never change global settings during another test. CI already uses one worker; the final local browser command explicitly does too. The privacy suite enables the installed SDK only against its intercepted loopback sink and includes a positive public capture control.

## Increment A: trusted inspection

### Task 1: DB-backed membership, owner protection and Team contracts

**Files:** Create access migration, `11_admin_console_access.test.sql`, SQL fixture, `src/lib/admin/contracts.ts`, and `ops/ADMIN-CONSOLE.md`; regenerate `src/lib/types/database.ts` under WEB. Create implementation `GATES.md` after invoking Unlazy.

**Interfaces:** Produces `public.admin_console_context() RETURNS jsonb`, `public.admin_staff_list() RETURNS jsonb`, `public.admin_staff_lookup(p_email text) RETURNS jsonb`, `public.admin_staff_assign(p_user_id uuid, p_roles text[], p_reason text, p_operation_id uuid) RETURNS jsonb`, `public.admin_staff_revoke(p_user_id uuid, p_reason text, p_operation_id uuid) RETURNS jsonb`, `private.admin_assert(text, text) RETURNS uuid`, `private.admin_begin_operation(p_actor uuid, p_id uuid, p_action text, p_target uuid, p_request jsonb) RETURNS jsonb`, `private.admin_finish_operation(p_actor uuid, p_id uuid, p_receipt jsonb) RETURNS void` and `public.is_console_recipe_reader() RETURNS boolean`. Lookup outcomes are found/not_found/unconfirmed/ambiguous; only found includes StaffMatch. No caller-supplied actor argument.

- [ ] **Step 1: Write the authority/Team matrix using the isolated SQL fixture.** Include stale role claims, forged user metadata, direct RPC calls, aal1 denial, multi-role union, immediate revoke, stage disabled, staff self-promotion, unconfirmed/no match and ambiguous identity matches. Preserve legacy admin inspection without console membership. Pin Review Focus 1 with a duplicate-email synthetic case permitted by the local auth schema; if Auth's unique constraint prevents two auth rows, exercise the lookup's exact identity mapping with multiple provider identities rather than weakening that constraint.

```sql
BEGIN;
SELECT plan(6);
\ir ../../test-fixtures/admin-console.sql
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000002', 'aal1');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_staff_list()$$, '42501', 'ADM_MFA_REQUIRED', 'aal1 receives no team data');
SELECT throws_ok($$SELECT public.admin_staff_assign('92000000-0000-0000-0000-000000000002', ARRAY['owner'], 'promote', gen_random_uuid())$$,
  '42501', 'ADM_MFA_REQUIRED', 'posted role does not confer authority');
RESET ROLE;
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001', 'aal2');
SET LOCAL ROLE authenticated;
SELECT is(public.admin_staff_lookup('missing@synthetic.test')->>'status', 'not_found', 'exact missing lookup');
SELECT is(public.admin_staff_lookup('ambiguous@synthetic.test')->>'status', 'ambiguous', 'ambiguous mapping cannot assign');
SELECT ok(NOT (public.admin_staff_lookup('ambiguous@synthetic.test') ? 'matches'), 'no identity enumeration');
SELECT throws_ok($$SELECT public.admin_staff_revoke('92000000-0000-0000-0000-000000000001', 'remove owner', gen_random_uuid())$$,
  '42501', 'ADM_OWNER_PROTECTED', 'owner cannot be revoked');
SELECT * FROM finish();
ROLLBACK;
```

- [ ] **Step 2: Run `supabase test db supabase/tests/database/11_admin_console_access.test.sql` from repo root.** Expect absent RPC/schema failures initially; confirm failure is behavioural or missing implementation rather than a bad fixture.
- [ ] **Step 3: Create protected tables and functions, including the exact role mapping below.** Use confirmed auth-account email lookup with trim/case normalisation and an exact equality query, never ILIKE/substrings. If several eligible identity records match, return ambiguous without assigning or exposing a list; identity resolution stays in the restricted operator workflow. Assign accepts only viewer/editor/reviewer/publisher, deduplicates the array, updates role rows atomically and records actor/reason; revoke protects owner and records all changed roles. Operation replay rechecks current authority before returning the minimal receipt. Implement begin_operation with a unique actor/ID row, canonical request hash, same-payload replay and different-payload rejection; finish_operation stores the receipt in that same transaction. A rolled-back transaction leaves no committed ownership/result.

```sql
CREATE FUNCTION private.admin_permissions(p_role text) RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE p_role
    WHEN 'owner' THEN ARRAY['recipe.read','recipe.edit','recipe.review','recipe.publish','recipe.withdraw','recipe.emergency_withdraw','team.manage']
    WHEN 'viewer' THEN ARRAY['recipe.read']
    WHEN 'editor' THEN ARRAY['recipe.read','recipe.edit']
    WHEN 'reviewer' THEN ARRAY['recipe.read','recipe.review']
    WHEN 'publisher' THEN ARRAY['recipe.read','recipe.publish','recipe.withdraw']
    ELSE ARRAY[]::text[] END;
$$;
CREATE UNIQUE INDEX admin_one_active_owner ON private.admin_memberships ((role))
  WHERE role = 'owner' AND active;
```

`admin_assert` raises `42501` with fixed ADM_AUTH_REQUIRED / ADM_MFA_REQUIRED / ADM_DENIED / ADM_DISABLED codes, tests current `auth.uid()`, requires `(auth.jwt()->>'aal') = 'aal2'`, and checks stage plus a membership permission through admin_permissions. Write RPCs lock the current settings/membership rows with FOR SHARE and recheck authority before mutation, so a concurrent revoke/disable has a defined order; a completed revoke defeats every later action. Read predicates remain current DB lookups, not JWT role claims. Restrict table writes and function grants explicitly. Bootstrap uses a reviewed operator transaction against one confirmed auth UUID, records a bootstrap event and refuses a second owner; document exact SQL using psql parameters supplied securely, without a real production UUID/email in source.

- [ ] **Step 4: Run the expanded SQL matrix, existing `10_recipe_admin_access.test.sql`, and generate local public types.** Verify no default table/function grants expose memberships or audit, staff read eligibility disappears immediately after revocation, and customer/legacy access is unchanged.
- [ ] **Step 5: Commit only Task 1 files and ledger evidence.** Commit message: `feat: add protected admin membership and staff contracts`. Runtime gates R1/R2 stay unmet until their server/browser portions also pass.

### Task 2: Typed RPC boundary, authoritative read models and usage

**Files:** Create read migration, `12_admin_recipe_reads.test.sql`, WEB `src/lib/admin/rpc.ts`, `context.ts`, `query.ts`, `recipes.ts`, `campaign-usage.ts`, `tests/admin/query.test.mjs`, `rpc.test.mjs`; modify package.json verify and `.github/workflows/web-ci.yml` to run `test:admin:unit`; regenerate database types.

**Interfaces:** Consumes Task 1 guard/contracts. Produces `parseLibraryQuery(params: URLSearchParams): Result<LibraryQuery>`, `safeAdminReturn(value: string | null): string`, `adminRpc<T>(call: () => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>, decode: (data: unknown) => T): Promise<Result<T>>`, `getAdminContext(): Promise<ContextResult>`, `loadAdminLibrary(query: LibraryQuery): Promise<Result<LibraryResult>>`, `loadAdminRecipe(recipeId: string): Promise<Result<RecipeDetail>>`, `loadAdminHistory(recipeId: string, cursor: string | null): Promise<Result<HistoryPage>>`, `loadCampaignUsage(slug: string, revision: string | null): Result<Usage["campaigns"]>`. All request/DB loaders are server-only; pure parser and adapter stay importable by Node tests.

DB functions: `public.admin_recipe_list(p_query jsonb)`, `public.admin_recipe_detail(p_recipe_id uuid)`, `public.admin_recipe_history(p_recipe_id uuid, p_cursor text, p_limit integer DEFAULT 25)`, `public.admin_recipe_usage(p_recipe_id uuid)` return jsonb and each calls admin_assert(recipe.read, inspection). Private `admin_snapshot(uuid)` and `admin_recipe_status(uuid)` return jsonb.

- [ ] **Step 1: Add table-driven parser/error tests and independent SQL fixtures with 27 entries.** Expect literal title/slug searches including `%`, `_`, Unicode, complete UUID, invalid UUID/filter/page, AND across filters/OR within, deterministic ties and two pages. Assert overlapping view IDs independently, whole-catalog summaries versus filteredTotal, missing body/image, legacy review provenance, test/live commercial distinction and unavailable source checks.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { parseLibraryQuery, safeAdminReturn } from "../../src/lib/admin/query.ts";
import { adminRpc } from "../../src/lib/admin/rpc.ts";
test("invalid page and unsafe return destination cannot reach a query or redirect", () => {
  assert.equal(parseLibraryQuery(new URLSearchParams("page=-1")).ok, false);
  assert.equal(safeAdminReturn("//attacker.test/admin"), "/admin/recipes");
  assert.equal(safeAdminReturn("/admin/recipes?page=2"), "/admin/recipes?page=2");
});
test("backend failure is unavailable, never an empty successful library", async () => {
  const result = await adminRpc(async () => ({ data: null, error: { code: "08006" } }), x => x);
  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAVAILABLE");
});
```

- [ ] **Step 2: Run `npm run test:admin:unit` in WEB and the new pgTAP read file from root.** Initially expect missing modules/RPCs, not a deliberate skip.
- [ ] **Step 3: Build the strict adapter and one SQL evaluator/read snapshot.** Map only fixed known error codes to AdminCode; decode malformed/null successful RPC payloads as UNAVAILABLE with an opaque request reference. `getAdminContext` verifies the user through `auth.getUser`, distinguishes no session from transport failure, then obtains current DB context. It never falls back to customer getCurrentUser's error-to-null convention.

```ts
export function safeAdminReturn(value: string | null): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) return "/admin/recipes";
  const url = new URL(value, "https://admin.local");
  if (url.origin !== "https://admin.local" || !(/^\/admin(?:\/|$)/).test(url.pathname)) return "/admin/recipes";
  return url.pathname + url.search + url.hash;
}
```

SQL list uses a MATERIALIZED status CTE and returns summaries, filtered count and 25 ordered rows in one statement snapshot. Do not download every recipe body/history to JavaScript. Order by greatest relevant catalog/body/head/review/issue/audit change descending and UUID ascending. Review/readiness rules come from the evaluator, never independently reimplemented in client badges. At A, new working revision/review readiness is false; legacy evidence stays separately scoped.

Usage joins free slots, collection_recipes/releases/collections, release_manifests member IDs, commercial_offers and purchase_orders/provider_payments. Respect the existing sealed/retired membership guard when marking protected releases. Also inspect historical order snapshot membership when represented; malformed required historical manifests are unknown, not empty. Live exposure is sale_enabled live offers, unresolved live attempts in creating/creation_unknown/open/processing/review, or verified historical captured payments; test rows are separate and refunds do not erase historical exposure. Return aggregate booleans/release references, no customer/order/payment identity. Campaign DTOs come from server CAMPAIGNS, including published/draft status, promised recipe selection, and VERCEL_GIT_COMMIT_SHA (null locally). Missing deployment provenance is visibly unknown and blocks promise-sensitive writes until checked.

- [ ] **Step 4: Run parser/adapter units, SQL reads and existing data units.** Create `test:admin:unit` as `node --experimental-strip-types --test tests/admin/*.test.mjs`, include it in verify and web-quality. Type-only imports avoid Node path-alias resolution; do not bundle server-only modules into unit tests or the browser.
- [ ] **Step 5: Commit the adapter/read-model deliverable with message `feat: add truthful admin recipe inspection data`.** Update R3 evidence with fixture IDs/counts, and keep unimplemented B/C evaluator conditions closed.

### Task 3: Route/MFA guard and analytics isolation

**Files:** Create WEB `src/app/admin/layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `src/components/admin/AdminShell.tsx`, `AdminMfa.tsx`, analytics/AdminPrivacyBoundary.tsx, `tests/admin/privacy.test.mjs`, `tests/e2e/admin-fixtures.ts`, `admin-access.spec.ts`, `admin-privacy.spec.ts`; modify proxy, SiteShell, AnalyticsProvider and analytics private-paths/posthog/client/provider files.

**Interfaces:** Consumes getAdminContext and safeAdminReturn. Produces `AdminMfa({ onVerified }: { onVerified: () => void })`, `AdminShell({ context, children }: { context: AdminContext; children: React.ReactNode })`, `isAdminPath(pathname: string): boolean`, `isAdminNavigationContext(url: string): boolean`, `syncAdminPrivacy(pathname: string): void`, and `AdminPrivacyBoundary({ children }: { children: React.ReactNode })`. The navigation-context predicate includes an admin segment or a validated admin returnTo on sign-in/auth completion. Expose only browser's existing publishable Auth client for MFA; all private recipe calls remain server/DB guarded.

- [ ] **Step 1: Test flag-off, signed-out, non-member, aal1 enrollment/challenge, aal2 entry and unavailable context.** Check /admin redirects, validated returnTo, no recipe/team payload before aal2, private cache headers and noindex. Pin Review Focus 5 with the real installed SDK at an intercepted sink: start on a public page, hold a getSession identity response, enter /admin, release the response, click/search and assert no admin path, recipe sentinel or identity capture. Also test direct entry, /administrator prefix mismatch and public analytics after exiting.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { isAdminPath, isAdminNavigationContext } from "../../src/lib/analytics/private-paths.ts";
test("admin prefix is segment-safe", () => {
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/admin/recipes"), true);
  assert.equal(isAdminPath("/administrator"), false);
  assert.equal(isAdminNavigationContext("https://fixture.test/sign-in?returnTo=%2Fadmin%2Frecipes%3Fq%3Dprivate"), true);
});
```

```ts
test("aal1 operator cannot receive private content", async ({ page }) => {
  const fixture = await createAdminFixture("mfa-boundary", ["owner"]);
  try {
    await fixture.login(page, "aal1");
    await page.goto(`/admin/recipes/${fixture.recipeId}`);
    await expect(page.getByRole("heading", { name: "Verify your admin access" })).toBeVisible();
    await expect(page.getByText("SENTINEL_PRIVATE_ADMIN_RECIPE")).toHaveCount(0);
  } finally { await fixture.dispose(); }
});
```

- [ ] **Step 2: Run admin privacy units and access/privacy Playwright files on local desktop after a current build.** Initially routes/guards do not exist. Browser privacy tests must have a positive public capture control, not pass because analytics is disabled globally.
- [ ] **Step 3: Implement the guard, TOTP UI and privacy boundary.** Dynamic admin layout returns denied/unavailable/MFA shell before invoking any child recipe loader; child routes/actions guard independently because a layout alone does not prevent parallel server data execution. The proxy adds `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow` for the segment. Layout metadata overrides root indexing; verify sitemap remains explicit public routes only.

```ts
const enrollment = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Admin authenticator" });
if (enrollment.error) return setStatus("Unable to start verification. Try again.");
const challenge = await supabase.auth.mfa.challenge({ factorId: enrollment.data.id });
if (challenge.error) return setStatus("Unable to start verification. Try again.");
const verified = await supabase.auth.mfa.verify({
  factorId: enrollment.data.id, challengeId: challenge.data.id, code,
});
if (verified.error) return setStatus("That code could not be verified. Try again.");
onVerified();
```

Use listFactors to challenge an existing verified TOTP factor; enroll only on explicit enrollment action, avoiding duplicate factors from Strict Mode. Display QR/manual secret only to the operator during enrollment in NoRecording; clear it on success/cancel, never persist or log it. `onVerified` refreshes server context/route so the new aal2 session is checked.

The privacy boundary withholds admin children on initial client transition, synchronously derives isAdminNavigationContext, runs SDK stop/config changes before allowing admin content to mount, and does not mount public analytics/campaign/sign-in tracking controls in admin. Direct admin entry never initialises PostHog. Set SDK automatic history pageview/pageleave off, issue public pageviews explicitly only after checking the current path, and keep a before_send rejection guard for admin URL/referrer/identity context. Include validated admin returnTo during sign-in/auth completion so an admin search destination does not leak in a pageview query string. Gate every asynchronous identify callback against the current full URL at resolution, not the path when its promise started. Stop replay and disable autocapture/exceptions/heatmaps/network body capture on admin using the installed SDK's supported configuration. NoRecording remains an extra DOM defence. Use a full-document public-site link with referrerPolicy=no-referrer when exiting admin; still test arbitrary client navigation boundaries. Do not change public consent preferences to implement route privacy, or manipulate private SDK queues.

```ts
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
// In every identify/session callback, immediately before identify:
if (isAdminNavigationContext(window.location.href)) return;
```

- [ ] **Step 4: Run real MFA/access/privacy browser tests and existing analytics/auth tests.** Inspect decoded SDK payloads as well as request URLs; replay/compressed batches need decoding. Accept only public events captured before entry if they contain no admin identifiers/content. An SDK method call test alone is insufficient evidence. Test 401/denied without a redirect loop and context failures without empty membership success.
- [ ] **Step 5: Commit `feat: protect admin routes with MFA and capture isolation`.** Record R1/R9 evidence and tested installed SDK version in GATES.md.

### Task 4: Owner Team screen

**Files:** Create WEB `src/app/admin/team/page.tsx`, `src/components/admin/AdminTeam.tsx`, `src/lib/admin/actions.ts`; extend admin-access.spec.ts. Add server-only staff loaders beside context.ts; keep exact RPC adapter/contracts.

**Interfaces:** Produces `lookupStaff(email: string): Promise<Result<{ status: "found" | "not_found" | "unconfirmed" | "ambiguous"; match?: StaffMatch }>>`, `assignStaff(input: { userId: string; roles: Exclude<AdminRole, "owner">[]; reason: string; operationId: string }): Promise<Result<StaffRow>>`, `revokeStaff(input: { userId: string; reason: string; operationId: string }): Promise<Result<StaffRow>>`. All are server actions, derive current operator and invoke Team RPCs. No invitation or user enumeration endpoint.

- [ ] **Step 1: Add actual browser lookup → confirm identity → assign → revoke tests.** Assert Team absent for staff, direct route denied, viewer cannot forge assign, owner removal unavailable/DB-denied, unconfirmed/ambiguous messages and stale session action denial.

```ts
const owner = await createAdminFixture("team-owner", ["owner"]);
const staff = await createAdminFixture("team-staff", ["viewer"]);
await owner.login(page, "aal2");
await page.goto("/admin/team");
await page.getByLabel("Existing account email").fill(staff.email);
await page.getByRole("button", { name: "Find account" }).click();
await expect(page.getByText(staff.email, { exact: true })).toBeVisible();
await page.getByLabel("Editor", { exact: true }).check();
await page.getByLabel("Reason").fill("Help maintain recipe drafts");
await page.getByRole("button", { name: "Confirm role assignment" }).click();
await expect(page.getByRole("status")).toContainText("Roles assigned");
await staff.dispose();
await owner.dispose();
```

- [ ] **Step 2: Run `npx playwright test tests/e2e/admin-access.spec.ts --project=chromium-desktop`.** Initially Team page/action assertions fail.
- [ ] **Step 3: Implement owner-only page/actions and minimal identity confirmation.** Trim/normalise email on server; bound length, require non-empty reason and UUID operation ID. Render status/actors/times, active/revoked assignments and predefined role checkboxes. Retain form on typed error; ambiguous status offers restricted operator resolution, not selectable account matches. Use Button/Field/StatePanel and accessible confirmation focus.

```tsx
<p role="status" aria-live="polite">{status}</p>
<button type="submit" disabled={pending || roles.length === 0 || reason.trim().length === 0}>
  Confirm role assignment
</button>
```

- [ ] **Step 4: Run Team browser and DB lifecycle matrix.** Verify a previously open editor/read tab fails its next real RPC after revocation, with no successful mutation. Inspect audit actor equals authenticated owner rather than any posted identifier.
- [ ] **Step 5: Commit `feat: add owner-managed named admin roles`.** Close the Team portion of R2 only with actual browser evidence.

### Task 5: Library, inspection and Increment A acceptance

**Files:** Create WEB `src/app/admin/recipes/page.tsx`, `[recipeId]/page.tsx`, `src/components/admin/AdminLibrary.tsx`, `AdminInspection.tsx`, `AdminRecipePreview.tsx`; create admin-inspection.spec.ts; extend ops/ADMIN-CONSOLE.md and GATES.md.

**Interfaces:** Consumes LibraryResult, RecipeDetail, query parser and recipe/history loaders. Produces `AdminRecipePreview({ snapshot, label }: { snapshot: RecipeSnapshot; label: string })`, `AdminLibrary({ result }: { result: LibraryResult })`, `AdminInspection({ detail, context, returnTo }: { detail: RecipeDetail; context: AdminContext; returnTo: string })`. Later tasks add working/review actions to the same inspection surface.

- [ ] **Step 1: Write library → detail → back tests with an independent fixture expectation.** Search/filter combination, overlapping summaries, page 2, selected row restored, no-match/reset, no-catalog/unavailable distinction, missing body/image and source-unknown states must be visible. Verify four sections, legacy kind/verdict/version, campaign deployment source and no customer controls. Test 320px, 375px and desktop keyboard navigation.

```ts
const fixture = await createAdminFixture("inspection-soup", ["owner"]);
const fixtureTitle = (await fixture.active()).catalog.title;
await fixture.login(page, "aal2");
await page.goto("/admin/recipes?view=published&page=1&q=inspection-soup");
await page.getByRole("link", { name: fixtureTitle, exact: true }).click();
await expect(page.getByRole("heading", { name: "Usage and access" })).toBeVisible();
await expect(page.getByRole("button", { name: "Save recipe" })).toHaveCount(0);
await page.getByRole("link", { name: "Back to recipes" }).click();
await expect(page).toHaveURL(/view=published.*page=1.*q=inspection-soup/);
await expect(page.getByRole("link", { name: fixtureTitle, exact: true })).toBeFocused();
await fixture.dispose();
```

- [ ] **Step 2: Build current app and run admin-inspection.spec.ts on desktop/mobile projects.** Initially library/detail components are absent. Use fixtures with enough matching recipes for page 2; do not weaken the test to a nonexistent row.
- [ ] **Step 3: Implement list/filter/status/preview/usage/history.** Summary counts label whole catalog; filteredTotal labels current results, no additive total. Paginate 25, preserve URL query and a validated selected UUID in back navigation. Load history by cursor rather than all events. Missing body is incomplete rather than not_found. Readiness shows unknown checks separately. Reuse canonical ingredient/method/allergen/storage rendering and safe image formatting; omit save/print/customer conversion/tracking controls. Below 768px use labelled cards and stacked detail. At A, expose Recipes and owner Team only; no inert edit/review/publish buttons.

```tsx
<p>{result.filteredTotal} matching recipes</p>
{result.dependencyChecks.some(check => check.state === "unknown") &&
  <p role="status">Some checks need verification. Retry before making a change.</p>}
<div className="hidden md:block">{desktopTable}</div>
<div className="grid gap-3 md:hidden">{labelledCards}</div>
```

- [ ] **Step 4: Run A's database, unit and browser suites plus existing public recipe/auth/analytics tests.** Run lint/typecheck/build once integrated. Manually inspect synthetic screens at narrow/desktop widths, keyboard/focus and denied/unavailable/MFA states. Record A as inspection-only; do not mark full Phase 1 complete.
- [ ] **Step 5: Commit `feat: deliver admin recipe inspection increment`.** Document the exact local checks/evidence. Activation of a production flag/bootstrap remains a later authorised release action.

## Increment B: working revisions

### Task 6: Lossless snapshots, image metadata and legacy draft migration

**Files:** Create revision migration, `13_admin_recipe_revisions.test.sql`, WEB `src/lib/admin/snapshot.ts`, `tests/admin/snapshot.test.mjs`; modify contracts, recipe data readers and canonical recipe detail image rendering; regenerate database types.

**Interfaces:** Consumes RecipeSnapshot and Base. Produces `patchSnapshot(base: RecipeSnapshot, patch: Partial<RecipeSnapshot>): RecipeSnapshot`, `diffSnapshots(before: RecipeSnapshot, after: RecipeSnapshot): { field: string; before: Json; after: Json }[]`, `private.admin_snapshot_digest(p_snapshot jsonb) RETURNS text`, and `private.admin_active_hash(p_recipe_id uuid) RETURNS text`. `patchSnapshot` is shallow only at named sections, preserves untouched structured JSON and rejects recipeId/slug changes; form field helpers copy the selected record before replacing its known property.

- [ ] **Step 1: Add migration preservation fixtures with two legacy draft rows for one recipe, malformed legacy proposed_content, absent recipe body and extra structured properties.** Pin Review Focus 3: ingredient unknown property and yieldStructured nested data remain byte-equivalent after a title-only edit. Compare baseline catalog/body/review records before and after migration; no fabricated approval or actor. Check image alt/description persist and public readers use them only for active content.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { patchSnapshot } from "../../src/lib/admin/snapshot.ts";
test("title edit preserves unsupported ingredient and yield properties", () => {
  const snapshot = {
    recipeId: "91000000-0000-0000-0000-000000000001", slug: "snapshot-fixture",
    catalog: { title: "Before", publicSummary: "Summary", totalMinutes: 15, mealLabels: [], dietLabels: [] },
    body: { ingredients: [{ item: "Oats", amount: "1", unit: "cup", preparation: { soak: true } }],
      instructions: [{ step: 1, text: "Cook", legacyHint: "gentle heat" }], yield: "2 portions",
      yieldStructured: { portions: 2, legacy: { texture: "soft" } }, reviewedNotes: null,
      allergenReviewState: "reviewed_listed", allergens: ["oats"], storageNotes: null },
    image: { path: "", alt: null, description: null, objectId: null, objectVersion: null },
  };
  const changed = patchSnapshot(snapshot, { catalog: { ...snapshot.catalog, title: "After" } });
  assert.deepEqual(changed.body, snapshot.body);
  assert.equal(changed.catalog.title, "After");
  assert.equal(snapshot.catalog.title, "Before");
});
```

- [ ] **Step 2: Run snapshot units and migration/revision pgTAP tests.** Expect absent helpers/columns initially. The migration rehearsal must start from the previous schema with legacy rows, not merely seed a clean new schema.
- [ ] **Step 3: Add immutable revisions and extend existing recipe_drafts compatibly.** Keep old proposed_content/reviewer_status values as legacy evidence with workflow_schema NULL; never infer a console review. Schema-1 rows use typed snapshot validation and explicit lifecycle. Introduce one-open-head partial unique index; legacy duplicates are excluded and remain inspectable. Add nullable image alt/description/object identity/version columns to recipe_catalog, with no fabricated backfill. Snapshot includes every listed catalog/body/image field and the selected immutable object/version; an object replacement at the same URL requires a changed candidate and fresh review. Base hash also covers active publication state and content version, while timestamps do not create content changes. Preserve array order; object key order does not affect JSONB digest. Disallow duplicate/missing instruction numbers at submission, not by rewriting imported content silently.

```sql
ALTER TABLE public.recipe_catalog
  ADD COLUMN preview_image_alt text,
  ADD COLUMN preview_image_description text,
  ADD COLUMN preview_image_object_id uuid,
  ADD COLUMN preview_image_object_version text;
ALTER TABLE private.recipe_drafts
  ADD COLUMN workflow_schema integer,
  ADD COLUMN lifecycle text,
  ADD COLUMN base_content_version integer,
  ADD COLUMN base_active_hash text,
  ADD COLUMN working_version integer,
  ADD COLUMN current_revision_id uuid,
  ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN updated_by uuid REFERENCES auth.users(id);
CREATE UNIQUE INDEX recipe_one_open_console_head ON private.recipe_drafts (recipe_id)
  WHERE workflow_schema = 1 AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
CREATE FUNCTION private.admin_snapshot_digest(p_snapshot jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT encode(extensions.digest(convert_to(p_snapshot::text, 'UTF8'), 'sha256'), 'hex');
$$;
```

Create recipe_revisions with a full snapshot, database digest, recipe/draft/version/base/actor/time, unique(draft, version), FKs and append-only protection. Constraints apply to schema-1 heads without rewriting malformed legacy proposals. Snapshot decoder rejects extra top-level/control keys, accepts supported scalar fields plus lossless JSON body values, and bounds payload size. An incomplete body stays null or explicitly incomplete until the editor creates it. Supported tags reuse existing recipe filter definitions; preserve imported unknown labels, flag them for deliberate resolution and prohibit adding arbitrary unrecognised labels through the new selector.

Extend RecipeCatalogItem imageAlt/imageDescription as nullable fields and every existing catalog projection/mapper; legacy images retain their current title fallback. The public hero and OpenGraph image use persisted alt, and the reader displays the active description where supplied. Decorative card images remain decorative, so do not force duplicate announcements. Working metadata never enters these readers.

- [ ] **Step 4: Replay migration with synthetic legacy data, run lossless/digest units and SQL tests, then existing data/canonical reader tests.** Prove field ordering/key ordering, null/missing body, Unicode and meaningful image/title changes bind the digest. Confirm published content fields did not change during migration, apart from new nullable metadata columns.
- [ ] **Step 5: Commit `feat: model private recipe revision snapshots`.** Record migration compatibility and public metadata integration evidence under R4/R11.

### Task 7: Atomic start/save/rebase with idempotent retry

**Files:** Extend revision migration and revision SQL tests; create WEB `tests/e2e/admin-concurrency.spec.ts`; add draft operations to `src/lib/admin/recipes.ts`, server actions and contracts.

**Interfaces:** Produces `startAdminDraft(recipeId: string, operationId: string): Promise<Result<Revision>>`, `saveAdminDraft(input: DraftCommand): Promise<Result<MutationReceipt>>`, `rebaseAdminDraft(input: DraftCommand & { newBase: Base }): Promise<Result<MutationReceipt>>`, and `loadAdminRevision(recipeId: string, revisionId: string): Promise<Result<Revision>>`. DB equivalents: `public.admin_draft_start(p_recipe_id uuid, p_operation_id uuid)`, `public.admin_draft_save(p_command jsonb)`, `public.admin_draft_rebase(p_command jsonb)` and `public.admin_recipe_revision(p_recipe_id uuid, p_revision_id uuid)` return jsonb. The private revision read also checks its recipe target.

- [ ] **Step 1: Add save/start/rebase tests with two sessions and exact independent expectations.** Start racing creates one head; incomplete safe draft can save; forbidden control/access keys are rejected. A second editor's stale version conflicts without changing content. An out-of-band active change conflicts despite an unchanged body version. Same operation/payload returns one outcome; same ID/different payload is INVALID. Pin Review Focus 2: an approved no-change save adds no revision/audit and keeps approval. Editing approved/submitted content without reopenReviewed is BLOCKED.

```sql
SELECT is((public.admin_draft_save(pg_temp.no_change_command()) ->> 'version')::integer,
  pg_temp.admin_version('approved'), 'no-change retains working version');
SELECT is((SELECT count(*) FROM private.recipe_revisions WHERE draft_id = pg_temp.approved_draft()),
  pg_temp.before_revision_count(), 'no-change adds no snapshot');
SELECT is((SELECT lifecycle FROM private.recipe_drafts WHERE id = pg_temp.approved_draft()),
  'approved', 'no-change preserves review eligibility');
```

For these assertions extend the SQL fixture with exact test-only helpers `pg_temp.no_change_command() RETURNS jsonb`, `pg_temp.approved_draft() RETURNS uuid` and `pg_temp.before_revision_count() RETURNS bigint`; their approved state is synthetic fixture setup by postgres, not a production review bypass.

- [ ] **Step 2: Run revision pgTAP and a two-connection Node/Playwright integration test.** pgTAP alone does not prove race behaviour; use separate PostgreSQL connections and a lock barrier, not timing sleeps, for simultaneous saves/start. Run only loopback fixture targets.
- [ ] **Step 3: Implement transactions with this ordering.** Derive actor through admin_assert(recipe.edit, editing); acquire recipe row then working-head lock; verify canonical operation hash/replay; compare active base hash/version and working version/digest; validate snapshot and target identity; detect no-change; require review-reopen acknowledgement for changed reviewed content; insert immutable snapshot/update head; record operation receipt and mutation audit together. Starting creates revision 1 from the active snapshot; starting an existing head returns it without altering it. No-op save may record a replay receipt but emits no save mutation audit. Never update public catalog/body or membership/free-slot/entitlement/price data.

```sql
IF v_head.working_version <> v_expected_version
   OR v_current_revision.digest <> v_expected_digest
   OR private.admin_active_hash(v_recipe_id) <> v_head.base_active_hash THEN
  RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
END IF;
IF private.admin_snapshot_digest(v_normalised_candidate) = v_current_revision.digest THEN
  RETURN private.admin_no_change_receipt(v_actor, v_operation_id, v_head.id);
END IF;
```

`private.admin_no_change_receipt(p_actor uuid, p_operation_id uuid, p_draft_id uuid) RETURNS jsonb` is implemented in this task; it stores a minimal operation result without a new version/audit. Reuse Task 1's admin_begin_operation/admin_finish_operation functions for duplicate-request serialisation and canonical request-hash checks. Do not introduce a second operation ledger.

Rebase compares the current working version/digest and old base, requires newBase equals the currently locked active snapshot, saves the operator's explicitly chosen full candidate under that new base and resets review. It never silently merges. Old snapshots/decisions remain. History restore uses loadAdminRevision to prepare a candidate in the editor and then the same explicit save/rebase path; it cannot update active projection directly.

- [ ] **Step 4: Run safe-save, no-op, forbidden payload, real concurrency and replay tests.** Assert old public catalog/body/image/access snapshots match byte-for-byte after each private operation. Recheck permission before replay; a revoked session cannot retrieve private receipt content or perform a write.
- [ ] **Step 5: Commit `feat: save recipe drafts with concurrency and replay protection`.** Record actual transaction/concurrency evidence in R4/R5.

### Task 8: Structured editor, comparison and recoverable save UX

**Files:** Create WEB `src/app/admin/recipes/[recipeId]/edit/page.tsx`, `src/components/admin/AdminRecipeEditor.tsx`, `AdminRecipeCompare.tsx`; create admin-editing.spec.ts; extend snapshot units, inspection actions and server actions.

**Interfaces:** Consumes draft start/save/rebase/revision read, snapshot patch/diff and contracts. Produces `AdminRecipeEditor({ initial, active, base, returnTo }: { initial: Revision; active: RecipeSnapshot; base: Base; returnTo: string })` and `AdminRecipeCompare({ active, stored, candidate, onApply }: { active: RecipeSnapshot; stored: RecipeSnapshot; candidate: RecipeSnapshot; onApply: (snapshot: RecipeSnapshot) => void })`. Client state owns unsaved fields and the operation ID for a pending attempt; server/DB remain authoritative for version/digest and validation.

- [ ] **Step 1: Write real editor tests for every field group, save/reopen, failure and conflict.** Test unchanged approved save, explicit reopen, readonly UUID/slug, missing body, unknown structured properties, ingredient/step keyboard reorder, invalid time/allergen declarations and operation response loss. Compare active/public snapshot before and after save. Pin Review Focus 3 in a real RPC round-trip, not only a helper unit.

```ts
const fixture = await createAdminFixture("private-edit", ["owner"]);
await fixture.login(page, "aal2");
const before = await fixture.active();
await page.goto(`/admin/recipes/${fixture.recipeId}/edit`);
await page.getByLabel("Title", { exact: true }).fill("Private revised title");
await page.getByRole("button", { name: "Save draft", exact: true }).click();
await expect(page.getByRole("status")).toContainText("Saved at");
expect(await fixture.active()).toEqual(before);
await page.reload();
await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Private revised title");
await fixture.dispose();
```

- [ ] **Step 2: Run admin-editing.spec.ts and snapshot units on local fixtures.** Expect absent editor/form behaviour initially; tests must use actual authenticated RPCs rather than a page with mocked success responses.
- [ ] **Step 3: Implement controlled form sections and explicit save/compare/rebase.** Copy the initial snapshot into React memory only. On change update one known property while preserving extras. Label title/summary/time/meal/diet/yield/notes/allergen/image fields; render unsupported structured values with explanation and preserve them until deliberate field resolution. Add/remove/move ingredient and step controls with keyboard names; renumber a deliberately edited instruction list consistently. No drag-only interaction. Show validation issues and focusable field links; safe incomplete content can save, wrong types cannot be submitted as fabricated valid values.

```ts
function updateIngredient(index: number, item: string) {
  setCandidate(previous => {
    if (!previous.body || !Array.isArray(previous.body.ingredients)) return previous;
    const ingredients = previous.body.ingredients.map((row, i) =>
      i === index && row && typeof row === "object" && !Array.isArray(row)
        ? { ...row, item } : row);
    return { ...previous, body: { ...previous.body, ingredients } };
  });
}
```

Saving retains one operationId until an unambiguous result; retry after a lost response uses it unchanged. A new edit after that pending attempt must resolve the earlier outcome first rather than reuse its ID with a different payload. Success updates expected version/digest/base from the server. INVALID, UNAVAILABLE and CONFLICT retain typed fields. Compare shows active, stored working and local candidate; per-field choices build a new explicit candidate, no default silent overwrite. Fetch fresh Base before rebase and pass it to rebaseAdminDraft. Save-after-revocation returns denied and never reports Saved.

Install beforeunload for unsaved changes, guard internal admin navigation with a confirmation dialog, preserve cancellation focus and keep browser back recovery understandable. No localStorage/sessionStorage draft body, URL content, console logging or generic exports. History's Use as new draft loads the selected authorised snapshot into this same editor, makes its older provenance visible and requires a new save/review.

- [ ] **Step 4: Run real save/error/concurrency/rebase tests, keyboard/error-summary/live-region/focus tests and 320/375px overflow checks.** Manually inspect a long ingredient/method and conflict comparison. Verify no active title/body/alt changed and no private editor payload appeared in anonymous responses or optional telemetry.
- [ ] **Step 5: Commit `feat: add private recipe editing and comparison`.** Close only evidence-backed portions of R4/R5/R10.

### Task 9: Existing image selection, trusted availability checks and Increment B gates

**Files:** Create WEB `src/lib/admin/assets.ts`, `src/lib/admin/asset-path.ts`, `src/components/admin/AdminRecipeAssets.tsx`, `tests/admin/assets.test.mjs`; extend revision migration with asset-check records/functions and editing tests; extend admin_recipe_status and inspection/preview; update ops/ADMIN-CONSOLE.md and GATES.md.

**Interfaces:** Produces `parseRecipeAsset(path: string, supabaseOrigin: string): Result<{ objectName: string }>`, `listAdminAssets(): Promise<Result<Asset[]>>`, `verifyAdminAsset(revision: Revision): Promise<Result<{ objectId: string; checkedAt: string; available: boolean }>>`, and `AdminRecipeAssets({ value, assets, onChange }: { value: RecipeSnapshot["image"]; assets: Asset[]; onChange: (image: RecipeSnapshot["image"]) => void })`. DB read `public.admin_recipe_assets() RETURNS jsonb` is permission/MFA gated. Private checker `private.admin_record_asset_check(p_revision_id uuid, p_digest text, p_object_id uuid, p_object_version text, p_available boolean, p_checked_at timestamptz) RETURNS void` is executable only by restricted server/operator credentials, never authenticated/anon.

- [ ] **Step 1: Test allowed existing catalog-referenced bucket objects versus missing, external, traversal and arbitrary unreferenced objects.** Image provenance starts requires_review unless real recorded evidence exists. Test description/alt survives save/reopen but active public values stay unchanged. Pin Review Focus 4 with object deletion after an approval fixture; evaluator becomes unknown/fail and the eventual publication gate must reject it in Task 12.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { parseRecipeAsset } from "../../src/lib/admin/asset-path.ts";
test("asset reference cannot redirect verification outside the recipe bucket", () => {
  const result = parseRecipeAsset("https://attacker.test/recipe.webp", "https://fixture.supabase.test");
  assert.equal(result.ok, false);
  const traversal = parseRecipeAsset("https://fixture.supabase.test/storage/v1/object/public/recipe-images/../private/x", "https://fixture.supabase.test");
  assert.equal(traversal.ok, false);
});
```

- [ ] **Step 2: Run asset units and actual selector/save browser tests.** Initially list/verification functions are absent; the positive fixture must provide a real local Storage object, not just an arbitrary external URL.
- [ ] **Step 3: Implement the bounded selector and trusted source check.** Enumerate only existing catalog-referenced recipe-images objects through a protected query; do not list all storage buckets. Accept only the configured Supabase origin and expected public recipe-images prefix, no credentials/query redirects, traversal, external URLs or arbitrary files. HEAD uses fixed origin, no redirect following, bounded timeout and matching object/version metadata. An error is unknown/unavailable, not a fabricated valid image.

```ts
const requestId = crypto.randomUUID();
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseOrigin) return { ok: false, code: "UNAVAILABLE", reference: requestId };
const parsed = parseRecipeAsset(revision.snapshot.image.path, supabaseOrigin);
if (!parsed.ok) return parsed;
const encodedObject = parsed.value.objectName.split("/").map(encodeURIComponent).join("/");
const validatedUrl = new URL(`/storage/v1/object/public/recipe-images/${encodedObject}`, supabaseOrigin);
const response = await fetch(validatedUrl, {
  method: "HEAD", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(3000),
});
if (!response.ok) return { ok: false, code: "UNAVAILABLE", reference: requestId };
```

The trusted server first verifies current operator/MFA/recipe permission through the normal session and then writes only the narrow asset-check function through existing server-only PostgreSQL configuration. Clients cannot post their own availability/time. Store object ID plus metadata version/ETag binding, digest and checkedAt; the candidate's image.objectId/objectVersion must match the checked object, not only its URL. Publication accepts checks at most 60 seconds old and rechecks storage.objects identity/version in its transaction. If the version changed, prepare a new candidate and review rather than silently refreshing approval. Keep parseRecipeAsset in the pure asset-path module and server/DB/HEAD work in assets.ts. Display longer-lived recorded review provenance separately from short-lived object availability. Preserve an existing active image as a legacy preview even if it cannot qualify a new candidate. New candidates need an explicit reviewer image suitability decision when provenance is absent; never call every referenced asset approved automatically. No upload/generation/delete control.

Preview is guarded and rendered in the admin session with labels Active recipe/Working revision, persisted candidate alt/description and canonical recipe primitives. A private revision URL never becomes a public preview token. After image changes, validation and readiness use the new digest; existing approvals remain historical only.

- [ ] **Step 4: Run B's SQL/unit/browser suites, public metadata/read-access regressions, lint/typecheck/build.** Verify actual asset disappearance, response loss and concurrent save; inspect no private storage/cache/telemetry leaks. Compare original active projection byte-for-byte after the entire B flow. Record B as private editing only; no review/publish/withdraw controls until C's gate.
- [ ] **Step 5: Commit `feat: select and verify existing recipe images`.** Record B evidence and its still-unmet publication gates; do not activate production editing without the release procedure.

## Increment C: reviewed publication

### Task 10: Frozen submissions, structured issues and exact human decisions

**Files:** Create review migration, `14_admin_recipe_reviews.test.sql`; extend contracts, server recipes/actions, readiness evaluator/history; regenerate database types.

**Interfaces:** Produces `submitAdminRevision(input: Operation & { revisionId: string; expectedVersion: number; expectedDigest: string }): Promise<Result<Revision>>`, `reviewAdminRevision(input: ReviewCommand): Promise<Result<MutationReceipt>>`, `recordAdminIssue(input: Operation & { revisionId: string; expectedDigest: string; code: string; field: string; severity: "blocker" | "suggestion"; explanation: string }): Promise<Result<{ issueId: string }>>`. DB functions `public.admin_revision_submit(p_command jsonb)`, `public.admin_revision_review(p_command jsonb)`, `public.admin_revision_issue(p_command jsonb)` return jsonb and enforce edit/review permissions respectively. Consume the shared Revision.submissionId and ReviewCommand.submissionId contracts; B revisions return null until a submission exists.

- [ ] **Step 1: Write review matrix tests.** Incomplete/structurally invalid snapshots cannot submit; image suitability can be a human-review issue rather than making review impossible. Unknown allergen declaration cannot approve/publish. Stale version/digest/submission, wrong role, open blocker, changes_requested/reject and legacy approve_with_changes do not clear readiness. Owner can review their own revision with correct provenance. No-op preserves approval; changed title, body, image, alt or description invalidates it. Resubmission cannot reuse an old decision merely because the content digest is the same.

```sql
SELECT throws_ok($$SELECT public.admin_revision_review(pg_temp.stale_review_command())$$,
  '40001', 'ADM_CONFLICT', 'decision is bound to current submitted snapshot');
SELECT is((public.admin_revision_review(pg_temp.approve_current_command()) ->> 'digest'),
  pg_temp.admin_digest('submitted'), 'approval preserves exact digest');
SELECT ok((private.admin_recipe_status(pg_temp.admin_recipe('submitted')) ->> 'readyToPublish')::boolean,
  'zero-blocker exact approval qualifies when other sources pass');
```

The SQL fixture defines test-only `pg_temp.stale_review_command() RETURNS jsonb` and `pg_temp.approve_current_command() RETURNS jsonb` from its real revision/submission IDs. Build each gate fixture independently; a happy approved fixture includes a valid current asset check and known campaign/usage source.

- [ ] **Step 2: Run new review pgTAP and existing publication/allergen/legacy review tests.** Expect missing review RPCs first. Preserve existing legacy predicates/triggers rather than changing historical evidence to satisfy a new test.
- [ ] **Step 3: Implement append-only submission/decision/issue events.** Add `private.recipe_review_submissions(id, revision_id, digest, version, submitted_by, submitted_at)`, `current_submission_id` on schema-1 heads, and `submission_id` on decisions. Populate the existing shared submissionId DTO fields from these columns; context/detail decoders are updated together. A decision is allowed only for the current submitted head/snapshot/submission and locks the head before deciding. Concurrent decisions cannot both claim the same undecided submission. Changed save clears submission eligibility; history remains. An explicit resubmit creates a new submission, so awaiting-review checks the current submission's decision rather than any historical matching digest.

```sql
IF v_head.lifecycle <> 'submitted'
   OR v_head.current_submission_id <> v_submission_id
   OR v_revision.id <> v_expected_revision_id
   OR v_revision.version <> v_expected_version
   OR v_revision.digest <> v_expected_digest THEN
  RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ADM_CONFLICT';
END IF;
```

Issues have stable codes/IDs, field or whole-recipe scope, origin, severity and explanation. Keep immutable issue creation/resolution events. Validation/source blockers can clear only when the actual condition passes; a reviewer cannot click away an invalid field or failed source. Human issues, including image depiction/provenance, require explicit resolution with actor/time/reason bound to the current digest. Cosmetic suggestions do not block. Approve applies the specified human resolutions atomically, then verifies no unresolved blockers, consistent allergen declaration and current checks. Do not infer nutrition/medical approval from a label or create an AI reviewer. Append the real human actor and exact digest; legacy rows retain kind/verdict/version unchanged until a compatible record is appended at publication.

Shared field checks must be deterministic SQL validation reused by submit/status/publish. Submission requires meaningful ingredient/method arrays and safely understood structural fields; human-review issues may remain for the reviewer. An unknown allergen declaration remains a blocker for approval/publication. Ingredient amount/unit types, integer positive time, ordered unique steps, known label choices and reviewed-listed/no-allergens consistency are explicit checks. Every title/image/metadata change is in the same full-snapshot digest.

- [ ] **Step 4: Run review/issue/retry/concurrency and legacy-gate tests.** Confirm approvals/resolutions survive in history after edits but do not qualify a changed target, resubmission gets a new decision, and owner self-review is visibly recorded.
- [ ] **Step 5: Commit `feat: bind recipe review to exact private revisions`.** Update R6 with the actual covered field-change and stale-submission cases.

### Task 11: Review controls and actionable readiness

**Files:** Create WEB `src/components/admin/AdminRecipeReview.tsx`; extend inspection/editor readiness and admin-publication.spec.ts.

**Interfaces:** Consumes submitAdminRevision, reviewAdminRevision, recordAdminIssue, Readiness, Revision.submissionId and ReviewCommand.submissionId. Produces `AdminRecipeReview({ detail, context, onChanged }: { detail: RecipeDetail; context: AdminContext; onChanged: () => void })`. It never creates a verdict client-side or calls publication implicitly.

- [ ] **Step 1: Add browser editor → submit → reviewer → approve/changes/reject cases.** A viewer sees status but no action, editor can submit but cannot review, reviewer can decide but not edit/publish, and owner can complete all. After review, a metadata-only edit shows the acknowledgement and new review requirement. Error summary/focus and reason/issue controls work with keyboard.

```ts
await page.getByRole("button", { name: "Submit for review", exact: true }).click();
await expect(page.getByRole("status")).toContainText("Awaiting review");
await page.getByLabel("Review reason").fill("Checked instructions, allergens and the selected image");
await page.getByLabel("Resolve image suitability issue").check();
await page.getByRole("button", { name: "Approve this revision", exact: true }).click();
await expect(page.getByText("This revision is approved and ready to publish.", { exact: true })).toBeVisible();
```

- [ ] **Step 2: Run the real review browser scenarios on local desktop/mobile.** Initial failure is missing controls/transition; assert the stored DB decision and digest as well as visible copy.
- [ ] **Step 3: Implement per-permission review controls with exact target identity.** Display current candidate version/digest label, who submitted/reviewed it and original legacy evidence separately. Pass submissionId from the last server-loaded target; refresh conflict instead of applying a decision to a newer version. Show field/source/human blockers, cosmetic suggestions and unknown checks with next action. Buttons disable only when inapplicable and explain why; the DB still enforces authority. Human issue resolution includes explicit acknowledgement and reason, not a catch-all Approve everything.

```tsx
<button type="submit" disabled={pending || reason.trim().length === 0 || !canReviewCurrentSubmission}>
  Approve this revision
</button>
<p aria-live="polite" role="status">{status}</p>
```

- [ ] **Step 4: Run review browser cases with real RPC results, verify stored issue events/provenance and accessible focus recovery at 320/375px.** Ensure approval refreshes readiness but leaves public active content unchanged.
- [ ] **Step 5: Commit `feat: expose recipe review and readiness workflow`.** Record the reviewer/owner and role-separated paths under R6/R10.

### Task 12: Atomic publication, impact concurrency and recorded withdrawal

**Files:** Create publication migration and `15_admin_recipe_publication.test.sql`; extend recipe contracts/RPC server wrappers, readiness/usage, SQL fixtures and operation/archive foundations; regenerate database types.

**Interfaces:** Produces `loadAdminImpact(recipeId: string): Promise<Result<{ usage: Usage; impactToken: string }>>`, `publishAdminRevision(input: PublishCommand): Promise<Result<MutationReceipt>>`, `withdrawAdminRecipe(input: WithdrawCommand): Promise<Result<MutationReceipt>>`. DB functions: `public.admin_recipe_impact(p_recipe_id uuid)`, `public.admin_revision_publish(p_command jsonb)` and `public.admin_recipe_withdraw(p_command jsonb)` return jsonb. The impact token is a database-derived canonical hash of target/base and dependency facts; clients cannot supply authoritative campaign membership or source-check results.

- [ ] **Step 1: Write atomic publish/withdraw tests and independent table snapshots.** Include exact approved snapshot, title-only/body/image changes, body missing, stale base/version/digest, changed review, wrong role/aal, missing asset/source, live offer/pending attempt/historical payment/sealed membership, test-only activity, free/campaign withdrawal acknowledgement and owner-only emergency. Retry same operation produces one version/archive/audit; reuse with different input is INVALID. Pin Review Focus 4: delete/change asset object after approval, publication denies and active remains unchanged. Inject failure between body/catalog/history writes and assert all old rows remain.

```sql
CREATE FUNCTION pg_temp.fail_publication_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.action = 'recipe.publish' THEN RAISE EXCEPTION 'synthetic publication fault'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER synthetic_publication_fault BEFORE INSERT ON private.admin_audit
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_publication_audit();
SELECT throws_ok($$SELECT public.admin_revision_publish(pg_temp.publish_command())$$,
  'P0001', 'synthetic publication fault', 'transaction fault reaches caller');
SELECT is((SELECT title FROM public.recipe_catalog WHERE id = pg_temp.admin_recipe('publishable')),
  'Before publication', 'catalog rolled back');
SELECT is((SELECT content_version FROM public.recipe_bodies WHERE recipe_id = pg_temp.admin_recipe('publishable')),
  pg_temp.before_active_version(), 'body version rolled back');
```

Define `pg_temp.publish_command() RETURNS jsonb` and `pg_temp.before_active_version() RETURNS integer` in this task's fixture; also assert archive/review/operation/audit counts unchanged. The injected trigger exists only in the rolled-back test transaction, never a production migration/config switch.

- [ ] **Step 2: Run publication pgTAP and actual two-connection impact-race tests.** Start a membership/seal/offer/order mutation in one transaction and publish in another; publication must retry/refuse a busy impact snapshot or see the committed exposure. It cannot pass using a previously empty dependency read.
- [ ] **Step 3: Implement narrow transactions and deterministic dependency checks.** Current permission/MFA/stage check first, then operation ownership/replay. For a new publication, acquire short bounded SHARE locks with NOWAIT on free_recipe_slots, collection_recipes, collection_releases, release_manifests, commercial_offers, purchase_orders, provider_payments and admin_campaign_snapshots, in that order, before recipe/head row locks. Lock the caller's membership/settings rows and recheck current authority before mutation. This freezes promise/commercial predicates including concurrent inserts without changing checkout/payment business logic. Map a busy lock to a safe retry/unavailable result and roll back. No network call while locks are held; asset HEAD precedes the RPC. This coarse lock suits the small owner-operated first phase; Phase 2 may replace it with a proven narrower writer protocol.

```sql
LOCK TABLE public.free_recipe_slots, public.collection_recipes, public.collection_releases,
  private.release_manifests, private.commercial_offers,
  private.purchase_orders, private.provider_payments,
  private.admin_campaign_snapshots IN SHARE MODE NOWAIT;
SELECT * INTO v_catalog FROM public.recipe_catalog WHERE id = v_recipe_id FOR UPDATE;
SELECT * INTO v_head FROM private.recipe_drafts WHERE recipe_id = v_recipe_id
  AND workflow_schema = 1 AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected') FOR UPDATE;
```

Compute fresh usage under these locks. Block ordinary publication if any member release is sealed/retired under the existing protected-release guard, sales-enabled live, linked to an unresolved live attempt or verified historical payment. Inspect manifests/historical snapshot membership as well as current collection_recipes, so removed current membership cannot hide sold history. Unknown/malformed required exposure sources block. Compare impactToken to the canonical current facts; compare activeHash/contentVersion and expected current revision/version/digest; verify current submission has approve, all blockers cleared and the exact asset object/version exists with a successful trusted check no older than 60 seconds. Lock the selected storage.objects metadata row FOR SHARE until commit. A client-supplied asset-success flag has no effect.

For campaign truth, create `private.admin_campaign_snapshots(deployment_revision text PRIMARY KEY, configuration jsonb, configuration_hash text, recorded_at timestamptz)` and current campaign revision in admin_console_settings. Only a trusted deployment/operator action records the active application's CAMPAIGNS payload; authenticated users cannot create or activate it. The server compares DB snapshot hash/revision with its deployed configuration. Missing/mismatched snapshots are unknown and block writes. Seed a clearly labelled local synthetic configuration only in tests. Publication impact includes campaign/free references for confirmation; campaign-sensitive withdrawal cannot be bypassed by a direct RPC with omitted references.

On success archive the entire old active snapshot/control state; upsert reviewed body fields and increment content_version once; append a legacy human approve record for that new body version with actual reviewer identity and nullable `admin_revision_id`/`reviewed_digest` linkage columns; update reviewed catalog/image metadata and publication state; mark head published; append publication event/audit and operation receipt. Preserve existing review/free-slot/membership triggers. New explicit approval does not change the allergen declaration to a value absent from the reviewed snapshot. An already-published replacement retains original published_at; first publication sets it, deliberate republishing records a new event and preserves historical dates in archives. The transaction contains no collection/free-slot/entitlement/offer/order/payment/refund writes.

Withdrawal uses the same fresh dependency locks, operation replay, active base comparison and reason. Ordinary publisher may withdraw only an unprotected recipe. Public sample or published campaign impact requires current owner plus acknowledgePromiseImpact. Sealed/live-commercial/historical payment references require owner recipe.emergency_withdraw with emergency=true; record full dependency references and acknowledgement. Preserve content version/body/history and customer rights; changing catalog publication state may deny existing reader access under current RLS and this consequence is shown explicitly. There is no hard delete, automatic refund, entitlement revoke, message send or link removal. Republish uses a newly current reviewed candidate, never undoing audit history.

- [ ] **Step 4: Run transaction fault, exact snapshot, replay, asset disappearance, impact-race and commercial-boundary tests plus existing payment/access integration.** Compare every untouched membership/free-slot/price/entitlement/payment row before/after ordinary and emergency operations. Verify captured/refunded historical payments remain protected and test-only activity is labelled separately. Measure the bounded lock duration on synthetic data; never run provider charge/refund calls for these tests.
- [ ] **Step 5: Commit `feat: publish and withdraw reviewed recipes atomically`.** Record R7/R8 evidence and the chosen coarse lock's operational limit. Do not claim these SQL tests prove the released browser flow.

### Task 13: Publication confirmations, refresh-only recovery and operational failure audit

**Files:** Create WEB `src/components/admin/AdminRecipePublication.tsx`, `src/lib/admin/refresh.ts`, `src/lib/admin/refresh-result.ts`, `tests/admin/refresh.test.mjs`; extend server actions/recipes and admin-publication.spec.ts; extend publication migration with restricted failure-audit function.

**Interfaces:** Produces `refreshAdminRecipe(receipt: MutationReceipt): Promise<RefreshReceipt>`, `retryAdminRefresh(operationId: string, recipeId: string): Promise<Result<RefreshReceipt>>`, `AdminRecipePublication({ detail, context, onChanged }: { detail: RecipeDetail; context: AdminContext; onChanged: () => void })`. Pure `settleCommittedRefresh(operationId: string, refresh: () => Promise<void>): Promise<RefreshReceipt>` supports unit verification. The restricted server-only `private.admin_record_failure(p_actor_id uuid, p_action text, p_target uuid, p_operation_id uuid, p_code text, p_request_reference text) RETURNS void` records safe failed attempts independently after a rolled-back transaction; authenticated/anon cannot execute it.

- [ ] **Step 1: Test exact confirmation, permission/impact changes while open, response loss and refresh failure.** Confirmation names candidate/version/changed fields and affected references, requires reason, focus returns on cancel. Ordinary/emergency paths have their real consequences. A commit followed by failed display refresh is visibly saved/pending and retry never calls publication again.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { settleCommittedRefresh } from "../../src/lib/admin/refresh-result.ts";
test("committed write remains saved when refresh fails", async () => {
  const result = await settleCommittedRefresh("operation-fixture", async () => { throw new Error("refresh unavailable"); });
  assert.deepEqual(result, { operationId: "operation-fixture", state: "pending" });
});
```

```ts
await page.getByRole("button", { name: "Confirm publication", exact: true }).click();
await expect(page.getByRole("status")).toContainText("Saved; display refresh pending");
const committed = await fixture.snapshot();
await page.getByRole("button", { name: "Retry display refresh", exact: true }).click();
expect((await fixture.snapshot()).contentVersion).toBe(committed.contentVersion);
expect(await fixture.operationCount(operationId)).toBe(1);
```

`operationId` is captured from the synthetic test's actual mutation request. Fault injection intercepts only the refresh response after a real DB publication; the successful write itself is not mocked.

- [ ] **Step 2: Run refresh units and publication browser failure scenarios.** Initially the refresh separation/confirmation controls are absent; prove the test sees the committed DB state while the UI receives a pending refresh result.
- [ ] **Step 3: Implement confirmation/preflight and post-commit refresh as distinct operations.** Refresh current impact and asset check before showing/confirming action, and pass expected snapshot identity and impact token. DB rechecks independently. Use one pending operationId across ambiguous retries. After a successful DB receipt revalidate `/recipes`, canonical `/recipes/[slug]`, `/admin/recipes`, the target admin detail/edit and every affected `/stories/[campaignSlug]`/collection display using established Next revalidation APIs. Never revalidate before commit or optimistically display a new active title. Retry verifies current session, permission and the committed operation's target, then revalidates only.

```ts
export async function settleCommittedRefresh(
  operationId: string, refresh: () => Promise<void>,
): Promise<RefreshReceipt> {
  try { await refresh(); return { operationId, state: "complete" }; }
  catch { return { operationId, state: "pending" }; }
}
```

Keep the pure helper separate from Next's server-only revalidatePath imports. Only typed DTO receipts cross the client boundary. A failure audit uses the verified session actor, fixed action/code/target/request reference and no raw recipe/auth/provider payload; it never trusts posted actor identity. It cannot obscure the original failure if audit persistence is unavailable. Successful mutation audit stays in its atomic transaction. Generic diagnostics contain only safe code/reference, while operational history remains consent-independent and private.

Use clear Published/Withdrawn/Saved draft language and display the active versus working version separately. Emergency confirmation explicitly states possible customer read loss and no automatic refund/rights change. Modal controls are keyboard accessible, field errors focusable and status announcements polite. History restore opens a new candidate and review path, not a direct publication action.

- [ ] **Step 4: Run browser whole workflow/recovery, real DB repeat-operation checks, focus/keyboard/mobile tests and optional-analytics payload checks.** Prove refresh-only retry emits no new publication audit/version and source/permission conflicts keep the previous projection intact.
- [ ] **Step 5: Commit `feat: add publication confirmation and display recovery`.** Record browser R7/R10 evidence separately from the database tests.

### Task 14: Full regression, migration rehearsal and reviewable release package

**Files:** Finalise `.github/workflows/web-ci.yml`, WEB package verify, relevant existing-reader/browser tests, `ops/ADMIN-CONSOLE.md` and `docs/implementation/admin-recipes/GATES.md`. Fix implementation files only where a remaining acceptance failure requires it.

**Interfaces:** Consumes the complete A/B/C contracts. Produces a runnable, locally verified Phase 1 and a release package identifying the source SHA, migration order, required configuration, owner bootstrap, stage activation and rollback. Production execution remains separate and requires release authorisation.

- [ ] **Step 1: Pin existing-reader regressions with actual public/customer sessions.** Anonymous reads exactly the promised free-slot recipes and no drafts/paid body; entitled/non-entitled access remains correct; legacy inspection still works; staff console role confers no purchase rights; save/print/canonical links and campaign counts remain stable. Check every final action's role/MFA/direct-call/privacy/retry cases, source unavailability and database payload isolation. Link the expected recipe/campaign identifiers in evidence without private production exports.

```ts
const publicResponse = await page.request.get(`/recipes/${fixture.recipeSlug}`);
expect(await publicResponse.text()).not.toContain("SENTINEL_PRIVATE_UNPUBLISHED_REVISION");
await fixture.login(page, "aal2");
await page.goto(`/admin/recipes/${fixture.recipeId}`);
await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
```

- [ ] **Step 2: Execute the smallest final checks appropriate to the complete change and existing required CI jobs.** From root, replay migrations and run pgTAP only against the guarded local stack; from WEB run lint, typecheck, admin/data/homepage/phase10 units, build and e2e. Required job names remain web-quality and backend-quality. Backend integration now includes real admin-access/admin-publication RPC tests once on desktop in addition to data-access; frontend job covers responsive workflows/privacy. No test.skip for an unavailable local fixture dependency: setup must fail with a clear safe reason. Do not duplicate every browser scenario in both jobs.

```bash
# Repository root, after local target guard and synthetic-data rehearsal setup:
supabase db reset
supabase test db
supabase gen types typescript --local > /tmp/mch-admin-types.gen.ts
diff -u my-curated-haven-web/src/lib/types/database.ts /tmp/mch-admin-types.gen.ts
# Working directory: my-curated-haven-web
npm run lint
npm run typecheck
npm run test:phase10:unit
npm run test:homepage:unit
npm run test:data:unit
npm run test:admin:unit
npm run build
npm run test:e2e -- --workers=1
```

These commands are future execution requirements, not passed checks today. Use a private ignored directory for traces/auth state, and only synthetic recipe data in screenshots. Compare type drift against generated local types; do not hide it by hand-editing generated interfaces. Once all checks pass, repeat only when later changes/failures justify it.

- [ ] **Step 3: Rehearse migration from the prior schema and close every acceptance gate with evidence.** Seed legacy drafts/reviews/current recipe/access relationships in an isolated local stack, apply new migrations, compare active content/access/legacy provenance, run the authenticated workflow and simulate flag rollback. Preserve immutable rows and current reader projections on rollback. Test both server flag and DB stage disabled, including direct RPC after disable. Owner must manually review final synthetic screens before R10 closes.

```markdown
| Gate | State | Evidence | Remaining action |
| R1 authority | unmet | code + DB/server/browser test references | run and record exact result |
| R2 staff lifecycle | unmet | owner/staff/ambiguous/revocation cases | run and record exact result |
| R3 library truth | unmet | expected fixture IDs/counts + unavailable cases | run and record exact result |
| R4 private edits | unmet | before/after active projection comparison | run and record exact result |
| R5 concurrency/retry | unmet | two-session conflict + same-operation replay | run and record exact result |
| R6 review binding | unmet | title/body/image/submission mismatch tests | run and record exact result |
| R7 atomic publication | unmet | fault rollback + refresh-only retry | run and record exact result |
| R8 promise boundaries | unmet | exposure/emergency + untouched rights snapshots | run and record exact result |
| R9 privacy | unmet | installed SDK decoded local-network evidence | run and record exact result |
| R10 workflow/accessibility | unmet | real workflow/mobile/focus + owner screen review | review screens and record result |
| R11 readers | unmet | anonymous/customer/legacy/save/print/campaign matrix | run and record exact result |
| R12 release/recovery | unmet | local checks/rehearsal and later deployed journey | release requires separate authorisation |
```

This table is the ledger's initial progress synopsis. The runnable Unlazy ledger itself uses its supplied gates-leaf template with an explicit CHECK, EXPECT and CWD for each command gate, plus genuine manual gates for owner review. Inspect any inherited checker instructions before execution; the table is not a replacement for the required checker format. Replace an unmet state only with observed evidence; R12 has separate local/committed/deployed/external subgates, so local success is never called production completion.

- [ ] **Step 4: Prepare exact release/rollback instructions and request final branch review under the chosen execution method.** The release order is: source/CI reconciliation; fresh production backup per ops/README.md if release is authorised; apply compatible migrations with DB stage disabled; deploy private console flag-off; record actual deployed CAMPAIGNS revision/hash through restricted operator procedure; bootstrap one confirmed owner without putting identity into migrations; verify owner MFA and denied sessions; enable the approved increment in DB stage and environment flag; verify deployed SHA and the real signed-in journey. Report each increment by its actual active capability. If local implementation is the authorised scope, stop at the reviewable branch/package and report the external R12 subgate unmet.

Rollback disables DB stage and server flag, checks direct calls are stopped and public/customer access still works, and retains drafts/revisions/audit/active published data. Correcting an already published recipe uses a new reviewed revision; do not drop tables, rewrite reviews or reverse customer rights. MFA lockout recovery is a restricted operator identity-verification procedure with an audit event; do not add an email-only console bypass.

- [ ] **Step 5: Commit the release package and any evidence-driven fixes with scoped paths.** Reconcile the original request against all changed artifacts. Report local/committed/deployed/external states precisely and link any unmet gate with its concrete next action. Full Phase 1 completion requires all A/B/C implementation gates; production completion additionally requires the authorised deployed verification.

## Acceptance coverage and author review

| Approved design section | Tasks that implement it |
| --- | --- |
| 1–2 owner-first workflow/scope | Shared contracts, delivery table, Tasks 1–14; no later-phase navigation/actions |
| 3 library/routes/views/failures | 2, 3, 5, 10, 11 |
| 4 preview/readiness/usage/history | 2, 5, 8, 9, 11–13 |
| 5 editing/validation/review/publication/withdrawal | 6–13 |
| 6 responsive/accessibility | 3–5, 8, 11, 13, 14 |
| 7 owner/staff/confirmation/revocation | 1, 3, 4, 14 |
| 8 architecture/MFA/privacy/audit | 1–3, 6–7, 9, 12–14 |
| 9 authoritative draft/digest/asset/data failures | 2, 6–10, 12–13 |
| 10 recovery states | 2–4, 7–9, 11–13 |
| 11 increments | Delivery table, 5, 9, 14 |
| 12 existing source compatibility | File map, 1–3, 6, 10, 12, 14 |
| 13 runtime release gates | Every task's acceptance checks and Task 14 ledger |
| 14 design approval | Approved spec status; this plan is the next reviewable artifact |

Plan-quality gates: P1 covers the approved owner-first/staff workflow and deferred scope; P2 defines ordered independently testable increments; P3 maps actual source paths and exact shared interfaces; P4 provides meaningful test/implementation steps and failure recovery; P5 maps every design section/runtime gate and the five Review Focus cases; P6 labels current documentation versus future runtime/deployment evidence.

Author self-review completed: P1–P6 pass for the written plan. The plan contains 14 ordered tasks and 70 checkbox steps. All 16 local document references and 18 existing file targets resolve; all 19 quoted global constraints match the approved spec. Coverage includes every design section, R1–R12 and all five Review Focus conditions. Shared submission/image identity types, operation ownership, trusted campaign checks and refresh-only recovery were reconciled across tasks. There are no unresolved implementation markers. This is documentation evidence; all application/database/browser and deployment gates remain not run.

## Primary implementation references

- [Current recipe admin access contract](../../../ops/RECIPE-ADMIN-ACCESS.md), [legacy publication gate](../../../supabase/migrations/20260926052702_phase5_audit_publish_requires_review.sql) and [legacy review provenance](../../../supabase/migrations/20260926181747_phase5_recipe_review_log.sql): preserve existing inspection/triggers and label the limits of body-version-only legacy reviews.
- [Existing required CI jobs](../../../.github/workflows/web-ci.yml), [test target guard](../../../my-curated-haven-web/scripts/phase10-target-guard.mjs) and [production backup runbook](../../../ops/README.md): reuse the current local test/release boundary.
- [Supabase TOTP MFA documentation](https://supabase.com/docs/guides/auth/auth-mfa/totp): enrollment creates a factor, challenge/verify upgrades assurance; private data still needs server/database enforcement.
- [PostHog's official configuration source](https://github.com/PostHog/posthog.com/blob/master/contents/docs/libraries/js/config.mdx): capture_pageview, autocapture, before_send and recording controls are separate. [SDK issue 5020](https://github.com/PostHog/posthog-js/issues/5020) reports pending pre-opt-out batch/retry behaviour in specified versions; it is a reason to test the installed SDK payloads, not proof that this application's admin boundary fails.

## Execution handoff

The owner has approved the design and authorised this implementation plan. Code has not been authorised through a reviewed plan/execution-method selection yet. Ask for plan review and the method before implementation, then preserve that choice across later turns.

Recommend **Native execution** for this tightly coupled workflow: one implementer keeps the shared snapshot/RPC/review contracts in context, runs each task's gates and obtains one independent whole-branch review at the end. **Subagent-driven execution** instead uses a fresh implementer and reviewer for every task plus final branch review; it offers more frequent independent review at higher context cost. Whichever method is chosen, invoke Unlazy before code and keep R1–R12 explicit.
