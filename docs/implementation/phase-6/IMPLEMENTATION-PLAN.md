# Phase 6 detailed implementation plan

## Goal and baseline

Deliver a mobile-first path from Tiny Soho to a useful recipe on My Curated Haven. The first release exposes exactly three complete, reviewed free recipes. Build on the existing catalog and existing web design work.

Reviewed web baseline: commit `594d08841376c1d8e821ea9beb8109896fe9e9e8`. The app lives in `my-curated-haven-web/`. Paths below are relative to the repository root. Source findings describe this commit, not a fresh production audit.

| Existing source | Finding | Required change |
| --- | --- | --- |
| `src/components/recipe/RecipeCard.tsx` inside the app | Uses RecipeExample, placeholder image text and an unlinked h3 | Accept a public recipe card contract, render a stable recipe link and reviewed image |
| `src/design-review/FilterDemo.tsx` | Synthetic client-side meal filtering with draft/apply and native dialog | Reuse interaction patterns, replace fixture state with validated URL-driven state |
| `src/config/site-navigation.ts` | Header contains Home, About and Support | Add Recipes when the public route and content are ready |
| `src/app/sitemap.ts` | Five static routes with a fixed last-modified date | Include eligible recipe URLs with actual content timestamps |
| `src/styles/recipe-print.css` | Existing print foundation, broad keep-together rules | Verify complete long recipes and relax rules that create clipped or mostly empty pages |
| `tests/e2e/public-site.spec.ts` | Explicitly excludes recipes from navigation and expects five sitemap URLs | Update the intended route contract while retaining deferred-route protections |

No Phase 6 implementation, recipe selection or live recipe database verification is claimed here.

## Delivery sequence

### P6-01: confirm the existing recipe source

Dependencies: Phase 4 source/project investigation and Phase 5 content inventory.

Read the parenting-app recipe service, types, migrations and storage references. Confirm the live project's ownership and recipe tables before connecting a web environment. Record the source recipe IDs, field mappings, image rights and approved editorial version for the three free recipes.

Use the [reuse checklist](EXISTING-RECIPE-REUSE.md). Do not infer the recipe database from the Instagram analytics connection. Do not create parallel recipe tables just because the frontend framework changes.

Deliverable: a reviewed source-to-web mapping and selected free recipe IDs. A missing decision is recorded as blocked, not filled with invented content.

Acceptance: each public field is traceable to existing content or an explicitly reviewed editorial change. Ingredient amounts, units and instruction order survive comparison with the original.

### P6-02: define the public read boundary

Dependencies: P6-01 and implemented Phase 4 access controls.

Suggested targets: app `src/lib/recipes/contracts.ts`, `src/lib/recipes/queries.ts` and `src/lib/recipes/filters.ts`, adjusted to actual repository conventions.

Separate card metadata from full recipe bodies. Define validated listing parameters, deterministic ordering and explicit not-found, unavailable and unexpected-error results. Read through the verified backend contract using the caller's intended access level. Do not use a service-role key for ordinary public reads.

Treat Phase 4 table names as proposals until migrations and deployed schema are verified. Keep source IDs stable through adapters or documented mappings. Do not expose internal editorial notes or draft fields through a convenient select-all response.

Acceptance: anonymous callers receive complete bodies only for published free recipes. Paid and draft bodies remain inaccessible through direct API requests, rendering payloads and storage URLs. A database failure does not become an empty successful list.

### P6-03: implement the public recipe listing

Dependencies: P6-02. Layout work can start against synthetic fixtures before backend readiness.

Targets: app `src/app/recipes/page.tsx`, supporting loading/error components and `src/components/recipe/RecipeCard.tsx`.

Create a concise introduction with the Tiny Soho attribution and the promise of simple toddler recipes for busy families. Show the three free recipes without an account prompt. Reuse Phase 3 spacing, colours, typography, chips and responsive layout.

Cards contain a useful image or honest fallback, title link, meal label and reviewed time where available. Keep the title understandable on narrow screens. Do not display fabricated ratings or commercial claims.

Acceptance: direct navigation and refresh work. All three approved free recipes are discoverable. Card links open the correct canonical detail page. No design-review fixtures appear in production.

### P6-04: implement search and meaningful filters

Dependencies: P6-02 and P6-03.

Targets: public filter components, parameter parser and query adapter. Follow [browsing and filters](BROWSING-AND-FILTERS.md).

Use a GET search form as the reliable baseline. Put applied state in the URL. Add meal or time filters only where reviewed data and variation make them useful. Extend to dietary labels only after editorial review of the labels. Do not overwhelm a three-recipe catalog with mostly empty controls.

Reuse the filter demo's apply/cancel model, keyboard support and focus restoration. Provide removable applied filters and a clear-all action.

Acceptance: refresh and browser Back restore the same applied state. Clear-all restores the catalog. Unknown times never qualify for a quick-time filter. No-result and service-failure states remain distinct.

### P6-05: build complete free recipe pages

Dependencies: P6-01 and P6-02.

Targets: app `src/app/recipes/[slug]/page.tsx`, route error/not-found handling and recipe-detail components.

Render the complete approved ingredients and method. Include yield, preparation/cooking time, allergen information, tips and storage guidance only where reviewed and available. Use a Jump to recipe link for longer introductions and a print action near the recipe heading.

Make long ingredients, fractions and multi-line instructions readable. Use a recipe-scoped heading hierarchy and semantic lists. Do not place essential content behind a sign-up overlay.

Acceptance: anonymous visitors read all three recipes in full. Invalid, draft and otherwise nonpublic slugs reveal no recipe body. A missing required ingredient amount or method step blocks publication.

### P6-06: finish recipe printing

Dependencies: P6-05.

Targets: existing `src/styles/recipe-print.css` and the rendered recipe container.

Print the same approved recipe already visible on the page. Include title, attribution, source URL, ingredients, quantities, method and any published safety or storage notes. Remove navigation, dialogs and decorative marketing elements. Avoid a separate public print endpoint that bypasses normal access rules.

Acceptance: both A4 and US Letter output contain every ingredient and step. A deliberately long recipe spans pages without clipping, tiny text or blank pages caused by overly broad break restrictions. Browser print cancellation leaves the page usable.

### P6-07: connect metadata, discovery and navigation

Dependencies: P6-03, P6-05 and public content approval.

Targets: recipe route metadata, app sitemap, navigation config and existing home-page recipe entry point.

Give each free recipe its own title, description, canonical URL and reviewed social image where available. Add recipe structured data only from visible approved content. Include only public published canonical pages in the sitemap. Add Recipes to desktop and mobile navigation.

Filtered search URLs are not separate SEO landing pages. Keep their indexing/canonical treatment consistent as specified in the supporting document. Preserve all deferred-page restrictions.

Acceptance: sitemap and metadata contain no draft or paid body content. All public links resolve. Mobile navigation remains keyboard accessible. There is no Buy CTA until checkout and access fulfilment exist.

### P6-08: verify mobile usability and performance

Dependencies: P6-03 through P6-07.

Use the existing browser test setup. Check narrow phones, typical mobile widths and desktop. Review keyboard navigation, text zoom, reflow, focus, dialog cancellation, image loading and slow-network states.

Provide image dimensions and suitable responsive sizes. Review loading priority for the actual first visible image, rather than preloading every recipe image. Keep search/filter client code small and retain server rendering for initial content.

Acceptance: no horizontal scrolling for ordinary content at 320 CSS pixels. Controls meet the Phase 3 touch and contrast standards. Representative pages remain usable before optional client enhancements finish loading. Record measured performance rather than claiming unmeasured scores.

### P6-09: update and run meaningful regression checks

Dependencies: P6-02 through P6-08.

Update the existing assertion that rejects `/recipes` in navigation. Replace the five-route sitemap expectation with the approved static pages plus eligible free recipe URLs. Continue testing unavailable deferred routes and the private design-review route.

Add coverage for URL state, honest failures, content completeness and unauthorized body access. Use synthetic records for automated security cases, not customer data. Use the [validation matrix](VALIDATION-AND-RELEASE.md).

Acceptance: lint, typecheck, production build and required browser checks pass. Backend access tests pass against the actual proposed migration state. No checks are disabled simply to allow the feature through.

### P6-10: release, observe and record evidence

Dependencies: all prior tasks and the launch gates.

Review a protected preview with the actual three approved free recipes. Confirm the content owner and technical owner have signed off their respective evidence. Merge through the protected PR process. Check production listing, detail pages, images, sitemap and print after deployment.

Record commit, preview and production URLs, source recipe IDs, test results, remaining issues and rollback instructions in a new Phase 6 evidence file. Keep analytics instrumentation for Phase 9, while documenting a small proposed event contract for later work.

Acceptance: production shows exactly three complete free recipes and preserves all content restrictions. The evidence file describes what was verified and when. Writing this plan alone does not satisfy that acceptance criterion.

## Suggested implementation slices

1. Source mapping, contracts and query boundary.
2. Listing, search, filters and card upgrades.
3. Detail pages, images and print.
4. Metadata, navigation, regression checks and launch evidence.

Each slice should remain independently reviewable. Keep incomplete public routes behind the existing release approach until the launch gates pass.

## Definition of done

A parent follows a Tiny Soho link, finds a relevant recipe on a phone, reads the complete recipe and prints it. The recipe content comes from the existing parenting catalog with reviewed adaptations. The free set is exactly three. No paid or draft body leaks, no fake purchase flow appears, and the implementation has reproducible verification evidence.
