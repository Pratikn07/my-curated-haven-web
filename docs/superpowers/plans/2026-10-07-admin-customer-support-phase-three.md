# Admin Customer Purchases and Access Support Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the owner and explicitly authorised support staff a reliable way to inspect purchases, explain access, diagnose provider/ledger mismatches and apply human-approved access repairs and securely initiate owner-approved full/partial refunds without inventing customer rights.

**Architecture:** Extend the existing admin application with private support records and narrow authenticated commands. Reuse the commerce ledger and completed Phase 2 collection resolver, with one eligibility evaluator and fenced reconciliation writer shared by webhook processing and support repair. Provider verification happens outside database transactions; approvals bind an exact proposal and local effects commit with their audit receipt. Refund submission has a separate durable intent, restricted server adapter, stable provider key and recovery contract because external money cannot share the SQL transaction.

**Tech Stack:** Existing Node 24, npm 11, Next.js 16, React 19, TypeScript, Supabase Auth/PostgreSQL, `pg`, Stripe SDK, pgTAP, Node test runner and Playwright. Preserve the integrated lockfile and pinned Stripe API version unless a separately evidenced compatibility change is required; no new admin framework, payment provider or queue service.

**Spec:** [Phase 3 customer support design](../specs/2026-10-07-admin-customer-support-phase-three-design.md). First written from design commit `1b47cba`; revised alongside the design for the owner's 2026-10-07 choice to include secure in-panel refunds. This choice authorises the refund scope and this planning revision. It does not authorise implementation, a production release, a refund or an individual customer's access change.

## Global Constraints

These requirements are copied from the design; all tasks inherit them.

- “A support reference locates a record but is not proof that a person contacting support owns it.”
- “Do not use billing email, a forwarded receipt or a recreated email account to transfer purchase ownership.”
- “A recipe viewer is not automatically a customer-data viewer.”
- “Mock sessions are confined to isolated fixtures and cannot support live repair.”
- “Approval binds the exact digest, target and consequences; it is not a reusable permission to repair the account later.”
- “Changed facts require a new preview and approval.”
- “Local financial facts, eligibility, projections and the mandatory audit receipt commit together.”
- “Never hold SQL row locks while calling the provider.”
- “Support diagnostics and projection-only repairs send no customer communications.”
- “No bulk repair capability in the first release.”
- “Existing checkout/webhook fulfilment continues under its approved automated commerce policy. New manual support repairs require exact human approval.”
- “The database cannot independently authenticate a human chat statement.”
- “Unknown policy blocks new repair rather than automatically removing otherwise recorded access.”
- “Full remaining becomes a fixed amount at preview; it never expands automatically before submission.”
- “A DB rollback cannot undo a provider refund.”
- “Refund dispatch additionally requires `refund_submission_enabled`, default false; enabling repair never enables money movement.”

Preserve Phase 2's buyer promise: **Preserve what buyers purchased, and give them future additions.** Original sources, immutable purchase snapshots and explicit origin-release/source-kind policies remain authoritative. No support-only ownership flag, synthetic purchase for an addition, arbitrary grant, account transfer, customer impersonation, charge endpoint or messaging feature. The intended refund endpoint must enforce the separate owner-only contract; repair commands cannot move money.

Execution requirements: invoke `$unlazy` before the first code edit; create an acceptance ledger; preserve unrelated changes and indexes; use additive migrations; keep credentials, private Auth state, personal notes and raw provider payloads out of logs/artifacts. This document-writing task changes no product code. Native execution remains selected: the primary agent implements tasks, with one independent final review after integration. Do not dispatch a fresh implementation agent per task.

## Review Focus

Five easily missed input classes are assigned explicit tests below:

1. Emails containing plus suffixes, dots, Unicode and SQL wildcard characters must use established exact matching, with ambiguity/unavailability distinct from absence. Task 4.
2. More than one provider page of refunds, including a failed second page, must not produce a falsely complete observation or restore access. Tasks 9 and 10.
3. A full refund can later fail while a dispute, account closure or another source still exists; re-evaluate every exclusion and never resurrect rights from the refund status alone. Tasks 8, 11 and 20.
4. The database may commit before the browser loses its response or before the post-check fails; show the durable receipt and pending verification without executing another repair. Tasks 15–17.
5. An account can close and be recreated with the same email after approval; the old owner principal must not be rebound to the new Auth UUID. Tasks 4, 14 and 20.

Refund-specific extensions to these tests belong to Tasks 23–26: complete adjustment pagination, exact original payment binding, dispatch/result separation, lost provider responses, Dashboard races, revocation after dispatch and provider-key expiry. Do not treat an access-repair receipt as proof that money was refunded.

---

## Baseline, prerequisites and delivery order

- Plan date: 2026-10-07, America/Los_Angeles.
- Verified remote main: `9bfdfc94390e5d3348a7b895d901ea81e13aac90`.
- Planning checkout: `/Users/pratik.nandoskar/.codex/worktrees/admin-recipe-design/my-curated-haven-web`, branch `codex/admin-recipe-workspace-design`, HEAD `1b47cba` before this document's commit. Existing uncommitted Phase 1 publication work is outside this planning task.
- Current commerce source was checked in `/Users/pratik.nandoskar/Documents/working/mch/my-curated-haven-web/.claude/worktrees/collections-showroom` at `f08e034ddda3a69c203828050d4aded38da0fd1e`, corresponding to the main navigation squash merge.
- Phase 1 publication/review/rehearsal work is unfinished in the planning checkout. Phase 2 has a design and implementation plan; its successor resolver, publication and checkout contracts are not implemented merely because they appear in those documents.
- Complete and verify those prior phases, then integrate their commits with freshest main before Phase 3 domain changes. Preserve dirty work in its checkout; do not automatically merge it or call it completed.
- Existing payment refresh skips provider retrieval after local payment success. The replacement payment writer in `20260924174355_phase8_remediation_guards.sql` validates snapshot fields and cross-order payment binding but still upserts eligibility. Refund handling exists; full dispute/asynchronous lifecycle coverage was not found in the inspected fulfilment handler. These are source findings, not deployed-state findings.

The workspace, ledger and provider flows form one coupled support product. Cases alone do not justify a separate ticketing project. Tasks are reviewable units; activation follows increments and may wait for later verification even when code is present.

| Increment | Tasks | Usable outcome | Activation gate |
| --- | --- | --- | --- |
| 3A — Inspect and explain | 1–7 | Support authority, exact lookup, historical purchase/access detail, cases and attention queue | Integrated prior phases, privacy tests, required retention configuration and owner walkthrough. |
| 3B — Diagnose and prepare | 8–14 | Versioned eligibility, complete provider checks, durable observations, shared lifecycle processing, proposals and approvals | Supported provider bindings/events verified; no manual repair commit enabled. Ordinary commerce continues under its approved policy. |
| 3C — Approve, repair and refund | 15–21, 23–26, then 22 | Atomic approved access repair; owner-only full/partial refunds; durable financial recovery; functional controls; repair agent parity and release evidence | A1–A19 evidence, independent review, owner rehearsal and explicit release authority. |

The owner has confirmed secure in-panel refund initiation for the first complete Phase 3 release. Proposed safeguards are owner-only browser submission, separate refund permissions/gate, exact full/partial amounts, a five-minute maximum proposal/approval lifetime and durable provider recovery. Documented-rights access repair remains separate. These safeguards and remaining business policy choices are reviewed in this plan.

Execution order is **Tasks 1–21 → Tasks 23–26 → Task 22**. Task 22 retains its existing number as the final whole-branch gate; it now depends on the added refund tasks. Increments 3A/3B are independently gated internal milestones; the first complete Phase 3 release includes refunds. C05–C09 policy versions and retention decisions must be explicit before live mutation/notes activation; synthetic approved policies are sufficient for isolated development tests.

Paths below are repository-relative for portability. `WEB` means `my-curated-haven-web`. Run Node/npm/Playwright commands from WEB, Git commands from repository root, and Supabase commands from repository root with the explicit owned workdir. Proposed migration timestamps and SQL suite numbers must be checked for collisions at execution start and renamed consistently if needed.

## File responsibilities

| Files to create | Responsibility |
| --- | --- |
| `docs/implementation/admin-support/{GATES,POLICY-MATRIX,REHEARSAL}.md` | A1–A19 ledger, exact policy/version decisions and owner walkthrough evidence. |
| `ops/ADMIN-SUPPORT.md` | Roles/stages, safe provider checks, restricted commands, unknown-result recovery and release/rollback. |
| `supabase/migrations/20261007010100_admin_support_schema.sql` | Private support schema, opt-in authority, stage settings and grants. |
| `supabase/migrations/20261007010200_admin_support_reads.sql` | Exact lookup, historical order/customer reads and shared access explanations. |
| `supabase/migrations/20261007010300_admin_support_cases.sql` | Cases/events, attention queue, read audit and bounded notes/redaction. |
| `supabase/migrations/20261007010400_commerce_eligibility_policy.sql` | Versioned payment eligibility and full-source projection rules. |
| `supabase/migrations/20261007010500_support_verification.sql` | Trusted verifier registry, observations, diagnosis leases and fencing. |
| `supabase/migrations/20261007010600_commerce_reconciliation.sql` | Bound financial fact upserts, shared transactional reconciliation and legacy writer guards. |
| `supabase/migrations/20261007010700_commerce_event_recovery.sql` | Inbox claim/complete/retry and bounded canonical reconciliation jobs. |
| `supabase/migrations/20261007010800_support_proposals.sql` | Exact proposal construction, canonical effects digest and expiry. |
| `supabase/migrations/20261007010900_support_approvals.sql` | Human approval, invalidation and current authority checks. |
| `supabase/migrations/20261007011000_support_execution.sql` | Approved commit, idempotency, receipts and atomic audit/source/projection updates. |
| `supabase/migrations/20261007011100_support_postcheck.sql` | Authorised resolver post-checks and durable verification results. |
| `supabase/migrations/20261007011200_support_operator.sql` | Registered operator attestation and shared-writer parity. |
| `supabase/migrations/20261007011300_support_operations.sql` | Retention enforcement and private aggregates. |
| `supabase/migrations/20261007011400_support_refund_commands.sql` | Separate owner-only refund grants/gate, immutable proposals/approvals and durable payment reservations. |
| `supabase/migrations/20261007011500_support_refund_submission.sql` | Trusted dispatch claims, append-only provider results, bounded retry eligibility and financial recovery. |
| `supabase/test-fixtures/admin-support.sql` | Rollback-only synthetic accounts, orders, releases, grants and approved policies. |
| `supabase/tests/database/26_admin_support_access.test.sql` through `38_admin_refunds_recovery.test.sql` | Support invariants plus suites 36–38 for refund authority, submission and recovery. |
| `WEB/src/lib/admin/support/{contracts,decode,query,digest,redaction}.ts` | Pure shared types, strict decoders, exact query handling, canonical comparisons and safe logs. |
| `WEB/src/lib/admin/support/{repository,actions,access,diagnosis,proposals,execution,postcheck}.ts` | Authenticated support adapters, access explanation and server orchestration. |
| `WEB/src/lib/admin/support/refunds/{contracts,policy,repository,service,messages}.ts` | Exact refund DTOs, amount/capacity decisions, protected DB adapters, dispatch coordination and result copy. |
| `WEB/src/lib/payments/refund-submission.ts` | Trusted server-only restricted-key Stripe create/refund recovery adapter. |
| `WEB/src/lib/payments/reconciliation/{contracts,policy,binding,stripe-provider,verifier,repository,service,events,side-effects}.ts` | Shared policy, immutable binding, provider reads, trusted observation persistence and lifecycle reconciliation. |
| `WEB/src/components/admin/support/{SupportSearch,SupportQueue,CustomerWorkspace,OrderWorkspace,AccessExplanation,SupportCases,SupportTimeline,ProviderDiagnosis,RepairPreview,RepairResult}.tsx` | Functional support journey using existing admin components; no visual redesign. |
| `WEB/src/app/admin/support/{page,loading,error}.tsx`, `customers/[userId]/page.tsx`, `orders/[orderId]/page.tsx` | Protected support routes and explicit degraded states. |
| `WEB/src/app/api/admin/support/{lookup,diagnose,prepare,approve,execute,case}/route.ts`, `operations/[operationId]/route.ts` | Same-origin POST commands and private repair receipt retrieval. |
| `WEB/src/app/api/admin/support/refunds/{prepare,approve,submit}/route.ts`, `refunds/operations/[operationId]/route.ts` | Separate owner-only refund commands/status; no client-supplied provider request or authoriser. |
| `WEB/src/components/admin/support/{RefundPreview,RefundResult}.tsx`, `WEB/tests/e2e/admin-support-refunds.spec.ts` | Functional fixed-amount refund review, approval/submission and outcome recovery. |
| `WEB/scripts/{admin-support-operator,admin-support-concurrency,commerce-reconcile}.mjs` | Restricted database operation, race/fault rehearsal and bounded on-demand event recovery. |
| `WEB/tests/admin/support-*.test.mjs`, `WEB/tests/payments/reconciliation-*.test.mjs` | Pure contracts, provider/policy, coordinator and error/side-effect tests. |
| `WEB/tests/fixtures/support.mjs`, `WEB/tests/e2e/support-admin-fixtures.ts`, `WEB/tests/e2e/admin-support-{inspection,diagnosis,repair,privacy}.spec.ts` | Synthetic deterministic fixtures and authenticated workflow checks. |

Modify existing admin contracts/context/shell/team controls, payment fulfilment/repository/webhook, customer order refresh, generated database types, test runner/package scripts and `.github/workflows/web-ci.yml` only where a task names their integration responsibility. Preserve existing customer ownership restrictions, native compatibility and Phase 2 resolver/publication contracts.

## Contracts used across tasks

Define these types in the named `contracts.ts` modules before dependent tasks. Use existing `Result<T>` and `AdminCode` from admin contracts; extend their error union with `STALE`, `RATE_LIMITED` and `OUTCOME_UNKNOWN` rather than returning untyped exceptions. `SupportRead<T>` timestamps the read, while an observation separately timestamps provider verification.

```ts
export type Mode = "test" | "live";
export type SupportStage = "disabled" | "inspection" | "diagnosis" | "repair";
export type SupportPermission = "support.read" | "support.case.write"
  | "support.provider.inspect" | "support.repair.prepare"
  | "support.repair.approve" | "support.repair.execute"
  | "support.refund.prepare" | "support.refund.approve" | "support.refund.execute";
export type LookupQuery = {kind:"email"|"user_id"|"support_reference";value:string}
  | {kind:"provider_id";value:string;accountId:string;mode:Mode};
export type LookupResult = {status:"found";target:{userId:string|null;orderId:string|null;ownerPrincipal:string|null}}
  | {status:"not_found"|"unconfirmed"|"ambiguous"};
export type SupportRead<T> = {value:T;checkedAt:string;complete:boolean;resolverVersion:string|null};
export type Binding = {orderId:string;userId:string|null;ownerPrincipal:string;
  collectionId:string;releaseId:string;sessionId:string|null;accountId:string;mode:Mode;
  expectedCapturedMinor:number|null;currency:string|null;manifestHash:string|null;
  refundPolicyVersion:string|null;accessPolicyVersion:string|null;version:number};
export type RefundFact = {id:string;paymentIntentId:string;chargeId:string;
  amountMinor:number;currency:string;status:"pending"|"requires_action"|"succeeded"|"failed"|"canceled";
  occurredAt:string};
export type DisputeFact = {id:string;paymentIntentId:string;chargeId:string;
  amountMinor:number;currency:string;status:string;classification:"inquiry"|"formal"|"unknown";
  deadline:string|null};
export type FinancialFacts = {accountId:string;mode:Mode;sessionId:string|null;
  paymentIntentId:string|null;chargeId:string|null;capturedMinor:number|null;currency:string|null;
  paymentState:"unpaid"|"processing"|"paid"|"failed"|"unknown";
  paidAt:string|null;refunds:RefundFact[];disputes:DisputeFact[]};
export type ProviderObservation = {id:string;orderId:string;jobId:string;fence:number;
  facts:FinancialFacts;complete:boolean;blockers:string[];verifiedAt:string;
  apiVersion:string;materialDigest:string};
export type EligibilityPolicy = {id:string;approved:boolean;version:string;
  pendingRefund:"retain";partialRefund:"retain";fullRefund:"ineligible";
  inquiry:"retain";formalOpen:"hold"|"retain";formalLost:"ineligible";
  duration:"indefinite"|"fixed";fixedSeconds:number|null};
export type Eligibility = {state:"eligible"|"ineligible"|"blocked";reasons:string[];
  validFrom:string|null;expiresAt:string|null};
export type AccessExplanation = {collectionId:string;publicationId:string|null;
  resolverVersion:string;dependencyToken:string;effective:"active"|"denied"|"unavailable";
  originalRecipeIds:string[];additionRecipeIds:string[];contentHoldRecipeIds:string[];
  sources:{id:string;kind:"stripe_purchase"|"native_legacy"|"support_grant"|"promotional";
    originReleaseId:string;eligible:boolean;reason:string|null;
    validFrom:string;expiresAt:string|null;policyVersion:string|null}[]};
export type RepairEffect = {sourceId:string;beforeEligible:boolean|null;afterEligible:boolean;
  beforeEffective:"active"|"denied";afterEffective:"active"|"denied";
  recipeIds:string[];notification:"none"|"purchase_confirmation"};
export type RepairProposal = {id:string;orderId:string;userId:string;ownerPrincipal:string;binding:Binding;
  kind:"reconcile_order"|"rebuild_projection";observationId:string;materialDigest:string;
  expectedOrderVersion:number;dependencyToken:string;policyVersion:string;
  effects:RepairEffect[];blockers:string[];digest:string;expiresAt:string;reason:string};
export type RepairCommand = {operationId:string;proposalId:string;expectedDigest:string;
  caseId:string|null};
export type Approval = {id:string;proposalId:string;digest:string;humanAuthoriser:string;
  approvedAt:string;expiresAt:string;channel:"web"|"operator"};
export type CommerceReceipt = {operationId:string;orderId:string;
  state:"applied"|"already_satisfied";effects:RepairEffect[];auditId:string;committedAt:string;
};
export type RepairReceipt = CommerceReceipt & {proposalId:string;
  verification:"pending"|"verified"|"unavailable"};
export type OperationStatus = {operationId:string;
  state:"checking"|"blocked"|"failed_no_commit"|"outcome_unknown";reasonCode:string|null}
  | RepairReceipt;
export type RefundReason = "requested_by_customer" | "duplicate";
export type RefundPrepareInput = {orderId:string;caseId:string|null;
  amount:{kind:"full_remaining"}|{kind:"partial";amountMinor:number};
  providerReason:RefundReason;internalReason:string};
export type RefundCapacity = {capturedMinor:number;successfulMinor:number;pendingMinor:number;
  reservedMinor:number;availableMinor:number;blockers:string[]};
export type RefundProposal = {id:string;orderId:string;ownerPrincipal:string;binding:Binding;
  paymentIntentId:string;chargeId:string;observationId:string;expectedOrderVersion:number;
  amountMinor:number;currency:string;providerReason:RefundReason;internalReason:string;
  capacity:RefundCapacity;policyVersion:string;dependencyToken:string;
  effects:RepairEffect[];blockers:string[];digest:string;expiresAt:string};
export type RefundCommand = {operationId:string;proposalId:string;expectedDigest:string;caseId:string|null};
export type RefundApproval = Omit<Approval,"channel"> & {channel:"web"};
export type RefundIntentState = "reserved"|"dispatching"|"outcome_unknown"|"submitted"|"rejected";
export type RefundReceipt = {operationId:string;proposalId:string;orderId:string;
  amountMinor:number;currency:string;state:RefundIntentState;providerRefundId:string|null;
  providerStatus:RefundFact["status"]|null;reconciliation:"not_started"|"pending"|"applied"|"unavailable";
  auditId:string;reasonCode:string|null;firstDispatchedAt:string|null;checkedAt:string};
export type RefundDispatchClaim = {operationId:string;fence:number;expiresAt:string};
// Server-private contract; never serialise provider key/request to an admin DTO.
export type RefundIntent = {command:RefundCommand;approvalId:string;humanAuthoriser:string;
  accountId:string;mode:Mode;paymentIntentId:string;chargeId:string;amountMinor:number;currency:string;
  providerReason:RefundReason;providerKey:string;requestDigest:string;state:RefundIntentState;
  reservedMinor:number;firstDispatchedAt:string|null;retryUntil:string|null;fence:number};
export type RefundSubmissionResult = {kind:"known";fact:RefundFact}
  | {kind:"unknown";code:string}|{kind:"not_executed";code:string};
export type CaseState = "open"|"investigating"|"waiting_on_customer"|"waiting_on_provider"|"resolved";
export type CaseCommand = {operationId:string;caseId:string|null;orderId:string|null;
  userId:string|null;expectedVersion:number|null;action:"create"|"append_note"|"amend_note"|"set_state";
  category:"missing_access"|"unresolved_payment"|"account_mismatch"|"refund_followup"
    |"dispute_followup"|"duplicate_purchase"|"content_availability";
  note:string|null;amendsEventId:string|null;state:CaseState;resolutionReference:string|null};
export type SupportCase = {id:string;orderId:string|null;userId:string|null;state:CaseState;version:number};
export type TimelineEvent = {id:string;kind:"provider"|"case"|"approval"|"attempt"|"commit"|"postcheck";
  at:string;code:string;actorLabel:string|null;operationId:string|null;note:string|null};
export type HistoryPage = {events:TimelineEvent[];nextCursor:string|null};
export type SupportRefundDto = Omit<RefundFact,"id"|"paymentIntentId"|"chargeId"> & {providerRefundId:string|null};
export type SupportDisputeDto = Omit<DisputeFact,"id"|"paymentIntentId"|"chargeId"> & {providerDisputeId:string|null};
export type OrderSupportDto = {orderId:string;userId:string|null;ownerPrincipal:string;collectionId:string;
  binding:Binding|null;supportReference:string;historicalComplete:boolean;
  historical:{releaseId:string;manifestHash:string|null;refundPolicyVersion:string|null;
    accessPolicyVersion:string|null;expectedCapturedMinor:number|null;currency:string|null};
  historicalTitle:string|null;currentTitle:string|null;
  attemptState:"creating"|"creation_unknown"|"open"|"processing"|"review"|"closed";
  accountState:"active"|"unconfirmed"|"closed"|"disabled"|"unavailable";
  paymentState:FinancialFacts["paymentState"];capturedMinor:number|null;currency:string|null;
  successfulRefundMinor:number|null;refunds:SupportRefundDto[];disputes:SupportDisputeDto[];
  providerVerifiedAt:string|null;access:AccessExplanation|null;history:HistoryPage};
export type CustomerSupportDto = {userId:string;email:string;confirmed:boolean;available:boolean;
  orders:{orderId:string;supportReference:string;mode:Mode;collectionId:string;historicalTitle:string|null}[];
  cases:SupportCase[];nextCursor:string|null};
export type SupportQueuePage = {items:{orderId:string|null;caseId:string|null;supportReference:string|null;
  mode:Mode;reasonCode:string;observedAt:string}[];nextCursor:string|null};
export type VerifiedEvent = {id:string;type:string;accountId:string;mode:Mode;
  apiVersion:string;objectId:string;payloadHash:string};
```

`EligibilityPolicy` describes the initial supported approved mapping, not a migration default for all old orders. Other historical policy versions remain readable and blocked until explicitly mapped. “Indefinite” is a technical term value, not permission to advertise lifetime access. The database is authoritative for digests/approval/eligibility; TypeScript helpers validate and preview the same contract, with cross-language golden tests.

`RepairEffect.sourceId` is the stable purchase `source_id` (original order ID), not the generated `access_sources.id`; kind `stripe_purchase` and origin release are bound by the proposal's `binding`. A new row's UUID is recorded in committed audit references. Proposal material includes the complete frozen binding and excludes its own digest, observation/job IDs and incidental verification time. Current policy/access dependency versions and exact consequences remain material.

Put `Mode`, `Binding`, refund/dispute/financial/observation types, `EligibilityPolicy`, `Eligibility`, `RepairEffect`, `CommerceReceipt` and `VerifiedEvent` in payments reconciliation contracts. Support contracts import/re-export those types and own the remaining workspace types; use type-only imports. Define the refund-specific types in `support/refunds/contracts.ts` with type-only imports from these modules, then re-export the public refund DTOs from support contracts. Keep `RefundIntent`, its key/body and trusted dispatch contracts server-private; they are not part of the browser status response. For callers without provider inspection, `OrderSupportDto.binding` is null and provider refund/dispute IDs are null, while its minimal historical/financial/access summaries remain available. Do not insert fake provider IDs to satisfy a non-nullable decoder.

Private records: `support_settings`, `support_permission_grants`, `support_rate_buckets`, `support_cases`, `support_case_events`, `support_note_texts`, `support_read_audit`, `commerce_access_policies`, `commerce_verifier_principals`, `commerce_verification_jobs`, `commerce_provider_observations`, `support_repair_proposals`, `support_approvals`, `support_operations`, `support_audit`, `support_postchecks`, `support_operator_principals`, `support_operator_attestations`, `support_refund_proposals`, `support_refund_approvals`, `support_refund_intents`, `support_refund_attempts`, `support_refund_results`. Reuse the existing commerce inbox/outbox. Do not put a customer UUID into recipe-labelled admin audit fields.

Schema field map for the owning migrations: all IDs are UUIDs unless a provider/login/version/digest field is explicitly text; all times are `timestamptz`; use identity/version constraints below, not unchecked generic JSON storage.

| Record | Required fields and invariants |
| --- | --- |
| Settings/grants/budgets | Singleton stage; nullable approved retention durations; grants `(user_id,permission)` with active/granter/reason/expiry; rate bucket `(actor,kind,minute)` unique with atomic count. |
| Cases/events/note text | Case target order/user/principal, category/state/version/created_by; immutable event ID/case/action/actor/time/amends_event; separately redactable text keyed by event, redacted_at/by/reason. Order target and user/principal must agree. |
| Read audit | Actor, safe target reference, action/outcome/code, correlation ID/time; no search term, DTO or note text. |
| Policy versions | Immutable `(refund_policy_version,access_policy_version)` mapping to supported rules, approved_by/at/evidence; no implicit fallback or automatic legacy backfill. |
| Verifier/operator registry | Unique actual DB `session_user` login name, active flag, allowed purpose/capabilities, grant provenance; no credentials stored in rows. |
| Verification jobs | ID/order/requested_by/purpose/operation/proposal, expected order version, state, lease deadline, monotonically increasing bigint fence, failure code and safe result; one live lease per order. |
| Observations | ID/job/order/fence, normalised facts JSON validated to `FinancialFacts`, completeness/blockers, material digest, API version, verifier login and DB verification time; immutable, bound to exact job/purpose. |
| Proposals/approvals | Immutable proposal contract plus preparer/time; approval proposal/digest/human/channel/evidence/expiry; no UPDATE of approved effects or authoriser. |
| Operations/audit | Globally unique operation UUID; requesting actor/executor/type/attestation, proposal/approval, canonical request digest, state/receipt/commit time; append-only audit with exact before/after source/projection references. Same UUID/different command rejected. |
| Post-checks | Operation/observed dependency/time, expected versus actual effect digest, verification result and safe failure code; append-only, never a client-declared verified flag. |
| Refund proposals/approvals | Exact `RefundProposal` with fixed amount and complete binding; immutable approval digest/human/web channel/expiry; five-minute maximum lifetime. |
| Refund intents/attempts/results | Unique operation/request digest and stable provider key; payment-scoped unresolved reservation; first dispatch/retry deadline/fence; append-only attempts and strongly bound provider facts. Retain pending/unknown records through retention and actor revocation. Separate provider status from local reconciliation. |

Reference financial history with `ON DELETE RESTRICT` or retained stable principals, never cascade from customer Auth deletion. Live grants require existing Auth membership; historical authoriser/executor references remain auditable under the approved retention policy. Do not create all future write functions early: install schema foundations in Task 3, then add each task's narrow contract and its grants when tested.

For each Node test snippet below, include `import test from "node:test"; import assert from "node:assert/strict";`, import the named function from its task's file, and import fixture helpers from `../fixtures/support.mjs`. Task 21 also imports `readdirSync` from `node:fs`. SQL suites start `BEGIN`, include only the known fixture, set synthetic actor/assurance through fixture helpers, declare the actual pgTAP assertion count, call `finish()` and `ROLLBACK`. Fixture helpers accept only synthetic identities; no production context spoofing.

Each task starts by testing its new outcome before implementing it. If an existing integrated contract already passes a new regression, preserve that coverage and record it; do not break working code to manufacture a red test. The task's genuinely new DB/route/provider behaviour must still be exercised before its implementation. Stage only the exact listed files or relevant hunks, inspect the index, and create the named scoped commit after checks; never use `git add .`.

## Task 1: Establish the integrated baseline, ledger and isolated harness

**Depends on:** prior Phase 1/2 completion for domain implementation; focused planning/harness work can proceed independently. **Owns:** A1 and prerequisite evidence.

**Files:** Modify `WEB/scripts/test-admin-db.mjs`; create `WEB/tests/admin/support-runner.test.mjs`, `docs/implementation/admin-support/GATES.md`, `POLICY-MATRIX.md`, `ops/ADMIN-SUPPORT.md`. Own ignored scratch `.superpowers/sdd/2026-10-07-admin-support/` only.

**Interfaces:** Preserve Phase 2 runner `selectAdminSql(names:string[],all?:boolean):string[]`, safe explicit filenames and `--all`. Export pure `bundleAdminSql(source:string,knownIncludes:Map<string,string>):string` with no import-time execution; runtime supplies only the hardcoded known fixture map. Add owned local project `mch-admin-support-test`. `DBTEST` below is shorthand, not an executable shell alias: from WEB run `node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-07-admin-support/local` followed by the named suite.

- [ ] Read current instructions/spec/prior-phase ledgers, invoke `$unlazy`, inspect attachments/index/status and select a suitable clean managed worktree. If none is suitable, create one from the verified integrated commit on `codex/admin-support-phase-three`; do not move dirty Phase 1 files. Record current main/integrated SHAs and actual prior-phase evidence in A1–A19.
- [ ] Write and run `node --test tests/admin/support-runner.test.mjs`; expect failure until support fixtures/projects are accepted:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { selectAdminSql,bundleAdminSql } from "../../scripts/test-admin-db.mjs";
test("support suites are selected without selecting arbitrary paths",()=>{
  assert.deepEqual(selectAdminSql(["26_admin_support_access.test.sql","../../secret.sql"]),
    ["26_admin_support_access.test.sql"]);
});
test("known support fixtures bundle but an unknown include is refused",()=>{
  const fixtures=new Map([["../../test-fixtures/admin-support.sql","select 1;"]]);
  assert.equal(bundleAdminSql("\\ir ../../test-fixtures/admin-support.sql",fixtures),"select 1;");
  assert.throws(()=>bundleAdminSql("\\ir ../../unknown.sql",fixtures));
});
```

- [ ] Extend the integrated runner's known include map with `supabase/test-fixtures/admin-support.sql`; reject unresolved includes, non-filenames and unknown/remote workdirs. Allocate free distinct ports 54360–54369, API 54361/DB 54362, in the ignored owned workdir. Reset only that owned project; do not reset default or prior-phase stacks. Load test configuration securely without printing keys.
- [ ] Populate the policy matrix with the design's pending/partial/full refund, inquiry/formal/won/lost dispute, duration, identity recovery and note retention choices. Record each as accepted, rejected or awaiting owner decision with evidence/version; absent approval keeps the applicable live gate unmet. Record the owner's confirmed in-panel refund scope and distinguish it from the proposed security defaults and still-pending business policies. Feature approval is not a customer-specific refund approval. No production lookup/mutation is necessary to initialise the ledger.
- [ ] Run the runner regression and existing admin/commerce baseline in the owned stack. Distinguish inherited failures from Phase 3 regressions. Commit the named harness/ledger/runbook files with `test: establish support admin baseline and gates`.

## Task 2: Define support contracts, strict decoding and material digests

**Depends on:** 1. **Owns:** A4/A6/A11 contract foundations.

**Files:** Create `WEB/src/lib/admin/support/{contracts,decode,query,digest,redaction}.ts`, `WEB/src/lib/payments/reconciliation/contracts.ts`, `WEB/tests/fixtures/support.mjs`, `WEB/tests/admin/support-{contracts,digest,redaction}.test.mjs`; modify existing admin `contracts.ts`/`rpc.ts` error unions/maps.

**Interfaces:** Export the contracts above; `parseLookup(input:unknown):LookupQuery`; `decodeProposal(input:unknown):RepairProposal`; `decodeOperation(input:unknown):OperationStatus`; `canonicalSupport(value:unknown):string`; `materialFactsDigest(facts:FinancialFacts):string`; `safeSupportLog(input:unknown):{operationId?:string;supportReference?:string;code?:string}`. Pure files must not import `server-only` or runtime path aliases into Node tests.

- [ ] Add complete synthetic fixture helpers, with valid UUIDs and a test-mode bound observation:

```js
export const ORDER="f3000000-0000-4000-8000-000000000001";
export const USER="f3000000-0000-4000-8000-000000000002";
export function paidFacts(){return {accountId:"acct_support_test",mode:"test",sessionId:"cs_test_support",
  paymentIntentId:"pi_support",chargeId:"ch_support",capturedMinor:1500,currency:"usd",
  paymentState:"paid",paidAt:"2026-10-01T10:00:00Z",refunds:[],disputes:[]};}
export function approvedPolicy(){return {id:"support-fixture-policy",approved:true,version:"fixture-v1",
  pendingRefund:"retain",partialRefund:"retain",fullRefund:"ineligible",inquiry:"retain",
  formalOpen:"hold",formalLost:"ineligible",duration:"indefinite",fixedSeconds:null};}
```

- [ ] Write/run `node --experimental-strip-types --test tests/admin/support-contracts.test.mjs tests/admin/support-digest.test.mjs` and expect missing exports:

```js
test("malformed success is rejected rather than decoded as empty",()=>{
  assert.throws(()=>decodeProposal({id:"x",effects:[]}));
});
test("provider page ordering is not a material change",()=>{
  const facts=paidFacts();
  const a={id:"re_a",paymentIntentId:"pi_support",chargeId:"ch_support",amountMinor:100,
    currency:"usd",status:"succeeded",occurredAt:"2026-10-02T10:00:00Z"};
  const b={...a,id:"re_b",amountMinor:200};
  assert.equal(materialFactsDigest({...facts,refunds:[a,b]}),materialFactsDigest({...facts,refunds:[b,a]}));
  assert.notEqual(materialFactsDigest(facts),materialFactsDigest({...facts,capturedMinor:1600}));
});
```

- [ ] Implement schema validation of every nested field/enum/UUID/integer/nullable value; reject unknown command keys that could smuggle actor/evidence/policy overrides. Decode errors as `UNAVAILABLE`, not empty data. Canonicalise object keys and sort refund/dispute sets by stable identity; reject conflicting duplicate identities. Preserve meaningful occurrence times/amounts/statuses, but omit observation ID, job/fence and verification time from the material-facts digest. Use SHA-256 over canonical JSON; the DB recomputes its own authoritative digest.
- [ ] Implement an allowlist logger with UUID operation IDs, bounded validated support-reference shape and safe uppercase reason codes; invalid values are omitted even under a permitted key. Do not redact by trying to recognise every possible secret field. Add tests that emails, raw Stripe error objects, URLs, notes and token-shaped values never survive. Run named unit tests and typecheck. Commit listed contracts/helpers/tests with `feat: define strict support and reconciliation contracts`.

## Task 3: Add support authority, stages and private storage

**Depends on:** 1–2. **Owns:** A2/A11.

**Files:** Create migration `20261007010100_admin_support_schema.sql`, fixture `admin-support.sql`, suite `26_admin_support_access.test.sql`; modify admin contracts/context, `AdminShell.tsx`, team role assignment validation and generated `WEB/src/lib/types/database.ts`.

**Interfaces:** `private.support_assert(p_permission text,p_stage text) RETURNS uuid`; `public.admin_support_context() RETURNS jsonb`; owner-only `admin_support_grant(p_command jsonb)` and `admin_support_revoke(p_command jsonb)`; `support_settings.stage` independent of recipe publication stage. Add shared DB `admin_console_settings.console_enabled` as the authoritative master switch. Extend role union/check constraints with `support_viewer` and `support_operator`; separate `support_permission_grants` supports explicitly delegated capabilities. Owner gets the reviewed support set, support viewer only read, operator read/case/inspect/prepare/execute; approval initially owner only. Define private `support_consume_budget(p_actor uuid,p_kind text) RETURNS boolean` here for later wrappers.

- [ ] Seed owner, recipe-only editor, support viewer/operator and ordinary customer in rollback-only fixtures. Write SQL denial tests and run `DBTEST 26_admin_support_access.test.sql`; expect support functions absent:

```sql
SELECT throws_ok($$SELECT public.admin_support_context()$$,'42501','ADM_MFA_REQUIRED',
  'aal1 cannot read support context containing customer capabilities');
SELECT throws_ok($$SELECT private.support_assert('support.read','inspection')$$,
  '42501','ADM_DENIED','recipe editor has no support permission');
```

- [ ] Add private tables with RLS/default-privilege revocation and fixed-path security-definer wrappers. `support_assert` derives `auth.uid()`, verifies `aal2`, active current membership, current support grant and stage under compatible shared locks. Never seed real identities. Ensure recipe role mappings do not imply support read; support-only roles do not acquire recipe read. Grant/revoke requires current owner/team authority, reason, operation UUID and audit.
- [ ] Adapt the lightweight admin shell/context to admit explicitly authorised support-only staff without requiring recipe inspection. Return only the actor's own minimal context before MFA handling; no customer details at `aal1`. Update recipe/collection/support authority checks to respect DB `console_enabled`; the server environment switch can further deny but cannot be the sole DB security gate. Recipe stage can be disabled while support inspection is independently enabled. Navigation/default landing use actual capabilities. DB tests pin master disable, independent stages, expired grants, stale JWT role metadata, revocation and protected owner membership.
- [ ] Define `private.support_canonical_json(p_value jsonb) RETURNS text` for compact recursive key-sorted JSON with fixed `C` key ordering and no incidental whitespace; preserve arrays after explicit domain-set sorting. Never hash raw `jsonb::text` and assume it matches JavaScript JSON. Add DB/Node golden vectors before observation/proposal digests depend on it. Initialise DB-backed per-minute rate buckets with atomic increments; only internal wrappers can supply their derived actor.
- [ ] Generate types against the owned stack and review the diff; run suite 26 and existing console/team authority tests. Commit exact migration/fixture/type/admin files with `feat: add opt-in support admin authority`.

## Task 4: Implement exact lookup and historical order reads

**Depends on:** 2–3. **Owns:** A3/A4, Review Focus 1/5.

**Files:** Create migration `20261007010200_admin_support_reads.sql`, suite `27_admin_support_reads.test.sql`, `WEB/src/lib/admin/support/repository.ts`, `WEB/tests/admin/support-query.test.mjs`; modify generated database types.

**Interfaces:** `admin_support_lookup(p_query jsonb)`, `admin_support_customer(p_user_id uuid,p_cursor text)`, `admin_support_order(p_order_id uuid)` return strict `SupportRead` envelopes. TS `lookupSupport(query:LookupQuery):Promise<Result<SupportRead<LookupResult>>>`, `loadSupportOrder(orderId:string):Promise<Result<SupportRead<OrderSupportDto>>>` and `loadSupportCustomer(userId:string,cursor:string|null):Promise<Result<SupportRead<CustomerSupportDto>>>` use authenticated `adminRpc`. Use the fixed DTO fields above, not raw snapshot JSON; permission-redact provider identity fields without misrepresenting missing historical data.

- [ ] Write/run `node --experimental-strip-types --test tests/admin/support-query.test.mjs`; preserve any validation already delivered by Task 2. Also run suite 27 before adding the read functions; its new lookup/order RPC tests must fail for the absent implementation. Pin exact email preservation:

```js
test("lookup keeps plus and dot identity semantics",()=>{
  assert.equal(parseLookup({kind:"email",value:"  first.last+buyer@example.com  "}).value,
    "first.last+buyer@example.com");
  assert.throws(()=>parseLookup({kind:"email",value:"buyer@example.com",approved_by:"attacker"}));
});
```

- [ ] Implement parameterised exact equality using established Auth normalisation, never `LIKE`/substring/provider-specific address rewriting. Match provider IDs only with explicit account/mode and `support.provider.inspect`. UUID and support-reference paths use separate validated predicates. Detect multiple results as ambiguous; unavailable stays `Result` failure. Cap email 320 characters, other identifiers 255, pages 25, cursor opaque/validated.
- [ ] Read original order snapshot/manifests; current collection title/price may be supplementary but never replace missing historical fields. Return null/unknown for absent legacy terms. Support closed/null-Auth owners by order principal; no email-based owner reconstruction or transfer. Filter retained fields according to retention policy and redact provider identifiers unless separately permitted.
- [ ] In SQL suite 27, test `%`, `_`, Unicode, plus/dot distinctions, case normalisation, ambiguity, unconfirmed users, unavailable identity query, pagination, foreign-account provider IDs, closed/recreated accounts, changed current offer/title and separate test/live results. Prove no query touches children/chats/preferences. Run suite/unit tests and commit listed files with `feat: add exact customer and purchase support reads`.

## Task 5: Explain access through the completed Phase 2 resolver

**Depends on:** 4 and verified Phase 2 access integration. **Owns:** A5/A8/A10.

**Files:** Extend support reads migration with a new additive migration if already applied, suite 27 and support contracts/repository; create `WEB/src/lib/admin/support/access.ts`, `WEB/tests/admin/support-access.test.mjs`. Modify Phase 2 `WEB/src/lib/collections/customer-state.ts` only to expose/reuse a server-safe internal explanation adapter.

**Interfaces:** `private.support_access_explanation(p_user_id uuid,p_collection_id uuid) RETURNS jsonb`; `loadSupportAccess(orderId:string):Promise<Result<SupportRead<AccessExplanation>>>`. Reuse Phase 2 private `collection_has_access`/`recipe_access_release` and the same underlying source evaluator; public customer wrappers continue deriving their own `auth.uid()`. The support wrapper is separately authorised and never impersonates the target.

- [ ] Seed release A with five recipes, successor B with three additions, another independent purchase/native source and a withdrawn recipe. Write SQL assertions and run suite 27 expecting missing explanation:

```sql
SELECT is(jsonb_array_length(private.support_access_explanation(
  'f3000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000010')
  ->'additionRecipeIds'),3,'approved additions explained from the original source');
```

- [ ] Return original members, approved additions, current publication/resolver/dependency token, source kinds/validity/reasons and content holds. Original-only or unknown legacy mappings do not receive broader successor rights. A fully refunded A supplies none; valid B/native still composes. Preserve revoked/expired history and do not bridge disjoint validity intervals. A disabled/deleted account cannot be restored by reading the explanation.
- [ ] Add a pure presentation mapper `summariseSupportAccess(value:AccessExplanation):{effective:string;sourceCount:number;originalCount:number;additionCount:number}` that never turns unavailable into denied/zero. Test unavailable handling and no duplicated recipe count. Check agreement with customer library, recipe body, print and protected asset decisions, including active corrections and content holds. Commit exact resolver adapter/read/test changes with `feat: explain purchase sources and collection additions`.

## Task 6: Add bounded support cases, read audit and attention queue

**Depends on:** 3–5. **Owns:** A2/A15, note-retention prerequisite.

**Files:** Create migration `20261007010300_admin_support_cases.sql`, suite `28_admin_support_cases.test.sql`, `WEB/tests/admin/support-cases.test.mjs`; extend support contracts/repository and runbook.

**Interfaces:** `admin_support_case(p_command jsonb) RETURNS jsonb` returns `SupportCase`; `admin_support_cases(p_order_id uuid,p_cursor text)`; `admin_support_queue(p_mode text,p_cursor text)`; `admin_support_history(p_order_id uuid,p_cursor text)`. Owner-only note redaction command `admin_support_redact_note(p_event_id uuid,p_reason text,p_operation_id uuid)`. All case writes require `support.case.write` and a case/order owner-consistency check.

- [ ] Write suite 28 and run it expecting absent case functions. Prove resolving a case does not change access:

```sql
CREATE TEMP TABLE support_fixture_before AS SELECT count(*) AS source_count FROM private.access_sources;
CREATE TEMP TABLE support_fixture_case AS SELECT public.admin_support_case(jsonb_build_object(
  'operationId','f3000000-0000-4000-8000-000000000050','caseId',NULL,
  'orderId','f3000000-0000-4000-8000-000000000001','userId','f3000000-0000-4000-8000-000000000002',
  'expectedVersion',NULL,'action','create','category','missing_access','note',NULL,
  'amendsEventId',NULL,'state','open','resolutionReference',NULL)) AS result;
SELECT public.admin_support_case(jsonb_build_object(
  'operationId','f3000000-0000-4000-8000-000000000051',
  'caseId',(SELECT result->>'id' FROM support_fixture_case),
  'orderId','f3000000-0000-4000-8000-000000000001','userId','f3000000-0000-4000-8000-000000000002',
  'expectedVersion',(SELECT (result->>'version')::integer FROM support_fixture_case),
  'action','set_state','category','missing_access','note',NULL,
  'amendsEventId',NULL,'state','investigating','resolutionReference',NULL));
SELECT is((SELECT count(*) FROM private.access_sources),
  (SELECT source_count FROM support_fixture_before),'case status has no entitlement side effect');
```

- [ ] Implement the five design states and seven categories with optimistic versions, operation UUID/digest replay and append-only activity. `amend_note` must reference a same-case event; no silent edits. Limit notes to 2,000 characters and reasons to 1–1,000. Reject contradictory account/order links and foreign-case repair references. Resolving requires a post-check receipt reference or a nonempty recorded remaining action; reopening retains history.
- [ ] Keep note text in separately redactable storage linked from immutable case events. Require owner-approved `note_retention_days` before enabling new personal notes in production; unset disables notes with a clear code, without blocking inspection. Redaction clears text and appends actor/reason/time without storing the original text in audit JSON. Audit lookup/detail reads with actor, target support reference/correlation and outcome only, never the searched email or returned DTO.
- [ ] Build a paginated local queue of review orders, pending/failed jobs, verified mismatch observations, unresolved cases and known adjustment follow-up with reason/observed time. Ordinary unpaid open sessions are not automatic failures; queue reads never scan Stripe. Pin mode/cursor consistency and cross-case permission checks. Run suite 28/unit decoder tests; commit named files with `feat: add private support cases and exception queue`.

## Task 7: Deliver the protected inspection workflow

**Depends on:** 4–6. **Owns:** A2–A5/A15; increment 3A.

**Files:** Create support route pages/loading/error, components `SupportSearch`, `SupportQueue`, `CustomerWorkspace`, `OrderWorkspace`, `AccessExplanation`, `SupportCases`, `SupportTimeline`; support `actions.ts`; API `lookup`/`case` routes; E2E fixture and `admin-support-inspection.spec.ts`, `admin-support-privacy.spec.ts`.

**Interfaces:** POST `/api/admin/support/lookup` accepts only `LookupQuery`; POST `/case` accepts only `CaseCommand`. Response uses existing typed `Result` envelopes. Add `supportJson(result,status)` for `Cache-Control: private, no-store`, `Vary: Cookie`; `assertSupportOrigin(request):void` rejects missing/mismatched Origin for browser mutations. Server-rendered pages are dynamic/private and use authenticated readers.

- [ ] Write the owner and recipe-only denial browser test; run `npx playwright test tests/e2e/admin-support-inspection.spec.ts --project=chromium-desktop --workers=1` expecting missing route:

```ts
test("recipe editor cannot inspect a customer",async({page})=>{
  const fixture=await createSupportFixture("recipe_editor");
  try { await fixture.login(page); await page.goto(`/admin/support/orders/${fixture.orderId}`);
    await expect(page.getByText(fixture.customerEmail,{exact:true})).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("DENIED");
  } finally { await fixture.dispose(); }
});
```

- [ ] Implement `createSupportFixture(role)` in `support-admin-fixtures.ts`, with role values `owner`, `recipe_editor`, `support_viewer`, `support_operator`, `customer`; methods `login`, `dispose`, `revoke`, `closeCustomer`, `orderId`, `customerEmail`. Reuse existing local Auth/MFA mechanics but validate owned project/loopback/ports, never default to production or silently reuse default stacks. `dispose()` revokes fixture sessions/members and releases owned leases; retain immutable synthetic ledger/audit rows until the owned stack reset after the suite. Do not disable immutability triggers to delete them. Use unique scenario IDs and serial DB-backed browser execution because active owner membership is a singleton.
- [ ] Build the functional lookup→account/order→history journey with separate attempt/payment/refund/dispute/access/account states, original/current labels, source freshness and neutral errors. No provider/repair controls until later stage/capability checks pass. Email search stays in POST bodies; navigation uses opaque IDs. Use existing admin components and semantic accessible status elements; defer new visual design.
- [ ] Add no-store, unauthorised/aal1, current revocation, same-origin, direct API and telemetry tests. Spy on analytics/replay/network requests and verify support content never leaves the private surface. Pin unavailable lookup and historical unknown fields. Run inspection/privacy browser checks and existing admin access/privacy suite. Record 3A readiness separately from production enablement; commit named pages/components/tests with `feat: deliver customer purchase inspection workflow`.

## Task 8: Implement versioned eligibility without changing historical promises

**Depends on:** 2–5. **Owns:** A7–A10, Review Focus 3.

**Files:** Create migration `20261007010400_commerce_eligibility_policy.sql`, suite `29_admin_support_policy.test.sql`, `WEB/src/lib/payments/reconciliation/{policy,binding}.ts`, `WEB/tests/payments/reconciliation-policy.test.mjs`; extend policy matrix/fixtures.

**Interfaces:** `evaluatePurchase(input:{facts:FinancialFacts;binding:Binding;policy:EligibilityPolicy|null;accountActive:boolean;manualHold:boolean;nowMs:number}):Eligibility`; `validateBinding(binding:Binding,facts:FinancialFacts):string[]`; DB `private.commerce_evaluate_purchase(p_order_id uuid,p_observation_id uuid) RETURNS jsonb`. DB uses persisted verified observations and approved historical policies; callers cannot post a replacement policy. Keep eligibility separate from content availability.

- [ ] Write/run `node --experimental-strip-types --test tests/payments/reconciliation-policy.test.mjs`; expect absent evaluator. Add the failed-refund-plus-hold regression:

```js
test("a failed former full refund cannot clear an independent hold",()=>{
  const facts=paidFacts();
  facts.refunds=[{id:"re_full",paymentIntentId:"pi_support",chargeId:"ch_support",amountMinor:1500,
    currency:"usd",status:"failed",occurredAt:"2026-10-02T10:00:00Z"}];
  const result=evaluatePurchase({facts,binding:fixtureBinding(),policy:approvedPolicy(),
    accountActive:true,manualHold:true,nowMs:Date.parse("2026-10-07T10:00:00Z")});
  assert.equal(result.state,"ineligible"); assert.ok(result.reasons.includes("manual_hold"));
});
```

- [ ] Add the complete shared binding fixture, then implement policy transitions:

```js
export function fixtureBinding(){return {orderId:ORDER,userId:USER,ownerPrincipal:USER,
  collectionId:"f3000000-0000-4000-8000-000000000010",
  releaseId:"f3000000-0000-4000-8000-000000000011",sessionId:"cs_test_support",
  accountId:"acct_support_test",mode:"test",expectedCapturedMinor:1500,currency:"usd",
  manifestHash:"fixture-manifest",refundPolicyVersion:"fixture-refund-v1",
  accessPolicyVersion:"fixture-access-v1",version:1};}
```

Unpaid/processing is never eligible; missing/unsupported policy or incomplete binding blocks; successful unique refunds aggregate against captured total; holds/closure/expiry remain exclusions; inquiries and formal disputes remain distinct. An open formal dispute always blocks manual restoration, even if an approved historical policy retains existing access during review.
- [ ] Preserve each order's refund/access policy version and original occurrence times. Unknown legacy terms do not inherit a newly configured default. Add forward policy registry rows only for explicitly approved mappings with approver/evidence; immutable version records reject edits. Finite terms calculate exact boundaries from the approved origin, not repair time. Include zero-decimal currency, duplicate refund, invalid/negative/noninteger amount, mixed currency, won/lost dispute, duration gap and inactive-account tests.
- [ ] Implement the DB evaluator and compare SQL/TypeScript outputs using a fixture matrix of at least each condition in design section 9. No migration changes eligibility merely by installing policy code. Run suite 29 and policy unit tests; commit named files with `feat: evaluate purchase eligibility from approved policies`.

## Task 9: Retrieve complete, bound provider evidence

**Depends on:** 2/8. **Owns:** A6/A7/A9, Review Focus 2.

**Files:** Create `WEB/src/lib/payments/reconciliation/stripe-provider.ts`, `WEB/tests/payments/reconciliation-provider.test.mjs`; modify `WEB/src/lib/payments/stripe.ts` only for safe account/mode-scoped read-client selection/configuration; extend reconciliation contracts.

**Interfaces:** `ProviderReader` has `readCheckout(binding:Binding):Promise<Omit<FinancialFacts,"refunds"|"disputes">>`, `readRefundPage(binding,cursor:string|null):Promise<{items:RefundFact[];next:string|null}>`, `readDisputePage(binding,cursor:string|null):Promise<{items:DisputeFact[];next:string|null}>`. `readProviderFacts(binding:Binding,reader:ProviderReader):Promise<{facts:FinancialFacts;complete:boolean;blockers:string[]}>`; `createStripeReader(binding:Binding):ProviderReader` is server-only, while pagination/normalisation helpers remain injectable/pure for tests.

- [ ] Write/run provider unit tests expecting absent adapter. Use an explicit two-page test without real provider calls:

```js
test("a failed second refund page cannot count as complete",async()=>{
  let pages=0;
  const reader={readCheckout:async()=>{const {refunds,disputes,...base}=paidFacts();return base;},
    readRefundPage:async()=>{if(++pages===2)throw new Error("provider unavailable");
      return {items:[],next:"re_cursor"};},
    readDisputePage:async()=>({items:[],next:null})};
  const result=await readProviderFacts(fixtureBinding(),reader);
  assert.equal(result.complete,false); assert.ok(result.blockers.includes("refunds_incomplete"));
});
```

- [ ] Verify the actual credential/account relationship through the account API/registered direct-or-connected-account context; never trust a local label or posted account choice. Retrieve the stored session, PaymentIntent and successful captured charge, then check session/client-reference where present, payment/charge binding, mode, approved currency/amount and frozen line-item/tax/quantity composition. A metadata email or user ID alone is not ownership evidence. Missing session/payment/charge, partial capture or unsupported pricing composition blocks repair rather than guessing.
- [ ] List refunds by payment and disputes by bound charge with pagination; verify every item's payment/charge/currency. Use pages of 100, at most 20 pages per list and a 20-second total read budget, with per-call timeout bounded by remaining budget and explicit bounded retries. Hitting any cap, repeated cursor, unsupported status or missing page marks the observation incomplete. Preserve known adverse facts; a partial list cannot delete them. Derive paid occurrence time from canonical provider facts, not `new Date()` at repair.
- [ ] On checkout-read failure, normalise to explicit unknown fields and `complete:false`; never return captured zero or an apparently verified empty adjustment list. Define `unknownFinancialFacts(binding:Binding):FinancialFacts` with bound account/mode/session, null payment/charge/amount/currency/paid time, `paymentState:"unknown"` and empty arrays whose incompleteness is explicit. A verified unpaid session may be diagnostically complete while still blocked for repair. Display adjustment totals as unknown when the list is incomplete.
- [ ] Test 101 refunds, page reordering, conflicting duplicate IDs, wrong account/mode, payment/charge mismatch, timeout, 429, inaccessible dispute data and unknown provider statuses. Test-mode fixtures use an injected reader; no live SDK request is made by these tests. Run tests/typecheck; commit named adapter/config/test files with `feat: verify complete order-bound provider evidence`.

Provider API details must be checked against the installed SDK and pinned API version during execution. Primary references: [refund list pagination](https://docs.stripe.com/api/refunds/list), [webhook delivery](https://docs.stripe.com/webhooks), and [refund lifecycle](https://docs.stripe.com/refunds). Do not upgrade the provider API simply to copy a newer documentation example.

## Task 10: Persist trusted observations with fenced diagnosis jobs

**Depends on:** 3/8/9. **Owns:** A2/A6/A12/A14; initial diagnosis capability.

**Files:** Create migration `20261007010500_support_verification.sql`, suite `30_admin_support_verification.test.sql`, `WEB/src/lib/payments/reconciliation/{verifier,repository}.ts`, support `diagnosis.ts`, API `diagnose/route.ts`, `ProviderDiagnosis.tsx`, `WEB/tests/admin/support-diagnosis.test.mjs`, E2E `admin-support-diagnosis.spec.ts`.

**Interfaces:** Authenticated `admin_support_diagnose_begin(p_order_id uuid,p_operation_id uuid)` creates a diagnosis job. Restricted DB functions `private.commerce_verification_claim(p_job_id uuid)` and `private.commerce_observation_record(p_job_id uuid,p_fence bigint,p_facts jsonb,p_complete boolean,p_blockers jsonb)` use registered `session_user`; browser roles cannot execute them. `diagnoseSupportOrder(orderId:string,operationId:string):Promise<Result<SupportRead<ProviderObservation>>>` requests/claims/checks/persists then reads through authenticated `admin_support_observation(p_id uuid)`.

- [ ] Write suite 30 and run it expecting absent observation contract. Verify forged facts are denied:

```sql
SELECT throws_ok($$SELECT private.commerce_observation_record(
  'f3000000-0000-4000-8000-000000000020',1,'{}',true,'[]')$$,
  '42501',NULL,'ordinary authenticated role cannot attest provider evidence');
```

- [ ] Register no real verifier in migrations. Runtime provisioning uses a narrowly granted database login and `SUPPORT_VERIFIER_DATABASE_URL` held only on the server. Verify `session_user` against the enabled registry; do not accept a supplied verifier/approver UUID. Separate the verifier's ability to record normalised evidence from permission to approve repairs or edit entitlements. Reject arbitrary private-table writes for the runtime role.
- [ ] Claim a 30-second job lease with an increasing fence, capture local order/dependency versions, release SQL transaction, call the read-only adapter and persist only if lease/fence/versions/requester authority remain valid. Server/database timestamps and digests are authoritative. Immutable observations record purpose (`diagnosis`, `execution`, `webhook`, `recovery`), completeness and provenance. Limit per-user provider checks to five per minute and one active same-order check; expiry permits a fenced retry, never a parallel stale commit.
- [ ] POST diagnosis checks same origin, cookie Auth/MFA, current support stage and `support.provider.inspect`. Diagnosis persists observations/audit only; no payment/source/projection/outbox write. Display current local versus provider facts, freshness and incomplete/blocked states. Wrong mode/mock live and unregistered role fail closed. Pin unchanged ledger counts, lost lease, expired membership and observation pagination failures. Run suite 30, unit and diagnosis browser checks; commit listed files with `feat: add trusted provider diagnosis and fenced observations`.

## Task 11: Centralise bound ledger reconciliation and source projection

**Depends on:** 5/8/10. **Owns:** A6–A10/A12/A13, Review Focus 3.

**Files:** Create migration `20261007010600_commerce_reconciliation.sql`, suite `31_admin_support_reconciliation.test.sql`, `WEB/src/lib/payments/reconciliation/service.ts`, `WEB/tests/payments/reconciliation-ledger.test.mjs`; extend reconciliation repository; modify existing payment repository/fulfilment adapters as consumers, not separate writers.

**Interfaces:** `private.commerce_reconcile_core(p_context jsonb,p_observation_id uuid,p_operation_id uuid) RETURNS jsonb` is private/no public EXECUTE. Context is constructed only inside authenticated/registered entry points; it identifies `system` or human-approved execution, purpose/fence and original target. `reconcileVerifiedOrder(input:{observationId:string;operationId:string;eventId:string|null}):Promise<Result<CommerceReceipt>>` is server-only for approved system processing. System receipts have no fictional human approval/proposal ID. Manual support later enters the same core through Task 15, never this system adapter.

- [ ] Write/run suite 31 expecting missing shared writer. Pin replay after full refund:

```sql
SELECT is((SELECT is_eligible FROM private.access_sources
  WHERE source_kind='stripe_purchase' AND source_id='f3000000-0000-4000-8000-000000000001'),
  false,'a later success replay cannot reactivate a fully refunded purchase source');
```

- [ ] Add account/mode-scoped unique refund/dispute identity and payment/order binding constraints through a forward migration. First report existing collisions/inconsistent links in a read-only rehearsal; do not silently relink/delete rows. Fetch the bound payment before any adjustment upsert; reject conflicting immutable amount/currency/order/payment identities. Update lifecycle status/verification evidence while preserving original occurrence/history. A changing status is an append-only audited transition, not erasure of the earlier observation.
- [ ] Reuse Phase 2's collection-first locking, then user/collection reservation/projection key, order/payment, source and operation rows in deterministic UUID order. All participating writers must use the same order. Recheck evidence purpose/fence/local versions and approved policy under locks, evaluate all current sources, persist facts/eligibility, reproject valid intervals and effective collection access, append audit and eligible outbox records atomically. Reuse prior-phase source-boundary recalculation; private authorisation always evaluates current validity and cannot rely on a stale active projection past expiry. No network calls in this transaction.
- [ ] Replace unsafe eligibility resets in original payment/refund procedures with policy-aware guards. Preserve snapshot/cross-order protections from the remediation migration. Introduce the new verified-observation API additively; migrate every active fulfilment/refresh/webhook caller before restricting legacy entry points. A legacy wrapper must either use verified bound evidence or return a safe blocked result; no old `is_eligible=true` bypass may remain when repair activates. Do not revoke deployed caller access before a compatible runtime is ready.
- [ ] Exercise full/partial/failed refund, formal dispute, expired/closed owner, unknown policy, multiple sources, different currencies, provider ID conflicts and source projection failure. Compare all A/B/native rights before/after. No new goodwill source or ownership transfer. Run suite 31 and existing payment/RLS/native regressions. Commit exact core/adapter/tests with `fix: share policy-aware payment and access reconciliation`.

## Task 12: Complete webhook lifecycle processing and bounded recovery

**Depends on:** 9–11. **Owns:** A9/A12/A13; automated commerce integration.

**Files:** Create migration `20261007010700_commerce_event_recovery.sql`, reconciliation `events.ts`, `WEB/scripts/commerce-reconcile.mjs`, `WEB/tests/payments/reconciliation-events.test.mjs`; modify webhook route, fulfilment module, customer order refresh route and relevant payment remediation tests. Extend suite 31.

**Interfaces:** `processVerifiedCommerceEvent(event:VerifiedEvent):Promise<{state:"completed"|"ignored"|"retry"}>`, where `VerifiedEvent` stores signature-verified ID/type/account/mode/API version/object identity, not unrestricted payload. `private.commerce_event_claim(p_event_id uuid)` / `commerce_event_finish(p_event_id uuid,p_fence bigint,p_receipt jsonb)` fence inbox state. CLI `node scripts/commerce-reconcile.mjs --mode test --limit 10 --dry-run` reports safe counts; `--apply` processes only canonical evidence under existing approved automated policy, not support overrides.

- [ ] Write/run `node --experimental-strip-types --test tests/payments/reconciliation-events.test.mjs` expecting missing event router. Pin old-success-after-refund by supplying a current fully refunded canonical observation, not trusting the old event body:

```js
test("duplicate deliveries select the same inbox identity",()=>{
  const event={id:"evt_support",accountId:"acct_support_test",mode:"test",type:"refund.updated"};
  assert.equal(eventKey(event),eventKey({...event}));
  assert.notEqual(eventKey(event),eventKey({...event,mode:"live"}));
});
```

- [ ] Define `eventKey(event)` as `JSON.stringify([event.accountId,event.mode,event.id])`. Verify signatures before inbox insertion; obtain the real direct-account binding from verified server configuration instead of defaulting to a synthetic account. Preserve the actual event API version. Route `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `refund.created`, `refund.updated`, `refund.failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`, `charge.dispute.funds_withdrawn` and `charge.dispute.funds_reinstated` to canonical verification where supported. Unsupported events become explicitly ignored. Include only event types required by enabled payment methods and the installed API version. [Stripe event types](https://docs.stripe.com/api/events/types)
- [ ] Deduplicate inbox identity, claim with fence, retrieve canonical current objects, and commit financial effects/audit/processed receipt under the shared order coordination. A duplicate completed event returns its receipt; retryable failure remains pending/failed with safe code/backoff. Persist only normalised identities/hash; do not add full webhook payloads to generic logs. Old timestamp order is never used to overwrite a later adverse state.
- [ ] Add bounded on-demand recovery for pending/failed inbox jobs and known unresolved orders, using the same verifier/core and explicit account/mode. Default dry-run, limit 10/max 100, no broad Stripe scan or checkout creation. Unknown ownership/creation binding remains blocked. Update customer self-refresh to use canonical reconciliation of its own order while preserving its ownership check; it must not skip adverse-state checks just because a success row exists.
- [ ] Restrict unsigned/mock evidence to explicit owned loopback fixture configuration, never preview/production/live. Test signature failure before DB writes, repeated delivery, timeout retry, out-of-order success/refund/dispute, async payment failure without grant and crash after commit before event acknowledgement. Run event tests, suite 31 and existing payment remediation/browser regressions. Commit listed lifecycle/recovery changes with `fix: reconcile current payment adjustment lifecycle`.

## Task 13: Prepare exact, immutable repair proposals

**Depends on:** 5/6/8/10/11. **Owns:** A7/A8/A11.

**Files:** Create migration `20261007010800_support_proposals.sql`, suite `32_admin_support_approvals.test.sql`, support `proposals.ts`, `WEB/tests/admin/support-proposals.test.mjs`; extend contracts/decoders and API `prepare/route.ts`.

**Interfaces:** `admin_support_prepare(p_order_id uuid,p_observation_id uuid,p_kind text,p_reason text,p_operation_id uuid) RETURNS jsonb`; `prepareSupportRepair(input:{orderId:string;observationId:string;kind:RepairProposal["kind"];reason:string;operationId:string}):Promise<Result<RepairProposal>>`; `proposalMaterial(input:RepairProposal):string` canonicalises exact effects/dependencies for a golden comparison with DB SHA-256.

- [ ] Write/run proposal tests and suite 32 expecting no preparation function:

```js
test("material effect changes invalidate approval material",()=>{
  const proposal=fixtureProposal();
  assert.notEqual(proposalMaterial(proposal),proposalMaterial({...proposal,
    effects:proposal.effects.map(effect=>({...effect,afterEligible:!effect.afterEligible}))}));
});
```

- [ ] Add the complete proposal fixture. The test clock uses the fixed timestamps below; production uses DB time:

```js
export function fixtureProposal(){return {id:"f3000000-0000-4000-8000-000000000030",
  orderId:ORDER,userId:USER,ownerPrincipal:USER,binding:fixtureBinding(),kind:"reconcile_order",
  observationId:"f3000000-0000-4000-8000-000000000041",materialDigest:"fixture-material",
  expectedOrderVersion:1,dependencyToken:"fixture-dependency",policyVersion:"fixture-v1",
  effects:[{sourceId:ORDER,beforeEligible:null,afterEligible:true,beforeEffective:"denied",
    afterEffective:"active",recipeIds:["f3000000-0000-4000-8000-000000000012"],notification:"none"}],
  blockers:[],digest:"fixture-digest",expiresAt:"2026-10-07T10:05:00Z",reason:"Verified missing fulfilment"};}
```

DB builds proposals from current bound observations/order/source state and shared resolver output, not submitted before/after facts. Store immutable proposal/effects and expected local versions. Reasons are required and bounded; fresh preparation requires both provider-inspect and prepare capability. These fixture digest strings are only for pure orchestration tests; SQL fixtures calculate real canonical SHA-256 values.
- [ ] Allow only `reconcile_order` and `rebuild_projection`. The former may restore or remove the original source under approved policy; the latter cannot change financial/source eligibility. Include actual before/after effective access and retained alternate sources in scope. Missing/incomplete evidence, unknown policy, open formal dispute restoration, closure, identity mismatch, content override or unresolved legacy mapping blocks preparation. Unsupported desired effects are never coerced into a permitted command.
- [ ] Digest target owner/UUID/release, supported kind, material provider facts, financial/policy/dependency versions, effects, side effects and reason. Exclude incidental refetch time and page ordering. Expiry is at most preparation time plus 300 seconds and approval cannot extend it. Cross-language golden vectors must agree. Run suite/tests/typecheck; commit named files with `feat: prepare exact evidence-bound support repairs`.

## Task 14: Bind human approvals to exact current authority

**Depends on:** 3/13. **Owns:** A11/A14, Review Focus 5.

**Files:** Create migration `20261007010900_support_approvals.sql`; extend suite 32, support proposals/actions, API `approve/route.ts`, `WEB/tests/admin/support-approval.test.mjs`.

**Interfaces:** `admin_support_approve(p_proposal_id uuid,p_digest text,p_operation_id uuid) RETURNS jsonb` returns `Approval`. `approveSupportRepair(proposalId:string,digest:string,operationId:string):Promise<Result<Approval>>`. Identity derives from current cookie Auth; no posted human/approver field. Owner-first approval; delegated permission is explicitly owner-granted and checked with active membership.

- [ ] Write/run suite 32 pinning missing/wrong digest, expired proposal and non-approver denial:

```sql
SELECT throws_ok($$SELECT public.admin_support_approve(
  'f3000000-0000-4000-8000-000000000030','changed-digest',
  'f3000000-0000-4000-8000-000000000031')$$,'40001','ADM_STALE',
  'approval cannot bind a different proposal digest');
```

- [ ] Store immutable authoriser/digest/channel/time/reason and bounded expiry. Revalidate exact target, blockers, account/principal/versions, current approval capability and MFA. Same operation/digest returns same approval; altered payload under an operation UUID is invalid. Proposal revision is a new immutable record; no mutation of an already approved record.
- [ ] Add tests for owner self-approval, operator preparation without approval, delegated approval/revocation, loss of membership, expired MFA/JWT, close/recreate-same-email and exact-target switching. Authorisation changes invalidate pending execution. Keep a readable rejected/expired history without granting receipt access to revoked users. Commit listed changes with `feat: require exact human approval for support repair`.

## Task 15: Apply approved repairs atomically and recover durable receipts

**Depends on:** 11–14. **Owns:** A7/A8/A11–A13, Review Focus 4.

**Files:** Create migration `20261007011000_support_execution.sql`, suite `33_admin_support_execution.test.sql`, support `execution.ts`, `WEB/tests/admin/support-execution.test.mjs`; extend verification/core adapters and API `execute/route.ts`, `operations/[operationId]/route.ts`.

**Interfaces:** Authenticated `admin_support_execute_begin(p_command jsonb)` creates an execution-purpose verification job or returns an existing receipt; `admin_support_execute(p_operation_id uuid,p_observation_id uuid)` enters the shared core using internally constructed authenticated context. `admin_support_operation(p_operation_id uuid)` reads permission-checked status/receipt. TS `executeSupportRepair(command:RepairCommand):Promise<Result<OperationStatus>>`, `loadSupportOperation(operationId:string):Promise<Result<OperationStatus>>`.

- [ ] Write suite 33/unit coordinator tests and run them expecting missing execution. Pin material change after approval:

```sql
SELECT throws_ok($$SELECT public.admin_support_execute(
  'f3000000-0000-4000-8000-000000000040',
  'f3000000-0000-4000-8000-000000000041')$$,'40001','ADM_STALE',
  'a newly verified refund requires another preview and approval');
```

- [ ] Begin execution only with current execute capability, `aal2`, repair stage and a live matching human approval. Bind the operation digest to proposal/target/effects/case and requesting actor. Claim an execution job; retrieve provider facts again through the registered verifier outside SQL locks. A diagnosis observation from before approval cannot substitute for execution verification. Persist its fence/current local version and compare material facts, not verification timestamp.
- [ ] Commit through the cookie-authenticated RPC, so `auth.uid()`/current JWT assurance, DB membership and grants are checked at the actual browser-path commit. Recheck the human authoriser's current capability, approval expiry/digest, immutable owner principal/current Auth link, current resolver/dependency/row versions and evidence job purpose/fence. A registered server verifier records evidence but cannot itself claim browser human approval. No actor/context field is accepted in the public command.
- [ ] Under the shared lock order, either apply the approved effect or return already-satisfied after proving equivalent rights/effects and no adverse conflict. Reconciliation updates facts/source/projection/case linkage/audit/operation receipt/outbox eligibility together. Retain minimal immutable before/after snapshots or version references guaranteed to survive account closure; a reference to a later deleted mutable source row is insufficient history. Projection-only repair writes the derived projection/audit/receipt only, with financial/source rows unchanged; its fresh verification observation is separate. Different payload/actor reuse of operation UUID is rejected; a current authorised retry of the same operation retrieves its stored receipt. Audit/projection failure rolls back the domain transaction.
- [ ] Add coordinator dependency interface `ExecutionPorts` with `begin(command)`, `verify(jobId)`, `commit(operationId,observationId)` and `read(operationId)`, each returning typed results; inject it into pure `coordinateSupportRepair(command,ports)` for tests. A lost commit response triggers receipt lookup; if still unavailable, return `outcome_unknown`, never `failed_no_commit`. Add injected audit failure, stale lease, timeout-before-commit, equivalent webhook completion, target/case switching and receipt-after-revocation tests. Run suite 33/unit checks and commit named files with `feat: apply approved support repair with durable receipts`.

## Task 16: Verify resulting access and constrain side effects

**Depends on:** 11/15. **Owns:** A5/A12/A13/A15, Review Focus 4.

**Files:** Create migration `20261007011100_support_postcheck.sql`, support `postcheck.ts`, reconciliation `side-effects.ts`, `WEB/tests/admin/support-postcheck.test.mjs`, `WEB/tests/payments/reconciliation-side-effects.test.mjs`; extend suite 33; update customer access readers only where stale caches are demonstrated.

**Interfaces:** `admin_support_postcheck(p_operation_id uuid) RETURNS jsonb` computes the shared resolver result inside the authorised wrapper; it never accepts a client-posted verified boolean. `postcheckSupportRepair(operationId:string):Promise<Result<RepairReceipt>>`; pure `settleSupportPostcheck(receipt:RepairReceipt,check:()=>Promise<boolean>):Promise<RepairReceipt>`; `notificationEffect(input:{kind:"diagnosis"|"projection"|"fulfilment";alreadyQueued:boolean;deliveryApproved:boolean}):"none"|"purchase_confirmation"`.

- [ ] Write/run post-check and side-effect tests expecting missing helpers:

```js
test("post-check failure preserves the committed receipt",async()=>{
  const receipt=fixtureReceipt();
  const result=await settleSupportPostcheck(receipt,async()=>{throw new Error("read outage");});
  assert.equal(result.state,"applied"); assert.equal(result.verification,"unavailable");
  assert.equal(result.operationId,receipt.operationId);
});
test("projection repair never sends a purchase confirmation",()=>{
  assert.equal(notificationEffect({kind:"projection",alreadyQueued:false,deliveryApproved:true}),"none");
});
```

- [ ] Add the complete receipt fixture, then implement post-check:

```js
export function fixtureReceipt(){const proposal=fixtureProposal();return {
  operationId:"f3000000-0000-4000-8000-000000000040",orderId:ORDER,proposalId:proposal.id,
  state:"applied",effects:proposal.effects,auditId:"f3000000-0000-4000-8000-000000000042",
  committedAt:"2026-10-07T10:01:00Z",verification:"pending"};}
```

Reread the target's effective rights through the production evaluator and compare expected effects; append private result/freshness. A mismatch stays verification-pending and opens a safe follow-up, not another repair. Do not impersonate the customer or claim a successful real sign-in from a DB check.
- [ ] Confirm customer library/body/print/asset authorisation does not retain a stale personal grant after source revocation or a stale denial after repair. Use uncached current decisions/versioned tokens; public-page refresh cannot be required for private access correctness. Test invalidation against the authenticated synthetic customer, including loss of inherited additions and preservation of alternate rights.
- [ ] Diagnostics/projection repairs have notification `none`. Missing-fulfilment repair can use a previously unsent approved transactional event only if the proposal explicitly includes it and the actual delivery integration is verified. Preserve existing dedupe keys and no duplicate sends across retries; pending/failed refunds cannot create a misleading completion notification. If no delivery integration is verified, proposals omit that side effect. No support message send endpoint is added. Run tests/suite 33 and commit listed changes with `feat: verify repaired access and deduplicate side effects`.

## Task 17: Deliver the functional diagnosis, approval and repair controls

**Depends on:** 7/13–16. **Owns:** A11/A15, Review Focus 4; increment 3C interface.

**Files:** Create `RepairPreview.tsx`, `RepairResult.tsx`, E2E `admin-support-repair.spec.ts`; extend `ProviderDiagnosis.tsx`, order/case/timeline components, support action/API adapters and operation-status route. No new design system or customer-facing implementation details.

**Interfaces:** Owner **Approve and apply repair** composes the existing approval and execution commands; separated staff flow approves then executes the same proposal. `RepairResult` renders all `OperationStatus` states plus receipt verification state. Server responses never convert unknown/blocked into applied. Define a discriminated pure mapper `repairMessage(status:OperationStatus):{tone:"success"|"pending"|"error";text:string}` in support `execution.ts` for consistent copy/tests.

- [ ] Write/run the browser lost-response test expecting missing controls. Add fixture methods `prepareRepair()`, `receiptCount(operationId)`, `failNextPostcheck()`, `loseNextCommitResponse()` scoped only to owned test adapters:

```ts
test("retry recovers the receipt without another repair",async({page})=>{
  const fixture=await createSupportFixture("owner");
  try { await fixture.login(page); await fixture.loseNextCommitResponse();
    await page.goto(`/admin/support/orders/${fixture.orderId}`);
    await page.getByRole("button",{name:"Check provider status"}).click();
    await page.getByRole("button",{name:"Prepare repair"}).click();
    await page.getByRole("button",{name:"Approve and apply repair"}).click();
    await page.getByRole("button",{name:"Check operation result"}).click();
    await expect(page.getByRole("status")).toContainText("Applied");
    expect(await fixture.receiptCount(fixture.lastOperationId)).toBe(1);
  } finally { await fixture.dispose(); }
});
```

- [ ] Show target/support reference, financial evidence, exact before/after source and final access, retained sources, addition/content effects, reason, approval/expiry and notification effect before approval. Show removal as clearly as restoration. Hide actions by capability/stage and enforce them again server-side; disable stale/expired/blocker proposals. Display unresolved account/content/policy issues as explicit routes to the responsible workflow, not a generic retry-unlock button.
- [ ] Preserve an operation UUID across resubmission/polling; a changed command creates a new proposal/approval. Distinguish applied with pending verification, already satisfied, blocked/stale, failed without commit and outcome unknown. Recovery reads a receipt before any new execution. Approval/execution button double-clicks cannot create duplicate operations; Back/refresh restores current authoritative status without putting email/notes in URLs.
- [ ] Test owner self-approval, support operator preparation/execution without approval power, revoked approver, wrong origin, expired evidence, new refund, blocked legacy/account mismatch, keyboard access and small-screen workflow. Run repair/diagnosis/privacy browser suites plus pure message tests. Commit named functional UI/adapters/tests with `feat: add reviewed support repair workflow`.

## Task 18: Support restricted agent and direct-database execution

**Depends on:** 10/14–16. **Owns:** A14.

**Files:** Create migration `20261007011200_support_operator.sql`, suite `34_admin_support_operator.test.sql`, `WEB/scripts/admin-support-operator.mjs`, `WEB/tests/admin/support-operator.test.mjs`; extend runbook and verifier/repository wrappers only to share existing contracts.

**Interfaces:** Registered `session_user` entry points `private.support_operator_attest(p_proposal_id uuid,p_digest text,p_human_id uuid,p_evidence_reference text)` and `private.support_operator_execute(p_command jsonb,p_observation_id uuid)` return the existing approval/receipt contracts. Private registry/attestation constructs context; public/browser calls cannot supply it. CLI supports `--preview`, `--attest-file <local-json-path>` and `--execute`, with proposal/operation IDs and explicit mode/account, using `SUPPORT_OPERATOR_DATABASE_URL` and the separate trusted verifier adapter.

- [ ] Write/run suite 34 and CLI argument tests expecting missing operator support:

```sql
SELECT throws_ok($$SELECT private.support_operator_attest(
  'f3000000-0000-4000-8000-000000000030','digest',
  'f3000000-0000-4000-8000-000000000002','local-approval-reference')$$,
  '42501',NULL,'unregistered session_user cannot attest approval');
```

- [ ] Register no actual login or human in migrations. Attestor permission is separate from verifier and executor permission; current human approval authority remains mandatory. Attestation binds the immutable exact proposal/digest and a bounded evidence reference, never an entire transcript. Record human authoriser, attestor and executor separately. Reject changed target/effect/expiry, revoked human/operator and wrong purpose/fence.
- [ ] Implement preview-first CLI through protected reads/procedures, not arbitrary updates. A conversational “yes/yeah” to that exact preview is recorded by the trusted attestor; the database cannot independently prove the conversation. Execution obtains fresh provider evidence from the registered verifier and calls the same commit core. A database-only caller without fresh trusted evidence remains blocked. No `--facts-file`, fake `auth.uid()`/JWT settings or browser-posted authoriser path.
- [ ] Read credentials only from secure runtime environment and emit minimal support reference, digest, effect and receipt codes. Validate local approval-file permissions/path and parse only the allowed fields. Require explicit mode/account confirmation in the command; no live default. Test dry preview, wrong target, forged facts, reused UUID/different command and exact authorised retry. Update actual SQL/CLI runbook examples and trust limitations; run suite/CLI tests and commit named files with `feat: add restricted approved support operator commands`.

## Task 19: Enforce retention, rate limits and private operational reporting

**Depends on:** 6/10/15/18. **Owns:** A2/A15 and operational readiness.

**Files:** Create additive operations migration `20261007011300_support_operations.sql`, suite `35_admin_support_operations.test.sql`, `WEB/tests/admin/support-operations.test.mjs`, `WEB/tests/admin/support-privacy.test.mjs`; extend runbook, policy matrix, API log/limit wrappers and E2E privacy checks.

**Interfaces:** `private.support_consume_budget(p_actor uuid,p_kind text) RETURNS boolean` is called from authenticated wrappers using their internally derived actor, never directly granted; `admin_support_metrics(p_mode text)` returns only approved private aggregate counts; owner-only `admin_support_retention_run(p_operation_id uuid)` redacts expired note text and bounded observations under configured policy, preserving event/audit identity.

- [ ] Write/run suite 35 and privacy unit tests expecting absent retention/aggregate functions. Test allowlist logging:

```js
test("operational logs retain no customer/provider bodies",()=>{
  assert.deepEqual(safeSupportLog({operationId:ORDER,code:"PROVIDER_UNAVAILABLE",
    email:"buyer@example.com",note:"private",raw:{secret:"hidden"},url:"https://checkout.stripe.com/x"}),
    {operationId:ORDER,code:"PROVIDER_UNAVAILABLE"});
});
```

- [ ] Enforce shared DB-backed budgets: exact lookup 30/minute per actor, provider check five/minute plus same-order lease, repair execution five/minute plus idempotency. Same unchanged operation retry retrieves the existing receipt without consuming another mutation or creating another provider job. Reject oversized bodies, invalid cursors, arbitrary page sizes and cross-origin writes before sensitive reads. No process-local-only rate limiter that resets per server instance.
- [ ] Require configured note/observation retention and approved financial/audit retention mapping before production activation. Redact text/payload minima without altering financial identities or exact approval/effect digests; store a redaction tombstone/time/actor. Expired diagnostic detail can be minimised while retaining the material evidence digest and exact fields required by the approved audit policy. Never delete an observation referenced by a pending operation/approval. Account closure must not cascade-delete orders/audit into loss of evidence.
- [ ] Add mode-separated private metrics for unresolved verified mismatch, pending-job age, blocked reason counts, applied/no-change/failed repairs and post-check completion. No email/customer notes/provider objects in aggregates or optional analytics. Pin stale-cache cross-user isolation, read audit without search terms, redaction replay and privilege/default-grant checks. Run suite 35/privacy tests; commit named operations/privacy files with `feat: enforce private support operations and retention`.

## Task 20: Exercise races, failures and account lifecycle end to end

**Depends on:** 11–19. **Owns:** A10–A14 and all five Review Focus classes under concurrency.

**Files:** Create `WEB/scripts/admin-support-concurrency.mjs`, `WEB/tests/payments/reconciliation-concurrency.test.mjs`; extend SQL suites 31/33/34 and owned E2E fixtures; add evidence to GATES.md. This is the meaningful race/fault test task, not another policy implementation.

**Interfaces:** CLI `node scripts/admin-support-concurrency.mjs --workdir .superpowers/sdd/2026-10-07-admin-support/local` accepts only the owned loopback target. Use two or more real `pg` connections with test barriers/failpoints restricted to the fixture transaction. Export pure scenario selection for Node tests; do not ship failpoint controls in production endpoints.

- [ ] Write the race assertions first and run the script expecting invariant failures if coordination is incomplete. At minimum test support versus full refund, two support executions, independent A refund versus B purchase, publication during preview/commit and close/recreate after approval.

```js
assert.equal(await receiptCount(operationId),1);
assert.equal(await purchaseSourceEligible(orderA),false);
assert.equal(await collectionAccess(userId,collectionId),true); // independent valid B/native source
assert.equal(await transferredOrderCount(oldPrincipal,newUserId),0);
```

- [ ] Implement test harness methods `receiptCount`, `purchaseSourceEligible`, `collectionAccess`, `transferredOrderCount` as parameterised queries through the already defined ledger/shared resolver. Acquire deterministic barriers with advisory locks on synthetic scenario IDs, never unbounded sleeps/global table locks. Set statement/lock deadlines and guaranteed cleanup for owned synthetic rows only.
- [ ] Inject failures after observation, during facts/source/projection/audit writes, after commit before response and during post-check. Prove either no domain commit or one durable complete receipt. Expired verifier fences cannot write stale facts; an old paid event cannot erase a newer adverse adjustment. Verify no duplicate outbox entry/message and no interval-gap broadening.
- [ ] Run all defined scenarios once after fixes, rerunning only changed/failed scenarios while diagnosing. Save redacted counts, scenario names, current SHA and pass/fail evidence in the ledger; do not save tokens/customer payloads. Commit harness/tests/evidence with `test: verify support reconciliation races and recovery`.

## Task 21: Integrate CI, type generation and migration/rollback rehearsal

**Depends on:** 20. **Owns:** A1/A2/A13/A15 regression evidence.

**Files:** Modify `WEB/package.json`, `.github/workflows/web-ci.yml`, `WEB/scripts/test-admin-db.mjs` only if integrated changes require it, generated database types and GATES.md; create `WEB/tests/admin/support-discovery.test.mjs`.

**Interfaces:** Package script `test:support:unit` runs support unit files as a focused developer command; existing `test:admin:unit` already discovers them, so do not duplicate them inside `verify`. Add `test:reconciliation:unit` for the new payments directory to existing `verify`/required CI coverage. DB-backed `test:e2e` uses `playwright test --workers=1` in the owned stack to preserve singleton owner/fixture isolation across files and projects; do not assume per-file serial mode prevents cross-file races. Runner `--all` discovers and bundles all SQL suites, not only the old 11–15 default. CI uses isolated synthetic configuration; secrets remain out of printed runtime output.

- [ ] Write/run discovery regression before CI changes:

```js
test("required test groups cannot silently discover zero files",()=>{
  assert.ok(readdirSync("tests/admin").some(name=>/^support-.*\.test\.mjs$/.test(name)));
  assert.ok(readdirSync("tests/payments").some(name=>/^reconciliation-.*\.test\.mjs$/.test(name)));
});
```

- [ ] Add explicit scripts and CI execution for unit/SQL/browser checks; ensure Node setup precedes the bundled SQL runner, preserve pinned actions/generated-type drift checks and existing required regressions. Keep synthetic service/verifier credentials restricted to the isolated CI stack. No CI call targets live Stripe or production Supabase.
- [ ] Replay migrations in an empty owned database and a synthetic upgrade fixture representing the integrated pre-Phase-3 schema, including legacy incomplete terms, adjustment binding conflicts and existing support-role-free admins. Unsafe collision/backfill situations produce a discrepancy report and block activation, not silent cleanup. Generate types and review all unexpected grant/schema drift. Verify legacy callers are migrated/restricted before manual repair activation.
- [ ] Run the command matrix below once on the candidate; fix failures and rerun relevant groups. Rehearse disabling support repair/diagnosis, preserving inspection/audit and ordinary commerce, then a new approved compensating repair in test mode. Do not roll back by restoring an old entitlement snapshot. Commit exact CI/type/ledger changes with `test: integrate support gates and migration rehearsal`.

## Task 22: Complete owner rehearsal, independent review and release handoff

**Depends on:** 21 and 26 plus applicable owner policy/config decisions. Execute this final task after Tasks 23–26. **Owns:** final A1–A19 reconciliation.

**Files:** Create `docs/implementation/admin-support/REHEARSAL.md`; finish GATES.md/POLICY-MATRIX.md and `ops/ADMIN-SUPPORT.md`. Code fixes found during review follow `$unlazy`, their owning gate/tests and scoped commits; this task is not permission to skip unresolved implementation work.

**Interfaces:** Owner checklist records actual synthetic account/order references, candidate SHA, commands/evidence, human outcome and unmet gates. Independent final reviewer reads the whole integrated diff/spec/plan and race/privacy evidence without inheriting an implementation role. Preserve Native execution; do not ask the owner to choose it again.

- [ ] Reconcile every design section and A1–A19 against the completed artifacts and fresh evidence. A passing build alone cannot close policy, Auth, lifecycle, operator, review or owner-rehearsal gates. Mark partial/blocked/unverified precisely and finish independent work before reporting an unmet gate.
- [ ] Run the owner walkthrough in the isolated stack/Stripe test mode: lookup by email/reference, inspect original/current collection, diagnose paid-but-locked, preview exact effects, approve/apply, verify access, recover a lost access-repair response, prepare/approve/submit both partial and full refunds in Stripe test mode, recover a duplicate click and an unknown submission, inspect alternate-source access, reject wrong account/expired approval and revoke a support member. Verify a disabled refund gate stops new dispatch while prior-result recovery continues. Verify the owner understands which facts are local/provider and which action changes access.
- [ ] Obtain one independent whole-branch review using the authorised Native workflow; resolve actionable findings and rerun their targeted checks. Record reviewer scope, candidate SHA, findings/fixes and remaining limitations. Do not count self-review as the independent final review.
- [ ] Prepare a concrete release packet: exact migrations/runtime candidate, current grants/stages, approved policy versions, secure verifier/operator and restricted refund-key provisioning, event subscriptions/API version, Stripe refund notification settings, actual delivery status, refund kill switch/retry deadline, backup/recovery path, read-only production checks and explicit stop conditions. No unresolved account/mode/schema binding or retention gate may be hidden by a green build.
- [ ] Keep release authority separate from plan approval. On later authorised release, follow expand/deploy/restrict/enable ordering below and collect deployed-SHA/runtime evidence. Do not perform real charges/refunds or customer-specific repairs as a smoke test. Commit rehearsal/runbook/evidence with `docs: record support admin readiness and owner rehearsal`, and report only states actually achieved.

## Task 23: Define exact refund proposals, owner authority and reserved capacity

**Depends on:** 3, 8–14 and the confirmed refund scope. **Owns:** A16/A17; contract foundations for A18/A19. Run before final Task 22.

**Files:** Create migration `20261007011400_support_refund_commands.sql`, suite `36_admin_refunds_access.test.sql`, `WEB/src/lib/admin/support/refunds/{contracts,policy,repository}.ts`, `WEB/tests/admin/support-refunds-policy.test.mjs`; extend support contracts/decoders, synthetic `support.mjs`/SQL fixtures, GATES.md and POLICY-MATRIX.md. No change to published customer terms is implied.

**Interfaces:** Export the refund types above. Pure `refundCapacity(facts:FinancialFacts,reservations:RefundReservation[]):RefundCapacity` accepts complete bound facts only; `RefundReservation` is `{operationId:string;providerRefundId:string|null;amountMinor:number;reserved:boolean}`. `decideRefundAmount(capacity:RefundCapacity,selection:RefundPrepareInput["amount"]):number` returns a fixed validated amount or rejects. Authenticated `admin_support_refund_prepare(p_input jsonb,p_observation_id uuid)` returns `RefundProposal`; `admin_support_refund_approve(p_proposal_id uuid,p_digest text)` returns `RefundApproval`; `admin_support_refund_reserve(p_command jsonb)` returns `RefundReceipt`. All construct actor/context internally and require active owner membership plus their exact refund capability and `aal2`.

- [ ] Add reusable synthetic refund command/receipt fixtures before new tests:

```js
export function refundCommand(){return {operationId:"f3000000-0000-4000-8000-000000000060",
  proposalId:"f3000000-0000-4000-8000-000000000061",expectedDigest:"fixture-refund-digest",caseId:null};}
export function refundReceipt(overrides={}){const command=refundCommand();return {
  operationId:command.operationId,proposalId:command.proposalId,orderId:ORDER,
  amountMinor:400,currency:"usd",state:"reserved",providerRefundId:null,providerStatus:null,
  reconciliation:"not_started",auditId:"f3000000-0000-4000-8000-000000000062",
  reasonCode:null,firstDispatchedAt:null,checkedAt:"2026-10-07T10:00:00Z",...overrides};}
```

- [ ] Write/run `node --experimental-strip-types --test tests/admin/support-refunds-policy.test.mjs` expecting absent refund policy; include deduplicated reservations and invalid amounts:

```js
test("known provider refunds and local reservations are not counted twice",()=>{
  const facts=paidFacts();
  const base={paymentIntentId:"pi_support",chargeId:"ch_support",currency:"usd",
    occurredAt:"2026-10-07T10:00:00Z"};
  facts.refunds=[{...base,id:"re_done",amountMinor:300,status:"succeeded"},
    {...base,id:"re_pending",amountMinor:100,status:"pending"}];
  const capacity=refundCapacity(facts,[
    {operationId:"unknown",providerRefundId:null,amountMinor:200,reserved:true},
    {operationId:"known",providerRefundId:"re_pending",amountMinor:100,reserved:true}]);
  assert.equal(capacity.availableMinor,900);
  assert.equal(capacity.reservedMinor,200);
  assert.ok(capacity.blockers.includes("refund_in_flight"));
});
test("full remaining is fixed and unsafe amounts are rejected",()=>{
  const capacity=refundCapacity(paidFacts(),[]);
  assert.equal(decideRefundAmount(capacity,{kind:"full_remaining"}),1500);
  for(const amountMinor of [0,-1,0.5,1501,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>decideRefundAmount(capacity,{kind:"partial",amountMinor}));
  }
});
```

- [ ] Add the three refund capabilities without granting them to existing support operators, recipe roles or registered DB agents. Owner bootstrap is explicit and stores no real IDs in migrations. Add `support_settings.refund_submission_enabled boolean NOT NULL DEFAULT false`; refund preparation requires at least diagnosis stage, owner status and its exact capability, while dispatch requires repair stage plus the dedicated switch. Preparation/approval/submit are authenticated browser-owner paths; a generic repair approval is rejected. SQL suite 36 tests anonymous/customer/recipe/support-operator/agent denial, missing MFA, forged posted authoriser, current owner/grant revocation and receipt privacy.
- [ ] Implement complete bound proposal construction from a trusted `refund_prepare` observation. Require approved business/refund/access policy, one supported captured original charge, exact account/mode/currency/order/owner, complete adjustment pages, no active formal dispute and no unsupported Connect fee/transfer flow. Require a bounded internal reason (1–500 characters, excluded from logs/Stripe metadata) and provider reason `requested_by_customer` or `duplicate`; reject `fraudulent`, alternate destinations and extra request fields. Amounts are integer minor units with currency-aware display, never floating-point totals. Incomplete facts return a blocked result, not a zero balance presented as known.
- [ ] Canonical digest binds exact amount, reasons, binding, observation material, policy/access effects and dependency versions. Refund effects always have `notification:"none"`; they cannot trigger a purchase confirmation. Full remaining is frozen at prepare. Approval expiry is the earlier of proposal expiry and five minutes; refresh stale material and require new approval. Under a deterministic payment-scoped lock, reserve the operation/amount, compare current local versions and reject any unresolved competing intent. Deduplicate provider/local representations by verified provider ID and strong binding, never loose metadata matching. Prevent over-reservation; definitive failed/canceled outcomes release capacity only after trusted reconciliation. A reservation conclusively never claimed for dispatch may expire; a dispatching/unknown intent cannot be aged out or garbage-collected.
- [ ] Extend retention to proposals/approval minima, intents/attempts/results and safe internal reasons under the approved policy; financial recovery records survive account closure/revocation and note redaction. Run unit tests, DBTEST suite 36 and typecheck. Commit listed schema/contracts/policy/tests with `feat: define owner-approved refund proposals and reservations`.

## Task 24: Submit refunds through a trusted server adapter and recover unknown outcomes

**Depends on:** 23, 9–12 and 15. **Owns:** A17/A18 and server-side A16.

**Files:** Create migration `20261007011500_support_refund_submission.sql`, suite `37_admin_refunds_submission.test.sql`, `WEB/src/lib/payments/refund-submission.ts`, support refund `service.ts`, `WEB/tests/admin/support-refunds-submission.test.mjs`, `WEB/tests/payments/reconciliation-refund-submit.test.mjs`; extend refund repository/contracts and trusted verifier/recovery registration. Existing repair execution remains a distinct command.

**Interfaces:** `RefundPorts` has `reserve(command:RefundCommand):Promise<RefundReceipt>`, `verify(operationId:string):Promise<{observationId:string}>`, `claim(command:RefundCommand,observationId:string):Promise<RefundDispatchClaim>`, `submit(claim:RefundDispatchClaim):Promise<RefundSubmissionResult>`, `record(claim:RefundDispatchClaim,result:RefundSubmissionResult):Promise<RefundReceipt>` and `read(operationId:string):Promise<RefundReceipt>`. Pure `coordinateRefund(command:RefundCommand,ports:RefundPorts):Promise<RefundReceipt>` orchestrates the workflow. Server-only `createRefundWriter(binding:Binding)` returns `submit(intent:RefundIntent):Promise<RefundSubmissionResult>` and `recover(intent:RefundIntent):Promise<RefundSubmissionResult>`. Authenticated `admin_support_refund_dispatch_claim(p_command jsonb,p_observation_id uuid)` rechecks current owner/MFA/grants/gate/approval/evidence and returns a short-lived claim; `admin_support_refund_operation(p_operation_id uuid)` returns a private permission-checked receipt. Registered server-only `private.support_refund_dispatch_payload(p_operation_id uuid,p_fence bigint)` returns the stored `RefundIntent`; `private.support_refund_result_record(p_operation_id uuid,p_fence bigint,p_result jsonb)` stores bound results, including late results. Registry purpose `refund_dispatch` cannot create/approve an intent or edit entitlements directly.

- [ ] Write/run the submission unit test before implementing the coordinator. It pins a timeout after acceptance and prevents a second submission from an ordinary retry:

```js
test("lost provider response remains unknown and an ordinary retry only recovers status",async()=>{
  let stored=refundReceipt(),calls=0;
  const ports={reserve:async()=>stored,
    verify:async()=>({observationId:ORDER}),
    claim:async()=>({operationId:stored.operationId,fence:1,expiresAt:"2026-10-07T10:00:10Z"}),
    submit:async()=>{calls++;throw new Error("timeout after acceptance");},
    record:async(_claim,result)=>{assert.equal(result.kind,"unknown");
      stored=refundReceipt({state:"outcome_unknown",reasonCode:"PROVIDER_OUTCOME_UNKNOWN",
        firstDispatchedAt:"2026-10-07T10:00:00Z"});return stored;},
    read:async()=>stored};
  assert.equal((await coordinateRefund(refundCommand(),ports)).state,"outcome_unknown");
  assert.equal((await coordinateRefund(refundCommand(),ports)).state,"outcome_unknown");
  assert.equal(calls,1);
});
```

- [ ] Persist the canonical Stripe request, stable operation-derived idempotency key, immutable account/mode/payment/amount/reason, reserved amount and approval before any money call. A fresh complete dispatch-purpose provider observation must match the approved material. Persist `dispatching`, attempt/fence, first-dispatch time and `retryUntil=firstDispatch+23 hours` before sending. A claim lasts at most ten seconds and never beyond approval expiry. Check current owner/grants/gate at the last authenticated boundary immediately before the call; expiry/revocation before it denies dispatch. Revocation after a request leaves the server cannot undo that request. Use no SQL locks during provider calls.
- [ ] Build a separate server-only Stripe client from secure runtime `STRIPE_REFUND_SECRET_KEY` and exact registered account/mode configuration, with `maxNetworkRetries:0` and a ten-second timeout. The key must have only the refund write and required read permissions supported by the actual Stripe account/API; no publishable, browser or DB credential is a substitute. Validate installed SDK/pinned API semantics before use. Provider request is exactly `{charge: intent.chargeId, amount: intent.amountMinor, reason: intent.providerReason, metadata:{support_refund_operation:intent.command.operationId}}` plus the stored idempotency key/account context. Currency is validated against the original charge; no client-supplied fee/transfer/destination fields. [Stripe create refund](https://docs.stripe.com/api/refunds/create), [restricted keys](https://docs.stripe.com/keys)
- [ ] Map a verified returned refund to `known`; only a documented non-executing validation rejection may become `not_executed`. Network timeout, lost response, ambiguous 5xx/conflict or uncertain rejection becomes `unknown`. First store known provider identity/status or unknown attempt independently of access projection, then use the shared reconciliation core and mandatory local audit transaction. Local failure reports reconciliation pending; it does not claim the external refund failed or release the reservation. A stale fence may not overwrite current state, but a strongly bound late provider fact must be retained and scheduled for canonical reconciliation. SQL suite 37 injects failures before/after dispatch and during audit/projection.
- [ ] Ordinary repeated submit returns/reconciles the existing receipt; it never issues a fresh money request. Define pure `refundRetryAllowed(input:{nowMs:number;firstDispatchMs:number;approvalExpiresMs:number;authorised:boolean;gateEnabled:boolean;sameRequest:boolean}):boolean`; true requires all booleans, nonnegative elapsed time, elapsed under 23 hours and unexpired approval. Any deliberately permitted transport resend is server-controlled, at most two total sends per operation, exact same key/body and subject to this check. The five-minute approval gate applies to resends too; after expiry use provider reads only. Cached 500/ambiguous results use read reconciliation. Never create a fresh key or extend an intent's deadline. [Stripe idempotency semantics](https://docs.stripe.com/api/idempotent_requests)
- [ ] Recovery retrieves a known refund ID or completely lists the bound payment's refunds through the trusted reader, matching operation correlation plus exact account/mode/charge/payment/amount/currency. Metadata is correlation only. A definitive result is recorded even with a disabled switch or revoked original human; these conditions block new money calls, not historical result capture. Incomplete/ambiguous/not-yet-visible evidence leaves the intent unknown and reserved. Recovery is read-only after the retry/approval deadline; unresolved cases escalate with the safe support reference. No unsupported “assume absent” or forced reservation release control is exposed. Run suite 37, submission/provider tests and typecheck; commit listed changes with `feat: submit refunds with durable idempotency and recovery`.

## Task 25: Add exact refund review, human submission and truthful status to admin

**Depends on:** 24 and 16–19. **Owns:** A16/A19 and operator-facing A18.

**Files:** Create `WEB/src/components/admin/support/{RefundPreview,RefundResult}.tsx`, refund `messages.ts`, API `refunds/{prepare,approve,submit}/route.ts`, `refunds/operations/[operationId]/route.ts`, `WEB/tests/admin/support-refunds-messages.test.mjs`, E2E `admin-support-refunds.spec.ts`; extend order/timeline/case components, redaction/rate wrappers, owned browser fixtures and shared lifecycle/post-check adapters.

**Interfaces:** Authenticated `prepareSupportRefund(input:RefundPrepareInput):Promise<Result<RefundProposal>>`, `approveSupportRefund(proposalId:string,digest:string):Promise<Result<RefundApproval>>`, `submitSupportRefund(command:RefundCommand):Promise<Result<RefundReceipt>>`, `loadSupportRefund(operationId:string):Promise<Result<RefundReceipt>>` use the separate refund schema/receipts. Pure `refundOutcomeMessage(receipt:RefundReceipt):string` distinguishes provider state and local reconciliation. Inputs never include a provider key, authoriser, trusted observation payload or arbitrary provider arguments. A combined browser button first records approval, then submits that exact command; either failed step leaves an honest recoverable status.

- [ ] Add/run message regressions before building the result component:

```js
test("unknown money outcome does not instruct the owner to issue another refund",()=>{
  assert.equal(refundOutcomeMessage(refundReceipt({state:"outcome_unknown"})),
    "Refund outcome unknown. Check this operation's status before taking further action.");
});
test("a successful provider refund and incomplete local reconciliation remain distinct",()=>{
  assert.equal(refundOutcomeMessage(refundReceipt({state:"submitted",providerRefundId:"re_support",
    providerStatus:"succeeded",reconciliation:"pending"})),
    "Stripe reports the refund succeeded. Local access reconciliation is pending.");
});
```

- [ ] Add the functional order action: choose full remaining/partial and reason → prepare → show fixed amount/currency, capture/refund/reserved balance, exact order/account/mode, policy/access consequences and blockers → explicit “Approve and submit refund” → durable operation/status view. The control is absent for non-owners and disabled for stale/blocked proposals; all restrictions are enforced again on the server. No visual redesign or new refund promise is introduced. Avoid putting customer identifiers/reasons into URLs, analytics or logs.
- [ ] Apply same-origin validation, strict body bounds, no-store and DB-backed budgets to refund routes: prepare five/minute, submit three new operations/minute per actor, plus the payment reservation. Same authorised operation retry retrieves its receipt without consuming a new money operation. Rate limiting must not prevent trusted recovery of an already dispatched result. Store one operation UUID across double clicks, lost responses and page reload recovery; a new form does not clear a payment's unresolved intent. The permission-checked status endpoint reports safe state even when money submission is disabled.
- [ ] Integrate result recording with verified shared lifecycle processing. Submitted/pending/requires-action alone does not revoke access. Apply the approved versioned partial/full policy only from complete verified facts, preserving alternative sources and Phase 2 successor/content restrictions. Display source effect separately from effective collection access. Provider failed/canceled results do not blindly restore access; re-evaluate all exclusions. A refund request never sends an application “refund completed” email; verify Stripe notification configuration and display that provider notifications may occur. Test duplicate/out-of-order webhooks and return/failure after initial success.
- [ ] In the owned DB-backed browser fixture, exercise owner full/partial preview and submit, blocked excessive amount/new Dashboard refund, wrong origin/missing MFA/current role change, support operator denial, unknown result reload, pending versus succeeded copy, alternative-source access and disabled switch with recoverable history. Agent/DB repair wrappers must reject refund commands; agents may inspect and suggest an unapproved draft but cannot create a refund approval or dispatch. Run unit checks and `npx playwright test tests/e2e/admin-support-refunds.spec.ts --workers=1`; commit named components/routes/tests with `feat: add owner-reviewed refund workflow to admin`.

## Task 26: Prove refund races, deadline recovery and release readiness

**Depends on:** 20, 21 and 25. **Owns:** A17–A19 integration evidence; required before final Task 22.

**Files:** Create suite `38_admin_refunds_recovery.test.sql`, `WEB/tests/admin/support-refunds-recovery.test.mjs`; extend `WEB/scripts/admin-support-concurrency.mjs`, provider submission tests, refund/browser/SQL fixtures, GATES.md, REHEARSAL.md and `ops/ADMIN-SUPPORT.md`. Revisit Task 21's generated types/CI mapping for the two new migrations and suites 36–38; keep one integrated verification run.

**Interfaces:** Existing owned concurrency runner adds bounded refund scenarios using real DB connections and a deterministic injected provider. `refundRetryAllowed` is the exact helper from Task 24. Suite 38 tests restricted result capture after human revocation, stage disable, retention execution and stale dispatch fence. Recovery's provider reads remain separately registered and cannot authorise another money call. Do not install public failpoints or a “force retry with new key” endpoint.

- [ ] Write/run deadline tests with the explicit server contract:

```js
test("retry requires live approval and never crosses the provider-key safety window",()=>{
  const first=Date.parse("2026-10-07T10:00:00Z");
  const input={firstDispatchMs:first,nowMs:first+1000,approvalExpiresMs:first+300000,
    authorised:true,gateEnabled:true,sameRequest:true};
  assert.equal(refundRetryAllowed(input),true);
  assert.equal(refundRetryAllowed({...input,nowMs:first+300000}),false);
  assert.equal(refundRetryAllowed({...input,authorised:false}),false);
  assert.equal(refundRetryAllowed({...input,gateEnabled:false}),false);
  assert.equal(refundRetryAllowed({...input,sameRequest:false}),false);
  assert.equal(refundRetryAllowed({...input,nowMs:first+23*60*60*1000,
    approvalExpiresMs:first+24*60*60*1000}),false);
});
```

- [ ] Extend the concurrency harness with two owner tabs, same UUID/different amount, two UUIDs/same payment, a partial refund during preview, Dashboard-versus-panel amount conflict, pending/requires-action reservations, unknown submission followed by a new request, and full A refund racing B purchase/publication. Assert at most one provider refund for an operation and no excess local reservation; preserve B/native rights. The fake provider honours idempotency and models pruning after 24 hours so tests prove no late resend, rather than benefiting from permanent mock-key retention.
- [ ] Inject crash before the durable intent, after reservation, after marking dispatching before network send, after provider acceptance before response, after response before DB result, and during local audit/projection/post-check. Each case must end in a provable no-dispatch state or a durable pending/unknown/known operation; no crash is interpreted as permission to use a new key. Delayed provider responses with an expired fence are captured and reconciled without stale overwrite. Revoke owner/disable submission after dispatch and prove trusted recording/recovery still completes while new sends and revoked receipt access are denied.
- [ ] Run suites 36–38 and the expanded owned concurrency runner, then regenerate/review types and run `npm run verify` once after integration; required groups must discover all refund files. DB-backed Playwright remains `--workers=1`. Record isolated migration/upgrade replay and rollback evidence with the new grants and dispatch switch. Exercise full/partial creation with approved synthetic orders in Stripe test mode for the owner's later rehearsal; use provider fixtures for lifecycle states that test mode cannot reliably produce. Never claim fixture-only scenarios were observed in Stripe. No CI or rehearsal targets a live customer.
- [ ] Document actual restricted credential permissions/account/mode, provider/API compatibility, notification settings, policy versions, refusal/escalation rules, unresolved-intent alerts and owner runbook. Disabling submission preserves in-flight recovery; neither rollback nor a SQL repair undoes money, and automatic customer recharge is prohibited. Commit named refund verification/evidence changes with `test: verify refund concurrency and unknown-result recovery`. Proceed to final Task 22 only with A16–A19 evidence or explicit unmet blockers; do not call Phase 3 complete without the agreed refund feature.

## Acceptance ownership and evidence ledger

Initialise every row as **unmet** during execution; writing the plan does not satisfy runtime gates.

| Gate from the design | Owning tasks | Evidence to record |
| --- | --- | --- |
| A1 — Scope and integration | 1, 21, 22 | Prior-phase evidence and integrated SHA; agreed refund scope/policy decisions; protected refund endpoint and absence of charge/transfer/grant endpoints. |
| A2 — Authority and privacy | 3, 6, 7, 10, 19, 21 | SQL/route/MFA/revocation/default-grant results; no-store/telemetry/log/retention checks. |
| A3 — Exact identity | 4, 7, 14, 20 | Exact/ambiguous/unconfirmed/unavailable and closure/recreation fixtures; no transfer. |
| A4 — Historical truth | 2, 4, 7, 8 | Frozen snapshot/manifests/policy, missing legacy fields, currency and mode isolation. |
| A5 — Access explanation | 5, 7, 16 | Resolver agreement for library/body/print/assets, additions/corrections/holds and post-check. |
| A6 — Financial binding | 2, 8–11 | Wrong account/mode/payment/order/charge/amount/currency and forged-evidence denials. |
| A7 — Verified missing fulfilment | 8, 9, 11, 13, 15 | Paid source repair versus unpaid/processing/unknown; original source only. |
| A8 — Projection repair | 5, 8, 11, 13, 15 | No eligibility override; closure/expiry/holds/adjustments preserved. |
| A9 — Refund/dispute lifecycle | 8, 9, 11, 12 | Each reviewed lifecycle transition and incomplete/missing-policy state. |
| A10 — Multiple sources | 5, 8, 11, 20 | A/B/native composition, successor access and disjoint validity intervals. |
| A11 — Approval integrity | 3, 13–15, 17, 20 | Exact digest/target/expiry, current authoriser/executor, stale evidence and revoked authority. |
| A12 — Concurrency and replay | 10–12, 15, 16, 20 | Inbox dedupe/fences, conflicting writers, publication races, lost responses and no duplicate messages. |
| A13 — Atomicity and recovery | 11, 12, 15, 16, 20, 21 | Injected failures, complete durable receipt, unknown recovery and compensating operation. |
| A14 — Agent parity | 10, 14, 18, 20 | Registered identities, forged input denials, exact human/executor/attestor separation and operator receipt. |
| A15 — Workflow and rollout | 6, 7, 16, 17, 19, 21, 22 | Owner walkthrough, notes/queue/timeline, operational metrics, stage/revocation/rollback rehearsal and independent review. |
| A16 — Refund authority and exact amount | 23–25, 22 | Owner-only grants/MFA/origin/gate; fixed minor-unit amount/reason/binding; policy/dispute/unsupported-flow denials and agent isolation. |
| A17 — Refund concurrency and replay | 23, 24, 26, 22 | Payment reservation, provider/local deduplication, double clicks/two tabs/Dashboard race; one stable key/body and no excess amount. |
| A18 — Refund uncertainty and durable recovery | 24–26, 22 | Timeout/500/crash/local-write/stale-fence faults; bounded same-key resend, expiry cutoff, revoked-owner/disabled-gate historical capture. |
| A19 — Refund outcome and release | 25, 26, 22 | Full/partial/pending/requires-action/failed/canceled outcomes, source composition, restricted credential/config/notifications, retention, kill switch and owner test-mode rehearsal. |

## Verification commands

These are commands for future implementation. They were not run to validate product behaviour while writing this plan. Use the integrated Node version and owned local stack; never substitute production credentials to make a fixture pass.

From WEB, focused pure checks during the owning task:

```bash
node --experimental-strip-types --test tests/admin/support-*.test.mjs
node --experimental-strip-types --test tests/payments/reconciliation-*.test.mjs
node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-07-admin-support/local 26_admin_support_access.test.sql
node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-07-admin-support/local 33_admin_support_execution.test.sql
```

Before final review, from WEB with local test configuration loaded securely, run the integrated required verifier once plus database/race checks it does not already own:

```bash
node scripts/test-admin-db.mjs --workdir .superpowers/sdd/2026-10-07-admin-support/local --all
npm run verify
node scripts/admin-support-concurrency.mjs --workdir .superpowers/sdd/2026-10-07-admin-support/local
```

`verify` retains existing lint/type/unit/build/browser coverage and adds reconciliation tests. Its browser run must include the configured desktop/mobile Chromium/WebKit projects where supported. Do not rerun all focused task commands again after this verifier passes unless changes/failures justify it. A missing browser/runtime/stack is an unmet evidence gate, not a pass.

Generate database types from repository root into ignored scratch, compare, then deliberately update the tracked type file:

```bash
supabase gen types typescript --local --workdir .superpowers/sdd/2026-10-07-admin-support/local > .superpowers/sdd/2026-10-07-admin-support/database.generated.ts
git diff --check
```

## Release ordering and recovery

1. **Expand with gates disabled:** apply reviewed additive schema/authority/evidence contracts; preserve legacy runtime compatibility. Rehearse actual migration history and conflict reports first. Provision narrow registered verifier/operator identities separately, without putting secrets or real Auth IDs in migrations.
2. **Deploy compatible consumers:** move fulfilment, webhook, self-refresh and support adapters to the shared verified-state contract. Verify the active runtime candidate/account/mode, not just a queued deployment or present environment variable.
3. **Restrict bypasses:** confirm no legacy caller remains, then restrict old writers and verify every mutation enters policy-aware reconciliation. This step is required before repair activation; rollback must retain safe equivalent guards.
4. **Enable inspection:** verify current membership/MFA, private DTO/cache/telemetry boundaries and minimal owner read-only workflow. Notes require configured retention. No repair gate is implicitly enabled.
5. **Enable diagnosis:** verify actual event subscriptions/API version and read-only canonical provider checks; incomplete evidence stays blocked. No full-account provider scan.
6. **Enable repair:** only after A1–A19, owner release authorisation and test-mode rehearsal. A real repair still requires its individual exact preview/approval; release authority does not approve arbitrary customer changes.
7. **Enable refund submission separately:** verify the restricted server credential against the exact provider account/mode and required permissions, owner-only grants/MFA, approved policies, receipt/recovery integration and test-mode full/partial/unknown scenarios. Keep `refund_submission_enabled=false` until these checks pass. Release approval does not approve any customer-specific refund.
8. **Recover safely:** disable new refund submissions/repair/diagnosis independently if needed; preserve in-flight financial recovery, financial/audit records and normal commerce. Inspect unknown receipts; correct local access through a new exact approved repair. Never resend with a new provider key to escape an unknown outcome, undo money through a database restore, automatically recharge the customer or fall back to an old unsafe writer.

If no real eligible support case exists, finish deployment verification with authorised read-only checks and the isolated test evidence. Do not manufacture a live charge/refund/entitlement change to claim end-to-end completion. Report the precise remaining runtime limitation.

## Plan self-review and handoff

Before handing over this document, check design-section coverage, A1–A19 ownership, five Review Focus tests, type/signature consistency, missing source references, placeholders, unsafe command targets and whitespace. For this refund-scope revision, verify only the Phase 3 design and this plan are staged/committed; preserve existing Phase 1 edits.

The next decision is owner review of this written plan and its inherited proposed defaults. Preserve Native execution with one independent final review. Begin implementation only after that review; no execution-method questionnaire is needed again. Production release and each customer-specific repair/refund retain their own concrete authorisation boundaries.
