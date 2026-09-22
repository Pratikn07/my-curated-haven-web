# Responsive layout and recipe design patterns

## Information hierarchy

My Curated Haven is the site brand. Tiny Soho identifies the recipe creator. Do not rename the whole website or turn Tiny Soho into a competing header brand.

The first screen should communicate the toddler-recipe promise and a working next action. Keep unrelated parenting features out of the initial public navigation.

These are layout specifications. Recipe and collection screens remain isolated examples until later feature phases.

## Responsive rules

| Width | Layout direction |
| --- | --- |
| 320 to 639px | One-column reading, disclosure navigation, stacked primary actions |
| 640 to 767px | More breathing room, optional two-column card grid if titles fit |
| 768 to 1023px | Two-column browsing, wider navigation only when content fits |
| 1024px and above | Up to three recipe columns, constrained content width |

Breakpoints are starting values. Switch navigation when the full brand and actual links fit, not because a device name implies desktop.

At 320px, prefer one readable card rather than two compressed cards. Avoid horizontal card carousels as the only browsing method. Use full document flow without fixed viewport-height pages.

## Current public homepage

Before recipes are ready:

1. Compact header with brand and current public navigation.
2. Clear promise: “Simple toddler recipes for busy families.”
3. Attribution: “Recipes by Tiny Soho, inside My Curated Haven.”
4. Honest preparation message with an existing working Support destination.
5. Short brand introduction.
6. Footer with Support and legal links.

Do not show recipe counts, recipe browsing actions or Buy buttons as working offers until their destination is implemented. Remove broad app-feature grids from the acquisition path according to Phase 1.

At recipe launch, Phase 6 replaces the transition section with three complete free recipes and the reviewed collection introduction. This phase defines spacing and components for that replacement.

## Future recipe index example

Reading order:

1. Page heading and short description.
2. Search field.
3. Filter trigger and applied-filter summary.
4. Result count and optional sort control.
5. Recipe cards.
6. Clear empty/error state when relevant.

Use one dominant action per card. Show time and relevant verified labels, not a crowded row of badges.

Initial filter candidates: meal type, known total time and verified dietary labels. Do not ask for a child's profile or age to browse the collection. Advanced age and feeding filters require content and product decisions later.

All recipes stay discoverable by scrolling and standard links. Sort options should reflect available data. Do not add “Most popular” without a reliable metric.

## Future recipe detail example

Mobile order:

1. Back-to-recipes link.
2. Recipe name and concise introduction.
3. Food image with reserved space.
4. Known timing and yield.
5. Relevant editorial notes and allergen information where supplied.
6. Jump links to Ingredients and Method.
7. Ingredients list.
8. Numbered cooking steps.
9. Serving/storage notes when verified.
10. Print action and related collection context.

Use ordinary page scrolling. Keep ingredient and method content available without making users open a separate modal. Ingredient checkboxes are optional local cooking aids in a later feature phase, not required for Phase 3.

Do not convert unknown preparation data into reassuring claims. Distinguish missing information from explicitly reviewed information.

On desktop, use a reading column with a restrained secondary area for metadata. Do not stretch instructions across the full viewport or force a sidebar on small screens.

## Future paid collection example

Include the collection name, clear contents, sample previews and the approved purchase terms. The product is a one-time purchase, with no subscription default.

The actual collection count, price, refunds, future additions and access duration remain unresolved in Phase 1 scope. Use labelled placeholders only in private design examples. Never expose fictional commercial terms publicly.

The website supplies the collection explanation and purchase action. Stripe-hosted checkout belongs to Phase 8. Do not rebuild card-entry fields in the design system.

## Bottom actions

Do not add a permanent bottom navigation bar for a website with only Home, About and Support.

A future contextual bottom purchase action needs review against small screens, safe areas, keyboard visibility and consent/support overlays. Reserve page padding so the bar never covers content or focused controls.

Keep Ingredients, Method and Print reachable without a persistent bar. Add sticky controls only when testing shows a concrete benefit.

## Images

Use recipe photography which represents the real dish. Choose one consistent crop for listing cards, proposed 4:3, and allow a larger detail treatment. Preserve focal points so the relevant food remains visible.

Use illustrations for brand storytelling where suitable, not as evidence of a finished recipe. Avoid baking recipe titles or instructions into images.

Provide dimensions or aspect ratios, appropriate responsive sources and a truthful text alternative. Decorative imagery has an empty alt. Missing images receive a stable neutral fallback rather than a broken-image icon.

Use Next.js Image where appropriate and verify the installed version's loading/preload API. Do not prioritize every card image.

Reference: [Next.js Image documentation](https://nextjs.org/docs/app/api-reference/components/image).

## Printable recipe example

Create a CSS print layout for an isolated recipe fixture.

- Use white paper and dark text.
- Hide navigation, filter controls, purchase actions and decoration.
- Retain title, ingredients, method, yield and relevant supplied notes.
- Keep units, quantities and ordered step numbers intact.
- Avoid breaking a short ingredient item or heading from its following content.
- Allow long steps to flow across pages instead of clipping them with fixed heights.
- Make the main image optional to reduce ink usage.
- Include brand/source attribution and an actual canonical URL only when one exists.
- Verify Letter and A4 output without relying on printed backgrounds.

Browser print or Save as PDF is the intended starting interaction. A downloadable paid PDF, offline access and PDF generation service need separate later decisions.

Protected print content must use the same future access boundary as the reading view. Never create a public print URL to bypass paid access.

## Other public pages

About uses a narrow editorial layout with factual brand history. Support prioritizes a working contact path and relevant help content. Legal pages use clear heading hierarchy, readable width and a visible update date only when accurate.

Style the unavailable page with links to Home and Support. Do not restore deferred content to fill whitespace.

## Design examples required for handoff

- 320px header and open mobile navigation.
- 390px homepage transition state.
- Recipe grid with long titles and a missing image.
- Filter sheet with draft changes and no results.
- Long recipe detail.
- Collection preview with explicitly unresolved commercial placeholders.
- Letter and A4 print previews.
- 1280px desktop shell.

Example screenshots do not prove feature implementation. Record fixture status beside the review reference.
