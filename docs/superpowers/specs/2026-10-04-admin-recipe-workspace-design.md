# Admin recipe workspace: Phase 1 design

- Date: 2026-10-04, America/Los_Angeles.
- Status: written design for owner review. The conversational workflow is approved; this document is not yet approved for implementation.
- Source baseline: main at e0cc25b816efa30665080741b03fbdc3e61019fe.
- Delivery state: design only; no application, database, provider or production changes.

## 1. Agreed brief and success

The first operator is the owner. The system must support additional named admins from its first release, with permissions narrower than the owner's where appropriate.

The approved first workflow is:

**Recipe library → recipe inspection → draft revision → review → publication.**

The owner can find an existing recipe, understand its publication and review states, identify the next action, prepare a revision, preview and review it, and publish an eligible revision or deliberately withdraw the recipe. Editing a published recipe must preserve the published version until its replacement is approved and published.

The workspace also explains collection membership, public-sample access and campaign references. These references support decisions; Phase 1 does not edit collection releases, campaign promises, free slots, prices or customer entitlements.

Success means the owner can complete the workflow without using SQL or modifying source files, and another authorised admin can complete only the actions their assigned role permits. A clear status message explains blocked, failed, conflicting and completed operations.

The next broader phases are collection/release operations; customer, purchase and access operations before paid-sales expansion; campaign operations/reporting; and adopted growth capabilities.

### Design acceptance ledger

These gates assess the written artifact. They do not claim implementation or runtime verification.

| Gate | Observable design outcome | Evidence location |
| --- | --- | --- |
| D1 | The approved owner-first workflow and later-admin capability are represented without changing commercial promises | Sections 1, 2 and 7 |
| D2 | Library, detail, editor and team screens define their actions and meaningful non-success states | Sections 3–6 and 10 |
| D3 | Named-account assignment, distinct permissions, revocation and owner protection have explicit contracts | Sections 7 and 8 |
| D4 | Draft editing, exact-revision review, concurrency and publication preserve the active recipe | Sections 4, 5 and 9 |
| D5 | The design accounts for current recipe access, private drafts, legacy reviews, campaign configuration and analytics | Sections 8, 9 and 12 |
| D6 | Deliverable increments, release gates and meaningful verification cover the whole Phase 1 scope | Sections 11 and 13 |

## 2. Scope and delivery boundary

### Phase 1 includes

- A protected admin area that opens on the recipe library.
- Library search, filters, pagination and readiness summaries.
- Inspection of every existing catalog entry, including drafts and withdrawn recipes.
- Active-content and working-revision previews, readiness, usage and history.
- Structured editing of an existing recipe's catalog and body fields.
- Selection and preview of an existing approved image, plus image description and alternative-text editing.
- Private working revisions, comparison, explicit saves and optimistic concurrency.
- Submission for review, human review decisions, issue resolution, eligible publication and withdrawal.
- Owner assignment/revocation of predefined staff roles on existing confirmed accounts.
- Audit records, privacy boundaries and accessible responsive interactions.
- Read-only collection/campaign impact information with source freshness and availability.

### Later phases own

- Creating/importing new recipes, bulk publication and hard deletion.
- Image upload, generation, a general asset manager and automated orphan cleanup.
- Collection assembly, release editing, public-sample assignment and growing-library entitlement changes.
- Campaign authoring, social publishing, DM automation and email campaign sending.
- Customer support records, customer-account inspection, financial actions and entitlement recovery.
- Revenue dashboards, optional analytics configuration and subscription administration.

The first console has Recipes and, for the owner, Team. Future sections appear when they have a working, authorised workflow; Phase 1 does not present empty navigation destinations or invented sales metrics.

## 3. Entry, navigation and library

### Entry and routes

| Destination | Contract |
| --- | --- |
| /admin | Authenticate, check active console membership, then redirect to /admin/recipes |
| /admin/recipes | Library with query/filter/page state retained in the address |
| /admin/recipes/[recipeId] | Inspection workspace for a stable recipe UUID |
| /admin/recipes/[recipeId]/edit | Working-revision editor with its own permission check |
| /admin/team | Owner-only assignment and revocation of staff roles |

The console uses the existing sign-in system. A signed-out visitor is sent to sign-in with a validated return destination. A signed-in non-member receives a clear access-denied screen with a link back to the ordinary website. A database or role-check failure is an unavailable state, not a decision to grant access or a misleading sign-in loop.

Admin pages are dynamic, private and excluded from search indexing and sitemaps. Server responses and private previews must not enter a shared cache. A noindex tag is supplementary metadata, not authorisation.

A compact header identifies the admin workspace, the signed-in operator and role, and offers a link to the public website and sign-out. Returning from a recipe restores library filters, page and selected-row position.

### Default library

All recipes is the default view. The list is ordered by latest relevant content/workflow change descending, with UUID as a stable tie-breaker. Other views keep the same deterministic order. The default page size is 25.

Each desktop row contains an image thumbnail, title, publication state, review state, collection references, last change and an Open action. The title is the primary link. Missing images have an explicit placeholder and issue label. Row actions do not obscure the publication/review distinction.

Search matches title and slug case-insensitively; a complete UUID matches the identifier. Filters cover collection, publication state and review state. Filters combine with AND; multiple values within one category combine with OR. Reset filters is visible when filters are active.

Search and filter state is scoped to admin navigation and never sent to behavioural analytics.

### View definitions

Every view uses one server-side readiness evaluator. Counts and rows use the same evaluator and consistent read snapshot. Summary counts show the complete catalog, before the current search and filters; the filtered result count is labelled separately. Views may overlap and their counts are not additive.

The target is the latest working revision when one exists; otherwise it is the active stored content. Publication labels always describe the active catalog state, not the working revision's future intent.

| View | Definition |
| --- | --- |
| All recipes | Every existing catalog entry available to the authorised operator |
| Needs attention | At least one confirmed validation/review issue, a rejected/changes-requested target, or a required review that has not been completed |
| Awaiting review | The latest target snapshot was submitted and has no decision matching its current digest |
| Ready to publish | A working revision exists and satisfies all conditions in Section 5 |
| Published | Active catalog publication state is published, including entries with pending working revisions |
| Withdrawn | Active catalog publication state is withdrawn |

Awaiting review and Needs attention can overlap. Unknown dependency checks are labelled Needs verification separately; they cannot silently qualify a revision as ready.

Legacy approval is displayed with its provenance and scope. It is not automatically an approval of a new catalog/body/image snapshot. A published legacy recipe can remain published while its proposed replacement awaits review.

### Non-success states

Loading preserves the surrounding navigation and filter state. No catalog entries, no filter matches and unavailable catalog data have distinct messages. No matches offers Reset filters. Failure offers Retry and a non-sensitive support reference. A failed source query never appears as an empty successful library.

## 4. Recipe inspection workspace

The header identifies the title, UUID, slug, active publication state, active content version, working-revision status and last recorded change. The primary action is selected from the operator's permissions and the target's next required step.

Four sections remain within one connected workspace:

| Section | Content and interaction |
| --- | --- |
| Preview | Read the active recipe or switch to the labelled working revision. Compare catalog, body and image differences |
| Readiness | Review provenance, current target/digest, unresolved issues, failed checks, unknown checks and next required action |
| Usage and access | Public-sample assignment, collection/release membership, sealed-release status and campaign references |
| History | Content snapshots, review decisions, saves, publication/withdrawal actions and actor/time/reason references |

Preview reuses the canonical recipe rendering primitives for ingredients, instructions and related fields, with a clearly labelled admin context. Preview never bypasses authorisation through a public draft URL. Save-to-personal-library, customer purchase and behavioural-tracking controls are omitted from the admin preview.

Usage explains public samples and collection membership. It does not assert a specific customer's access; that requires the later customer/access workflow.

Collection references include collection title, release version/state and whether an active offer or historical purchase references the release. Campaign references are read from the deployed configuration and include campaign slug, publication state, promised selection and recipe membership. Their source is labelled Deployed campaign configuration with the deployment revision.

An unavailable lookup displays Usage check unavailable with its last successful check if known. Publication/withdrawal requires a fresh successful impact check; it cannot treat unavailable usage as no dependencies.

Commercial exposure means a live offer with sales enabled, an outstanding live checkout/payment attempt, or a verified historical payment. Test-mode activity is labelled separately and does not represent a customer purchase. Sealed-release references remain protected regardless of whether they currently have commercial exposure.

Examples of user-facing next-action copy:

- “This revision has two issues to resolve before it can be submitted.”
- “This revision is awaiting review. The published recipe is unchanged.”
- “This revision is approved and ready to publish.”
- “The recipe changed since you opened it. Reload and compare before saving.”

These are synthetic examples, not findings about production recipes.

## 5. Editing, review and publication

### Working-revision editor

Editing creates or resumes the one active working revision for an existing recipe. The initial candidate is a full snapshot of its active catalog/body/image metadata. An incomplete legacy entry is shown as incomplete and can be completed in the private working revision.

Fields cover:

- Title, public summary, total minutes, meal labels and verified dietary labels.
- Ordered ingredients with existing amount/unit/item structure.
- Ordered instruction steps, yield and supported structured-yield data.
- Allergen declaration/review state, reviewed notes and storage notes.
- Existing approved image selection, image description and alternative text.

The slug and UUID are read-only in Phase 1 so existing links keep their identity. Publication state, free-slot assignment, collection membership and purchase rights are separate operations and cannot be changed through editor payloads.

Existing structured data must round-trip without silently dropping fields the editor does not expose. Unsupported values receive an explicit inspection message; structured-yield editing exposes only values with an understood contract.

Save draft is explicit; there is no silent autosave in Phase 1. An incomplete candidate can be saved with visible field issues, but cannot be submitted or published. Save shows Saving, Saved at [time], Failed or Conflict. The editor keeps typed changes in memory after a failure or conflict and offers a comparison with the current stored revision.

Unsaved changes prompt before navigation. They are not copied into localStorage, analytics, URLs, generic logs or shared exports. A no-change save creates no new revision or review invalidation.

Every meaningful saved change appends an immutable revision snapshot, advances the working version and resets review eligibility for the changed digest. Editing a submitted/approved revision requires an explicit acknowledgement that its review no longer applies. Earlier decisions remain in history.

Rebase is an explicit comparison with the new active base: the operator chooses which candidate edits to retain, then saves a new snapshot with review reset. It never silently merges or overwrites conflicting fields.

### Validation and issues

The same validation service supplies the editor, library/readiness views, submission and publication checks. It validates field types, required non-empty content, array/order integrity, supported tags, positive time where supplied, allergen-state consistency and authorised asset references.

Ingredients and steps must be meaningful structured entries; empty lists cannot pass submission. Unknown allergen review state cannot pass publication. Age/safety or nutrition issues recorded by a reviewer remain open until deliberately resolved. The console does not infer medical/nutritional approval from tags or model output.

An issue has a stable code, field/scope, severity, explanation, origin and resolution record. Cosmetic suggestions are distinguished from publication blockers. Unknown source checks are not false failures, but any unknown check required for publication prevents readiness.

### Review

Submit for review freezes the candidate snapshot and digest being reviewed. Reviewers can approve, request changes or reject, with a reason and recorded issue decisions. There is no paid AI-review service in Phase 1.

Only an explicit approve decision for the exact candidate digest, with zero unresolved blockers, clears the new workflow's review requirement. Approve-with-changes legacy records are shown as legacy evidence; the console must not silently translate them into fresh approval.

The owner may edit, review and publish their own revision because the first operating model has one person. The audit makes that visible. Staff role separation is available, but a mandatory second reviewer is not introduced as an impossible launch dependency.

Approval records the decision-maker, time, candidate version/digest and resolved issue references. Editing afterward invalidates eligibility without deleting the decision. A previous AI or human review is never relabelled as a new human review.

### Publication eligibility

A revision can be published only when all of these are true:

1. The caller has current recipe.publish authority and the required authenticated assurance.
2. The candidate equals the latest stored working snapshot and expected version.
3. Field, asset and applicable review checks pass with zero unresolved blockers.
4. An approve decision matches the complete candidate digest.
5. The active recipe still matches the base version/hash from which the candidate was prepared.
6. A fresh usage/impact check succeeds.
7. The proposed change does not silently alter a sealed/historically purchased release's promised content.

Corrections to recipes referenced by sealed releases, active commercial offers or historical purchases are blocked from ordinary Phase 1 publication until the collection correction/version policy is explicitly supported in Phase 2. The revision can still be prepared, inspected and reviewed. This is a scope boundary, not a claim that such purchases exist today.

The confirmation identifies the exact revision and changed fields, current public state, free-sample assignment and affected campaign/collection references. It asks for an operational reason. It does not offer an implicit option to change free access, paid membership or commercial terms.

The publication transaction archives the previous full active snapshot, applies the reviewed catalog/body/image metadata, advances content_version, records compatible legacy review provenance plus the new review linkage, records the publication audit and marks the working revision published. All database changes commit together or none do.

A new publish operation from draft sets published_at. A published replacement preserves the original published_at and records its revision publication time separately. A withdrawn recipe that is deliberately republished receives a recorded new publication event; its previous events remain in history.

After commit, the app revalidates affected recipe/list/campaign displays. Revalidation failure is shown as “Saved; display refresh pending,” not “Not saved.” Retry refresh must not publish again or create another version.

### Withdrawal

Ordinary withdrawal requires recipe.withdraw authority, a fresh impact check and a reason. It preserves content/review/purchase history and never deletes the recipe.

A referenced public sample or published campaign requires the owner to acknowledge the identified broken promise/access impact. A sealed, active-offer or historically purchased reference requires an owner-only Emergency withdrawal action, with the affected references and reason recorded. The UI explicitly states that withdrawal can prevent customer reads under current access rules. It does not refund, revoke payment rights, alter memberships, send messages or remove campaign links.

Republishing requires a current reviewed candidate and the ordinary publication gate. The History section can use an old snapshot as the basis of a new working revision; it does not offer an unaudited immediate restore.

## 6. Responsive and accessible interaction

Reuse the site's existing type, colour, spacing, form and focus tokens. The console is a functional workspace within My Curated Haven, with restrained status styling and readable content.

At desktop widths the library is a table and the detail workspace gives preview/readiness useful adjacent space. Below 768 CSS pixels the library uses labelled rows/cards and detail content stacks; all actions remain available without requiring the whole page to scroll horizontally. Verify at 320 and 375 CSS pixels and at desktop widths.

Every status has text, not colour alone. Controls have descriptive accessible names. Ingredients and steps can move using keyboard-accessible Move up/Move down actions. Inline errors link to the relevant field; a submission error summary receives focus. Status updates use a polite live region.

Confirmations retain and restore focus, expose their impact and reason fields to assistive technology, and work without pointer input. Cancel leaves the stored recipe unchanged. Form state does not disappear on a transient server failure.

## 7. Owner and additional admins

Console membership is separate from the existing recipe-inspection role. An existing public.user_roles admin entry must not automatically confer owner, editing, publication or staff-management authority.

| Permission | Owner | Viewer | Editor | Reviewer | Publisher |
| --- | --- | --- | --- | --- | --- |
| recipe.read | Yes | Yes | Yes | Yes | Yes |
| recipe.edit / submit | Yes | — | Yes | — | — |
| recipe.review | Yes | — | — | Yes | — |
| recipe.publish / ordinary withdraw | Yes | — | — | — | Yes |
| recipe.emergency_withdraw | Yes | — | — | — | — |
| team.manage | Yes | — | — | — | — |

An operator can receive several staff roles. Each role is predefined; there is no custom-role builder in Phase 1. The owner initially holds all permissions.

Bootstrap the confirmed owner account through a restricted operator action, recorded separately. Do not seed a production email/UUID into public migrations or trust editable profile metadata. Owner transfer/bootstrap is outside the web team-management flow.

The owner adds a staff member by exact email lookup of an existing confirmed account. The server returns the minimum identity needed for confirmation and performs no broad customer search. The owner selects roles, confirms and records a reason. If the account does not exist or is unconfirmed, explain that the person must finish the existing sign-in/account-confirmation flow first. If several identities match, refuse automatic assignment and require identity resolution through the restricted operator workflow. Phase 1 sends no invitation email.

The Team list shows current role assignments, active/revoked status, grant/revoke actor and time. Only the owner can change assignments; staff cannot promote themselves. The web flow cannot remove or downgrade the owner.

Revocation is checked on every read/action and takes effect immediately for the console; a stale JWT does not retain permissions. A failed save after revocation retains a clear access-denied state and performs no mutation. Staff permissions do not expose customer, child, financial or provider-administration data.

## 8. Architecture, trust and privacy

Use the existing Next.js application and Supabase Auth session, with an /admin layout, request-scoped server data layer and small client components for forms/filters. Keep the console behind an environment-specific feature flag until its increment's release gates pass.

Enforce second-factor assurance for console reads and writes using Supabase's authenticator enrollment/challenge flow. An authorised member without an enrolled factor sees the enrollment step; an enrolled member with insufficient assurance sees the challenge step. Neither receives private console data before verification. The existing recipe-inspection experience remains available under its current authentication contract; the console's stronger requirement must not inadvertently break ordinary customer sign-in.

Use trusted, current database membership checks. User identity comes from verified authentication, never a posted actor ID/email or self-edited metadata. Each operation validates both action permission and target recipe/revision.

Keep draft content, review issues, membership control data and audit data private. Use narrowly scoped authenticated database functions for private reads and atomic writes; each function independently verifies auth identity, current permission and required assurance. Fix function search paths, explicitly qualify objects and restrict grants. Direct calls must enforce the same contract as the server UI.

Do not route the console through a browser service-role client or expose the private schema. DTOs return only the fields a screen requires. Preserve the existing legacy recipe-inspection grant, and add staff recipe-read eligibility through a protected permission predicate rather than converting every staff role into an owner.

Admin routes have private/no-store responses and no cross-user cache sharing. Private preview links require the current operator session and expire with its authority.

Suppress optional analytics, SDK page capture, autocapture, identify calls and session replay for the admin workspace, including navigation into it from an already instrumented public page. Extend the current private-path handling and recording wrapper before enabling /admin. Prefix handling must match /admin and descendants, not unrelated paths.

Operational audit remains active independently of optional tracking consent. Record actor, action, target, revision/digest, before/after references, request ID, time, reason and result. Protect audit access and append-only history. Generic error logs contain safe codes/references, not recipe bodies, credentials, raw auth/provider payloads or child/customer details.

Adding staff permissions has no effect on purchases, customer accounts, native sign-in sessions or recipe free slots.

## 9. Data and consistency contracts

Extend the existing private.recipe_drafts rather than create a competing draft authority. Replace its unconstrained proposed_content/reviewer_status semantics with a validated full snapshot and explicit working-revision lifecycle.

The authoritative working head identifies recipe, base active content_version plus full active hash, working version, current candidate digest, lifecycle state and actor/timestamps. One open working head exists per recipe. Editing after publication begins a new head.

Add append-only recipe revision snapshots, review decisions, structured issues, publication/audit records and protected admin memberships. The concrete table/column migration belongs in the implementation plan; the invariants below are fixed by this design.

- The candidate includes catalog metadata, body fields, selected image reference and image description/alternative text.
- A deterministically canonicalised full-snapshot digest binds all publishable fields to review; title/image changes cannot bypass review because only body content_version was considered.
- No-change saves produce no new version. Meaningful saves append a snapshot and advance the working head.
- Version/hash predicates reject stale saves, decisions, publication and withdrawal without partial writes.
- A stable operation ID makes ambiguous retries return the committed outcome without duplicating versions or audit events.
- Legacy private.recipe_reviews stays visible with its original actor/kind/verdict/content_version. New records link to exact revision/digest; the existing publication gate remains an additional defence.
- A new admin approval does not falsely change the public allergen declaration. The approved snapshot's declaration must itself be consistent and explicit.
- The current public recipe_catalog and recipe_bodies remain the projection consumed by existing readers. Working content stays private until committed publication.
- Historical revisions and published image objects are retained for comparison/corrections; Phase 1 performs no destructive cleanup.
- The asset selector starts from image objects already referenced by the recipe catalog. It does not imply that every existing image is approved. Approval/provenance is shown when recorded; otherwise the target has an image-review issue requiring an explicit reviewer decision. A candidate's image reference, depiction suitability, description and alternative text form part of its exact review.
- Image selection is restricted to a validated existing recipe-image bucket object. Arbitrary external URLs, unavailable objects and unknown required asset checks do not qualify for publication.
- Image descriptions and alternative text require explicit persisted metadata and matching reader integration; they must not exist only in the editor.

Read counts/list/detail queries expose current source/revision and refresh time. Batch related reads for the page; do not fetch the entire history or every full recipe body to render the library.

Checkpoints use existing data-layer failure conventions. A role, review, usage or asset failure is a typed unavailable result and cannot become a successful empty result.

## 10. Failure and recovery states

| Condition | Required behaviour |
| --- | --- |
| No console membership | Access denied; safe return link; no recipe/admin payload |
| Missing second factor | Explain the verification step and retain the validated return destination |
| Missing role/readiness/usage source | Show unavailable/unknown; retain read-only data where independently verified |
| Invalid edit | Preserve fields; label affected fields; save as incomplete draft if types are safely representable |
| Conflicting save or active-content change | Reject overwrite; show stored version versus unsaved candidate; offer compare/rebase into a new saved snapshot |
| Edit after review | Explicitly reopen the working revision; preserve history; require a matching new decision |
| Asset unavailable/unknown | Identify the asset issue; retain the existing active recipe; block candidate publication |
| Review/publication permission revoked | Deny action at server/database; no stale-session write |
| Publish transaction fails | Entire projection/history change rolls back; draft remains available |
| Publish committed but response lost | Retry with the same operation ID retrieves the committed result |
| Publish committed but refresh fails | Display saved/refresh-pending; retry refresh only |
| Unsafe content needs urgent containment | Owner-only reasoned emergency withdrawal with recorded impact; independent customer communication remains manual |

## 11. Deliverable increments

| Increment | Deliverable | Release condition |
| --- | --- | --- |
| A: trusted inspection | Console membership/MFA, Team management, library/detail, legacy review provenance, usage and audit foundations | Permission, privacy, source-failure and read-path checks pass |
| B: working revisions | Private draft heads/snapshots, structured editor, approved-image preview, comparison and concurrency | Published content remains byte-for-byte stable while editing; safe save/retry/conflict checks pass |
| C: reviewed publication | Review issues/decisions, strict readiness, publish/withdrawal and refresh recovery | Exact-digest/concurrency/impact checks and existing public/customer access regression checks pass |

The increments may be delivered separately behind the console flag. An inspection release must be labelled inspection-only and omit unimplemented write controls. Phase 1 is complete only when A, B and C meet their gates.

Collection editor work follows Phase 1. It must resolve growing-release access and commercial correction rules before allowing edits to sold/sealed promises. This design's read-only references must reuse that later domain service instead of duplicating membership truth.

## 12. Source-confirmed baseline

The following are source findings at the baseline SHA, not fresh production counts:

| Existing source | Implication for this design |
| --- | --- |
| public.user_roles and is_recipe_admin() from PR #85 | Recipe inspection exists; content writes and console ownership need separate authority |
| private.recipe_drafts in Phase 4 | A private draft landing table exists, but lacks the complete revision/digest/concurrency contract |
| public.recipe_catalog and recipe_bodies | Active metadata/body projection is mutable and stores publication_state and content_version |
| private.recipe_reviews and private.recipe_is_reviewed() | Versioned legacy review provenance exists; the predicate also accepts a non-unknown allergen state and does not bind the complete catalog/image snapshot |
| Phase 5 publish/free-slot/membership triggers | Existing gating must remain; it does not alone prove safe replacement of an already published recipe |
| sealed collection membership guard | Phase 1 must preserve sealed memberships and show referenced-content impact |
| deployed campaign configuration | Campaign references can be inspected from the application revision; there is no campaign editor in this phase |
| analytics private-path list and NoRecording wrapper | Existing protections cover selected customer routes; /admin needs explicit capture suppression |

Repository references:

- [Recipe admin contract](../../../ops/RECIPE-ADMIN-ACCESS.md)
- [Phase 4 schema](../../../supabase/migrations/20260923042735_phase4_schema.sql)
- [Publication gate](../../../supabase/migrations/20260926052702_phase5_audit_publish_requires_review.sql)
- [Versioned recipe review](../../../supabase/migrations/20260926181747_phase5_recipe_review_log.sql)
- [Recipe data types/readers](../../../my-curated-haven-web/src/lib/data/recipes.ts)
- [Authenticated server client](../../../my-curated-haven-web/src/lib/supabase/server.ts)
- [Campaign configuration](../../../my-curated-haven-web/src/config/campaigns.ts)
- [Private analytics paths](../../../my-curated-haven-web/src/lib/analytics/private-paths.ts)
- [Recording wrapper](../../../my-curated-haven-web/src/components/analytics/NoRecording.tsx)

The workspace where the conversation began contains unrelated owner edits and a separate untracked collection plan. They are preserved; this document is prepared in its own worktree from the verified main revision.

## 13. Implementation verification and release gates

All implementation checks below are **not run**. They are requirements for the later implementation plan and release, not evidence that this design is deployed.

| Gate | Evidence required |
| --- | --- |
| R1: authority | Database/server tests deny anonymous users, ordinary customers, forged metadata/actor IDs and each insufficient staff role; require assurance; preserve legacy inspection |
| R2: staff lifecycle | Owner can assign/revoke existing confirmed staff accounts; exact lookup cannot enumerate users; staff cannot self-promote; owner cannot be removed; revocation defeats stale sessions |
| R3: library truth | Fixture-backed counts/filters/pagination agree with independent expected records, including overlapping views, missing bodies and source failures |
| R4: private edits | Tests save/reopen a candidate and prove active public catalog/body/image/access remain unchanged; no private draft endpoint/cache leakage |
| R5: concurrency/retry | Two editors and an out-of-band active change cannot overwrite each other; lost responses and repeat operation IDs produce one transition |
| R6: review binding | Metadata/body/image changes invalidate approval; reject/changes-requested/stale/unknown reviews cannot publish; provenance remains accurate |
| R7: atomic publication | Fault injection leaves the old projection/history intact on failure; success applies the exact reviewed snapshot; refresh retry never republishes |
| R8: commercial/promise boundaries | Membership/free-slot/price/entitlement writes are rejected from the editor; sold/sealed corrections are blocked; owner emergency withdrawal records impact without financial side effects |
| R9: privacy | Browser/network checks from direct entry and public-page navigation show no admin page/content/search/identity data sent to optional capture or replay |
| R10: workflow/accessibility | Browser tests cover library → inspection → edit → review → publish, keyboard operation, error/focus recovery, and narrow widths; owner manually reviews the final screens |
| R11: existing readers | Anonymous samples, entitled and non-entitled reads, saving/printing, canonical links, campaign promises and admin inspection retain the approved access behaviour |
| R12: release/recovery | Repository-required lint/type/unit/database/browser checks pass; migrations are rehearsed with synthetic data; owner bootstrap, deployed SHA/flag and a signed-in console journey are verified after release |

Take the existing production backup before authorised production migrations. Schema/revision migrations must preserve all existing active content and review provenance and introduce no production identities or private recipe exports into git.

A console flag rollback stops new console operations while retaining current recipes, customer access and stored revision/audit history. Published corrections use a new reviewed revision; emergency withdrawal is a separate recorded containment action. Do not drop new history tables to roll back the UI.

## 14. Written-review checkpoint

Author review completed: D1–D6 are covered by the written artifact. All nine repository references resolve. The draft contains no unresolved implementation-decision markers, and source-confirmed findings are distinguished from proposed behaviour. The implementation gates R1–R12 remain not run; owner review of this written design remains pending.

The owner approved the conversational workflow and authorised preparation of this design. Review this written artifact before producing its implementation plan. That review can amend scope, screens, permissions or invariants.

The next artifact after written-design approval is a Phase 1 implementation plan with concrete migrations, service/component responsibilities, ordered tasks and runnable acceptance gates. Design approval alone does not claim code, a passing build, deployment or production verification.
