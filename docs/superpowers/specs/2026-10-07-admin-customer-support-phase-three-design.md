# Admin customer purchases and access support: Phase 3 design

- Date: 2026-10-07, America/Los_Angeles.
- Status: revised for the owner's accepted refund-exception, dispute-handling, notification and non-expiry decisions. Technical design review, exact retention periods and production configuration remain separate; feature approval is not approval of an individual refund or email.
- Deliverable: functional and architectural design. Visual UI design, the implementation task plan, deployment and live support actions are separate work.
- Source baseline: remote `main` verified at `9bfdfc94390e5d3348a7b895d901ea81e13aac90`. Commerce source inspected in the collections showroom worktree at `f08e034ddda3a69c203828050d4aded38da0fd1e`, the corresponding navigation change before its squash merge.
- Admin planning baseline: `codex/admin-recipe-workspace-design` at `7176813`, containing the Phase 2 design and implementation plan, with existing uncommitted Phase 1 publication work preserved. Phase 2 is planned, not implemented by these documents.
- Verification boundary: current repository and primary provider documentation reviewed; production database contents, deployed payment behaviour, live sales and provider configuration were not verified for this design.

## 1. Purpose and success

Phase 3 gives the owner a reliable way to answer: **“This customer says they paid but cannot access their collection. What happened, and how do I resolve it?”** It extends the admin console with customer lookup, purchase inspection, access explanations, provider checks and narrowly controlled recovery. The first operator is the owner; additional named support admins must be possible without giving every recipe editor access to customer information.

The central support journey is:

**Find the account or order → understand the original purchase → explain current access → diagnose the mismatch → preview a permitted repair → human approval → apply and verify.**

The refund journey is **Open the original order → prepare a full or partial refund → preview the exact amount and access consequences → owner approves and submits → track provider status and reconcile access.** These are separate commands: repairing access never implicitly refunds money.

Success means the operator can distinguish an unpaid checkout from a missing fulfilment, a refunded purchase from a projection error, and an account mismatch from a genuine access failure. A customer should not be told to purchase again simply because a webhook or projection is late. Equally, a repair must not recreate access that was legitimately removed.

This phase is a support workspace, not a general sales dashboard, customer relationship platform or replacement for Stripe Dashboard. Interface styling and detailed screen layouts remain for later UI/UX work. The workflows, information hierarchy, decisions and failure states are defined here so the later interface has a clear contract.

## 2. Decision register

| Status | Decision | Design consequence |
| --- | --- | --- |
| Established across the admin work | Owner first; future admins supported | Named memberships, explicit permissions and current authority checks. |
| Agreed in Phase 2 | Preserve what buyers purchased, and give them future additions | Support explains access through original sources and the approved collection succession policy. It never manufactures another purchase for an addition. |
| Agreed in Phase 2 | Human approval of exact publication changes; agents can execute specifically approved proposals through protected database commands | Carry the same exact-proposal approval and human/executor distinction into new manual support repairs. This extension is proposed for Phase 3 review. |
| Proposed Phase 3 scope | Start with lookup, explanation and diagnosis, then enable repair | Three independently gated delivery increments. |
| Agreed on 2026-10-07 | Include secure refund initiation inside admin in Phase 3's first complete release | Add separately gated, owner-approved full/partial refunds with durable intents, bounded idempotency and recovery. No automatic refund or unrestricted money API. |
| Agreed refund safeguards | Exceptional owner-only browser submission initially; original payment and exact approved amount | Separate refund capabilities, current membership/MFA, trusted server credentials and immutable approval/receipt. Refund cancellation and agent money submission remain deferred. |
| Proposed Phase 3 default | Repairs restore documented rights, not discretionary rights | No arbitrary unlock, goodwill grant, ownership transfer or account merge in the first release. |
| Proposed Phase 3 default | Owner approves repairs initially | Future operators may prepare and execute owner-approved repairs; delegation of approval requires an explicit capability grant. |
| Agreed commercial policy | No general refund promise; retain the admin tool for exceptional owner-approved cases | No advertised money-back window or automatic refund eligibility. Duplicate charges, unresolved delivery/access failures and required remedies are investigated individually. |
| Agreed refund access rules | Pending and partial refunds retain access; successful full refunds remove only that purchase source | Other valid purchases/grants remain available, including their qualifying additions. |
| Agreed dispute policy | Verified formal disputes temporarily hold that purchase source; inquiries do not automatically revoke access | Create a private case and owner attention item with reason/deadline. Restore eligible rights on verified favourable resolution; a lost/reversed payment no longer supplies access. |
| Agreed notification workflow | Prepare a neutral dispute email for the owner to preview and approve | No automatic customer email on a webhook. Verified recipient, current effective access, exact message approval and durable send result required. |
| Agreed access duration | No planned time-based expiry of purchased collections | New approved collection policy uses no scheduled expiry. Refunds/disputes/content/account restrictions remain separate; no blanket promise of perpetual service operation. |
| Agreed retention principle; periods open | Minimise temporary notes/diagnostics and preserve purchase/access and approval evidence under separate rules | Record exact schedules before the affected production features activate; do not invent day/year counts or expire ownership when deleting a support note. |

These accepted product decisions close the previously open refund/access/dispute/duration questions for the new policy. Technical proposals still need written-plan review. Approval of the document must not be represented as approval of any individual customer's repair, refund or email. Older commerce documents contain earlier proposed defaults; the implementation policy matrix must reconcile them with these later decisions and preserve the historical terms of existing orders.

## 3. Existing systems and gaps

| Area | Source-confirmed position | Phase 3 responsibility |
| --- | --- | --- |
| Orders and financial history | Private offers, order snapshots, provider payments, refunds, disputes, event inbox and outbox tables exist. Orders have support references and separate attempt states. | Read original bindings and historical terms; do not infer them from current prices or collection titles. |
| Access lineage | `private.access_sources` supports `stripe_purchase`, `native_legacy`, `support_grant` and `promotional`; `public.access_entitlements` is a projection. | Explain each source and recompute through shared policy. The existence of a source type does not authorise new support grants. |
| Customer refresh | `reconcileAndFulfillSession` is scoped to an authenticated customer's own order. It skips provider retrieval after a local successful payment is found. | Build a fresh, complete support reconciliation contract; wrapping this function is insufficient for current refunds/disputes. |
| Payment writer | `private.record_payment_and_grant_access`, as replaced by the remediation migration, checks snapshot account/mode/amount/currency and rejects a payment already bound to another order. It then makes the purchase source eligible. | Preserve those guards and harden shared eligibility evaluation so replaying a success cannot bypass adverse adjustments, expiry, closure or holds. Verify the final integrated source before choosing migration details. |
| Refund writer | `private.record_refund_and_recompute_access` aggregates successful refunds; at the full captured amount it disables the matching purchase source and reprojects access. | Validate complete payment/order/account/mode bindings, support later lifecycle changes and preserve unrelated sources. Do not assume every policy transition is already handled. |
| Provider events | The reviewed handler processes paid checkout completion and refund creation/update, plus refunds embedded in `charge.refunded`. | Verify delivery configuration and fill required lifecycle coverage. No dispute lifecycle or delayed-payment success/failure handler was found in the reviewed fulfilment module. A table is not proof of complete ingestion. |
| Customer APIs | Status and refresh routes restrict records to the current customer. | Keep those boundaries. Admin cross-customer inspection needs a separate authorised interface and minimal support DTOs. |
| Admin authority | Phase 1 defines owner/viewer/editor/reviewer/publisher and recipe permissions, MFA and current DB membership checks. | Add an opt-in support capability set. A recipe viewer is not automatically a customer-data viewer. |
| Collections | Phase 2 specifies immutable purchase history plus approved successor access and correction handling. | Integrate its finished resolver and checkout changes. Do not rebuild a separate support-only interpretation of collection ownership. |
| Account closure | An existing manual runbook covers closure and retention, with older launch assumptions. | Preserve historical ownership and route recovery/closure to its separately approved process. The old assertion that checkout is not live is not current production evidence. |

Current source anchors are listed in section 20. These findings describe inspected code, not a claim that migrations or services are deployed. Before implementation, reconcile completed Phase 1, current main and the final Phase 2 integration; do not build Phase 3 against this planning branch as if all prerequisites already exist.

## 4. Scope and architecture choice

Three approaches were considered:

| Approach | Advantages | Limits and risks |
| --- | --- | --- |
| Inspection-only dashboard | Smallest initial surface; customer/order facts are easier to find. | The owner still uses separate tools and SQL for recovery; inconsistent fixes remain possible. Useful as increment 3A. |
| Order-centred support workspace with controlled reconciliation — recommended | Connects evidence, diagnosis and repair around the same purchase; supports gradual permissions and rollout. | Requires shared state evaluation, approval receipts and concurrency work before repair can be enabled. |
| Full commerce administration | Refunds, grants, transfers, prices, promotions and reporting in one place. | Introduces several independent money and identity workflows before the core support path is proven. Defer to later phases. |

The recommended architecture uses the existing admin application, commerce ledger and Phase 2 access resolver. Add private support records and narrow server/database contracts. Keep financial truth in the provider and local ledger, effective access in the shared resolver, and human support decisions in the audit trail. Avoid a parallel “admin access” boolean or a second purchase database.

Initial scope includes exact lookup; a small actionable exception queue; account/order details; original versus current collection context; access lineage; provider inspection; case notes; approved evidence-based repairs; refund/dispute visibility; exceptional owner-approved full/partial refund initiation; owner-reviewed dispute notices; and auditable results.

Deferred work includes refund cancellation, bulk/automatic refunds, charges, checkout creation on behalf of customers, discounts, price editing, subscriptions, bulk edits/exports, arbitrary support grants, source revocation overrides, account transfers/merges/deletion, password or MFA resets, customer impersonation, automated bank-dispute responses, file attachments and general customer messaging. Only the fixed, owner-approved transactional dispute notice in section 9.4 is included. Connect transfer reversals/application-fee refunds and the `fraudulent` refund reason also require separate design. Later inclusion needs its own policy and authority contract.

## 5. Lookup and customer context

### 5.1 Supported entry points

Support starts from an exact order support reference, exact normalised account email or exact internal account ID. A provider payment/session ID is an advanced exact lookup for operators with provider-inspection permission; match it within the selected provider account and mode. A support reference locates a record but is not proof that a person contacting support owns it.

Use the identity system's established email normalisation. Do not apply provider-specific guesses such as removing dots or plus suffixes. Do not use billing email, a forwarded receipt or a recreated email account to transfer purchase ownership.

Results distinguish `found`, `not_found`, `unconfirmed`, `ambiguous` and `unavailable`. Ambiguous results require selecting and verifying a specific account; never choose the first row. An order with a closed account can be inspected under the financial-record permission without inventing a current customer account. An identity lookup outage must not become “no purchase found.”

### 5.2 Information available

Customer context contains the minimum useful identity, confirmation/account-availability state, order references, collection access summaries and support case history. It excludes child profiles, chats, preferences, passwords, MFA secrets, card details and unrelated native-app activity. Exact email is restricted support information and should not appear in URLs, analytics or default logs.

Orders are paginated. Show test/live mode prominently and separate the default live workspace from test fixtures. Preserve a route from order to its recorded owner principal even if the Auth link has been removed. Do not search retained orders by guessed historic email when the retention policy no longer permits that link.

An initial attention queue is limited to supported operational signals: recorded binding review, failed/pending reconciliation, verified paid-but-unfulfilled mismatch, unresolved support cases and known refund/dispute follow-up. Include a reason and observation time for each item. Do not label all open checkouts as failed, scan the whole provider account on every page load, or treat missing telemetry as a financial anomaly.

## 6. Purchase and access explanation

### 6.1 Keep independent states visible

| Axis | What the operator needs to know |
| --- | --- |
| Checkout attempt | Creating, creation unknown, open, processing, review or closed; whether a hosted attempt remains unresolved. “Closed” does not mean “unpaid.” |
| Payment | Captured/not captured/processing/unknown, amount and currency, provider binding and last verified time. |
| Refund | Each refund's status and amount; total successful refunds compared with captured amount. Pending is not completed reimbursement. |
| Dispute | Inquiry versus formal dispute, provider status/deadline when available, and separately the applied access policy. |
| Source eligibility | Whether this order currently supplies access, applicable term and exact exclusion reason. |
| Effective collection access | Access from all qualifying sources, approved successor additions, and any content availability restriction. |
| Account availability | Whether the recorded owner can currently authenticate and use product access. |

Do not collapse these into a single green “paid” badge. For example, a paid order can be fully refunded while a separate native grant still gives collection access. The repair preview must explain the difference between changing this order's source and changing the customer's final access.

### 6.2 Original purchase versus current collection

Display the order's frozen release, manifest/checksum, amount/currency and policy versions. Show original captured totals separately from current price and successful refunds; use integer minor units and currency-aware formatting. Validate the supported subtotal/tax/discount/quantity composition against the frozen order contract. Do not total different currencies together. Preserve original financial occurrence times separately from verification times; a support check is not a new purchase date. Preserve “historical field unavailable” for incomplete legacy records instead of backfilling today's terms as historical truth.

For Phase 2 collections, explain the original member set, approved later additions and current approved recipe corrections. Corrections do not become new purchases; additions do not become independent grants. Effective successor access is inherited only through qualifying original sources under the versioned policy. Unreconciled legacy grants remain explicitly unresolved and must not be silently broadened.

Example: an order purchased release A with five recipes; the approved successor has three additions. A qualifying source supplies access to the original five and the three additions. A full refund makes that order stop supplying all eight. If another valid source remains, its independently permitted access continues. A withdrawn recipe remains in purchase history with an availability explanation; support cannot bypass a safety/content hold.

### 6.3 Provenance and freshness

Every diagnosis identifies local ledger observation time, last provider verification, resolver/policy version and affected publication version. A timeline distinguishes provider facts, human decisions, system attempts and completed local writes. Show an unavailable or incomplete provider check explicitly; never present a cached observation as a fresh verification.

The support view uses the same access evaluator as customer library/detail/recipe/print/download authorisation. It may explain more private reasons, but it must not grant more rights or read as the customer. A local preview of expected access is not proof of a successful signed-in customer session.

## 7. Diagnosis and permitted resolutions

| Situation | Diagnosis | Initial resolution |
| --- | --- | --- |
| Verified payment, no local payment/source | Fulfilment gap after exact binding checks | Preview recording the verified payment and restoring only its documented source. |
| Eligible source exists, projection missing/stale | Access projection mismatch | Preview recomputation from all valid sources; preserve source history. |
| Payment open, unpaid or still processing | No verified completed purchase yet | Explain/wait/recheck the same attempt. No grant and no replacement checkout from this workspace. |
| Provider or identity check unavailable | Evidence incomplete | Keep current recorded state; report unknown and retry safely. |
| Captured amount, currency, account, mode or order binding mismatch | Financial/identity conflict | Block automatic repair; owner review against original records. |
| Payment succeeded, then refund/dispute changed | Later adjustment affects this source | Import verified facts and apply the approved policy; do not replay a success to force access. |
| Checkout email differs from signed-in account | Receipt identity differs from order ownership | Explain the recorded purchase account; use the established recovery process. No email-only reassignment. |
| Account closed, recreated or disabled | Ownership/account availability conflict | Financial inspection only; separate account recovery/retention process. |
| Collection addition missing | Resolver/publication/projection mismatch | Use Phase 2 successor policy; repair only a proven projection problem. Fix publication defects in Phase 2. |
| Recipe withdrawn or protected asset unavailable | Content/delivery issue | Link to the responsible content/operations workflow; access repair cannot override it. |
| Two verified payments for the same collection | Possible duplicate purchase | Preserve both records; owner may prepare an exact refund of the selected payment under policy. No automatic refund or deletion. |

Diagnostics distinguish facts, inferred explanations and recommended next actions. An agent-generated narrative cannot independently authorise a state transition. Known conflicts remain visible even when another valid source masks the customer's immediate access problem.

## 8. Provider inspection and repair workflow

### 8.1 Inspect current provider state

**Check provider status** retrieves the order-bound session/payment/charge and relevant refunds/disputes using server-held configuration for the exact provider account and test/live mode. Verify the credential/account binding rather than trusting a locally stored account label. Fetch complete paginated adjustment records where necessary; absent data in a partial response is not proof that an adjustment does not exist.

This diagnostic operation may store an immutable private observation and audit record. It does not alter eligibility, charge/refund money or send messages. Store normalised facts, provider object identities, verification time, completeness and provenance rather than unrestricted payloads. Missing configuration and unsupported provider states produce explicit blockers. Mock sessions are confined to isolated fixtures and cannot support live repair.

### 8.2 Prepare an exact proposal

Prepare a repair only from a complete supported observation and current local state. The proposal includes target account/order/source, observed provider bindings, original financial terms, policy and collection versions, expected row versions, before/after eligibility, before/after effective access, side effects, reason, affected scope, blockers and a canonical digest.

The first release supports two commands:

1. **Reconcile verified order facts and eligibility:** persist verified financial facts, create/update only the original purchase source when justified, and recompute effective access under approved policy. The result can restore or remove this source's access; the preview must say which.
2. **Rebuild access projection:** preserve financial/source facts and recompute a demonstrably inconsistent derived projection through the shared resolver. It cannot turn an ineligible source into an eligible one.

Do not offer raw field editing, “mark paid,” “force unlock,” “ignore dispute,” direct entitlement mutation or a new discretionary grant. Existing administrative holds remain separate facts and cannot be cleared by these commands. Unknown legacy policy/binding or an unresolved identity conflict blocks execution.

### 8.3 Approve, apply and verify

The owner reviews a concrete proposal and selects **Approve and apply repair**. Other staff initially prepare proposals for owner approval. Approval binds the exact digest, target and consequences; it is not a reusable permission to repair the account later. A proposed default is a five-minute maximum proposal/approval lifetime, with fresh provider retrieval during execution regardless of age. Changed facts require a new preview and approval.

After approval, retrieve current provider facts outside any SQL transaction, then compare them with the approved proposal. Compare material financial/access facts; a later verification timestamp alone does not invalidate unchanged evidence. Recheck current membership, permission, MFA, account state, policy, collection dependencies and row versions before committing. A webhook or another operator may have already completed the intended repair: return a verified no-change result if the approved effect is already satisfied; reject materially changed consequences.

Apply facts, source eligibility, projection, case linkage, audit and any permitted side-effect records in one transaction. Return a durable receipt and reread the account's effective access through the production resolver. If commit succeeded but the client lost the response, retrieve that receipt by operation ID. Do not run a different repair merely because the first response was lost.

Afterwards show **applied**, **already satisfied**, **blocked/stale**, **pending verification**, **failed without commit** or **outcome unknown** accurately. Database success plus a failed follow-up read is “applied; verification pending,” not a rolled-back failure. Support resolution requires a recorded post-check or an explicit remaining customer/account action.

## 9. Refund and dispute boundaries

### 9.1 Secure refund initiation — included in the first release

The owner accepted secure in-panel refunds for exceptional, individually owner-approved cases alongside a policy of no general refund promise. The tool does not create a customer-facing refund entitlement or advertised refund window. Investigate duplicate charges, unresolved delivery/access failures and applicable required remedies; do not convert an ordinary change-of-mind request into an automatic refund. Customer-facing terms must reflect the approved selling markets and applicable rights. Stripe provides a server-side API for full/partial refunds, expressed as positive integer minor units within the original charge's remaining amount. Refunds return to the original payment method; a submitted request can still be pending or fail. [Stripe create refund API](https://docs.stripe.com/api/refunds/create), [Stripe refund lifecycle](https://docs.stripe.com/refunds)

The recommended first-release authority is owner-only preparation, approval and submission through the authenticated admin browser. Use separate `support.refund.prepare`, `support.refund.approve` and `support.refund.execute` capabilities. A support operator's repair authority does not include refund authority. The server requires current owner membership and the relevant capability, MFA `aal2`, same-origin intent and the dedicated refund submission gate. Delegating refund authority needs a later explicit decision and named grants.

**Prepare and preview.** Select full remaining amount or enter a partial amount, plus an internal reason and supported provider reason (`requested_by_customer` or `duplicate`). Full remaining becomes a fixed amount at preview; it never expands automatically before submission. Bind the original order, owner principal, provider account/mode, captured charge/payment, amount/currency, policy versions and expected access effects into the proposal digest. Display original capture, successful/pending refunds, locally reserved amounts, proposed refund, remaining balance and effects on original/additional collection access. Reject zero, negative, fractional, unsafe integer, wrong-currency and excessive amounts server-side.

**Verify before submission.** Require a complete fresh provider check and approved refund/access policy at preparation and dispatch. Reserve capacity against successful refunds, pending/requires-action refunds and unresolved local submissions; deduplicate a local intent already represented by a provider refund. Block a new submission while another refund on the same payment is in flight or outcome-unknown. Block uncaptured/fully refunded payments, active formal disputes, unknown bindings/policies or unsupported Connect fee/transfer flows. Stripe's own remaining-amount constraint remains the final protection against a concurrent Dashboard refund. Changed financial facts or access consequences require another preview and approval.

**Approve and submit.** A single clearly labelled “Approve and submit refund” action may record approval and begin submission, but internally it must first persist the exact human approval and durable intent. Approval expires within five minutes. Store the requesting human, exact digest and reason separately from the server executor. The trusted server uses a restricted Stripe key with only the required refund write/read permissions; no key reaches the browser, agent SQL session or source control. Verify that the actual account supports the needed restricted permissions before enabling the feature. [Stripe restricted API keys](https://docs.stripe.com/keys)

**Recover safely.** Commit an operation UUID, canonical provider request, payment reservation and stable provider idempotency key before the external call. Use short DB transactions; never hold locks over Stripe requests. Same-operation retries reuse the exact key and body. A timeout, lost response or ambiguous provider error is `outcome_unknown`, not proof that no refund occurred. Stripe can retain the first result including a server error, and keys can be pruned after at least 24 hours; project retry policy therefore stops all resubmission at 23 hours from first dispatch and permits reconciliation only afterwards. [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)

Resolve unknown outcomes through a known refund ID or a complete payment-scoped provider lookup with the recorded operation correlation and exact binding/amount/currency. Correlation metadata is not approval evidence. Ambiguous absence is not permission to create a fresh operation/key. A dispatched unknown request remains reserved and blocks another refund until conclusively resolved. Bounded same-key transport recovery does not approve a new refund: any resend still requires current owner authority, an enabled submission gate and unexpired five-minute approval. After either deadline, use reads only. Recording/reconciling an already dispatched result continues through trusted recovery. Do not evade these rules with automatic SDK retries.

**Report the actual result.** Distinguish not dispatched, outcome unknown, submitted/pending, requires action, succeeded, failed and canceled, separately from local ledger reconciliation. Persist a provider refund fact even if a local lease expires or audit/projection writes fail after Stripe accepts it. Report “submitted; local reconciliation pending” and recover; external money movement cannot be rolled back by SQL. Keep approval, attempt, provider ID and final receipt auditable. Revocation or disabling submission blocks new dispatches but must not erase or prevent recording an already sent operation.

Access changes come from verified lifecycle facts and the shared versioned policy, never from clicking submit. Pending refunds retain recorded access; under the agreed new policy, a successful partial refund retains the source and a cumulative full refund removes only that purchase source and its dependent successor rights. Other valid sources continue to compose. Provider transactional notifications may occur according to Stripe settings; preview this possibility, verify configuration and avoid duplicate application messages. No general support messaging endpoint is added; the separate exact-approved dispute notice is defined in section 9.4.

Stripe Dashboard remains available through server-constructed, validated links for unsupported/escalated cases, with independently managed Stripe permissions. Cancellation, bulk refunds and the `fraudulent` reason remain outside this release; Stripe's fraudulent reason also changes blocklists, so it must not be offered as an incidental note choice. [Stripe refund reason behavior](https://docs.stripe.com/api/refunds/create)

### 9.2 Agreed access rules and historical-policy mapping

Use the order's approved versioned policy. The owner accepted the following baseline for the new collection policy. Record the decision/version in the implementation policy matrix; do not retroactively replace historical terms or infer a new advertised refund promise:

| Verified financial condition | Agreed effect for the new policy |
| --- | --- |
| Paid; no disqualifying adjustment; term/account valid | Purchase source eligible. |
| Refund requested, pending or requires action | No revocation solely because a request exists. Show follow-up state. |
| Successful partial refund below captured total | Source remains eligible unless the approved historical policy says otherwise. |
| Successful cumulative full refund | Only the qualifying purchase source becomes ineligible; recompute other sources and successor access. |
| Refund later failed/canceled/returned | Re-evaluate current complete facts and all other exclusions; never reactivate blindly. |
| Inquiry/early warning | Surface for review; no automatic source revocation solely from classification. |
| Formal open dispute | Temporarily hold only the affected purchase source under the agreed policy; block manual restoration while the dispute remains open. Other qualifying sources compose normally. |
| Dispute won/favourably resolved | Re-evaluate payment, refunds, term, account and holds; winning alone does not force restoration. |
| Dispute lost | This payment no longer supplies access under the agreed policy; do not revoke unrelated rights. |
| Missing policy or unknown provider classification | Explain uncertainty and block new repair. Do not silently invent a new access rule. |

Stripe distinguishes inquiries from formal disputes; provider status should be preserved alongside the local policy interpretation. [Stripe dispute lifecycle](https://docs.stripe.com/disputes/how-disputes-work)

The new product rules are accepted, but live evaluation still requires their approved versioned mapping and verified order binding. Historical or unknown policies remain blocked until reconciled; do not ask for the already agreed product decisions again. Do not retroactively apply a newly chosen policy to old orders without a separately approved migration. Unknown policy blocks new repair rather than automatically removing otherwise recorded access.

New collections have no scheduled access expiry (`expires_at` remains unset under the approved indefinite policy). Do not add an arbitrary expiry to resolve a support case. Existing native/promotional or historically finite sources retain their own verified terms until separately reviewed. Support-note or diagnostic retention never changes purchase ownership.

### 9.3 Lifecycle correctness

Reconciliation must handle refund updates/failures/cancellations, dispute lifecycle changes and the asynchronous payment methods actually enabled. Verify the account's event subscriptions and supported API version during implementation. Include complete pagination, precise object bindings and periodic/on-demand recovery for missed deliveries. Do not infer this coverage from an event table.

Webhook delivery can be duplicated and arrive out of order. Use event identities for inbox deduplication and canonical provider retrieval plus fenced state transitions; do not use event timestamps as a total ordering or erase a known adverse adjustment because an older success arrives. [Stripe webhook delivery guidance](https://docs.stripe.com/webhooks)

Existing checkout/webhook fulfilment continues under its approved automated commerce policy. New manual support repairs require exact human approval. This design does not introduce an operator approval click for every normal customer purchase. Both paths must share the same eligibility evaluator so ordinary processing cannot undo a support repair or adverse adjustment.

### 9.4 Owner-approved dispute notice

A verified formal dispute creates/updates one case keyed to the provider dispute and raises an owner attention item with its response deadline. Shared automated reconciliation applies the approved purchase-source hold; a manual support repair cannot override it. An inquiry or fraud warning does not trigger the formal-dispute hold template. Bank acceptance/evidence submission remains an owner action in Stripe Dashboard; an email does not replace that response. [Stripe responding to disputes](https://docs.stripe.com/disputes/responding), [dispute withdrawal](https://docs.stripe.com/disputes/withdrawing)

Prepare a neutral fixed-template draft from current complete facts. It identifies the collection/order reference, explains the actual access consequence and provides the configured support contact. If another qualifying source still supplies access, the message must say that collection access continues rather than claiming a complete lockout. Avoid accusations, card/bank details, pressure to withdraw a legitimate dispute or a request to buy again.

Resolve the recipient from the current verified Auth identity bound to the recorded purchase owner. Never use a pasted address or untrusted billing/metadata email; missing verification, closure or ownership ambiguity blocks sending and leaves a follow-up in the case. The owner previews the exact recipient, subject, body, template version and dispute/access state. Owner-only `support.notice.prepare`, `support.notice.approve` and `support.notice.send` capabilities require current membership and `aal2`; existing repair/refund permissions do not authorise email.

Approval binds the exact message digest and recipient/state version for at most five minutes. A resolved dispute, changed recipient or different effective access invalidates an unsent draft/approval. A separate `dispute_notice_enabled` switch defaults false. The webhook may prepare an attention item but never approves or sends customer mail. Agents may suggest wording; they cannot authorise or dispatch a notice.

Persist a durable approved send intent, unique dispute/notice-type key and attempt before calling the trusted transactional mail transport outside DB locks. Return `accepted`, `failed_before_acceptance`, `outcome_unknown` or `not_sent` accurately. Provider acceptance is not inbox delivery; record delivery/bounce only from verified provider evidence. An unknown send must not be retried blindly or through a new operation. Keep safe provider-message references, exact approved-content evidence and delivery state under the configured retention policy, with no open/click tracking.

Reuse a verified application mail adapter if one exists at implementation time. The inspected payment application has no established mail-sending integration; Auth OTP delivery alone does not prove one exists. The implementation plan specifies a narrow SES adapter if that remains the configured provider, with production sender/permission/delivery readiness verified separately. A disabled send gate or actor revocation blocks new sends while already dispatched result capture remains available. No customer message or provider change is authorised by writing this document.

## 10. Support cases and history

Use lightweight private support cases rather than building a ticketing platform. A case records a primary account or order, reason category, optional concise note, creator, status, relevant order references and operation receipts. Proposed states are **open**, **investigating**, **waiting on customer**, **waiting on provider** and **resolved**. Reopening preserves earlier resolution history. Resolving a case does not change financial or access state.

Suggested categories are missing access, unresolved payment, account mismatch, refund follow-up, dispute follow-up, duplicate purchase and content availability. These are operational labels, not automatic policy decisions. Staff can add bounded internal notes with their own identity/time; corrections append an amendment rather than silently rewriting the audit history. Cases and notes are not visible to customers.

Avoid attachments, pasted card/bank data, full private transcripts and unrestricted provider payloads. Store a minimal external correspondence reference when necessary. Notes must have explicit retention/redaction rules before production, including how a redaction preserves the fact and actor of the change while removing personal text. Financial/audit retention must not imply indefinite retention of free-form notes.

The timeline includes case activity, provider observations, approvals, execution attempts, successful commits, no-change receipts and post-check results. Read-only sensitive lookup and detail access are auditable without logging the searched email or response body. Case status never hides an unresolved money/access discrepancy.

## 11. Roles, permissions and privacy

Extend the existing console membership model with explicit support capabilities. Proposed permission names are design contracts, not functions already implemented:

| Capability | Owner | Future support viewer | Future support operator |
| --- | --- | --- | --- |
| `support.read` — minimal customer/order/access/case/history reads | Yes | Yes, explicitly granted | Yes, explicitly granted |
| `support.case.write` — create cases and append notes | Yes | No | Yes |
| `support.provider.inspect` — provider identifiers and fresh diagnosis | Yes | No by default | Yes |
| `support.repair.prepare` — exact proposal creation | Yes | No | Yes |
| `support.repair.approve` — human approval of permitted effects | Yes | No | No initially |
| `support.repair.execute` — apply a currently approved proposal | Yes | No | Yes, only within that approval |
| `support.refund.prepare` — fixed amount and effects preview | Yes, explicit grant | No | No initially |
| `support.refund.approve` — exact human refund authorisation | Yes, explicit grant | No | No initially |
| `support.refund.execute` — trusted browser-triggered submission | Yes, explicit grant | No | No initially |
| `support.notice.prepare` — bound dispute-message preview | Yes, explicit grant | No | No initially |
| `support.notice.approve` — exact recipient/content approval | Yes, explicit grant | No | No initially |
| `support.notice.send` — dispatch an approved transactional notice | Yes, explicit grant | No | No initially |
| Account transfer or discretionary grant | Separate future workflow | No | No |

Do not infer any support capability from `recipe.read`, `recipe.edit` or publication permissions. Owners receive the approved support set through an explicit migration/bootstrap decision; other existing members receive none by default. Do not seed real account identities in migrations. Introducing additional staff approval later requires the owner to grant the specific capability, not a code change that broadens all recipe roles.

For browser operations, derive the actor from verified authentication and `auth.uid()`, require `aal2`, and check active current DB membership, support stage and exact permission on every read and write. Recheck both executor and authorising human at a local repair commit and immediately before a new refund dispatch. Trusted recording/recovery of an already dispatched financial result continues even if that human is later revoked; new dispatch and receipt access remain denied. Do not trust editable profile metadata, posted actor UUIDs or stale role claims. Receipt access is also permission-checked after revocation.

Return minimal typed DTOs, not raw joined rows. Private tables stay outside public exposure; security-definer wrappers need fixed search paths, narrow EXECUTE grants and parameter validation. A browser never receives a service-role credential. Existing server commerce credentials must not become a general client-accessible cross-customer API.

Use private/no-store responses, actor-scoped server caches where unavoidable, and no shared customer-detail caching. Support routes, search fields, notes, approvals and provider links are excluded from optional analytics, replay and session recordings. Logs retain safe support references, operation/correlation IDs, bounded reason codes and outcomes; redact emails, provider response bodies, tokens, billing details and library error objects. Rate-limit searches and checks, cap page sizes and never disclose total customer lists without an explicit product need.

Protect browser mutations against cross-site requests and validate same-origin intent. Lost MFA/current authority hides details and invalidates pending actions. Permission errors, empty results and outages need distinguishable operator explanations without leaking information to unauthorised callers.

## 12. Data and command model

Reuse orders, payments, refunds, disputes, sources, manifests and access projections as authoritative domain records. Add only the support-specific records required by the workflows:

| Logical record | Minimum responsibility |
| --- | --- |
| Support case and case events | Account/order linkage, category, bounded notes, state and append-only activity. |
| Provider observation | Order/account/mode binding, normalised current facts, completeness, verification time, provenance and evidence digest. |
| Repair proposal | Exact supported command, before/after effects, row/policy/publication versions, evidence references, digest, expiry and blockers. |
| Human approval | Authorising identity, target proposal/digest, reason, expiry and approval channel. |
| Support operation/receipt | Idempotency key, request digest, executor/attestor, fencing token, current outcome, committed audit/projection references and post-check result. |
| Refund proposal/approval | Fixed integer amount/currency, original payment binding, provider/internal reasons, complete evidence, available balance, expected access effects, digest and exact human approval/expiry. |
| Refund intent/attempt/receipt | Durable request and stable provider key, first-dispatch/retry deadline, reserved capacity, dispatch fence, append-only attempts/results, provider refund ID/status and local reconciliation state. Unique operation plus payment-scoped unresolved-intent protection. |
| Dispute notice/approval/send receipt | Verified recipient binding, template/version, exact rendered-content digest, dispute/access versions, owner approval/expiry, unique notice key, send attempt and provider acceptance/delivery evidence. Personal content follows its own retention schedule. |

Physical names, indexes and whether existing audit tables can be safely reused belong in the implementation plan after integrated-schema review. Private support records are not a substitute for immutable financial records. Approval evidence cannot be edited by ordinary note writers.

Expose narrow commands for exact lookup, detail/history, case activity, provider inspection, prepare repair, approve repair, execute approved repair, prepare/approve/submit refund, prepare/approve/send dispute notice and receipt retrieval. Refund commands have distinct schemas and receipts; a repair command cannot request money movement. Use opaque IDs in application routes and POST bodies for sensitive searches, not emails in query strings. Schema-check every input; client-supplied customer IDs are lookup targets, never proof of authority or ownership.

A successful read includes `checkedAt`, source completeness and policy/resolver identity. Mutations include an operation UUID and canonical request digest. Reusing a UUID for the same authorised command returns its receipt; reusing it for a different command is rejected. Receipts show actual committed effects and their scope, not merely the requested action.

Do not treat `closed` as an error or make support automatically create another checkout attempt. Any future resolution of `creation_unknown` must use the original provider idempotency/binding evidence; unsupported cases remain blocked for the established commerce recovery workflow.

## 13. Transactions, races and side effects

The database and Stripe do not share an atomic transaction. Use an operation lease with a monotonically increasing fencing token around network verification and a short database transaction for the local commit. Never hold SQL row locks while calling the provider. If the lease or expected version changed during a read-only verification, reject that observation for execution and re-evaluate. A money-writing response is different: retain and reconcile its provider fact even if its lease is stale; fencing prevents stale state overwrite, not loss of a real refund.

At local commit, coordinate order locks, affected source locks and the shared user/collection projection lock in the same deterministic order as checkout, webhooks, refund processing and Phase 2 publication. Source changes from different orders must compose correctly. Preserve existing aggregate access while recomputing; a refund on A cannot revoke B or an independent native grant.

Check immutable binding at every boundary: provider account, mode, session/payment/charge, original order owner/release and captured amount/currency. A unique-provider-object conflict bound to another order is a hard conflict, not a successful upsert. Refunds/disputes must belong to the verified payment and order. Phase 2 publication/correction changes invalidate a proposal only where they change its evaluated consequences; the shared resolver supplies the relevant dependency token.

Local financial facts, eligibility, projections and the mandatory audit receipt commit together. Failure of the audit/projection rolls back that local state change. Store failed attempts separately without claiming a domain commit. Use bounded lock/serialization retries only while the approved command and evidence remain valid. Outcome-unknown retries first recover the operation state.

Refund submission first records a durable intent under a payment-scoped lock, then dispatches outside the transaction, then records/reconciles the provider result. A DB rollback cannot undo a provider refund. Concurrency protection combines local unresolved-intent reservation, the stable provider key and Stripe's amount validation; it does not claim permanent exactly-once execution across systems. Trusted recovery must work while new submissions are disabled and must preserve every known external result through local write faults.

Support diagnostics and projection-only repairs send no customer communications. Missing-payment fulfilment may have a previously unsent transactional notification: preview its exact eligible effect and use the approved outbox/deduplication contract. Existing outbox records do not prove that a delivery worker is active; verify the actual delivery integration before enabling any such side effect. Never resend a receipt as a side effect of repeated reconciliation. Pending/failed refunds cannot enqueue a misleading “refund confirmed” notification; event identity alone is insufficient to define message eligibility across changing statuses.

Private access decisions must reflect committed state without depending on a public-page refresh. A later failed UI refresh must not undo financial history or grant fallback access. Any caches used by customer authorisation must be invalidated or versioned so revocation and restoration are effective within the explicitly tested delivery contract.

## 14. Agent and direct-database parity

An authorised agent can inspect, prepare a repair and present the concrete before/after effects. It must ask the owner to approve that exact proposal before execution. A “yes” or “yeah” answering the exact proposal is sufficient conversational authorisation; a general instruction to investigate an account is not approval to change access.

The database path uses protected procedures with the same policy, version, expiry, digest, concurrency and receipt checks as the browser. It does not directly `UPDATE access_entitlements`, manufacture an order, alter captured amounts or accept a posted “approved_by” identity as proof of human approval.

As in Phase 2, the database cannot independently authenticate a human chat statement. A registered restricted operator may attest the human's exact authorisation, with a minimal evidence reference, only through a separately controlled operator identity. Store the human authoriser, executing process and attesting operator separately; verify the human's current authority at execution. The attestation is an explicit trust boundary, not cryptographic proof of the conversation.

Provider observations must originate from the trusted server reconciliation adapter or an equivalently registered verifier. A generic SQL caller cannot submit self-invented “Stripe says paid” facts. A database-only operator may execute an already verified, approved proposal; fresh provider inspection still uses the trusted adapter. No fake Auth context, browser service key or unrestricted superuser write is presented as the normal approval-enforced workflow.

Retries preserve the original operation receipt. A changed target, evidence, policy, expiry or effect requires a refreshed proposal and another human approval. Agents never approve their own human-authorisation record. Implementation/runbooks must document actual restricted calls and role grants before claiming parity is complete.

For the first refund release, agents may inspect within their existing read authority and suggest an unapproved draft amount/reason. Creating the protected refund proposal, owner approval and actual money submission use the authenticated admin browser; no refund capability is granted to a DB agent. Existing repair attestation or direct-database execution does not grant refund dispatch. No SQL function accepts an arbitrary provider refund request or a posted human identity as permission to move money. Extending refund submission to an agent is a separate future authority design.

## 15. Error and degraded-state contract

| Failure | Required behaviour |
| --- | --- |
| Identity/provider/database read unavailable | Display uncertainty; keep current recorded access; no repair from incomplete evidence. |
| Diagnostic provider timeout/rate limit | Bound read retries; retain diagnostic operation state; no money movement or duplicate job storm. |
| Refund timeout/ambiguous provider error | Keep exact intent/key and reserved capacity; show outcome unknown; recover before any new refund. Never imply failed/no money movement. |
| Provider refund accepted, local recording fails | Preserve submission evidence, report reconciliation pending and recover trusted provider facts; SQL rollback cannot cancel the refund. |
| Stale proposal, changed provider facts or new refund | Show changed consequences and require a new approval. |
| Authority revoked/MFA expired | Deny details or mutation as appropriate; no reuse of old approval/receipt to bypass authority. |
| Invalid ownership or financial binding | Block with safe reason/reference; route for owner investigation. |
| Projection failure during transaction | Roll back facts/source/projection/audit together; preserve a distinct failed-attempt record. |
| Commit succeeded, response/post-check lost | Recover receipt, report committed effects and pending verification; do not apply twice. |
| Unsupported legacy/dispute policy | Preserve evidence, block repair and identify the required policy/reconciliation decision. |
| Content safety hold or closed account | Explain the separate blocker; no support override. |

Errors exposed to the operator contain actionable safe codes and a correlation reference. Logs contain redacted diagnostic detail. A successful repair result must never be inferred from a queued operation, a provider HTTP success alone or a green admin page.

## 16. Delivery increments and rollout

| Increment | Capability | Gate before enabling |
| --- | --- | --- |
| 3A — Inspect and explain | Explicit support authority; exact lookup; order/customer detail; source lineage; original/current collection explanation; cases and restricted attention queue. | Completed Phase 1/2 integration, private-data boundary checks and owner walkthrough. Provider facts remain labelled with actual freshness. |
| 3B — Diagnose and prepare | Trusted provider inspection; supported lifecycle coverage; normalised observations; precise repair proposals and blocked cases. No manual repair execution. | Complete provider binding/event/unknown-state tests and approved policy mappings. Verify production configuration read-only before calling diagnosis live-ready. |
| 3C — Approve, repair and refund | Human approval; fenced shared reconciliation; projection repair; exceptional owner-only full/partial refund submission; exact-approved dispute notices; durable receipts; repair operator parity and recovery rehearsal. | All A1–A20 gates, owner approval of the reviewed implementation, isolated test-mode refund rehearsal and explicit release authorisation. |

Support inspection/diagnosis/repair have independent server-enforced gates; they are not tied implicitly to recipe publication stage. Refund dispatch additionally requires `refund_submission_enabled`, default false; enabling repair never enables money movement. In-flight result recovery remains available when dispatch is disabled. Dispute notice sending has its own default-off gate and human approval; neither diagnosis nor a bank event implicitly enables it. Owner-only enablement comes first. Expansion to named support staff follows permission and revocation rehearsal. No bulk repair capability in the first release. Increments 3A/3B may be internal milestones; the first complete Phase 3 release includes the agreed refund workflow.

Use synthetic/isolated database fixtures and Stripe test mode for repair/refund/dispute scenarios. Do not charge/refund a real customer or create live access changes to test this design. Production verification starts with narrow authorised read-only evidence; any live mutation follows its own exact approved operation.

Rollback disables new dispute notice sends, refund submissions and repair/diagnostic commands while preserving in-flight financial recovery, inspection when safe, audit records and ordinary commerce processing. Do not remove prior financial/audit history or blindly restore entitlement rows from a backup. Correct a bad committed access repair through a new verified, approved compensating operation. A refund cannot be undone by restoring the database or automatically charging the customer. Add forward migrations; do not rewrite applied Phase 1/2 migration history.

## 17. Acceptance gates

| Gate | Required evidence before Phase 3 completion |
| --- | --- |
| A1 — Scope and integration | Current main, finished admin and Phase 2 contracts integrated; secure refund scope agreed, remaining policies recorded; only the intended protected refund endpoint, no charge/transfer/grant API. |
| A2 — Authority and privacy | Anonymous, ordinary customer and recipe-only staff cannot inspect support data; MFA/current membership enforced on reads, commands and receipts; analytics/cache/log leak checks pass. |
| A3 — Exact identity | Found/not-found/unconfirmed/ambiguous/unavailable and closed/recreated accounts handled; billing email/receipt/reference alone cannot transfer ownership. |
| A4 — Historical truth | Original terms/manifest retained through price/title/publication changes; incomplete legacy fields remain unknown; test/live and currencies cannot be mixed. |
| A5 — Access explanation | Shared evaluator agrees with customer reading/library/print/asset decisions; original rights, additions, corrections and content holds are explained accurately. |
| A6 — Financial binding | Wrong account/mode/payment/order/amount/currency and provider identity conflicts block repair, including malicious posted evidence. |
| A7 — Verified missing fulfilment | Paid-but-unfulfilled test case repairs only the original qualifying source and projection; unpaid/processing/unknown states cannot unlock. |
| A8 — Projection repair | Rebuilding a projection preserves valid sources and cannot override expiry, closure, manual/content holds or refund/dispute exclusions. |
| A9 — Refund/dispute lifecycle | Successful cumulative full refund, partial/pending/failed/canceled/returned refund, inquiry, open/won/lost dispute and missing policy cases produce reviewed effects. |
| A10 — Multiple sources | Refund/expiry of A preserves B/native/promotional rights; successor access disappears only where its qualifying source ceases; disjoint validity intervals do not bridge a gap. |
| A11 — Approval integrity | Exact digest/target/effect/expiry checked; changed evidence or dependency and revoked human/executor invalidate execution; owner and delegated staff flows behave as specified. |
| A12 — Concurrency and replay | Duplicate/out-of-order webhooks, support-versus-refund, two operators, lost responses, expired leases and publication races converge without resurrection, duplicate purchases or duplicate messages. |
| A13 — Atomicity and recovery | Faults in facts/source/projection/audit writes leave no partial commit; receipt recovery distinguishes unknown from failed; compensating repair is rehearsed. |
| A14 — Agent parity | Registered verifier and restricted operator path enforce the same evidence/approval contracts; human/executor/attestor separated; forged provider facts/approver rejected. |
| A15 — Workflow and rollout | Owner can complete lookup→explanation→diagnosis→approved repair in test mode; case history/post-check accurate; stage disable/revocation rehearsal and operations runbook completed. |
| A16 — Refund authority and exact amount | Owner/current grant/MFA/origin/gate enforced; staff/agent/forged approvals denied; fixed full/partial amounts and original binding validated; unknown policy/dispute/unsupported flow blocks dispatch. |
| A17 — Refund concurrency and replay | Double clicks, two tabs, Dashboard races, pending reservations and same-UUID/different-body produce no duplicate refund; same key/body only within the bounded dispatch contract. |
| A18 — Refund uncertainty and durable recovery | Timeout/500/lost response, crash around dispatch, local commit failure and stale lease preserve intent/results; approval expiry or the 23-hour hard cutoff forbids resubmission; revoked actor/disabled gate does not stop recording an already dispatched result. |
| A19 — Refund outcome and release | Exceptional refunds only, with no general refund promise; Stripe test-mode full/partial creation plus provider-fixture pending/requires-action/failed/canceled coverage and access composition verified; submitted is not succeeded; restricted key/config, retention, kill switch and owner walkthrough evidenced. |
| A20 — Dispute notices and accepted policy | Verified formal-dispute source hold, preserved alternate access and no scheduled new-collection expiry; owner-only exact-recipient/content approval; stale/forged/duplicate/unknown-send denial; actual transport readiness and acceptance-versus-delivery evidence; retention schedules recorded. |

Runtime verification should combine focused database permission/invariant tests, reconciliation/policy tests with provider fixtures, route/browser authority checks and a bounded owner walkthrough. Add meaningful race/fault tests where they prove a gate, rather than duplicating every implementation detail. No runtime test or deployment success is claimed by writing this document.

## 18. Operational readiness and measurement

Measure actionable support outcomes with private operational aggregates: unresolved verified fulfilment mismatches, age of pending reconciliation, blocked reason counts, successful/no-change/failed repair counts and post-check completion. These are not revenue reports or optional behavioural analytics. Do not claim fewer support tickets without a real baseline and consistent case capture.

The runbook must name who monitors cases/provider adjustments, who can approve a repair/refund, how authority is revoked, how to inspect an unknown result, how to recover a lost receipt, and how to escalate policy/identity/content issues. Include refund dispatch/retry deadlines, unresolved-intent alerts, the dedicated kill switch and trusted recovery after revocation. Include exact safe provider/database checks, test/live targeting and redacted examples. Do not copy the old account-closure runbook's launch assumptions into new operational truth.

Data retention requires explicit configuration before production: case-note retention/redaction, observation payload minimisation, approval evidence access, immutable financial/audit retention and account-closure handling. This design does not prescribe a legal retention duration. The owner accepted minimisation and separate treatment of notes, diagnostic detail, financial/access records, approval audit and notification history; exact day/year counts remain open. Deleting a support note or verification detail cannot expire a purchased collection or remove the retained ownership basis. Resolve the schedules without collecting unnecessary personal data in the meantime.

## 19. Review and next artifact

The owner has accepted exceptional owner-approved refunds without a general refund promise, the proposed pending/partial/full access effects, formal-dispute purchase holds and owner-reviewed notices, and no scheduled collection expiry. Review the written technical design/plan and confirm exact retention schedules, historical policy mapping and production readiness before activation. Repairs remain limited to documented rights. Any changes update this decision register and affected gates together.

The companion [Phase 3 implementation plan](../plans/2026-10-07-admin-customer-support-phase-three.md) must cover exact integrated modules/migrations, task ordering, policy approvals, evidence for A1–A20, release gates, rollback and owner rehearsal. Preserve the previously selected Native execution method: implement each task in the primary agent, then obtain the independent final review at the authorised execution stage. This document revision does not start that implementation or approve a real customer refund.

## 20. Source anchors and related plans

Paths below are repository-relative so the specification remains portable between worktrees. They identify inspected sources or existing planning contracts, not runtime proof:

- [Phase 1 design](2026-10-04-admin-recipe-workspace-design.md) and [Phase 1 implementation plan](../plans/2026-10-04-admin-recipe-workspace.md).
- [Phase 2 collections design](2026-10-06-admin-collections-phase-two-design.md) and [Phase 2 implementation plan](../plans/2026-10-07-admin-collections-phase-two.md).
- `supabase/migrations/20260923200000_phase8_commerce_schema.sql`: offers, order snapshots, payment/refund/dispute/source tables and original writer/projection procedures.
- `supabase/migrations/20260924174355_phase8_remediation_guards.sql`: replacement payment writer with snapshot and cross-order payment-binding guards.
- `my-curated-haven-web/src/lib/payments/repository.ts`: scoped commerce reads, orders and financial writer adapters.
- `my-curated-haven-web/src/lib/payments/fulfilment.ts`: current customer refresh, webhook completion and refund handling.
- `my-curated-haven-web/src/lib/payments/guardrails.ts`: snapshot/payment validation.
- `my-curated-haven-web/src/app/api/orders/[orderId]/status/route.ts` and `refresh/route.ts`: existing customer-owned order endpoints.
- `my-curated-haven-web/src/app/api/stripe/webhook/route.ts`: signed provider event intake.
- `my-curated-haven-web/src/lib/admin/contracts.ts` and admin access migrations: current recipe authority and typed result boundary in the admin worktree.
- [Commerce states and data](../../implementation/phase-8/PAYMENT-DATA-AND-STATES.md), [refunds and support policy](../../implementation/phase-8/REFUNDS-AND-SUPPORT.md), and [recipe access/security](../../implementation/phase-8/RECIPE-ACCESS-AND-SECURITY.md).
- `ops/ACCOUNT-CLOSURE.md` and `ops/ADMIN-CONSOLE.md`: separate account closure and admin operating boundaries; verify and update stale assumptions during implementation.
- [Stripe refunds](https://docs.stripe.com/refunds), [Stripe webhooks](https://docs.stripe.com/webhooks), and [Stripe dispute lifecycle](https://docs.stripe.com/disputes/how-disputes-work): primary provider documentation checked for this design. Local access effects remain owner-approved project policy.
- [Gumroad chargebacks](https://gumroad.com/help/article/134-how-does-gumroad-handle-chargebacks) and [Steam payment disputes](https://help.steampowered.com/en/faqs/view/783F-5E0F-9834-22D2): researched examples of customer contact and access restrictions; the owner chose the narrower purchase-specific policy above.
- [Amazon SES send API](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html): provider acceptance differs from confirmed delivery.
- [Stripe create refund API](https://docs.stripe.com/api/refunds/create), [idempotent requests](https://docs.stripe.com/api/idempotent_requests), and [restricted API keys](https://docs.stripe.com/keys): checked for the refund-scope revision. Approval, the 23-hour retry cutoff, local reservations and owner-only submission are project safeguards.
