# Recipe detail, print and discovery

## Canonical recipe page

Route: `/recipes/[slug]`. A slug identifies a stable source recipe through the documented mapping.

Recommended reading order:

1. Breadcrumb to Recipes.
2. Recipe title, approved summary and Tiny Soho attribution.
3. Reviewed image, yield and available time information.
4. Jump to recipe and Print actions.
5. Ingredients with complete amounts and units.
6. Ordered method.
7. Reviewed tips, allergen wording and storage guidance where available.
8. Links to the other approved free recipes.

Keep the recipe usable while cooking on a phone. Let long ingredient names wrap naturally. Avoid sticky controls that obscure instructions or browser zoom. Do not add timers, serving multipliers or unit conversion without separate requirements and validation.

Three complete free recipes require no account, email capture or payment. Do not interrupt the method with a purchase overlay.

## Missing and unavailable content

An unknown slug returns a real not-found response. Unpublished and nonpublic content should not disclose whether a private record exists. Database outages use an error state rather than falsely returning not-found.

Use an explicit redirect map if an approved public slug changes. Do not guess matches from private titles. Remove withdrawn URLs from the sitemap and invalidate affected caches. A former URL must not keep serving withdrawn content from a static artifact.

The Phase 6 route serves free content. Future paid details must use the Phase 8 entitlement flow, with the same access decision across HTML, server component payloads, APIs and print. Do not send a paid body to the browser and hide it visually.

## Images

Use approved existing assets wherever possible. Confirm ownership or usage rights, URL availability and publication status. Store dimensions and supply responsive image sizes to reduce layout movement and oversized downloads.

Restrict remote image configuration to verified sources and paths. Do not permit arbitrary hosts. Use descriptive alt text for meaningful food images and empty alt text for purely decorative repetitions.

Public free images should remain available without rapidly expiring signed links. Private paid assets require the Phase 4 storage/access design. A generic image fallback must not be represented as a photo of the recipe.

## Printing

Reuse the existing recipe print root and stylesheet. Print the approved content already rendered through the public access boundary.

Include title, attribution, canonical source URL, yield when known, all ingredients, the full method and published allergen/storage notes. Hide navigation, footer marketing, filters and action buttons.

Keep headings with the next block where practical. The current broad keep-together rules for every list item and paragraph need review: long steps must be allowed to split across pages rather than overflow or create excessive empty space.

Test a normal recipe and a deliberately long synthetic recipe on A4 and US Letter. Compare ingredient and instruction counts between the page and print output. Confirm meaningful fractions, degree symbols and quantities survive printing. No PDF-only delivery system is required.

## Metadata and structured data

Generate title, description and canonical URL from approved public data. Use the official domain, not preview hosts, in production canonical URLs. Protected previews retain the project's existing access and indexing safeguards.

Recipe structured data must match visible content. Include only supported facts such as name, image, ingredients, instructions and reviewed timings/yield. Omit ratings, nutrition or dates when their evidence is absent. Do not invent fields to satisfy a search validator.

Escape serialized structured data safely so content cannot break out of the script element. Render recipe text as text by default. Any permitted rich text needs an explicit sanitization contract.

Use the structured-data validator during implementation and record results. Valid markup does not guarantee a search rich result.

## Sitemap and indexing

Include the static public routes and the three published canonical free recipe pages. Exclude drafts, design review, preview hosts and arbitrary filter combinations. Use actual approved public modification timestamps rather than the time of page rendering.

For `/recipes` with search/filter parameters, use a consistent policy: canonical to the unfiltered catalog and noindex for parameterized result pages. Keep canonical detail pages indexable. Validate that robots directives, canonical tags and sitemap inclusion agree.

Robots directives are discovery controls, not authorization. Private content requires access enforcement regardless of indexing settings.

## Cache boundaries

Cache only content already authorized for public access. Cache keys must not mix anonymous and authenticated output. Do not place future personalized or entitlement-dependent responses in a shared public cache.

Define invalidation for publication changes, free-slot changes, slug redirects, image replacement and recipe withdrawal. Test that removal updates listing, detail, metadata and sitemap together. Protect any invalidation endpoint and do not expose deployment secrets in the client.

## Official references

Consult documentation matching the installed framework version during implementation:

- [Next.js page conventions and route parameters](https://nextjs.org/docs/app/api-reference/file-conventions/page)
- [Next.js metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js notFound](https://nextjs.org/docs/app/api-reference/functions/not-found)
- [Google recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe)

These references guide implementation. They do not establish that the current application already meets the requirements.
