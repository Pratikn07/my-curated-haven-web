# Admin collections workspace: Phase 2 design

- Date: 2026-10-06, America/Los_Angeles.
- Status: first written design for owner review. Product decisions labelled agreed come from the conversation; the architecture and interaction recommendations below await review of this document.
- Deliverable: design specification. This is not the implementation task plan or approval to deploy.
- Source baseline: remote `main` verified at `9bfdfc94390e5d3348a7b895d901ea81e13aac90`. Collection source inspected in the showroom worktree at `f08e034ddda3a69c203828050d4aded38da0fd1e`; this represents the navigation change squash-merged into that main baseline.
- Phase 1 integration baseline: admin worktree at `9dadc8630be3bcc21433504787bb635f5ef612cc`, with existing uncommitted publication work. Phase 1 completion and integration with current main remain prerequisites for shipping Phase 2.
- Verification boundary: repository and documentation review, not a fresh runtime test or inspection of production data. Configured collections, browsing availability and implemented checkout code do not prove that products are currently being sold.

## 1. Purpose and success

The owner should be able to manage collections from the admin console without editing website configuration by hand. Additional named admins must be supportable through the existing membership model and narrower permissions.

The central workflow is:

**Find a collection → prepare a private update → preview the complete change → human approval → publish → existing buyers receive additions.**

The workspace must answer four practical questions:

1. What is publicly visible in this collection today?
2. What have we privately prepared to change?
3. What did buyers purchase, and how does this update affect them?
4. Who approved and executed each change, and can we explain or recover from it?

Phase 2 extends the existing bookcase, collection pages, series pages, purchased library and commerce system. It also resolves the collection correction policy that deliberately limits Phase 1 recipe publication. It does not rebuild the storefront or become a general payment-support console.

## 2. Agreed product decisions

| Decision | Required behaviour |
| --- | --- |
| Owner first, multiple admins supported | The owner can perform the full workflow. Future editors, reviewers and publishers can have separate authority. |
| Existing recipe catalog first | Create and edit collections using existing recipes. New recipe creation and recipe-image uploads are a later extension. |
| Flexible collection size | No fixed recipe minimum or maximum, including no 8–12 launch rule. Display the actual published count. Availability is an explicit choice, not a count threshold. |
| Preserve purchases | **Preserve what buyers purchased, and give them future additions.** Ordinary updates to purchased collections cannot remove or replace purchased members. |
| Staged updates | Prepare, preview and publish. Adding a recipe to a draft does not immediately give it to customers. |
| One complete private draft | Title, description, cover, grouping, recipe order and additions remain private until that update is published. |
| Human publication approval | A human approves the exact update. The owner may approve their own work using one **Approve and publish** action after preview. |
| Agent and database support | An authorised agent may prepare changes and execute a specifically approved update through protected database commands. |
| Conversational approval | A human's “yes” or “yeah” in response to the exact publication proposal counts as authorisation for that proposal. Subsequent changes require another approval. |
| Correct recipes for existing buyers | Human-approved corrections to an existing recipe reach its existing buyers. Keep the prior version, reason and approval history. |

Older collection documents and source comments still contain the 8–12 rule. This specification supersedes that rule for Phase 2; the implementation must remove it from validators, labels and documentation together. The earlier immediate-addition option was superseded by the staged workflow.

## 3. What exists and what Phase 2 must connect

| Existing system | Source-confirmed position | Phase 2 responsibility |
| --- | --- | --- |
| Public collection experience | Configuration defines 20 collections across six shelves and two series; 11 are marked open and nine coming soon at this baseline. Covers, ordering, stage filters and collection pages already exist. | Preserve identities, URLs and public behaviour while introducing administration. These are configuration counts, not verified sales counts. |
| Collection presentation and recipe facts | `src/config/collections.ts` and generated `src/config/recipe-snapshot.ts` supply words, covers, membership, order and recipe cards. The collection detail page prefers configured members. | Replace ongoing manual authorship with a controlled database publication projection. |
| Catalog organisation | `recipe-tags.json` and collection documents describe reviewed tags and placements. Runtime types expose only part of that taxonomy. | Import without losing information; distinguish imported provenance from approval of a new candidate. |
| Releases and membership | `recipe_collections`, `collection_releases` and `collection_recipes` exist. Sealed and retired release membership has database protection. | Reuse these identities and protections; create successors rather than editing purchased snapshots. |
| Checkout and access | Offers, release manifests, order snapshots, payment verification, access sources, refunds and entitlement projection exist. Entitlements and current reader queries are release-specific. | Give eligible buyers additions across successor releases and keep historical financial records stable. |
| Account library | `/account/collections` exists and reads entitled releases. | Show one current collection entry with its additions, rather than duplicate entries or an obsolete release. |
| Recipe admin | Phase 1 provides an evolving revision, review, publication and audit workflow. Its current contract blocks ordinary corrections with sealed or commercial exposure. | Add collection permissions and the explicitly approved correction workflow without weakening recipe review. |
| Campaigns and free samples | Existing routes and recipe references depend on stable identities and recipe-access policy. | Include them in impact checks; do not change campaign selection or free-slot assignments as a collection-edit side effect. |

The important integration problem is that displayed contents and sold release contents can currently come from different sources. A collection publish must eventually select one authoritative publication for presentation, checkout and buyer delivery.

Source anchors on the verified main baseline:

- [Collection configuration](https://github.com/Pratikn07/my-curated-haven-web/blob/9bfdfc94390e5d3348a7b895d901ea81e13aac90/my-curated-haven-web/src/config/collections.ts), [collection detail assembly](https://github.com/Pratikn07/my-curated-haven-web/blob/9bfdfc94390e5d3348a7b895d901ea81e13aac90/my-curated-haven-web/src/app/collections/%5Bslug%5D/page.tsx).
- [Commerce reads and order reservation](https://github.com/Pratikn07/my-curated-haven-web/blob/9bfdfc94390e5d3348a7b895d901ea81e13aac90/my-curated-haven-web/src/lib/payments/repository.ts), [commerce schema](https://github.com/Pratikn07/my-curated-haven-web/blob/9bfdfc94390e5d3348a7b895d901ea81e13aac90/supabase/migrations/20260923200000_phase8_commerce_schema.sql).
- [Recipe and protected-file access policies](https://github.com/Pratikn07/my-curated-haven-web/blob/9bfdfc94390e5d3348a7b895d901ea81e13aac90/supabase/migrations/20260924120000_phase4_access_hardening.sql), [existing tag and placement vocabulary](https://github.com/Pratikn07/my-curated-haven-web/blob/9bfdfc94390e5d3348a7b895d901ea81e13aac90/docs/implementation/recipe-collections/COLLECTIONS.md).
- [Phase 1 design](2026-10-04-admin-recipe-workspace-design.md). Its commercial-correction restriction is intentionally replaced only by the explicit workflow in section 11 below.

## 4. Approach and trade-offs

**Recommended: extend the native admin console with database-backed collection drafts and immutable publication history.** This shares Phase 1 identity, review and audit infrastructure and can give the UI and database operators the same publication rules. It requires migration of configuration and deliberate changes to access and checkout integration.

Two alternatives were considered:

| Approach | Benefit | Limitation |
| --- | --- | --- |
| Admin writes configuration files through Git | Smaller initial data-model change; Git captures file history. | Publishing requires deployments, buyer-access rules remain separate, and it does not satisfy a consistent database operation workflow. |
| Introduce an external CMS | Provides general content editing and asset tools. | Adds a second permission/review system and still requires custom release, entitlement and commerce integration. Too much infrastructure for this phase. |

The recommended approach adds focused collection modules. It does not replace the existing recipe editor, payment provider integration or storefront components.

## 5. Scope and boundaries

### Included

- Collection inventory, search, filters, publication/readiness status and history.
- New collection drafts and edits to existing collections.
- Title, tagline, story/summary, intended audience, stage range, refresh wording, approved existing cover/cloth, shelf assignment, collection ordering and existing series/volume assignment.
- Existing recipe search, assignment, order, eligibility and placement notes.
- Existing tag vocabulary and reviewed tag corrections through the recipe workflow.
- Private preview of the collection page and its bookcase/series context.
- Review and exact-candidate publication, additive buyer access and immutable historical releases.
- Agent/database procedures with human approval evidence and separate executor identity.
- Approved corrections to recipes used by purchased collections.
- Migration, access-policy integration, recovery, tests and staged owner rollout.

### Deferred

- Creating new recipes; uploading or generating new recipe images.
- A general media library. Initial collection covers are selected from approved existing assets; changing their metadata remains part of the collection draft.
- New shelf/series taxonomy administration. Initial editors choose the existing vocabulary; series volume collisions are rejected.
- Arbitrary tag creation, automated tagging approval, bulk publication, scheduled publication and experiments.
- Price editing, discounts, bundles, subscriptions, refunds, manual entitlement grants, order repair or enabling sales from this editor. Those belong to later commerce/support work.
- Customer emails and update notifications. Published additions appear in the existing library; this phase does not send messages.
- Final visual styling. This document specifies information, interactions and states; it does not claim approval of screen mockups.

The narrow commerce integration in section 10 may advance an already configured offer's release binding without changing its financial terms or enabling sales. That is a recommended publication dependency, not a general offer-editing feature.

## 6. Collection workspace and interaction design

### 6.1 Collection inventory

Add **Collections** beside Recipes and Team in the admin navigation. The list shows title, slug, shelf/series, public visibility, browsing availability, published recipe count, draft status, review/readiness state and last change. Commerce is shown as a separate read-only state: configured for sale, sales disabled, no offer or unavailable.

Search by title or slug. Filter by shelf, stage, public status, has draft and needs attention. Preserve search/filter state when entering and leaving a collection. Count published and draft recipes separately; no “too few recipes” warning based on the abolished rule.

Each collection opens a connected workspace with **Overview, Contents, Preview and changes, Readiness, History**. These are proposed information sections, not a commitment to a particular tab layout.

The header always identifies the collection, what is live, whether a private draft exists and the next permitted action. “Published,” “Coming soon” and “Sales disabled” must not be collapsed into one ambiguous status.

### 6.2 Prepare a draft

An existing collection starts a draft from its current publication. A new collection starts privately with a stable UUID and a proposed unique slug. Recommend locking the slug after first public publication; URL changes and redirects are a separate operation.

The editor can update the included collection fields, select an existing cover and search the recipe catalog. Recipe rows show title, age/stage, relevant tags, recipe publication/review state, whether already included and any placement problems. One recipe can belong to several collections, but cannot appear twice in the same collection.

An unreviewed recipe can be saved in a private draft with a clear blocker. It cannot become a newly published collection member until the required recipe publication and human review checks pass. Collection approval is not a substitute for approval of the recipe itself.

Save is an explicit private action. Show Saved, Saving and Save failed separately. Unsaved edits trigger a navigation warning. Failed saves retain local form contents. Changes after review produce a new revision and invalidate approval eligibility; existing decisions remain in history.

For a collection with purchased members, removal/replacement controls explain why the member is protected. Draft-only additions can still be removed. Recipe order can change while membership is preserved. Drag ordering must also have keyboard-accessible move controls.

### 6.3 Preview and assess changes

Preview uses the existing collection rendering primitives with a conspicuous **Private draft** label. It must not make drafts accessible at public URLs or populate a shared public cache. Customer checkout and personal-library actions are disabled in admin preview.

Show the proposed collection page and relevant shelf/series placement. A separate change summary lists text/cover changes, added members, allowed removals, order changes, before/after counts and buyer impact. Do not label cosmetic metadata edits as recipe additions.

Example: **Published: 5 recipes. Draft: 8 recipes. Adds A, B and C. Existing eligible buyers receive all three at no extra cost. No purchased recipe is removed.**

The summary includes the candidate revision, recipe versions reviewed, current published base and the time of the impact check. If any of these change, refresh preview and readiness before approving. Unavailable impact data is shown as unknown and blocks publication.

### 6.4 Readiness, review and publication

Readiness evaluates required public text, slug uniqueness, valid shelf/series values, a non-conflicting series volume, coherent stage bounds, usable cover/alt text, unique ordered members and each member's current recipe review/publication evidence. Also check contextual stage/theme fit, protected membership, offer compatibility and fresh dependency availability. There is no minimum/maximum recipe-count check. Separate blocking failures, unknown source checks and non-blocking editorial suggestions; only a fully known eligible candidate can be published.

For the owner, provide one **Approve and publish** action from the reviewed preview, with the exact change summary and a short required reason. This records a human approval and performs publication as one protected command. A failed publication does not display a successful release or a reusable approval for a different candidate.

For future separated roles, an editor submits the candidate, a reviewer approves or requests changes, and a publisher publishes the unchanged approved candidate. The owner can use that route too. No mandatory second reviewer is introduced.

On success show the published version, added count, buyer-access effect and public-refresh state. “Published; public refresh pending” is distinct from “Publication failed.” Retrying refresh must not publish a second release.

### 6.5 History and recovery

History records private saves, submissions, review decisions, publication, corrections, conflicts and authorised recovery actions. Show human authoriser, executor, time, reason and before/after references, with comparison of publication snapshots.

An older version can be copied into a new draft. Restoring a historical version does not silently remove later additions or rewrite a release. Published recovery is another reviewed forward change subject to purchase protection. Discarding a draft is explicit and preserves its audit history.

### 6.6 Non-success and accessibility states

Distinguish no collections, no search matches, unavailable source, missing permission, MFA required, stale draft, review changes requested and publication blocked. Give a retry or next action where possible and a non-sensitive support reference for failures.

Use labelled fields, keyboard navigation, visible focus, non-colour status cues and announced save/publication results. Existing public reduced-motion and responsive behaviour must survive the data-source change. Detailed screen styling can be reviewed later without changing these workflow requirements.

## 7. Publication, availability and purchase invariants

Maintain three independent concepts:

| Concept | Meaning |
| --- | --- |
| Private workflow | Draft, submitted, approved, changes requested, rejected, published/superseded. |
| Public presentation | No public publication yet, or an existing listed/unlisted/retired listing; browsing availability is separately open/coming soon. An empty collection can be prepared and shown as coming soon. No recipe-count threshold determines these choices. |
| Commerce | Whether a separately authorised offer is enabled and ready. Public browsing does not enable checkout. |

Hiding a listing does not revoke a buyer's library access. A coming-soon collection may have a public shelf presence without an open detail page, preserving the present experience. New zero-recipe paid-product activation is outside this phase's offer-management scope, not a new minimum-size policy.

For purchase protection, define the protected member set as the union of recipe identities in all historically purchased releases of the collection, plus any sealed or commercially committed release whose promise is protected. This check includes outstanding live checkout/payment attempts and active offers, not only payments already completed. Unknown commercial exposure blocks publication.

Every ordinary successor must retain that protected set. An unpurchased, uncommitted collection may freely add/remove/reorder in its draft. A refund does not erase the fact that a release was historically purchased or authorise rewriting it. Test-mode evidence is labelled separately and does not become a real buyer purchase.

Do not substitute one recipe identity for another and call it a correction. Removing unsafe content follows the explicit emergency path in section 11. Published and sealed historical release snapshots are immutable even when there are no current sales.

The customer-facing count comes from the active publication membership, never a configured expectation or the original purchased count. If an emergency withdrawal reduces currently available recipes, show the available count and the withdrawal honestly rather than silently presenting a stale promise.

## 8. Data model and component boundaries

Names below describe proposed responsibilities. The implementation plan will select additive migrations and exact signatures after reconciling the integrated Phase 1 branch.

| Unit | Responsibility and interface |
| --- | --- |
| Stable collection identity | Reuse `public.recipe_collections` UUID/slug. Keep public title/summary as a projection of the active publication, not editable draft fields. |
| Private collection draft head | One active draft per collection; base publication ID, working revision, lifecycle and optimistic version. Multiple admins collaborate through conflict detection, not separate competing live heads. |
| Immutable draft revisions | Full collection metadata and ordered recipe IDs, pinned recipe content/review versions, asset references, placement notes, digest, author and time. Save appends a revision. |
| Collection review decisions | Human verdict, exact revision/digest, policy version, resolved blockers, authorisation provenance and time. An imported annotation or AI assessment is not a new human decision. |
| Publication record and active pointer | Immutable metadata snapshot, approved revision, release ID, operation ID and time; one active pointer determines the current collection. |
| Releases and members | Reuse `collection_releases` and `collection_recipes`. Membership changes create a successor release; metadata-only publication can retain the same release. Once published, members are frozen by the new writer contract. |
| Commercial manifests | Preserve existing purchased manifests. New membership releases record exact member identities, recipe-version evidence, checksum and the linked human approval; legacy text `approved_by` alone is not proof of new approval. |
| Recipe tags and placement | Global tags belong to the recipe's reviewed version; contextual fit/adaptation notes belong to the collection membership revision. A collection edit cannot silently change global tags across other collections. |
| Readiness/impact evaluator | Compares candidate, active base, recipes, assets, commercial exposure and campaign dependencies; returns pass/fail/unknown checks plus a bound impact digest. |
| Mutation service | Shared validation, locking, authorisation, idempotency and audit for UI RPCs and restricted operator procedures. |
| Public/buyer read adapter | Resolves the active publication and effective access consistently for bookcase, series, detail, account library, recipe body and protected assets. |

Cover references must point to approved existing site assets with alt text and dimensions. Recipe previews use existing asset selection and version checks; an arbitrary URL is not an approval record. Retain referenced historical assets or immutable copies where required to reproduce archived content.

Import all existing tag categories without data loss, including information not currently exposed by runtime filters. Existing vocabulary is the starting point. Allergen/free-from consistency, stage fit and theme requirements are checks that need recorded evidence and human judgement where applicable. An agent must not approve nutritional, allergen or age-suitability claims just because a keyword validator passes.

## 9. Permissions and approval authority

Extend the existing permission system with collection read, edit, review and publish capabilities. A proposed initial mapping is:

| Role | Collection authority |
| --- | --- |
| Owner | Read, prepare, review, approve and publish; restricted operator authorisation and exceptional recovery. |
| Viewer | Read collection inventory, permitted preview and history. |
| Editor | Read and save private drafts; submit for review. |
| Reviewer | Read and decide on exact submitted revisions. |
| Publisher | Read and publish an eligible approved revision; cannot fabricate review approval. |

These permissions do not grant payment/refund, team-management or arbitrary recipe-write access. Recipe corrections require the relevant recipe review/publication permissions as well as a reviewed impact assessment. Only the owner retains the emergency-withdrawal authority established in Phase 1.

Every browser command derives the actor from verified authentication, requires current database membership and MFA `aal2`, and checks the feature stage at execution time. Recheck on retries: a previously successful operation must not disclose private data after the caller loses authority. Never trust posted human UUIDs, editable user metadata or stale role claims for approval.

Private drafts, full recipe bodies, approval evidence and audit details must remain outside anonymous/public reads. New exposed tables need explicit grants and RLS; protected procedures need a fixed safe search path and narrowly granted execution. Public projections expose only published fields. These controls follow the existing console approach and the [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

Admin pages and previews remain excluded from optional analytics/session replay. Impact summaries use aggregate buyer information; this phase does not add customer contact browsing.

## 10. Publication and buyer-access data flow

### 10.1 Prepare and approve an exact candidate

Saving records a new immutable revision with its expected base and digest. Preview evaluates the complete candidate against current recipe versions, existing approval records, asset versions and commercial dependencies. Review approval binds that digest and the evaluated policy, not merely the collection UUID.

Publication obtains collection-scoped locks and compatible locks for affected recipe/offer dependencies, rechecks current authority and stage, and verifies the base, candidate, recipe versions, approval and impact digest. Locks must also coordinate with recipe corrections and checkout reservation so their checks cannot race. Use deterministic lock order and bounded timeouts; no unbounded global table lock as the default design.

In one database transaction:

1. Validate all publication and purchase-protection invariants.
2. Record or validate the human approval for this candidate.
3. Create the immutable publication and, if membership changed, its successor release and manifest.
4. Advance the active public pointer and compatible public title/summary projections.
5. Advance any eligible existing offer binding as described below; preserve all frozen order records.
6. Record operation/audit receipts and enqueue public refresh work.

Commit all of these or none. A database failure cannot leave new public membership with old access rules or a partially recorded approval.

### 10.2 Existing buyers receive additions without synthetic purchases

**Recommendation: retain the original release entitlement as the source of authority, and resolve its approved collection successors at read time.** Do not create a paid order or a new independent entitlement for every added recipe/release.

An active, currently valid qualifying entitlement grants its original release contents and the current published successors allowed by that collection's approved additions policy. The policy is explicitly versioned and associated with the publication lineage. It does not grant other collections, another series volume or private draft members. Existing grant types and access-policy versions must be mapped explicitly during migration; an unknown legacy grant is reported for reconciliation, not silently broadened.

This permits a buyer of version 1 with five recipes to see the eight recipes in version 2 while their original order, payment, release and manifest remain unchanged. A new buyer purchases the current sellable release. A buyer's qualifying original access source becoming revoked or expired removes successor access through that source too. Another valid source still grants access according to existing projection rules.

Update every access surface together: collection ownership, account library, recipe-body RLS, protected-file RLS, server access checks and checkout eligibility. The library groups by collection identity while retaining the underlying source records. Reuse one policy definition or tightly equivalent tested database functions; UI badges are not authorisation.

Do not publicly cache personal ownership or entitlement decisions. Index and test successor resolution using realistic fixtures so adding releases does not require scanning all buyers or produce a query per recipe.

### 10.3 Keep checkout consistent while preserving financial history

Offers currently bind to a release, and their provider account/mode/price identity is unique. Blindly duplicating an offer for each successor can conflict with that constraint. The recommended bounded change is to keep an existing offer identity and advance only its current release/manifest binding to the reviewed successor in the publication transaction.

The price, currency, provider account/mode/product/price IDs, tax treatment, quantity, terms, refund policy, access policy and sales-enabled flag remain unchanged. The preview identifies the release-binding transition. Unsupported legacy offers or incompatible access policies block that transition instead of being silently repaired. Collections with no offer remain without an offer; disabled sales stay disabled. Metadata-only updates do not need to rebind an unchanged release.

Historical purchase orders retain their original release, immutable snapshot, manifest reference/checksum, financial terms and provider context. Fulfilment must use those frozen values, not an offer's later binding. Legacy snapshots lacking required evidence must be reconciled before allowing an affected offer transition.

The checkout request carries the expected publication/release token from the rendered product; the current slug-only request contract must be extended and validated. Reservation locks and validates that token against the selected offer binding/current publication in the reservation transaction. A stale page must refresh and retry; it cannot reserve a mismatched advertised release. Pending attempts are located by collection as well as release, and reservation serialises for a user/collection so publishing version 2 does not open a second competing checkout for version 1's pending buyer.

A payment arriving after publication still fulfils its original frozen order, then the successor access policy supplies additions. An already owning customer must not be invited to repurchase merely because the release changed. Preserve verified webhook/payment completion as the access trigger; a checkout return page is insufficient. Retry and concurrent fulfilment behaviour should continue to follow [Stripe's fulfilment guidance](https://docs.stripe.com/checkout/fulfillment).

### 10.4 Public refresh and retries

After commit, invalidate the collection, bookcase, relevant series and affected public recipe projections. Personal library/access checks must read current authority independently of public rendering caches. Refresh work has an operation receipt and can retry safely without another publication.

Every mutation has an operation UUID and canonical request digest. Same UUID plus same authorised command returns the original receipt; a different command using that UUID is rejected. Optimistic conflicts, changed dependencies or expired approvals require a refreshed candidate/preview. Lock/serialization failures get bounded safe retries only where the original command is still valid, consistent with [PostgreSQL transaction isolation guidance](https://www.postgresql.org/docs/current/transaction-iso.html).

## 11. Approved recipe corrections and emergency withdrawal

### 11.1 Correction workflow

Use the Phase 1 recipe draft, preview and human review workflow. A correction changes the content of the same recipe identity, such as a reviewed ingredient quantity or cooking-step clarification. It does not remove a recipe from a collection or replace it with another recipe.

Before approval, show the exact recipe diff and all affected published collections, historical purchased/sealed releases, active offers, pending checkouts, free samples and campaigns. Explain that this is a global update to the recipe's active approved content, so existing buyers and other authorised readers will see it wherever that recipe is used.

Extend the Phase 1 approval target to bind the corrected recipe snapshot and fresh impact evidence. Archive the previous complete catalog/body/image/tag snapshot and retain the reason, human authoriser, executor and affected release references. Publishing applies the correction atomically; it never edits old purchased membership or an old order manifest.

Published collection snapshots retain the recipe-version evidence they were approved with. Reader delivery resolves to the current approved recipe version under the explicit correction policy. Admin history can reproduce the earlier version; customers are not silently served an obsolete version by an old snapshot or cache. A private collection candidate pinned to the previous recipe version becomes stale and needs a fresh preview/review.

Do not simply remove Phase 1's commercial-impact block. Replace it only for this exact approved correction command with the full impact, version, archive and audit checks. Existing Phase 1 campaign protections also remain: a correction needs the appropriate reviewed dependency check rather than a blanket bypass.

If the recipe's identity, audience or core purpose is being changed so substantially that it replaces what was purchased, prepare a separate recipe/addition workflow. Do not classify that as an ordinary correction to avoid purchase protection.

### 11.2 Emergency withdrawal

Retain the explicit owner-only emergency-withdrawal path with fresh impact evidence, reason and acknowledgement of buyer/promise impact. It may make unsafe content unavailable while keeping historical records intact. Ordinary collection removal cannot invoke this implicitly.

Customer views must distinguish unavailable/withdrawn purchased content from a recipe that never existed. Restore through a reviewed correction and explicit republication, not deletion of history. Automated notices, compensation and refunds remain outside this phase.

## 12. Agent and direct-database operation

The supported database workflow is:

1. An authorised operator/agent saves a private candidate using the protected command contract.
2. It retrieves a fresh preview/diff and buyer-impact summary with revision, base and digest references.
3. It shows the human the concrete proposed update and asks: **“Approve and publish this update to [collection]?”**
4. The human's response, including “yes” or “yeah,” authorises only that proposal. Record a bounded authorisation reference and approved digest.
5. The agent executes through the restricted operator procedure. The database revalidates the candidate, authority, policy and impact and records a receipt.

Database SQL calls are supported; arbitrary table `INSERT`/`UPDATE` is not the normal authoring interface. Document actual function calls in the implementation/runbook. Both operator and browser entry points invoke the same underlying writer and invariants.

**Trust boundary:** the database cannot independently prove that a chat message was spoken by the owner. The operator path therefore accepts a trusted, restricted operator attestation of the human authorisation, with the exact proposal digest and an evidence reference. It must not accept a browser-posted approver UUID or an agent-generated “human approval” verdict. The authenticated operator identity and permission to attest are separately controlled, and the attested human must still be an authorised current member.

Store the authorising human, executor type/identity, attesting operator, target revision/digest, evidence reference, reason and time separately. Keep only the minimal necessary approval excerpt/reference, not an entire private transcript or tokens. A revoked human, changed candidate, changed dependency or incompatible policy invalidates execution. Retries of an unchanged approved operation use its existing receipt.

The initial operator capability is owner-authorised and restricted to this workflow. It is not a public service-role key, a fake `auth.uid()` setting or a general permission to bypass MFA for web requests. A database superuser can bypass application controls; that exceptional maintenance authority must not be presented as proof that ordinary writes are approval-enforced.

## 13. Import and migration strategy

First integrate the completed Phase 1 admin branch with the verified current main; resolve schema and source conflicts before creating new Phase 2 migrations. Do not modify the old already-applied migration history to introduce Phase 2 behaviour.

Build a repeatable dry-run import/report from the current collection configuration, recipe snapshot, tag/placement data and actual target database. Record source SHA and source digests. Map collection slugs to stable existing IDs where present and recipe slugs to catalog UUIDs; report duplicates, missing records, recipe-version/review mismatches, differing config/DB members and historical commercial exposure.

Import all 20 configured collections, the six shelves, two series, existing covers, public visibility/availability, order and stage information. Preserve source tag and placement evidence without manufacturing a new human approval or taking documentation claims as proof of current database state. Do not automatically union differing config/DB memberships and grant the result to buyers.

Existing source text contains the old 8–12 policy and source snapshots may lag later recipe corrections. Reconcile those deliberately. Existing recipe snapshots are migration input, not a permanent alternate authority after cutover.

Use an explicit per-collection source mode during transition: legacy configuration or the validated database publication. All readers for that collection resolve the same mode; never combine a new database title with stale configured members. Switch only after presentation parity, identity mapping, review/access policy and any commercial history are reconciled.

Legacy public rendering can continue while candidates are privately imported and checked. That preserves existing previews without granting private recipe bodies or asserting that old presentation has newly passed review. A switched collection does not silently fall back to old config if its database read fails. Continue serving only a known committed public snapshot where available and show a controlled unavailable state otherwise; checkout and private-access decisions fail closed. Do not infer an actual sale price or non-ownership from an unavailable commerce source. Retained design placeholder prices must remain clearly separate from a purchasable offer.

No import enables sales, publishes unreviewed additions, changes free slots, overwrites a purchased release or grants a customer access by assumption. Generate an owner-reviewable discrepancy report before any production migration/cutover.

## 14. Delivery priorities within Phase 2

These are dependency-oriented increments for the later implementation plan, not an executable task list or a promise of dates.

| Increment | Priority and outcome | Exposure |
| --- | --- | --- |
| 2A — Reconcile and inspect | Integrate Phase 1/current main, agree import mappings, expose collection inventory, current membership, read-only commerce impact and history. | Owner inspection; no collection writes or public changes. |
| 2B — Prepare and preview | Persist full private drafts, existing-recipe selection, grouping/cover fields, placement checks, conflicts and exact previews. | Owner editing; public collections remain unchanged. |
| 2C — Publish and deliver additions | Human approval, atomic publication, immutable successor releases, effective buyer access, offer-binding/checkout integration, account-library reads and refresh recovery. | Enable only after all related reader, RLS and commerce checks pass together. |
| 2D — Correct and rehearse | Extend reviewed recipe corrections, integrate emergency-withdrawal presentation, finish operator procedures, owner walkthrough and recovery rehearsal. | Complete Phase 2 before expanding to additional admins. |

The highest product priority is a trustworthy collection view and private update workflow. Publishing is useful only when buyer delivery and purchase protection work with it; those cannot be treated as optional follow-up polish.

Feature stages should independently gate collection inspection, private editing and publication while retaining the existing global console kill switch. Do not enable additional staff or production mutation merely by deploying the code.

## 15. Acceptance criteria and verification design

The implementation plan must turn these into explicit gates with recorded evidence. They are design requirements, not claims that tests have passed.

| Gate | Evidence required before Phase 2 is complete |
| --- | --- |
| A1 — Existing experience preserved | Import/parity report for every configured collection, URL, cover, shelf/series, ordering and visibility; discrepancy resolution against target DB. Existing responsive, keyboard and reduced-motion checks pass. |
| A2 — Flexible counts | No fixed count validators or automatic 8–12 availability logic. Draft/public count behaviour checked with empty, small and more-than-12 collections; visibility remains explicit. |
| A3 — Private preparation | Editing title/cover/order/members changes only the private candidate until approval/publication; anonymous and ordinary customer requests cannot fetch drafts or private preview bodies. |
| A4 — Exact human approval | Wrong/missing digest, changed recipe dependency, stale base, revoked authority, inadequate MFA and fabricated approver identity are rejected. Owner one-action and separated-role flows both work. |
| A5 — Purchases preserved | Removing protected members is blocked for historical payments, sealed/committed releases and pending live orders. Test-mode and unknown exposure states are handled explicitly. Old membership/manifests remain unchanged. |
| A6 — Additions delivered | A version-1 buyer receives version-2 additions, another collection's buyer does not, drafts remain inaccessible, and account library/ownership/body/file access agree. No synthetic purchase or independent grant is created. |
| A7 — Revocation preserved | Expired/revoked/refunded sources cannot retain successor access; multiple legitimate sources still compose correctly; no private or personal access decisions leak through shared caches. |
| A8 — Checkout compatibility | Offer unique constraints hold; financial terms and enablement stay unchanged; new orders bind current releases; pending/delayed payments retain original snapshots; cross-release duplicate checkout and false repurchase are prevented. |
| A9 — Corrections reach buyers | Approved same-recipe correction appears for existing authorised buyers, archives reproduce the old version, changed candidates cannot reuse approval, and emergency withdrawal is distinct from ordinary removal. |
| A10 — Operator parity | Restricted database commands enforce the same blockers, record human and executor separately and reject changed proposals. Chat-attestation limitations are explicit; no fake human Auth context or public service credential is used. |
| A11 — Atomicity and recovery | Two-admin conflict, concurrent correction/publication/checkout, lock timeout, transaction rollback, same-operation retry, changed-payload retry and refresh failure are exercised without partial publication or duplicate release. |
| A12 — Owner rollout | Owner walkthrough covers create/edit/preview/approve/history, a correction, denied staff actions and recovery. Production migration, deployed revision and authenticated customer/admin checks are recorded separately when rollout is authorised. |

Use focused database tests for permissions, invariants and concurrency; adapter/contract tests for digest and projection behaviour; and browser tests for the real owner and future-role workflows. Reuse existing collection, admin and payment fixtures where suitable. Test actual rule boundaries and cross-system behaviour rather than asserting implementation details.

No new runtime tests are claimed for this design-writing task. The document itself must be checked for contradictions, missing agreed decisions, ambiguous approval boundaries, accidental scope expansion, invalid source references and whitespace before being handed over.

## 16. Rollout and recovery constraints

Start with read-only inventory/import reporting, then owner-only private editing, then a non-production publication and purchase/access rehearsal. Production cutover needs a fresh target-data report, a recoverable backup, migration verification and the owner rollout authority appropriate to that release.

Turning publication off prevents new mutations but does not revoke buyer access to already committed additions. Stop a failing refresh worker or disable editing without rewinding financial history. After real purchases or additions, recovery must preserve the cumulative protected set; simply redeploying old configuration is not a safe rollback.

Maintain compatibility reads for committed new publications during application rollback. If a problem requires data repair, use a reviewed forward correction with an auditable receipt. Do not delete new release rows, restore an older database over live purchases or silently re-enable an old offer to make the screen appear healthy.

Phase 1's existing uncommitted work and unrelated changes in other checkouts are outside this design-writing change. This specification must be committed by its exact path only.

## 17. Review and next artifact

No further essential product-question round is needed before reviewing this first design. Recommended choices are deliberately explicit here: native database-backed administration, one active draft, stable public slugs, existing asset/taxonomy selection, successor access resolution, bounded offer rebinding and trusted operator attestation.

Owner review should approve this written specification or identify concrete changes. After that review, create a separate implementation plan with exact migrations/modules, dependency order, acceptance evidence, rollout/rollback steps and the execution/review method. That future plan is not implicitly approved by approval of this design.
