# Technical integration

## Architecture

Extend the existing Next.js homepage with server-rendered content and small existing client interactions. The preview areas are static informational components. They must not connect to native Chat, Shop or Bloom services.

Keep content, availability state and approved asset metadata in a typed module. Keep public recipe reads in the existing data layer. Do not put data credentials, user state or commerce decisions inside a general content object.

## Proposed file map

| Target | Change |
| --- | --- |
| `src/app/page.tsx` | Compose the sections and isolate data-dependent recipe/collection blocks |
| `src/components/Hero.tsx` | Broader brand hero with state-aware copy and actions |
| `src/components/home/PillarOverview.tsx` | Four compact cards and real anchor destinations |
| `src/components/home/HomeRecipes.tsx` | Public free-slot recipe projection and fallback |
| `src/components/home/CollectionSummary.tsx` | Approved collection handoff only |
| `src/components/home/FeaturePreview.tsx` | Reusable static preview layout with required status/caption |
| `src/components/home/BrandStory.tsx` | Approved founder/brand connection |
| `src/components/home/HomeFaq.tsx` | State-aware purchase/availability answers |
| `src/config/homepage-content.ts` | Copy, fixed anchors, assets, discriminated recipe presentation state |
| `src/config/site-navigation.ts` | Add homepage preview anchor, preserve existing valid links |
| `src/app/layout.tsx`, home metadata | Align default/home metadata without overriding recipe-specific metadata |
| `public/images/homepage/` | Reviewed static assets only |
| `src/lib/analytics/` | Optional consented bounded preview events using existing pipeline |
| `tests/e2e/public-site.spec.ts`, proposed homepage suite | State-aware contract, navigation, preview and regression tests |

Paths are relative to `my-curated-haven-web/`. Final structure should follow current conventions. No migration, new Supabase table, native import, provider SDK or package installation is expected.

## Content contract

Use a discriminated presentation union such as preparation, free_ready and collection_ready. Each state requires valid copy/actions. Collection-ready additionally requires an approved collection reference and policy/content version. Reject invalid combinations during build/config validation rather than rendering a broken CTA.

Each preview requires a fixed feature key (`chat`, `shop`, `bloom`), heading, summary, visual representation, provenance caption, planned-web label and anchor. A raster representation uses a local image reference and alt text. The version 1 representation is a semantic HTML `<figure>` with a visible `<figcaption>`; its illustration text stays in HTML and decorative icons are hidden from assistive technology. This choice and rationale are recorded in [preview assets](PREVIEW-ASSETS.md). No preview action accepts an arbitrary URL, retail destination or input submission callback.

Keep the source version and approver/date in internal content records, not product-facing UI. Product copy should explain availability without surfacing implementation flags, migration IDs or engineering terminology.

## Recipe integration

Use `getFreeRecipeCatalog` or its underlying assigned-slot projection. Never call the broad published-catalog helper to fill homepage cards. Display at most the three assigned public recipes in slot order. Fetch public summary fields only, not full bodies or account-specific saved state.

Reuse `RecipeCard` with save controls hidden. Do not call `getCurrentUser` merely to build homepage recipe cards. The existing shell handles its current account link separately. Ordinary public credentials suffice for approved free metadata. Never add a service-role client to make marketing reads succeed.

Confirm metadata queries use the intended public contract even for signed-in visitors. If the existing cookie-aware server client is reused, do not cache its result across users. Prefer a reviewed public-only adapter with no session persistence for homepage reads if needed. A shared-cache optimisation requires proof of an exclusively public projection and explicit invalidation.

Use an isolated recipe component with controlled error handling and a bounded request timeout. The static hero, previews, story and support links must still render when Supabase configuration is missing or the query fails. Preserve the existing marketing-page graceful-degradation intent. Distinguish an empty/misconfigured catalog from a temporary service error in internal logs, while presenting calm public copy.

No protected recipe body, ingredient list or user entitlement should appear in homepage HTML, React payloads, scripts, metadata or asset URLs. Public preview cards do not grant access. Recipe detail enforces the existing read contract.

## Collection handoff

The homepage links to the existing canonical collection page. No POST to checkout, direct Stripe link, order creation or price calculation occurs here. Read only an approved public offer projection. Do not import the privileged commerce repository into a general marketing component solely to obtain a price.

If no safe public offer projection exists, use an approved versioned collection summary with no numeric price, and rely on the canonical collection page for current terms. Record a content review owner and invalidate/withdraw the summary when the offer changes. Do not create a new public endpoint or expose private offer tables as a shortcut.

The sale claim requires a named approved release and verified purchase readiness. A homepage presentation flag never overrides `sale_enabled`, checkout configuration, server gates or entitlement checks. If the collection is paused, remove sale language and keep the free recipe path. Owned access remains reachable through Account.

## Caching and withdrawal

Default to no cross-request caching for session-aware data. Static preview copy and versioned public assets are safe to cache. Recipe/offer caching is an explicit later implementation choice with a short documented freshness window and withdrawal procedure.

On recipe withdrawal, confirm homepage cards, public catalog and any cached asset references follow the current publication policy. Never rebuild from stale all-published content. During uncertainty, show the availability fallback rather than retaining a withdrawn card.

A configuration or content update should have a candidate/content version in release evidence. Do not depend on an untracked environment toggle to change purchase promises. Test each supported state with deterministic fixtures.

## Navigation and metadata

Add `/#whats-ahead` to shared navigation only after the anchor exists. Keep `/features`, `/resources`, `/careers` and `/contact` blocked. Do not reopen dormant pages or mount the old Features/Testimonials/CTA components, whose claims differ from this plan.

Update home title, description, Open Graph/Twitter fields and image coherently. Preserve canonical `https://mycuratedhaven.com/`, existing public sitemap routes and recipe-specific metadata. Anchors are not separate sitemap pages. Do not add Product/SoftwareApplication structured data claiming future features are available for purchase. No fabricated reviews or ratings.

Check actual response HTML and social-preview rendering, not only source exports. Follow [current Next.js metadata guidance](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) and inspect inheritance so a root description does not silently overwrite unrelated page meaning.

## Test migration

The current public-site test expects a recipe-specific H1. Replace that assertion with the approved broader H1 plus a visible recipe starting point. Do not weaken the test to accept any heading.

The current no-purchase-link assertion needs state-specific expectations. Preparation and free-only states remain free of checkout/purchase actions. Collection-ready permits the approved collection link but still no direct Stripe/checkout session action from the homepage. App Store links remain absent unless separately requested and verified.

Keep route blocks, official origin, mobile menu, zero-overflow, console-error and deferred-bundle checks. Add explicit future-status assertions instead of deleting old checks merely because preview words appear. The old unqualified “Live Chat” promise remains prohibited.

Use synthetic fixtures for each presentation state and data failure. Real-content smoke confirms the three actual approved slots before a free-ready release. Synthetic pass does not prove production catalog availability.
