# Admin Campaigns and Performance Reporting Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner and authorised staff prepare, preview, approve and publish website campaigns that preserve their original free-recipe promises, then inspect reliable campaign activity and separately authorised financial reports.

**Architecture:** Extend the native admin console with private immutable campaign revisions, exact human approvals, a public publication projection and a transactional recipe-dependency registry. Preserve the reusable `/stories/<slug>` renderer and introduce versioned optional attempt attribution. Reporting combines bounded behavioural observations with verified commerce facts through a private cohort bridge; campaign editing, money recording and optional provider analytics remain independently available.

**Tech Stack:** Existing Node 24, npm 11, Next.js 16, React 19, TypeScript, Supabase Auth/PostgreSQL, `pg`, Stripe, PostHog, pgTAP, Node test runner and Playwright. Use the existing lockfile and provider API versions; no new CMS, admin framework, queue service or social-publishing SDK.

**Spec:** [Phase 4 design](../specs/2026-10-07-admin-campaigns-phase-four-design.md), committed as `896c9f6`. The owner's request to write this implementation plan approves progression from that design to planning. This document is the plan for review, not evidence of implementation or authority to publish a campaign or deploy production.

## Global Constraints

These requirements are copied verbatim from the design. Every task inherits them.

- “A private save never changes the active public page.”
- “Campaign editing alone gives no financial visibility.”
- “A keyword is external-tool metadata, not a unique campaign identity: the same keyword may recur across posts.”
- “A substantially different promise, theme or selection requires duplication/new publication at a new address.”
- “A missing/unknown eligibility check blocks publication rather than silently dropping the recipe.”
- “Inactive promotion does not invalidate them.” This refers to published placement tokens.
- “A refresh retry never republishes, creates another extra, emits a duplicate campaign publication or repeats external communication.”
- “Do not blanket-remove Phase 1 campaign exposure protection.”
- “Do not create another checkout count or replace its campaign because the visitor clicked a different post.”
- “A successful checkout return page alone never counts as a purchase.”
- “No provider analytics request sits on the critical purchase/fulfilment path.”
- “Financial and non-financial cache payloads are separate.”
- “An unavailable source produces unavailable/stale, not a synthetic zero.”
- “Deleting analytics linkage must not delete a purchase, expire ownership or erase the fact of an approved publication.”

Existing published/free recipe eligibility is a prerequisite, not a campaign action. Preserve original recipe identities/order and every published extra; extras remain identifiable. Keep URLs stable. Collection contents, releases, prices, purchase rights, refund actions, Instagram publishing and DM configuration remain in their existing workflows. Final visual styling is separate from the functional admin interactions in this plan.

Before the first implementation code edit, invoke `$unlazy`, read the nearest `AGENTS.md`, create/update the A1–A20 acceptance ledger and preserve unrelated changes. Use additive migrations and current database authority/MFA, not client identity claims. **Native remains selected:** implement tasks in this session using `superpowers:executing-plans`, with an independent final review of the release candidate. Do not switch to fresh implementation agents per task or re-ask the execution-method question. If 4A ships as an independent release, review that candidate before activation as well.

## Review Focus

Five easily missed input classes receive explicit tests in their owning tasks:

1. Two posts reuse a keyword and promote the same collection: retain distinct promises, placement tokens and attribution. Tasks 5, 11 and 17.
2. A recipe becomes unsafe while its campaign page is warm in cache: no unsafe content escapes through the shell, cards, metadata or private historical preview. Tasks 10, 12 and 15.
3. A browser keeps a tab open across visit expiry or cannot use storage: attribution resets with the visit, and missing observation cannot inflate conversion. Tasks 16, 19 and 21.
4. An editor loses authority after a successful publish or a cached financial query: retries disclose neither private receipts nor financial values. Tasks 3, 13 and 22.
5. A campaign grows beyond the old 12-reference validator or the reporting cohort exceeds its query budget: handle bounded operations without a product count ceiling or a falsely complete ratio. Tasks 7, 12 and 19.

Additional financial fault coverage belongs to Tasks 18, 20 and 23: original-attempt reuse, duplicate/out-of-order events, payment/refund time boundaries, multiple payments for one order, failed/pending refunds, disputed payments and optional export failures.

---

## Baseline and execution order

- Plan date: 2026-10-07, America/Los_Angeles.
- Planning worktree: `/Users/pratik.nandoskar/.codex/worktrees/admin-recipe-design/my-curated-haven-web`, branch `codex/admin-recipe-workspace-design`, initially inspected at `3508bccb2a8acae3fe9fdde031fce390b7a65874`. That includes the Phase 4 design and a subsequent local-Supabase CI-key-export commit. During document review, HEAD advanced independently to `830fdb7` (`chore: fix test-key export quoting in CI`); leave that unrelated history intact.
- Remote main freshly verified at `9bfdfc94390e5d3348a7b895d901ea81e13aac90`. Recheck current main and source ownership when executing; the primary checkout is older and has unrelated local changes.
- Phase 1 implementation exists on this branch; production activation is not established here. [Phase 2](2026-10-07-admin-collections-phase-two.md) and [Phase 3](2026-10-07-admin-customer-support-phase-three.md) are plans, not completed dependencies.
- Before Task 10 publication integration, the Phase 2 correction, collection-publication, checkout-reservation and access contracts must be integrated and verified. Before Task 20 financial reporting, Phase 3's bound fact reconciliation and financial lifecycle interpretation must be integrated and verified. Complete independent safe preparation while a dependency is absent; never create a competing temporary writer.
- Phase 3 introduces `admin_console_settings.console_enabled`. Use that one database master switch, not another global enable flag. Existing server `ADMIN_CONSOLE_ENABLED` remains the web gate. Preserve module-specific recipe, collection, support and campaign stages.
- This is one coupled plan with two independently activatable increments: reporting consumes the stable identities/publications introduced by campaign management. No additional external marketing subsystem is assumed.

| Increment | Tasks | Usable outcome | Activation |
| --- | --- | --- | --- |
| 4A — Campaign management | 1–15 | Private authoring/review, protected publication, stable links, promise/extras, health and recovery | Relevant A1–A12/A19/A20 evidence, configured retention, owner rehearsal, candidate review and explicit release authority. |
| 4B — Attribution and reports | 16–24 | Versioned measurement, preserved attempt context, aggregate performance and owner financial reports with delegation | Policy/provider readiness, Phase 3 dependency, A13–A18 and privacy/reconciliation evidence. |
| Full Phase 4 closure | 25–26 | Replayed migrations, required CI, integrated rehearsal and final release package | Every A1–A20 gate reconciled; separate approval before production changes. |

## File responsibilities and naming

`WEB` means `my-curated-haven-web`; paths beginning with `supabase`, `ops`, `.github` and `docs` are repository-root paths. Braces below denote the individually named files, not an instruction to create unrelated files. SQL filenames appear once in the ordered migration table; task references use their exact basenames. Never edit an already applied historical migration.

| Area | Files and responsibility |
| --- | --- |
| Campaign domain | `WEB/src/lib/admin/campaigns/{contracts,decode,query,digest,promise,source-import,repository,actions,eligibility,preview,assets,review,publication,links,refresh,refresh-result,operator}.ts` — focused units with the interfaces below. |
| Public delivery | `WEB/src/lib/campaigns/{render-types,publication,safety}.ts`; existing `types.ts`/`validate.ts`, `data/{campaigns,load-campaign}.ts`, story route and `components/campaign/` — public-safe publications and fresh safety overlay. |
| Functional admin | `WEB/src/components/admin/campaigns/{CampaignLibrary,CampaignEditor,CampaignPreview,CampaignReview,CampaignPublication,CampaignLinks,CampaignHistory}.tsx`; the routes in Tasks 6–8. |
| Measurement | `WEB/src/lib/analytics/{visit-context,campaign-context,export-claim}.ts`; existing campaign/client/events/schema/sanitizer/provider/drain modules — versioned IDs, expiry and export stability. |
| Reporting | `WEB/src/lib/admin/reports/{contracts,decode,query,posthog-query,posthog,ledger,cohort,metrics,cache,service,actions,redaction}.ts`; aggregate DTOs only across the browser boundary. |
| Reporting UI | `WEB/src/components/admin/reports/{ReportFilters,PerformanceReport,FinanceReport,ReportingGrants}.tsx`; `/admin/reports/campaigns` and `/admin/reports/finance`; owner Team grant controls. |
| Operations | `WEB/scripts/{phase4-target-guard,test-phase4-db,admin-campaigns-import,admin-campaigns-operator,admin-campaigns-concurrency,export-campaign-analytics,phase4-retention,phase4-evidence}.mjs`; named local/operator boundaries, no credentials in output. |
| Tests | `WEB/tests/fixtures/campaigns.mjs`; `WEB/tests/admin/campaign-*.test.mjs`, `report-*.test.mjs`, `visit-context.test.mjs`; named browser specs below; SQL suites 40–55. |
| Evidence/docs | `docs/implementation/admin-campaigns/{GATES,BASELINE,POLICY,REHEARSAL,RELEASE}.md`, `ops/ADMIN-CAMPAIGNS.md`, `ops/ADMIN-REPORTING.md`; factual evidence/status, not invented runtime results. |

Existing shared files may be modified only by their assigned tasks: admin contracts/context/RPC/shell/Team, generated `src/lib/types/database.ts`, public recipe/collection readers, commerce reservation/checkout/fulfilment integration, existing test runner, package/CI and campaign documentation. Keep unrelated auth, homepage and Instagram tooling untouched.

## Ordered additive migrations and database suites

All migrations are **proposed**, after the Phase 2 `2026100700*` and Phase 3 `2026100701*` ranges. Verify collisions again before creating them. Future generated database types change only after the corresponding migration exists.

| Task | Migration under `supabase/migrations/` | Suite under `supabase/tests/database/` |
| --- | --- | --- |
| 3 | `20261007020100_admin_campaign_authority.sql` | `40_admin_campaign_authority.test.sql` |
| 4 | `20261007020200_admin_campaign_schema.sql` | `41_admin_campaign_schema.test.sql` |
| 5 | `20261007020300_admin_campaign_import.sql` | `42_admin_campaign_import.test.sql` |
| 6 | `20261007020400_admin_campaign_reads.sql` | `43_admin_campaign_reads.test.sql` |
| 7 | `20261007020500_admin_campaign_drafts.sql` | `44_admin_campaign_drafts.test.sql` |
| 8 | `20261007020600_admin_campaign_eligibility.sql` | `45_admin_campaign_eligibility.test.sql` |
| 9 | `20261007020700_admin_campaign_review.sql` | `46_admin_campaign_review.test.sql` |
| 10 | `20261007020800_admin_campaign_publication.sql` | `47_admin_campaign_publication.test.sql` |
| 11 | `20261007020900_admin_campaign_links.sql` | `48_admin_campaign_links.test.sql` |
| 12 | `20261007021000_campaign_public_safety.sql` | `49_campaign_public_safety.test.sql` |
| 14 | `20261007021100_campaign_operator_commands.sql` | `50_campaign_operator.test.sql` |
| 17 | `20261007021200_campaign_order_attribution.sql` | `51_campaign_attribution.test.sql` |
| 18 | `20261007021300_campaign_export_claims.sql` | `52_campaign_exports.test.sql` |
| 20 | `20261007021400_campaign_reporting_facts.sql` | `53_campaign_reporting_facts.test.sql` |
| 21 | `20261007021500_campaign_report_cache.sql` | `54_campaign_report_cache.test.sql` |
| 24 | `20261007021600_campaign_retention.sql` | `55_campaign_retention.test.sql` |

## Shared contracts

Task 2 creates the campaign contracts below. `Campaign` is the existing public template type; `Check`/`Result` come from the existing admin contracts. Keep pure modules free of `server-only` and runtime aliases so Node strip-types tests can import them. RPC DTOs use camelCase and strict decoding; one wire adapter converts commands to snake_case. Reject unknown/invalid enums, UUIDs, digests, unsafe URLs and out-of-range values rather than casting unknown JSON.

```ts
import type { Campaign } from "../../campaigns/types";
import type { Check, Result } from "../contracts";
export type CampaignStage = "disabled"|"inspection"|"editing"|"publication";
export type CampaignPermission = "campaign.read"|"campaign.edit"|"campaign.review"
  |"campaign.publish"|"campaign.emergency_withdraw";
export type ReportPermission = "report.performance.read"|"report.finance.read";
export type Placement = "bio_link"|"story_link"|"instagram_dm"|"comment_dm";
export type Base = { publicationId:string|null; digest:string; registryVersion:number };
export type Member = { recipeId:string; recipeSlug:string; group:"original"|"extra";
  position:number; contentVersion:number; assetDigest:string; note:string|null };
export type OfferBinding = { slot:"pack"|"collection"; collectionId:string;
  publicationId:string|null; availability:"optional"|"required" };
export type Snapshot = { campaignId:string; slug:string;
  content:Omit<Campaign,"slug"|"status"|"recipes">;
  members:Member[]; offers:OfferBinding[] };
export type Revision = { id:string; campaignId:string; version:number; digest:string;
  base:Base; snapshot:Snapshot; submissionId:string|null;
  state:"draft"|"submitted"|"changes_requested"|"rejected"|"approved"|"superseded"|"published" };
export type PromiseRecord = { originalRecipeIds:string[]; originalCopy:string;
  originalCount:number; firstPublicationId:string; provenance:"human"|"legacy_import" };
export type Publication = { id:string; campaignId:string; digest:string;
  snapshot:Snapshot; promise:PromiseRecord; committedAt:string;
  availability:"available"|"emergency_unavailable" };
export type Impact = { token:string; checkedAt:string; policyVersion:string;
  registryVersion:number; checks:Check[]; affectedSlugs:string[] };
export type Command = { campaignId:string; operationId:string; reason:string };
export type SaveCommand = Command & { expectedVersion:number; expectedDigest:string;
  base:Base; reopenReviewed:boolean; snapshot:Snapshot };
export type PublishCommand = Command & { revisionId:string; expectedVersion:number;
  expectedDigest:string; base:Base; impactToken:string; approveNow:boolean };
export type Receipt = { operationId:string; campaignId:string; publicationId:string;
  digest:string; noChange:boolean; committedAt:string; refresh:"complete"|"pending" };
export type CampaignQuery = { q:string; page:number; pageSize:25|100;
  publication:string[]; promotion:string[]; collectionIds:string[];
  series:string|null; attention:boolean };
export type CampaignRow = { id:string; title:string; slug:string; originalCount:number;
  extraCount:number; promotion:"active"|"inactive"; publication:string;
  review:string|null; health:"ready"|"attention"|"blocked"|"unknown"; changedAt:string };
export type CampaignEvent = { id:string; action:string; at:string; reason:string;
  humanAuthoriser:string|null; executor:string; operationId:string;
  beforeRef:string|null; afterRef:string|null };
export type Detail = { campaignId:string; source:"legacy"|"database";
  active:Publication|null; working:Revision|null; impact:Result<Impact>;
  history:CampaignEvent[]; checkedAt:string };
export type LinkRecord = { id:string; campaignId:string; placement:Placement;
  token:string; url:string; readyToShare:boolean; externalStatus:"unverified"|"owner_recorded" };
export type Attribution = { campaignId:string|null; publicationId:string|null;
  placement:Placement|null; token:string|null; visitRef:string|null;
  confidence:"registered"|"destination"|"legacy"|"unattributed";
  capturedAt:string; policyVersion:string; environment:string };
```

Task 2 creates `campaigns/render-types.ts` for both private preview and public delivery. Type-only imports do not execute the existing data loader. `recipes` contains only currently safe cards; `slots` preserves unavailable original/extra positions without a recipe body, withdrawn image or private reason.

```ts
import type { CampaignPageData, CampaignRecipe } from "../data/load-campaign";
export type RenderSlot = { recipeId:string; group:"original"|"extra"; position:number } &
  ({state:"available";recipe:CampaignRecipe} | {state:"unavailable";message:string});
export type CampaignRenderData = CampaignPageData & {
  publicationId:string|null; originalPromise:string; originalCount:number;
  slots:RenderSlot[]; availability:"available"|"emergency_unavailable";
  safetyVersion:string;
};
```

Task 2 also creates these report contracts in `reports/contracts.ts`. Money crosses JSON as canonical decimal **minor-unit integer strings**, not floats/unsafe JS numbers. Internal arithmetic uses `bigint`. SQL results are strictly decoded and no raw DB/provider object is passed to the browser.

```ts
export type ReportQuery = { from:string; to:string; timezone:string;
  campaignIds:string[]; publicationIds:string[]; series:string|null; placement:string|null };
export type FinanceQuery = ReportQuery & { currency:string; accountScope:string;
  mode:"test"|"live"; basis:"activity"|"cohort" };
export type CohortRow = { visitRef:string; campaignId:string;
  publicationId:string|null; observedAt:string };
export type Cohort = { rows:CohortRow[]; complete:boolean; asOf:string;
  definitionVersion:string; reason:string|null };
export type Rate = { value:number|null; reason:string|null; provisional:boolean };
export type Freshness = { queriedAt:string; observedThrough:string|null;
  complete:boolean; stale:boolean; definitionVersion:string; policyVersion:string };
export type PerformanceDTO = { campaignId:string; pageViews:number;
  observedVisits:number; acquisitionVisits:number|null; recipeVisits:number; offerVisits:number;
  checkoutAttempts:number; checkoutRate:Rate; freshness:Freshness;
  sources:{behaviour:Freshness;checkout:Freshness} };
export type FinanceDTO = { paidOrders:number; payments:number; purchasingAccounts:number;
  capturedMinor:string; refundedMinor:string; capturedLessRefundsMinor:string;
  formalDisputes:number; disputedMinor:string; purchaseRate:Rate;
  refundStates:{pending:number;failed:number;unknown:number};
  disputeStates:{open:number;won:number;lost:number;unknown:number};
  attribution:{ registered:number; destination:number; legacy:number; unattributed:number };
  currency:string; mode:"test"|"live"; basis:"activity"|"cohort";
  asOf:string; exceptions:string[]; freshness:Freshness;
  sources:{behaviour:Freshness|null;ledger:Freshness} };
export type FinanceReportDTO = { summary:FinanceDTO;
  campaigns:{campaignId:string;summary:FinanceDTO}[] };
export type ReportResult<T> = { state:"ready"|"stale"; value:T }
  | { state:"disabled"|"unavailable"; reason:string };
export type VerifiedFact = { orderId:string; paymentId:string; capturedAt:string;
  capturedMinor:string; currency:string; accountScope:string; mode:"test"|"live";
  campaignId:string|null; visitRef:string|null;
  confidence:"registered"|"destination"|"legacy"|"unattributed" };
export type FactSet<T> = {rows:T[];complete:boolean;observedThrough:string;reason:string|null};
export type CohortMatch = { observed:number; checkoutVisits:number; purchaseVisits:number|null;
  complete:boolean; purchaseComplete:boolean; provisional:boolean; reason:string|null };
```

### Fixture and test conventions

Task 1 creates the guarded runner and transaction-scoped fixture shell; Task 2 supplies this complete pure fixture in `WEB/tests/fixtures/campaigns.mjs`:

```js
export const id = n => `f4000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
export const CAMPAIGN = id(1);
export const member = (n,group="original",position=1) => ({
  recipeId:id(n),recipeSlug:`phase4-recipe-${n}`,group,position,
  contentVersion:1,assetDigest:"a".repeat(64),note:null
});
export const snapshot = () => ({campaignId:CAMPAIGN,slug:"phase4-breakfasts",
  content:{room:"kitchen",theme:"kitchen",title:"3 breakfast recipes",
    subtitle:"Simple recipes for mornings."},
  members:[member(101,"original",1),member(102,"original",2),member(103,"original",3)],
  offers:[]});
export const base = () => ({publicationId:null,digest:"0".repeat(64),registryVersion:0});
```

All pure test snippets below use `node:test` and `node:assert/strict`; include those imports in their named files. DB snippets execute inside rollback-only pgTAP tests with the named fixture include. Define fixture-only `pg_temp.phase4_as(p_role text,p_aal text DEFAULT 'aal2')` and `pg_temp.phase4_enable(p_stage text)` in `supabase/test-fixtures/admin-campaigns.sql`; never install these functions in production migrations. They use synthetic principals/reuse the local singleton owner and set transaction-local JWT claims, stage and test grants. Browser fixtures are serial, real local Auth users, and never simulate a production identity by changing claims.

For each task: write the specified failing case, run its named check and verify the intended failure, implement the decisive contract, run the focused check again, reconcile its gate, then commit **only its named changed files**. Inspect the staged paths first. No `git add .`, production reset or passing build substituted for other gates. Commands run from `WEB` unless stated otherwise; the DB command is `node scripts/test-phase4-db.mjs --workdir "$PHASE4_TEST_ROOT" <suite>`, where the owned root is established in Task 1.

## Task 1: Establish the integrated baseline and isolated acceptance harness

**Depends on:** approved plan; integrated Phase 1 for authenticated execution. **Owns:** A1/A20 foundations and explicit prior-phase blockers.

**Files:** Create `docs/implementation/admin-campaigns/{GATES,BASELINE,POLICY}.md`, `ops/ADMIN-CAMPAIGNS.md`, `WEB/scripts/{phase4-target-guard,test-phase4-db}.mjs`, `WEB/tests/admin/campaign-target.test.mjs`, `supabase/test-fixtures/admin-campaigns.sql`; modify existing DB-runner include support only as required.

**Interfaces:** `assertPhase4Target({projectId,apiUrl,databaseUrl}):void`; guarded runner accepts only `--workdir` and SQL basenames. With no basenames it requires all suites 40–55; the independent 4A CI call supplies the exact 40–50 basenames. It expands only the allowlisted admin-console/collections/support/campaign fixture includes from the repository. `phase4_as/phase4_enable` are test-only helpers as defined above.

- [ ] Write and run the remote-target rejection test:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { assertPhase4Target } from "../../scripts/phase4-target-guard.mjs";
test("phase4 cannot reset a hosted database",()=>{
  assert.throws(()=>assertPhase4Target({projectId:"mch-admin-campaigns-test",
    apiUrl:"https://hosted.example",databaseUrl:"postgresql://hosted.example/db"}));
});
```

- [ ] Implement an owned local project `mch-admin-campaigns-test`, initially using API/database ports 54521/54522 and its own adjacent service ports after checking availability. Guard project ID, loopback host and exact selected ports; no linked/remote/reset-default option. Record `PHASE4_TEST_ROOT` outside tracked source, export test keys securely and never print them. Existing default/Phase 1–3 stacks are not reset.
- [ ] Record current commits, dirty paths, existing failures and every A1–A20 gate. Verify Phase 2/3 contracts against actual integrated files/migrations; keep missing dependencies explicitly unmet. Reuse one local owner, serialize browser specs and retain append-only audit evidence; reset only this disposable owned stack between rehearsals.
- [ ] Run `node --test tests/admin/campaign-target.test.mjs`, the existing local admin baseline and the guarded fixture runner. Commit the harness/evidence with `test: establish guarded campaign admin baseline`.

## Task 2: Define strict campaign/report contracts and promise rules

**Depends on:** 1. **Owns:** A5/A11/A16 contract foundations.

**Files:** Create campaign `{contracts,decode,query,digest,promise}.ts`, public `WEB/src/lib/campaigns/render-types.ts`, reports `{contracts,decode,query,redaction}.ts`, `WEB/tests/fixtures/campaigns.mjs`, `WEB/tests/admin/campaign-{contracts,promise,digest}.test.mjs`, `report-contracts.test.mjs`; extend existing admin permission type unions without granting authority.

**Interfaces:** Export shared types above; `validatePromise(previous:Snapshot|null,candidate:Snapshot):string[]`; `campaignDigest(snapshot:Snapshot):string`; `decodeCampaignDetail(input:unknown):Detail`; `decodePerformance(input:unknown):PerformanceDTO`, `decodeFinance(input:unknown):FinanceDTO`, `decodeFinanceReport(input:unknown):FinanceReportDTO`; `parseReportQuery(input:unknown):ReportQuery`; `parseFinanceQuery(input:unknown):FinanceQuery`. Canonical digest sorts object keys but preserves member order.

- [ ] Add and run the removal test with `node --experimental-strip-types --test tests/admin/campaign-promise.test.mjs`:

```js
import { snapshot } from "../fixtures/campaigns.mjs";
import { validatePromise } from "../../src/lib/admin/campaigns/promise.ts";
test("an existing promise cannot be replaced",()=>{
  const before=snapshot(), after=snapshot(); after.members.shift();
  assert.ok(validatePromise(before,after).includes("PROMISE_REMOVED"));
});
```

- [ ] Implement identity-based validation, original relative-order preservation, unique recipe membership, extra-group rules and a slug locked once published. `previous` is the last published snapshot, or null before first publication. The decisive comparison is:

```ts
const errors:string[] = [];
const released = new Set(previous?.members.map(m => m.recipeId) ?? []);
const candidateIds = new Set(candidate.members.map(m => m.recipeId));
const removed = [...released].filter(id => !candidateIds.has(id));
if (removed.length > 0) errors.push("PROMISE_REMOVED");
```

- [ ] Add strict UUID/digest/date/enum, payload and URL decoders. Finance minor-unit strings must match a signed integer pattern where subtraction is permitted; captured/refund facts themselves are non-negative. Unknown JSON fields are rejected at commands and omitted at response boundaries. Tests include duplicate IDs, 13 members, extra removal, slug mutation, `NaN`, unsafe numbers and fake financial fields in performance DTOs.
- [ ] Run the four named suites plus `npm run typecheck`; commit with `feat: define campaign promise and reporting contracts`.

## Task 3: Add campaign stages and explicit reporting grants

**Depends on:** 2 and integrated Phase 3 master-console gate before applying the migration. **Owns:** A2/A17, Review Focus 4.

**Files:** Create authority migration/suite 40, `WEB/src/lib/admin/campaigns/repository.ts`, reporting `actions.ts`; modify existing admin context/contracts/RPC and generated DB types; extend the campaign fixture.

**Interfaces:** Private `campaign_assert(p_permission text,p_stage text) RETURNS uuid`, `report_assert(p_permission text) RETURNS uuid`; public `admin_campaign_context()`, `admin_report_context()`, `admin_report_grant(p_command jsonb)`, `admin_report_revoke(p_command jsonb)`. TS `getCampaignContext()` returns `Result<{stage:CampaignStage;permissions:string[];assurance:'aal2'}>`; `setReportingGrant({userId,permission,enabled,operationId,reason})` returns `Result<{operationId:string;changed:boolean}>`. Public `admin_report_authorize(p_query jsonb,p_permission text,p_action text)` issues `{ticketId:string;queryDigest:string;expiresAt:string}`; restricted private `report_request_execute(p_ticket_id uuid,p_query jsonb,p_action text,p_payload jsonb DEFAULT NULL) RETURNS jsonb` consumes it and dispatches only `facts`, `summary`, `cache_get` or `cache_put` for that capability. The private context/assertion helper has no direct EXECUTE grant.

- [ ] Write and run suite 40 with authenticated-but-non-MFA denial:

```sql
SELECT pg_temp.phase4_enable('inspection');
SELECT pg_temp.phase4_as('viewer','aal1');
SELECT throws_ok('SELECT public.admin_campaign_context()',
  '42501','ADM_MFA_REQUIRED','campaign context requires MFA');
```

- [ ] Create private `campaign_settings` (stage, explicitly enabled role mappings, campaign-retention readiness), `report_settings` (independent `performance_enabled`, `finance_enabled`, `measurement_enabled`, `linkage_enabled`, `export_enabled`, `policy_verified`, `policy_version`) and `admin_report_grants` (user, exact report capability, active, authoriser/reason/time). All activation switches start false; owner authority alone does not activate tracking. Reuse current membership, owner/team assertion, operation fingerprint/audit and Phase 3 `console_enabled`; use the same controlled grant/revoke pattern, never infer report permission from a recipe/support role. Owner has initial reviewed reporting authority; no other account is seeded or granted it automatically.
- [ ] Assert `auth.uid()`, `aal2`, current membership, relevant stage/grant and master gate under locks before reads, mutations and receipt replay. Grant/revoke requires confirmed unambiguous target, owner/team authority, same-origin browser intent, reason and exact operation. Web flag remains an additional web gate; no browser-supplied actor/approver is trusted.
- [ ] Establish the restricted server-report boundary: `admin_report_authorize` derives the human from `auth.uid()` and issues a single-use 60-second private request ticket bound to validated query digest/capability/action/current grant in `private.report_request_tickets`. Only a registered restricted server database principal can consume it through `report_request_execute`; the definer wrapper rechecks authority, marks it used and dispatches fixed private functions with trusted core context in the same bounded transaction. Obtain a fresh authenticated ticket for each operation; the server never supplies its own actor. Unsupported/not-yet-installed actions fail closed. Tickets grant no raw table access; browser execution of the wrapper/fact/cache functions is denied. Keep the ticket in server memory and use the existing secure secret mechanism for the restricted connection. No broad service-role or database-owner connection substitutes for this principal.
- [ ] Test all five campaign-role mappings, support-only roles, unknown capability, revoked role/grant, global disable and direct RPC access. Run suite 40 and `npm run typecheck`; commit `feat: enforce campaign stages and separate reporting grants`.

## Task 4: Store immutable revisions, promises and public projections

**Depends on:** 3. **Owns:** A3/A5/A10 data invariants.

**Files:** Create schema migration/suite 41; extend campaign contracts/decoders and fixture; regenerate DB types.

**Interfaces:** Private tables `campaign_heads`, `campaign_revisions`, `campaign_revision_members`, `campaign_promises`, `campaign_published_members`, `campaign_publications`, `campaign_source_ownership`, `campaign_dependency_registry`, `campaign_approvals`, `campaign_health_checks`, `campaign_refreshes`, `campaign_save_parts`. Public `campaign_publications_current` is a public-safe projection table with explicit RLS/grants, containing no private author/approval/history fields.

- [ ] Write and run an immutability regression:

```sql
SELECT throws_ok($q$UPDATE private.campaign_publications
  SET digest=repeat('b',64) WHERE campaign_id=pg_temp.phase4_campaign_id()$q$,
  '42501','ADM_IMMUTABLE','published history cannot be rewritten');
```

- [ ] Define fixture `pg_temp.phase4_campaign_id() RETURNS uuid` here. Use UUID keys, version/digest and single active/head pointers; unique reserved slug; immutable original member order; unique campaign/recipe released membership and first-publication provenance. The retained member table records first-publication position; each approved snapshot may correct extra ordering/notes while keeping every released identity and original order. Recipe references use RESTRICT rather than cascading promise deletion. Revisions/publications/approvals are immutable; heads/health/refresh state have narrowly controlled mutation.
- [ ] Enforce writes through protected functions only. Revoke raw anonymous/authenticated private table grants, enable RLS, make source ownership explicit and keep its default config-owned/disabled until import review. Public projection only exposes active approved content and safe references. Audit failures after rollback must not serialize private candidates into logs.
- [ ] Test private table enumeration, promise deletion, invalid active pointer, duplicate ordinal/recipe and anonymous projection fields. Run suites 40–41 and type generation; commit `feat: store immutable campaign publications and promises`.

## Task 5: Import configuration with provenance and controlled ownership

**Depends on:** 4. **Owns:** A1/A19, Review Focus 1.

**Files:** Create import migration/suite 42, campaign `source-import.ts`, `WEB/scripts/admin-campaigns-import.mjs`, `WEB/tests/admin/campaign-import.test.mjs`; extend BASELINE and runbook.

**Interfaces:** `buildCampaignImport(input:{campaigns:readonly Campaign[];recipes:{id:string;slug:string}[];collections:{id:string;slug:string}[];sourceSha:string}):ImportManifest`, with `ImportManifest={sourceSha:string;digest:string;rows:{slug:string;status:string;recipeIds:string[];blockers:string[]}[]}`. Restricted private `campaign_import(p_manifest jsonb,p_expected_digest text,p_operation_id uuid) RETURNS jsonb`; `campaign_source_select(p_campaign_id uuid,p_source text,p_expected_digest text,p_operation_id uuid) RETURNS jsonb` is owner-attested, audited and defaults to dry-run.

- [ ] Add a synthetic duplicate-keyword test:

```js
import { snapshot } from "../fixtures/campaigns.mjs";
import { buildCampaignImport } from "../../src/lib/admin/campaigns/source-import.ts";
test("reused keywords do not collapse separate campaigns",()=>{
  const s=snapshot();
  const campaign=slug=>({...s.content,slug,status:"published",
    instagram:{keyword:"BREAKFAST",postedOn:"2026-10-07"},
    recipes:s.members.map(m=>({slug:m.recipeSlug}))});
  const result=buildCampaignImport({campaigns:[campaign("breakfast-a"),campaign("breakfast-b")],
    recipes:s.members.map(m=>({id:m.recipeId,slug:m.recipeSlug})),
    collections:[],sourceSha:"a".repeat(40)});
  assert.deepEqual(result.rows.map(r=>r.slug),["breakfast-a","breakfast-b"]);
  assert.ok(result.rows.every(r=>r.blockers.length===0));
});
```

- [ ] Extend that test with the same mapped collection on both entries. Assert distinct campaign UUID/source identity in the DB; importing again returns no-change. Preserve every missing mapping as a blocker and import configured drafts privately. Local sample entries are excluded by the CLI selecting `CAMPAIGNS`, not by a guess from slug text.
- [ ] CLI default writes only a sanitised dry-run manifest; apply requires the exact expected digest and restricted operator authority. Imported published records retain `legacy_import` provenance, original address/member evidence and absent external references. Do not fabricate a historic human approval or equate current config with proof of the Instagram post. A selected database source cannot automatically fall back after an error.
- [ ] Run import unit/suite 42; compare the real config manifest read-only and record unresolved target mappings. Commit `feat: import campaigns with source ownership and promise provenance`.

## Task 6: Deliver protected campaign inventory, detail and history

**Depends on:** 5. **Owns:** A2/A3/A1 inspection slice.

**Files:** Create reads migration/suite 43, `CampaignLibrary.tsx`, `CampaignHistory.tsx`, routes `WEB/src/app/admin/campaigns/page.tsx` and `[campaignId]/page.tsx`, `WEB/tests/e2e/admin-campaigns-inspection.spec.ts`; extend campaign `query.ts`/repository read functions and modify `WEB/src/components/admin/AdminShell.tsx` only for capability-gated navigation.

**Interfaces:** RPCs `admin_campaign_list(p_query jsonb)`, `admin_campaign_detail(p_campaign_id uuid)`, `admin_campaign_history(p_campaign_id uuid,p_cursor text)`; TS `listCampaigns(query:CampaignQuery):Promise<Result<{rows:CampaignRow[];total:number}>>`, `getCampaignDetail(id:string):Promise<Result<Detail>>`, `getCampaignHistory(id,cursor):Promise<Result<{events:CampaignEvent[];nextCursor:string|null}>>`.

- [ ] Add the browser denial test and run its spec:

```ts
test("signed-out campaign inspection requires authentication",async ({page})=>{
  await page.goto("/admin/campaigns");
  await expect(page).toHaveURL(/\/sign-in/);
});
```

- [ ] Implement escaped exact/substring title/slug search, bounded post/keyword matching, stable changed-at/UUID pagination (25 default, 100 max), filters and private history. UI shows original/extra counts separately, source mode, draft/review, offer references, health and next action. Finance never enters the list/detail DTO, not even as a hidden column.
- [ ] Distinguish empty, no match, unavailable, MFA/permission and invalid UUID without leaking records to unauthorised callers. Preserve filters/back navigation; use dynamic/no-store responses and existing admin privacy. Record reads safely without raw search/response bodies.
- [ ] Run suite 43, the named browser spec, strict-decoder tests and typecheck; commit `feat: add protected campaign inventory and history`.

## Task 7: Save private drafts and batched additive recipe selections

**Depends on:** 6. **Owns:** A3/A5/A7, Review Focus 5.

**Files:** Create drafts migration/suite 44, campaign `actions.ts`, `CampaignEditor.tsx`, edit route `[campaignId]/edit/page.tsx`, `WEB/tests/admin/campaign-drafts.test.mjs`, `WEB/tests/e2e/admin-campaigns-editing.spec.ts`; extend repository/fixture.

**Interfaces:** `admin_campaign_create(p_command jsonb)`, `admin_campaign_save_begin(p_command jsonb)`, `admin_campaign_save_part(p_save_id uuid,p_index int,p_members jsonb)`, `admin_campaign_save_finish(p_save_id uuid,p_expected_digest text)`, `admin_campaign_duplicate(p_command jsonb)`. TS `saveCampaign(command:SaveCommand):Promise<Result<Revision>>`, `createCampaign(slug,operationId,reason):Promise<Result<Detail>>`, `duplicateCampaign(campaignId,newSlug,operationId,reason):Promise<Result<Detail>>`.

- [ ] Test that a >12-member candidate is valid without expanding actual free inventory:

```js
import { snapshot, member } from "../fixtures/campaigns.mjs";
import { validatePromise } from "../../src/lib/admin/campaigns/promise.ts";
test("logical membership is not capped at twelve",()=>{
  const next=snapshot();
  next.members.push(...Array.from({length:10},(_,i)=>member(200+i,"extra",i+1)));
  assert.deepEqual(validatePromise(snapshot(),next),[]);
});
```

- [ ] Implement private save sessions with optimistic head/base binding, immutable finalized revisions and operation fingerprints. Upload members in ordered, at-most-100-reference parts, each capped at 1 MiB; reject duplicate/conflicting part indices and incomplete manifests. Finish verifies the whole canonical membership digest and advances one head atomically. Total logical membership has no marketing cap; abandoned parts expire under the configured draft policy. Staging is never public or approvable.
- [ ] Editor selects existing recipe identities, existing approved assets/template values and existing collections; free/public status is shown as eligibility evidence, not changed. Reopening review creates an unapproved revision. Duplicate copies content only and clears post binding, approvals, tokens and publication history. Preserve inputs on save failure/conflict and warn on unsaved navigation.
- [ ] Run suite 44, draft/promise tests and editing browser spec. Verify anonymous page/metadata unchanged during all private saves. Commit `feat: prepare private campaign revisions and additive selections`.

## Task 8: Evaluate anonymous eligibility and render exact private previews

**Depends on:** 7 plus integrated Phase 2 collection-publication reader for offer-linked candidates. **Owns:** A4/A6/A9.

**Files:** Create eligibility migration/suite 45, campaign `{eligibility,preview,assets}.ts`, `CampaignPreview.tsx`, private preview route `[campaignId]/preview/page.tsx`, `WEB/tests/admin/campaign-eligibility.test.mjs`, `WEB/tests/e2e/admin-campaigns-preview.spec.ts`; update loader DTOs only to accept explicit private rendering inputs.

**Interfaces:** `admin_campaign_impact(p_campaign_id uuid,p_revision_id uuid) RETURNS jsonb`; `evaluateCampaign(snapshot:Snapshot,observations:{recipeId:string;free:boolean;published:boolean;reviewed:boolean;assetAvailable:boolean;unknown:boolean}[]):Impact`; `loadCampaignPreview(campaignId:string,revisionId:string):Promise<Result<{revision:Revision;impact:Impact;publicData:CampaignRenderData}>>`. Use the renderer-safe Task 2 type, not private records.

- [ ] Add and run the paid/private visibility test:

```js
import { snapshot } from "../fixtures/campaigns.mjs";
import { evaluateCampaign } from "../../src/lib/admin/campaigns/eligibility.ts";
test("admin visibility cannot satisfy anonymous free eligibility",()=>{
  const checks=evaluateCampaign(snapshot(),snapshot().members.map(m=>({recipeId:m.recipeId,
    free:false,published:true,reviewed:true,assetAvailable:true,unknown:false}))).checks;
  assert.ok(checks.some(c=>c.state==="fail" && c.severity==="blocker"));
});
```

- [ ] Read eligibility through the same anonymous/free policy as public delivery, with current recipe/content/free-allocation versions. Static public campaign assets use an allowlisted existing-asset manifest; stored recipe assets use Phase 1 approved-object/version checks. Reject protocol-relative/unsupported remote URLs and never fetch arbitrary input. Trusted asset observations expire after 60 seconds for publication.
- [ ] Preview exact revision, original/extra grouping, generated counts, active diff, original promise, image alt, offer shown/hidden state and external-link status. Offer data consumes Phase 2 `getPublishedCollection`/`loadLiveOffer` and validates binding identity; required unavailable offers block, optional hidden offers require explicit acknowledged warning. Unknown material sources block review/publication.
- [ ] Verify no SDK/replay/events, noindex/no-store and no reusable anonymous preview URL. Run suite 45 and preview/eligibility tests, including source outage and unavailable original recipe. Commit `feat: preview exact campaigns against public eligibility`.

## Task 9: Bind human review to exact candidate and impact

**Depends on:** 8. **Owns:** A6.

**Files:** Create review migration/suite 46, campaign `review.ts`, `CampaignReview.tsx`, `WEB/tests/e2e/admin-campaigns-review.spec.ts`; extend actions/repository/decoders.

**Interfaces:** `admin_campaign_submit(p_command jsonb)`, `admin_campaign_review(p_command jsonb)`; `submitCampaign(command:PublishCommand):Promise<Result<Revision>>`; `reviewCampaign(command:Command & {revisionId:string;expectedDigest:string;impactToken:string;decision:'approve'|'changes_requested'|'reject';acknowledgedCodes:string[]}):Promise<Result<Revision>>`.

- [ ] Add a stale-approval DB regression:

```sql
SELECT pg_temp.phase4_as('reviewer');
SELECT throws_ok($q$SELECT public.admin_campaign_review(
  jsonb_build_object('expected_digest',repeat('f',64)))$q$,
  '22023','ADM_INVALID','malformed review cannot approve a head');
```

- [ ] Extend the complete fixture proposal with a legitimate submission/impact, approve it, then save a changed title/member/offer and prove the original approval cannot publish it. Approval stores human, channel, exact revision/submission/digest, material impact and warning acknowledgements. Reviewer reasons are bounded; unresolved blockers/unknown checks prevent approval.
- [ ] Owner combined approval/publication will use the same internal review core in Task 10; other reviewers cannot execute publication by submitting a decision. Editing/rebasing marks approvals stale without deleting history.
- [ ] Run suite 46 and review browser spec; commit `feat: bind campaign review to exact candidates`.

## Task 10: Publish atomically and replace deployment-only campaign protection

**Depends on:** 9 and completed Phase 2 corrections/publication locks. **Owns:** A5/A6/A7/A8/A10, Review Focus 2.

**Files:** Create publication migration/suite 47, campaign `publication.ts`; modify `WEB/src/lib/admin/{campaign-usage,recipes,recipe-corrections}.ts` (corrections supplied by Phase 2), existing collection impact adapter and generated types. The migration extends `admin_recipe_impact`, `admin_revision_publish`, `admin_recipe_withdraw`, Phase 2 `admin_recipe_correct`/`collection_publish_core`, collection impact and protected free-allocation writers. Do not edit historical migration bodies.

**Interfaces:** Private `campaign_publish_core(p_context jsonb,p_command jsonb) RETURNS jsonb`; public `admin_campaign_publish(p_command jsonb)`; TS `publishCampaign(command:PublishCommand):Promise<Result<Receipt>>`. Private `campaign_usage_for_recipe(p_recipe_id uuid) RETURNS jsonb`, `campaign_lock_dependencies(p_campaign_id uuid,p_recipe_ids uuid[]) RETURNS void`; registry version participates in both recipe and campaign impact tokens.

- [ ] Add a publication rollback test with a late failing audit/projection insertion and verify all pointers/member rows remain unchanged. The deciding transaction writes are:

```sql
INSERT INTO private.campaign_published_members
  (campaign_id,recipe_id,member_group,position,first_publication_id)
SELECT p_campaign_id,m.recipe_id,m.member_group,m.position,p_publication_id
FROM private.campaign_revision_members m WHERE m.revision_id=p_revision_id
ON CONFLICT (campaign_id,recipe_id) DO NOTHING;
UPDATE private.campaign_heads SET active_publication_id=p_publication_id
WHERE id=p_campaign_id AND active_publication_id IS NOT DISTINCT FROM p_expected_base;
```

- [ ] Treat the SQL above as the transaction's decisive write fragment: `p_campaign_id`, `p_revision_id`, `p_publication_id` and `p_expected_base` are validated core-local values. First lock/validate the candidate and all retained members, then verify exactly one matching head update; any mismatch aborts the transaction. Never trust an executor-created temporary relation. Bind current human/executor authority, candidate/head, 60-second asset evidence and material recipe/free/collection/policy versions. Lock dependency identities in deterministic order with bounded timeout; never call providers under locks.
- [ ] Use one registry-coordination lock before dependency discovery and before existing Phase 2 locks for every participating campaign/source/recipe-correction/withdrawal/free-availability/publication writer. Then lock affected campaigns, collections, recipes and offers in UUID order within each class, followed by draft/order/operation rows; preserve the Phase 2 collection → recipe → offer suffix. Discover/recheck the full impacted set under coordination. Read-only reports and checkout, which does not mutate public eligibility, do not acquire this registry lock. Test lock timeout and both winner orders. This deliberately serialises the small initial publication workload instead of leaving differently ordered writers.
- [ ] Freeze original promise once; append new extra memberships with provenance; write immutable publication, public projection, active pointer, registry revision, audit and durable operation receipt together. Return existing authorised receipt for identical operation retry and reject fingerprint reuse. Published source ownership must be database-controlled before normal writes.
- [ ] Registry reads union unmigrated legacy public references and database originals/extras, including inactive promotion. Keep drafts private and separate. Replace Phase 1 incompatible table locks through explicit coordinated functions; preserve safety/collection commercial blocks. A recipe correction follows Phase 2's approved global correction command, not a campaign bypass.
- [ ] Run suite 47, existing recipe/collection publication suites and controlled two-session publish/withdraw interleavings. Commit `feat: publish campaigns with transactional promise protection`.

## Task 11: Register stable placement links and promotion state

**Depends on:** 10. **Owns:** A11, Review Focus 1.

**Files:** Create links migration/suite 48, campaign `links.ts`, `CampaignLinks.tsx`, `WEB/tests/admin/campaign-links.test.mjs`, `WEB/tests/e2e/admin-campaigns-links.spec.ts`; extend actions/repository and detail route.

**Interfaces:** `admin_campaign_link_create(p_command jsonb)`, `admin_campaign_promotion(p_command jsonb)`; `createCampaignPlacement(command:Command & {placement:Placement}):Promise<Result<LinkRecord>>`; `buildCampaignLink(input:{origin:string;slug:string;placement:Placement;token:string}):string`; `setCampaignPromotion(command:Command & {active:boolean}):Promise<Result<{active:boolean;operationId:string}>>`. Private `campaign_placements` stores immutable token/identity bindings; owner-recorded external references are separately versioned, audited metadata.

- [ ] Add the long-slug/placement contract test:

```js
import { buildCampaignLink } from "../../src/lib/admin/campaigns/links.ts";
test("neutral tokens fit attribution regardless of slug length",()=>{
  const token="c_"+"a".repeat(32);
  const url=new URL(buildCampaignLink({origin:"https://example.com",
    slug:"breakfast-".repeat(8)+"ideas",placement:"comment_dm",token}));
  assert.equal(url.searchParams.get("utm_campaign"),"comment_dm");
  assert.equal(url.searchParams.get("utm_content"),token);
  assert.ok(token.length<=40);
});
```

- [ ] Generate unguessable neutral tokens, validate exact origin/slug and construct query parameters with `URLSearchParams`, `utm_source=instagram` and `utm_medium=organic_social`. All four placements are supported. A registered token binds one campaign/placement; different posts remain distinct even when keyword/collection repeats. Validate optional post URLs against Instagram host and expected post/reel paths without fetching them. Do not encode personal data or trust arbitrary origins. Existing bare/legacy URLs continue to resolve, and malformed tags cannot change routing/access.
- [ ] Show “ready to share” only after publication and successful public readback. Marking promotion inactive removes active promotion cues without changing the publication, promise, URL or token. External post URL/keyword entry means owner-recorded; DM delivery stays unverified until separately evidenced. Do not invoke Instagram/DM tools or send anything.
- [ ] Run suite 48, link unit/browser specs and legacy campaign URL tests; commit `feat: register stable campaign placement links`.

## Task 12: Serve public publications with fresh safety protection

**Depends on:** 10–11. **Owns:** A3/A5/A8/A9/A19, Review Focus 2/5.

**Files:** Create safety migration/suite 49, public `campaigns/{publication,safety}.ts`, `WEB/tests/admin/campaign-safety.test.mjs`, `WEB/tests/e2e/campaign-publications.spec.ts`; modify `WEB/src/lib/data/{campaigns,load-campaign}.ts`, `WEB/src/lib/campaigns/{types,validate}.ts`, `WEB/src/app/stories/[slug]/page.tsx` and the existing `WEB/src/components/campaign/` renderer components that consume recipes/hero/metadata.

**Interfaces:** `PublicCampaignRecord={campaign:Campaign;publicationId:string|null;members:Pick<Member,'recipeId'|'recipeSlug'|'group'|'position'>[];originalPromise:string;originalCount:number}`. Extend `CampaignSource` with `getPublished(slug:string):Promise<PublicCampaignRecord|null>` while retaining list/get adapters. `loadPublicCampaign(slug:string):Promise<{status:'ok';data:CampaignRenderData}|{status:'not_found'}|{status:'unavailable';message:string}>`. `SafetyOverlay={visibleIds:string[];hiddenIds:string[];allUnavailable:boolean;safetyVersion:string}`; `evaluateCampaignSafety(snapshot:Snapshot,states:{recipeId:string;safe:boolean|null}[],version:string):SafetyOverlay`. Public `campaign_public_safety(p_slug text)` returns only public availability/identity/version, never withdrawal reasons or private bodies.

- [ ] Test missing/unknown recipe evidence without losing promise identity:

```js
import { snapshot } from "../fixtures/campaigns.mjs";
import { evaluateCampaignSafety } from "../../src/lib/campaigns/safety.ts";
test("unknown availability hides a card while retaining its slot",()=>{
  const s=snapshot();
  const overlay=evaluateCampaignSafety(s,s.members.map((m,i)=>({recipeId:m.recipeId,safe:i===0?null:true})),"v2");
  assert.ok(overlay.hiddenIds.includes(s.members[0].recipeId));
  assert.equal(overlay.visibleIds.length,2);
});
```

- [ ] Select exactly one authoritative source per slug. Database-owned source failure must surface unavailable, never stale config fallback. Production anonymous reads never expose drafts; local samples remain local only. Replace the old 1–12 validator with non-empty unique membership and bounded loading. Page/editor/reference reads use pages of at most 100; retain all members across pages and test 13/101/1,001 references synthetically. Do not expand the current three free slots or claim 1,001 eligible public recipes exist.
- [ ] Separate cacheable immutable publication structure from a fresh authoritative availability read on every public response, including metadata/hero/related cards and image preload paths. Disable the route's full-response caching where it could bypass that read; shared request-level memoization must not cross requests. Safety-source failure fails closed. Recompute image choices from currently safe approved assets. Keep originals/extras identifiable, replace unavailable members with safe generic slots, and serve a stable controlled explanation when all promised content is unavailable. Apply the same safety rules to historical/private previews.
- [ ] Warm the actual route cache, withdraw a recipe through the approved emergency path, then fetch HTML, RSC, metadata and image links anonymously. Verify withdrawn bodies/images are absent and stable URL/placeholders remain. Check cache behaviour against the installed Next.js version, not assumed revalidation semantics. Run suite 49, safety/publication specs and existing campaign/recipe/collection data/browser tests; commit `feat: serve campaign publications with current safety overlays`.

## Task 13: Complete publication interactions and recover refresh failures

**Depends on:** 12. **Owns:** A6/A10, Review Focus 4.

**Files:** Create campaign `{refresh,refresh-result}.ts`, `CampaignPublication.tsx`, `WEB/tests/admin/campaign-refresh.test.mjs`, `WEB/tests/e2e/admin-campaigns-publication.spec.ts`; extend actions/history/detail and `ops/ADMIN-CAMPAIGNS.md`. The pure status helper lives in `refresh-result.ts`; Next/server refresh operations stay in `refresh.ts`.

**Interfaces:** `approveAndPublishCampaign(command:PublishCommand):Promise<Result<Receipt>>` requires owner combined authority; `refreshCampaignPublication(receipt:Receipt):Promise<Result<{operationId:string;state:'complete'|'pending'}>>`; `retryCampaignRefresh(operationId:string):Promise<Result<{operationId:string;state:'complete'|'pending'}>>`; `getCampaignOperation(operationId:string):Promise<Result<Receipt>>`. Add protected `admin_campaign_operation` and `admin_campaign_refresh_record` RPCs, with current authority before any receipt read/replay.

- [ ] Add a browser refresh-failure test using an application-owned fixture hook available only on the guarded local target. Select the exact revision, publish once with refresh failure, observe “Published — refresh pending”, retry refresh, and assert one publication/extra/audit operation plus matching anonymous publication ID. The pure refresh decision is:

```ts
export function publicationStatus(receipt:Receipt):"ready"|"refresh_pending" {
  return receipt.refresh==="complete" ? "ready" : "refresh_pending";
}
```

- [ ] Wire prepare/preview/review/publication using exact versions and impact tokens. Explicit final confirmation names campaign/promise/additions and the actual destination. Owner combined action records distinct approval and publication facts; publisher without review authority cannot approve themselves by toggling a client flag.
- [ ] Refresh campaign/recipe/collection/admin/metadata dependencies after commit and record pending status durably. Public readback must match the receipt before links become ready. Recover an uncertain commit through the original operation ID, never a fresh publication request. Revoked authority must deny operation lookup and refresh retry even for a previously successful caller. A safety overlay remains effective while refresh is pending.
- [ ] Run refresh unit/publication browser specs and suites 46–49; commit `feat: recover campaign publication and refresh outcomes`.

## Task 14: Expose exact human-approved commands to restricted operators

**Depends on:** 13 and integrated prior-phase operator identity/attestation controls. **Owns:** A12.

**Files:** Create operator migration/suite 50, campaign `operator.ts`, `WEB/scripts/admin-campaigns-operator.mjs`, `WEB/tests/admin/campaign-operator.test.mjs`; extend runbook and fixture with a dedicated restricted local database principal.

**Interfaces:** Private `campaign_operator_prepare(p_command jsonb) RETURNS jsonb`, `campaign_operator_execute(p_approval_id uuid,p_expected_digest text,p_operation_id uuid) RETURNS jsonb`; `OperatorProposal={id:string;humanAuthoriser:string;executorPrincipal:string;commandDigest:string;impactToken:string;expiresAt:string;state:'pending'|'approved'|'revoked'|'executed'}`; `prepareCampaignOperation(command:PublishCommand):Promise<Result<OperatorProposal>>`. Owner browser approval binds this proposal via the existing review core. Restricted DB execution invokes the same publication core, not public RPC impersonation.

- [ ] Prove an unregistered executor fails even with forged claims:

```sql
SELECT pg_temp.phase4_as('editor');
SELECT throws_ok($q$SELECT private.campaign_operator_execute(
  'f4000000-0000-4000-8000-000000000099',repeat('a',64),
  'f4000000-0000-4000-8000-000000000098')$q$,
  '42501','ADM_OPERATOR_DENIED','JWT claims cannot create an operator principal');
```

- [ ] Bind executor to registered `session_user`/restricted role, approved operation, current human membership/capability and exact unexpired proposal/impact. Resolve human approval from protected DB facts; never set `auth.uid()` or accept arbitrary actor JSON as authority. Reject changed command, revoked/expired approval, replay with a different fingerprint and broad service-role credentials as a substitute. Restrict grants/search paths and deny raw writes; owner bootstrap of the executor is an explicit release operation.
- [ ] CLI prepares and prints a sanitised proposal summary/digest. Execution requires its actual human-approved ID and exact digest, writes executor/human separately, and performs no arbitrary SQL or environment dump. Source cutover and emergency withdrawal are separately scoped approved operations; normal publication authority does not imply either.
- [ ] Install the campaign-only retention command boundary in this migration for independently releasable 4A: owner-attested dry-run/apply with policy version, cutoff, expected row count and operation ID. It may purge expired private draft parts/diagnostic evidence, never active promises, released members or audit identity. Task 24 adds the later measurement/cache classes without editing this applied migration.
- [ ] Run suite 50 and operator unit cases with the dedicated local principal; commit `feat: support attested campaign operator execution`.

## Task 15: Verify 4A races, owner workflow and independent activation

**Depends on:** 14. **Owns:** A1–A12/A19 and the campaign portion of A20.

**Files:** Create `WEB/scripts/admin-campaigns-concurrency.mjs`, `WEB/tests/e2e/admin-campaigns-recovery.spec.ts`, `docs/implementation/admin-campaigns/{REHEARSAL,RELEASE}.md`; extend GATES/runbook, local fixture and scoped CI invocation for suites 40–50.

**Interfaces:** Concurrency CLI `--workdir <owned-root> --scenario saves|publishers|withdrawal|free-slot|collection|source-cutover`; output `{scenario,commitCount,conflictCount,activeDigest,registryVersion,pass}`. It uses the target guard and controlled independent `pg` sessions. No production reset/target inference.

- [ ] Implement session barriers with advisory locks/lock observation, bounded statement/lock timeouts and independent connections; avoid sleep-based race assumptions. Required outcomes include:

```js
assert.equal(result.commitCount,1);
assert.equal(result.conflictCount,1);
assert.equal(result.pass,true);
```

- [ ] Exercise two saves on one head, two exact publications, publication against recipe emergency withdrawal/free-slot change/approved correction/collection publication, and import source cutover against dependency checks. Assert whole transaction state, promise membership, safety projection and audit/receipt cardinality; winning safety withdrawal may leave a controlled unavailable campaign, never unsafe content.
- [ ] Rehearse owner inspection → private draft → preview → approval → publication → approved addition → anonymous readback → refresh recovery → inactive promotion. Capture exact target/SHA/migrations/IDs and sanitized evidence. Verify local source import and configured public free capacity; unresolved legacy mappings block cutover. Run required existing admin, recipe, collection and storefront checks as well as suites 40–50.
- [ ] If releasing 4A first, complete Task 24's campaign policy/rehearsal steps against the cleanup boundary installed in Task 14, and bring forward Task 25's relevant CI/replay checks. Later measurement migrations are not required or applied out of order. Obtain the independent candidate review and release authority from Task 26. Do not wait for behavioural tracking to make safe campaign authoring usable. Record campaign gates as passed/unmet with evidence; commit `test: verify campaign management integration and recovery`.

## Task 16: Introduce a policy-gated visit and campaign measurement contract

**Depends on:** 11–12 and approved measurement configuration before activation. **Owns:** A13, Review Focus 3.

**Files:** Create analytics `{visit-context,campaign-context}.ts`, `WEB/tests/admin/visit-context.test.mjs`, `WEB/tests/admin/campaign-measurement.test.mjs`; modify existing analytics `{client,campaigns,events,schema,sanitize,provider,consent}.ts`, `WEB/src/components/campaign/CampaignTracker.tsx` and `WEB/tests/e2e/analytics-contract.spec.ts`; update POLICY.

**Interfaces:** `VisitContext={visitRef:string;startedAt:number;lastActive:number;attribution:Attribution|null}`; pure `advanceVisit(previous:VisitContext|null,now:number,destination:Attribution|null,newVisitRef:string):VisitContext`; `parseCampaignContext(url:URL):{token:string|null;placement:Placement|null}`; `measurementAllowed(input:{enabled:boolean;policyVerified:boolean;suppressed:boolean;privatePath:boolean}):boolean`. Event schema version 2 includes `event_id`, `visit_ref`, acquisition campaign/publication/placement/confidence and destination campaign separately. Preserve existing event meanings and old schema readers.

- [ ] Add the expiry test, then storage-failure and first-observed-campaign cases:

```js
import { advanceVisit } from "../../src/lib/analytics/visit-context.ts";
test("thirty minutes of inactivity resets visit and attribution together",()=>{
  const previous={visitRef:"old",startedAt:0,lastActive:0,attribution:null};
  const next=advanceVisit(previous,30*60*1000+1,null,"new");
  assert.equal(next.visitRef,"new");
  assert.equal(next.attribution,null);
});
```

- [ ] Store first observed eligible campaign within the visit, never overwrite it with later destination clicks, and refresh inactivity only on defined activity. At expiry clear visit ID, campaign and old PostHog `entry_story` session registration together; do not rely on tab lifetime/provider session ID. Handle blocked storage with in-memory context for that page session and disclosed reduced coverage, without creating an ID on every click. Forward the sanitized event/visit IDs through the provider; test the final capture payload, not just the envelope.
- [ ] Validate registered tokens server-side before durable confidence assignment; direct campaign destination is distinguishable from registered acquisition, legacy placement and unattributed context. No keyword identity lookup, URL-to-account linkage or PII in tags/events. Admin/private previews and fixture traffic are excluded. Stop new collection/export when policy or suppression requires it; legacy `analytics_consent` does not establish consent, and this task does not add a consent banner implicitly.
- [ ] Verify policy-enabled and policy-disabled browser runs with actual request capture and a public positive control. Run the two unit suites and analytics-contract spec; commit `feat: version campaign visits and measurement policy gates`.

## Task 17: Freeze optional attribution at the original order reservation

**Depends on:** 16 and completed Phase 2 authoritative reservation/checkout integration. **Owns:** A11/A14, Review Focus 1.

**Files:** Create attribution migration/suite 51, `WEB/tests/admin/campaign-attribution.test.mjs`, `WEB/tests/e2e/campaign-checkout-attribution.spec.ts`; modify Phase 2 `WEB/src/lib/payments/collection-reservation.ts`, existing `WEB/src/lib/payments/{checkout,types}.ts`, `WEB/src/app/api/checkout/route.ts`, `WEB/src/components/commerce/CheckoutButton.tsx`, analytics `campaign-context.ts` and generated DB types.

**Interfaces:** Private immutable `campaign_order_attribution` keyed by original order ID stores optional campaign/publication/placement/token/visit reference, confidence, captured time and policy/environment versions. Extend Phase 2 `reserve_collection_order(p_user_id,p_collection_id,p_expected,p_idempotency_key,p_attribution jsonb DEFAULT NULL) RETURNS jsonb` through one authoritative function migration, updating its callers and grants. `resolveCampaignAttribution(input:unknown,environment:string):Promise<Attribution|null>` returns validated optional context; `preserveAttemptAttribution(existing:Attribution|null,incoming:Attribution|null):Attribution|null` models the immutable reuse rule.

- [ ] Add the no-overwrite regression:

```js
import { preserveAttemptAttribution } from "../../src/lib/analytics/campaign-context.ts";
test("a reused unattributed attempt does not gain a later campaign",()=>{
  assert.equal(preserveAttemptAttribution(null,null),null);
  const later={campaignId:"f4000000-0000-4000-8000-000000000002",publicationId:null,placement:null,token:null,
    visitRef:null,confidence:"destination",capturedAt:"2026-10-07T00:00:00Z",
    policyVersion:"fixture",environment:"test"};
  assert.equal(preserveAttemptAttribution(null,later),null);
});
```

- [ ] Reserve attribution and immutable order terms in the initial reservation transaction, before calling Stripe. Fresh reservation creates one checkout-start identity; existing/owned/stale outcomes do not manufacture another attempt. A failed provider session followed by recovery/reuse retains the original context, including a deliberately unattributed original. Server token/campaign/placement validation gives measurement confidence only, never purchase/access authority.
- [ ] Use a nullable policy-approved context; absent/malformed tags, unavailable optional lookup and disabled measurement degrade to unattributed. Bound optional lookups before reservation and isolate attribution-quality failures from required commerce facts; a fundamental commerce database failure remains an explicit checkout failure. Do not put provider analytics on the critical path. Update the SQL placement allowlist to the four canonical codes, preserving documented historical values without reinterpreting old records. No guessed historical backfill or rewritten original terms.
- [ ] Run suite 51, attribution unit/browser tests and existing checkout/reservation/access suites. Exercise provider failure before session creation, duplicate original attempt, later different link, invalid token and policy suppression. Commit `feat: preserve original campaign attribution on checkout attempts`.

## Task 18: Make optional analytics exports durable and independent

**Depends on:** 17 and integrated verified fulfilment fact recording. **Owns:** A14/A15/A18.

**Files:** Create export migration/suite 52, analytics `export-claim.ts`, `WEB/scripts/export-campaign-analytics.mjs`, `WEB/tests/admin/campaign-exports.test.mjs`, `ops/ADMIN-REPORTING.md`; modify existing analytics `drain.ts` and fulfilment/checkout integration only to enqueue stable optional facts.

**Interfaces:** `ExportFact={eventId:string;occurredAt:string;visitRef:string|null;campaignId:string|null;schemaVersion:2;policyVersion:string;environment:string;kind:'checkout_started'|'payment_captured'|'refund_succeeded';properties:Record<string,string|number|null>}`; `toProviderEvent(fact:ExportFact)` returns `{event:string;timestamp:string;properties:Record<string,string|number|null>}`. Private `campaign_export_claim(p_limit int,p_lease_id uuid)` and `campaign_export_finish(p_event_id uuid,p_lease_id uuid,p_outcome text)` enforce lease/fencing. CLI accepts `--once --limit <1..100>` only, using existing secure configuration and a separately enabled export gate.

- [ ] Assert occurrence time and ID survive retry:

```js
import { toProviderEvent } from "../../src/lib/analytics/export-claim.ts";
test("export time cannot replace capture time",()=>{
  const fact={eventId:"f4000000-0000-4000-8000-000000000088",
    occurredAt:"2026-10-01T12:00:00Z",visitRef:null,campaignId:null,
    schemaVersion:2,policyVersion:"fixture",environment:"test",
    kind:"payment_captured",properties:{}};
  assert.equal(toProviderEvent(fact).timestamp,fact.occurredAt);
  assert.equal(toProviderEvent(fact).properties.event_id,fact.eventId);
});
```

- [ ] Enqueue only after verified commerce recording with stable fact/event IDs, original occurrence timestamp and nullable policy-permitted visit linkage. Never export email/account identity or use exported purchase events as the reporting ledger. Preserve historical events' meaning. Retry one fact with the same provider deduplication ID; own leases with fenced completion and bounded retry/backoff, plus a durable suppressed/failed distinction. A retired worker cannot acknowledge a newer lease.
- [ ] Remove synchronous provider-analytics network drain from checkout/webhook/fulfilment response paths. Dedicated bounded dispatch is explicitly scheduled on an existing approved host at release, or run by an authorised operator; no new platform/automation is provisioned by writing this plan. Disabled/misconfigured exports remain inspectable and cannot block purchase/access. Use a loopback provider stub for timeout, duplicate acknowledgement, suppression and lease-loss tests.
- [ ] Run suite 52 and export/fulfilment fault tests; commit `feat: dispatch optional campaign analytics outside commerce requests`.

## Task 19: Read bounded PostHog aggregates and complete observed cohorts

**Depends on:** 16 and private reporting authority from 3. **Owns:** A13/A16/A18, Review Focus 3/5.

**Files:** Create reports `{posthog-query,posthog}.ts`, `WEB/tests/admin/report-posthog.test.mjs`, `WEB/tests/admin/report-query.test.mjs`; update POLICY/runbook with a secure provider-read readiness probe.

**Interfaces:** `BehaviourAggregate={campaignId:string;pageViews:number;observedVisits:number;recipeVisits:number;offerVisits:number;freshness:Freshness}`; `queryBehaviour(query:ReportQuery):Promise<ReportResult<BehaviourAggregate[]>>`; `loadObservedCohort(query:ReportQuery):Promise<ReportResult<Cohort>>`; `compileBehaviourQuery(query:ReportQuery,kind:'aggregate'|'cohort'):string`; `decodeCohortRows(rows:unknown,asOf:string):Cohort`. Fixed query templates use only allowlisted event/property names, schema/definition versions and validated literal values.

- [ ] Add a truncation test that refuses to claim a complete cohort:

```js
import { id } from "../fixtures/campaigns.mjs";
import { decodeCohortRows } from "../../src/lib/admin/reports/posthog-query.ts";
test("a sentinel row makes joined conversion unavailable",()=>{
  const rows=Array.from({length:10001},(_,i)=>[
    id(i+200),id(1),id(2),"2026-10-01T00:00:00Z"]);
  const cohort=decodeCohortRows(rows,"2026-10-07T00:00:00Z");
  assert.equal(cohort.complete,false);
  assert.equal(cohort.reason,"COHORT_LIMIT");
});
```

- [ ] Use the official [PostHog query API](https://posthog.com/docs/api) with a private server-only read credential/project/host, separate from the public capture key. Verify current request schema, required read scopes, synchronous completion and rate limits against the installed/actual project before enabling reports. The intended request is POST `/api/projects/{projectId}/query/` with a fixed `HogQLQuery` body; do not invent SQL parameter support. A validated literal compiler escapes strings after strict UUID/ISO/timezone/placement parsing. No client SQL, arbitrary query endpoint, credentials in URLs or raw provider JSON in browser errors.
- [ ] Enforce 10-second deadline, 7/30/90-day or custom ≤90-day bounds, at most 20 selected campaign IDs/20 publication IDs and source/environment/policy filters. Destination aggregates filter the rendered publication; acquisition cohorts filter the captured acquisition publication, never today's head. Fetch at most 10,001 distinct observed visit/campaign/publication rows as a completeness sentinel; ≤10,000 valid rows with confirmed query completion constitute the bounded cohort. Truncation, partial/async results, unknown schema or query failure yields an incomplete/unavailable join and a request to narrow the period, never a silently sampled denominator. Provider aggregates can remain available with their own disclosed completeness. Keep visit references server-side transiently.
- [ ] Count distinct visits separately from page/action event counts; acquisition and destination dimensions are explicit. Missing storage/capture is disclosed coverage, not assumed measured visits. Test escaped input, duplicate rows, malformed timestamps, partial results, absent credentials, timeout and true empty result with a loopback stub. Run both unit suites and `npm run typecheck`; commit `feat: read bounded campaign observations privately`.

## Task 20: Aggregate verified financial facts with explicit time bases

**Depends on:** 17–18 and completed Phase 3 verified financial fact/reconciliation contracts. **Owns:** A15/A16/A17.

**Files:** Create facts migration/suite 53, reports `{ledger,metrics}.ts`, `WEB/tests/admin/report-ledger.test.mjs`, `WEB/tests/admin/report-metrics.test.mjs`; extend generated types and reporting runbook.

**Interfaces:** Private `campaign_checkout_facts(p_context jsonb,p_query jsonb)`, `campaign_finance_facts(p_context jsonb,p_query jsonb)`, `campaign_finance_summary(p_context jsonb,p_query jsonb)` read bound payment/refund/dispute facts plus original order attribution. Context is issued only by Task 3's ticket-consuming server boundary. `CheckoutFact={orderId:string;createdAt:string;campaignId:string|null;visitRef:string|null}`; `readCheckoutFacts(query:ReportQuery):Promise<FactSet<CheckoutFact>>`; `readFinanceFacts(query:FinanceQuery):Promise<FactSet<VerifiedFact>>`; `readFinanceSummary(query:FinanceQuery):Promise<Omit<FinanceDTO,'purchaseRate'|'freshness'|'sources'>>`; `capturedLessRefunds(capturedMinor:string,refundedMinor:string):string`. These TS readers run only inside the authorised server request context, never as browser-callable actions.

- [ ] Verify exact money beyond JS safe integers:

```js
import { capturedLessRefunds } from "../../src/lib/admin/reports/metrics.ts";
test("minor-unit arithmetic retains exact integer values",()=>{
  assert.equal(capturedLessRefunds("9007199254740993","2"),"9007199254740991");
});
```

- [ ] Aggregate one verified payment identity once regardless of event delivery/reconciliation count. Count paid orders and purchasing accounts distinctly; multiple successful payments remain multiple payments with any anomaly disclosed. Include only succeeded refund amounts, distinguish partial/full and disclose pending/failed/unknown counts. Report formal dispute open/won/lost/unknown counts separately; an inquiry is not a formal dispute and a dispute is not automatically a refund. Browser success and exported analytics never create money. Preserve verified legacy/unattributed totals with explicit provenance/exceptions; no inferred historic campaign.
- [ ] Use bounded keyset fact batches of at most 1,000 within the query deadline and an aggregate request budget of 20,000 facts. Return `FactSet.complete=false` with reason if exhausted; never return a partial array as a complete result. Full SQL summary aggregates remain independent from the bounded conversion join. Include complete source watermarks and fixture cases beyond both batch/budget limits.
- [ ] Add indexes for actual account/mode/currency/time fact predicates and campaign/visit attribution joins after inspecting the integrated Phase 3 schema. Capture bounded local `EXPLAIN (ANALYZE, BUFFERS)` evidence on representative fixtures; use fixed SQL, statement timeouts and a constrained server connection pool. Do not copy raw production customer rows into performance fixtures.
- [ ] Partition provider account, test/live and currency; never sum unlike currencies. Query half-open `[from,to)` instants derived from the verified reporting timezone. Activity basis uses capture/refund/dispute occurrence in that period; purchase-cohort basis selects captured orders in the period and displays later lifecycle facts as of a fixed timestamp. Label captured less successful refunds precisely; do not call it profit/payout or subtract disputes twice. Integer strings/BigInt persist through SQL/DTOs.
- [ ] Raw bounded facts and order/visit identities are accessible only to the authorised server reporting path; there is no public fact RPC. Only the registered server principal may consume the current authenticated ticket, within a bounded transaction, and invoke fixed functions with its trusted context. Private core functions themselves have no browser/server-principal direct EXECUTE grants; the ticket wrapper dispatches the allowlisted reads. Keep finance/nonfinance assertions separate. Test pending/failed refunds, out-of-order reconciliation, duplicate captures, multiple payments/order, repaired historical facts, disputes, timezone/DST boundaries and period versus cohort refunds in suite 53. Run ledger/metrics tests and Phase 3 financial suites; commit `feat: report verified campaign financial facts`.

## Task 21: Join the observed cohort and isolate authorised report caches

**Depends on:** 19–20. **Owns:** A16/A17/A18, Review Focus 3/4.

**Files:** Create cache migration/suite 54, reports `{cohort,cache,service}.ts`, `WEB/tests/admin/report-cohort.test.mjs`, `WEB/tests/admin/report-cache.test.mjs`; extend reporting actions/decoders/redaction.

**Interfaces:** `matchObservedCohort(input:{cohort:Cohort;checkouts:FactSet<CheckoutFact>;payments:FactSet<VerifiedFact>|null;asOf:string}):CohortMatch`; `conversionRate(numerator:number,denominator:number,complete:boolean,provisional:boolean):Rate`; `getPerformanceReport(query:ReportQuery):Promise<Result<ReportResult<PerformanceDTO[]>>>`; `getFinanceReport(query:FinanceQuery):Promise<Result<ReportResult<FinanceReportDTO>>>`. Private aggregate-only `campaign_report_cache` stores capability class/scope/environment/query/definition/policy/source-as-of key and 5-minute expiry. `report_cache_get/put` assert current authority and scope before returning any payload through Task 3's ticket wrapper.

- [ ] Add the incomplete-denominator test:

```js
import { conversionRate } from "../../src/lib/admin/reports/cohort.ts";
test("independent or incomplete totals cannot become a conversion rate",()=>{
  assert.equal(conversionRate(3,2,false,false).value,null);
  assert.equal(conversionRate(3,2,true,false).value,null);
  assert.equal(conversionRate(0,0,true,false).value,null);
  assert.equal(conversionRate(1,2,true,false).value,0.5);
});
```

- [ ] Build denominator from the actual complete observed acquisition cohort; intersect checkout visit references, then verified payment/order bindings from that same cohort. Count a visit at most once per metric. Purchase conversion requires capture within seven days of linked original checkout creation. Recent cohorts are provisional; late payments remain financial totals but do not retroactively satisfy the window. Missing IDs, mismatched environment/definition, truncation or incomplete fact retrieval produces an unavailable ratio with reason, not zero/clamping. Unmatched orders remain in financial totals and disclosed attribution coverage.
- [ ] Keep performance paths free of payment reads and purchase-derived counts/rates; their checkout-rate join uses checkout facts only, `payments:null` and `purchaseVisits:null`. Distinguish destination-observed visits from acquisition denominator explicitly. Finance paths may perform the separate payment join after finance permission and require `purchaseComplete`. Return a compatible summary plus campaign breakdown, reconciling attributed/legacy/unattributed order counts to the same scope when no campaign filter is selected. Financial ledger totals remain available if optional behavioural measurement is disabled/unavailable; only joined rates become unavailable. Show behavioural and ledger/checkout watermarks independently.
- [ ] Recheck authority before cache read/return and regenerate scope keys on grant changes. Never share finance/performance payloads or keys; do not persist cohort visit IDs in aggregate caches. Source outages may return an explicitly stale still-authorised aggregate, with as-of/definitions, otherwise unavailable. Revocation denies cached values immediately; the final request authorisation prevents an in-flight refresh returning values after observed revocation. Perform provider queries outside database transactions/locks.
- [ ] Test same visit across campaigns, repeated actions, lost browser observations, unmatched/late captures, seven-day boundary, provisional maturity, incomplete ledger pages, stale sources, two staff scopes and grant revocation. Suite 54 verifies direct cache access and disabled-console denial. Run cohort/cache tests and suite 54; commit `feat: compute matched campaign conversion with private caches`.

## Task 22: Deliver functional reports and explicit owner grant controls

**Depends on:** 21. **Owns:** A2/A16/A17/A18, Review Focus 4.

**Files:** Create reporting components `{ReportFilters,PerformanceReport,FinanceReport,ReportingGrants}.tsx`, routes `WEB/src/app/admin/reports/{campaigns,finance}/page.tsx`, `WEB/tests/e2e/admin-campaign-reports.spec.ts`, `WEB/tests/e2e/admin-report-permissions.spec.ts`; modify `AdminShell.tsx`, `AdminTeam.tsx` and reporting actions/redaction.

**Interfaces:** Browser actions expose only `getPerformanceReport`, `getFinanceReport`, current report capability context and `setReportingGrant`. `ReportFilters` accepts a validated `ReportQuery`/`FinanceQuery` and emits a new validated query, never provider SQL. `ReportingGrants` consumes only explicit capability grants and the existing unambiguous Team user identity.

- [ ] Add a performance-only response test using the real authenticated route/action:

```ts
const payload=JSON.stringify(performanceResponse);
for (const forbidden of ["capturedMinor","refundedMinor","paidOrders",
  "payments","purchasingAccounts","purchaseRate","disputedMinor"]) {
  expect(payload).not.toContain(`"${forbidden}"`);
}
```

- [ ] Exercise an owner grant, a performance-only staff member, a finance-only staff member, unrelated campaign/support staff and immediate revocation. Inspect HTML/RSC/action responses, query errors and warmed-cache responses, not only hidden widgets. A finance read grant permits neither refunds/support repairs nor campaign publication. Owner explicitly confirms the exact Team target, capability and reason; show audit history for grant/revoke.
- [ ] Performance page shows visits, events/actions, checkout starts/rate and coverage. Finance page adds verified sales/refunds/disputes, paid-order/payment/account counts, purchase conversion, currency/mode/account/time basis and attribution confidence. Show timezone, date interval, as-of/freshness, provisional/unknown/disabled/unavailable/stale states, definitions and exceptions. Recent maturity/unknown joins have explanatory text, never a misleading zero. Preserve filter state and accessibility/focus; visual polish remains a later UI pass.
- [ ] Ensure private routes do not initialise analytics/replay; no raw person/event/customer export or arbitrary drilldown. Run both report browser specs, existing admin privacy/Team suites and `npm run typecheck`; commit `feat: deliver permissioned campaign performance and finance reports`.

## Task 23: Verify cross-system privacy and failure contracts

**Depends on:** 22. **Owns:** A13–A18 integration evidence.

**Files:** Create `WEB/tests/e2e/campaign-reporting-recovery.spec.ts`, `WEB/tests/admin/report-integration.test.mjs`, `WEB/tests/fixtures/reporting-scenarios.mjs`; extend existing `analytics-contract.spec.ts`, `admin-privacy.spec.ts`, local owned fixtures and GATES/REHEARSAL.

**Interfaces:** Local-only scenario runner `runReportingScenario(name)` returns `{financialFacts:number;observedVisits:number;purchaseRate:number|null;coverage:string;checkoutCompleted:boolean;privateRequests:number}` for allowlisted synthetic scenarios. It uses real application adapters with a loopback provider, owned database and real local Auth; it cannot choose a hosted target. Production target probes are separate read-only release evidence.

- [ ] Add a critical-path failure assertion:

```js
import { runReportingScenario } from "../fixtures/reporting-scenarios.mjs";
const result=await runReportingScenario("analytics-timeout");
assert.equal(result.checkoutCompleted,true);
assert.equal(result.financialFacts,1);
assert.equal(result.purchaseRate,null);
```

- [ ] Run blocked storage/capture, dropped campaign page observation, forged browser purchase, original checkout reused from another campaign, delayed verified capture/refund, pending refund, duplicate webhook, formal dispute and partial provider/ledger cohort retrieval. Assert unchanged financial facts under browser/provider failures, one original attempt, distinct confidence and unavailable incomplete joins. Test currency/test-live/account isolation and timezone/DST transitions with fixed clocks.
- [ ] Instrument network/console/HTML/RSC with a working public analytics positive control, then prove admin/preview/report routes emit no analytics/replay and no financial/raw fact payload to ungranted staff. Verify revoked access during a stale-cache/provider timeout and master disable through direct commands. Redact fixture secrets; never use “no SDK request” as evidence if the positive control failed too.
- [ ] Run integration unit suite, recovery browser spec and relevant privacy/analytics suites against the actual owned target. Record faults/expected results with evidence rather than only screenshots. Commit `test: verify campaign reporting privacy and fault isolation`.

## Task 24: Configure retention, suppression and operational recovery

**Depends on:** 14 for campaign-only controls; 23 for full measurement/reporting controls. **Owns:** A12/A13/A18/A19 policy readiness.

**Files:** Create retention migration/suite 55, `WEB/scripts/phase4-retention.mjs`, `WEB/tests/admin/campaign-retention.test.mjs`; extend POLICY, `ops/ADMIN-REPORTING.md`, `ops/ADMIN-CAMPAIGNS.md`, GATES and prior-phase retention integration.

**Interfaces:** `RetentionRequest={policyVersion:string;dataClass:'draft_parts'|'diagnostics'|'visit_linkage'|'aggregate_cache';before:string;expectedCount:number;expectedDigest:string|null;operationId:string;apply:boolean}`; `parseRetentionRequest(input:unknown):RetentionRequest`. Restricted `campaign_retention_plan(p_request jsonb) RETURNS jsonb` and `campaign_retention_apply(p_request jsonb) RETURNS jsonb` return affected counts/digest and audited result; apply requires current owner approval, non-null digest and unchanged expected count/digest. CLI defaults to dry-run; measurement classes are added in suite/migration 55, campaign classes already installed in Task 14.

- [ ] Test that a purge cannot target an operative promise:

```js
import { parseRetentionRequest } from "../../scripts/phase4-retention.mjs";
test("retention has no class for deleting released promises",()=>{
  assert.throws(()=>parseRetentionRequest({dataClass:"published_members",
    policyVersion:"fixture",before:"2026-10-01T00:00:00Z",expectedCount:1,expectedDigest:"a".repeat(64),
    operationId:"f4000000-0000-4000-8000-000000000077",apply:true}));
});
```

- [ ] Record exact owner-approved schedules and lawful policy integration for each relevant data class before its activation. Do not invent a retention duration in code or interpret a ≤90-day query window as a deletion rule. Missing schedule blocks that collection/cleanup class, not safe unrelated drafts. Cache freshness is separate from retention. Use the existing Phase 3 financial/support/audit policy for its records; do not settle unresolved prior-phase periods here.
- [ ] Delete/redact only expired pseudonymous linkage and private parts/diagnostics/aggregate caches covered by the approved policy. Preserve purchase facts/access, first-publication provenance, original/extra operative references and minimum approved audit facts. Linkage purge changes future reporting coverage explicitly without changing financial truth. Apply bounded batches under narrow grants; dry-run/changed-count/unauthorised-class/active-reference checks fail before deletion.
- [ ] Document disabled/inspection/editing/publication stages, reporting/linkage/export gates, provider credential rotation without printing values, stale report diagnosis, refresh retry, source cutover and forward-compatible rollback. Schedule cleanup/export only with explicit release scope on an existing approved host; do not create a Codex automation as part of this task. Run suite 55, retention tests and a rollback-only purge rehearsal; commit `feat: enforce campaign measurement retention and recovery policy`.

## Task 25: Integrate migration replay and required CI checks

**Depends on:** 24; relevant 4A subset may run after 15. **Owns:** A1–A19 release verification.

**Files:** Modify `.github/workflows/web-ci.yml`, `WEB/package.json`, `WEB/scripts/test-phase4-db.mjs`, existing DB-runner include allowlist and browser fixture configuration only as needed; update GATES/BASELINE. Generate `WEB/src/lib/types/database.ts` from the integrated owned schema.

**Interfaces:** `npm run test:campaigns:unit` selects the named campaign/visit suites, `npm run test:reports:unit` selects named report suites, `npm run test:phase4:db` invokes the guarded owned runner over suites 40–55. Scripts fail on missing suites, unknown arguments, wrong project/ports or any failing assertion; no silent unmatched glob or “allow failure” for required checks.

- [ ] Validate the required suite set before executing it:

```js
const expected=Array.from({length:16},(_,i)=>40+i);
assert.deepEqual(selectedSuiteNumbers,expected);
assert.equal(new Set(selectedSuiteNumbers).size,16);
```

- [ ] Replay every integrated migration from an empty owned stack, verify fixture includes/grants/search paths/RLS/generated types and run earlier recipe/collection/support SQL suites alongside 40–55. For an independent 4A release, replay its exact applied subset through suite 50, including its installed campaign retention boundary, and record the remaining proposed migrations as unapplied. Never reset the user's default/linked stack or edit historical applied migrations.
- [ ] Run lint, typecheck, domain/data/admin tests, production build and required browser suites with real local Auth. Preserve the existing default suite and add a separately instrumented policy-enabled privacy/analytics profile with a valid positive control; a default build without provider configuration cannot prove suppression behaviour. Existing failures remain explicit and must be fixed or resolved within authorised scope before release; do not remove assertions to obtain green CI.
- [ ] Add CI steps with secure local key export and redacted output, isolated project lifecycle/cleanup and sufficient logs to identify the exact failed gate. CI success is evidence for the tested commit/environment only. Run the integrated commands below and reconcile every A gate; commit `ci: verify campaign management and reporting integration`.

## Task 26: Record real owner rehearsal, independent review and release readiness

**Depends on:** 25, target-stack access and required external configuration for the selected increment. **Owns:** A20 and final A1–A20 reconciliation.

**Files:** Create `WEB/scripts/phase4-evidence.mjs`, `WEB/tests/admin/campaign-evidence.test.mjs`; finalise `docs/implementation/admin-campaigns/{GATES,BASELINE,POLICY,REHEARSAL,RELEASE}.md`, `ops/ADMIN-CAMPAIGNS.md` and `ops/ADMIN-REPORTING.md`.

**Interfaces:** Evidence command accepts `--increment 4a|4b|full --source-sha <sha> --target <explicit-label> --input <sanitised-evidence-json>`; `evaluateReleaseEvidence(input)` returns `{ready:boolean;passed:string[];unmet:{gate:string;reason:string;nextAction:string}[]}`. Evidence records source/deployed SHA, migration set, source-ownership digest, public publication IDs, stages, policy/definition/retention versions, provider account/mode scope, actual owner journey and independent review status. Missing evidence stays unmet; a configured key or queued deployment cannot stand in for a real result.

- [ ] Add a readiness regression before the evidence implementation:

```js
import { evaluateReleaseEvidence } from "../../scripts/phase4-evidence.mjs";
test("green CI does not satisfy the actual target rehearsal",()=>{
  const result=evaluateReleaseEvidence({increment:"full",ciPassed:true,gates:{}});
  assert.equal(result.ready,false);
  assert.ok(result.unmet.some(g=>g.gate==="A20"));
});
```

- [ ] Implement strict evidence evaluation and run `node --test tests/admin/campaign-evidence.test.mjs`; a missing gate, mismatched target/SHA, incomplete review or unverified owner journey must remain unmet. CLI imports are side-effect free; only direct guarded invocation writes the sanitised report.

- [ ] Record the owner prepare/preview/approval/publication/addition/refresh journey, anonymous publication readback and permissions on the actual selected target stack. For 4B/full, use an authorised isolated provider test account/mode for a real linked checkout and verify captured facts, original attribution and the permitted report against that same order/cohort. Verify actual PostHog read/export environment and policy settings securely. Do not create real refunds, send emails/DMs or publish Instagram content as a test. If target access/configuration is missing, complete independent work and leave A20 precisely unmet.
- [ ] Complete Native implementation, then obtain the independent final review of the whole candidate, including migration/authority/finance/privacy and public compatibility. Use a separate reviewer when available; this does not authorise fresh implementation agents per task. Resolve findings, rerun affected checks and review material fixes. Independent 4A activation needs its own candidate review; later 4B review includes the shipped contract.
- [ ] Produce a concrete release/rollback package: ordered unapplied migrations, reviewed legacy cutover digest, secure prerequisite settings, staged owner-first activation, exact verification/readback, disable/recovery steps and a compatible public reader. Production rollout requires the user's separate release authority; do not merge/deploy/activate based only on this planning request. Preserve already committed public promises through rollback. Commit the named evidence script/test/docs with `docs: record campaign admin release readiness`; report local, committed, deployed and externally verified states separately.

## Acceptance coverage and evidence destinations

Every future gate starts **unmet** until implementation evidence is recorded in `docs/implementation/admin-campaigns/GATES.md`. Design documents and this plan do not count as runtime evidence. Commands below use the guarded runner convention; each named SQL suite and browser file must actually exist and run.

| Gate from design | Owning tasks | Decisive verification / evidence |
| --- | --- | --- |
| A1 — Source fidelity | 1, 5–6, 15 | Import manifest/config comparison; suite 42; `campaign-import.test.mjs`; BASELINE mappings/provenance. |
| A2 — Access separation | 3–6, 22 | Suites 40–43; inspection/permission browser specs; direct RPC/RLS denials. |
| A3 — Draft isolation | 6–9, 12 | Suites 43–46; editing/preview specs; anonymous HTML/metadata before and after private changes. |
| A4 — Existing free recipes | 8, 10 | Suite 45; eligibility tests; unchanged publication/free-slot/entitlement rows. |
| A5 — Promise and extras | 2, 4, 7, 10, 12 | Suites 41/44/47; promise tests; 13/101/1,001-reference synthetic loading and retained public groups. |
| A6 — Review binding | 9–10, 13 | Suites 46–47; changed-candidate/dependency tests; combined owner action with distinct trustworthy facts. |
| A7 — Concurrency | 7, 10, 15 | Suites 44/47; controlled independent-session races and whole-state assertions. |
| A8 — Dependency protection | 5, 10, 12, 15 | Suites 42/47/49; legacy/DB union and source-cutover/withdrawal barriers. |
| A9 — Public safety | 8, 12, 15 | Suite 49; warm-cache HTML/RSC/metadata/image test and all-unavailable stable route. |
| A10 — Durable publication | 10, 13, 15 | Suites 47–49; late rollback/uncertain commit/refresh-retry publication cardinality. |
| A11 — Links | 11, 16–17 | Suites 48/51; link unit/browser tests; all four placements and invalid/bare/legacy links. |
| A12 — Operator approval | 14, 24 | Suite 50; restricted principal/changed proposal/revoked approval cases and scoped retention authority. |
| A13 — Measurement lifecycle | 16, 19, 23–24 | Visit/measurement tests; actual capture positive control; storage/suppression/rollover/retention cases. |
| A14 — Checkout linkage | 17–18, 23 | Suites 51–52; original reservation/reuse/provider failure and verified recovery evidence. |
| A15 — Financial truth | 18, 20, 23 | Suites 52–53 plus Phase 3 reconciliation suites; client-forgery, duplicate/refund/dispute cases. |
| A16 — Report definitions | 2, 19–23 | Query/ledger/metrics/cohort tests; suite 53; controlled time/cohort/maturity/coverage fixtures. |
| A17 — Permission leakage | 3, 20–23 | Suites 40/53–54; permission/Team/privacy specs; DTO/cache/query/fact-boundary inspection. |
| A18 — Reporting resilience | 18–24 | Export/query/cache/integration tests; suites 52/54; timeout/stale/partial/disabled/true-empty outcomes. |
| A19 — Cutover and rollback | 5, 12, 15, 24–26 | Suites 42/49; database-owned no-fallback test; compatible-reader rollback rehearsal. |
| A20 — Real integration rehearsal | 15, 26 | Sanitised owner/anonymous/provider/report evidence tied to actual target/SHA/IDs in REHEARSAL. |

## Design-section crosswalk

| Design sections | Implementation tasks |
| --- | --- |
| 1 Purpose; 2 Decisions; 3 Design ledger | 1–2, 15, 26 — scope, constraints and acceptance. |
| 4 Existing repository; 5 Approach | 1, 5, 12, 15, 25 — baseline/increments/integration. |
| 6 Identity/promise; 7 Destinations | 2, 4, 6–7, 11–13, 22 — records and functional interactions. |
| 8 Availability; 9 Links; 10 Readiness | 8–12, 16–17 — live eligibility, safe links and exact review. |
| 11 Publication; 12 Permissions | 3–4, 9–10, 13, 20–22 — atomicity and current authority. |
| 13 Integration; 14 Data; 15 Agents | 4–5, 10, 14, 17–18, 20, 24 — shared invariants and restricted execution. |
| 16 Attribution; 17 Definitions | 16–21, 23 — original-attempt linkage and verified cohorts/facts. |
| 18 Reporting architecture/privacy | 3, 18–24 — fixed server reads, cache separation, suppression and retention. |
| 19 Import; 20 Recovery | 5, 10–15, 18, 21, 23–24 — provenance/cutover/fault recovery. |
| 21 Activation/rollback; 22 Verification; 23 Review | 15, 24–26 — required checks, target rehearsal, independent review and release package. |

## Integrated verification commands

These are execution instructions for the future implementation, **not checks claimed to have run while writing this plan**. First establish `PHASE4_TEST_ROOT` using Task 1; do not substitute a production connection or the user's default local stack. Secure test/provider settings are supplied by the fixture/release environment and are never echoed.

```sh
cd /Users/pratik.nandoskar/.codex/worktrees/admin-recipe-design/my-curated-haven-web/my-curated-haven-web
npm run lint
npm run typecheck
npm run test:campaigns:unit
npm run test:reports:unit
npm run test:data:unit
npm run test:admin:unit
npm run test:phase4:db -- --workdir "$PHASE4_TEST_ROOT"
npm run build
npm run test:e2e
```

Task 25 also runs the earlier-phase database runner and required existing homepage/Phase 10 checks already included by `npm run verify`; do not narrow CI to Phase 4 alone. Run instrumented privacy/analytics/browser checks using the separate verified profile, then Task 15's controlled concurrency scenarios and Task 26's actual target rehearsal. Repeat only affected checks after fixes, then the required candidate suite; record exact exit results/environment/SHA. A local fixture pass cannot establish production readiness by itself.

## Plan review and handoff

Before considering this document ready: verify all 26 tasks have dependencies, files, interfaces, concrete steps and named checks; every A1–A20 gate and all 23 design sections are mapped; migration/suite ranges do not collide; code fragments parse; links resolve; no undefined deferred interface or generic placeholder remains. Review the five input classes in Review Focus explicitly.

Document verification on 2026-10-07 passed: 26 sequential task contracts, all 20 exact design gate titles, all 23 design sections, 16 unique proposed migration/suite pairs without repository/prior-plan collisions, exact quoted constraints, working local document links and consistent Markdown tables/fences. All 26 JavaScript/TypeScript blocks passed syntax checks; the three shared contract modules typechecked against the inspected repository types through an in-memory compiler overlay. These are plan checks only; no proposed SQL migration, runtime workflow, provider request or product test was executed.

The next action after this document is owner review of the written implementation plan. Native execution and independent final review remain selected; there is no new execution-method decision. Implementation must begin with the Task 1 baseline and `$unlazy` acceptance ledger, then proceed through authorised tasks and their evidence gates. Report missing Phase 2/3 integration, policy/retention choices or target credentials as the specific unmet gate when relevant, while finishing independent work. No campaign, report or production rollout is implemented by creating this plan.
