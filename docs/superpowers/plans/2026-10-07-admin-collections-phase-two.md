# Admin Collections Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner and authorised admins prepare, preview, approve and publish collection updates while preserving purchases, delivering future additions and safely correcting recipes for existing buyers.

**Architecture:** Extend the Phase 1 console with private collection revisions, exact human approvals and immutable publication records. Reuse collection/release/commerce identities, resolve approved additions from existing entitlement sources, and move public readers to one collection publication authority. Collection publishing, checkout reservation and recipe corrections coordinate through shared locks and versioned impact evidence.

**Tech Stack:** Existing Node 24, npm 11, Next.js 16, React 19, TypeScript, Supabase Auth/PostgreSQL/Storage, `pg`, pgTAP, Node test runner and Playwright. Use `.nvmrc` and the integrated package lock; no new CMS, admin framework, queue service or payment provider.

**Spec:** [Phase 2 collection design](../specs/2026-10-06-admin-collections-phase-two-design.md), committed in `f50fdf6`. The owner's request to write this plan authorises moving from design to planning; it does not approve this plan's execution or production rollout.

## Global Constraints

The following requirements are copied from the design. Every task inherits them.

- “No fixed recipe minimum or maximum, including no 8–12 launch rule. Display the actual published count. Availability is an explicit choice, not a count threshold.”
- “Preserve what buyers purchased, and give them future additions.”
- “Prepare, preview and publish. Adding a recipe to a draft does not immediately give it to customers.”
- “Title, description, cover, grouping, recipe order and additions remain private until that update is published.”
- “The owner may approve their own work using one **Approve and publish** action after preview.”
- “A human's “yes” or “yeah” in response to the exact publication proposal counts as authorisation for that proposal. Subsequent changes require another approval.”
- “Human-approved corrections to an existing recipe reach its existing buyers. Keep the prior version, reason and approval history.”
- “Collection approval is not a substitute for approval of the recipe itself.”
- “Hiding a listing does not revoke a buyer's library access.”
- “Published and sealed historical release snapshots are immutable even when there are no current sales.”
- “Do not publicly cache personal ownership or entitlement decisions.”
- “Commit all of these or none.”
- “No import enables sales, publishes unreviewed additions, changes free slots, overwrites a purchased release or grants a customer access by assumption.”
- “The database cannot independently prove that a chat message was spoken by the owner.”

Additional execution constraints: invoke `$unlazy` before the first code edit; create the acceptance ledger before editing; preserve unrelated changes; use new additive migrations rather than modifying applied migration history; keep production credentials, private Auth state and full approval transcripts out of logs/artifacts. This planning task changes documentation only.

## Review Focus

These five easily missed conditions have tests assigned to their owning tasks.

1. Unicode titles, null optional values and reordered JSON object keys must not cause spurious draft changes; recipe-array reordering must still change the digest. Task 2.
2. Two admins may reserve the same series volume in different drafts; only one conflicting publication can commit, while the other draft survives for correction. Tasks 3 and 12.
3. A customer may have an unresolved checkout for an older release when a successor is published; reuse or report that attempt without opening a second checkout or changing its snapshot. Tasks 11 and 17.
4. A new purchase, recipe correction or offer change may happen after preview; publishing must recheck the protected set and dependency evidence under shared locks. Tasks 8, 12 and 17.
5. A global recipe-tag correction affects multiple collections and their prepared drafts; show the full impact, invalidate stale approval and preserve undisplayed tag categories. Tasks 7 and 15.

---

## Execution state and delivery order

- Plan date: 2026-10-07, America/Los_Angeles.
- Verified remote main: `9bfdfc94390e5d3348a7b895d901ea81e13aac90`.
- Planning checkout: `/Users/pratik.nandoskar/.codex/worktrees/admin-recipe-design/my-curated-haven-web`, branch `codex/admin-recipe-workspace-design`, with existing Phase 1 uncommitted work. No integration or code changes were performed while writing this plan.
- Collection source was inspected in `/Users/pratik.nandoskar/Documents/working/mch/my-curated-haven-web/.claude/worktrees/collections-showroom` at `f08e034ddda3a69c203828050d4aded38da0fd1e`, corresponding to the squash-merged main navigation change.
- Phase 1's remaining publication UX, regression, rehearsal and independent-review gates must be completed through its own approved plan before Phase 2 code integration. Do not mark that prerequisite met from old notes or handwritten checkboxes alone.
- Preserve the earlier Native execution preference: implement tasks in this session and obtain one independent whole-branch review at the end. Do not start execution before the owner reviews this written plan.

| Increment | Tasks | Usable outcome | Activation requirement |
| --- | --- | --- | --- |
| 2A: reconcile and inspect | 1–5 | Integrated baseline, private schema/contracts, import discrepancy report and collection inspection | Read-only collection stage; no public cutover |
| 2B: prepare and preview | 6–9 | Private collection creation/editing, preview, readiness and human review | Editing stage; no publication enabled |
| 2C: publish and deliver | 10–14 | Effective buyer access, safe checkout, atomic publishing, canonical public reads and refresh recovery | All coupled access/commerce/publication gates pass before activation |
| 2D: correct and rehearse | 15–18 | Global recipe corrections, restricted database operation, concurrency/CI verification and owner rollout evidence | Full design acceptance and release authority |

This is one coupled workflow, not four independently deployable products. Tasks can be reviewed separately, but publishing cannot be enabled with the old release-only reader or slug-only checkout contract.

All file paths below are repository-relative. `WEB` means `my-curated-haven-web`. Run npm/Node/Playwright commands from WEB; run Git and Supabase generation commands from the repository root unless stated otherwise. Proposed migration timestamps and test numbers must be checked for collisions at execution start and renamed consistently if taken.

## File responsibilities

| Create | Responsibility |
| --- | --- |
| `docs/implementation/admin-collections/GATES.md` | A1–A12 evidence, prerequisites, source SHAs, owner decisions and unmet gates |
| `ops/ADMIN-COLLECTIONS.md` | Stages, source cutover, operator SQL, recovery and production verification |
| `supabase/migrations/20261007000100_admin_collections_schema.sql` | Collection workflow schema, permissions, private authority and published projections |
| `supabase/migrations/20261007000200_admin_collections_reads.sql` | Authenticated collection read RPCs and catalog selection |
| `supabase/migrations/20261007000300_admin_collections_drafts.sql` | Create/start/save/rebase/copy/discard commands |
| `supabase/migrations/20261007000400_admin_collections_impact.sql` | Protected-member union and exact impact/readiness evidence |
| `supabase/migrations/20261007000450_admin_collections_review.sql` | Submissions, issues, decisions and exact approval |
| `supabase/migrations/20261007000500_collection_effective_access.sql` | Explicit successor policy, shared access functions and RLS integration |
| `supabase/migrations/20261007000600_collection_checkout_reservation.sql` | Atomic current-offer reservation, cross-release pending-attempt protection |
| `supabase/migrations/20261007000700_admin_collections_publication.sql` | Immutable successor publication, offer binding and refresh receipt |
| `supabase/migrations/20261007000750_admin_collections_refresh.sql` | Leased server refresh jobs and durable completion/failure receipts |
| `supabase/migrations/20261007000800_admin_recipe_corrections.sql` | Exact reviewed global corrections, tags and dependency invalidation |
| `supabase/migrations/20261007000900_collection_operator_commands.sql` | Restricted operator attestation and shared-writer entry points |
| `supabase/test-fixtures/admin-collections.sql` | Rollback-only synthetic collection/recipe/release/access scenarios |
| `my-curated-haven-web/src/lib/admin/collections/{contracts,query,snapshot,decode}.ts` | Collection types, URL filters, pure diff/validation and strict response decoding |
| `my-curated-haven-web/src/lib/admin/collections/{repository,actions,readiness,refresh,refresh-result}.ts` | Authenticated readers/writers, server actions, check presentation and refresh worker/pure outcome helper |
| `my-curated-haven-web/src/lib/collections/{catalog-import,publication,customer-state}.ts` | Pure import mapping, canonical public projection and uncached customer state |
| `my-curated-haven-web/src/lib/payments/collection-reservation.ts` | Transactional reservation adapter; frozen order result drives provider session creation |
| `my-curated-haven-web/src/lib/admin/recipe-corrections.ts` | Dedicated recipe correction adapter using the existing recipe draft/review workflow |
| `my-curated-haven-web/src/components/admin/collections/{CollectionLibrary,CollectionWorkspace,CollectionEditor,CollectionContents,CollectionPreview,CollectionReview,CollectionPublication,CollectionHistory}.tsx` | Focused collection workflow components |
| `my-curated-haven-web/src/app/admin/collections/{page,loading,error}.tsx` | Collection inventory route and explicit loading/failure states |
| `my-curated-haven-web/src/app/admin/collections/new/page.tsx` | Private collection creation |
| `my-curated-haven-web/src/app/admin/collections/[collectionId]/{page,loading,error}.tsx` | Collection detail route |
| `my-curated-haven-web/scripts/{admin-collections-import,admin-collections-operator,admin-collections-concurrency}.mjs` | Dry-run/import, trusted database operation and multi-connection rehearsal |
| `my-curated-haven-web/tests/admin/collections-{snapshot,query,decode,import,refresh}.test.mjs` | Pure contracts, mapping and refresh tests |
| `my-curated-haven-web/tests/e2e/collections-admin-fixtures.ts` | Loopback-only authenticated fixtures and deterministic cleanup |
| `my-curated-haven-web/tests/e2e/admin-collections-{inspection,editing,review,publication,access,corrections,checkout,concurrency}.spec.ts` | Real UI/RPC/access/commerce scenarios |
| `supabase/tests/database/17_admin_collections_access.test.sql` through `25_admin_collections_concurrency.test.sql` | Focused database suites defined in their owning tasks |

Modify existing `src/lib/admin/contracts.ts`, `src/lib/types/database.ts`, admin shell, recipe review/publication components, collection storefront types/loaders/routes, `src/lib/data/access.ts`, commerce repository/checkout/fulfilment/types, checkout route/button, admin DB runner, package verify scripts and `.github/workflows/web-ci.yml` only as assigned below. Retain public rendering primitives and existing payment/refund projection; do not refactor unrelated auth, homepage or analytics code.

## Fixed contracts and database layout

Task 2 creates these names. SQL responses use camelCase; wire commands use snake_case through one adapter. UUID/digest/enum/shape validation is runtime validation, not an unchecked TypeScript cast.

```ts
import type { Check, Result } from "../contracts";
export type CollectionStage = "disabled" | "inspection" | "editing" | "publication";
export type SourceMode = "legacy" | "database";
export type CollectionState = "draft" | "submitted" | "approved" |
  "changes_requested" | "rejected" | "published" | "superseded" | "discarded";
export type CollectionBase = { publicationId: string | null; digest: string };
export type Member = { recipeId: string; recipeSlug: string; contentVersion: number;
  reviewDigest: string; tagsDigest: string; placementNote: string;
  fit: "unverified" | "accepted" | "blocked" };
export type CollectionSnapshot = {
  collectionId: string; slug: string; title: string; tagline: string; story: string;
  forWhen: string; refresh: string; shelf: string; sortOrder: number;
  stage: { min: number | null; max: number | null };
  series: { key: string; volume: number } | null;
  listingState: "listed" | "unlisted" | "retired";
  availability: "open" | "coming-soon"; cloth: string;
  cover: { src: string; width: number; height: number; alt: string; assetDigest: string } | null;
  members: Member[];
};
export type CollectionRevision = { id: string; collectionId: string; version: number;
  digest: string; base: CollectionBase; state: CollectionState;
  submissionId: string | null; snapshot: CollectionSnapshot; savedAt: string; savedBy: string };
export type CollectionImpact = { token: string; checkedAt: string; sourceRevision: string;
  protectedRecipeIds: string[]; eligibleBuyerCount: number; pendingLiveCount: number;
  offerIds: string[]; affectedCampaignSlugs: string[]; checks: Check[] };
export type CollectionReadiness = { digest: string; checks: Check[];
  readyForApproval:boolean; readyToPublish: boolean; needsVerification: boolean };
export type CollectionReceipt = { operationId: string; collectionId: string;
  revisionId: string; publicationId: string | null; releaseId: string | null;
  version: number; digest: string; noChange: boolean; committedAt: string;
  refreshState: "complete" | "pending" };
export type CollectionCommand = { collectionId: string; operationId: string; reason: string };
export type SaveCollectionCommand = CollectionCommand & { expectedVersion: number;
  expectedDigest: string; base: CollectionBase; snapshot: CollectionSnapshot;
  reopenReviewed: boolean };
export type ReviewCollectionCommand = CollectionCommand & { revisionId: string;
  expectedVersion: number; expectedDigest: string; impactToken: string;
  decision: "approve" | "changes_requested" | "reject"; resolvedIssueIds: string[] };
export type PublishCollectionCommand = CollectionCommand & { revisionId: string;
  expectedVersion: number; expectedDigest: string; base: CollectionBase;
  impactToken: string; approveNow: boolean };
export type CollectionQuery = { q: string; shelf: string[]; stage: string[];
  status: string[]; draft: boolean | null; attention: boolean; page: number; pageSize: 25 };
export type CollectionEvent = { id: string; action: string; at: string; reason: string;
  humanAuthoriser: string | null; executor: string; executorType: "human" | "operator";
  beforeRef: string | null; afterRef: string | null; operationId: string };
export type CollectionDetail = { collectionId: string; sourceMode: SourceMode;
  published: { publicationId: string; releaseId: string | null; snapshot: CollectionSnapshot } | null;
  working: CollectionRevision | null; readiness: CollectionReadiness;
  impact: Result<CollectionImpact>; history: CollectionEvent[] };
export type CollectionRow = { collectionId:string; slug:string; title:string;
  shelf:string; stage:CollectionSnapshot["stage"]; series:CollectionSnapshot["series"];
  listingState:CollectionSnapshot["listingState"]; availability:CollectionSnapshot["availability"];
  publicationId:string|null; publishedCount:number; draftCount:number|null;
  workingState:CollectionState|null; needsAttention:boolean;
  commerceState:"enabled"|"disabled"|"no_offer"|"unavailable"; changedAt:string };
```

Private tables: `collection_workspace_settings` (singleton stage), `collection_sources` (source mode/SHA/import digest), `collection_draft_heads`, `collection_revisions`, `collection_submissions`, `collection_issues`, `collection_issue_resolutions`, `collection_review_decisions`, `collection_publications`, `collection_active_publications`, `collection_access_policies`, `collection_audit`, `collection_operations`, `collection_refresh_jobs`, `recipe_tag_versions`, `collection_operator_principals`, `collection_operator_authorisations`.

Use dedicated collection operations/audit rather than putting a collection UUID into Phase 1's recipe-labelled fields. Browser actors derive from `auth.uid()`; operator actors derive from a separately registered database `session_user`. A shared private executor context has `human_authoriser`, `executor_id`, `executor_type`, `attestation_id`; callers cannot construct it through a public JSON actor parameter. Schema migrations revoke default privileges and register no real user or operator identity.

Stable identity stays in `public.recipe_collections`; no public collection draft data is added there. New identities start unlisted with no public publication. `public.collection_publication_projection` contains approved metadata, member summaries and publication/release IDs; private approval/impact evidence remains private. `collection_publications.imported` distinguishes legacy baselines from human-approved new publications; imported records cannot stand in for a new review decision. Immutable records have reject-update/delete triggers. A unique draft head is per collection; active series/volume uniqueness is enforced transactionally on the publication projection, not by preventing harmless parallel drafts.

`collection_access_policies` maps explicit origin release/source kind to `additions-v1` or `original-only`, with policy approval provenance. Source kinds are the existing `stripe_purchase`, `native_legacy`, `support_grant`, `promotional`; unknown mappings fail reconciliation. No migration automatically grants all legacy entitlements the broader policy.

## Task 1: Establish the integrated baseline and owned verification harness

**Depends on:** Phase 1 completed/verified through its own plan before integration; read-only checks and the isolated test harness can proceed independently. **Owns:** A12 prerequisite.

**Files:** Modify `my-curated-haven-web/scripts/test-admin-db.mjs`; create `docs/implementation/admin-collections/GATES.md`, `ops/ADMIN-COLLECTIONS.md`, `my-curated-haven-web/tests/admin/collections-runner.test.mjs`; own ignored `.superpowers/sdd/2026-10-07-admin-collections/` scratch only.

**Interfaces:** Preserve runner `node scripts/test-admin-db.mjs --workdir <repo-relative-local-workdir>` with explicit safe SQL filenames if supplied. Add `--all` to select every database test rather than only admin suites. It bundles only known fixture includes and refuses unrecognised/non-local targets. Later tasks use the runner and the A1–A12 ledger.

- [ ] Read the Phase 1 ledger, current status, applicable instructions, spec and this plan. Record actual verified Phase 1 commit/evidence and freshest main SHA. If Phase 1 is unfinished, finish independent planning/harness work and leave integration explicitly blocked; never merge its dirty files by assumption.
- [ ] Invoke `$unlazy` and initialise A1–A12 with exact required evidence and the unmet Phase 1 prerequisite. Reuse a suitable clean attached worktree; if none is suitable, use the managed-worktree tool with `codex/admin-collections-phase-two`, then integrate the verified Phase 1 commit/current main without changing other checkouts.
- [ ] Write the runner regression below; run `node --test tests/admin/collections-runner.test.mjs` from WEB and expect failure with the existing default 11–15 selection. Export this pure selector from the existing runner, guarded so importing it does not execute Supabase.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { selectAdminSql } from "../../scripts/test-admin-db.mjs";
test("default selection includes publication and collection suites", () => {
  assert.deepEqual(selectAdminSql(["16_admin_recipe_publication.test.sql",
    "17_admin_collections_access.test.sql", "03_commerce.test.sql"]),
    ["16_admin_recipe_publication.test.sql", "17_admin_collections_access.test.sql"]);
});
```

- [ ] Implement default selection of `^\d+_admin_.*\.test\.sql$`, explicit `--all` selection, safe filename validation and explicit bundling of both admin fixture paths. Add the new owned test project `mch-admin-collections-test` to the allowlist. Do not accept arbitrary SQL include paths, unknown flags or remote reset targets.

```js
export function selectAdminSql(names,all=false) {
  const allowed = all ? /^\d+_[\w-]+\.test\.sql$/ : /^\d+_admin_.*\.test\.sql$/;
  return names.filter(name => allowed.test(name)).sort();
}
```
- [ ] Configure an ignored local workdir `.superpowers/sdd/2026-10-07-admin-collections/local`, using distinct ports in 54350–54359 (API 54351, DB 54352), after confirming they are free. Use only its project for reset/fixtures. Default user stack 54321/54322 and Phase 1 stack 54340–54349 are outside reset scope. Load local test keys securely without printing them.
- [ ] Run selector tests, replay existing migrations in the owned stack, and run the existing admin SQL/unit baseline. Record failures separately from Phase 2 regressions. Commit only the runner/test/ledger/runbook changes with `test: prepare collection admin verification harness`.

## Task 2: Define collection contracts, canonical comparison and URL queries

**Depends on:** 1. **Owns:** A2 and Review Focus 1.

**Files:** Create `src/lib/admin/collections/{contracts,query,snapshot,decode}.ts` and `tests/admin/collections-{snapshot,query,decode}.test.mjs` under WEB.

**Interfaces:** Export the fixed contracts above; `canonicalCollection(value: CollectionSnapshot): string`, `diffCollection(before, after): {field: string; before: unknown; after: unknown}[]`, `validateCollection(value): Check[]`, `parseCollectionQuery(params: URLSearchParams): CollectionQuery`, and `decodeCollectionDetail(data: unknown): CollectionDetail`.

- [ ] Write the canonical comparison regression and run `node --experimental-strip-types --test tests/admin/collections-snapshot.test.mjs`; expect missing-module/export failure.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { canonicalCollection } from "../../src/lib/admin/collections/snapshot.ts";
test("JSON keys are unordered but collection members are ordered", () => {
  const left = { title: "Purée & café", cover: null, members: [{recipeId:"a"},{recipeId:"b"}] };
  const same = { members: left.members, cover: null, title: left.title };
  assert.equal(canonicalCollection(left), canonicalCollection(same));
  assert.notEqual(canonicalCollection(left), canonicalCollection({...left, members:[...left.members].reverse()}));
});
```

- [ ] Implement recursive canonical JSON key sorting while preserving arrays, explicit nulls and original Unicode text. Database remains the authoritative SHA-256 digest producer. No-change saves compare canonical snapshots; do not hash a browser-dependent serialisation.

```ts
export function canonicalCollection(value:CollectionSnapshot):string {
  function ordered(input:unknown):unknown {
    if (Array.isArray(input)) return input.map(ordered);
    if (input !== null && typeof input === "object") {
      const record = input as Record<string,unknown>;
      return Object.fromEntries(Object.keys(record).sort().map(key=>[key,ordered(record[key])]));
    }
    return input;
  }
  return JSON.stringify(ordered(value));
}
```
- [ ] Validate UUIDs, slug pattern, title/text bounds, finite sort order, stage bounds, existing shelf/series/cloth values, positive asset dimensions, meaningful alt text, unique members and coherent version references. No recipe-count limit. Drafts may retain unresolved fit/recipe checks; publish requires their resolution. Keep imported read-only presentation hints outside editable commercial terms.
- [ ] Pin empty and 25-member snapshots as valid size cases, duplicate recipe IDs as invalid, invalid/unknown API response shapes as unavailable, and encoded query filters/pagination as stable round-trips. Decode every nested identifier/state/number, not only the top-level object.
- [ ] Run the three focused suites, then `npm run typecheck`. Commit their exact paths with `feat: define collection workspace contracts`.

## Task 3: Add collection authority, immutable schema and read RPCs

**Depends on:** 2. **Owns:** A3/A4 security, Review Focus 2 constraint.

**Files:** Create migrations `20261007000100_admin_collections_schema.sql`, `20261007000200_admin_collections_reads.sql`, fixture `supabase/test-fixtures/admin-collections.sql`, test `17_admin_collections_access.test.sql`; modify WEB `src/lib/admin/contracts.ts` and regenerate `src/lib/types/database.ts`.

**Interfaces:** Add `collection.read/edit/review/publish` to roles: viewer read; editor read/edit; reviewer read/review; publisher read/publish; owner all. Add `private.collection_assert(permission text, stage text) RETURNS uuid`; public JSON RPCs `admin_collection_library(p_query jsonb)`, `admin_collection_detail(p_collection_id uuid)`, `admin_collection_history(p_collection_id uuid,p_cursor text)`, `admin_collection_catalog(p_query jsonb)`. Identity always comes from verified Auth.

- [ ] Seed rollback-only synthetic IDs using prefix `93000000-0000-0000-0000-`, existing synthetic admin claims helper, two collections and reviewed/unreviewed recipes. Extend fixture coverage as tasks add tables. Wrap each SQL suite in a rollback transaction, declare its exact pgTAP assertion count, and finish with `SELECT * FROM finish(); ROLLBACK;`. Each fixture command helper returns a stable command/operation ID within a scenario so replay tests reuse the same payload.
- [ ] Add this denial assertion before creating the RPC and run the owned runner; expect function-not-found initially, then MFA denial after implementation.

```sql
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal1');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_collection_library('{}'::jsonb)$$,
  '42501','ADM_MFA_REQUIRED','aal1 owner cannot inspect private collections');
RESET ROLE;
```

- [ ] Create the private tables and public published-only projection specified above with foreign keys, one active head per collection, append-only revision/decision/publication history and no real identity bootstrap. Add active publication series/volume uniqueness; initialise collection stage disabled. Require both the global console stage and collection stage. Task 10 adds owned unlisted/retired projection reads after the effective-access helper exists.
- [ ] Implement read RPCs with current membership/MFA, permission filtering, bounded paging, aggregate commercial impact and explicit source status. Test anon/customer denial, revoked staff with stale claims, independent stage switches, no draft fields in public projections, unavailable commerce versus zero buyers, and immutable historical rows.
- [ ] Extend generated RPC/table types with local type generation against the owned workdir; diff before replacing the tracked generated file. Run `node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-07-admin-collections/local 17_admin_collections_access.test.sql` from WEB and the Phase 1 access suite. Commit exact schema/read/test/type files with `feat: add protected collection inspection authority`.

## Task 4: Build the dry-run catalog importer and discrepancy report

**Depends on:** 3. **Owns:** A1 migration safety.

**Files:** Create WEB `src/lib/collections/catalog-import.ts`, `scripts/admin-collections-import.mjs`, `tests/admin/collections-import.test.mjs`; update the collection fixture and `ops/ADMIN-COLLECTIONS.md`.

**Interfaces:** `mapCollectionImport(input: ImportInput): ImportReport` where `ImportInput` contains source SHA/digests, config records, full tag JSON and target DB collection/recipe/release/review/offer/order inventories. `ImportReport` returns `candidates`, `discrepancies`, `blockedCollectionIds`, `sourceDigest`. CLI defaults to `--dry-run`; `--apply-private --report <reviewed-file>` stores private baseline/candidate records only.

Define these types in `catalog-import.ts`, importing `ShowroomCollection`, `CollectionSnapshot` and `Json` from the named existing/new modules:

```ts
export type ImportInput = { sourceSha:string; sourceDigests:Record<string,string>;
  config:readonly ShowroomCollection[]; tags:Record<string,Json>;
  inventory:{ collections:{id:string;slug:string}[];
    recipes:{id:string;slug:string;contentVersion:number|null;reviewDigest:string|null;tagsDigest:string|null}[];
    releases:{id:string;collectionId:string;state:string;members:string[];manifestChecksum:string|null}[];
    offers:{id:string;releaseId:string;mode:"test"|"live";saleEnabled:boolean;termsDigest:string}[];
    orders:{id:string;releaseId:string;live:boolean;state:string;purchased:boolean;snapshotComplete:boolean}[];
    policies:{originReleaseId:string;sourceKind:string;policy:"additions-v1"|"original-only"}[] } };
export type ImportReport = { candidates:CollectionSnapshot[];
  discrepancies:{code:string;collectionSlug:string;severity:"blocker"|"suggestion";details:Json}[];
  blockedCollectionIds:string[]; sourceDigest:string };
```

- [ ] Write an import test that uses different configured and purchased member IDs; verify the report blocks reconciliation instead of unioning or granting them. Run `node --experimental-strip-types --test tests/admin/collections-import.test.mjs` and expect failure before the mapper exists.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { reconcileMemberIds } from "../../src/lib/collections/catalog-import.ts";
test("membership mismatch requires review, never automatic union", () => {
  assert.deepEqual(reconcileMemberIds(["a","b"],["a","c"]),
    {matches:false, configOnly:["b"], databaseOnly:["c"]});
});
```

- [ ] Export `reconcileMemberIds(configIds: string[], databaseIds: string[])` with deterministic sorted differences. Map all configured collections, covers, shelves/series, stage bounds, order, `inShowroom` and existing display-only price hints. Keep hints outside offer amounts. Resolve recipe slugs to UUIDs and current content/review versions; missing IDs and unknown legacy policies remain blockers.

```ts
export function reconcileMemberIds(configIds:string[],databaseIds:string[]) {
  const configured = new Set(configIds), stored = new Set(databaseIds);
  const configOnly = [...configured].filter(id=>!stored.has(id)).sort();
  const databaseOnly = [...stored].filter(id=>!configured.has(id)).sort();
  return {matches:configOnly.length===0 && databaseOnly.length===0,configOnly,databaseOnly};
}
```
- [ ] Preserve all tag categories and placement evidence, including categories not exposed by current runtime filters. Record source SHA/digest and provenance; do not translate imported notes into a new human approval. Reapplying the same private import digest is idempotent; changed inputs produce a distinct report.
- [ ] Implement parameterised read-only inventory queries, JSON report output with no customer identifiers/secrets, and report-digest validation on private apply. Public source mode remains legacy; target DB reads require an explicitly selected secure connection. No default production target or implicit `--apply`.
- [ ] Run unit cases for all 20 baseline identities, duplicate slug, missing recipe, changed source, empty collection, non-runtime tags, existing purchases and malformed asset references. Run the dry-run against synthetic local data, save sanitised parity evidence, and commit with `feat: report and import private collection candidates`.

## Task 5: Deliver collection inventory and inspection UI

**Depends on:** 3–4. **Owns:** initial usable 2A, A1/A3/A12 inspection.

**Files:** Create WEB collection `repository.ts`, inventory/detail/loading/error routes, `CollectionLibrary.tsx`, `CollectionWorkspace.tsx`, `CollectionHistory.tsx`, `tests/e2e/collections-admin-fixtures.ts`, `tests/e2e/admin-collections-inspection.spec.ts`; modify `AdminShell.tsx`.

**Interfaces:** `loadCollectionLibrary(query: CollectionQuery): Promise<Result<{rows: CollectionRow[]; total: number; query: CollectionQuery}>>`, `loadCollectionDetail(id: string): Promise<Result<CollectionDetail>>`, `loadCollectionHistory(id: string,cursor: string|null): Promise<Result<{events: CollectionEvent[]; nextCursor:string|null}>>`. Use `adminRpc` and strict collection decoders; inventory rows do not load full history/impact for every collection.

The new test fixture exports `createCollectionsFixture(options?:{scenario?:"inspection"|"reviewed_update"|"buyer_successor"|"correction"|"checkout_pending"}): Promise<CollectionsFixture>`; default is inspection with no draft. `CollectionsFixture` contains `collectionId`, `slug`, `recipeIds`, `ownerId`, `customerId`, `publishCommand:Record<string,unknown>|null`, `query(sql:string,args?:unknown[]):Promise<{rows:Record<string,unknown>[]}>`, `login(page,role:"owner"|"viewer"|"editor"|"reviewer"|"publisher"|"customer",aal?:"aal1"|"aal2"):Promise<void>`, `rpc(role:string,name:string,args:Record<string,unknown>):Promise<{data:unknown;error:unknown}>`, `dispose():Promise<void>`. RPC calls use real fixture Auth/MFA sessions, not fabricated production claims. The reviewed-update scenario seeds an imported legacy publication and a distinct approved eight-member candidate. Reuse Phase 1 MFA enrollment machinery; use synthetic identities and clean only fixture-owned rows, with no blanket owner purge. Fixture setup must refuse remote DB/Auth targets.

- [ ] Write an owner inspection browser test and run `npx playwright test tests/e2e/admin-collections-inspection.spec.ts --project=chromium-desktop`; expect the missing route to fail.

```ts
import {test,expect} from "@playwright/test";
import {createCollectionsFixture} from "./collections-admin-fixtures";
test("owner sees collection content and commerce as distinct states", async ({page}) => {
  const f = await createCollectionsFixture();
  try {
    await f.login(page,"owner","aal2");
    await page.goto(`/admin/collections/${f.collectionId}`);
    await expect(page.getByRole("heading",{name:"Synthetic collection"})).toBeVisible();
    await expect(page.getByText("Sales disabled",{exact:true})).toBeVisible();
    await expect(page.getByText("No private draft",{exact:true})).toBeVisible();
  } finally { await f.dispose(); }
});
```

- [ ] Implement typed read adapters and routes using the existing MFA/context boundary. Add Collections navigation only for `collection.read`. Render overview/contents/readiness/history, published and draft counts, explicit source provenance and permitted actions.

```ts
export async function loadCollectionDetail(id:string):Promise<Result<CollectionDetail>> {
  const supabase = await createClient();
  return adminRpc(()=>supabase.rpc("admin_collection_detail",{p_collection_id:id}),
    decodeCollectionDetail,true);
}
```

Import `createClient` from `../../supabase/server`, `adminRpc` from `../rpc`, collection types from `./contracts` and decoder from `./decode` in the repository module. Keep it server-only.
- [ ] Preserve URL query state and return navigation. Add tests for no results versus source failure, permission/stage denial, aggregate buyer impact, pagination and support references. Assert no private customer contacts or credentials appear in HTML or errors.
- [ ] Verify keyboard navigation, 320/375 CSS pixel layouts and no optional analytics/replay during public-to-admin navigation. Run inspection browser tests, relevant query/decode units, typecheck and lint. Commit exact inventory files with `feat: inspect collections in the admin console`.

## Task 6: Implement private collection draft commands and conflict handling

**Depends on:** 3–5. **Owns:** A3/A4/A11 private writes.

**Files:** Create migration `20261007000300_admin_collections_drafts.sql`, `18_admin_collections_drafts.test.sql`; extend collection fixture, contracts/repository/actions and generated DB types.

**Interfaces:** Public RPCs `admin_collection_create(p_command jsonb)`, `admin_collection_draft_start(p_command jsonb)`, `admin_collection_draft_save(p_command jsonb)`, `admin_collection_draft_control(p_command jsonb)` returning revision or receipt. Control uses `action: "rebase"|"copy_publication"|"discard"`, explicit target reference and expected base/digest. TS adapters `createCollection(input: CollectionCommand & {snapshot:CollectionSnapshot})`, `startCollectionDraft(input:CollectionCommand)`, `saveCollectionDraft(input:SaveCollectionCommand)`, `controlCollectionDraft(input:CollectionCommand & {action:string; expectedDigest:string; referenceId:string|null})` return `Result<CollectionRevision|CollectionReceipt>` as appropriate.

- [ ] Add fixture helper `pg_temp.collection_save_command() RETURNS jsonb`, constructing the currently seeded head/version/base and a title-only update. Write the stale-save regression and run the owned 18 SQL suite; expect the missing command to fail.

```sql
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_collection_draft_save(
  pg_temp.collection_save_command() || '{"expected_version":999}'::jsonb)$$,
  '40001','ADM_CONFLICT','stale save cannot overwrite another admin');
RESET ROLE;
```

- [ ] Implement a private draft writer with collection lock, current authority/stage, operation receipt, strict command shape, expected head/base checks and append-only revisions. Unchanged canonical content returns `noChange:true` without a new version, audit save or review invalidation.
- [ ] New collection creation reserves a unique slug but leaves identity unlisted and without an active public pointer. Save full metadata/member snapshots without touching catalog bodies, public title/summary, offers or access. Submitted/approved draft edits require explicit reopen; retain all old decisions.
- [ ] Make rebase show an explicit old-base/current-base comparison; never auto-merge conflicting member removals. Copying a publication makes a new draft checked against today's protected members. Discard changes lifecycle/history, never deletes immutable evidence.
- [ ] Test editor/viewer separation, hidden new identity, same-operation replay/different payload denial, no-change approved saves, two-editor conflicts, slug lock after publication, protected copy recovery and draft-only member removal. Run suite 18 plus Phase 1 draft regression, regenerate DB types, and commit with `feat: persist private collection revisions`.

## Task 7: Build private creation, metadata and contents editing

**Depends on:** 6. **Owns:** A2/A3 and Review Focus 5 preservation.

**Files:** Create WEB `src/app/admin/collections/new/page.tsx`, `CollectionEditor.tsx`, `CollectionContents.tsx`, `tests/e2e/admin-collections-editing.spec.ts`; extend collection actions/repository and the synthetic fixture.

**Interfaces:** `listCollectionRecipes(query:{q:string;page:number}):Promise<Result<{rows:Member[];total:number}>>` uses `admin_collection_catalog`; `listCollectionCoverAssets():Promise<Result<CollectionSnapshot["cover"][]>>` reads the trusted source asset manifest. Editor submits full `SaveCollectionCommand`; global tags are read-only here and edited through Task 15.

- [ ] Write the private-save browser regression below and run its focused Playwright file; expect missing editor controls initially.

```ts
import {test,expect} from "@playwright/test";
import {createCollectionsFixture} from "./collections-admin-fixtures";
test("saving metadata and recipe additions leaves the public collection unchanged", async ({page}) => {
  const f = await createCollectionsFixture();
  try {
    await f.login(page,"owner","aal2");
    await page.goto(`/admin/collections/${f.collectionId}`);
    await page.getByRole("button",{name:"Prepare update"}).click();
    await page.getByLabel("Collection title").fill("Private title");
    await page.getByRole("button",{name:"Save draft",exact:true}).click();
    await expect(page.getByRole("status")).toContainText("Draft saved");
    const published = await f.query("select title from public.recipe_collections where id=$1",[f.collectionId]);
    expect(published.rows[0].title).toBe("Synthetic collection");
  } finally { await f.dispose(); }
});
```

- [ ] Implement complete metadata fields, explicit availability/listing choice, existing shelf/series/volume and cover selection. Preserve unknown imported tag categories and read-only display hints. Do not let title/cover saves mutate public projections or let a cover picker upload arbitrary assets.
- [ ] Add catalog search, stage/allergen/practical context, already-included state and recipe review/publication blockers. Support add/remove/reorder of draft-only members; show protected purchased members with an explanation. Implement keyboard move up/down alongside drag controls.
- [ ] Add unsaved navigation protection, save-in-progress state, failed-save form retention and stale-version reload/compare. Changing reviewed content requires explicit reopen. Preserve filtered catalog selection and collection return URL.
- [ ] Test zero, three and 25 members without count warnings; creating a private slug; keyboard ordering; unreviewed member saved but not eligible; no-change save; failure retention; unsupported tags round-trip; protected historical member removal denial. Run editing browsers, snapshot units, typecheck and lint. Commit with `feat: prepare private collection updates`.

## Task 8: Implement impact/readiness evaluation and private preview

**Depends on:** 6–7. **Owns:** A4/A5, Review Focus 4.

**Files:** Create `20261007000400_admin_collections_impact.sql`, `19_admin_collections_review.test.sql`, WEB `readiness.ts`, `CollectionPreview.tsx`, and preview cases in `admin-collections-review.spec.ts`; extend fixture/source manifest and generated DB types.

**Interfaces:** `public.admin_collection_impact(p_collection_id uuid,p_revision_id uuid) RETURNS jsonb`; `private.collection_protected_members(p_collection_id uuid) RETURNS TABLE(recipe_id uuid)`; `loadCollectionImpact(collectionId:string,revisionId:string):Promise<Result<CollectionImpact>>`; `collectionReadiness(revision:CollectionRevision,impact:Result<CollectionImpact>):CollectionReadiness`.

- [ ] Add `pg_temp.collection_candidate_id() RETURNS uuid` to the synthetic fixture, selecting its current candidate. Write the unavailable-impact regression and run suite 19; expect the missing evaluator initially.

```sql
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT ok(EXISTS(SELECT 1 FROM jsonb_array_elements(public.admin_collection_impact(
  '93000000-0000-0000-0000-000000000001',pg_temp.collection_candidate_id())->'checks') AS c
  WHERE c->>'code'='SOURCE_UNAVAILABLE' AND c->>'state'='unknown'),
  'missing source evidence stays unknown');
RESET ROLE;
```

- [ ] Build the protected union from immutable manifests and member rows for sealed releases, verified historical live payments, enabled live offers and unresolved live orders. Preserve historical protection after refunds. Include newly introduced DB columns/policies in fresh evidence; distinguish test-mode counts and unknown lookups. Do not infer absence from a caught query exception.
- [ ] Bind impact digest to candidate/base, recipe content/tag/review versions, deployment/source manifest, protected-member digest, applicable policy versions and relevant offer/order exposure. Buyer counts are informational; approval is invalidated when material promise/eligibility evidence changes, not solely because an unrelated aggregate count changed.
- [ ] Check source asset hash/provenance against the imported current deployment manifest, recipe eligibility, unique series volume, placement fit and unresolved issue state. Reject stale source manifests. Keep blocker/failure/unknown/suggestion distinct. Freeze no commercial terms or customer PII in client-visible impact JSON.

```ts
export function collectionReadiness(revision:CollectionRevision,impact:Result<CollectionImpact>):CollectionReadiness {
  const checks:Check[] = impact.ok ? impact.value.checks : [{code:"SOURCE_UNAVAILABLE",
    scope:revision.collectionId,state:"unknown",severity:"blocker",origin:"source",
    explanation:"Refresh the unavailable dependency before publication."}];
  const eligible = !checks.some(check=>check.severity==="blocker" && check.state!=="pass");
  return {digest:revision.digest,checks,readyForApproval:eligible,
    readyToPublish:eligible && revision.state==="approved",
    needsVerification:checks.some(check=>check.state==="unknown")};
}
```
- [ ] Render private collection-page preview using existing `DetailHero`, `Contents`, cover and bookcase primitives with customer actions omitted. Show labelled published/draft versions, exact changed fields/additions/removals/order/counts, context placement and buyer impact. No public draft route, shared cache or analytics capture.
- [ ] Test bought five-to-eight addition preview, historical member removal, active offer/pending order without completed payment, test-only activity, recipe correction after preview, missing asset evidence and zero-member coming-soon preview. Regenerate RPC types, then run suite 19 and focused preview browsers. Commit with `feat: evaluate and preview collection publication impact`.

## Task 9: Add exact collection submissions, decisions and owner review

**Depends on:** 8. **Owns:** A4; completes private 2B workflow.

**Files:** Create `20261007000450_admin_collections_review.sql` and WEB `CollectionReview.tsx`; extend suite 19, actions/repository/contracts, issue presentation and generated DB types. Leave the preceding impact migration unchanged.

**Interfaces:** RPCs `admin_collection_submit(p_command jsonb)`, `admin_collection_issue(p_command jsonb)`, `admin_collection_review(p_command jsonb)`. Submission command is `CollectionCommand & {revisionId:string;expectedVersion:number;expectedDigest:string;impactToken:string}`; issue command adds `{code:string;field:string|null;severity:"blocker"|"suggestion";explanation:string}`. `reviewCollection(input:ReviewCollectionCommand):Promise<Result<CollectionRevision>>`.

- [ ] Extend fixture with `pg_temp.collection_review_command() RETURNS jsonb`, a valid submitted candidate/digest/impact command. Add the altered-digest denial, run suite 19 and expect failure before review exists.

```sql
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_collection_review(
  pg_temp.collection_review_command() || jsonb_build_object('expected_digest',repeat('0',64)))$$,
  '40001','ADM_CONFLICT','approval cannot target altered content');
RESET ROLE;
```

- [ ] Record submissions/decisions/resolved issue references immutably, tied to candidate and impact policy. Verify every resolved issue belongs to this revision/digest. Reviewers can request changes/reject; publishers cannot create human review decisions. AI/import annotations remain labelled provenance.
- [ ] Build Review UI with exact preview, reason and issue resolution. Owner self-review is permitted. Separated editor/reviewer/publisher controls reflect actual permissions; editing approved content invalidates eligibility while preserving the old decision.
- [ ] Pin no-change save after approval, wrong submission, unresolved blocker, dependency change, permission revocation, stale stage and tampered issue reference. Unknown source checks cannot be dismissed as editorial suggestions.
- [ ] Run suite 19, review browser file, Phase 1 review regression and typecheck. Regenerate types, commit with `feat: review exact collection revisions` and keep collection publication stage disabled.

## Task 10: Resolve successor access from original entitlements and update RLS

**Depends on:** 3–4 and 8. **Owns:** A6/A7.

**Files:** Create `20261007000500_collection_effective_access.sql`, `20_admin_collections_effective_access.test.sql`; modify WEB `src/lib/data/access.ts`, `src/lib/payments/repository.ts`, `src/lib/payments/types.ts`, `src/app/account/collections/page.tsx`; create `src/lib/collections/customer-state.ts`, `tests/e2e/admin-collections-access.spec.ts`.

**Interfaces:** Private `collection_has_access(p_user_id uuid,p_collection_id uuid) RETURNS boolean`, `recipe_access_release(p_user_id uuid,p_recipe_id uuid) RETURNS uuid`; public `collection_effective_access(p_collection_id uuid) RETURNS jsonb` and `recipe_effective_access(p_recipe_id uuid) RETURNS jsonb` derive `auth.uid()`. `getCollectionCustomerState(collectionId:string,userId:string):Promise<Result<{ownership:"owned"|"pending_payment"|"not_owned";releaseId:string|null}>>` is server-only/uncached and returns unavailable through the existing `Result` boundary on source failure.

- [ ] Seed original release with an active qualifying source, a five-to-eight successor and an unrelated collection. Write the successor policy regression and run suite 20; expect denied additions before the new resolver.

```sql
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000006','aal1');
SET LOCAL ROLE authenticated;
SELECT is(public.recipe_effective_access('93000000-0000-0000-0000-000000000018')
  ->>'type','entitled','original buyer can read a published addition');
SELECT is(public.recipe_effective_access('93000000-0000-0000-0000-000000000099')
  ->>'type','denied','another collection is not included');
RESET ROLE;
```

- [ ] Implement original-access preservation and explicitly approved successor mapping. For additions, require valid active entitlement, applicable origin/source policy, eligible source, source/entitlement dates, published lineage and currently published recipe. Missing legacy source/policy evidence yields original-only access pending reconciliation. Do not create independent entitlements or new orders.
- [ ] Update body, protected Storage file and accessible release/member RLS using the same private resolver while avoiding policy recursion. Keep free recipes and legacy/admin inspection behaviours as already authorised. Private helper execution is revoked from public roles; wrappers never accept a customer UUID.
- [ ] Replace release-list application inference with the authoritative recipe RPC, deduplicate the purchased library by stable collection, and return current delivered contents. Read user authority fresh per request; public cache keys never include or store personal ownership.
- [ ] Test expired/revoked/future-dated sources, full refund, two surviving sources, original-only legacy mapping, withdrawn recipe, private successor, another series volume, raw REST body/storage reads and app badge parity. Confirm source/order/entitlement row counts do not grow on publication. Run suite 20 plus existing access/saved-recipe/commerce regressions and commit with `feat: deliver collection additions through existing access sources`.

## Task 11: Make checkout reservation stable across publication

**Depends on:** 8 and 10. **Owns:** A8, Review Focus 3.

**Files:** Create `20261007000600_collection_checkout_reservation.sql`, `21_admin_collections_checkout.test.sql`, WEB `src/lib/payments/collection-reservation.ts`, `tests/e2e/admin-collections-checkout.spec.ts`; modify commerce `repository.ts`, `checkout.ts`, `fulfilment.ts`, `types.ts`, `src/app/api/checkout/route.ts`, `src/components/commerce/CheckoutButton.tsx`, `src/components/collections/CollectionDetail.tsx`.

**Interfaces:** Define `CheckoutExpectation={publicationId:string|null;releaseId:string;offerId:string;manifestHash:string;sourceDigest:string}` in payment types. Extend `CreateCheckoutParams` and checkout POST with `expected:CheckoutExpectation`. Private `reserve_collection_order(p_user_id uuid,p_collection_id uuid,p_expected jsonb,p_idempotency_key text) RETURNS jsonb` returns `{state:"reserved"|"existing"|"owned"|"stale",order:PurchaseOrder|null}`. TS `reserveCollectionOrder(userId,collectionId,expected,idempotencyKey)` returns that decoded result. Define `private.collection_advance_offer(p_offer_id uuid,p_release_id uuid,p_manifest_hash text,p_expected_terms_digest text) RETURNS void`, callable only by the trusted publication writer.

- [ ] Add fixture helper `pg_temp.collection_checkout_expectation() RETURNS jsonb`. Write a stale expectation assertion and run suite 21; expect the old unvalidated reservation path to fail the requirement.

```sql
SELECT is(private.reserve_collection_order(
  '92000000-0000-0000-0000-000000000006',
  '93000000-0000-0000-0000-000000000001',
  pg_temp.collection_checkout_expectation() || jsonb_build_object('manifestHash',repeat('0',64)),
  'synthetic-stale-reservation')->>'state','stale','stale product cannot be charged');
```

- [ ] Implement collection-lock/current-publication verification, current ownership, user/collection pending-attempt lookup and parameterised order reservation in one transaction. Detect pre-existing multiple unresolved legacy attempts and return review-required rather than picking silently. Preserve existing per-release uniqueness and add a collection-keyed unresolved-order constraint/index after reconciliation.
- [ ] Freeze publication/release/member manifest and hash, provider account/mode/product/price, amount/currency/tax/quantity, terms/refund/access-policy versions in each new order. Legacy mode expectation uses the explicitly registered config/source digest and reconciled release; no guess from a missing publication pointer.
- [ ] Create provider sessions from the reserved order snapshot, not a separately fetched mutable offer. Use that order's idempotency key and return the existing attempt safely across release changes. Reject missing/malformed expectation with a refresh-required response; update all checkout button call sites and error copy. Do not auto-enable sales or touch prices.
- [ ] Make offer advancement update only release binding, manifest hash and update time after checking a frozen digest of every financial/enablement field. Preserve provider uniqueness. Add compatible collection-first locking to `private.record_payment_and_grant_access` before its order/access mutations using an additive replacement preserving the established capture/refund semantics. Fulfilment of legacy orders missing frozen provider context must be reconciled before offer advancement, not silently read from a changed offer.
- [ ] Test owned old buyer, stale tab, disabled offer, original pending attempt, delayed old payment after update, two simultaneous reservations, incompatible policy, old snapshot stability, unique provider price and refund projection. Run suite 21, checkout browser file and existing `payment-remediation.spec.ts`. Commit with `fix: bind checkout to the reviewed collection publication`.

## Task 12: Implement atomic approved publication and immutable releases

**Depends on:** 9–11. **Owns:** A4/A5/A8/A11; Review Focus 2 and 4.

**Files:** Create `20261007000700_admin_collections_publication.sql`, `22_admin_collections_publication.test.sql`; extend collection fixture, repository/actions and generated DB types.

**Interfaces:** `public.admin_collection_publish(p_command jsonb) RETURNS jsonb`, `publishCollection(input:PublishCollectionCommand):Promise<Result<CollectionReceipt>>`. Shared private `collection_publish_core(p_context jsonb,p_command jsonb) RETURNS jsonb` is never directly granted to browser or operator roles. Context construction is internal to authenticated/attested entry points.

- [ ] Add `pg_temp.collection_publish_command() RETURNS jsonb`, returning a reviewed current candidate. Write exact replay behaviour and run suite 22; expect missing publication initially.

```sql
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT is(public.admin_collection_publish(pg_temp.collection_publish_command())->>'publicationId',
  public.admin_collection_publish(pg_temp.collection_publish_command())->>'publicationId',
  'same operation returns the same committed publication');
RESET ROLE;
```

- [ ] Establish lock order used by every participating writer: affected collection identities in UUID order, recipe identities in UUID order, offers in UUID order, then target draft/order/operation rows. Checkout uses its collection before user/collection reservation and offer/order locks; corrections lock their full collection impact before the recipe. Bound lock timeout and return a retryable non-sensitive failure.
- [ ] Revalidate current authority/stage, candidate/head/base, exact review/impact evidence, protected union, recipe versions and active series-volume uniqueness under those locks. `approveNow:true` requires both review and publish permissions and atomically records the owner's decision; `false` requires the existing matching decision. Never accept a posted approver identity.
- [ ] Create a new release for changed ordered membership, including reorder-only updates. For metadata-only publication reuse the unchanged release and record a new metadata publication. New first publication creates its release; an empty coming-soon collection can have a metadata publication without a sellable release. No artificial recipe minimum is introduced.
- [ ] Activate only the reconciled origin-release/source-kind access mappings explicitly included in this candidate's impact and human approval. Register each new sellable release's `stripe_purchase` origin as `additions-v1`, with this publication's approval provenance, so its buyers also receive subsequent updates. Unknown legacy mappings block first cutover; known support/promotional/original-only policies remain as explicitly reviewed, never broadened by assumption.
- [ ] Seal immutable ordered membership/manifest evidence, advance active pointer/public projections, advance eligible existing offer binding through Task 11, append audit/operation receipt and insert refresh job in one transaction. For a reconciled legacy collection's first new publication, include the source-mode switch to database in that same approved transaction; require the registry-compatible deployed-reader revision in impact evidence. Preserve all earlier releases/manifests/orders and keep sales flags unchanged. Add guards against any non-authorised mutation of published/sealed members and manifest history.
- [ ] Test all-or-nothing rollback at a constraint failure, same operation/different payload, permission revoked before retry, protected member removal, refund history, recipe/offer change after preview, series collision, reorder-only release, metadata-only reuse and empty coming-soon publication. Run suite 22 plus suites 19–21, regenerate types and commit with `feat: publish reviewed collection successors atomically`.

## Task 13: Switch public readers to the authoritative publication adapter

**Depends on:** 4 and 10–12. **Owns:** A1/A2/A6/A8 public integration.

**Files:** Create WEB `src/lib/collections/publication.ts`; modify `src/lib/collections/types.ts`, `visibility.ts`, `src/lib/data/collections-showroom.ts`, `src/config/collections.ts`, `src/config/recipe-snapshot.ts`, collection index/detail/series/test routes, `src/lib/payments/repository.ts`, existing `tests/e2e/collections.spec.ts`, and `collections-import.test.mjs`. Update source-rule documentation under `docs/implementation/recipe-collections/` without rewriting historical count observations.

**Interfaces:** `PublicCollection={publicationId:string|null;releaseId:string|null;sourceMode:SourceMode;sourceDigest:string;collection:ShowroomCollection}`. `listPublishedCollections():Promise<PublicCollection[]>`, `getPublishedCollection(slug:string):Promise<PublicCollection|null>`, `listPublishedShowroomChapters():Promise<PublicCollection[]>`. Keep `collectionFacts`, stage filtering and bookcase transforms pure. `loadLiveOffer` returns `Result<CollectionOfferDto|null>` rather than conflating unavailable with no offer; extend the DTO with `expected:CheckoutExpectation` from Task 11.

- [ ] Add a post-publication browser assertion to the existing collection suite and run it before reader changes; expect the old config-first contents to fail.

```ts
import {test,expect} from "@playwright/test";
import {createCollectionsFixture} from "./collections-admin-fixtures";
test("published database contents replace the configured contents consistently", async ({page}) => {
  const f = await createCollectionsFixture({scenario:"reviewed_update"});
  try {
    const published = await f.rpc("owner","admin_collection_publish",{p_command:f.publishCommand});
    expect(published.error).toBeNull();
    await page.goto(`/collections/${f.slug}`);
    await expect(page.getByRole("heading",{name:"Reviewed updated collection"})).toBeVisible();
    await expect(page.getByText("8 recipes",{exact:true}).first()).toBeVisible();
  } finally { await f.dispose(); }
});
```

- [ ] Read source mode and active publication through one server adapter. Legacy mode uses the matching registered config digest as a whole record; database mode uses only the committed publication projection and current approved recipe facts. Batch member/offer lookups to avoid per-recipe/per-buyer queries. Never merge stale config membership into a database record.
- [ ] Maintain `public.collection_publication_projection` as a published-only projection in the Task 3 schema, with listing/ownership-aware reads and no private review/approval/body payload. Task 12 updates it atomically with the private active pointer. Server adapters may read private source registry through their trusted database connection; no browser private-schema grants are added.
- [ ] Make collection routes and static-param/metadata generation await canonical reads. Keep stable slugs, coming-soon shelf behaviour, shelf/series order, `inShowroom`, original `/collections/test` chapter order, seasonal feature behaviour, stage chips, motion and cover styling. Keep static navigation presence checks separate from dynamic collection data; no module-level database call in client bundles.
- [ ] Introduce explicit source backend deployment mode `legacy` or `registry`; registry mode must never revert to legacy on a caught error. Before first cutover, all legacy records/offer mappings are registered and checked. Once any database publication is active, registry-compatible builds are the rollback floor; disabling mutation does not disable committed database reads.
- [ ] Remove active 8–12 rules/comments and vacuous “all freeze/all under an hour” claims for empty sets. Keep actual counts, manually chosen availability and clear display-only price placeholders. Show controlled unavailable commerce state on lookup failure; no default $15/false ownership inferred from failure. Preserve buyer access to unlisted/retired collections while keeping them out of public shelf discovery.
- [ ] Run all existing collection scenarios and new source/failure cases; compare the 20 configured baseline records before cutover. Verify 320px, keyboard, reduced motion, canonical URLs, anonymous body denial and account-library agreement. Commit with `feat: read collection storefront from reviewed publications`.

## Task 14: Complete publication UI, history and durable refresh recovery

**Depends on:** 12–13. **Owns:** A4/A11 and usable 2C.

**Files:** Create `20261007000750_admin_collections_refresh.sql`, WEB `CollectionPublication.tsx`, collection `refresh.ts`, `refresh-result.ts`, `tests/admin/collections-refresh.test.mjs`, `tests/e2e/admin-collections-publication.spec.ts`; extend actions/history/repository and runbook. Leave the preceding publication migration unchanged.

**Interfaces:** `approveAndPublishCollection(input:PublishCollectionCommand):Promise<Result<CollectionReceipt>>`; `refreshCollectionPublication(receipt:CollectionReceipt):Promise<{operationId:string;state:"complete"|"pending"}>`; `retryCollectionRefresh(collectionId:string,operationId:string)` returns the same refresh result inside `Result`. Pure `settleCollectionRefresh(operationId:string,run:()=>Promise<void>)` returns complete/pending without changing publication.

- [ ] Write a refresh failure regression and run `node --experimental-strip-types --test tests/admin/collections-refresh.test.mjs`; expect the missing helper to fail.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { settleCollectionRefresh } from "../../src/lib/admin/collections/refresh-result.ts";
test("cache failure does not relabel a committed publication as failed", async () => {
  assert.deepEqual(await settleCollectionRefresh("operation-1",async()=>{throw new Error("cache offline");}),
    {operationId:"operation-1",state:"pending"});
});
```

- [ ] Create pure `refresh-result.ts` for that helper; keep Next/server imports in `refresh.ts`. Owner action presents exact approved diff/reason and submits `approveNow:true`. Separated publisher action uses `false`. Resolve stale preview, review-required, denied and source-unavailable states without losing the draft.

```ts
export async function settleCollectionRefresh(operationId:string,run:()=>Promise<void>):
Promise<{operationId:string;state:"complete"|"pending"}> {
  try { await run(); return {operationId,state:"complete"}; }
  catch { return {operationId,state:"pending"}; }
}
```
- [ ] Persist refresh jobs in the publication transaction. The trusted server adapter claims a specific committed job, verifies current caller authority for manual retry, invalidates collection/bookcase/old-and-new series/admin paths, then marks that job complete through a narrowly granted private worker procedure. Worker procedures `collection_refresh_claim(p_operation_id uuid)` and `collection_refresh_finish(p_operation_id uuid,p_lease_token uuid,p_error_ref text)` are server-only; claims are leased, retries bounded, failures sanitised. No browser can post an arbitrary successful worker receipt.
- [ ] Run refresh immediately after commit; expose pending status/retry in the workspace and history if it fails. A retry loads the stored operation's exact paths rather than caller-provided slugs and never invokes the publication RPC again. Customer authority reads remain uncached even if page refresh is pending.
- [ ] Show human authoriser/executor/reason/version and comparisons in history. Copy an old publication to a new draft through Task 6 and rerun purchase checks; discard is explicit. Test two-click idempotency, refresh failure/retry with one publication, no-change versus published, stage revocation before retry and historical copy retaining protected additions.
- [ ] Run publication browser file, refresh units, suites 19–22, lint/typecheck/build and relevant Phase 1 publication tests. Commit with `feat: approve collection publication and recover public refresh`.

## Task 15: Support global approved recipe and tag corrections

**Depends on:** 8–14. **Owns:** A9, Review Focus 5.

**Files:** Create `20261007000800_admin_recipe_corrections.sql`, `23_admin_collections_corrections.test.sql`, WEB `src/lib/admin/recipe-corrections.ts`, `tests/e2e/admin-collections-corrections.spec.ts`; modify recipe contracts/snapshot/editor/review/publication/refresh and collection impact/read adapters. Preserve existing applied Phase 1 migrations.

**Interfaces:** Add `RecipeCorrectionCommand = PublishCommand & {correctionKind:"same_recipe";acknowledgeGlobalImpact:true}` in existing recipe contracts. RPC `admin_recipe_correct(p_command jsonb) RETURNS jsonb`; TS `publishRecipeCorrection(input:RecipeCorrectionCommand):Promise<Result<MutationReceipt>>`. New recipe workflow schema 2 includes full `tags:Json` in the reviewed snapshot; legacy schema-1 snapshots remain readable with explicit missing-tag provenance.

- [ ] Seed a recipe used by two purchased collections with a reviewed v2 quantity/tag correction. Write the buyer-reader regression and run suite 23; expect the Phase 1 commercial-impact block to reject ordinary publication until the dedicated correction command exists.

```sql
SELECT pg_temp.admin_claims('92000000-0000-0000-0000-000000000001','aal2');
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.admin_recipe_correct(pg_temp.recipe_correction_command())$$,
  'exact approved correction can update a commercially used recipe');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM private.recipe_active_archives
  WHERE recipe_id='93000000-0000-0000-0000-000000000018'),1,
  'previous complete active recipe is archived');
```

- [ ] Add fixture `pg_temp.recipe_correction_command() RETURNS jsonb` with the current exact recipe revision/base/impact. Extend v2 snapshot canonicalisation/review hashing with full tags, preserving all imported categories and unknown structured fields. Add nullable tag/provenance references to historical archives without fabricating missing old values; new corrections require a reconciled complete base.
- [ ] Implement correction impact across all collections/releases/offers/pending orders/campaigns/free slots and enforce the shared collection→recipe→offer lock order. Same-recipe human approval binds full body/image/tag snapshot and current impact. Archive old full content/assets/tags, publish new active version and invalidate every affected private collection candidate's eligibility in one transaction.
- [ ] Do not mutate purchased manifests, change collection membership, free slots, prices, sales flags or identities. Extend only the dedicated correction route past Phase 1's commercial/sealed block; keep ordinary publication and unreviewed/campaign restrictions intact. Required recipe permission and exact current human review still apply.
- [ ] Add global-tag correction controls to the recipe editor using existing vocabulary, with cross-collection impact before review. Customer cards/body/files resolve current approved facts. Retain referenced old assets for archive reproduction. Emergency withdrawal stays owner-only; show withdrawn purchased entries/count honestly and require reviewed explicit republication for restoration.
- [ ] Test corrections seen by existing buyers of both collections, original archive reproduction, unavailable dependency, changed candidate after approval, stale collection draft, undisplayed tags, recipe-identity replacement denial, correction versus emergency withdrawal and free/campaign reader regression. Run suite 23, correction browsers and existing recipe/access/review units. Commit with `feat: correct purchased recipes with exact human approval`.

## Task 16: Add restricted operator SQL and human-attestation execution

**Depends on:** 12 and 15. **Owns:** A10.

**Files:** Create `20261007000900_collection_operator_commands.sql`, `24_admin_collections_operator.test.sql`, WEB `scripts/admin-collections-operator.mjs`; update `ops/ADMIN-COLLECTIONS.md` and shared command context/audit tests.

**Interfaces:** Private operator procedures `collection_operator_prepare(p_command jsonb)`, `collection_operator_preview(p_collection_id uuid,p_revision_id uuid)`, `collection_operator_attest(p_authorisation jsonb) RETURNS uuid`, `collection_operator_publish(p_authorisation_id uuid,p_operation_id uuid) RETURNS jsonb`, `recipe_operator_correct(p_authorisation_id uuid,p_operation_id uuid) RETURNS jsonb`. `p_authorisation` includes `human_id`, target kind/ID/revision/digest/base/impact, reason, minimal evidence reference/excerpt and proposal time. It is accepted only from a registered trusted operator `session_user`, never exposed as an authenticated browser RPC.

- [ ] Write a test proving the ordinary browser role cannot call attestation and run suite 24; expect a missing/incorrectly exposed procedure until grants are implemented.

```sql
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT private.collection_operator_attest('{}'::jsonb)$$,
  '42501',NULL,'browser cannot attest human authorisation');
RESET ROLE;
```

- [ ] Create a NOLOGIN operator group with execute-only procedure grants and no table DML, public RPC or unrestricted writer grants. Register actual login principals only through a separately reviewed trusted operator step, never a migration containing real identities/passwords. Resolve executor from `session_user`; reject unregistered or revoked operators even after `SET ROLE`.

```sql
CREATE ROLE mch_collection_operator NOLOGIN;
GRANT USAGE ON SCHEMA private TO mch_collection_operator;
REVOKE ALL ON FUNCTION private.collection_operator_attest(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.collection_operator_attest(jsonb) TO mch_collection_operator;
```

Apply equally narrow grants to the other named operator procedures. Do not grant this group to `authenticated`, `service_role` or arbitrary staff roles; actual login registration is an explicit trusted runbook action.
- [ ] Implement preparation/preview through the same validation/save core as the UI. Attestation records a current authorised human and exact proposal references with a 30-minute execution expiry. Execution rechecks human permissions, operator capability, stages, candidate/base/impact and authorisation status, then invokes the shared private publication/correction core. Consume attestation atomically with the operation receipt; unchanged retries return that receipt after current authority checks.
- [ ] CLI defaults to preview; publication requires an explicit attestation ID tied to the displayed proposal. The agent asks the human exactly “Approve and publish this update to [collection]?” and records the response's reference. The CLI must not infer approval, invent a verdict, set fake Auth claims or collect an entire transcript. Browser MFA enforcement remains unchanged; this is a separately authenticated trusted operator channel.
- [ ] Document actual parameterised SQL call sequences and the trust limitation: the DB validates the restricted attestor and bound proposal, not the truth of a chat message. Separate human authoriser, attestor and executor in history. No operation executes with a service-role key embedded in a command, file or browser bundle.
- [ ] Test wrong operator, browser spoofed human ID, expired/revoked human, changed candidate, changed protected set, same/different operation replay, correction parity and separate identities. Run suite 24 plus publication/correction regressions. Commit with `feat: execute attested collection commands through restricted SQL`.

## Task 17: Verify concurrency, scale boundaries and required CI

**Depends on:** 10–16. **Owns:** A7/A8/A11, Review Focus 2–4.

**Files:** Create `25_admin_collections_concurrency.test.sql`, WEB `scripts/admin-collections-concurrency.mjs`, `tests/e2e/admin-collections-concurrency.spec.ts`; modify `.github/workflows/web-ci.yml`, WEB `package.json`, test target guards only for the explicitly owned local range, and sanitised evidence reporting.

**Interfaces:** Concurrency CLI `node scripts/admin-collections-concurrency.mjs --scenario <publish-race|checkout-race|correction-race|volume-race> --output <ignored-json>` refuses non-loopback targets and returns failure unless invariant assertions pass. Use independent `pg` clients and explicit transaction barriers, not sleep-based race guesses.

- [ ] Write the two-publication assertion in the concurrency browser/Node harness and run it before coordination is complete; an unsafe writer can produce two receipts or a changed base without a conflict. Use SQL synthetic claims only on isolated test connections; production operator procedures never do this.

```ts
import {test,expect} from "@playwright/test";
import {Client} from "pg";
import {randomUUID} from "node:crypto";
import {createCollectionsFixture} from "./collections-admin-fixtures";
test("two publishers cannot commit the same stale base twice",async()=>{
  const connectionString=process.env.ADMIN_TEST_DATABASE_URL;
  if (!connectionString || !["localhost","127.0.0.1"].includes(new URL(connectionString).hostname))
    throw new Error("Concurrency fixtures require a configured loopback database");
  const f=await createCollectionsFixture({scenario:"reviewed_update"});
  const clients=[new Client({connectionString}),new Client({connectionString})];
  try {
    if (!f.publishCommand) throw new Error("Reviewed candidate was not seeded");
    await Promise.all(clients.map(async client=>{
      await client.connect();
      await client.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
        [f.ownerId,JSON.stringify({sub:f.ownerId,aal:"aal2",role:"authenticated"})]);
      await client.query("set role authenticated");
    }));
    const commands=[f.publishCommand,{...f.publishCommand,operation_id:randomUUID()}];
    const attempts=await Promise.allSettled(clients.map((client,index)=>client.query(
      "select public.admin_collection_publish($1::jsonb) as receipt",[JSON.stringify(commands[index])])));
    expect(attempts.filter(result=>result.status==="fulfilled")).toHaveLength(1);
    const actual=await f.query("select count(*)::int as n from private.collection_publications where collection_id=$1 and imported=false",[f.collectionId]);
    expect(actual.rows[0].n).toBe(1);
  } finally { await Promise.all(clients.map(client=>client.end())); await f.dispose(); }
});
```

- [ ] Extend that test into the CLI's explicit barriers after both clients have read the same base; do not hold a winning transaction open while awaiting the blocked loser. Confirm the losing command returns conflict and its candidate remains intact. Run volume-race with two distinct collections proposing the same active series/volume.
- [ ] Exercise publication versus checkout, delayed payment, global correction and membership protection changes. Inject a held row lock for bounded timeout, force refresh failure without rollback, and verify different-payload operation reuse fails. Replay transaction failure scenarios without duplicate manifests, access sources or orders.
- [ ] Use synthetic fixtures at 0, 3, 25 and 200 members and 1, 10 and 100 releases. Record query counts and `EXPLAIN (ANALYZE,BUFFERS)` locally for effective access/library/collection reads; add indexes for actual plans. Require bounded batched member queries and no buyer fan-out writes. These are fixture scales, not product caps or fabricated latency targets.
- [ ] Add `test:collections:unit` to package scripts for the collection unit files and include it in verify/required web-quality. Move backend Node setup before SQL execution and replace its raw SQL-test step with `node scripts/test-admin-db.mjs --all` from WEB. This bundles every fixture and includes existing non-admin suites plus 16–25. Preserve generated-type drift checks and fail on zero discovered SQL files.
- [ ] Run synthetic admin browser tests serially within their resource group to protect the single-owner invariant; retain unrelated public browser parallelism. CI must fail if required admin/collection suites discover zero tests, skip for missing local configuration or omit an acceptance scenario. Upload sanitised summaries only; keep private auth traces and raw admin request payloads out of shared CI artifacts.
- [ ] Run suites 17–25, new focused concurrency browsers and the required web/backend jobs. Fix failures and update A1–A11 evidence with exact commit and test targets. Commit with `test: verify collection publication and access under concurrency`.

## Task 18: Owner walkthrough, final review and gated release runbook

**Depends on:** 1–17. **Owns:** A12 and reconciliation of every design requirement.

**Files:** Update `docs/implementation/admin-collections/GATES.md`, `ops/ADMIN-COLLECTIONS.md`, and only files required by evidenced review fixes. Save sanitised evidence in ignored `.superpowers/sdd/2026-10-07-admin-collections/evidence/`.

**Interfaces:** The runbook specifies activation transitions, exact source/import/publication references, recovery commands and separate local/committed/CI/deployed/runtime evidence. It introduces no new permission to migrate or deploy production.

- [ ] Reread the design and all A1–A12 requirements. Run the final focused regression set below, then the required complete checks once the relevant suites pass. A failed or unexecuted gate remains unmet, including owner visual/workflow review and production evidence.

```bash
# From WEB, against the owned local fixture stack and configured test app:
npm run test:admin:unit
npm run test:collections:unit
node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-07-admin-collections/local --all
npx playwright test tests/e2e/admin-collections-*.spec.ts --project=chromium-desktop
npx playwright test tests/e2e/collections.spec.ts tests/e2e/payment-remediation.spec.ts tests/e2e/saved-recipe-access.spec.ts
npm run verify
```

- [ ] Walk the owner through existing collection inspection, private creation, edit/add/reorder, no-count-limit behaviour, preview, owner approval, history and refresh recovery. Demonstrate an old buyer receiving additions, a recipe correction, revoked staff denial and a copied historical draft blocked from removing protected additions. Request concrete UX corrections against the working result; final styling can remain a separate design task.
- [ ] Use the preserved Native method to obtain one independent final whole-branch review against the spec, plan and evidence. Address actionable findings and rerun affected checks. Do not reinterpret successful task/unit checks as independent review or a deployed release.
- [ ] Prepare the production dry-run discrepancy report, secure backup/restore procedure, migration order/type verification, owner-only stage settings, eligible-origin access mappings, source backend registry activation and per-collection cutover checklist. Do all preparatory work before asking for any release authority still missing.
- [ ] Release sequence when authorised: deploy schema/compatible readers with collection mutations disabled; register/reconcile legacy source and policy mappings; verify read-only inspection; enable owner editing; rehearse approved publication/access in non-production; enable owner publication only after coupled gates; cut over reviewed collections one at a time through the approved publication transaction, not a later manual source flag; record deployed SHA and fresh authenticated owner/customer/body/file/checkout evidence. Do not expand staff permissions in the same step by assumption.
- [ ] Recovery sequence: disable collection publication/editing as appropriate, preserve registry-compatible reads and committed buyer additions, retry specific refresh jobs, and prepare a reviewed forward correction. Never delete release/order history, revert to stale config, restore a DB over live payments or activate an old offer to hide a failure.
- [ ] Commit exact evidence/runbook/review fixes with `docs: record collection admin acceptance and rollout readiness`. If release is not authorised, report local/committed/CI status and leave production gate unmet. If a PR is created under the later execution authority, attach its URL to this chat; merging/deploying still requires applicable authority.

## Acceptance coverage and evidence commands

| Design gate | Owning tasks | Required evidence |
| --- | --- | --- |
| A1 existing experience | 4–5, 13, 18 | All configured identity/source mappings, discrepancy resolution, complete collection browser regression and owner walkthrough |
| A2 flexible counts | 2, 7, 12–13 | Empty/small/>12 fixtures, explicit availability, actual counts, no stale active rule |
| A3 private preparation | 3, 5–8 | SQL deny matrix, anonymous/customer draft denial, UI save/public projection comparison |
| A4 exact human approval | 3, 6, 8–9, 12, 14 | MFA/revocation/stale digest/dependency/role tests; owner and separated-reviewer paths |
| A5 preserve purchases | 8, 12, 17 | Protected union, historical/refunded/sealed/pending/offer fixtures, unchanged historical manifests |
| A6 deliver additions | 10, 12–13 | Old buyer and unrelated buyer app/REST/body/storage parity, no synthetic access rows |
| A7 preserve revocation | 10, 17 | Source/entitlement expiry/refund/revocation composition and uncached personal authority |
| A8 checkout compatibility | 11–13, 17 | Frozen snapshots, offer uniqueness/terms stability, stale request, cross-release pending/delayed-payment races |
| A9 approved corrections | 15 | Cross-collection buyer correction, full archive, stale approval, global tags and explicit withdrawal/republication |
| A10 operator parity | 16 | Restricted principal/attestation tests, no posted-browser approver proof, separate authoriser/executor and same invariants |
| A11 atomic recovery | 6, 12, 14, 17 | Conflict/rollback/timeout/idempotency/refresh/race evidence tied to commit |
| A12 owner rollout | 1, 5, 18 | Verified prerequisite, owner walkthrough, independent final review and separately authorised production/runtime evidence |

Focused SQL command template from WEB:

```bash
node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-07-admin-collections/local 22_admin_collections_publication.test.sql
```

Generate types from the repository root against the owned stack; inspect the generated diff before replacing the tracked file:

```bash
supabase gen types typescript --local --workdir .superpowers/sdd/2026-10-07-admin-collections/local > .superpowers/sdd/2026-10-07-admin-collections/database.generated.ts
git diff --no-index my-curated-haven-web/src/lib/types/database.ts .superpowers/sdd/2026-10-07-admin-collections/database.generated.ts
```

Each task commit stages only its named files with `git add -- <exact paths>` and a scoped commit message. Review the index before committing; never use `git add .` to collect the existing Phase 1 scratch or owner changes.

## Plan review and execution handoff

This document is complete as an implementation plan when its task interfaces, dependency order, source references, test examples and coverage matrix pass self-review. It does not claim that any planned code, test, migration or rollout has run.

The next step is owner review of this written plan. After that approval, preserve Native execution and use `superpowers:executing-plans` task by task, with `$unlazy` and the acceptance ledger before code. If the integrated baseline reveals a material change to purchase policy, human approval or scope, return that concrete design change for review instead of silently changing this plan.
