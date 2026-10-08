# Admin Phase 5: owner overview, operations and governance design

- Date: 2026-10-07, America/Los_Angeles.
- Status: detailed written design for owner review, following the accepted Phase 5 brainstorming recommendations.
- Source baseline: `codex/admin-recipe-workspace-design` at `a824b3c64bb918645263450eca4ba828eb23f856`, inspected in `/Users/pratik.nandoskar/.codex/worktrees/admin-recipe-design/my-curated-haven-web`.
- Delivery state: documentation only. No product code, database migration, production check, scheduled job, credential, notification or deployment was changed by writing this document.
- Related designs: [Phase 1 recipes](2026-10-04-admin-recipe-workspace-design.md), [Phase 2 collections](2026-10-06-admin-collections-phase-two-design.md), [Phase 3 customer support](2026-10-07-admin-customer-support-phase-three-design.md), [Phase 4 campaigns and reporting](2026-10-07-admin-campaigns-phase-four-design.md).

## 1. Purpose and success

Phase 5 answers: **What needs my attention, what is working, what evidence supports that conclusion, and where do I go to act?**

The owner is the first operator. Additional named admins must be supported with narrower visibility. The workspace consolidates information from the existing recipe, collection, support, campaign, reporting and operational workflows. Each source retains its authority over business state, approval, execution and resolution.

The first release is a viewing and navigation workspace. The owner can understand a problem, inspect its permitted evidence and open the responsible workflow. Phase 5 does not add a second publish, repair, refund, permission-management or incident-resolution process.

Success means the owner can start an operating session in one place, distinguish routine editorial work from confirmed customer problems and missing evidence, and reach the appropriate action without searching several tools. Background observations remain useful when the owner is away; their actual freshness is visible when the owner returns. The design does not promise continuous monitoring, instant detection or immediate notification.

Final visual styling remains separate. This document specifies destinations, information, interactions, evidence, authority and operational behaviour; it does not approve screen mockups or a new visual system.

## 2. Decision register

| Status | Decision | Design consequence |
| --- | --- | --- |
| Agreed | Phase 5 is owner overview, operations and governance | Consolidate existing capabilities; subscriptions, planners, community and other unadopted products are outside this phase. |
| Agreed | Operations-first delivery | Prioritise attention and history before a broader health/recovery workspace. |
| Agreed | First release provides viewing and navigation | No acknowledgement, assignment, dismissal or manual closure in Phase 5. |
| Agreed | 5A is attention and administrative history | Issues link to their original workflow and records. |
| Agreed | 5B adds scheduled read-only checks, on-demand refresh, recovery readiness and access review | Checks observe business state and record technical evidence; they cannot correct business records. |
| Agreed | Hourly checks, deployment-triggered checks and manual refresh are the initial direction | Extend the existing production-check foundation, verify its actual target/runtime and expose missed runs. |
| Agreed | Additional admins see only permitted areas | Filter records, totals, badges, evidence and destinations before returning them. |
| Agreed | Financial summaries reuse Phase 4 | Preserve its definitions, source watermarks and separate financial grants. |
| Agreed | Missing evidence stays uncertain | A stale success is not current health; failed collection cannot erase an unresolved problem. |
| Deferred | Acknowledgement, assignment and targeted notifications | No new message delivery or coordination state in 5A/5B. Existing approved notifications retain their own workflow. |
| Recommended design default | Explicit severity, completeness and freshness axes | Urgency does not replace evidence quality, and freshness does not prove a business outcome. |
| Recommended design default | Use existing scheduled GitHub checks as the initial public-check producer | No additional paid monitoring service is assumed. Private checks and backup evidence use separately scoped identities. |
| Recommended design default | No general settings editor or restore controls | Show configuration/status safely and link to the established controlled procedure. |

Recommended technical defaults below are concrete proposals for written-design review. They are not claims that the owner separately chose every timeout, threshold or authentication mechanism.

## 3. Design acceptance ledger

These gates assess this written document. Future runtime acceptance is defined separately in section 24.

| Gate | Observable design outcome | Sections |
| --- | --- | --- |
| D1 | Owner purpose, accepted decisions and two delivery increments are explicit | 1–2, 5 |
| D2 | Current repository evidence is distinguished from planned and live-verified capabilities | 4, 22, 25 |
| D3 | Navigation does not introduce alternate business actions or issue ownership | 5–8, 17 |
| D4 | Priority, unknown results, staleness and partial coverage have distinct meanings | 7–10 |
| D5 | Duplicate observations, resolution and recurrence preserve authoritative evidence | 8, 14 |
| D6 | Consolidated history preserves truthful provenance without exposing private payloads | 11, 18 |
| D7 | Current membership/MFA, module authority and hidden-count protection apply throughout | 12, 18 |
| D8 | Machine producers have scoped authentication, replay/fencing protection and no owner impersonation | 13–15 |
| D9 | Scheduled and on-demand checks have bounded execution and visible liveness | 9, 13–15 |
| D10 | Backup freshness, coverage and restore evidence remain separate | 16 |
| D11 | Deployment, access review and financial summaries reuse trustworthy existing sources | 10, 17 |
| D12 | Privacy, retention, query bounds and inaccessible-source handling are explicit | 12, 18–20 |
| D13 | Activation and rollback preserve original workflows, public delivery and recovery | 21–22 |
| D14 | Every required outcome has a later verification gate and actual-target evidence requirement | 23–25 |

## 4. Repository baseline and evidence limits

The planning worktree was clean at inspection. Its source includes Phase 1 recipe/Team routes plus later authenticator-enrolment and recipe-library fixes. The Phase 2–4 design and implementation documents exist; their presence does not establish implementation or deployment of those admin modules.

| Source inspected | Confirmed in source | Phase 5 consequence |
| --- | --- | --- |
| `my-curated-haven-web/src/app/admin/` | `/admin` redirects to Recipes; implemented module routes are Recipes and Team | Add an authorised overview destination without implying later modules already exist. |
| `src/components/admin/AdminShell.tsx` and `src/lib/admin/` under the web app | Recipe navigation, owner Team navigation, authenticated RPC/context boundaries and recipe history reads exist | Extend the current console; retain current actor/MFA and module checks. |
| `supabase/migrations/20261005000100_admin_console_access.sql` | Current memberships, protected owner, private operations and immutable recipe audit foundations | Reuse their authority/provenance; do not expose raw private tables or invent historic approvers. |
| Phase 2–4 documents linked above | Collection, support, campaign and reporting contracts are specified | Register each source only after its real integrated implementation is verified. |
| `.github/workflows/production-smoke.yml` | Source defines an hourly schedule at minute 17, a successful Production deployment trigger and manual dispatch | Reuse the public-check foundation; source configuration is not proof that a workflow is enabled or running remotely. |
| `my-curated-haven-web/scripts/production-smoke.mjs` | GET-only public checks, bounded retries, page/sitemap/recipe-body assertions; no sign-in, email or checkout action | Public page checks are useful but do not establish authenticated purchase, fulfilment or refund health. |
| `ops/README.md`, `ops/backup-production.sh`, `ops/com.mycuratedhaven.backup.plist` | A documented daily Mac backup, database dumps, a recipe-image mirror, local retention and a historical restore rehearsal | Add narrowly scoped evidence publication; the web app cannot infer current local backup execution. |
| `src/lib/analytics/private-paths.ts` | Admin paths and admin return-navigation contexts are identified | Extend exclusion tests to every new admin destination and private response. |

Repository paths in this table are evidence pointers, not a request to edit those files during design writing. No production API/database, GitHub run history, installed Mac launchd job, current backup artifact, hosting plan or deployed SHA was verified here. In particular, the backup runbook's recorded plan/tier and past rehearsal must not be presented as current live facts.

The existing backup image mirror names `recipe-images`; Phase 1 approved assets also use `recipe-previews`. Complete recovery coverage must be reconciled against the actual integrated asset registry. An additive image mirror is not automatically a coherent, versioned point-in-time storage snapshot.

## 5. Architecture, increments and boundaries

**Extend the native console with a private operations read layer and a small evidence collector.** Source modules provide bounded, versioned observations and history. The operations layer normalises their presentation, retains safe technical evidence and routes the operator back to the authoritative workflow.

Three approaches were considered: an operations-first overview, a business-report-first landing page, and a broader control centre with corrective actions/settings. The accepted operations-first approach keeps the initial workflow useful while preserving the earlier phases' approval and recovery contracts. Phase 4 reports remain available through their existing permissioned entry points.

| Increment | Includes | Independently useful outcome |
| --- | --- | --- |
| 5A — Attention and history | Authorised overview, source registration/coverage, issue projection, private evidence detail, history search and links | Find and investigate real outstanding work across the modules actually integrated. |
| 5B — Health and governance | Scheduled observations, manual refresh, producer/liveness evidence, backup/recovery/deployment status and access-review information | Understand what has been checked, what remains uncertain and where operational follow-up belongs. |
| Later, separately scoped | Assignment, acknowledgement, snooze/dismiss/close controls, targeted notifications, broader operational automation | Requires its own workflow, permissions and review; not an incomplete promise in this release. |

Out of scope: new product capabilities; recipe/collection/campaign authoring changes; prices or sales-enable changes; customer grants/transfers; refund/notice submission; Stripe dispute evidence submission; deployment/restore execution; secrets editing; general SQL/log terminals; backup downloads; person-level analytics; new social or marketing integrations; and automatically repairing a detected problem.

Recording a check job, observation, receipt, evidence digest or permitted monitoring audit is an allowed technical write. **Read-only monitoring never changes recipe content, publications, offers, orders, money, entitlements, support-case resolution or staff permissions.** Existing approved automatic reconciliation/safety workflows continue under their own authority; Phase 5 neither duplicates nor disables them.

In 5A, an authorised bounded source read may maintain the minimal attention read model through a fixed trusted adapter path. It may update only the conditions actually covered by that complete authorised read, with the same provenance, ordering and retention rules. This is not permission to launch a background check or accept arbitrary browser-supplied observations. If new operational persistence is not yet activated, display current source-derived items and existing source history; do not invent first-observed or recurrence history. Durable cross-session occurrence tracking is an explicit 5A activation gate where offered.

## 6. Destinations and operating journey

| Destination | Purpose and permitted interaction |
| --- | --- |
| `/admin/overview` | Permission-filtered attention, routine work, recent changes and source coverage; open the original record. |
| `/admin/operations/items/[itemId]` | Safe explanation, observation history, freshness/completeness and current eligible destination; no business correction controls. |
| `/admin/history` | Filter/search permitted administrative events and open their original record/receipt. |
| `/admin/operations/health` | Registered checks, actual last results, liveness and authorised manual refresh in 5B. |
| `/admin/operations/recovery` | Owner recovery evidence, backup coverage and controlled runbook/provider links; no restore or backup download. |
| `/admin/team` | Existing owner Team workflow, extended with permission/access-review context; grant/revoke remains its existing action. |
| Existing module/report destinations | Authoritative inspection, review, publication, repair, financial reporting and exact-approved actions. |

After 5A activation and owner rehearsal, `/admin` may open Overview for an operator with overview permission. Otherwise it retains the existing permitted landing destination; do not redirect staff into a module they cannot read. A module appears only when its actual source/route is integrated and that operator is authorised. Owners may inspect a coverage panel listing planned-but-unintegrated modules; ordinary users do not receive hidden module metadata.

The normal journey is **overview → issue/evidence → original workflow → source-confirmed result → refreshed overview**. Preserve permitted filter/page state and return navigation. URLs contain opaque IDs and safe filter codes, never customer emails, notes, credentials or pasted provider queries.

Expired MFA or revoked membership hides private content and blocks subsequent requests. If the user loses source permission between overview and navigation, deny the destination safely and refresh the visible scope; a stale item is not an access grant. Loading, no matches, no authorised sources, no outstanding issues, partial sources and unavailable overview have distinct states.

## 7. Attention model, categories and priority

Each item contains a stable opaque ID, source, subject type/reference, condition code/version, permitted title, short factual explanation, category, first/last observation times, last confirmed condition, source watermark, completeness/freshness, applicable deadline and a server-generated next destination. Customer details and private free text remain in the source workflow.

| Category | Initial rule | Examples |
| --- | --- | --- |
| Urgent | Confirmed active customer/public safety impact, or an authoritative response deadline within the configured urgent window | Verified paid-but-unfulfilled mismatch after the support workflow's own classification; confirmed unsafe public delivery; formal dispute deadline approaching. |
| Needs attention | A confirmed blocker or unresolved operational follow-up without the urgent condition | Failed publication refresh; blocked approved collection update; unresolved support/refund-reconciliation follow-up. |
| Routine work | Expected editorial/approval work | Recipe awaiting review, private draft ready for its next authorised action. |
| Needs verification | Required evidence is missing, stale, incomplete or unavailable | Missing backup receipt; unknown dependency; unavailable monitoring source. |

Urgency, condition state and evidence quality are separate axes. A previously urgent confirmed problem can retain its last-confirmed urgency while carrying a prominent stale/unverified badge. It must not be asserted as a newly confirmed failure or downgraded merely because the latest check failed. Do not double-count it as another verification item. A source outage may additionally have one source-level coverage item.

Proposed deadline default: an authoritative formal-dispute response due within 24 hours, or already overdue, is urgent; a later deadline is attention. This is an admin triage rule, not a change to the bank/provider deadline. Missing deadline data requires verification. Other timing/grace rules consume the source module's approved classification; Phase 5 does not invent when a payment has failed or fulfilment is overdue.

Default ordering is category priority, then nearest actual deadline, then oldest unresolved first-observed time, then stable item ID. Routine work remains separate from confirmed operating failures. Filters include source, category, verification/freshness and safe title/reference search; 25 rows by default, maximum 100, with stable server-issued cursors. Counts and rows use the same authorised scope and snapshot.

## 8. Authoritative issue lifecycle and completeness

An attention item is a derived view of source evidence, not a second support case. Use a stable grouping identity composed of environment, source, account/mode scope where relevant, subject identity and logical condition code. Repeated observations update that item and append bounded evidence references. Different conditions on one subject remain distinguishable; repeated failures of the same condition do not create repeated cases.

The source supplies first-observed evidence where known. If Phase 5 only first detects an older problem, label that time as **first observed here**, not the original incident start. Preserve the source's actual occurrence/deadline separately. A real recurrence after an authoritative resolution opens a new occurrence under the same logical grouping, retaining the prior resolution reference.

**Only fresh, complete, correctly scoped source evidence may resolve an item.** Resolution requires an explicit source transition or a complete scoped snapshot proving that condition no longer applies. An empty page, missing row, failed fetch, truncated batch, disabled source or revoked viewer is not resolution. Superseded drafts/operations disappear only through the source's explicit superseded/cancelled/resolved classification, with provenance retained.

Per-source scans carry scope, definition/policy versions, cursor completion, watermark and start/finish state. Stage all parts of a scan before atomically promoting its completeness marker. Unfinished scans may contribute confirmed problems but cannot establish absence or clear prior problems. Late, replayed or older scans cannot override a newer authoritative result. A rule/version change requires explicit transition mapping rather than silently resolving every old item.

Viewing an item does not acknowledge it. Opening a corrective workflow does not resolve it. There is no Phase 5 close/delete/snooze action in 5A/5B. Resolution history remains available according to the approved operational retention policy.

## 9. Health states, freshness and coverage

Each registered check has a fixed purpose, source/target/environment, evidence type, expected cadence, maximum evidence age, supported results and allowed producer. Show **pass**, **degraded**, **fail** or **unknown**, plus independent **current**, **stale** or **not checked** freshness. Integration state is separately **active**, **disabled** or **not integrated**.

Pass means the named check passed for its stated scope at its observation time. It does not mean every customer journey or dependency works. A public recipe page check does not prove authenticated paid-recipe access; a ready deployment does not prove database/provider runtime configuration; a fresh database read does not make old provider verification fresh.

| Evidence class | Proposed freshness/default behaviour |
| --- | --- |
| Scheduled public/private source observations | Hourly target; after three hours without a completed observation, mark stale and require verification. A fresh failed result remains a current failure, not stale success. |
| On-demand domain summary | Read current authorised module data where bounded; show actual source watermark and underlying provider-verification age. |
| Backup completion receipt | Daily target from existing tooling; after 36 hours without valid completion evidence, mark freshness overdue/needs verification. Absence does not prove the backup itself failed. |
| Restore rehearsal | Show actual date, restored artifact/scope, checks and result. Recommended review reminder after 90 days; an architecture/storage change may invalidate relevance earlier. |
| Deployment readback | Bind to the specific observed deployment/origin; a new deployment invalidates use of the old result as evidence for the new revision. |
| Reporting | Preserve Phase 4's independent behavioural/ledger watermarks and five-minute cache semantics. An expired unused report cache is not automatically an incident. |

These are configurable versioned operating defaults, subject to target rehearsal. The hourly cadence is a target, not a guaranteed execution interval. GitHub documents that scheduled runs can be delayed or dropped and run from the default branch; therefore liveness must use actual finished evidence. [GitHub scheduled-event guidance](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

Show per-source coverage and overall **complete**, **partial** or **unavailable** coverage for the operator's permitted sources. Never display an unqualified global healthy state when expected sources are unknown/stale. A genuine zero outstanding issues requires complete fresh observations for that authorised scope. Missing/unintegrated sources do not manufacture zero values or automatically create customer incidents.

## 10. Source catalogue and health responsibilities

| Source | Evidence consumed | Limits and destination |
| --- | --- | --- |
| Recipes | Existing readiness, review/publication state, approved asset checks and safety/usage evidence | Preserve overlapping readiness meanings; distinguish required review from a failed publication. Open recipe detail/review. |
| Collections | Integrated Phase 2 draft/approval/publication/dependency/refresh state | Preserve purchased originals/additions and source ownership. Do not recompute entitlement policy. Open collection detail. |
| Customer operations | Phase 3 exception queue, verified lifecycle classification, unresolved intents/repairs, binding review and actual dispute deadlines | Open the support case/order under support permission. No account-wide Stripe scan or guessed failed-checkout classification. |
| Campaigns | Phase 4 health, promised originals/extras, eligibility and refresh receipts | Safety placeholder/inactive promotion may be expected states. Only unsupported delivery or unresolved dependencies create relevant attention. Open campaign detail. |
| Reports | Existing gate/configuration status, requested query outcomes, permitted freshness/completeness and export follow-up | Optional analytics being deliberately disabled is a normal disabled state. No new purchase count, conversion formula or automated financial export. Open Phase 4 reports. |
| Public delivery | Fixed first-party routes, known public recipe content and selected registered campaign/collection destinations | Meaningful public assertions with bounded timeouts; do not scrape private pages or simulate paid transactions on production. |
| Deployment | Trusted provider deployment identity/status plus separate runtime readback bound to that identity | Show source/target revision mismatch explicitly. Ready, deployed and runtime-verified remain different facts. |
| Backups/recovery | Registered local/managed backup receipts, coverage, artifact digests and owner-approved restore-rehearsal evidence | Metadata only; no arbitrary filesystem access, backup file transfer or restore command. |
| Access governance | Current named memberships, module/report grants and trustworthy existing access-review history | Owner Team authority; no automatic revocation, invitations or ownership transfer. |

Enable an adapter only after its actual integrated schema, route, role mapping and evidence semantics are verified. Recipe-only 5A can be useful before the other modules are integrated, provided the shared authority foundation exists and the limited coverage is explicit. Full Phase 5 acceptance requires all sources included in its approved release scope; a partial rollout is not reported as the whole phase complete.

Source failures are isolated. A PostHog outage cannot prevent recipe inspection, public delivery, checkout, fulfilment or verified financial recording. A broken backup reporter cannot invalidate a successful recipe check. Source checks must read authoritative module classifications, not infer them from colours, labels, browser success events or missing telemetry.

## 11. Consolidated administrative history

History combines permitted source events through a normalised read model. It does not copy full customer records or rewrite the immutable original logs. Each event carries original source/event identity, occurrence and recording times, action/result, safe target references, human authoriser/executor when the source proves them, reason category and eligible original receipt/history destination.

Keep human authorisation, agent/operator execution and automated recording distinct. Legacy records that contain only an actor must display that limited provenance; do not fabricate an approver, approval channel or before/after snapshot. Imported history keeps its original timestamp; discovery time is separate. Failure after rollback, commit with refresh pending, outcome unknown and verified completion remain distinct.

Owner identity details require Team authority. Other viewers receive the minimal permitted actor reference/display label. Source reasons may contain personal free text: Phase 5 shows a safe reason category/summary, with detailed text available only in the authorised original workflow. Escape all human content; do not place raw notes or provider error objects in tooltips, URLs or logs.

Initial filters: 7/30/90-day presets, a custom interval of at most 90 days, source, action/result, safe target ID and operation ID. Older history remains accessible by moving the interval; this is a query-cost limit, not retention. Use UTC instants with the operator-visible configured timezone, stable time/source/event cursors and a fixed query watermark. Maximum page size is 100, default 25. Partial source history is labelled and cannot be described as the complete audit trail.

Grant/revoke and privileged administrative activity belong in the audit design; OWASP recommends recording those higher-risk events while protecting sensitive data. [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## 12. Human authority, private reads and navigation

Every private human request derives identity from verified authentication and `auth.uid()`, requires `aal2` and checks current DB membership, current capability grants, the shared console master gate and the operations stage. Do not trust posted actor IDs, editable metadata or stale JWT role claims. No real account identity is seeded by a migration.

Proposed capabilities are `ops.overview.read`, `ops.history.read`, `ops.health.read`, `ops.recovery.read` and `ops.check.run`. Existing module permissions remain additional requirements, not substitutes. The owner receives the reviewed set explicitly at activation; additional staff may receive overview/history scoped to their existing module authority. Health/recovery/check execution are owner-only initially, with explicit future delegation through existing capability-grant patterns.

Examples: recipe authority allows eligible recipe items/history, not support cases. Support authority permits its defined support-status evidence, not a financial-report overview. Phase 4 financial values and purchase-derived report metrics require `report.finance.read`; that grant does not grant customer-case access. Recovery information and cross-system deployment metadata require their own operations authority. Team grant/revoke remains under `team.manage`.

**Filter authority before aggregating, caching or returning data.** Hidden source rows contribute neither counts nor category badges, search suggestions, pagination totals or health claims. Do not show “three hidden urgent issues.” Private raw history cannot be returned and then filtered by the browser. Recheck authority for detail, cursor continuation, refresh requests and receipt replay; revocation blocks the next request even if a result is cached.

Use private/no-store pages/actions, no public/shared HTTP cache and permission/scope-bound aggregate caches where justified. Every destination is generated from a fixed internal source/route registry and stable permitted IDs, with authority checked again at the target. Reject arbitrary URLs, redirects and client-provided targets. Provider links are fixed allowlisted hosts/paths without credentials; sensitive deep links remain inside their source workflow.

## 13. Scheduled checks and on-demand refresh

### 13.1 Public-check producer

Reuse the existing GitHub workflow's hourly, successful Production-deployment and manual-dispatch triggers. Verify the remote default branch, enabled workflow, intended origin and actual recent runs before treating it as an active producer. Preserve GET-only execution and meaningful content assertions. Registered routes must identify what they prove: a working public recipe, a campaign destination or a collection presentation, for example.

The current workflow does not request OIDC issuance. The later implementation must explicitly add narrowly scoped `id-token: write` for the producer job, configure its verified trust policy and prove the resulting identity; the proposed mechanism is not already available merely because GitHub runs the check.

Do not introduce production purchases, login attempts, emails or entitlement changes as smoke checks. Public and private health remain separate. A producer may report a failed public response without having permission to inspect customer records.

### 13.2 Private source collection

Run private checks through a dedicated restricted server/database identity and fixed read functions. It may obtain only the minimal operational classifications required by its registered sources. It must not reuse a human owner's session, manufacture `auth.uid()`/MFA claims, expose a general service-role client or grant raw access to all private business tables.

Private checks consume authoritative module observations and verified lifecycle classifications. They do not start payment reconciliation, scan an entire Stripe account, attempt publication, perform refunds, send messages or repair access. A separate existing reconciliation worker may already establish a fact; the collector reads its safe outcome under its own restricted contract.

The preferred execution model is a registered server worker with durable job/receipt storage and explicit source allowlists. If the existing scheduler invokes that worker, its verified request can enqueue only registered checks; private data and database credentials do not travel through GitHub logs. No implementation may rely on an unawaited request surviving after a serverless response.

### 13.3 Manual refresh

An authorised operator may request a registered check or the fixed set permitted to them. Require `ops.check.run`, each source's required authority, current membership, `aal2`, the shared master gate and monitoring stage. Same-origin protection, server-issued operation IDs and idempotent receipts follow the existing admin command pattern. The request cannot supply a URL, SQL, provider account, arbitrary function or claimed actor.

Proposed limits: at most three new runs per actor/source in ten minutes; concurrent requests for the same target/definition share its active run. A repeated operation ID returns its original receipt, while an ID reused with different input fails. A timeout returns the actual pending/unknown receipt state; it does not authorise repeating a business operation. Read the final receipt after execution rather than displaying request acceptance as a passed check.

### 13.4 Execution and liveness

Every run records trigger, target/environment, definition version, requester or machine producer, requested/started/completed times, status, coverage and result receipt. Proposed private collection budgets are 30 seconds per batch and five seconds per database statement, with pagination into additional durable work when needed. The current public workflow's ten-minute job limit remains a separate outer limit; its request retries/timeouts must fit inside it.

Do not hold database locks while contacting providers or running public checks. Use bounded retries with backoff for safe reads, honour provider limits and cap concurrent work per source. The overview reads bounded stored evidence or bounded module summaries; rendering it never waits for every external provider.

Liveness derives from actual accepted completed observations. Queuing a job, starting a workflow or receiving a heartbeat cannot establish a successful result. A failed upload can leave the source stale even if the external check ran successfully. Display that evidence gap truthfully. Existing external tools remain necessary when the application itself is unavailable; this phase does not add an independently delivered outage notification.

## 14. Producer authentication, provenance and ordering

Machine observation is a distinct authority from human approval. Neither a producer receipt nor a successful check can approve a publication, refund, permission change or restore.

| Producer | Recommended authentication and permitted scope |
| --- | --- |
| GitHub public-check workflow | Short-lived GitHub OIDC token, verified against the configured issuer and signing keys, exact audience and an allowlisted repository ID/workflow/ref policy. Bind the allowed environment and trigger where applicable. Accept only registered public-check results for the configured production target. |
| Private collection worker | Dedicated restricted runtime/database principal; verify its actual authenticated identity at the server/DB boundary. Permit only fixed source-summary reads and technical observation/job writes. No caller-supplied identity override. |
| Local backup reporter | Registered producer key, with detached Ed25519 signatures verified using a vetted runtime library. Permit only minimal backup/rehearsal evidence for its registered environment and scope; no private readback or website-health assertions. |

GitHub's OIDC claims provide a basis for scoping trust to a repository and workflow context; decoding an unverified token is insufficient. The verifier must enforce its configured trust policy, token expiry and audience, rather than trusting posted repository names. [GitHub OIDC guidance](https://docs.github.com/en/actions/reference/security/oidc)

Record the verified producer identity/key version, immutable run ID, payload digest, check definition/version, target identity, environment, trigger and server receipt time. Signed backup payloads include a defined canonical representation, run ID, sequence and observation time; keys stay in the existing secure local configuration. Revocation prevents new submissions from that key while preserving truthful attribution of earlier accepted evidence. No key or token appears in responses, audit payloads or browser storage.

Use server-issued run generations for admitted check jobs and monotonic accepted sequence numbers for registered backup producers. Each source/target has a fencing rule: an older generation/sequence cannot overwrite newer current evidence. Retransmitting the same ID and digest is idempotent; the same ID with different bytes is rejected. An observation for another environment, check, producer or deployment is rejected before projection updates.

Check producers use three fixed operations: admit a registered run, append its bounded result batches, and finalise against its expected manifest. Bind a GitHub run to verified workflow run/attempt identity and the server-admitted target; admission does not permit reading other runs or private evidence. A producer cannot manufacture unlimited new authoritative run IDs in a result submission. Permit one active authoritative producer assignment per check/target; changing it creates an explicit generation transition so independent sequence spaces cannot compete. Backup uploads use their registered producer generation and signed sequence when offline admission is impractical.

For fresh check observations, the recommended maximum clock skew is five minutes. A backup artifact may legitimately be old or uploaded after the Mac reconnects: preserve its real completion time and current receipt time, and classify its age accordingly. Never make an old artifact fresh by uploading it today. Producer sequence resets/key changes require an explicit registered generation transition; a restart cannot silently bypass ordering.

Each scan declares its expected scope, manifest/version, cursors and completion state. Publish the completed scan atomically only after all required portions are validated. Partial valid observations may add confirmed problems, but cannot resolve existing problems or establish a global pass. Keep late results as historical evidence where policy permits; they cannot replace the current target's newer result.

A producer's signature proves origin/integrity within its trust boundary, not that every assertion is correct. Validate result shape and allowed check semantics, retain its stated coverage and distinguish producer-reported evidence from independently verified restore/runtime results. A compromised producer cannot gain business-write authority through this ingestion path.

## 15. Logical records and source contracts

The implementation plan should choose concrete schemas and migrations after this design is reviewed. The required logical boundaries are:

| Record | Required meaning and constraints |
| --- | --- |
| Operations settings | Stage, approved policy versions, freshness/budget defaults and source activation. Reuse the common console master gate. |
| Source/check registry | Fixed source ID, required capabilities, environment/target, definition version, cadence, expected coverage and safe destination mapping. |
| Producer registry | Verified identity/key reference, allowed checks/environments, validity/revocation and sequence generation. No exposed secret material. |
| Check runs and refresh receipts | Immutable operation fingerprint, trigger/requester, admission generation, timing, lease, terminal/pending state and bounded result references. |
| Observations | Minimal typed finding, source watermark, observation/receipt times, completeness and provenance. Technical append-only evidence subject to approved retention. |
| Attention projection and occurrences | Stable condition identity, current occurrence, first/last observation, last confirmed priority, uncertainty and authoritative resolution reference. |
| History references | Original source/event identity and safe normalised fields. Do not duplicate full audits or source snapshots. |
| Backup and rehearsal evidence | Artifact identifiers/digests, completion, coverage, validation scope/result and verified producer or operator attestation. |
| Optional aggregate cache | Authorised source scope, authority/policy version, watermarks and expiry; no shared customer-level cache. |

Reference existing records by opaque identifiers. Operations data must not cascade-delete orders, entitlements, recipes, publications, immutable audits or backup files. Deleting a source record follows its own policy; an inaccessible/deleted reference becomes a safe unavailable destination with retained permissible provenance.

Adapters expose a small typed contract: `describeSource`, `listAttention`, `readHealth` and `readHistory`. Human-facing calls receive a server-derived authorised scope and bounded cursor/query; machine collection uses a separately authenticated restricted collection contract. Results contain safe DTOs, source/definition version, watermark, observation time, completeness, next cursor and an explicit permission classification. The collector cannot submit arbitrary source reads through these interfaces.

Adapter failures are typed as unavailable, incomplete or unsupported rather than empty arrays representing success. A cursor continuation retains its query watermark and authority binding. Changed authority requires a new scope check and safe restart when appropriate. Missing fields required to establish resolution make that observation incomplete.

Business definitions stay in their source module. Do not create a parallel financial ledger, support-case lifecycle, approval record, collection-promise model or entitlement evaluator. Technical projection updates and scan-completeness promotion occur transactionally, independently of any network activity.

## 16. Backup and recovery readiness

Recovery status answers three separate questions:

1. **Completion and freshness:** when did an identified backup actually finish, and how old is it?
2. **Coverage:** which database, role/configuration and storage assets does that evidence include?
3. **Restore validation:** which artifacts were restored in isolation, when, and which application/security checks passed?

A recent dump alone answers neither coverage nor usability. The existing Mac job and historical rehearsal are source-confirmed procedures; their installed state and latest success still require live verification. The current managed-backup plan/settings are unknown here. If managed backup evidence is integrated later, label its actual provider, retention and verified coverage rather than assuming the runbook's historical tier remains current.

### 16.1 Minimal evidence manifest

Publish only registered environment, producer/run identity, start/completion times, opaque artifact IDs, digests, byte counts, declared dataset/bucket/version coverage, validation checks, warnings and result. Store server receipt time separately. Exclude raw dumps, storage objects, absolute local paths, connection strings, secret-bearing URLs and credentials. The app cannot browse the Mac's backup directory or infer a successful run from a configured schedule.

The existing daily local backup schedule is 03:30 in its configured local timezone and may run after wake. Show the actual timezone and finish time; daylight-saving changes and time spent powered off affect elapsed age. The 36-hour freshness threshold is a review default, not proof of backup failure or a guaranteed recovery-point objective.

### 16.2 Coverage and coherent recovery

Reconcile actual database schemas, migrations, roles/grants, authentication dependencies and approved asset buckets. Specifically resolve the documented `recipe-images` mirror and Phase 1's `recipe-previews` usage. An additive, non-versioned mirror needs an explicit recovery-consistency assessment; matching file counts alone cannot establish which versions belong with a database artifact.

Supabase database backups do not include the underlying Storage objects, so database completion cannot stand in for complete image recovery. [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups)

Show per-component included/excluded/unknown coverage and the consistency window. If required components are missing or unverified, label recovery coverage partial. Structural dump checks, nonzero files and matching hashes prove their stated properties only. They do not prove restored permissions, application access or complete recipe delivery.

### 16.3 Restore rehearsal evidence

Keep restore execution in the controlled runbook, in an isolated target. Phase 5 displays its approved evidence; it provides no restore button, production restore command or backup-download feature. A manually entered operator attestation is labelled as such and names its artifact/scope; it is not displayed as an automated verification.

A useful rehearsal verifies schema/migrations, required roles/grants and RLS, approved storage assets, public free-recipe delivery, authenticated paid-recipe access with a controlled account, collection promises/additions, source environment isolation, admin MFA/stages, and the integrated support/report permission boundaries. Rehearsals must prevent test restores from contacting production payment, email or notification services. Record omissions and failed checks alongside passes.

Record artifact digest, isolated target identity, operator/producer, start/finish, actual checks/results, measured duration and follow-up destination. A new storage layout, critical migration or changed permission model may make an earlier rehearsal insufficient even before the proposed 90-day review reminder. Recovery time remains unmeasured until a timed rehearsal supports it; the potential data-loss window follows actual recoverable artifact age and consistency, not the scheduled cadence.

Raw local backups retain their established protected-directory handling and never enter Git, CI artifacts or the admin UI. A Mac-only copy also carries availability risk; the overview must state verified copy coverage without implying an independently available off-device copy exists. Missing upload evidence means verification is needed; it cannot distinguish an offline reporter from a failed backup without additional evidence.

## 17. Deployment, access governance and reporting

### 17.1 Deployment evidence

Display trusted provider deployment identity/status, target origin/environment, expected revision, observed serving revision where available, and the check result bound to that target. Track the smoke-test script's checkout SHA separately: a workflow running from the default branch does not prove that the same revision is serving production.

Ready, deployment completed, public check passed and private runtime verified are distinct labels. If serving identity cannot be established, show that gap. Do not infer it from the latest local commit, a green build or an environment-variable name. Read-only deployment integration receives only the narrowly required provider scope; no redeploy, rollback or secret-edit action is introduced.

### 17.2 Access review

Use current named memberships, status, roles and explicit module/report grants from the authoritative Team source. Preserve the protected owner invariant. Show actual grant/revoke history and last completed review only when recorded evidence exists. An audit event is not automatically proof of last login, and a missing activity record does not establish inactivity.

Recommend a 90-day access-review reminder as a separate policy from the restore reminder. It is a routine review item, with earlier review appropriate after staff changes. Review decisions and permission changes remain in the existing Team workflow with its approvals/audit; Phase 5 adds no automatic revocation, invitation, bulk role edit or owner transfer. If Team has no review-attestation record yet, show review evidence as unavailable until an explicitly scoped Team capability supplies it. Viewing the list cannot mark a review complete.

### 17.3 Financial and performance summaries

Reuse Phase 4's authorised aggregate DTOs, financial/behavioural definitions, cache rules and independent watermarks. Initially the owner has financial-report access; future admins need its explicit grant. Overview/check authority alone never confers finance access, and a machine collector reads only permitted operational report-status evidence, not unrestricted revenue/customer aggregates.

A deliberate analytics-disabled state is normal. It does not disable purchase/entitlement accounting or create a failed-payment incident. Missing behavioural events cannot replace verified commerce facts. Reports remain labelled partial/unavailable when their source requires it; do not derive conversion, net revenue or refund totals from attention rows. Link to the original report for detailed analysis and existing controlled exports.

## 18. Privacy, audit and retention

All new destinations, actions, callbacks and return-navigation contexts preserve the existing admin analytics exclusion. Exclude private content from browser analytics, session replay, third-party error payloads, client debug logs, shared caches and public metadata. Event tracking may record only an expressly approved minimal operational event; there is no implicit permission to collect admin behaviour or person-level customer analytics.

Normalised overview/history/check payloads exclude customer emails, payment identifiers, free-text support notes, child/profile information, raw provider responses, backups, authentication tokens and signing keys. Staff identity is disclosed only as allowed by the source/Team capability. Scrub exceptions before logging and use safe error codes/correlation IDs. Error pages must not serialize private request context.

Maintain append-only provenance for admitted check operations, producer authentication outcomes and manual refreshes as appropriate; failed authentication logs must not store the rejected token or signed payload verbatim. Administrative audit integrity follows the existing source contract. Projection correction never edits an original business audit or fabricates approval.

| Data class | Retention decision |
| --- | --- |
| Original recipe/support/commerce/Team/report audit | Preserve the respective approved source policy; Phase 5 does not shorten or duplicate it. |
| Check runs, observations and machine authentication receipts | Approve explicit minimum/maximum retention and purge handling before enabling this new persistence. Keep only safe technical fields. |
| Active attention projection | Keep the minimum current condition and necessary evidence/provenance while active, within the approved policy; do not retain an unlimited raw history by default. |
| Resolved occurrences and normalised history references | Apply an explicit operational history policy; original source access remains separately governed. |
| Backup/rehearsal evidence and producer key provenance | Retain enough approved metadata to explain current recoverable artifacts and rehearsal claims; never retain secret keys here. |
| Aggregate caches and expired job leases | Short-lived, bounded and safely removable; expiry cannot erase business state or declare an issue resolved. |

Exact retention periods require the owner's adopted operational policy and applicable source constraints at activation. An unset policy keeps the affected new persistence/ingestion disabled; it does not justify unlimited retention or block an already permitted bounded source read in inspection mode. Purging old observations must retain only the approved minimal current evidence/reference, or downgrade the condition to unverified when its proof expires. A purge never manufactures health or deletes a source obligation.

The implementation must verify the privacy boundary in a browser with a public positive control: approved public analytics can work while admin routes, responses and admin return contexts remain excluded. This is a runtime acceptance gate, not something a written design can claim to have passed.

## 19. Query bounds, capacity and failure isolation

Defaults are 25 rows per page, at most 100; history queries span at most 90 days per request. Proposed producer-ingestion limits are 100 observations and 256 KiB per batch, with a defined complete multi-batch manifest. Larger scans continue through bounded cursors and cannot publish false completeness after the first page.

Use indexed source identifiers, condition keys and time/cursor fields. Apply the private statement/batch budgets in section 13 and cap worker concurrency per source. Respect provider quotas; no page-load provider fan-out or bulk Stripe scan. Source collection must not contend with checkout/fulfilment through long locks or unbounded joins. Any optional external provider request is read-only and part of its registered check definition.

An optional overview aggregate cache may live for up to five minutes, keyed by environment, authorised source scope, current authority version and definition/policy version. Recheck current membership/grants before every return; invalidating a cache cannot be the only revocation control. Cache refresh time never replaces the underlying source observation/watermark.

One unavailable adapter leaves other authorised modules usable and marks that source partial/unavailable. A failed common authentication/master-gate check denies all private access. A source disabled intentionally has a labelled disabled state and policy-defined effect on coverage; it is never silently treated as passed. Ordinary viewers cannot learn hidden-source outage counts through partial-status messaging.

When the whole site is unavailable, its UI cannot provide the primary outage channel. Preserve the existing external workflow/runbook evidence. New notification delivery, paging and automatic recovery remain outside this release.

## 20. Failure and recovery behaviour

| Situation | Required behaviour |
| --- | --- |
| Signed out, `aal1`, revoked or insufficient source permission | Deny private reads/check requests and receipt replay; refresh visible scope without leaking counts or cached payloads. |
| A planned module is not integrated | Show permitted coverage as not integrated; no zero-valued business summary or broken action link. |
| Source scan fails, times out or stops mid-pagination | Preserve last confirmed conditions with uncertainty; do not clear issues or promote complete coverage. |
| Older healthy result arrives after newer failure/deployment | Retain eligible history, reject it as current evidence and preserve the newer target result. |
| Refresh request times out after admission | Show its original pending/unknown receipt and allow receipt readback; no duplicate business operation. |
| Forged, revoked, replay-mutated or wrong-scope producer submission | Reject before projection writes; record only safe authentication/validation evidence. |
| Deployment is ready but serving revision is unknown | State the provider fact and verification gap separately; do not claim candidate runtime success. |
| Mac is offline or backup upload is missing | Mark overdue evidence/needs verification; do not assert failed backup or expose local files. |
| Database dump is current but required storage is unverified | Report partial recovery coverage; no complete-recovery claim. |
| Analytics deliberately disabled | Display disabled normally, preserve commerce/fulfilment status and avoid a false incident. |
| Refund outcome is unknown | Open the existing source receipt/reconciliation workflow; never initiate a second refund from Phase 5. |
| An adapter/rule generated a false positive | Disable/fix its reviewed definition, retain truthful provenance and obtain new source evidence; do not edit original business history. |
| Shared console or operations stage disabled | Deny new private reads/jobs/ingestion as specified below; retain original business/backup/public-smoke workflows and evidence. |
| Application itself is unreachable | Existing external checks/runbooks remain necessary; absence of a new Phase 5 alert is not proof of health. |

## 21. Activation, stages and rollback

Reuse the shared `private.admin_console_settings.console_enabled` foundation specified by the [Phase 3 implementation plan](../plans/2026-10-07-admin-customer-support-phase-three.md) once integrated and carried forward by the [Phase 4 implementation plan](../plans/2026-10-07-admin-campaigns-phase-four.md). Do not create a competing master switch. The existing server environment gate remains an additional web denial boundary, not the sole database gate. Phase 1's recipe `stage` still governs recipe inspection/editing/publication independently.

Proposed operations stages:

| Stage | Permitted operation |
| --- | --- |
| Disabled | No Phase 5 private read, new refresh or new observation admission. Existing source workflows retain their own gates. |
| Inspection | Authorised 5A reads/navigation from verified sources, including its narrowly scoped derived read-model maintenance when activated. Background collection/manual checks and external producer ingestion remain disabled. |
| Monitoring | Inspection plus registered, authorised scheduled/manual checks and minimal evidence ingestion. No business corrections. |

The common master gate being off denies new private reads, commands, collection and ingestion in every stage. An already admitted technical job may finalise its minimal terminal receipt under a restricted completion path, but cannot promote new current observations while disabled or restore browser access. Re-enabling requires a fresh admitted scan before claiming current health. Existing public GitHub smoke checks and the independent Mac backup may continue under their original authority, without new Phase 5 ingestion while disabled.

Source/producer activation requires reviewed target/environment, capabilities, trust policy, retention, check budgets, definitions and ownership. Use the established controlled configuration/release process, not a general settings editor. Producer keys and access are provisioned through secure operational handling; this design document provisions none.

Activate inspection first, verify owner and narrowed staff journeys, then admit one bounded producer and confirm actual receipts, ordering and disable behaviour. Add sources only after their real contracts pass verification. Obtain an independent final review before release; preserve the agreed Native execution approach for subsequent implementation.

Rollback disables Phase 5 reads/new collection, withdraws its navigation and returns `/admin` to the existing permitted landing route. Preserve business records, purchases, collection/campaign promises, grants, original audits, technical provenance and independent backup/public-check procedures. Disable a defective producer/adapter without disabling unrelated sources when possible. Use additive schema changes; no rollback requires deleting evidence or restoring a production database. A restarted collector establishes a fresh baseline without silently resolving old conditions.

Writing this document authorises no production activation, credential provisioning, schedule modification, backup transfer or restore. Those require the later approved implementation/release scope and its actual-target verification.

## 22. Delivery slices and dependencies

| Slice | Scope and prerequisite | Release evidence |
| --- | --- | --- |
| 5A.1 — Authority and source contracts | Integrate/verify the common master gate, operations read authority and at least one actual module adapter. | Current membership/MFA tests, source truth/coverage, safe DTOs and no hidden counts. |
| 5A.2 — Overview and history | Attention projection, evidence detail, original-workflow navigation, bounded history, privacy and disabled/fallback states. | Owner/narrowed-admin journeys, truthful source-derived/durable history, source-confirmed resolution, outage/partial scans and private browser verification. |
| 5B.1 — Observation execution | Registered producers, hourly/deployment/manual triggers, durable receipts, fencing, budgets and liveness. | Actual admitted/completed runs, wrong-scope/replay rejection, no business writes and disable rehearsal. |
| 5B.2 — Recovery and governance | Verified backup evidence/coverage, isolated rehearsal references, deployment readback, Team review and eligible Phase 4 summaries. | Actual producer receipt plus source evidence, explicit unknowns, review/report permissions and rollback verification. |

Phase 2 supplies collection promise/publication semantics; Phase 3 supplies support classification and the common console foundation; Phase 4 supplies campaign health and reporting authority. Phase 5 consumes those contracts. It must not implement a substitute just to fill a card.

The whole of Phases 2–4 need not ship before a clearly labelled recipe-only 5A, but the shared authority foundation must exist before activation. Full intended cross-module coverage requires the corresponding modules to be integrated and verified. Each release states its exact included sources and remaining coverage; a successfully delivered slice is not evidence that all Phase 5 runtime gates passed.

The next detailed implementation plan should map these slices to the then-current repository, schema and tests after written-design review. Keep Native implementation with an independent final review, as already chosen. No new product-policy question is required to finish this design; missing production identities, keys and retention values are activation prerequisites rather than reasons to invent current facts.

## 23. Concrete operating scenarios

| Scenario | What the operator sees and does | What establishes the new state |
| --- | --- | --- |
| Recipe awaits human review | Routine item; open the original recipe review workspace. | The source's authorised review/publication outcome, then a complete fresh observation. Opening the item changes nothing. |
| Verified purchase lacks promised access | Urgent after the source workflow confirms its classification; open the permitted support record. | Existing exact-approved repair/reconciliation and source-confirmed access. Phase 5 does not grant it. |
| Campaign update committed but refresh is pending | Follow-up with original operation receipt; open the campaign workflow. | Verified refresh completion. Do not publish the committed update again. |
| Hourly collection fails during an unresolved urgent issue | Retain its last-confirmed urgency with stale/verification evidence; show source coverage gap. | A later complete authoritative check, not an empty failed response. |
| New signed backup receipt covers DB but storage is unknown | Recent completion, partial recovery coverage and last actual rehearsal date. | Reconciled storage/version evidence and an adequate isolated rehearsal. Upload time alone changes neither. |
| A staff member loses support access after loading Overview | Subsequent detail/count/cursor/cache requests omit or deny support data. | Current DB authority at each request; the old page grants nothing. |
| An older public pass arrives after a new deployment fails | Keep the failed current target result and the old pass's historical target label. | New target-bound evidence; arrival order cannot overwrite run generation. |
| Owner reviews staff grants | Inspect permitted Team data and open the existing Team workflow for a decision. | An existing authorised Team action/review record. Viewing the list is not an attestation. |

## 24. Future runtime acceptance and verification

These gates are requirements for implementation/release. **They have not been run or passed by writing this design.** A docs-only check can establish clarity, link integrity and source consistency, not deployed runtime behaviour.

| Gate | Required evidence |
| --- | --- |
| A1 — Source fidelity | Registered actual adapters agree with authoritative source examples; unintegrated modules are labelled and never return fabricated zeros. |
| A2 — Authority and scope | Owner/narrowed-admin, signed-out, `aal1`, revoked and changed-grant cases cover rows, counts, badges, search, cursors, caches, details and receipts. |
| A3 — Read-only invariants | Database/provider evidence shows check execution changes technical records only, with no publication, price, money, entitlement, support-resolution or staff-grant writes. |
| A4 — Priority and uncertainty | Routine drafts, confirmed failures, formal deadlines, unknown provider outcomes and stale prior urgency receive the defined separate meanings. |
| A5 — Lifecycle | Duplicate observations, authoritative resolution and recurrence preserve stable identity, source proof and history without manual close controls. |
| A6 — Partial collection | Failed/truncated/cursor-interrupted scans cannot clear items, publish completeness or turn missing data into zero. |
| A7 — History integrity | Original timestamps/IDs, limited legacy provenance, safe reasons, bounded stable pagination and permitted source destinations are preserved. |
| A8 — Scheduler and liveness | Actual hourly/deployment/manual run records show trigger, target, script revision, timing and accepted completion; missed/failed uploads become stale evidence. |
| A9 — Producer trust | Wrong audience/repository/workflow/ref/environment, expired/revoked identity, mutated replay, sequence reset and late generation are rejected without current-state corruption. |
| A10 — Public versus private proof | Fixed GET checks verify meaningful public content without transactional effects; UI explicitly limits their coverage and separates private source evidence. |
| A11 — Private collection | Restricted principals cannot read arbitrary tables or invoke corrections; checkout/refund/dispute examples use source-verified classifications rather than browser inference. |
| A12 — Manual refresh | Current authority, same-origin protection, fixed targets, admission limits, shared active jobs, operation fingerprints and pending/terminal receipt readback work. |
| A13 — Backup evidence | Accepted signed receipt corresponds to a real identified artifact; old artifact/new upload, missing reporter and DB/storage coverage gaps display correctly without file exposure. |
| A14 — Restore readiness | A controlled isolated rehearsal records actual artifacts, permission/RLS and applicable free/paid/admin/module checks, omissions, duration and service isolation. |
| A15 — Deployment identity | Provider-ready state, script SHA, expected revision and observed serving/runtime evidence remain distinct; mismatches cannot be labelled verified. |
| A16 — Access governance | Current grants/protected owner and real review provenance are displayed; no invented last-login/review date or automatic grant/revoke occurs. |
| A17 — Reports | Existing finance/performance permissions, definitions and watermarks are reused; disabled analytics and provider outages neither leak financial counts nor affect commerce. |
| A18 — Privacy and retention | Browser public positive control/admin exclusion, scrubbed logs, no secret/raw data leakage, configured retention and evidence-expiry behaviour are verified. |
| A19 — Disable and rollback | Master/stage/producer disable blocks new private admissions, preserves source workflows and independent backup/public checks, and gives a permitted landing fallback. |
| A20 — Actual-target journey | On the authorised release target, owner and narrowed-admin journeys, scheduled/manual receipt readback, backup evidence and source-confirmed issue updates match the released revision and approved coverage. |

Use focused classification/adapter tests for logic; database integration tests for current authority, RLS, idempotency and transaction/fencing boundaries; browser checks for navigation, empty/partial states and analytics privacy; and isolated worker/producer tests for authentication, retries and failure handling. Keep test providers/environments explicit. No test should create a real refund, customer message, purchase or production restore merely to exercise the overview.

Before activation, run the applicable checks on the actual intended target and record its revision, configuration scope, results and unresolved limitations. A green build, source-only workflow definition, local backup schedule or written test plan cannot replace this evidence. Review can approve a smaller release scope, but excluded runtime gates remain explicitly unmet for the full phase.

## 25. Written review and activation prerequisites

The core product direction is agreed: operations first; 5A attention/history; 5B read-only checks/recovery/access review; existing source workflows retain their actions and approvals; notifications/coordination are deferred. Written review should confirm this document and its proposed operating defaults, including the three-hour check age, 36-hour backup evidence age, 24-hour dispute triage window, 90-day review reminders, producer trust boundaries and bounded refresh policy.

Before implementation activation, record the actual integrated module/schema revisions, shared master gate, permission mappings, intended production origin/serving identity, remote workflow configuration, allowed repository/workflow claims, restricted worker identity, backup producer/key registration, installed schedule/timezone, latest artifacts, asset coverage, adopted retention and isolated-rehearsal evidence. Resolve these from source/live evidence under the authorised release scope. Do not infer them from this plan.

Monitoring should explain actionable symptoms and its limits rather than accumulate signals with no operating decision; this design follows that principle while retaining explicit uncertainty and original-workflow ownership. [Google SRE monitoring guidance](https://sre.google/sre-book/monitoring-distributed-systems/)

Repository references for implementation review:

- [Existing production smoke workflow](../../../.github/workflows/production-smoke.yml).
- [Existing public smoke assertions](../../../my-curated-haven-web/scripts/production-smoke.mjs).
- [Backup and recovery runbook](../../../ops/README.md).
- [Admin console operating runbook](https://github.com/Pratikn07/my-curated-haven-web/blob/45ca05941efd9ce7bfc0e897e0b9048b00b22750/ops/ADMIN-CONSOLE.md).
- Phase 1–4 designs linked at the start of this document, plus their corresponding approved implementation plans.

After review of this written design, prepare the detailed Phase 5 implementation plan against the current repository. Product implementation and visual UI design remain separate next steps.
