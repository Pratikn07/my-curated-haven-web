# Homepage vision implementation plan

All tasks start pending. The plan merge is documentation completion only. Task IDs use **HV**, independently of P1–P12. This effort implements a homepage and static feature previews, not Chat, Shop or Bloom functionality.

## Delivery sequence

| Task | Depends on | Owner role | Deliverable |
| --- | --- | --- | --- |
| HV-01 | Current source/deployment | Engineering + product | Baseline and readiness record |
| HV-02 | HV-01 | Product | Scope and presentation-state decision |
| HV-03 | HV-02 | Content + product | Approved content/claims register |
| HV-04 | HV-02/HV-03 | Design | Mobile page structure and wireframes |
| HV-05 | HV-03/HV-04 | Design + content | Synthetic previews and asset manifest |
| HV-06 | HV-02/HV-03 | Engineering | Typed content/state contract |
| HV-07 | HV-04/HV-06 | Engineering + design | Hero and four-pillar overview |
| HV-08 | HV-01/HV-06 | Engineering | Free-recipe integration and fallback |
| HV-09 | HV-02/HV-06 | Engineering + product | Conditional collection handoff |
| HV-10 | HV-05/HV-07 | Engineering + design | Static preview sections |
| HV-11 | HV-03/HV-07/HV-10 | Engineering + content | Story, FAQ and navigation |
| HV-12 | HV-05/HV-06/HV-11 | Engineering | Metadata and social preview |
| HV-13 | HV-07–HV-11 | Engineering + measurement | Consent-safe interaction events |
| HV-14 | HV-07–HV-12 | Design + QA | Mobile, accessibility and performance evidence |
| HV-15 | HV-08–HV-14 | Engineering + QA | State and regression test evidence |
| HV-16 | HV-03/HV-14/HV-15 | Product + research | Comprehension review and corrections |
| HV-17 | HV-15/HV-16 | Release owner | Candidate release and rollback proof |
| HV-18 | HV-17 | Product + operations | Live verification and content handoff |

Assign real names and backups before implementation. No new migration or native release is needed for the planned static previews. Blocked recipe/commerce dependencies select a truthful lower presentation state rather than expanding the work into a backend rebuild.

## HV-01: verify source and deployment baseline

Fetch current main and record the SHA. Compare the public domain, hosting project, deployed artifact, hero copy and navigation. Confirm whether older native-download marketing or the current preparation page is serving. Do not infer live deployment from a Git merge.

Check existing free recipes and the collection destination without charging a card or changing data. Read Phase 6/8/11 evidence and record unresolved dependencies. Classify each fact as source, observed deployment or historical evidence.

Targets: `SCOPE-AND-BASELINE.md`, future `BASELINE.md` evidence record.

Done when the current state and release blockers have owners. Verify HV-R01/R02 and HV-D01. Production problems remain on their existing remediation track.

## HV-02: lock the separate scope and presentation state

Confirm all four pillars appear near the top, recipes stay primary and other areas are sneak peeks only. Choose preparation, free_ready or collection_ready using verified prerequisites. Record the branch for failure conditions and excluded functionality.

Resolve HV-D01/D03/D04/D06/D08. Keep interest collection deferred. Identify required recipe/commerce gates without making Phase 12 a dependency for informational previews.

Targets: scope register and `PAGE-STRUCTURE.md`.

Done when every CTA has a real destination and every future feature has an informational-only contract. Verify HV-C01/C02/C08 and HV-N01/N02.

## HV-03: approve copy and claims

Review the content register from hero through FAQ, purchase boundaries and metadata. Confirm founder facts. Replace blanket unavailable claims with state-specific wording. Keep preview status visible near every feature, not only in a footer disclaimer.

Remove unsupported expert/safety/testing claims, user counts, live-assistant language and expert-booking promises. Do not imply future features are bundled with the recipe collection. Obtain approval on the rendered copy, not isolated text strings only.

Targets: `CONTENT-AND-COPY.md`, proposed `src/config/homepage-content.ts`.

Done when HV-D02/D03/D07/D08 are recorded and each public claim has a basis. Verify HV-C01–C08.

## HV-04: design the mobile information flow

Create wireframes at 390 px and desktop width, then stress-test 320 px. Show the broad hero, four compact pillars, recipe entry and three detailed previews. Keep the first recipe action before a large decorative image on narrow screens.

Include preparation, free-only, collection-ready, recipe-error and image-failure layouts. Map all anchors and define heading order. Use existing tokens, cards, buttons and containers. No new theme or forced carousel.

Targets: protected design-review surface or approved design artifact, `DESIGN-AND-MOBILE.md`.

Done when all states have a readable layout and the preview/available distinction is visible without interaction. Verify HV-U01/U02/U07 and HV-N03.

## HV-05: produce reviewed synthetic assets

Use the native source map for Chat, Shop and Bloom. Capture only synthetic sessions or build clearly labelled concept visuals. Review chat wording, remove prices and retailer promises from Shop, and limit Bloom to milestone/tip content.

Record provenance, rights, captions, alt text, dimensions and file sizes. Inspect crops at mobile display size. Keep status text in adjacent HTML and give standalone reusable images their own preview mark. No production child/chat data enters Git or public assets.

Targets: `public/images/homepage/`, asset manifest and `PREVIEW-ASSETS.md`.

Done when every asset passes rights/privacy/content review and size targets. Verify HV-A01–A08.

## HV-06: create typed content and state contracts

Implement a small typed configuration with fixed feature keys, anchors, copy versions, asset references and discriminated recipe presentation state. Require labels/captions for all previews. Validate collection-ready references before rendering.

Keep the contract independent from payment enforcement. Do not introduce a CMS, table or arbitrary external-link field. Test invalid combinations and missing data with pure fixtures.

Targets: proposed `src/config/homepage-content.ts`, focused contract tests.

Done when malformed states fail safely and approved states render deterministic content. Verify HV-C03/C04, HV-R07 and HV-D03.

## HV-07: build hero and four-pillar overview

Refactor the existing Hero to the approved broader message. Add Recipes, Parenting Chat, Curated Shop and Bloom overview cards with distinct available/planned labels. Keep one strong recipe action and one preview action.

Use normal links and server-rendered text. No preview starts a chat or prompts for child details. Cards point to existing page anchors, with meaningful accessible names. Avoid importing dormant legacy feature components.

Targets: `src/components/Hero.tsx`, proposed `src/components/home/PillarOverview.tsx`, `src/app/page.tsx`.

Done when all four areas are understandable at phone size and recipe access remains obvious. Verify HV-C01/C02, HV-N01–N04 and HV-U01–U04.

## HV-08: connect the public recipe section

Reuse free-slot catalog reads, preserve slot order and display at most the three approved cards. Hide save controls on the homepage. Do not query personal saved state or full recipe bodies. Keep recipe details and print on their existing routes.

Isolate errors so the rest of the homepage survives missing config, failed data or an incomplete catalog. No paid-row fallback or fabricated recipe image. Test withdrawal and destination correctness before free-ready release.

Targets: proposed `HomeRecipes.tsx`, existing `src/lib/data/recipes.ts` and `RecipeCard.tsx` as consumers, not unnecessary rewrites.

Done when real free slots work anonymously and error states remain truthful. Verify HV-R01–R06 and HV-P02/P03.

## HV-09: add the conditional collection summary

For collection-ready only, display the approved public collection summary and canonical collection link. Keep price optional, with no number unless sourced from the approved offer contract. Do not call checkout or construct Stripe URLs.

Preparation/free-only states omit transactional prompts. If commerce prerequisites remain unresolved, mark this task's sale branch blocked while permitting a lower-state homepage release. Record the exact release/offer version for future content maintenance.

Targets: proposed `CollectionSummary.tsx`, content configuration and existing collection destination.

Done when the summary matches the offer and no future entitlement is implied. Verify HV-C05/C06, HV-R07/R08 and HV-N05.

## HV-10: build static Chat, Shop and Bloom previews

Use one reusable preview section structure with image, heading, status, caption and short explanation. Keep all content readable without runtime feature connections. Show meaningful examples of the app's direction rather than generic “coming soon” boxes.

Do not add input fields, fake send buttons, retailer links, child selectors, milestone writes or placeholder forms. Any controls drawn inside an image are noninteractive, with nearby preview context. Confirm no native feature service appears in the bundle/network trace.

Targets: proposed `FeaturePreview.tsx` and homepage composition.

Done when visitors receive a clear sneak peek and no underlying feature runs. Verify HV-A04–A08, HV-N06 and HV-P01/P04.

## HV-11: finish story, FAQ and navigation

Add the approved My Curated Haven/Tiny Soho story. Implement state-aware availability and purchase FAQs. Add `/#whats-ahead` to navigation and confirm cross-page anchor behaviour, mobile menu closure and sticky-header offsets.

Preserve About, Support, legal and consent links. Keep deferred routes blocked and do not add `/chat`, `/shop` or `/bloom` product routes. Existing buyer/account navigation remains intact.

Targets: `Navbar.tsx`, `Footer.tsx`, `site-navigation.ts`, proposed story/FAQ components.

Done when every link is useful and the original public/private route boundary holds. Verify HV-N01–N08 and HV-C07/C08.

## HV-12: align search and social presentation

Update home title, description, canonical, social image and card text to the selected state. Inspect root metadata inheritance and keep recipe/detail metadata specific. Do not add false software availability, ratings or Product schema.

Check generated HTML and shared-link previews on the candidate. Keep static images free of private data and ensure preview labels survive social cropping. Sitemap still contains only valid public routes.

Targets: `src/app/page.tsx`, `layout.tsx`, approved social asset/metadata and sitemap verification.

Done when search/social claims match visible page content and official spelling. Verify HV-C08, HV-A08 and HV-D04/D05.

## HV-13: add bounded optional measurement

Implement only the approved homepage events through the current analytics schema and consent pipeline. Use fixed keys and no raw URLs, chat text, child information or email. Keep navigation independent of event delivery.

Validate no pre-consent events, no replay of pre-consent history after acceptance, revocation behaviour, deduplication and provider failure isolation. Do not add an interest form or waitlist.

Targets: existing `src/lib/analytics/` and a small optional homepage tracker.

Done when events answer the defined questions and analytics failure has no product effect. Verify HV-M01–M08.

## HV-14: verify mobile usability and performance

Review 320/390/768/1280 widths, real phone browser behaviour, keyboard, screen reader, zoom, reduced motion and broken-image states. Check contrast and focus. Inspect actual screenshot text size and labels.

Measure asset sizes, added route JS and the agreed phone/network performance profile against baseline. Reduce assets or scripts if targets fail. Confirm existing recipe routes do not load homepage preview assets unnecessarily.

Targets: design evidence, performance record and manual device matrix.

Done when applicable mobile/performance checks pass with screenshots and measurements. Verify HV-U01–U08 and HV-P01–P08.

## HV-15: update state tests and run regression checks

Replace outdated homepage assertions with explicit broader-brand and presentation-state checks. Keep protected/deferred routes, no private-data leakage, origin, console and navigation checks. Add deterministic recipe failure and preview isolation cases.

Run repository CI unchanged. Execute relevant recipe/account/commerce regression coverage through existing tests. No deletion of meaningful tests to accommodate new copy. Record real-content and manual checks separately from fixtures.

Targets: `public-site.spec.ts`, proposed homepage tests, existing data/analytics/design suites.

Done when automated checks pass and blocked manual cases remain visible. Verify all applicable scenario families and HV-G03/HV-G04.

## HV-16: check visitor comprehension

Run the small adult-user comprehension review with the candidate layout. Ask what is available, what is a preview, what a recipe purchase includes and how to reach a free recipe. Record answers, not only whether users like the design.

Resolve repeated misunderstandings with copy, labels or hierarchy changes. Rerun affected questions after correction. Keep preview interest separate from proof of demand.

Targets: redacted comprehension summary and final content approval.

Done when the proposed comprehension floor passes and no recurring availability/bundle misunderstanding remains. Verify HV-C01/C02/C05 and HV-M07/M08.

## HV-17: prepare and approve the homepage release

Freeze SHA, content version, presentation state, asset manifest and destination checks. Verify current recipe/commerce prerequisites for the chosen state. Confirm hosting project, domain and safe rollback artifact. A preparation release must not accidentally inherit collection-ready copy.

Review the actual preview deployment on mobile. Obtain the normal release approval for public presentation changes after the concrete candidate is ready. This planning task does not publish the homepage.

Targets: future release record and existing deployment workflow.

Done when HV-G01–HV-G05 pass for one candidate, with named release and content owners. Verify HV-D01–D07.

## HV-18: verify the domain and hand off maintenance

After the authorised implementation deployment, verify the official domain shows the intended hero, previews, recipe state and metadata. Exercise every homepage CTA without making a live test purchase. Check cache freshness and error monitoring.

Record baseline post-release metrics, a seven-day clarity review and a 14-day learning review where data exists. Assign maintenance for recipe availability, offer changes, preview wording and asset replacement. No automatic feature rollout follows from preview attention.

Targets: live smoke record, outcome review and handoff.

Done when the domain matches the release, operators know rollback/withdrawal steps and all unresolved work has an owner. Verify HV-D08 and HV-M08.
