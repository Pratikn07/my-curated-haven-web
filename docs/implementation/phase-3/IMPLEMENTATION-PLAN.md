# Phase 3 detailed implementation plan

## Goal and delivery boundary

Create the mobile design foundation for the recipe-first My Curated Haven web product. Preserve brand identity, improve readability and build reusable components for future product work.

This phase implements current public presentation plus isolated recipe prototypes. Public recipes, backend queries, saved recipes, purchased access and checkout remain later-phase work.

All source paths below are relative to the nested my-curated-haven-web/ application unless prefixed with docs/.

## P3-01: capture the visual and component baseline

Owner: engineering/design. Dependencies: Phase 1 inventory.

1. Read current repository instructions and fetch main.
2. Record source SHA and the deployed version separately.
3. Inspect globals.css, root layout, navigation, footer, shared UI and current public page composition.
4. Capture representative pages at 320, 390, 768 and 1280px widths.
5. Record fonts, computed colours, spacing, image dimensions, client components and animation behaviour.
6. Test keyboard navigation and reduced-motion settings on the baseline.
7. Record existing overflow without relying on body overflow-x:hidden.
8. Identify all consumers of Card, Section and Badge before changing their API.
9. Keep legacy/deferred page source recoverable and keep both submodule entries unchanged.

Deliverable: source-to-design inventory, screenshots and a list of concrete defects.

Acceptance: current behaviour and source findings are clearly separated. No style change is justified solely by preference without an identified user or consistency benefit.

## P3-02: create a reviewable design reference

Owner: design/product and engineering. Dependencies: P3-01.

1. Apply the proposed tokens to a compact local component reference.
2. Show the wordmark, heading/body hierarchy, primary/secondary actions, field errors, badges and recipe-card examples.
3. Show one narrow phone layout and one desktop layout.
4. Include the exact brand spelling and Tiny Soho relationship.
5. Use synthetic recipe titles and clearly marked sample data. Do not invent product prices or dietary guarantees.
6. Present the reference for product review as part of the implementation PR. Continue independent foundation work while visual questions are resolved.
7. Record chosen font families, action colour, card shape and image treatment.

Use a local-only harness or an isolated protected review build. Do not add an open /design-system route to production. No Storybook or new design platform is required by default.

Deliverable: concrete screenshots or a protected interactive reference, not only a palette list.

Acceptance: approved direction or specific unresolved design choices are recorded. This document itself is not a claim of visual approval.

## P3-03: implement semantic tokens and font mappings

Owner: engineering. Dependencies: P3-02 reference.

1. Introduce the token roles in DESIGN-TOKENS.md.
2. Separate decorative terracotta/sage from functional action colours.
3. Fix font-source and semantic-alias mappings to avoid missing or circular CSS variables.
4. Use the selected font families only. Remove unused font loading after consumer review.
5. Map the tokens into Tailwind 4 and keep compatibility aliases while consumers migrate.
6. Replace essential text gradients and low-opacity body copy in the touched components.
7. Define spacing, radius, focus, elevation and motion roles centrally.
8. Keep the initial theme light. Do not add a dark-mode toggle without a complete second theme.
9. Verify computed styles and font fallback under failed font loading.

Deliverable: token stylesheet and working font configuration.

Acceptance: actual rendered buttons, links, body copy and fields meet the contrast and readability checks. Brand accent colours remain available for decoration.

## P3-04: refactor the core UI primitives

Owner: engineering. Dependencies: P3-03.

Implement the contracts in COMPONENT-SPECIFICATION.md.

1. Create distinct Button and ButtonLink primitives with shared visual variants.
2. Make Card and Section static/server-compatible by default. Isolate optional interactive behaviour.
3. Define Badge for noninteractive status. Use real checkbox/button semantics for selectable chips.
4. Add labelled field wrappers with help and error messages.
5. Add loading, empty, error and unavailable patterns for prototypes and later reuse.
6. Preserve compatibility with legacy Card and Section consumers. Migrate or adapt props rather than silently dropping behaviour.
7. Keep core content visible without animation.
8. Use HTML-native elements before adding another component library.
9. Add a dialog/sheet only for a real prototype interaction, following the specified keyboard contract.

Deliverable: reusable primitives with normal, focus, disabled, busy and error examples where relevant.

Acceptance: controls use correct semantics and states. Plain cards and sections do not require a client boundary solely for animation.

## P3-05: implement the responsive public shell

Owner: engineering. Dependencies: Phase 1 public-route contract, P3-04.

1. Reuse Phase 1's shared navigation configuration. Do not maintain a second route list.
2. Make a content-width container and consistent header/footer layout.
3. Keep the full My Curated Haven wordmark readable at 320px.
4. Use a simple disclosure menu for the initial small navigation. Do not mark ordinary site links as an ARIA menu.
5. Keep one main landmark and one primary heading per page. Change the brand heading into a link with non-heading content.
6. Remove nested interactive elements from calls to action.
7. Add a skip link, visible focus and anchor offsets where the sticky header covers content.
8. Review each existing route's ownership of Navbar/Footer before introducing a shell component. Avoid duplicate headers or nested main elements.
9. Keep current public destinations only. Recipe/account tabs wait until their routes work.
10. Use mobile layouts as the default and enhance at wider widths.

Deliverable: working shell on Home, About, Support, Privacy and Terms.

Acceptance: navigation remains consistent, readable and operable on narrow screens and keyboard. Deferred routes stay governed by Phase 1.

## P3-06: apply the system to existing public pages

Owner: engineering/content. Dependencies: P3-05 and Phase 1 content decisions.

1. Apply readable widths, typography and spacing to Home, About, Support and legal content.
2. Maintain the truthful transition state until recipes and checkout exist.
3. Remove AI/milestone decorative overlays from the recipe-acquisition surface as specified in Phase 1.
4. Preserve required native-user support guidance and public legal URLs.
5. Use actual text rather than images containing essential headings.
6. Keep support actions honest about email versus submitted tickets.
7. Correct overflow at the component causing the defect.
8. Retain original source through Git and the Phase 1 preservation map.

Deliverable: coherent public pages using the same design system.

Acceptance: no page adds unverified claims, unbuilt feature links or a fabricated paid offer during the redesign.

## P3-07: specify and prototype recipe layouts

Owner: design and engineering. Dependencies: P3-04, product scope.

Build isolated examples for the patterns in LAYOUT-SPECIFICATION.md:

- Recipe listing with three clearly identified free examples.
- Recipe detail with long ingredient names and numbered instructions.
- Filters with applied and draft selections.
- Empty, loading and failed-result states.
- Public paid-collection preview and a purchased-layout example using sample data.
- Printable recipe layout.

1. Keep example data outside the public delivery path.
2. Mark every preview and sample commercial field as a fixture.
3. Do not introduce public routes, Supabase queries or a fake checkout.
4. Define the minimum display props and null handling for each pattern.
5. Treat total time as known only when source data supplies the relevant timing.
6. Keep allergen information unknown when absent. Do not translate missing data into “allergen free.”
7. Separate server-authorized content from public previews in the future component contract.
8. Record behaviour decisions for Phase 5 content, Phase 6 recipes, Phase 7 accounts and Phase 8 payment work.

Deliverable: responsive examples and implementation contracts for later phases.

Acceptance: prototypes demonstrate interactions without claiming working purchase or persistence. Paid content protection is explicitly a later server responsibility, not CSS hiding.

## P3-08: optimize imagery, motion and print foundations

Owner: engineering/design. Dependencies: P3-06 and P3-07.

1. Inventory existing large images and measure the resized outputs needed by layouts.
2. Use appropriately sized images, explicit dimensions or aspect ratios, and accurate responsive sizes.
3. Reserve loading priority for the measured above-the-fold candidate. Lazy-load below-the-fold images.
4. Use real food imagery for recipe examples where approved assets exist. Identify illustrations as such.
5. Avoid heavy gradients, multiple blurred layers and continuous decorative animation.
6. Honour reduced motion and preserve stable layout during image/font loading.
7. Prepare print styles for the isolated recipe example. Hide shell/actions and retain readable recipe content.
8. Test Letter and A4 output, long steps and page breaks.
9. Do not build a PDF generation service in this phase.

Deliverable: image and motion conventions plus a working print-style prototype.

Acceptance: content stays readable without background printing, motion or loaded images. Performance evidence identifies regressions against the baseline.

## P3-09: verify accessibility and responsive behaviour

Owner: engineering with product/design review. Dependencies: P3-03 through P3-08 and Phase 2 runner.

1. Run the acceptance matrix in VALIDATION.md.
2. Add focused browser checks for shell behaviour, component states and narrow-width overflow.
3. Run an automated accessibility scan on the changed public surfaces and interactive examples.
4. Test keyboard, focus return, screen-reader announcements and reduced motion manually.
5. Check text resizing and 320px reflow.
6. Measure production-build performance and document test conditions.
7. Fix issues tied to the changed components. Do not silence rules merely to obtain a green scan.
8. Record current product limitations and later-phase dependencies.

Deliverable: results linked to the exact implementation commit.

Acceptance: required checks pass, and remaining issues have a defined impact and owner. A passing automated scan is not a whole-site compliance claim.

## P3-10: release the foundation and hand off

Owner: engineering/product. Dependencies: P3-09.

1. Create a reviewable implementation PR with before/after examples.
2. Review design choices in actual pages, not only isolated components.
3. Verify Phase 1 public-route restrictions remain intact.
4. Use Phase 2 CI, protected preview and release procedure.
5. Release only current public shell/page changes and reusable code. Keep prototype fixtures unshipped.
6. Verify the canonical domain after an authorized release.
7. Retain a known-good deployment and focused rollback instructions.
8. Hand off recipe design contracts without claiming their backend or payment implementation.

Deliverable: implementation evidence, component reference and later-phase handoff.

Acceptance: documentation, component exports and actual UI agree. Record design-system implementation and product launch as separate milestones.

## Proposed file map

| Area | Target |
| --- | --- |
| Tokens | src/styles/tokens.css |
| Global rules and reduced motion | src/app/globals.css |
| Font loading and root metadata preservation | src/app/layout.tsx |
| Shared actions | src/components/ui/Button.tsx, ButtonLink.tsx |
| Existing primitives | src/components/ui/Card.tsx, Section.tsx, Badge.tsx |
| Form structure and states | src/components/ui/Field.tsx, StatePanel.tsx |
| Shell width and layout | src/components/layout/Container.tsx, SiteShell.tsx |
| Header/footer consumers | src/components/Navbar.tsx, Footer.tsx |
| Recipe presentation examples | Isolated review harness and reusable presentation components |
| Print CSS | src/styles/recipe-print.css when consumed by the isolated example |
| Focused regression tests | tests/e2e/ following Phase 2 conventions |
| Evidence and contracts | docs/implementation/phase-3/ |

Names are recommendations. Reuse equivalent existing components rather than duplicating them.

## Implementation batches

| Batch | Tasks | Review focus |
| --- | --- | --- |
| A | P3-01 to P3-03 | Baseline, visual reference, tokens and fonts |
| B | P3-04 to P3-06 | Components, shell and current public pages |
| C | P3-07 and P3-08 | Isolated recipe examples, imagery and print |
| D | P3-09 and P3-10 | Verification, release evidence and handoff |

No new framework, wholesale application rewrite, paid design subscription or native-app port is required.
