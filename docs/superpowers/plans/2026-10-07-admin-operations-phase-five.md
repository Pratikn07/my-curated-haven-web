# Admin Overview, Operations and Governance Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the owner and explicitly authorised admins one private place to find outstanding work, inspect trustworthy administrative history and operational evidence, and open the existing workflow responsible for action.

**Architecture:** Extend the native console with permission-filtered source adapters and a minimal attention/history read model in 5A. In 5B, add restricted check producers, durable technical receipts and observations, and recovery/deployment/governance evidence. Source modules retain business definitions, approvals, corrective actions and immutable original records; a check never becomes a business writer.

**Tech Stack:** Existing Node 24/npm 11, Next.js 16/React 19, TypeScript, Supabase Auth/PostgreSQL, `pg`, pgTAP, Node test runner, Playwright and GitHub Actions. Use Node's cryptography for Ed25519 and one narrowly justified new dependency, `jose`, for verified OIDC/JWKS handling. Preserve existing provider versions and the lockfile; no new admin framework, monitoring vendor or queue service.

**Spec:** [Phase 5 design](../specs/2026-10-07-admin-operations-phase-five-design.md), committed as `a84fd03`. The owner's request to write this plan approves progression from design to planning. This document does not implement, activate or deploy the feature.

## Global Constraints

The following requirements are copied verbatim from the approved design and apply to every task:

- “Read-only monitoring never changes recipe content, publications, offers, orders, money, entitlements, support-case resolution or staff permissions.”
- “Only fresh, complete, correctly scoped source evidence may resolve an item.”
- “Viewing an item does not acknowledge it.”
- “Opening a corrective workflow does not resolve it.”
- “Filter authority before aggregating, caching or returning data.”
- “No real account identity is seeded by a migration.”
- “Machine observation is a distinct authority from human approval.”
- “Never make an old artifact fresh by uploading it today.”
- “Business definitions stay in their source module.”
- “A green build, source-only workflow definition, local backup schedule or written test plan cannot replace this evidence.”

No acknowledgement, assignment, dismiss/snooze/close, notification delivery, refund/repair/publish shortcut, restore/download button, settings editor or secret-editing flow belongs in this release. Final visual styling remains separate; implement usable functional destinations using the current admin components and accessibility patterns.

Before the first implementation code edit, invoke `$unlazy`, read the nearest `AGENTS.md`, create the A1–A20 acceptance ledger and preserve unrelated changes. **Native remains selected:** use `superpowers:executing-plans`, implement tasks in this session and obtain an independent final review of the candidate. Do not switch to fresh implementation agents per task or re-ask the execution-method question. A separately released 5A candidate also receives its own final review.

## Review Focus

These five easy-to-miss input classes have explicit tests in their owning tasks:

1. A complete read for one staff member omits records outside their authority: it must not resolve hidden conditions or leak hidden counts. Tasks 3, 4 and 9.
2. An old healthy scan finishes after a newer failure or deployment: retain historical evidence without replacing the current target result. Tasks 4, 13 and 19.
3. The Mac reconnects and uploads yesterday's valid backup today: retain the artifact's real age and partial storage coverage. Tasks 17 and 18.
4. A refresh transport response is lost after admission: the original operation/receipt is recovered, not duplicated; cached receipts still require current authority. Tasks 9 and 14.
5. A module is absent, a scan has a second page, or one provider is down: retain partial/unknown coverage and existing problems rather than reporting zero or global health. Tasks 5–9, 13 and 16.

---

## Baseline, dependencies and delivery order

- Plan date: 2026-10-07, America/Los_Angeles.
- Worktree: `/Users/pratik.nandoskar/.codex/worktrees/admin-recipe-design/my-curated-haven-web`, branch `codex/admin-recipe-workspace-design`.
- The design is at `a84fd03`. During this planning turn HEAD advanced independently to `45ca05941efd9ce7bfc0e897e0b9048b00b22750`, adding transport retries for ledger-protected admin RPCs. The worktree was clean after that change. Preserve it and recheck the candidate before execution/commit.
- Current source implements Recipes and Team admin routes, current-membership/MFA checks, recipe history and the hourly/public deployment smoke workflow. Phase 2–4 documents are plans, not evidence those admin modules have shipped.
- The existing smoke workflow requests `contents: read`, not OIDC issuance. Its source schedule is `17 * * * *`; it filters successful deployment events to `Production`. Remote enabled state, actual runs, installed backup job, current artifacts and production configuration were not checked while writing this plan.
- The backup runbook describes a daily local Mac job and a historical restore. Its image mirror uses `recipe-images`; Phase 1 approved assets use `recipe-previews`. Do not claim complete coverage until the actual asset inventory is reconciled.

Dependencies: [Phase 2 collections](2026-10-07-admin-collections-phase-two.md), [Phase 3 support](2026-10-07-admin-customer-support-phase-three.md), [Phase 4 campaigns/reporting](2026-10-07-admin-campaigns-phase-four.md). Integrate the shared `admin_console_settings.console_enabled` foundation from Phase 3 before activating any Phase 5 private path. The existing server `ADMIN_CONSOLE_ENABLED` remains an additional web gate. Do not build a competing master switch or tie support/operations authority to recipe publication stage.

This is one coupled plan: the check layer maintains the same evidence/read model used by the overview. It has two independently useful releases, with source-specific integrations gated on their actual dependencies.

| Increment | Tasks | Exit |
| --- | --- | --- |
| 5A — Attention and history | 1–11, applicable privacy/retention work in 20, and candidate checks in 21–22 | Owner/narrowed-admin overview, truthful coverage, source-confirmed lifecycle and private history/navigation for the declared integrated sources. |
| 5B — Checks and governance | 12–20, then 21–22 | Actual scheduled/manual observations, liveness, backup/recovery/deployment and access/report evidence for the approved scope. |
| Full Phase 5 | All tasks and every A1–A20 gate | Verified cross-module coverage, actual-target rehearsal and reviewed release evidence; no missing gate hidden by a successful smaller slice. |

If only Recipes are available, implement/ship an explicitly labelled limited 5A after the common authority prerequisite. Keep absent adapters disabled and their integration gates unmet. Full Phase 5 requires the corresponding earlier modules; never create temporary support, entitlement or reporting writers to fill the overview.

## Planning acceptance ledger

These gates apply to this document, not product runtime:

| Gate | Required plan outcome |
| --- | --- |
| P1 | Preserve the accepted 5A/5B split and Native method. |
| P2 | Identify existing source, proposed files/migrations and real dependencies. |
| P3 | Define exact human/machine authority, data/adapter contracts and lifecycle ordering. |
| P4 | Give every task a concrete deliverable, interfaces, executable verification and commit boundary. |
| P5 | Specify scheduling, refresh, recovery, deployment and governance without business writes. |
| P6 | Cover privacy, retention, query budgets, failure states, disable and rollback. |
| P7 | Map all design sections and A1–A20 to tasks and later evidence. |
| P8 | Separate plan checks from local implementation, deployment and external verification. |

## File responsibilities

`WEB` means the nested `my-curated-haven-web` directory. Expand it in commands. Other paths below begin at the repository root. Braces name individual planned files; do not create unused scaffolding. New paths are proposals, not claims they exist. Keep pure modules importable by Node strip-types tests; put secrets, `server-only` imports and authenticated clients in separate server modules.

| Area | Files and responsibility |
| --- | --- |
| Contracts and pure logic | `WEB/src/lib/admin/operations/{contracts,decode,query,classification,lifecycle,freshness,cursor,destinations}.ts` — safe DTOs, bounds, deterministic conditions and cursor validation. |
| Private read services | `WEB/src/lib/admin/operations/{context,repository,service,history,cache,actions}.ts` — current authority, strict RPC decoding, scoped queries and human refresh commands. |
| Source adapters | `WEB/src/lib/admin/operations/sources/{registry,recipes,collections,support,campaigns,reports,team,deployment,recovery}.ts` — normalise existing source semantics, never perform source corrections. |
| Producer/execution boundary | `WEB/src/lib/admin/operations/{producer-claims,producer-token,producer-auth,producer-envelope,ingest,jobs,collector,machine-db}.ts` — verified identity, bounded admission, restricted PostgreSQL principals and durable technical work. |
| Recovery/governance logic | `WEB/src/lib/admin/operations/{backup-manifest,recovery,deployment,governance,retention}.ts` — minimal signed evidence, independent recovery axes and existing permissioned summaries. |
| Functional components | `WEB/src/components/admin/operations/{Overview,AttentionList,ItemEvidence,SourceCoverage,History,Health,Recovery,Governance}.tsx` — private labelled states and original-workflow navigation. |
| Human destinations | `/admin/overview`, `/admin/history`, `/admin/operations/items/[itemId]`, `/admin/operations/health`, `/admin/operations/recovery`; current `/admin`, layout/shell and Team integration. |
| Machine ingress | `WEB/src/app/api/internal/operations/{runs,batches,complete,tick,backup,restore,deployment}/route.ts` — separate authenticated fixed operations, no general SQL/URL gateway or private readback. |
| CLI/helpers | `WEB/scripts/{phase5-target-guard,test-phase5-db,operations-collect,operations-public-report,operations-concurrency,operations-retention,phase5-evidence}.mjs`; `ops/{backup-evidence,restore-evidence}.mjs`. |
| Tests | `WEB/tests/fixtures/operations.mjs`, `WEB/tests/admin/ops-*.test.mjs`, `WEB/tests/e2e/admin-operations-fixtures.ts`, `WEB/tests/e2e/admin-operations-*.spec.ts`, `supabase/test-fixtures/admin-operations.sql` and SQL suites below. |
| Docs/CI | `docs/implementation/admin-operations/{BASELINE,GATES,CONFIGURATION,REHEARSAL,RELEASE}.md`, `ops/ADMIN-OPERATIONS.md`; existing web CI/public-smoke and new private scheduler workflow. |

Only assigned tasks modify current shared files: admin contracts/context/RPC/actions/shell/Team, generated `WEB/src/lib/types/database.ts`, analytics exclusion tests, package/lockfile, local DB runner and CI. Preserve unrelated recipe-editor, authenticator, homepage, commerce and Instagram changes.

## Ordered migrations and SQL suites

All are proposed additive migrations after the Phase 4 `2026100702*` range. Recheck collisions and actual prerequisite migrations before creating them. Do not rewrite applied historical files. Bootstrap no real owner/producer identity and store no credential in SQL.

| Task | Migration under `supabase/migrations/` | Suite under `supabase/tests/database/` |
| --- | --- | --- |
| 3 | `20261007030100_admin_ops_authority.sql` | `60_admin_ops_authority.test.sql` |
| 4 | `20261007030200_admin_ops_model.sql` | `61_admin_ops_lifecycle.test.sql` |
| 5 | `20261007030300_admin_ops_recipe_collection_sources.sql` | `62_admin_ops_recipe_collection.test.sql` |
| 6 | `20261007030400_admin_ops_support_source.sql` | `63_admin_ops_support.test.sql` |
| 7 | `20261007030500_admin_ops_campaign_report_sources.sql` | `64_admin_ops_campaign_report.test.sql` |
| 8 | `20261007030600_admin_ops_history.sql` | `65_admin_ops_history.test.sql` |
| 9 | `20261007030700_admin_ops_reads.sql` | `66_admin_ops_reads.test.sql` |
| 12 | `20261007030800_admin_ops_producers.sql` | `67_admin_ops_producers.test.sql` |
| 13 | `20261007030900_admin_ops_ingestion.sql` | `68_admin_ops_ingestion.test.sql` |
| 14 | `20261007031000_admin_ops_jobs.sql` | `69_admin_ops_jobs.test.sql` |
| 17 | `20261007031100_admin_ops_backup_evidence.sql` | `70_admin_ops_backup.test.sql` |
| 18 | `20261007031200_admin_ops_restore_evidence.sql` | `71_admin_ops_restore.test.sql` |
| 20 | `20261007031300_admin_ops_retention.sql` | `72_admin_ops_retention.test.sql` |

The existing `WEB/scripts/test-admin-db.mjs` bundles Phase 1 fixtures but selects only suites 10–16 by default. Task 1 adds a Phase 5 wrapper with an explicit 60–72 allowlist and both fixture includes; it must not silently skip new tests or execute against a remote DB. Backup and restore use separate forward migrations: Task 18 cannot edit the migration already exercised by Task 17.

All Phase 5 migrations must replay when a planned module is absent. Recipe reads use current source directly. Other source wrappers resolve fixed registered bridge signatures: `private.collection_ops_snapshot(jsonb,text)` (Task 5), `private.support_ops_snapshot(jsonb,text)` (Task 6), `private.campaign_ops_snapshot(jsonb,text)` and `private.report_ops_status(jsonb,text)` (Task 7). Those tasks own creation of the real bridge once its corresponding module schema is integrated. Missing bridge means not integrated/unavailable and leaves that task's full integration gate unmet. The fixed wrapper must not unconditionally compile a reference to an absent table/function or silently activate merely because a similarly named table exists.

```sql
-- Inside the fixed collection wrapper, after authority/stage validation.
if to_regprocedure('private.collection_ops_snapshot(jsonb,text)') is null then
  return jsonb_build_object('rows', '[]'::jsonb, 'nextCursor', null,
    'coverage', 'unavailable', 'watermark', null);
end if;
execute 'select private.collection_ops_snapshot($1,$2)'
  into v_result using p_scope, p_cursor;
```

Bridge invocation strings are fixed reviewed constants, never client input. Installing a bridge after a limited 5A release uses a new forward migration and source-registration verification; it does not edit/replay an applied file. Registry activation requires the reviewed version/signature and permission mapping, not function presence alone.

## Database record contracts

Keep these records in `private` with deny-by-default privileges and no public/raw PostgREST exposure:

| Record group | Fields/constraints that later tasks rely on |
| --- | --- |
| `ops_settings`, `ops_grants` | Singleton stage; policy version/readiness defaults unset/false; exact actor/capability/expiry; current grant version; grant/revoke audit/operation fingerprint. |
| `ops_sources`, `ops_checks` | Source/definition/permission mapping, target/environment, expected scope, cadence/max age, integrated/enabled flags and actual bridge version. |
| `ops_scans`, `ops_observations` | UUID, scope/definition/generation, start/finish/watermark, manifest completion, safe findings and immutable observation/digest provenance; no raw provider JSON. |
| `ops_conditions`, `ops_occurrences` | Opaque IDs; unique logical environment/source/account-mode/subject/condition key; active occurrence; last confirmed category/evidence; resolution proof and recurrence linkage. Viewer identity is not part of the logical condition key. |
| `ops_producers`, `ops_producer_assignments` | Verified identity/public-key reference, kind/check/target allowlist, expiry/revocation, registered generation/sequence; one active authoritative assignment per check/target. |
| `ops_runs`, `ops_batches` | Immutable operation/external-run fingerprint, check/target/definition, requester or producer, generation, manifest, unique run/batch/digest and timing/state. Task 14 adds lease/continuation/requester receipts without replacing Task 13's run ledger. |
| `ops_cursors` and optional aggregate cache | Actor/current-authority/query-hash/source-watermark binding and short expiry; no stored raw search/free text or shared private result. |
| `ops_backup_evidence`, `ops_restore_evidence` | Minimal signed artifact digests/coverage, actual completion and receipt times; rehearsal scope/provenance/checks/omissions and measured duration. |

Use composite indexes for logical condition keys, source/scope/generation lookup and stable time/source/event paging. No cascade from technical cleanup into source records. Extend the existing audit action allowlist deliberately for operations/grants where needed; never disguise an operations event as recipe publication. Retention readiness is enforced from the first persistence task, with explicit ephemeral fixture policy only on the isolated test stack; Task 20 adds reviewed production policy/purge handling.

## Shared contracts and bounds

Task 2 creates these contracts. UUIDs, instants and decimal generation strings are validated at the wire boundary; decimal strings preserve PostgreSQL bigint precision. Source IDs and condition codes are checked against the registry. Backend scopes never come from posted actors, grants or arbitrary query JSON.

```ts
export type SourceId = "recipes" | "collections" | "support" | "campaigns"
  | "reports" | "public" | "deployment" | "recovery" | "team";
export type Category = "urgent" | "attention" | "routine" | "verification";
export type Coverage = "complete" | "partial" | "unavailable";
export type Freshness = "current" | "stale" | "not_checked";
export type HealthResult = "pass" | "degraded" | "fail" | "unknown";
export type IntegrationState = "active" | "disabled" | "not_integrated";
export type OpsCapability = "ops.overview.read" | "ops.history.read"
  | "ops.health.read" | "ops.recovery.read" | "ops.check.run";
export type SourceScope = {
  source: SourceId; environment: string; accountMode: string | null;
  scopeId: string; authorityVersion: string; definitionVersion: string;
};
export type Evidence = {
  id: string; observedAt: string; receivedAt: string; sourceWatermark: string | null;
  sourceVerifiedAt: string | null;
  generation: string; coverage: Coverage; producerId: string | null;
  deploymentId: string | null; definitionVersion: string;
};
export type Finding = {
  conditionId: string; subjectId: string; conditionCode: string;
  category: Category; state: "active" | "resolved";
  title: string; reasonCode: string; deadlineAt: string | null;
  sourceEventId: string | null;
};
export type Scan = {
  id: string; scope: SourceScope; evidence: Evidence; findings: Finding[];
  nextCursor: string | null; manifestComplete: boolean;
};
export type Occurrence = {
  itemId: string; occurrenceId: string; conditionId: string; scope: SourceScope;
  category: Category; state: "active" | "resolved";
  firstObservedHere: string; lastConfirmedAt: string;
  evidenceId: string; generation: string; freshness: Freshness;
  resolvedByEvidenceId: string | null;
};
export type Page<T> = {
  rows: T[]; nextCursor: string | null; coverage: Coverage; watermark: string | null;
};
export type OpsQuery = {
  sources: SourceId[]; categories: Category[]; q: string;
  cursor: string | null; pageSize: number;
};
export type HistoryQuery = {
  sources: SourceId[]; from: string; to: string; cursor: string | null;
  pageSize: number; action: string | null; result: string | null;
  targetId: string | null; operationId: string | null;
};
export type HistoryEvent = {
  id: string; source: SourceId; occurredAt: string; recordedAt: string;
  action: string; result: string; targetId: string | null;
  authoriserLabel: string | null; executorLabel: string | null;
  reasonCode: string | null; operationId: string | null;
};
export type HealthCheck = {
  checkId: string; source: SourceId; result: HealthResult;
  freshness: Freshness; integration: IntegrationState; coverage: Coverage;
  evidence: Evidence | null; purpose: string;
};
export type JobReceipt = {
  operationId: string; runId: string; checkId: string;
  state: "queued" | "running" | "complete" | "partial" | "failed" | "unknown" | "disabled";
  generation: string; requestedAt: string; completedAt: string | null;
};
export type RefreshCommand = { operationId: string; checkId: string };
export type VerifiedProducer = {
  producerId: string; generation: string; kind: "github_public" | "github_scheduler" | "backup";
  environment: string; allowedCheckIds: string[]; externalRunId: string;
};
export type SourceAdapter = {
  describeSource(): { id: SourceId; definitionVersion: string };
  listAttention(scope: SourceScope, query: OpsQuery): Promise<Page<Finding>>;
  readHealth(scope: SourceScope): Promise<HealthCheck[]>;
  readHistory(scope: SourceScope, query: HistoryQuery): Promise<Page<HistoryEvent>>;
};
export type SourceRead = (
  source: SourceId, kind: "attention" | "health" | "history",
  scope: SourceScope, query: OpsQuery | HistoryQuery | null
) => Promise<unknown>;
export type GithubProducerPolicy = {
  repositoryId: string; workflowRef: string; audience: string;
  allowedRefs: string[]; allowedSubjects: string[]; allowedEvents: string[];
  environment: string | null; kind: "github_public" | "github_scheduler";
};
```

Task 2 also defines `ItemDetail` as `{ occurrence: Occurrence | null; finding: Finding; evidence: Evidence[]; destination: string | null }` and `Overview` as `{ items: Page<ItemDetail>; counts: Record<Category, number> | null; sources: HealthCheck[] }`. Counts are null when authoritative coverage cannot establish the requested total. Every DTO is minimal and permission-filtered. Machine collection uses separate fixed DB functions, never this human adapter as an impersonated owner.

When operational persistence is not activated, source-derived inspection returns `occurrence: null`, current permitted source facts and the original-workflow destination only. Do not display an invented first-observed time, recurrence, retained item-history link or synthetic persisted item ID. Durable item detail is available only for actual stored occurrences. Full 5A occurrence/history acceptance requires the adopted retention policy and activated minimal read model; this limited inspection fallback is labelled accordingly.

Source adapter factories receive `rpc: SourceRead`; their normalisers/registry contain no `server-only` import or environment access. Task 9 supplies the server-only authenticated implementation. This preserves pure Node tests without alias/secret workarounds. Source bridge signatures above are fully qualified with `p_scope jsonb,p_cursor text` and return safe JSON. Browser specs import `test`/`expect` from Playwright and reuse `createAdminFixture`/`fixture.login(page,"aal2")` from the existing guarded fixture; add operations-specific seed/cleanup in `tests/e2e/admin-operations-fixtures.ts` under the same loopback guard, never broadening it to production.

| Default | Exact initial value/meaning |
| --- | --- |
| Page size/history span | Default 25, maximum 100; history custom interval at most 90 days; 7/30/90-day presets; UTC storage and displayed configured timezone. |
| Cadence/freshness | Hourly checks; stale after three hours without completed evidence. Deployment triggers and manual refresh supplement this cadence. |
| Backup/review | Daily local target; 36-hour receipt-age verification threshold; separate 90-day restore and access-review reminders. |
| Formal dispute triage | Actual deadline within 24 hours or overdue is urgent; unknown deadline is verification. No new provider deadline or refund policy. |
| Refresh budget | Three new admissions per actor/source in ten minutes; share active run for identical check/target/definition. |
| Worker/ingress budget | 30 seconds per private batch, five seconds per DB statement; at most 100 observations and 256 KiB per ingress batch. |
| Identity/time | Five-minute fresh-check clock-skew limit; historical backup completion time stays historical. |
| Cache | Optional aggregate cache at most five minutes; underlying watermark unchanged; authority checked before every return. |

Retention durations are intentionally not invented. Task 20 makes explicit adopted policies an activation prerequisite for new persistence. No retention setting may expire purchased access or erase active source obligations.

Server/operator configuration has exact responsibilities: `OPS_GATEWAY_DATABASE_URL` connects only as the restricted ingress gateway; `OPS_COLLECTOR_DATABASE_URL` only as the collector; `OPS_MAINTENANCE_DATABASE_URL` only from the controlled retention CLI. Keep all three server-only and distinct from commerce/service-role credentials. The local reporter uses `OPS_BACKUP_KEY_ID` and `OPS_BACKUP_SIGNING_KEY_FILE`; the signing key stays on the producer. Producer audience/repository/workflow/target policies live in the protected versioned registry, not caller-supplied settings. Missing configuration disables the affected source. Real values are securely provisioned only during an authorised activation, never written into this plan, fixtures or evidence.

## Task 1: Establish the execution baseline and local-only test guard

**Files:** Create `docs/implementation/admin-operations/{BASELINE,GATES,CONFIGURATION}.md`, `WEB/scripts/{phase5-target-guard,test-phase5-db}.mjs`, `WEB/tests/admin/ops-target-guard.test.mjs`, `supabase/test-fixtures/admin-operations.sql`. Read the linked plans, current migrations, `WEB/scripts/test-admin-db.mjs` and `WEB/playwright.config.ts`.

**Interfaces:** `assertPhase5LocalTarget({databaseUrl, appOrigin, projectId}): {databaseUrl, appOrigin, projectId}` accepts loopback-only fixtures and approved local project IDs. The DB wrapper takes explicit SQL suite basenames, expands both fixture includes in temporary files and invokes `supabase test db --local`; it never accepts a remote URL or arbitrary include.

- [ ] Record candidate SHA, dirty paths, integrated module/source versions, shared-gate availability and declared release scope. Initialise A1–A20 as unmet, with task/evidence references; record external state as unverified. Invoke `$unlazy` before implementing the guard.
- [ ] Add a failing local-target test:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { assertPhase5LocalTarget } from "../../scripts/phase5-target-guard.mjs";
test("rejects remote fixture targets", () => {
  assert.throws(() => assertPhase5LocalTarget({
    databaseUrl: "postgresql://fixture:fixture@db.example.test:5432/postgres",
    appOrigin: "http://127.0.0.1:3000", projectId: "mch-admin-recipe-test",
  }));
});
```

- [ ] Run `node --test tests/admin/ops-target-guard.test.mjs` from `WEB`; expect the missing guard to fail. Add explicit loopback hostname/protocol/project validation, reject credentials in app origins and redact DB errors. Use the existing local project allowlist; require valid decoded URL parsing, not substring matching.
- [ ] Bundle only suites 60–72 with the Phase 1/operations fixture includes; reject unresolved `\i`/`\ir`, path traversal and absent suites. Define explicit local owner/recipe-viewer/support-viewer subjects and an ephemeral fixture-only retention policy; simulate JWT/MFA only in these local tests. Run the guard tests; verify an unknown suite fails before invoking Supabase.
- [ ] Commit only these paths: `test: establish guarded phase five verification`.

## Task 2: Define strict contracts, queries, fixtures and destinations

**Files:** Create `WEB/src/lib/admin/operations/{contracts,decode,query,destinations}.ts`, `sources/registry.ts`, `WEB/tests/fixtures/operations.mjs`, `WEB/tests/admin/ops-contracts.test.mjs`.

**Interfaces:** Contracts above; `parseOpsQuery(URLSearchParams): Result<OpsQuery>`, `parseHistoryQuery(URLSearchParams): Result<HistoryQuery>`, `decodeScan(unknown): Scan`, `destinationFor(source: SourceId, subjectId: string): string | null`, `describeIntegration(source: SourceId, integrated: boolean): IntegrationState`. Reuse the existing `Result<T>` shape, not its permissive JSON casts. Registry entries include capabilities, condition-code allowlists, definition versions and integrated state.

Initial condition codes are explicit per source: recipe review/readiness/public-refresh/safety; collection review/dependency/refresh; support `binding_review`, `paid_unfulfilled`, `reconciliation_pending`, `support_open`, `refund_unknown`, `formal_dispute_deadline`; campaign dependency/safety/refresh; report query/export follow-up; public route failure; deployment revision mismatch; backup freshness/storage coverage/restore review; Team access review. Assign exact versioned enum values in the registry and test their corresponding source mappings. Unknown codes fail decoding rather than becoming arbitrary attention text.

- [ ] Add rejection tests before implementation:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { parseOpsQuery } from "../../src/lib/admin/operations/query.ts";
test("bounds inputs before querying", () => {
  assert.equal(parseOpsQuery(new URLSearchParams("pageSize=101")).ok, false);
  assert.equal(parseOpsQuery(new URLSearchParams("sources=unknown")).ok, false);
  assert.equal(parseOpsQuery(new URLSearchParams("actorId=forged")).ok, false);
});
```

- [ ] Run `node --experimental-strip-types --test tests/admin/ops-contracts.test.mjs`; expect failure until the pure modules exist.
- [ ] Implement exact-key schemas, UUID/instant/generation validation, bounded query text (200 characters), literal escaped search, allowed enums and safe internal destinations. Reject arbitrary URLs/redirects; unavailable source routes return null. Do not put emails/provider IDs into URLs.
- [ ] Define fixture builders `finding(overrides)`, `scan(overrides)`, `occurrence(overrides)`, `historyEvent(overrides)`, `backupManifest(overrides)`, `githubClaims(overrides)` and `githubPolicy(overrides)` using complete valid defaults and clearly synthetic IDs. Preserve explicit nulls and bigint generation strings. Test timezone/DST boundaries and a 90-day query limit without treating it as retention.
- [ ] Run the focused test and typecheck; commit `feat: define bounded operations contracts`.

## Task 3: Add current-authority operations gates

**Files:** Create migration/suite 60 from the migration table, `WEB/src/lib/admin/operations/context.ts`, `WEB/tests/admin/ops-context.test.mjs`. Modify shared admin contracts/context, shell eligibility and generated DB types only as needed.

**Interfaces:** `private.ops_assert(p_capability text, p_source text default null) RETURNS uuid`; `public.admin_ops_context() RETURNS jsonb`; owner Team-controlled `public.admin_ops_grant(p_command jsonb)`/`admin_ops_revoke(p_command jsonb)`. `getOperationsContext(): Promise<Result<{capabilities: OpsCapability[]; sources: SourceId[]; stage: "disabled" | "inspection" | "monitoring"; authorityVersion: string}>>`.

- [ ] Integrate the earlier shared-master foundation as a separately tracked prerequisite if absent. Add pgTAP cases for anonymous/`aal1`, owner, recipe-only staff, support-only staff, changed grants, expired grants, master/stage disable and protected owner. Test that a complete recipe-only read cannot access support counts.

```sql
-- Isolated fixture subject only; fixture setup supplies membership/inspection stage.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}', true);
select throws_like($$select public.admin_ops_context()$$,
  '%ADM_MFA_REQUIRED%', 'aal1 cannot read the private operations context');
```
- [ ] Run `node scripts/test-phase5-db.mjs 60_admin_ops_authority.test.sql`; expect missing operations functions to fail, on the guarded local stack only.
- [ ] Implement private settings (singleton, stage disabled, retention readiness false/policy null), exact capability grants and current membership/MFA/source checks. Fix search paths and revoke default function/table privileges. No public raw-table grants, JWT-role authority or seeded owner. Human grant/revoke requires current Team authority, exact confirmed target, reason, operation UUID/fingerprint and source audit.

```sql
-- Normative check at each human boundary, before returning cached data.
select private.ops_assert('ops.overview.read', 'recipes');
-- p_source is a registry ID; source authority is resolved in the database.
```

- [ ] Extend minimal shell eligibility without leaking module data at `aal1`; recipe stage disabled must not implicitly disable separately authorised operations/support. Revoke an actor between context and RPC and prove the later RPC denies it. Regenerate types after the migration exists.
- [ ] Run suite 60 and the focused context test; commit `feat: enforce operations capability and stage boundaries`.

## Task 4: Persist attention occurrences with authoritative resolution

**Files:** Create migration/suite 61, `WEB/src/lib/admin/operations/{classification,lifecycle,freshness}.ts`, `WEB/tests/admin/ops-lifecycle.test.mjs`.

**Interfaces:** `applyScan(previous: Occurrence[], scan: Scan, nowMs: number): Occurrence[]`; `classifyFinding(finding: Finding, nowMs: number): Category`; `freshnessAt(observedAt: string | null, nowMs: number, maxAgeMs: number): Freshness`. DB: `private.ops_apply_scan(p_scan_id uuid) RETURNS jsonb`, executable only inside trusted source/ingestion paths, never accepting posted arbitrary findings from a human.

- [ ] Add lifecycle regression tests:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { applyScan } from "../../src/lib/admin/operations/lifecycle.ts";
import { occurrence, scan } from "../fixtures/operations.mjs";
test("empty partial scan cannot resolve an active issue", () => {
  const old = occurrence({ state: "active" });
  const incomplete = scan({ findings: [], manifestComplete: false });
  assert.equal(applyScan([old], incomplete, Date.parse("2026-10-07T12:00:00Z"))[0].state, "active");
});
```

- [ ] Run `node --experimental-strip-types --test tests/admin/ops-lifecycle.test.mjs` and suite 61; expect missing reducer/schema failures.
- [ ] Create private `ops_sources`, `ops_checks`, `ops_scans`, `ops_observations`, `ops_conditions`, `ops_occurrences` and current projection indexes. Store scope/definition/generation/completion provenance. Group on environment/source/account-mode/subject/condition; use opaque stable item IDs and new occurrence IDs only after proven resolution. Keep source occurrence time separate from first observed here.
- [ ] Implement atomic complete-scan promotion, explicit resolution evidence, stale urgency retention and rule-version transition checks. Absence resolves only within the exact complete scope. Test older generations, changed definitions, revoked/partial viewers, recurrence, duplicate findings and big generation values. No code path for human dismiss/close.
- [ ] Run pure and SQL lifecycle tests; commit `feat: derive attention lifecycle from complete source evidence`.

## Task 5: Adapt recipe and collection attention safely

**Files:** Create migration/suite 62, `WEB/src/lib/admin/operations/sources/{recipes,collections}.ts`, `WEB/tests/admin/ops-recipe-collection.test.mjs`. Modify source registry and operations fixtures. Read current recipe readiness and integrated Phase 2 read contracts.

**Interfaces:** `createRecipeAdapter(rpc: SourceRead): SourceAdapter`, `createCollectionAdapter(rpc: SourceRead): SourceAdapter`; `private.ops_recipe_summary(p_scope jsonb,p_cursor text) RETURNS jsonb` and `private.ops_collection_summary(p_scope jsonb,p_cursor text) RETURNS jsonb`, with the fixed collection bridge defined above. Fixed human wrappers derive scope from current authority; machine functions remain inaccessible until Task 12/14 grants their exact use.

- [ ] Test a submitted review as routine, a committed update with refresh pending as attention, and an absent collection adapter as not integrated. Pin overlapping recipe readiness checks instead of reducing them to one Boolean.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { describeIntegration } from "../../src/lib/admin/operations/sources/registry.ts";
test("an absent collection implementation cannot become zero issues", () => {
  assert.equal(describeIntegration("collections", false), "not_integrated");
});
```

- [ ] Run `node --experimental-strip-types --test tests/admin/ops-recipe-collection.test.mjs` and suite 62; expect the missing adapter contract to fail.
- [ ] Implement bounded source queries using existing readiness/publication/version/refresh evidence. Preserve collection originals/additions, unlimited collection size and dependency semantics. Do not edit recipes, releases, purchased promises or free slots. Register collection integration only after Phase 2 is real and verified; never seed sample collections to make coverage look complete.
- [ ] Return source watermarks, actual check age, complete-cursor state and safe destination IDs. Test >100 records, a failed second page, unavailable usage evidence and a private draft that has never been published. A complete actor-scoped read cannot clear another actor's omitted conditions.
- [ ] Run focused unit/SQL tests; commit `feat: adapt recipe and collection operations evidence`.

## Task 6: Adapt verified customer-support exceptions

**Files:** Create migration/suite 63, `WEB/src/lib/admin/operations/sources/support.ts`, `WEB/tests/admin/ops-support.test.mjs`. Modify registry/fixtures only; consume integrated Phase 3 source functions.

**Interfaces:** `createSupportAdapter(rpc: SourceRead): SourceAdapter`; `private.ops_support_summary(p_scope jsonb,p_cursor text) RETURNS jsonb`, with the fixed support bridge defined above. It exposes safe case/operation IDs, classification/reason/deadline and evidence times; it never returns customer emails, payment IDs, note text or refund amounts.

- [ ] Write cases for binding review, verified paid-but-unfulfilled, pending reconciliation, unresolved support case, outcome-unknown refund and actual formal dispute deadlines. Open checkout is not failed; closed is not proof unpaid; an inquiry is not automatically a formal dispute.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { classifyFinding } from "../../src/lib/admin/operations/classification.ts";
import { finding } from "../fixtures/operations.mjs";
test("verified formal deadline inside 24 hours is urgent", () => {
  assert.equal(classifyFinding(finding({ conditionCode: "formal_dispute_deadline",
    deadlineAt: "2026-10-08T00:00:00Z" }), Date.parse("2026-10-07T12:00:00Z")), "urgent");
});
```

- [ ] Run the focused support test and suite 63; expect absent source functions/normalisation cases to fail.
- [ ] Map only authoritative Phase 3 classifications and original receipt destinations. Preserve actual bank/provider deadlines; missing deadline is verification. Do not retrieve Stripe on overview load or call diagnose/reconcile/repair/refund/send commands from this adapter.
- [ ] Use a restricted operational DTO; SQL asserts support read capability before rows/counts/history. Test unknown provider outcomes, multiple valid access sources and current source status changing after an old observation. If Phase 3 is absent, integration remains disabled and its acceptance gate unmet.
- [ ] Run focused unit/SQL tests; commit `feat: expose verified support attention without corrective actions`.

## Task 7: Adapt campaign health and existing report status

**Files:** Create migration/suite 64, `WEB/src/lib/admin/operations/sources/{campaigns,reports}.ts`, `WEB/tests/admin/ops-campaign-report.test.mjs`. Modify registry/fixtures; consume integrated Phase 4 contracts.

**Interfaces:** `createCampaignAdapter(rpc: SourceRead): SourceAdapter`, `createReportAdapter(rpc: SourceRead): SourceAdapter`; `private.ops_campaign_summary(p_scope jsonb,p_cursor text) RETURNS jsonb` and `private.ops_report_status(p_scope jsonb,p_cursor text) RETURNS jsonb`, with the fixed bridges defined above. The report-status DTO includes gates, permitted freshness/query outcome and source watermarks, not financial values.

- [ ] Test safe unavailable recipe placeholders, inactive promotion, committed publication with refresh pending, intentionally disabled analytics and a failed ledger query.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normaliseReportStatus } from "../../src/lib/admin/operations/sources/reports.ts";
test("deliberately disabled analytics is not a failed report", () => {
  const result = normaliseReportStatus({ enabled: false, lastResult: null });
  assert.equal(result.integration, "disabled");
  assert.equal(result.result, "unknown");
});
```

- [ ] Run the focused test and suite 64; expect the missing normaliser/source functions to fail.
- [ ] Implement safe source mappings; campaign refresh retry routes to the original workflow, never republishes. Preserve original/extras promises and historical attribution. Define `normaliseReportStatus({enabled:boolean,lastResult:HealthResult|null}): {integration:IntegrationState;result:HealthResult}` exactly as the test uses it.
- [ ] Require current source/report grants; no finance values or purchase-derived counts appear merely with operations/recipe/support read. A provider outage yields unavailable/stale evidence, not zero. Register only verified actual Phase 4 sources; isolate failures from checkout, recipe inspection and other adapters.
- [ ] Run focused unit/SQL tests; commit `feat: adapt campaign and reporting operational status`.

## Task 8: Consolidate permitted history without copying private audits

**Files:** Create migration/suite 65, `WEB/src/lib/admin/operations/history.ts`, `WEB/tests/admin/ops-history.test.mjs`. Modify source adapters/fixtures; read existing recipe audit and integrated source-history contracts.

**Interfaces:** `public.admin_ops_history(p_query jsonb) RETURNS jsonb`; `loadOperationsHistory(query: HistoryQuery): Promise<Result<Page<HistoryEvent>>>`; `normaliseHistoryEvent(input: unknown, source: SourceId): HistoryEvent`. Original events remain in their source stores.

- [ ] Test safe legacy provenance, identical timestamps across sources, future events outside a fixed watermark and private free-text reasons. Start with this regression:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normaliseHistoryEvent } from "../../src/lib/admin/operations/history.ts";
test("legacy actor is not invented human approval", () => {
  const event = normaliseHistoryEvent({ id: "00000000-0000-4000-8000-000000000011",
    occurredAt: "2026-10-07T12:00:00Z", recordedAt: "2026-10-07T12:00:01Z",
    action: "legacy_review", result: "recorded", targetId: null,
    actorLabel: "Legacy operator", reason: "private@example.test" }, "recipes");
  assert.equal(event.authoriserLabel, null);
  assert.equal(JSON.stringify(event).includes("private@example.test"), false);
});
```

- [ ] Run the history unit test and suite 65; expect the new history contract to fail before implementation.
- [ ] Normalise original source/event identity, occurrence/recording times, action/result, safe target/operation references and proven authoriser/executor labels. Map reasons to allowlisted categories; omit source snapshots, raw reason text and unverified approval. Do not read Auth emails to decorate every row. Team identity fields require Team authority.
- [ ] Implement bounded permission-filtered union queries with stable `(occurred_at, source, event_id)` ordering, fixed watermark, source completeness and exact result codes. Include Team grant/revoke only under its authority. Failure/pending/unknown/committed-refresh-pending are distinct, and unavailable sources make history partial.
- [ ] Run focused unit/SQL tests with actor revocation and a 101-event fixture; commit `feat: consolidate safe authorised administrative history`.

## Task 9: Implement private overview/detail queries and revocation-safe cursors

**Files:** Create migration/suite 66, `WEB/src/lib/admin/operations/{repository,service,cursor,cache}.ts`, `WEB/tests/admin/ops-reads.test.mjs`. Modify strict decoders and generated types.

**Interfaces:** `public.admin_ops_overview(p_query jsonb)`, `admin_ops_item(p_item_id uuid)`, `admin_ops_health()` and `admin_ops_recovery()` each return safe JSON. `loadOverview(query: OpsQuery): Promise<Result<Overview>>`, `loadItem(itemId: string): Promise<Result<ItemDetail>>`, `loadHealth(): Promise<Result<HealthCheck[]>>`. Recovery decoding is completed in Task 18; unavailable 5B data remains explicitly disabled before then.

- [ ] Add a meaningful SQL boundary regression after setting the local fixture actor/MFA:

```sql
select throws_like(
  $$select public.admin_ops_item('00000000-0000-4000-8000-000000000031'::uuid)$$,
  '%ADM_DENIED%',
  'recipe-only actor cannot retrieve a support item by guessing its opaque ID'
);
```

- [ ] Run suite 66 and `node --experimental-strip-types --test tests/admin/ops-reads.test.mjs`; expect missing reads/decoders to fail.
- [ ] Implement SQL authority-before-aggregation, consistent rows/counts/source scope and exact-key DTOs. Expose counts as null when incomplete; zero requires complete fresh permitted scope. An owner may see planned integration labels; other staff receive no hidden module names, counts, pagination totals or outage badges. Backend read-model maintenance derives facts inside fixed source functions, never from posted observations.
- [ ] Use opaque server-stored cursor IDs bound to actor, current authority version, query hash, sort position and source watermarks, expiring after ten minutes. Page immutable observation/history versions as of the query watermark, rather than paginating mutable rows under an assumed snapshot. Reject malformed/foreign/expired cursors safely and recheck source authority on continuation. If retained evidence cannot satisfy the snapshot, return incomplete/restart, not a silently shifted complete page.
- [ ] Start without an aggregate cache. If query evidence justifies one, cap it at five minutes, bind environment/source/authority/policy and check DB membership/grants before every hit. Test a previously cached owner result requested by staff, grant revocation and purge of cursor evidence. Never cache private HTTP responses publicly.
- [ ] Run suite 66, unit tests and typecheck; commit `feat: serve permission-filtered operations overview and evidence`.

## Task 10: Build functional overview, item evidence and safe landing navigation

**Files:** Create `WEB/src/app/admin/overview/page.tsx`, `WEB/src/app/admin/operations/items/[itemId]/page.tsx`, components `{Overview,AttentionList,ItemEvidence,SourceCoverage}.tsx`, `WEB/tests/e2e/admin-operations-fixtures.ts`, `WEB/tests/e2e/admin-operations-overview.spec.ts`. Modify existing `AdminShell.tsx` and permitted return-query handling. Do not change `/admin/page.tsx`; Home wiring belongs to [Phase 5 UI](2026-10-08-admin-console-phase-five-ui.md) Task 3.

**Interfaces:** Server pages use `loadOverview`/`loadItem`; components receive safe DTOs only. Source destinations come from `destinationFor` and are authorised again by the original workflow. No client component gets a database/producer credential.

- [ ] Add a browser test for routine review and hidden corrective controls:

```ts
test("overview routes routine work to the original recipe", async ({ page }) => {
  await page.goto("/admin/overview");
  await expect(page.getByRole("heading", { name: "Routine work" })).toBeVisible();
  await expect(page.getByRole("button", { name: /dismiss|close issue|refund|publish/i })).toHaveCount(0);
  await page.getByRole("link", { name: "Open recipe" }).first().click();
  await expect(page).toHaveURL(/\/admin\/recipes\//);
});
```

- [ ] Run `npx playwright test tests/e2e/admin-operations-overview.spec.ts --project=chromium-desktop`; expect the new destination to be absent. Reuse the guarded existing admin fixture/session approach; do not authenticate a real owner in fixture tests.
- [ ] Render distinct urgent/attention/routine/verification groups, source coverage, actual first-observed/checked times and source-generated next steps. Preserve last-confirmed urgency with stale badges. Provide loading, no matches, genuine zero, no authorised sources, partial and unavailable states. Use accessible headings, keyboard links, focus and mobile layouts without approving new visual styling.
- [ ] Keep Home at `/admin` as the landing route (owner decision 2026-10-08). Expose `loadOverview` so Home can read its lanes from it once overview authority is activated after rehearsal; `/admin/overview` is the full filterable attention list, not a second landing page. When the operations stage is disabled, Home keeps its existing module feeds; support-only staff must not be sent to Recipes. Hide new links when disabled, preserve safe filter/return state and handle authority loss between page and destination without leaking the old item.
- [ ] Run desktop/mobile browser cases, targeted accessibility checks and typecheck; commit `feat: add functional owner overview and evidence navigation`.

## Task 11: Build the bounded private history destination

**Files:** Create `WEB/src/app/admin/history/page.tsx`, `WEB/src/components/admin/operations/History.tsx`, `WEB/tests/e2e/admin-operations-history.spec.ts`. Modify shell navigation, operations query controls and current admin privacy specs.

**Interfaces:** Page uses `loadOperationsHistory`; filters use `parseHistoryQuery` and safe source/target IDs. Private response headers/no-store behaviour follow the current admin route boundary.

- [ ] Add a filter/privacy regression:

```ts
test("history keeps source reasons private", async ({ page }) => {
  await page.goto("/admin/history");
  await expect(page.getByRole("heading", { name: "Administrative history" })).toBeVisible();
  await expect(page.getByText("fixture-private-support-note")).toHaveCount(0);
  await expect(page.getByText("Human approval not recorded")).toBeVisible();
});
```

- [ ] Run the browser spec; expect the missing page/history interaction to fail.
- [ ] Implement 7/30/90-day presets and bounded custom dates, configured timezone, source/action/result filters, safe reference/operation lookup and cursor paging. Explain original time versus recorded time and incomplete source coverage. Missing approver is labelled, not guessed from executor identity.
- [ ] Preserve original history/receipt links only where permitted. Escape display text and reject invalid cursor/date inputs server-side. Keep emails/free-text out of query strings, metadata and exceptions. Test revocation during pagination and history access by staff lacking the source capability.
- [ ] Run history/privacy browser cases and unit query tests. Before a 5A release, also complete applicable Task 20 and Tasks 21–22 gates. Commit `feat: add private cross-module history inspection`.

## Task 12: Authenticate scoped machine producers

**Files:** Create migration/suite 67, `WEB/src/lib/admin/operations/{producer-claims,producer-token,producer-auth,producer-envelope,machine-db}.ts`, `WEB/tests/admin/ops-producer.test.mjs`. Modify package/lockfile and the operations configuration runbook.

**Interfaces:** `verifyGithubProducer(token: string, expectedKind: "github_public" | "github_scheduler"): Promise<VerifiedProducer>`; `verifyBackupProducer(raw: Uint8Array, signature: string, keyId: string): Promise<VerifiedProducer>`; `validateGithubClaims(claims: Record<string,unknown>, policy: GithubProducerPolicy): void`. Fixed `private.ops_assert_machine(p_purpose text) RETURNS text` verifies the authenticated gateway/collector principal, not a posted actor. The registry records producer generation, identity/key reference, source/check allowlist, target, expiry and revocation.

`private.ops_producer_policy(p_kind text,p_key_id text default null) RETURNS jsonb` exposes only approved policy/public-key metadata to the gateway principal for verification; no browser grant, private business read or signing secret. Pool connections use verified TLS on the real target. Test-only loopback exceptions remain behind the local guard; never disable certificate checks globally or fake the effective principal through request settings.

`producer-token.ts` exports `verifyGithubToken(token: string,keyResolver: JwtKeyResolver,policy: GithubProducerPolicy): Promise<Record<string,unknown>>`, importing `JWTVerifyGetKey` from `jose` as the `JwtKeyResolver` type. The server-only wrapper supplies the fixed approved remote resolver; tests supply a compatible in-memory/local-key resolver. No ingress input can choose a JWKS URL or test key. Backup keys may report backup/rehearsal evidence only under their separately registered check allowlists.

- [ ] Generate test-only signing keys in memory. Add actual signature tests for tampering/expiry and claims tests for wrong audience, repository ID, workflow/ref, environment, run/attempt and cross-producer scope. Tokens/keys never appear in failure output.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateGithubClaims } from "../../src/lib/admin/operations/producer-claims.ts";
import { githubClaims, githubPolicy } from "../fixtures/operations.mjs";
test("wrong repository is rejected after cryptographic verification", () => {
  assert.throws(() => validateGithubClaims(githubClaims({ repository_id: "other" }), githubPolicy()));
});
```

- [ ] Run the producer test and suite 67; expect missing verifiers/registry to fail. Review and pin a compatible `jose` 6.x release in the lockfile (`npm install --save-exact jose@6` during implementation). Record its exact resolved version; avoid hand-written JWT/JWKS verification.
- [ ] Use `jwtVerify` with the fixed GitHub issuer/JWKS and expected audience/algorithm/expiry, followed by exact claim-policy validation. No token-supplied key URL or network issuer discovery. Validate registered workflow/ref/repository ID, run/attempt and allowed subject/environment. A public producer cannot admit private checks; a scheduler can enqueue its fixed set but cannot submit private results.
- [ ] Create restricted gateway and collector role definitions with no table/business-writer grants, no BYPASSRLS and fixed function EXECUTE grants. Provision actual login/secure connections separately at activation; prove actual `session_user`/principal semantics on the chosen pooler/direct path. A generic service-role fallback is forbidden. The trusted server gateway verifies producer signatures before invoking its narrow DB functions; browser/anon roles cannot invoke them.
- [ ] Implement the shared `GithubProducerPolicy` checks and strict backup signature validation. Test revoked key/generation and OIDC key rotation/JWKS failure as denial. Run focused tests; commit `feat: authenticate restricted operations producers`.

`jose` provides JWT verification and JWKS support; use its verified API rather than decode-only utilities. [Maintainer documentation](https://github.com/panva/jose). GitHub's official claims describe the repository/workflow trust inputs; exact target values remain activation configuration. [GitHub OIDC reference](https://docs.github.com/en/actions/reference/security/oidc)

## Task 13: Admit, batch and finalise observations with fencing

**Files:** Create migration/suite 68, `WEB/src/lib/admin/operations/ingest.ts`, routes `WEB/src/app/api/internal/operations/{runs,batches,complete}/route.ts`, `WEB/tests/admin/ops-ingest.test.mjs`, `WEB/scripts/operations-concurrency.mjs`.

**Interfaces:** `admitProducerRun(producer: VerifiedProducer,input: {checkId:string;externalRunId:string}): Promise<JobReceipt>`; `appendProducerBatch(producer: VerifiedProducer,input: {runId:string;batchId:string;digest:string;scan:Scan}): Promise<{accepted:boolean}>`; `completeProducerRun(producer: VerifiedProducer,input:{runId:string;manifestDigest:string}): Promise<JobReceipt>`. Matching private DB functions `ops_run_admit`, `ops_batch_append`, `ops_run_complete` take validated JSON through the restricted gateway principal. No human/anon grant.

- [ ] Test the actual DB promotion boundary, not just payload shape:

```sql
select is(
  (select state from private.ops_conditions where condition_id = '00000000-0000-4000-8000-000000000051'::uuid),
  'active',
  'a delayed older pass cannot clear the newer confirmed failure'
);
```

- [ ] Run suite 68 and the focused ingress test; expect absent admission/promotion behaviour to fail. Fixtures create the newer failure and then submit the older run through the allowed test principal.
- [ ] Use Task 12's producer/assignment registry and create `ops_runs`, `ops_batches` and manifests with unique producer/external-run/attempt/target keys, immutable payload digests and server-admitted generations. One authoritative producer assignment per check/target. Identical retransmission replays; changed payload under the same identity conflicts. New producer generation requires a controlled transition.
- [ ] Enforce raw byte size before JSON parsing, at most 100 observations/256 KiB per batch, complete manifest/cursors/definition/target binding, five-minute fresh-check skew and per-producer admission limits. Resolve only after atomically finalising all expected parts. Partial findings may add problems; they never prove absence. Late results stay historical and cannot update newer current evidence.
- [ ] Verify identity at every ingress call, the additional server web gate, DB master/stage/producer enablement and safe error logs. Disable prevents new admission/promotion; an already admitted job can store only its minimal terminal receipt. Re-enable requires a fresh scan. Test two concurrent runs, mutated batch replay, missing page, wrong environment and revoked producer mid-run with the concurrency harness.
- [ ] Run focused unit/SQL/concurrency tests; commit `feat: ingest bounded ordered operations evidence`.

## Task 14: Implement durable read-only collector jobs and human refresh receipts

**Files:** Create migration/suite 69, `WEB/src/lib/admin/operations/{jobs,collector,actions}.ts`, `WEB/scripts/operations-collect.mjs`, `WEB/tests/admin/ops-jobs.test.mjs`. Modify machine DB functions and source summaries from Tasks 5–7.

**Interfaces:** `public.admin_ops_refresh(p_command jsonb) RETURNS jsonb`, `admin_ops_receipt(p_operation_id uuid) RETURNS jsonb`; `requestOperationsRefresh(command: RefreshCommand): Promise<Result<JobReceipt>>`; `collectOperationsBatch(runId: string): Promise<JobReceipt>`; pure `validateOpsOrigin(origin: string|null,configuredOrigin: string): boolean` in `query.ts`. Worker-only `private.ops_job_claim`, `ops_collect_registered_source`, `ops_job_finish` accept validated JSON and verify the real collector principal. Claims include expiring leases and fencing generation.

- [ ] Test idempotent admission and current-authority replay, including transport loss after commit:

```sql
select is(
  public.admin_ops_refresh('{"operationId":"00000000-0000-4000-8000-000000000041","checkId":"recipes-current"}') ->> 'runId',
  public.admin_ops_refresh('{"operationId":"00000000-0000-4000-8000-000000000041","checkId":"recipes-current"}') ->> 'runId',
  'same authorised operation returns the admitted original run'
);
```

- [ ] Run suite 69 and the jobs unit test; expect missing job/admission functions to fail. Include changed-command reuse, fourth admission in ten minutes and source-grant revocation before receipt readback.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateOpsOrigin } from "../../src/lib/admin/operations/query.ts";
test("refresh needs the exact trusted request origin", () => {
  assert.equal(validateOpsOrigin(null, "https://approved.example.test"), false);
  assert.equal(validateOpsOrigin("https://approved.example.test.attacker.test", "https://approved.example.test"), false);
  assert.equal(validateOpsOrigin("https://approved.example.test", "https://approved.example.test"), true);
});
```
- [ ] Persist operation fingerprints before execution; share an active check/target/definition run while keeping each authorised requester receipt. Require `ops.check.run`, source grants, `aal2`, master and monitoring stage for human admission. Validate the request Origin against the trusted configured first-party origin before DB admission; missing/foreign origins fail, and forwarded host text is not authority. Browser command has only operation/check IDs, never actor/URL/SQL/source evidence. Test same-origin denial independently of MFA/role denial.
- [ ] Implement short DB claims, network outside locks, five-second statements and a 30-second batch deadline. Only the collector principal may invoke fixed registered read functions. Recheck current requester membership/source grants for a human-only queued command; independently registered scheduled jobs retain their own authority. Persist continuation cursors and complete/partial/failed/unknown states; expire abandoned leases and recover with a newer generation, without promoting stale results. A complete job means execution finished, not that its health result passed. No checkout, publication, provider mutation or message API is callable.
- [ ] Execute one awaited bounded batch on an authorised request where the host supports the budget; keep remaining work durable for scheduled ticks. Task 16 supplies tick continuation. If actual host limits are shorter, lower batch work within the verified limit; never use fire-and-forget. A lost response does not prove no commit: use original receipt/ID, not a fresh ID. Do not reuse broad commerce credentials for this worker.
- [ ] Run tests with killed worker, stale lease and long source query; compare business tables before/after. Commit `feat: run bounded collector jobs with recoverable refresh receipts`.

## Task 15: Extend existing public smoke checks into a trustworthy producer

**Files:** Modify `WEB/scripts/production-smoke.mjs`, `.github/workflows/production-smoke.yml`; create `WEB/scripts/operations-public-report.mjs`, `WEB/tests/admin/ops-public-smoke.test.mjs`. Update operations configuration/runbook.

**Interfaces:** Export `runPublicSmoke({origin,fetchImpl,sleepImpl}): Promise<{checks:Array<{checkId:string;result:HealthResult;observedAt:string}>;exitCode:number}>` from the smoke script, preserving its CLI behaviour through a main guard. Optional injected fetch/sleep functions permit deterministic offline tests; the CLI uses actual fetch/timers. Reporter admits/appends/finalises only registered public checks and sends no private data or GitHub token to another host.

- [ ] Stub fetch locally; add meaningful body/status assertions and the existing retry/timeout behaviour. Test that importing the module does not launch network requests.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { runPublicSmoke } from "../../scripts/production-smoke.mjs";
test("a 200 error shell is not meaningful recipe success", async () => {
  const result = await runPublicSmoke({ origin: "https://fixture.example.test",
    fetchImpl: async () => new Response("<html>temporary error</html>", { status: 200 }),
    sleepImpl: async () => {} });
  assert.notEqual(result.exitCode, 0);
});
```

- [ ] Run the focused public-smoke test; expect the new importable interface to fail initially. All test requests are stubbed; the fixture origin is not contacted.
- [ ] Preserve fixed first-party origins/routes, GET-only checks, sitemap/recipe content validation, three attempts, 20-second request timeout and existing ten-minute workflow limit. Add registered campaign/collection destinations only when integrated. Refuse external redirect targets; do not accept caller URLs or leak response bodies into evidence/logs.
- [ ] Add job-scoped `id-token: write`, a fixed configured audience and verified public producer registration. Record actual workflow run/attempt, test-script SHA, checked origin and target deployment separately. Report failures as well as passes, including check completion before upload; a failed upload leaves missing evidence and must not mask a smoke failure. Preserve schedule/deployment/manual triggers and existing external check utility when operations ingestion is disabled.
- [ ] Run the unit tests and workflow validation. At authorised target rehearsal verify an actual run/accepted receipt; local stubs alone do not satisfy A8/A10. Commit `feat: report registered public smoke evidence`.

## Task 16: Schedule private collection and expose health/manual refresh

**Files:** Create `.github/workflows/admin-operations.yml`, `WEB/src/app/api/internal/operations/tick/route.ts`, `WEB/src/app/admin/operations/health/page.tsx`, `WEB/src/components/admin/operations/Health.tsx`, `WEB/tests/e2e/admin-operations-health.spec.ts`, `WEB/tests/admin/ops-scheduler.test.mjs`. Modify `operations-collect.mjs`, jobs/actions and shell navigation.

**Interfaces:** `POST /api/internal/operations/tick` requires the distinct `github_scheduler` trust policy and enqueues/continues only its fixed registered set. Its response is a minimal run/terminal receipt, never private findings or business counts. Human refresh uses `requestOperationsRefresh`; receipt polling uses current authenticated `admin_ops_receipt`.

- [ ] Test stale liveness independent of a queued/running heartbeat:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { freshnessAt } from "../../src/lib/admin/operations/freshness.ts";
test("a newly started run does not refresh old completion evidence", () => {
  assert.equal(freshnessAt("2026-10-07T08:00:00Z", Date.parse("2026-10-07T12:00:00Z"),
    3 * 60 * 60 * 1000), "stale");
});
```

- [ ] Run the focused scheduler test and health browser spec; expect absent health/refresh interactions to fail.
- [ ] Add an hourly scheduler at minute 37, successful Production-deployment filtering and manual dispatch. Use a distinct exact workflow/ref OIDC policy from the public reporter, job-scoped token issuance and fixed first-party endpoint. Bound each invocation to ten awaited batches/ten minutes, with concurrency per target and resumable durable state. No private database credentials/results enter GitHub. Verify raw request/auth failures safely.
- [ ] Render purpose, result, freshness, coverage, last real completion, definition/target and producer provenance. Preserve `sourceVerifiedAt` separately from DB read/receipt time; checks requiring provider verification cannot become fresh from a new DB read of old evidence. Show current failure separately from stale success; no global green when expected authorised sources are incomplete. Distinguish active/disabled/not integrated; a deliberately disabled source follows declared coverage policy. Manual refresh shows queued/running/pending/terminal receipt and cannot trigger while inspection-only.
- [ ] Test one adapter unavailable while others load, source grant loss, manual rate limit, source failure after an urgent issue, disabled master and site outage. Verify the existing external public workflow remains independently useful. A scheduled start is never proof of private fulfilment health.
- [ ] Run focused unit/DB/browser checks; commit `feat: schedule private observations and expose operations health`.

## Task 17: Publish minimal signed backup completion evidence

**Files:** Create `ops/backup-evidence.mjs`, `WEB/src/lib/admin/operations/backup-manifest.ts`, `WEB/src/app/api/internal/operations/backup/route.ts`, migration/suite 70 backup foundation, `WEB/tests/admin/ops-backup.test.mjs`. Modify `ops/backup-production.sh` only for an optional post-completion evidence hook and `ops/README.md` for the separate reporting procedure.

**Interfaces:** `BackupManifest` has `version:1`, producer/key/generation/run IDs, decimal sequence, environment, started/completed instants, `artifacts:Array<{id:string;sha256:string;bytes:string}>`, `components:Array<{code:string;coverage:"included"|"excluded"|"unknown";consistent:boolean|null}>`, checks/warning codes and actual timezone. `encodeBackupManifest(manifest: BackupManifest): Uint8Array`; `verifyBackupEnvelope(bytes: Uint8Array,signature: string,keyId: string): BackupManifest`; `backupAgeMs(completedAt: string,nowMs: number): number`. The backup route accepts this signed technical receipt only; it does not return private backup records.

- [ ] Add in-memory key signature tests, byte tampering/duplicate-key/noncanonical payload rejection, old completion/new receipt and partial storage coverage:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { backupAgeMs } from "../../src/lib/admin/operations/backup-manifest.ts";
test("upload does not reset backup age", () => {
  assert.equal(backupAgeMs("2026-10-06T03:30:00Z", Date.parse("2026-10-07T15:30:00Z")),
    36 * 60 * 60 * 1000);
});
```

- [ ] Run the backup unit test and suite 70; expect missing signed manifest/receipt behaviour to fail.
- [ ] Implement a versioned deterministic UTF-8 encoding with a fixed field order, exact keys, validated integer strings and allowlisted component/check codes. Sign the exact bytes with Node `crypto.sign(null, bytes, privateKey)` and verify with `crypto.verify(null, bytes, publicKey, signature)`. Reject any payload that differs from its validated canonical re-encoding. No raw local path, storage key, file contents, DB URL or private key enters the manifest.
- [ ] Compute hashes/byte counts locally only after existing backup completion checks. Preserve actual artifact times and coverage; DB completion cannot imply Storage completeness. Store a signed outbox under the protected backup directory, allocate a monotonic sequence under an exclusive local lock and retry the same signed run/bytes after connectivity returns. Reporting failure does not delete artifacts or rewrite successful backup status. Verify the pinned Node runtime is available to launchd; absence leaves reporting unavailable while backups keep their existing behaviour. Keys are securely provisioned at activation, never generated into the repository or printed.
- [ ] Ingest through the backup-only producer scope with generation/sequence/replay checks and independently stored receipt time. Confirm installed local schedule/timezone only in the authorised rehearsal. Existing backup execution and original exit semantics remain useful when reporting/console is disabled.
- [ ] Run unit/SQL tests, stubbed local reporter/outbox tests and shell syntax validation; commit `feat: report signed minimal backup completion evidence`.

Node supports Ed25519 signing/verification; the null algorithm is used for that key type. [Node 24 cryptography documentation](https://nodejs.org/docs/latest-v24.x/api/crypto.html)

## Task 18: Expose recovery coverage and truthful rehearsal evidence

**Files:** Create the separate forward migration/suite 71, `WEB/src/lib/admin/operations/{recovery,sources/recovery}.ts`, `ops/restore-evidence.mjs`, `WEB/src/app/api/internal/operations/restore/route.ts`, `WEB/src/app/admin/operations/recovery/page.tsx`, `WEB/src/components/admin/operations/Recovery.tsx`, `WEB/tests/admin/ops-recovery.test.mjs`, `WEB/tests/e2e/admin-operations-recovery.spec.ts`.

**Interfaces:** `RestoreEvidence` contains artifact digests, isolated target reference, operator-reported or independently verified provenance, actual start/finish, required/observed check codes, results/omissions and configuration version. `RecoveryView` contains `coverage: Coverage`, `restoreVerified: boolean`, independent completion freshness, last applicable rehearsal and measured duration or null. `recoveryView(manifest: BackupManifest|null,rehearsal: RestoreEvidence|null,nowMs:number): RecoveryView`; `loadRecovery(): Promise<Result<RecoveryView>>` completes Task 9's safe recovery RPC decoder. `encodeRestoreEvidence(evidence: RestoreEvidence): Uint8Array`/`verifyRestoreEnvelope(bytes: Uint8Array,signature: string,keyId: string): RestoreEvidence` use a distinct versioned signed payload and the registered rehearsal-evidence scope through the new restore ingress; existing backup payloads remain unchanged.

- [ ] Add a test that prevents a recent dump from manufacturing restoration proof:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { recoveryView } from "../../src/lib/admin/operations/recovery.ts";
import { backupManifest } from "../fixtures/operations.mjs";
test("fresh DB evidence without storage or rehearsal stays partial", () => {
  const view = recoveryView(backupManifest({ components: [
    { code: "database", coverage: "included", consistent: true },
    { code: "approved_storage", coverage: "unknown", consistent: null },
  ] }), null, Date.parse("2026-10-07T12:00:00Z"));
  assert.equal(view.coverage, "partial");
  assert.equal(view.restoreVerified, false);
});
```

- [ ] Run focused recovery unit/SQL/browser tests; expect absent recovery presentation/verification logic to fail.
- [ ] Store minimal `ops_backup_evidence` and `ops_restore_evidence`, with producer/server times and immutable artifact references. The CLI produces a signed, clearly labelled operator attestation or captures independently verified test output; a claimed operator name is not automatically a verified owner approval. Owner review approves its use as evidence during the controlled operational procedure. No UI attestation, restore or download command is added.
- [ ] Reconcile `recipe-images`, `recipe-previews`, actual approved assets, schemas/migrations, roles/grants/Auth dependencies and storage versions/consistency window. Keep additive nonversioned mirror coverage partial until adequate evidence supports a stronger claim. Record the actual copy locations as safe coverage classes, not secret paths; do not imply off-device availability exists.
- [ ] Extend the controlled runbook for isolated restoration: block production payment/email/notification egress, verify RLS/grants, public/free and controlled paid access, applicable collection promises, admin MFA/stages and integrated support/report boundaries. Record actual omissions, artifact hashes, duration and target/configuration version. New architecture may invalidate earlier relevance. Unknown RTO remains null; potential loss follows actual recoverable artifact age.
- [ ] Render owner-only recovery axes, 36-hour freshness and 90-day review defaults, safe runbook links and no restore controls. Run focused tests; commit `feat: expose evidence-based recovery readiness`.

## Task 19: Integrate deployment evidence, Team review and permitted report summaries

**Files:** Create `WEB/src/lib/admin/operations/{deployment,governance,sources/deployment,sources/team}.ts`, `WEB/src/components/admin/operations/Governance.tsx`, `WEB/src/app/api/internal/operations/deployment/route.ts`, `WEB/tests/admin/ops-governance.test.mjs`, `WEB/tests/e2e/admin-operations-governance.spec.ts`. Modify Health/Overview, current Team page and public report metadata/configuration only as needed.

**Interfaces:** `DeploymentEvidence` has nullable provider deployment ID/status, expected revision, script revision, serving revision, origin, observation time and trust/probe scope. `deploymentVerdict(evidence: DeploymentEvidence): "verified"|"mismatch"|"unknown"`; `loadGovernance(): Promise<Result<{reviewDue:boolean|null;lastReviewAt:string|null}>>`. Staff rows/grants and report values remain their existing source DTOs/permissions, not new operations-owned copies.

- [ ] Add a revision mismatch regression:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { deploymentVerdict } from "../../src/lib/admin/operations/deployment.ts";
test("a ready deployment and current test script do not prove serving revision", () => {
  assert.equal(deploymentVerdict({ providerDeploymentId: "fixture", providerStatus: "ready",
    expectedRevision: "a".repeat(40), scriptRevision: "a".repeat(40), servingRevision: null,
    origin: "https://fixture.example.test", observedAt: "2026-10-07T12:00:00Z",
    trust: "registered_producer", probeScope: "public_routes" }), "unknown");
});
```

- [ ] Run governance unit/browser tests; expect new evidence/card behaviour to fail.
- [ ] Bind trusted deployment-status observations to registered workflow run/attempt, target origin/environment and expected revision. Label producer-reported provider facts accurately. The fixed authenticated deployment endpoint reads only this request runtime's approved revision/deployment identifiers (for the existing Vercel host, `VERCEL_GIT_COMMIT_SHA`/`VERCEL_DEPLOYMENT_ID` where actually available); absent values remain unknown. It exposes no generic environment dump and only to a registered deployment-check scope. Distinguish this runtime probe from public cached-page checks and private domain health. [Vercel system-variable reference](https://vercel.com/docs/environment-variables/system-environment-variables)

```ts
// Authenticated deployment route: runtime observation cannot be a static build artifact.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Every response additionally uses Cache-Control: private, no-store.
```
- [ ] Keep script SHA, provider status and serving/runtime evidence separate. A new deployment invalidates old proof for the new revision; late results cannot overwrite it. If current provider status needs an additional read adapter, keep that source unavailable until its exact target/API/read-only authority is verified; do not report GitHub producer attestation as independent current provider retrieval.
- [ ] Display current Team memberships/grants under Team authority, protected owner and actual review evidence only. No fabricated last login, inactivity deletion or mark-reviewed action; missing review attestation stays unknown with a routine review prompt. Existing Team remains the place to act. Reuse Phase 4 report DTOs only after their separate finance/performance grants, preserving independent watermarks; operations authority alone grants neither.
- [ ] Test staff revocation, Team-only identity fields, report-cache leakage and disabled analytics. Run focused unit/browser checks; commit `feat: integrate deployment and governance evidence`.

## Task 20: Enforce retention, privacy, query budgets and required CI

**Files:** Create migration/suite 72, `WEB/src/lib/admin/operations/retention.ts`, `WEB/scripts/operations-retention.mjs`, `WEB/tests/admin/ops-retention.test.mjs`, `WEB/tests/e2e/admin-operations-privacy.spec.ts`. Modify current `private-paths` tests/admin privacy spec, `WEB/package.json`, `.github/workflows/web-ci.yml` and operations runbook. Do not change original source retention.

**Interfaces:** `RetentionPolicy` names explicit approved durations/classes, policy version, approval reference and activation readiness. `private.ops_retention_preview(p_policy_version text) RETURNS jsonb` and `ops_retention_apply(p_command jsonb)` are restricted maintenance operations with bounded technical deletions, immutable receipt and exact dry-run scope. `retentionEffect({active:boolean,evidenceWillExpire:boolean,eligibleForPurge:boolean}): "retain"|"retain_minimum"|"unverified"|"purge_resolved"` is the pure expiry decision under that policy. Resolved but not policy-eligible data returns retain; active obligations never become purge-resolved.

- [ ] Add tests for unset policy, active evidence expiry and public-positive/admin-negative analytics behaviour:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { retentionEffect } from "../../src/lib/admin/operations/retention.ts";
test("expired proof cannot resolve an active condition", () => {
  assert.equal(retentionEffect({ active: true, evidenceWillExpire: true, eligibleForPurge: false }), "unverified");
  assert.equal(retentionEffect({ active: false, evidenceWillExpire: false, eligibleForPurge: false }), "retain");
});
```

- [ ] Run focused retention/SQL/privacy tests; expect missing policy/expiry enforcement to fail.
- [ ] Require adopted retention before new persistence/producer ingestion. Separate runs/observations, active minimum evidence, resolved occurrences, history references, backup/rehearsal provenance and ephemeral caches/cursors/leases. Purge only approved technical data, preserve source audits/purchases/grants/promises and safe live provenance, or downgrade expired proof to unverified. No unlimited retention default or business cascade. Maintenance gets a restricted principal, not the gateway's or owner's broad credentials.
- [ ] Verify every new admin/API/return context is excluded from analytics/replay and private payloads are scrubbed from errors/logs/metadata/cache. Use public positive-control traffic; check private cookie/session headers and no-store responses. Enforce body/page/date/statement/batch/concurrency bounds and source-failure isolation with EXPLAIN/query evidence on synthetic scale, without broad provider scans.
- [ ] Add scripts `test:ops:unit` (Node strip-types over `tests/admin/ops-*.test.mjs`) and `test:ops:db` (guarded Phase 5 DB wrapper). Ensure required CI runs the new SQL suites explicitly, applicable earlier admin suites, unit/type/lint/build and new browser specs on isolated services; no production secrets, signed backup files or private payload artifacts. Fixture tests remain meaningful, not source-text snapshots.
- [ ] Run applicable focused checks and required CI once on the candidate; broaden only for changed concerns. Commit `feat: enforce operations privacy retention and verification gates`.

## Task 21: Rehearse actual-target activation, failure and rollback

**Files:** Create `WEB/scripts/phase5-evidence.mjs`, `WEB/tests/admin/ops-evidence.test.mjs`, `docs/implementation/admin-operations/{REHEARSAL,RELEASE}.md`, `ops/ADMIN-OPERATIONS.md`; update BASELINE/GATES/CONFIGURATION. No product change is implied by writing evidence.

**Interfaces:** `phase5-evidence.mjs --mode local` writes safe local results; `--mode target-read` requires an explicit registered target and authorised authenticated read context. Output contains candidate/deployed identity, test/run references, watermarks and pass/unmet status, never tokens, customer rows or raw backups. It cannot enable stages, create a purchase, refund, message or restore.

Export `validateEvidenceTarget({mode, targetOrigin, registeredOrigin}): boolean` without auto-executing the CLI on import. Local mode permits loopback only; target-read requires exact HTTPS origin equality with separately approved configuration.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateEvidenceTarget } from "../../scripts/phase5-evidence.mjs";
test("target read refuses an unregistered origin", () => {
  assert.equal(validateEvidenceTarget({ mode: "target-read",
    targetOrigin: "https://other.example.test", registeredOrigin: "https://approved.example.test" }), false);
});
```

- [ ] Add and run a guard test proving a target read cannot accept arbitrary URLs, local mode cannot touch production and missing identity stays unverified. Reuse Task 1's local guard for fixture work, with a separate exact allowlist for explicitly authorised target reads.
- [ ] Reconcile the candidate migration set, registered source coverage, capabilities/master/stages, producer trust identities, installed schedule/timezone, host request budgets, retention and actual backup artifact/coverage. Complete independent local work if one external prerequisite is unavailable; leave its gate explicitly unmet with exact evidence/next action.
- [ ] On an authorised rehearsal target, run owner and narrowed-admin journeys: overview → original record → source-approved resolution → refreshed evidence; history/pagination/revocation; scheduled and manual receipt readback; actual producer upload; backup completion/coverage and isolated rehearsal evidence. Do not perform a real financial or communication action just to exercise Phase 5.
- [ ] Rehearse master/stage/source/producer disable, late completion while disabled, re-enable requiring a fresh scan, bad adapter and source outage. Withdraw new navigation and restore a permitted existing landing. Verify public delivery, existing purchases/promises, original audit and independent Mac/public-smoke procedures remain intact. No destructive database rollback or backup deletion.
- [ ] For an authorised production release, follow required PR/CI/merge/deploy/migration/config procedures and then verify the actually serving revision and real scoped requests. Writing this plan or finishing local implementation does not itself authorise production provisioning, enabling schedules/ingestion or restoring data. Preserve current scopes if no release authorisation exists.
- [ ] Commit the safe evidence/runbook updates only: `docs: record operations rehearsal and release readiness`.

## Task 22: Independent final review and acceptance closure

**Files:** Review the entire scoped candidate and linked design; update `docs/implementation/admin-operations/{GATES,RELEASE}.md` with truthful results. Fix only identified scoped issues and their tests.

- [ ] Reread the user request and approved design, compare every requirement against the actual candidate and the mapping below. Classify each gate local, target-verified, deferred-by-approved-scope or unmet; a green build cannot satisfy external evidence.
- [ ] Obtain the agreed independent final review of the candidate's authority/SQL, source semantics, read-only invariants, producer trust, fencing, privacy and recovery claims. This is the review stage of the preserved Native method, not fresh implementation agents per task. Supply exact candidate SHA, declared coverage and evidence without secrets.
- [ ] Fix actionable review findings and rerun their smallest relevant checks. Record remaining limitations and exact blockers; preserve unrelated changes. Do not mark full Phase 5 complete with absent source integrations, missing real producer receipts or an unperformed recovery rehearsal.
- [ ] Report implementation/commit/required-CI/deployment/runtime states separately. If a smaller 5A candidate ships, state its source scope and explicitly unmet 5B/full-phase gates. If a production release is authorised, completion includes its migration/config and actual-target verification, not only branch/PR creation.
- [ ] Commit the reconciled evidence: `docs: reconcile phase five acceptance and final review`.

## Runtime acceptance mapping

The evidence ledger records the exact test/run/artifact reference and outcome. Every gate starts unmet; the references below name planned verification, not current successes.

| Design gate | Tasks | Required evidence |
| --- | --- | --- |
| A1 Source fidelity | 1, 5–7, 19, 21 | Actual integrated contract/route versions and adapter comparisons; absent sources labelled. |
| A2 Authority/scope | 3–4, 8–11, 14, 19–20 | SQL plus browser denial/revocation/count/cursor/cache/receipt cases. |
| A3 Read-only invariants | 4–7, 12–18, 21 | Restricted grants and business-table/provider before/after evidence. |
| A4 Priority/uncertainty | 2, 4, 6–7, 10, 16 | Routine, deadline, unknown and stale-urgency fixtures and visible states. |
| A5 Lifecycle | 4–5, 9, 13 | Stable grouping, complete resolution proof, recurrence and no manual-close controls. |
| A6 Partial collection | 4–9, 13–16 | Failed second page, missing manifest part, unavailable source and no false zeros. |
| A7 History integrity | 2, 8–9, 11 | Legacy provenance, safe reasons, watermark/cursor and authorised source-link tests. |
| A8 Scheduler/liveness | 12–16, 21 | Actual scheduled/deployment/manual workflow and accepted completed run references. |
| A9 Producer trust | 12–13, 17, 21 | Real verifier/SQL rejection, key revocation, scope, replay and generation tests. |
| A10 Public/private proof | 15–16, 19 | Meaningful public GET tests and separately labelled private/source/runtime evidence. |
| A11 Private collection | 5–7, 12, 14 | Restricted principal reads, denied correction commands and verified source classifications. |
| A12 Manual refresh | 9, 14, 16 | Current authority, same-origin, budgets, fingerprint, timeout and receipt readback. |
| A13 Backup evidence | 17–18, 21 | Actual signed minimal receipt tied to identified artifacts; old upload and storage gaps. |
| A14 Restore readiness | 18, 21 | Actual isolated artifact-specific rehearsal, omissions, permissions and duration. |
| A15 Deployment identity | 15, 19, 21 | Script/expected/serving revision distinction and current target-bound readback. |
| A16 Access governance | 3, 8, 19 | Current grants/protected owner and truthful existing review evidence. |
| A17 Reports | 7, 9, 19 | Phase 4 definitions/grants/watermarks, cache isolation and disabled/outage behaviour. |
| A18 Privacy/retention | 2, 8–13, 17–20 | Browser positive control, scrubbed logs, adopted policy and expiry/purge checks. |
| A19 Disable/rollback | 3, 9–10, 13–18, 21 | New-admission denial, permitted landing and preserved public/business/backup operation. |
| A20 Actual target | 21–22 | Owner/staff journey, actual receipts, revision/config identity and scoped release review. |

## Design-section coverage

| Design sections | Implementation ownership |
| --- | --- |
| 1–5: purpose, decisions, baseline and increments | Global constraints, baseline/ledger, Tasks 1–4, 21–22. |
| 6–8: destinations, attention and lifecycle | Tasks 2, 4–11, 13. |
| 9–11: freshness, sources and history | Tasks 4–9, 11, 15–19. |
| 12–15: human/machine authority, execution and records | Tasks 2–4, 9, 12–17. |
| 16–17: recovery, deployment, access and reporting | Tasks 7, 17–19, 21. |
| 18–20: privacy, retention, bounds and failures | Tasks 2–4, 8–9, 12–20. |
| 21–22: stages, rollback and delivery dependencies | Tasks 1, 3, 10, 13–16, 20–22. |
| 23–25: operating scenarios, acceptance and readiness | Adapter/browser fixtures across Tasks 4–19; gate mapping and Tasks 21–22. |

## Verification commands and execution handoff

Commands run from `WEB` unless stated. They become available as their owning tasks are implemented; they were not run against product code while writing this plan.

```bash
node --experimental-strip-types --test tests/admin/ops-*.test.mjs
node scripts/test-phase5-db.mjs
npm run lint
npm run typecheck
npm run build
npx playwright test tests/e2e/admin-operations-*.spec.ts
```

The DB wrapper uses the approved local project and explicit suite allowlist. Build before browser tests under the current Playwright production-server configuration. Run existing affected admin/source suites and required CI as well; avoid a new broad retest after a passing candidate unless code/failures/concerns change. Execute concurrency, reporter and actual-target rehearsals through their guarded scripts under the recorded scope. Never use production as a fixture target.

Plan self-review checks: source-versus-proposed paths, contract/type/name consistency, concrete tests, placeholder scan, review-focus coverage, every design section and A1–A20 mapping, additive migration order and scope boundaries. Exact target identities, credentials and retention are activation inputs, not missing implementation instructions or permission to invent values.

**Next step:** owner review of this written plan, then Native execution with an independent final review. No product code, database, local backup, workflow, credential or deployment is changed by writing the plan.
