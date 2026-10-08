# Admin campaigns and performance reporting: Phase 4 design

- Date: 2026-10-07, America/Los_Angeles.
- Status: first written design for owner review. Decisions marked **agreed** come from this conversation. Proposed contracts, operational defaults and interaction details await review of this document.
- Deliverable: detailed functional and architectural design. The implementation task plan and visual mockups are separate artifacts.
- Source baseline: remote `main` freshly verified at `9bfdfc94390e5d3348a7b895d901ea81e13aac90`. Admin worktree inspected at `1b3fb18c8a961927b23c5e87b6bd9669892231c9`, branch `codex/admin-recipe-workspace-design`. Campaign configuration, source adapter, loader and checkout source have no differences between those two revisions. The admin branch has Phase 1 implementation and Phase 2/3 planning documents; their existence does not establish a deployed admin console or implemented Phase 2/3 workflows.
- Verification boundary: source and primary provider documentation reviewed. Production catalog contents, live free availability, provider credentials, sales, analytics collection and deployments were not inspected for this design. No product, database, provider or customer-facing changes are made by writing it.

## 1. Purpose and success

Phase 4 lets the owner answer: **“What are we promoting, what did we promise, where do the links lead, and what happened after people visited?”** It extends the existing native admin console and reusable campaign pages. The first operator is the owner; additional named admins receive only their assigned authority.

The first workflow is:

**Find or create a campaign → prepare a private revision → select eligible free recipes and an optional existing collection → preview → human approval → publish → copy placement links.**

The second workflow is:

**Choose a reporting period → inspect observed campaign activity → inspect linked checkout activity → inspect confirmed purchases where authorised → understand missing attribution and data freshness.**

Success means routine campaign preparation and publication no longer require editing source configuration, shared links continue to deliver their original promise, and reports distinguish observed behaviour from verified financial facts. An admin can explain a blocked publish, stale draft, missing metric or refresh failure without using SQL or pretending that unknown means zero.

## 2. Agreed decisions and proposed defaults

| Status | Decision | Required behaviour |
| --- | --- | --- |
| Agreed | Campaign management first, performance reporting next | Deliver increments 4A and 4B in order; do not delay useful campaign management for a comprehensive reporting platform. |
| Agreed | Website campaign pages and links | Instagram posting and automated-DM configuration remain in the owner's other tools. Record their references, without operating those systems. |
| Agreed | Use the existing campaign template | Campaigns supply content and recipe/collection references; full cooking instructions remain on canonical `/recipes/<slug>` pages. |
| Agreed | Existing published, free recipes only | A campaign cannot make a recipe free, publish it, change free-slot assignments or grant purchased access. Unavailable selected recipes block ordinary publication. |
| Agreed | Prepare, preview, approve and publish | A private save never changes the active public page. A human approves the exact candidate, including additions. |
| Agreed | Preserve the original promise; allow approved extras | Keep the original promised selection identifiable. Later additions supplement it. A substantially different selection/theme gets a new campaign. |
| Agreed direction | Preserve shared URLs and history | Published campaign addresses remain stable. Store original promise evidence and subsequent approved publications. |
| Agreed | Financial reporting is owner-only initially | Provide a separate permission that the owner can explicitly grant to another named admin later. Campaign editing alone gives no financial visibility. |
| Carried forward from Phases 1–3 | Narrow permissions, current membership, MFA, audit and exact approval | Reuse those controls and their protected operator model; do not introduce an alternate weaker campaign writer. |
| Proposed default | Manual publication, existing approved assets | No scheduler or general media manager in the first release. Preview uses the existing public renderer under private authorisation. |
| Proposed default | Freeze original members; retain every published addition | The original selection and its relative order stay fixed. Extras remain separate and can be ordered within the extras group. Ordinary revisions cannot remove or replace previously released members. Safety withdrawal is separate. |
| Proposed default | Existing template capabilities remain compatible | Preserve imported pack/collection presentations. Newly authored campaigns may be free-only or link existing collection offers; this phase creates no new product or pricing model. |
| Proposed default | Versioned first-observed campaign attribution within one visit | Preserve the existing first-campaign intention, fix expiry/join gaps, and show weaker or missing attribution explicitly. Section 16 defines the exact recommendation. |

Approving this document would approve its proposed design defaults. It would not approve any individual campaign publication, financial action, permission grant or production release.

## 3. Design acceptance ledger

These gates assess the written design. Runtime acceptance appears in section 22 and remains future implementation work.

| Gate | Observable design outcome | Evidence |
| --- | --- | --- |
| D1 | Owner-first purpose, future admins, agreed decisions and two increments are explicit | Sections 1, 2, 5, 21 |
| D2 | Current implementation, gaps and planned Phase 2/3 dependencies are distinguished | Sections 4, 13, 19 |
| D3 | Original promise, extras, stable addresses and inactive promotion have precise semantics | Sections 6, 8, 9 |
| D4 | Library, draft, preview, review, publication and recovery workflows cover non-success states | Sections 7, 10, 11, 20 |
| D5 | Campaigns use existing published free recipes and existing offers without changing access or money | Sections 5, 8, 10, 13 |
| D6 | Private drafts and public projections have defined data and permission boundaries | Sections 12, 14 |
| D7 | Exact human approval, operator attestation, concurrency and durable receipts are specified | Sections 11–13, 15 |
| D8 | Links distinguish campaign, placement, post and keyword; historical links remain compatible | Sections 6, 9, 19 |
| D9 | Campaign usage and safety withdrawal integrate with recipe/collection publication | Sections 8, 13, 20 |
| D10 | Reporting distinguishes events, visits, checkout attempts, purchases, refunds and attribution | Sections 16–18 |
| D11 | Financial permissions protect direct and derived values across APIs and caches | Sections 12, 17, 18 |
| D12 | Existing privacy behaviour, retention decisions and provider readiness are stated accurately | Sections 4, 14, 18, 23 |
| D13 | Migration, cutover, failure recovery and rollback preserve published promises | Sections 19–21 |
| D14 | Meaningful verification includes races, privacy, missing data and real integration evidence | Section 22 |

## 4. What exists and what must change

Paths below are relative to the repository root. These are source-confirmed observations at the revisions above.

| Existing system | Current position | Phase 4 responsibility |
| --- | --- | --- |
| Campaign configuration | `my-curated-haven-web/src/config/campaigns.ts` contains one published `frittata-fingers` entry, one `little-hands` draft and separate local-only samples. The published address is documented as already shared in DMs. | Import real entries with source provenance; preserve their addresses. Local samples remain fixtures, never production content. Counts describe configuration, not verified live pages. |
| Source boundary | `src/lib/data/campaigns.ts` exposes `CampaignSource.list/get` backed by configuration. Drafts are filtered out in production but can render in non-production. | Add a database publication source. New admin previews require authenticated private access; environment-only draft filtering is insufficient. |
| Reusable renderer | `src/app/stories/[slug]/page.tsx` and `src/components/campaign/` render a shared page, recipe cards and optional offers. Pages revalidate every 3,600 seconds and are currently `noindex`. | Reuse the renderer, preserve metadata policy initially, and add explicit versioned refresh handling. Do not create full recipe copies. |
| Loader behaviour | `src/lib/data/load-campaign.ts` reads anonymous free recipes, omits unavailable promised members and returns not-found if none remain. It hides non-purchasable offers. | Block newly published broken promises, retain safe unavailable placeholders after withdrawals, and explain health issues privately. Continue hiding unusable purchase actions. |
| Recipe availability | `public.free_recipe_slots` currently accepts slots 1–3; recipe access also depends on publication and reviewed content. | Select only currently eligible public recipes. Adding a campaign does not expand this capacity. Expanding free availability requires the separate authorised recipe/access workflow. |
| Campaign count validation | `src/lib/campaigns/validate.ts` currently accepts 1–12 recipe references and computes responsive layouts. | Do not mistake this implementation constant for a commercial collection limit. Proposed campaign behaviour supports logical growth with bounded/paginated admin operations; accepting more than 12 requires explicit validator, renderer and performance verification. No fixed collection count rule is introduced. |
| Commercial presentation | The loader resolves current collection offers through `src/lib/payments/repository.ts`; checkout requires an existing eligible offer. Current main also has the collections showroom. | Consume the authoritative Phase 2 publication and real offer state. Do not copy a configurable marketing price into purchase truth or assume every browsable collection is purchasable. |
| Browser measurement | `CampaignTracker.tsx` sends `story_view`, action and section events, and registers the first `entry_story` in PostHog session properties. `src/lib/analytics/campaigns.ts` accepts four Instagram placement codes and optional `utm_content`. | Preserve historical event meanings; add campaign/publication and visit references with a versioned measurement contract. |
| Attribution lifecycle | Campaign tags remain in session storage, while custom visit IDs roll over after 30 minutes of inactivity. The browser provider does not forward the envelope's custom session/event IDs. | Bind attribution to the same expiring measurement visit; carry explicit stable join/deduplication references. Tab lifetime must not silently become the attribution window. |
| Checkout measurement | Checkout persists a broad campaign code after session creation; reused open attempts return early. The browser's post label is not persisted by this path. | Freeze validated campaign/placement context with the original attempt, including recovery/reuse; never reassign a reused purchase to the latest clicked post. |
| SQL registry | The inspected `20260924010000_phase9_measurement.sql` allowlist differs from the four current browser placements. | Reconcile the SQL and TypeScript registries, test all four placements and retain historical codes as historical data. Unknown input remains unknown. |
| Financial truth | Private purchase, payment, refund, dispute and outbox records exist. Optional analytics exports are separate and gated. | Read verified ledger facts for financial reporting. Apply Phase 3 interpretation and never treat a browser success event as payment evidence. |
| Console integration | `private.admin_memberships`, current-role checks, `aal2`, stages, operations and append-only audit exist. Recipe publication checks a trusted deployment-time `private.admin_campaign_snapshots` record. | Add campaign/report capabilities and a database campaign-dependency revision. A database-authored campaign must immediately participate in recipe impact protection. |
| Existing privacy state | `src/lib/analytics/consent.ts` states consent collection was removed. Browser capture also depends on environment and provider flags. Admin paths already suppress custom analytics/replay. | State the current behaviour accurately; do not describe a consent banner as implemented. Preserve private/admin exclusion and do not use Phase 4 approval to expand tracking permissions. |

Related designs: [Phase 1](2026-10-04-admin-recipe-workspace-design.md), [Phase 2](2026-10-06-admin-collections-phase-two-design.md), [Phase 3](2026-10-07-admin-customer-support-phase-three-design.md). Existing campaign documentation: [Campaign pages](../../implementation/instagram-landing/CAMPAIGNS.md), [Instagram links](../../INSTAGRAM-LINKS.md), [earlier attribution contract](../../implementation/phase-9/INSTAGRAM-ATTRIBUTION.md), [admin operations](https://github.com/Pratikn07/my-curated-haven-web/blob/45ca05941efd9ce7bfc0e897e0b9048b00b22750/ops/ADMIN-CONSOLE.md).

## 5. Approach, increments and boundaries

**Recommended architecture: extend the native admin console with private campaign revisions, immutable approved publications and a narrow public projection. Add reporting adapters alongside it in increment 4B.** This shares identity, audit, review and recipe/collection dependencies without making campaign publication depend on PostHog availability.

| Alternative | Benefit | Limitation |
| --- | --- | --- |
| Keep Git-authored campaigns and add reporting first | Fastest access to existing activity | Routine content changes still require source edits/deployments; does not deliver the owner's chosen first priority. |
| Use a general external CMS/marketing suite | Broad content tooling | Adds another authority/review model and still needs custom recipe-promise, commerce and admin integration. |

### 4A: campaign management

Include inventory, new/duplicated campaigns, existing assets/template settings, existing free recipes, existing collection associations, private revision/preview, exact human approval, publication, placement links, health, history and inactive-promotion status. Include restricted operator preparation/execution under the already approved human-authorisation model. Introduce campaign/publication identities now so reporting can attach later without changing URLs.

### 4B: performance and financial reporting

Include measurement-contract repair, durable attempt attribution, aggregate campaign engagement/checkout reports, owner financial summaries and campaign breakdowns, unknown/legacy buckets, freshness, reconciliation and separate grants. A small overall financial total is included to reconcile campaign-attributed and unattributed purchases, rather than implying campaign rows explain all business activity.

### Separate or deferred work

- Instagram publication, scheduling, comment handling, keyword routing, DM configuration/delivery and cross-system writes.
- Automated social-metric imports, ad spend, ROAS, email marketing, experiments, subscriptions and predictive recommendations.
- New recipes, free/paid availability changes, collection membership/release edits, new offers, price/discount editing, sales enablement, refunds and discretionary access grants.
- New image upload/generation, arbitrary remote image fetching, a general asset manager, arbitrary HTML/layout editing and new brand-story claims.
- Scheduled campaign publication, bulk publishing, hard deletion of public campaigns, slug-change/redirect administration and raw customer/event exports.
- General analytics configuration or consent-platform implementation. Any tracking-policy change receives its own explicit review.
- Final visual styling and mockup approval. The interactions here define behaviour and information, not approved screen artwork.

## 6. Campaign identity, promise and lifecycle

A **campaign** is one Instagram post or a deliberately named selection, with a stable UUID and public slug. A **placement** is a generated link for a particular channel surface. One campaign may have several placements and several campaigns may promote the same collection. A **series** groups related campaigns for reporting; it does not merge their promises or financial attribution. A keyword is external-tool metadata, not a unique campaign identity: the same keyword may recur across posts.

Use independent state dimensions:

| Dimension | Proposed states and meaning |
| --- | --- |
| Publication | Never published; published; owner-approved emergency unavailable. Preserve publication records in every case. |
| Working revision | None; draft; submitted; changes requested; rejected; approved; superseded. Publication consumes a specific approved revision. |
| Promotion | Active; inactive. Inactive affects admin organisation and newly recommended promotion, not existing public links or external DM rules. |
| Health | Ready; attention; blocked; unknown. A health result is time-stamped evidence, not publication approval. |
| Refresh | Complete; pending; unavailable. A committed publication and a successful cache refresh are separate facts. |

First publication freezes the original promise: recipe identities and original order, original count, reviewed headline/promise text, relevant post references, approving human and publication time. Preserve imported historical evidence as imported evidence, not as a newly observed Instagram post.

Later publications retain that baseline and identify extras with their first publication. The public presentation must distinguish the originally promised recipes from extras, and derive original, extra and total counts from membership. Existing recipe titles/content may receive approved corrections through the recipe workflow; recipe identity is not replaced by a correction.

Duplication creates a new private campaign with a new UUID and proposed slug. It may copy content and references, but not publication, approval, post-link identity, keyword-delivery verification, financial history or generated placement identities. The operator must review copied claims before first publication.

## 7. Admin destinations and interactions

| Destination | Information and permitted actions |
| --- | --- |
| `/admin/campaigns` | Search/filter inventory, create and duplicate where permitted; restore filters when returning from a campaign. |
| `/admin/campaigns/[campaignId]` | Public/draft status, original promise, extras, collection references, health, post/keyword references and history. |
| `/admin/campaigns/[campaignId]/edit` | Private revision editor with explicit save and conflict handling. |
| `/admin/campaigns/[campaignId]/preview` | Authenticated rendering of an exact candidate and a comparison against active publication. No publicly reusable preview token. |
| `/admin/reports/campaigns` | Authorised aggregate performance report, filters, definitions and source freshness. Appears only when 4B is available. |
| `/admin/reports/finance` | Financial overview, campaign/unknown breakdown and reconciliation; initially owner only. |

Campaign inventory shows title, slug, promotion/publication states, original/extra counts, draft/review state, linked collection names, post date, health and last change. It contains no financial columns. Search by title/slug and bounded keyword/post reference; filter by publication, promotion, review, needs-attention, collection and series. Use stable pagination, 25 rows by default, with a server-enforced maximum of 100.

The detail workspace presents **Overview, Content, Preview and changes, Links, Readiness, History**, with performance added only when authorised and implemented. These are information groups; final navigation styling remains open to visual design.

Starting an edit records the active publication base. Unsaved changes are identified and leaving requires a discard/save choice. A failed save keeps local inputs and supplies a safe retry reference. Another editor's changes produce a conflict comparison rather than last-write-wins. Editing an approved revision creates a new unapproved revision and invalidates its prior review.

Empty inventory, no filter matches, missing permission, MFA required, missing database source, stale data and blocked publication have distinct messages. A source outage must not display an apparently empty campaign list.

## 8. Content and availability rules

### 8.1 Editable content

Allow title, supporting copy, approved hero/alternative text/focus, existing theme/motif, original selection before first publication, extras afterward, bounded recipe notes, existing collection references and offer copy, related-free-recipe selection, reporting series and external post/date/keyword references. Use the shared kitchen story by default. Per-campaign story overrides may select approved existing assets and recorded facts; they are reviewed content, not an arbitrary page builder. Shared brand-story editing remains separate because it affects every inheriting campaign.

Source recipe titles, images, times, diet/allergen labels and full content from the approved catalog. Source collection identity, current published count and actual purchasable price from the authoritative collection/commerce layer. Campaign copy cannot override price, entitlement, expiry, refresh policy or refund policy. Human review checks free-count language and commercial claims; pattern validation alone cannot prove truthful copy.

No fixed marketing minimum or maximum is proposed for campaign growth beyond requiring at least one original recipe for first publication. This is a design recommendation, distinct from the existing 12-reference validator. Use bounded write batches, payload limits and paginated admin selection; verify large-list rendering before removing that implementation cap. It neither expands free inventory nor changes the agreed unlimited-size collection policy.

### 8.2 Eligibility and preservation

Before ordinary first publication or an update, every intended available recipe must be published, reviewed as required by the recipe policy, anonymously free and backed by usable public assets. Check through the same public access rules used by visitors. Admin-only visibility or ownership is insufficient. A missing/unknown eligibility check blocks publication rather than silently dropping the recipe.

After first publication, original recipe identities/order cannot be changed by ordinary editing. New eligible extras are append-only in released membership; notes and ordering within extras may be corrected by another approved revision. A substantially different promise, theme or selection requires duplication/new publication at a new address. Cosmetic palette/copy corrections are permitted when the underlying promise remains intact.

Recipe/free-availability administration must include active and inactive public campaigns in its impact check. An ordinary operation cannot make a retained promised recipe paid or unavailable without resolving the dependency. Emergency safety withdrawal overrides delivery through the recipe safety workflow, not by deleting campaign history or granting unsafe access.

When a recipe is withdrawn after publication, preserve a safe public placeholder and explanation in its original position. Do not expose private body/image data or silently replace it. Show remaining safe recipes and approved extras. If none are deliverable, return a stable unavailable campaign explanation at the same address rather than an unexplained missing route. Restoration follows reviewed recipe republication and a campaign health recheck.

### 8.3 Optional collection offers

Free-only campaigns are valid. If an offer is associated, readiness records whether it is purchasable and whether any copy claims immediate availability. A candidate promising a currently unavailable purchase must be corrected before publishing; an explicitly optional, currently hidden offer can be retained with an acknowledged warning. This distinction is part of the exact preview.

If a collection/offer later becomes unavailable, continue serving safe free recipes and suppress unusable purchase actions, matching the current public policy. Notify the admin through a health item; do not fabricate a price, automatically enable sales or give access. Public offer values remain current and may change through their own authorised workflow; campaign publication does not freeze a price or change an existing order.

## 9. Placement links and external references

Generate links on the configured first-party site origin and the campaign's permanent route. Never accept an arbitrary destination/redirect URL. Initially support the current placements: `bio_link`, `story_link`, `instagram_dm` and `comment_dm`, with `utm_source=instagram` and `utm_medium=organic_social`.

Keep `utm_campaign` compatible with the placement registry. Assign each placement a neutral stable token in `utm_content`, for example `c_<32 lowercase hex characters>`, which fits the existing 40-character content pattern. The server registry maps the token to a campaign and placement. The campaign slug need not be shortened to become a tracking ID. Tokens contain no account, follower, child or customer information and confer no access authority.

Show destination, placement, campaign identity, associated post reference and copy action together. A never-published campaign can show a planned URL labelled unavailable publicly; the ready-to-share action requires confirmed publication/refresh and health. Generated links may persist before publication without making drafts public. Published tokens are not reused for a different campaign. Inactive promotion does not invalidate them.

Validate optional Instagram post URLs against the Instagram host and expected post/reel path forms. Store them as references; do not fetch private posts or automatically install a keyword route. Recording a keyword or post date means the owner supplied it, not that the DM automation is verified. Treat a missing real post URL as an explicit unpublished/external-status state, not a fabricated post.

Retain old links with missing/legacy UTM tags. They still open the same public campaign; reporting may classify them as destination-observed or legacy placement-only. No silent redirect to a different promise. Link generation validates tags locally and server-side, and ignores unrelated query parameters.

## 10. Preview, review and readiness

Preview uses the existing public components with a privately assembled exact candidate. It must show original recipes, extras, counts, headline, image/alt text, related cards, offer visible/hidden states, price provenance and link destination. Provide the active-versus-candidate diff and a phone-width reading option without asserting that visual mockups are approved.

Resolve public recipe and commerce facts through approved safe DTOs; admin preview must not accidentally succeed because the operator can read a private recipe. Exclude analytics, replay, search indexing, public caches and publicly cacheable image URLs for private assets. Approved public assets remain public; approval evidence and draft words remain private.

| Check group | Blockers or required information |
| --- | --- |
| Identity/base | Unique proposed slug before first publish; immutable public slug afterward; exact current base and revision. |
| Promise | Original set preserved; additions distinct; no duplicate identities or removal of previously released members. |
| Public recipes | Reviewed/published/free state, canonical destination, usable approved public image and current safety holds. |
| Words/assets | Required fields, bounded text, safe image source, accessible alternative text, truthful count and approved story/offer claims. |
| Offers | Correct existing collection identity, current availability and no unsupported price/access claims. |
| External links | First-party generated destination and allowlisted external post reference; external DM status labelled accurately. |
| Review/authority | Exact human decision, current authorised approver/executor, MFA/stage and no unresolved blockers. |
| Dependency freshness | Candidate/base, recipe/asset versions, free-availability revision, collection publications, registry revision and policy version are still current. |

Checks return pass/fail/unknown, explanation, evidence source, checked-at time and blocker/warning severity. Unknown material dependencies block publication. Warnings requiring judgement need explicit human acknowledgement bound to the approved candidate. First publication and additions use identical checks; selecting an already-used recipe does not bypass them.

Review can approve, request changes or reject an exact submitted revision. The owner may use one **Approve and publish** action after preview, which records separate approval and publication facts. Other reviewers/publishers follow their separate capabilities. A reviewer does not publish merely by approving; a publisher cannot manufacture human review.

## 11. Publication, concurrency and refresh

Publication validates a candidate-bound preview/impact token, current authority, approver and dependency versions inside a transaction. Acquire deterministic, scoped locks coordinated with recipe correction/withdrawal, free-slot changes, collection publication and campaign edits. Use bounded timeouts and return a retryable conflict/busy result; do not make provider calls while holding locks. Implementation must replace incompatible Phase 1 table-lock assumptions through an explicit coordinated migration, not just delete protection.

The transaction records an immutable publication, freezes the original promise on first publish or appends extras on updates, advances one active pointer, updates public-safe references and the campaign dependency registry, appends audit and saves an operation receipt. It must commit all or none. Recheck asset evidence from a trusted approved check no older than 60 seconds; compare stable object/version evidence so freshness alone does not rewrite the candidate.

Each command carries an operation ID, target, expected base, revision/digest and reason. Repeating the same authorised operation returns its receipt; reusing that ID with different content fails. Recheck authority before receipt disclosure. Concurrent campaigns may publish independently where dependencies permit; two revisions of one campaign cannot both replace the same base. A changed recipe, free state, offer consequence or policy requires fresh preview/review when material to the approved effect.

After commit, revalidate campaign, relevant recipe/collection references, admin inventory/detail and public metadata caches. Record **committed, refresh pending** if refresh fails. A refresh retry never republishes, creates another extra, emits a duplicate campaign publication or repeats external communication. Read back the committed publication version through the real public source before declaring it ready to share.

Public output and cached data carry a publication revision. A previously committed safe page may remain briefly during refresh, but a withdrawal must not be hidden behind the ordinary one-hour cache. The safety path must invalidate the campaign shell and recipe caches or use an independently fresh safe-availability overlay. If a campaign cannot establish that its previously cached content remains safe, render the controlled unavailable state. History/version previews remain private and cannot serve an unsafe historical recipe body publicly.

## 12. Permissions and authority

Extend the current console capability checks; the following names are proposed contracts, not existing RPCs. Active DB membership and `aal2` are required for every private page, query, mutation and receipt. The server flag and database stage both gate new operations.

| Capability | Initial mapping | Boundary |
| --- | --- | --- |
| `campaign.read` | Owner; explicitly enabled campaign viewer/editor/reviewer/publisher roles | Inventory, safe references, private previews and campaign history. No financial/customer reads. |
| `campaign.edit` | Owner and enabled editors | Create/duplicate/save drafts, prepare extras, submit review and prepare placement records. |
| `campaign.review` | Owner and enabled reviewers | Human decision on the exact submitted revision. |
| `campaign.publish` | Owner and enabled publishers | Publish an eligible approved revision and approve promotion-status changes; no bypass of review. |
| `campaign.emergency_withdraw` | Owner only | Explicit emergency campaign unavailability; no recipe/access/money side effects. |
| `report.performance.read` | Owner; separately granted to other named admins | Aggregate observed traffic, engagement and checkout-start activity. |
| `report.finance.read` | Owner only at activation; owner may grant later | Confirmed purchase counts, purchasing accounts, purchase-conversion rates, captured amounts, refunds, disputes and financial reconciliation. |
| `team.manage` | Existing owner authority | Explicitly grant/revoke the reporting capabilities on confirmed named accounts, with reason and audit. |

Campaign role enablement is an explicit rollout mapping, not an inference from arbitrary recipe access. Other existing members receive no reporting capability by default. Financial read does not imply refund initiation, provider inspection, customer lookup, campaign publication or permission management. Public prices may appear in campaign previews without financial-report permission because they are public offer facts.

Support opt-in capability grants alongside role defaults, using the same controlled grant mechanism adopted for Phase 3 rather than inventing another identity model. Team must support granting/revoking the two reporting capabilities from the first Phase 4 reporting release; do not leave delegation as an unimplemented schema possibility. The owner's intrinsic owner membership remains protected. No migration seeds real account identities.

Derive browser actor from verified authentication and `auth.uid()`. Do not trust posted actor/approver IDs, editable profile metadata, cached role claims or service-role identity impersonation. Approval must come from a human with current relevant authority. Grants/revocations take effect on the next request and at publication commit. Responses, downloads if ever introduced, drilldowns, totals and cached DTOs enforce the same permission split.

Purchase count and conversion-to-purchase are financial-derived information even without a currency sign. Non-financial report DTOs omit them and cannot infer them from hidden totals, combined funnel steps or a report query parameter. Redirection from an aggregate row to Phase 3 customer/order detail requires separate support permission; financial read alone cannot disclose customer identities.

## 13. Integration with recipes, collections and support

### 13.1 Authoritative campaign usage

The current recipe publisher reads deployment-bound `admin_campaign_snapshots`. A config deployment snapshot cannot remain the authority for database-authored campaigns. Introduce a versioned registry of public campaign member references, updated in the same commit as the active campaign publication.

Recipe impact checks must read the union of remaining legacy published campaigns and migrated database publications during transition, tagged with source/revision. Include original members, every published extra and promotion-inactive campaigns. Private drafts appear as private references only to authorised campaign readers and do not become public promises. Keep draft dependencies separate from public blockers.

Freeze the registry revision into recipe/campaign impact tokens and coordinate dependency locks with free-availability administration. Do not blanket-remove Phase 1 campaign exposure protection. Phase 2's approved recipe-correction workflow remains responsible for correcting an exposed recipe; Phase 4 must preserve that contract and update the preview/refresh dependency graph. An ordinary recipe edit cannot silently invalidate a campaign preview.

### 13.2 Collections and checkout

Use Phase 2's authoritative current collection publication for visible membership/count and the existing commercial offer for purchasability/price. A campaign may refer to an unavailable collection privately and show its problem, but it cannot create a release, mutate sold membership, advance an offer binding or enable sales. Preserve imported references until deliberately reconciled; do not remap a legacy commercial collection to a similarly named showroom collection.

Collection corrections/additions update their own public projection and invalidate affected campaign previews/offer sections. Orders retain original release/terms snapshots. Campaign changes do not alter historical attribution, purchased access or refund eligibility. The unlimited-size collection decision from Phase 2 remains unchanged.

### 13.3 Support and financial facts

Increment 4B consumes Phase 3's verified payment/refund/dispute and access-status interpretation. It introduces no competing payment state machine. Links to support appear only with the appropriate support capability. Reporting is read-only with respect to money and customer access: no refund button, discretionary grant, dispute response or customer notice is added by this phase.

Phase 3's exceptional owner-approved refund policy, source-specific dispute holds and non-expiring new-purchase policy remain intact. A campaign report cannot imply an advertised refund promise, guarantee continuing business hosting, or classify a support repair as a new sale. Full Phase 3 provider reconciliation is a release dependency for trustworthy financial reporting, even if 4A can ship earlier.

## 14. Data boundaries and proposed records

Names identify responsibilities; final migration signatures belong in the implementation plan. Do not assume these records already exist.

| Record/module | Responsibility and invariants |
| --- | --- |
| Private campaign identity/head | Stable UUID, unique reserved slug, active publication pointer, working head/version, promotion state and import provenance. Slug locks after first publication. |
| Private campaign revisions | Immutable candidate content, base publication, dependency/policy evidence, digest, author and save time; one current working head. |
| Promise and published members | Frozen original recipe UUIDs/order and original promise text/count; append-only released extras with first-publication provenance. Restrict deletion rather than cascading recipe deletion through promise history. |
| Human review/approval | Exact candidate/digest, material impact evidence, decision, reason, approver and time; changed candidates invalidate approval. |
| Campaign publications | Immutable approved content snapshot and member references, revision/policy/registry versions, executor, operation and commit time. One active publication pointer selects delivery. |
| Public campaign projection | Only active approved words, safe public asset/recipe/collection references, display grouping/counts and public publication ID. No private history, notes, review decisions or approver identity. |
| Placement registry | Neutral immutable token, campaign/placement identity and safe metadata. Private administration; narrow server lookup for attribution, no public table dump. |
| Health evidence | Check results, dependencies, observations and expiry. Public readiness is not a permanent permission grant. |
| Operations, audit and refresh receipts | Idempotency, exact request fingerprint, actor/authoriser/executor references, committed result, failure category and refresh-only recovery. |
| Optional order-attribution context | Original order/attempt reference, validated campaign/placement token, publication observed, visit reference, confidence category, policy and captured-at time. No payment authority. |
| Private aggregate report cache | Bounded metric results plus query/definition version, source environment/timezone, period, watermark, completeness and freshness. Financial and non-financial payloads are distinct. |

Keep private tables inaccessible to `anon` and ordinary raw authenticated table queries. Exposed projections require explicit grants/RLS and must contain only approved active public fields. Whether implemented as a projection table or narrow RPC, anonymous access cannot enumerate private drafts through counts, joins, error messages or ID probing. Security-definer functions use a safe fixed search path, narrow execution grants and strict typed input.

Admin/preview/report routes are private/no-store and excluded from indexing, custom analytics, autocapture and replay. Avoid private DTOs in shared caches, public server-component payloads, browser storage or error logs. The reporting page must not load the PostHog browser SDK to query reports.

Validate asset sources against the existing trusted public asset policy and fixed allowed origins. Arbitrary URL input must not trigger server fetching, metadata extraction or image-proxy access. Bound all text, list batches, filters and date ranges; parameterise database queries and allowlist external links. Validate same-origin intent for browser mutations and use the console's existing cross-site protection.

Retain publication/promise/approval provenance according to the operational/audit policy. Keep the operative promise and member references for as long as their public campaign remains available; a cleanup job cannot remove active delivery dependencies. Define separate retention for drafts, temporary health checks, pseudonymous attribution links, aggregate caches and financial source records. Exact periods are a production configuration decision, not invented here; section 23 makes the required activation evidence explicit. Deleting analytics linkage must not delete a purchase, expire ownership or erase the fact of an approved publication.

## 15. Agents and protected database operations

Carry forward the approved Phase 2 pattern: an agent may prepare a private candidate, retrieve an exact preview, show the owner the concrete update and execute that specifically approved publication through restricted commands. A reply such as “yes” or “yeah” authorises the exact presented proposal, not subsequent edits or a batch of unspecified campaigns. This design document itself is not approval to publish a campaign.

The browser and operator paths invoke the same publication invariants. Ordinary authoring uses protected commands, not arbitrary `INSERT`/`UPDATE` of campaign/public projection rows. The operator path records the human authoriser, executor, attesting operator, exact digest/impact evidence, reason and minimal evidence reference separately.

The database cannot independently prove a chat approval. Only a trusted restricted operator may attest to it; an agent-generated approval verdict or browser-posted human UUID is insufficient. Do not fabricate `auth.uid()`, bypass browser MFA or issue a general service-role writer. Superuser maintenance remains exceptional and is not proof that normal commands enforce approval.

Revalidate both human and executor authority, candidate and dependencies at commit. If authority is revoked or consequences change, stop and require a fresh eligible proposal. Retries of an unchanged successful operation read the existing authorised receipt. Promotion-status changes, emergency unavailability and permission grants have their own exact proposals; campaign approval does not authorise them implicitly.

## 16. Attribution and measurement contract

### 16.1 Three identities and confidence

Keep campaign identity, placement identity and pseudonymous measurement visit distinct. A campaign page view proves an observed destination; a valid tagged link adds a claimed placement. Neither proves that Instagram delivered a DM or that the post caused a purchase. Client-supplied context is untrusted measurement input and never an entitlement or payment decision.

Proposed categories are **registered placement and campaign**, **campaign destination observed, placement unknown**, **legacy placement only**, and **unattributed**. Report these separately. Preserve historical `story_*` event names/meanings; new properties/schema versions identify the stronger contract. Do not backfill a post ID onto old orders merely because they share `comment_dm` or a keyword.

### 16.2 Visit attribution rule

Recommend the first eligible observed campaign in a measurement visit. Valid generated tags select its registered placement; a direct campaign page observation can select campaign destination with unknown placement. Later campaign visits in the same visit do not overwrite the acquisition attribution, although their own page activity is reported for their actual destination. A non-campaign entry is not automatically Instagram.

A visit expires after 30 minutes of inactivity, consistent with the existing custom visit intention. Reset its attribution and entry-campaign storage together when a new visit begins. Storage denial produces ephemeral/unknown linkage, not fabricated continuity. Do not add cross-device, cross-browser, fingerprint-based or email-based marketing stitching. Redirects/sign-in in the same eligible visit may retain neutral context; no tokens/emails enter URLs. Define a versioned precedence rule for conflicting token, destination and legacy tags: a mismatched registered token is rejected, not reassigned.

Use opaque pseudonymous visit/event references consistently in permitted browser events and attempt linkage. New campaign events include stable campaign/publication IDs and whether the observed card was original or extra. Read those public IDs from the actual rendered publication, not today's active campaign when aggregating old events. Publicly cached pages must not contain visitor-specific references.

### 16.3 Checkout and confirmed outcomes

The server validates registry token, campaign/publication reference, input lengths, environment and measurement policy. Store a small optional attribution snapshot with initial order reservation before the provider call; later session binding/recovery must not lose it. Mapping/measurement unavailability yields an unattributed order and safe diagnostic, while commerce can proceed. No provider analytics request sits on the critical purchase/fulfilment path.

Reuse of an open attempt preserves its original frozen attribution and attempt reference. Do not create another checkout count or replace its campaign because the visitor clicked a different post. Previously missing legacy context stays missing unless a controlled evidence-backed reconciliation supplies provenance; no casual backfill from current browser storage. Future campaign updates and token inactivation never rewrite historical attempts.

Verified server payment/refund transitions join to the original attempt/order and its attribution. They retain original financial occurrence times separately from local ingestion/verification times. Dedupe browser events by stable event IDs where available and commerce outcomes by stable order/payment/refund identities. Repair optional exports to preserve event IDs and occurrence times if used; their current distinct-ID/timestamp conventions must not be assumed to support a joined funnel.

The seven-day conversion window starts at creation of the linked checkout attempt, following the earlier measurement contract. Count campaign-visit purchase conversion once per eligible visit whose linked attempt succeeds within that window. Later confirmed payments still appear in financial period totals, labelled outside-window for conversion. Recent cohorts remain provisional until their window matures. A successful checkout return page alone never counts as a purchase.

### 16.4 Existing tracking policy

The current source does not collect consent, despite legacy `analytics_consent`/policy field names. Do not label those flags as proof of consent. Maintain explicit measurement-policy version, enabled/suppressed state and export eligibility, while preserving old field interpretation for history. No new tracking, linkage or provider export activates merely because campaign authoring is enabled.

4B requires a verified current analytics/privacy policy and owner-approved configuration for the measurement it introduces. If that readiness decision is absent, 4A remains available, financial ledger totals can remain available to authorised readers, and behavioural/linkage metrics stay disabled/unavailable. Do not silently enable a consent platform, silently waive the existing issue or withhold financial accounting because optional analytics is off.

## 17. Report definitions and financial boundaries

Use the configured reporting timezone and verify its actual target value at activation; UTC is the recommended initial default and the inspected schema default. Display timezone and exact period on every report. Store occurrence times in UTC and calculate boundaries in that configured timezone. Support 7-, 30- and 90-day presets plus a bounded custom interval of at most 90 days per query initially; older history is accessed by changing the interval. This is a query-cost default, not a retention period.

Filter by campaign, series, placement, publication version and date where meaningful. Financial filters additionally separate currency, provider account and test/live mode. Never total currencies together or mix test activity into live results. All rows carry definition version, source watermark and completeness. An unavailable source produces unavailable/stale, not a synthetic zero.

| Metric | Definition/source | Permission and limitation |
| --- | --- | --- |
| Campaign page views | Accepted `story_view` observations, deduped by event ID under the new contract | Performance read. Legacy event quality is labelled; this is not unique people. |
| Observed campaign visits | Distinct eligible measurement-visit references that observed the campaign in the selected period | Performance read. Blocked capture/storage limits observation; no unique-human claim. |
| Recipe engagement | Visits with at least one campaign recipe click; optional event count and original/extra breakdown | Performance read. Clicks do not prove cooking, saving or satisfaction. |
| Offer engagement | Visits with at least one actual collection/pack CTA click | Performance read. A hidden/unavailable offer is not an opportunity or a failed purchase. |
| Checkout attempts | Distinct server-created original attempts linked to the campaign; reused sessions count once | Performance read. Checkout is purchase intent, not captured money. |
| Confirmed paid orders | Distinct orders with a verified successful captured payment | Finance read. Preserve the distinction from distinct payments and purchasing accounts; possible duplicates are attention items. |
| Captured amount | Sum of verified captured payment amounts in integer minor units, separated by currency/account/mode | Finance read. A displayed product price is not captured amount. |
| Successful refunds | Verified succeeded refund amounts/identities | Finance read. Pending, failed or outcome-unknown refunds appear separately and do not reduce this total. |
| Captured less successful refunds | Captured amount minus successful refunded amount under the selected period/cohort basis | Finance read. This is not profit, payout balance or revenue after tax/fees/disputes. |
| Formal disputes | Verified open/won/lost dispute counts and amounts separately | Finance read. An inquiry is not automatically a formal dispute; avoid subtracting the same loss/refund twice. |
| Checkout-start rate | Eligible acquisition visits with a linked original checkout divided by eligible observed acquisition visits | Performance read. Same period/cohort and measurement definition for numerator/denominator. |
| Purchase conversion | Eligible acquisition visits with a linked confirmed purchase inside the seven-day checkout window divided by eligible observed acquisition visits | Finance read. Recent cohorts provisional; unknown/unjoined orders excluded and disclosed. |
| Attribution coverage | Campaign-attributed, legacy-only and unattributed confirmed orders alongside the compatible overall order total | Finance read. Shows coverage, not all sales caused by a campaign. |

The headline conversion path is observed acquisition visit → linked checkout → verified purchase. Recipe clicks, section views and offer clicks are supporting engagement measures, not compulsory steps every valid buyer must complete. Keep destination engagement separate from acquisition credit: a visitor can view campaign B while their visit remains attributed to campaign A.

Use two clearly labelled financial bases. **Activity in period** uses captures/refunds/dispute events that occurred in the selected interval. **Purchase cohort to date** selects purchases captured in the interval and applies their successful refunds to a stated as-of time. Do not subtract all historical refunds from current-period captures without a label. Refunds retain original purchase attribution even if issued after campaign promotion ends.

Reconciliation shows overall confirmed orders = individually campaign-attributed + legacy placement-only + unattributed, within the same scope. Payment totals reconcile separately because an order may have more than one verified payment. Do not hide duplicate payment or incomplete reconciliation behind a neat campaign total. Historical missing bindings/amount composition remain explicit exceptions, not today's values substituted into old records.

## 18. Reporting architecture, freshness and privacy

Use two narrow server-side adapters: one queries approved behavioural definitions and the minimal visit-cohort bridge below from the configured PostHog project; the other reads financial/order-attribution facts from restricted database reporting functions. The admin browser receives only permission-appropriate aggregate DTOs. It never receives a provider read key, raw events, customer email, follower handles, payment details or arbitrary SQL access.

**Joined conversion requires the same observed cohort.** The behavioural adapter obtains only grouped pseudonymous visit references, acquisition campaign IDs and first-observation times for the requested definition/interval. The report service intersects that cohort with original attempt linkage and, for authorised purchase conversion, verified ledger outcomes. Perform this join in bounded server-side batches and discard intermediate visit references after the request; cache aggregate results only. This is a narrow measurement bridge, not a raw-event/customer export or email-based identity join.

Require complete pagination, compatible schema/policy versions, the same attribution/period scope and the same observed cohort for numerator and denominator. If query limits, suppression or missing visit references prevent that match, leave joined conversion unavailable with a reason; show separate source counts without dividing them. An attributed order with no observed visit still belongs in financial totals and attribution coverage, but not in an observed-visit conversion numerator. Never trust a provider's browser-forgeable purchase event as financial evidence or divide independently collected order totals by a smaller observed-visit count.

Provider queries are fixed/allowlisted by metric definition and parameterised filters. Use least-privileged read access for the selected project, verified against the actual provider API. The browser's capture/project token is not a reporting credential. Keep server credentials in the existing secret mechanism; no new secret values go into this document, source, logs or browser code. [PostHog's API guidance](https://posthog.com/docs/api) distinguishes query authentication from capture and documents endpoint limits; [its privacy guidance](https://posthog.com/docs/privacy) explains why private API keys must stay private.

Recommend a five-minute aggregate-cache target and a bounded 10-second provider query timeout. Refresh is an explicit rate-limited, authorised request that may reuse a valid cache. Persist only permitted aggregate results, definition/scope keys and source watermarks. Avoid unawaited work in serverless requests. A timeout returns the last completed result with its timestamp or unavailable; it does not block campaign editing, recipe browsing or checkout.

Financial and non-financial cache payloads are separate. Authorise before reading any cache, then key by environment, project/account scope, query definition, time interval, timezone, filters and permission class. No public/shared HTTP cache, arbitrary provider drilldown URL or client-controlled query can bypass financial permissions. Revocation blocks subsequent reads even when results were cached.

Show independently: last successful behavioural query, latest event represented, ledger observation/watermark, attribution-policy version, linkage coverage and incomplete windows. A successful query does not prove all visitors were tracked. A failed provider refresh must not change a financial ledger count into zero. Identify bot/internal/preview exclusions under a versioned rule rather than silently changing historical denominators.

Reporting does not send messages, adjust money or update access. Behavioural reports do not identify individuals. Financial reports show aggregates and safe references; customer detail requires Phase 3 authority. Do not introduce person-level or child-data joins to explain campaign performance.

For verified financial facts, preserve the existing signed-webhook and provider-reconciliation path. Stripe documents that deliveries may be duplicated and out of order; [its webhook guidance](https://docs.stripe.com/webhooks#event-delivery-behaviors) supports deduplicating stable facts rather than summing webhook deliveries. PostHog's [funnel documentation](https://posthog.com/docs/product-analytics/funnels) distinguishes overall and step-relative rates and attribution choices; the definitions in section 17 deliberately select one versioned interpretation.

## 19. Import, migration and cutover

1. **Inventory a concrete source revision.** Read campaign config, actual catalog/public access, collection/offer identities, existing shared URLs and trusted recipe-admin campaign snapshots. Produce a dry-run diff with digests and unresolved mappings. Do not assume current config proves the original Instagram promise.
2. **Import with provenance.** Map recipe and collection slugs to stable UUIDs. Import the real published entry as an immutable historical publication with imported-review provenance; import drafts privately without publication approval. Exclude local samples. Preserve absent post URLs as absent.
3. **Reconcile promises.** Review missing/unfree/unpublished members, changed recipe identities, unavailable offers and words/count mismatches. An imported record does not legitimise a broken promise or grant private content. Obtain owner evidence for ambiguities before cutover of the affected campaign; do not invent historical human approval.
4. **Prepare one source selection per campaign.** A controlled routing registry chooses config or database publication. Publication writes are disabled while that campaign is config-owned. An unmigrated campaign remains config-backed; a migrated campaign cannot silently fall back to stale config after a database error.
5. **Connect dependency protection first.** Switch recipe/free-availability impact checks to the complete union of legacy and database references with a versioned registry. Prove there is no interval in which a migrated public campaign disappears from impact protection.
6. **Verify public parity privately.** Compare original order, titles, canonical links, assets, offer behaviour, metadata/noindex and first-party URLs. Use actual authoritative sources for runtime acceptance; fixtures alone are insufficient.
7. **Cut over a bounded owner-selected campaign.** Activate database reads, refresh and verify the exact publication. Enable new writing only after parity/dependency gates. Preserve source provenance and the previous public publication for recovery.
8. **Retire ongoing config authoring for migrated campaigns.** CI/import checks reject duplicate ownership and config drift. Keep legacy source for evidence, not a second active writer. New campaigns use only the database source.
9. **Activate 4B independently.** Reconcile SQL/browser placement registries, introduce the optional attribution snapshot, verify environment isolation and measure linkage before enabling joined reports. Do not relabel legacy unattributed orders as newly attributed.

The existing `CampaignSource` interface is the public boundary to preserve. Its adapter can internally compose legacy/database sources during migration; private draft reads use a separate authorised API. Grouping original/extra members and safe unavailable placeholders requires an explicit loader/DTO extension, while existing `list/get` callers retain compatible publication semantics.

## 20. Failure and recovery behaviour

| Situation | Required outcome |
| --- | --- |
| Invalid/unknown recipe or changed free state | Preserve draft, identify the dependency, block ordinary publication. Never publish a shortened selection silently. |
| Concurrent draft save or publication | Return conflict with current base/version; keep unsaved input and require a deliberate refreshed candidate. |
| Approval or authority revoked | Deny new publication and private receipt reads. Do not disclose cached data through retries. |
| Transaction/lock failure | No partial publication, original-promise mutation or extra membership. Record safe failure evidence after rollback. |
| Commit succeeded, refresh failed | Return durable committed receipt with refresh pending; retry refresh only. Do not instruct the operator to publish again. |
| Database publication source unavailable | Serve only an explicitly known committed safe public projection where its safety can be established; otherwise a controlled unavailable page. No stale config fallback. |
| Recipe safety withdrawal | Immediately prevent unsafe recipe delivery and stale campaign exposure; retain safe promise placeholders/history and show remaining available content. |
| Campaign itself needs emergency removal | Owner previews reason/affected links and approves a separate unavailable publication. Stable route shows a safe explanation; no automatic refund, external post deletion or DM-rule change. |
| Optional offer stops being purchasable | Keep safe free recipes, hide unusable purchase action, raise campaign health attention. |
| Campaign marked promotion inactive | Keep URL, promise and existing placement tokens; stop recommending it for new promotion in admin. |
| Unknown/mismatched UTM token | Discard unsupported context, retain safe destination routing and report unknown attribution. Never change access. |
| Checkout retried/reused | Preserve original attempt context and count once; no attribution overwrite. |
| Missing analytics, suppression, provider timeout | Show disabled/unavailable/stale with source timestamps. Campaign management and verified financial ledger facts remain independent. |
| Duplicate/delayed webhook or export | Dedupe by financial/event identity and preserve occurrence time. Late facts amend the appropriate cohort rather than creating another sale. |
| Restoring a prior public version | Prepare a new approved corrective publication that retains all released original/extra members and honours current safety/offer facts. No blind pointer rollback that removes additions. |

Health evaluation occurs on admin read/preview/publication and when affected recipe/collection changes are processed. Scheduled monitoring and external alerts are a later operational choice; this document does not assume a running monitor or send notifications.

## 21. Delivery, activation and rollback

| Increment | Deliverable | Activation gate |
| --- | --- | --- |
| 4A.1 | Read-only campaign inventory/import reconciliation and usage integration | Current console authority, correct source ownership and complete public-dependency registry. |
| 4A.2 | Private drafts, recipe/asset/offer selection, exact previews and review | Draft privacy, anonymous recipe eligibility, version/conflict checks and owner rehearsal. |
| 4A.3 | Publication, immutable promise/extras, placement links, inactive promotion, emergency state and refresh recovery | Atomicity/races/safety checks, public readback and no shared-link regression. |
| 4B.1 | Versioned measurement, registry reconciliation and durable attempt linkage | Verified policy/configuration, real event/attempt evidence and isolated environments. |
| 4B.2 | Aggregate engagement/checkout reporting | Definitions, missing-data/freshness handling, private server adapter and performance permission. |
| 4B.3 | Financial overview, campaign breakdown and explicit report delegation | Phase 3 factual reconciliation, financial permission isolation, currency/time/cohort checks and owner review. |

4A depends on the integrated Phase 1 console and compatible recipe/public-access protections. Collection authoring remains in Phase 2; do not ship a temporary alternate collection authority to bypass its completion. Where Phase 2 is not yet integrated, free-only campaigns can be rehearsed, but affected collection-linked production workflows wait for the shared authoritative contract. 4B financial reporting depends on the completed Phase 3 verified fact interpretation and on provenance for any legacy orders included.

Use a campaign stage (`disabled`, `inspection`, `editing`, `publication`) within the existing console gate, plus independent reporting/linkage activation gates. The exact names are implementation contracts to define in the plan; disabling the global console also denies direct campaign/report commands. Public reading of already committed safe publications remains independent from admin authoring being enabled.

Roll out inspection first, then private editing, then owner publication of one reviewed campaign. Verify actual authenticated/private and anonymous/public paths before broadening. 4B activates only after measurement quality is observed; traffic permission does not enable finance. Log deployed revision, migration set, source-ownership registry, enabled stages, policy/definition versions and owner acceptance evidence at release.

Rollback disables new writes/attribution exports/report reads as appropriate without deleting drafts, approvals, published promises, purchases or audit. Keep database-owned public publications available; reverting application code to a config-only renderer after new campaigns exist is unsafe. Maintain a compatible read path or explicitly exported reviewed public projection with preserved identities. Correct a bad publication through another approved additive revision. Emergency safety unavailability uses its explicit path and cache protection.

Disabling optional measurement must stop new behavioural context/export according to policy without interrupting financial recording or existing purchase access. Existing captured facts remain historical; reporting retention/redaction follows the approved policy. Provider keys and rollout settings are verified through secure configuration, never printed in evidence.

## 22. Implementation acceptance and verification strategy

These are required outcomes for the later implementation plan, not tests claimed to have run during design writing.

| Gate | Required evidence |
| --- | --- |
| A1 — Source fidelity | Dry-run import identifies all real config entries, excludes local samples, preserves the published URL and records exact recipe/collection mappings and provenance. |
| A2 — Access separation | Anonymous/non-member/aal1/revoked-role requests cannot read drafts, previews, history or reports; authorised operators can complete only their enabled capabilities. |
| A3 — Draft isolation | Saving, submitting and approving without publishing leave the anonymous page and metadata unchanged. Preview is no-store and emits no analytics/replay. |
| A4 — Existing free recipes | Admin-visible/private/paid/unreviewed/withdrawn recipes fail eligibility; campaign commands never change recipe publication, free slots or entitlements. |
| A5 — Promise and extras | First publication freezes original identities/order/count. Additions stay distinct; repeat publication cannot duplicate them; removal/substitution/slug mutation is rejected. Larger membership does not reintroduce a commercial count rule. |
| A6 — Review binding | Changed candidate, base, dependency or material warning invalidates old approval. Owner combined approval/publication produces separate trustworthy facts. |
| A7 — Concurrency | Two-editor saves, two-publisher races, recipe withdrawal/free-state changes and collection publication interleavings yield one valid commit or explicit conflict, never a broken promise. |
| A8 — Dependency protection | Both migrated database campaigns and remaining legacy references appear in recipe/free-slot impact checks, including inactive promotion and extras. No snapshot cutover protection gap. |
| A9 — Public safety | Withdrawal invalidates/overlays warm caches, preserves safe placeholders and gives a stable explanation when all original content is unavailable; private or unsafe recipe bodies never leak. |
| A10 — Durable publication | Faults before/after commit and during refresh distinguish unchanged, committed and pending-refresh outcomes. Retrying an operation/refresh cannot republish or remove additions. |
| A11 — Links | All four placement codes survive browser/server/SQL validation; long slugs use neutral tokens; old/bare/invalid links route safely; external post/DM verification is never fabricated. |
| A12 — Operator approval | Protected DB commands enforce the same invariants; attested human and executor remain separate; forged/revoked/changed approval fails without general write authority. |
| A13 — Measurement lifecycle | Visit rollover clears old attribution; blocked storage/capture produces disclosed gaps; direct destination, legacy placement and registered link remain distinct; internal/admin previews are excluded. |
| A14 — Checkout linkage | Attribution survives original attempt reservation/session-creation failure and verified recovery. Reused attempts retain original context and count once; tags cannot grant access or overwrite order terms. |
| A15 — Financial truth | Duplicate/out-of-order events, pending/partial/full refunds, disputes, multiple payments per order and support repairs reconcile to verified facts. Client success cannot manufacture sales. |
| A16 — Report definitions | Controlled data verifies visit versus event counts, acquisition versus destination, timezones/day boundaries, seven-day maturity, late payments/refunds, unknown coverage and both financial period/cohort bases. Lost browser observations, incomplete cohort pagination and forged purchase events cannot inflate a joined rate; unmatched orders remain financial facts and incomplete joins show unavailable. |
| A17 — Permission leakage | Financial values and derived purchase-conversion/count information are absent from non-financial DTOs, caches, queries, drilldowns and source payloads. Grant/revoke works on the next request; finance read gives no support/refund authority. |
| A18 — Reporting resilience | Timeout/stale/disabled/partial sources and empty real data are distinguishable. Bounded queries/cache refresh never impede campaign writes, public browsing or checkout. |
| A19 — Cutover and rollback | Source selection cannot double-own a campaign or revert to stale config. Rollback preserves new shared addresses, promise history, published extras and safe public delivery. |
| A20 — Real integration rehearsal | Record an authorised owner journey through prepare/preview/publish/addition/refresh, anonymous public readback, and a permitted test-mode linked checkout/report reconciliation on the actual target stack. Browser fixtures, green CI or configured keys alone do not satisfy this gate. |

Use focused domain tests for promise membership, link validation and metric definitions; database tests for authority/RLS/immutability/atomic operations; integration tests for cross-module locks, attribution and financial aggregation; browser tests for workflow/privacy/accessibility and published readback. Use synthetic fixtures for fault/race cases and an isolated test provider environment for commerce. Do not send real DMs/emails, publish Instagram posts or issue real refunds to verify this phase.

Run the smallest relevant existing checks plus new contract tests, then the required integrated release suite after actual implementation. Fix integration failures before declaring the increment complete. The eventual implementation plan must map every gate to concrete files, commands and evidence; a written design is not runtime verification.

## 23. Review and release prerequisites

The core product questions have been answered. Owner review of this written document should focus on the proposed defaults: retention of all published extras, manual publication, flexible campaign growth, first-observed visit attribution, seven-day purchase conversion and the separation of performance/financial metrics. These are explicit reviewable recommendations, not claims that the owner already chose every technical detail.

Before production activation, record the actual recipe/collection/admin integration revision, source ownership and historical-promise reconciliation; verify public free capacity and offer identities against the target; and complete the owner rehearsal. Those are evidence gates, not a request to invent another recipe/free-allocation workflow inside campaigns.

For 4B, separately verify the actual PostHog project/read credential, server export environment, provider account/mode, measurement policy and suppression behaviour. Choose and record exact retention/redaction schedules for pseudonymous linkage, draft/diagnostic evidence, aggregate caches and audit/financial records using the existing privacy/operations policy. An absent schedule blocks activation of the affected data collection, not writing the implementation plan or using safe campaign drafts. This document does not settle the still-open Phase 3 retention periods by implication.

After written-design review, create a detailed implementation plan with explicit contracts, migration order, dependencies, acceptance mapping and the already selected Native execution method followed by independent final review. Production rollout remains a separately authorised release.
