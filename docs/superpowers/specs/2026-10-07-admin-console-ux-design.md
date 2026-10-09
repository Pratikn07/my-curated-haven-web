# Admin console UI/UX design for Phases 1–4

- Date: 2026-10-07, America/Los_Angeles.
- Status: owner approved proceeding from this written design to UI implementation planning on 2026-10-07. The earlier visual direction and this interaction contract remain the design basis; each UI plan has its own review handoff before code execution.
- Scope: the protected My Curated Haven admin console. This is a UI/UX layer over the four existing domain designs, not new authority to edit customer access, move money, publish content, or deploy.
- Evidence boundary: repository source and the four written phase designs were inspected. The interactive concept uses illustrative records and figures. It is neither a live-data view nor evidence that Phases 2–4 are implemented or deployed.

## 1. Agreed outcome and design gates

The owner needs one calm operational workspace that makes the next decision clear. The home separates **Publishing** from **Customer support**. Recipes, Collections, and Campaigns share a recognisable private-draft and reviewed-publication rhythm. Customer support presents evidence, access explanation, exact proposed effects, and post-action verification in its own flow. Reporting distinguishes observations from verified financial facts.

The owner approved a dedicated **Preview & changes** step after recipe editing. It compares the exact saved candidate with current public content and leads to a separate final impact review. On desktop, the main evidence and a next-action panel sit alongside each other; on a phone they stack without hiding actions. The console uses the site's current cream, white, ink, terracotta, and sage roles with more compact operational density than public reading pages.

| Gate | Observable design requirement | Section |
| --- | --- | --- |
| UX1 | The home has separate permission-scoped Publishing and Customer support areas, each with actionable reasons and source freshness | 3 |
| UX2 | Navigation and record pages show live state, private work state, next action, and history consistently | 2, 4 |
| UX3 | Phase 1 library, editor, dedicated comparison, review, publication, and Team flows have explicit states | 5 |
| UX4 | Phase 2 collection screens show buyer impact and protect purchased membership | 6 |
| UX5 | Phase 3 support screens preserve separate financial, access, provider, and action states | 7 |
| UX6 | Phase 4 campaign and report screens preserve promises, links, permissions, and measurement provenance | 8 |
| UX7 | Mobile, accessibility, privacy, errors, conflicts, and committed-but-pending outcomes are explicit | 9–11 |
| UX8 | This design stages navigation by real availability and does not represent planned workflows as shipped | 2, 12 |

## 2. Shell, navigation, and progressive activation

The desktop shell has a compact brand/admin header, a persistent left navigation column, and a flexible content area. The header identifies the signed-in operator and gives access to the public site and sign-out. The active module and current page are visible through navigation and breadcrumbs. The content width supports tables, comparisons, and readable detail without forcing full-width prose.

Navigation groups are stable across phases:

| Group | Destinations |
| --- | --- |
| Workspace | Home |
| Publishing | Recipes, Collections, Campaigns |
| Operations | Customer support |
| Insights | Campaign performance and owner-authorised Finance |
| Access | Team |

Only operational, authorised destinations appear. A module does not acquire a navigation entry from a database table, migration, feature flag, or plan alone. A signed-in person sees only destinations for which current membership and exact permission permit a useful read. A disabled stage or source outage has a truthful unavailable state inside an authorised destination; it is not represented as an empty successful list. Losing permission closes private detail and pending actions on the next request.

Phase 1 keeps `/admin` directing to `/admin/recipes`, as its existing design specifies. Once at least two real domain workflows and their authorised attention feeds are active, `/admin` becomes Home. That change requires its own route and browser acceptance gate. The shell may be visually prepared earlier, but the home must not contain synthetic counts or empty future modules in a live release. Owner-only Team remains visible only to the owner.

At phone widths, the navigation becomes a wrapped, labelled row; it never requires horizontal page scrolling or icon recognition alone. Record headers and primary actions remain above the main evidence. Tables change to labelled record rows/cards. Filters and selected-row return state survive detail navigation. The same route continues to work at 320 CSS pixels and 200% zoom.

## 3. Home: decisions, continuation, and results

Home answers **what needs a decision, what work can be continued, and what recently completed**. It presents two visibly separate areas:

| Area | Content | Ordering |
| --- | --- | --- |
| Publishing | Recipe review, collection impact review, campaign eligibility and publication/refresh follow-up | Blocking safety or availability first, then submitted review and eligible publication, with age and last change visible |
| Customer support | Verified paid-but-unfulfilled mismatches, formal-dispute deadlines, unresolved refund outcomes, and case follow-up | Deadline and customer-access consequence first; provider observation time stays visible |

Every row names its object, one actionable reason, the exact state, observed/updated time, and an **Open** link to the relevant page. Counts come from the same authorised query and scope as the rows. A source failure displays **unavailable** and its last known successful check if available; it never shows zero. Support rows disclose only a safe order/case reference on Home, not customer email, free-form notes, raw provider identifiers, or financial totals.

**Continue work** shows the operator's permitted private drafts and cases with their last saved state. **Recent results** shows durable publication/support receipts when they are useful, including `committed; refresh pending`, `applied; verification pending`, and `outcome unknown`. Opening a result rechecks authority. Home does not substitute for the full object history.

If only Publishing is authorised, Customer support is absent. If the authorised queue is empty, say **Nothing needs your action right now**, with a route to the relevant inventory. Home has no vanity metrics or cross-module financial summaries.

## 4. Shared record-page pattern

Publishing records use the same spatial grammar without forcing every domain into identical tabs:

1. **Header:** breadcrumb, title and stable identifier where helpful; separate labels for what is public/live and what is privately being prepared; last meaningful change and source freshness.
2. **Main evidence:** object-specific content, active-versus-candidate preview, structured changes, dependencies, and history. Long content stays readable at about a normal reading-column width.
3. **Next-action panel:** one primary permitted action, blockers/unknowns, the exact revision or receipt involved, and direct links to resolve an issue. On a phone it sits before long detail content.
4. **Final decision page:** exact candidate and impact, fresh dependency result, actor/approval state, required reason, and explicit action wording. The final page can be revisited safely after a lost response by retrieving a receipt.

The vocabulary is consistent: **Live** describes current public state; **Working revision** describes private work; **Review** describes a human decision for an exact snapshot; **Readiness** is a checked, time-stamped evaluation; **Refresh** is the public display update after a committed write. A single green badge does not collapse these axes. A change to an approved candidate invalidates that candidate's eligibility and returns it to private work.

The action panel does not manufacture authority. Reviewers may approve only where their permission applies; publishers may publish only an eligible approved candidate; the owner may use the approved combined action where each domain design allows it. A disabled or denied action explains its reason without exposing protected facts to an unauthorised person.

## 5. Phase 1: Recipes and Team

### Recipe library and inspection

The default library is **All recipes**. Search, publication/review filters, collection filter, pagination, and selected-row return position follow the [Phase 1 design](2026-10-04-admin-recipe-workspace-design.md#3-entry-navigation-and-library). The desktop row shows thumbnail or explicit missing-image state, title, live publication state, working/review state, collection references, last relevant change, and the next route. Mobile rows retain these labels and the full Open action.

The recipe workspace header states what a visitor can read now and what revision is private. It offers **Preview**, **Readiness**, **Usage and access**, and **History** as connected sections, while **Edit** opens the dedicated working-revision editor. Usage shows free-slot, collection/release, and campaign references with source and freshness. It does not claim a particular customer's access.

### Editor, Preview & changes, and final review

The editor groups catalog facts, structured ingredients and steps, review/safety fields, and approved existing image/alt text. Save is explicit. The header shows **Unsaved changes**, **Saving**, **Saved at [time]**, **Failed**, or **Conflict** as appropriate. Navigation with unsaved work asks the operator to choose whether to stay or discard. Failed saves retain typed fields in memory; conflict exposes a comparison and deliberate rebase path. Existing data that the editor cannot safely express receives an inspection message and must round-trip without loss.

**Preview & changes** is a separate step reached after a saved candidate. It shows **Published today** and **Proposed revision** in adjacent desktop reading surfaces and stacked phone surfaces. The proposed side uses canonical recipe rendering for ingredient and instruction meaning, under private admin authorisation. A structured change summary identifies fields, image/alt text, and ordered-list changes. A separate impact/readiness panel shows exact review decision, unresolved issues, free access, collection/offer exposure, campaign references, version, and checked-at time. Unknown material checks block the next step. The public version remains clear even when a new revision is approved.

**Review exact effect** is the final decision page. It repeats the exact revision, changed fields, present public state, affected references, access effects, and operational reason. It offers **Approve and publish** only to the owner where a combined action is permitted; a separate reviewer and publisher see their respective actions. Publication reports its durable receipt and public refresh state. A retry of refresh operates on that receipt and never republishes. Withdrawal has its own impact, acknowledgement, and emergency boundary from the Phase 1 design.

The Team screen is owner-only. It supports exact confirmed-account lookup, role/capability explanation, assignment and revocation with reason, current members, and immutable action result. Role names are not a proxy for all later-phase capabilities. A recipe-only colleague receives no customer, refund, or finance visibility from Team or elsewhere.

## 6. Phase 2: Collections

Collections enter the Publishing navigation when the completed Phase 2 authority and read path are active. The inventory shows public visibility, browsing availability, actual published recipe count, draft count, review/readiness, shelf/series, and independent commerce availability. A published listing, a coming-soon listing, and sales-enabled state use separate labels.

The collection workspace has **Overview**, **Contents**, **Preview & changes**, **Readiness**, and **History**. The editor supports the approved existing cover, copy, shelf/series, recipe selection/order, and eligible additions. A private draft can contain an unreviewed recipe with a blocker. The published collection and buyer rights remain unchanged until a reviewed publication commits.

**Preview & changes** compares the published count and contents with the proposed count, text/cover/order changes, additions, and any allowed removals. Its buyer-impact sentence is plain language: for example, *Published: 5 recipes. Draft: 8. Existing eligible buyers receive 3 additions at no extra cost. No purchased recipe is removed.* Figures in this example are illustrative. Protected purchased members have an explicit explanation where removal controls would otherwise appear. Recipe-level readiness is shown separately from collection approval.

The final review shows current publication base, exact candidate, recipe versions, offer/checkout consequences, buyer-access effect, human decision, and reason. On success, show published version, added count, affected buyer rule, and public-refresh state. History supports copying an old version into a new forward draft; it never suggests that restoration rewrites a purchased release.

## 7. Phase 3: Customer support

Support opens from a restricted attention queue or exact lookup by order support reference, normalised account email, or internal account ID. Provider IDs are an advanced exact lookup only for permitted operators. The lookup surface distinguishes **found**, **not found**, **unconfirmed**, **ambiguous**, and **unavailable**. Email stays out of URLs, Home rows, analytics, and default logs. The selected order and recorded owner principal remain distinct from a person presenting a receipt.

The order page presents seven independent axes from the [Phase 3 design](2026-10-07-admin-customer-support-phase-three-design.md#61-keep-independent-states-visible): checkout attempt, captured payment, refund, dispute, source eligibility, effective collection access, and account availability. It then explains original release/terms, approved successor additions, current content restrictions, source lineage, and provider/ledger/resolver freshness. A timeline separates provider facts, system processing, human decisions, and post-check results. The interface labels facts, inferences, and suggested next steps separately.

The action panel begins with **Check provider status**. A repair proposal receives a dedicated exact-effect review: order/account/source bindings, before/after eligibility, before/after effective access, dependency versions, reason, approving human, and executor. Stale or incomplete evidence returns to diagnosis. A committed repair and a failed post-check display **Applied; verification pending**, with receipt recovery rather than a second write.

The exceptional refund path has its own owner-only review screen. It displays original payment/mode/currency, captured amount, successful and pending refunds, reserved capacity, fixed proposed full or partial amount, reason, possible provider notification, and the predicted effect on this purchase source and other valid access. **Approve and submit refund** is distinct from **Approve and apply repair**. After submission, the interface separately shows provider dispatch/result and local ledger/access reconciliation. **Outcome unknown** blocks another submission until safe recovery. A successful full refund affects only the qualifying purchase source under the approved policy.

A verified formal dispute creates an owner attention item and private case. The notice composer previews exact verified recipient, subject/body, current effective-access statement, and approval expiry; no webhook or draft automatically sends mail. Customer support does not become a general messaging, account-transfer, or discretionary-grant UI.

## 8. Phase 4: Campaigns and reports

### 4A: Campaign management

Campaigns enter Publishing when private campaign reads and protected operations are active. The inventory shows title, stable slug, public/draft state, promotion state, original and extra recipe counts, linked collections, health, post reference, and last change. No financial column appears there.

The detail page separates **original promise** from **approved extras**. It shows active public page, private candidate, recipe eligibility, existing collection offer state, generated first-party placement links, owner-recorded post/keyword references, readiness, and history. A post URL or keyword is labelled as a reference; it is not displayed as proof of DM delivery. Promotion-inactive status does not invalidate a shared link.

**Preview & changes** uses the existing story rendering privately and compares the exact candidate with the active publication. It shows original and extra membership, count/copy changes, eligible public/free recipe facts, offer visibility and price provenance, phone-width reading, dependency check time, and exact review. A material unknown blocks publication. The final action records the human decision and reason, then shows committed publication, public refresh, link readiness, or pending recovery truthfully. A safety withdrawal leaves stable addresses and safe unavailable explanations as specified by the [Phase 4 design](2026-10-07-admin-campaigns-phase-four-design.md).

### 4B: Performance and finance

Reports appear only when the source, measurement policy, and permission for each view are active. **Campaign performance** shows period, timezone, definitions, observation coverage, source watermark, and behavioural figures such as observed visits, recipe engagement, offer engagement, and linked checkout starts. A cohort purchase-conversion result appears only with the separate finance permission and a complete compatible observed cohort. An unavailable metric renders **Unavailable** with its reason; it never silently becomes zero.

**Finance** is a separate owner-authorised destination with confirmed paid orders, captured amounts, successful refunds, disputes, attribution coverage, and reconciliation by currency/provider/mode. It shows **Activity in period** and **Purchase cohort to date** as distinct bases. No total mixes currencies or treats a browser success event as payment. A campaign editor or performance reader cannot derive hidden purchase counts or financial conversion from the permitted view. Links into individual orders require separate support authority.

## 9. Visual and responsive system

Use the current functional tokens in [`src/styles/tokens.css`](../../../my-curated-haven-web/src/styles/tokens.css): cream canvas, white surfaces, ink text, high-contrast terracotta action, sage success, visible control borders, focus ring, four-pixel spacing scale, and 12–20px corner roles. The proposed Haven House illustration system is a public-site concept and is not a console dependency. Use restrained visual warmth through typography and spacing; dense lists, evidence, and decisions remain easy to scan.

| Context | Layout |
| --- | --- |
| Wide desktop | Left navigation; record evidence and next-action panel side by side; active/candidate comparisons adjacent |
| Tablet/narrow desktop | Navigation and controls wrap; content columns contract without clipping |
| Phone, including 320 and 375 CSS pixels | Labelled navigation rows; one-column evidence; active/candidate preview stacks in order; action panel precedes long detail; tables become labelled record rows |

Primary controls have a target of at least 44px on touch layouts. Important status words never rely on colour alone. Keyboard focus order follows reading order; instructions and recipe members have explicit move controls in addition to any drag interaction. Error summaries focus and link to fields. Save, review, publication, refund, and recovery feedback uses a polite live region; blocking validation uses clear text and focus. Confirmations restore focus on cancel or completion. Essential copy and actions do not depend on animation or hover.

## 10. State, error, and recovery language

| State | UI treatment and next action |
| --- | --- |
| No records | Explain that the authorised inventory has no entries; show permitted creation or return route |
| No filter matches | Preserve filters and offer Reset filters |
| Source unavailable | State which source/check is unavailable and the last successful check when known; offer safe Retry |
| MFA or permission missing | Explain the access requirement without showing private details; link to the valid re-authentication or site route |
| Unsaved changes | Stay/discard choice before navigation; no private content copied to URL or local storage |
| Save failed or conflict | Retain local edits; distinguish safe retry of the same attempt from reload/compare/rebase |
| Review no longer applies | Show the changed candidate/revision and require new review |
| Publication blocked or dependency stale | Identify the specific blocker or unknown check; return to updated Preview & changes |
| Committed; refresh pending | Show committed version/receipt and a refresh-only retry |
| Repair applied; verification pending | Show durable receipt and remaining post-check; no second repair |
| Refund or notice outcome unknown | Show exact operation and safe recovery status; block another send/submission |

Copy names the object and consequence. It avoids raw exception text, private identifiers, and success language for queued or unknown outcomes. Time stamps show timezone and whether they describe an original event, latest provider observation, local record, or cache/query watermark.

## 11. Authority, privacy, and data boundaries

The UI can hide unavailable actions, but private pages, data reads, receipts, previews, and writes still depend on current server/database membership, `aal2`, stage, and exact capability. The design does not add client-side authority. Team assignments, recipe publication, collection releases, support repairs/refunds/notices, campaign publication, and report access keep the protected contracts in their phase designs.

Admin routes, search fields, draft words, customer data, approval reasons, provider references, and financial values stay out of optional analytics, replay, public caches, and public preview URLs. Server responses are private/no-store where required. Sample records used in the visual concept are explicitly labelled as illustrative and are not copied into a production fixture or claimed as live evidence.

Cross-domain references are read-only until the responsible phase enables its own protected action. The recipe editor does not change collection membership, free slots, campaign promises, prices, orders, refunds, or entitlements. A support repair does not edit a recipe or bypass a content hold. Campaign authoring does not send Instagram posts, configure DMs, or change financial terms.

## 12. Delivery and review boundary

This design is a visual and interaction crosswalk for the four [Phase 1](../plans/2026-10-04-admin-recipe-workspace.md), [Phase 2](../plans/2026-10-07-admin-collections-phase-two.md), [Phase 3](../plans/2026-10-07-admin-customer-support-phase-three.md), and [Phase 4](../plans/2026-10-07-admin-campaigns-phase-four.md) implementation plans. Those plans remain responsible for backend authority, data invariants, tests, and release gates. The newer Phase 5 operations/governance planning is outside this requested visual scope. Its UI work is planned separately in the [Phase 5 operations UI plan](../plans/2026-10-08-admin-console-phase-five-ui.md), which adds gates UX9–UX12.

The current branch contains functional Phase 1 admin routes and components, including a minimal shell, recipe library, editor, review, publication, and Team. Its existing preview/usage presentation does not yet match this visual design. Phases 2–4 are planned workflows; their presence in this document and the illustrative concept does not mean their screens or backend contracts are implemented or active.

The UI implementation work is split into independently reviewable [Phase 1 recipe and shell](../plans/2026-10-07-admin-console-phase-one-ui.md), [Phase 2 Collections and Publishing Home](../plans/2026-10-07-admin-console-phase-two-ui.md), [Phase 3 Support and Home](../plans/2026-10-07-admin-console-phase-three-ui.md), and [Phase 4 Campaigns and reports](../plans/2026-10-07-admin-console-phase-four-ui.md) plans. Each plan starts from the then-current integrated checkout and adds domain screens only after their protected reads and commands are active. Before any production activation, verify current migrations, membership/MFA, stage flags, fresh source data, and the owner journey under the corresponding phase release gates.
