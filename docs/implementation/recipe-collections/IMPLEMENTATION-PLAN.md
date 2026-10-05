# Recipe collections implementation plan

All tasks start pending. Merging this plan completes documentation only. Task IDs use **RC**, independently of P1–P12 and HV. Scope, site structure and open conflicts are in the [README](README.md).

Each phase ships when its acceptance checks pass. Phases 2 and 3 release together as the first public milestone. Phase 4 is the first commercial milestone.

## Delivery sequence

| Task | Phase | Depends on | Owner role | Deliverable |
| --- | --- | --- | --- | --- |
| RC-01 | 1 | — | Product | Resolve the four conflicts listed in the README |
| RC-02 | 1 | RC-01 | Product + content | First collections and their recipe membership |
| RC-03 | 1 | RC-01 | Product + content | The 7–10 public sample recipes |
| RC-04 | 1 | RC-01 | Product | Customer library contents and name |
| RC-05 | 1 | RC-01 | Product | Written refresh promise per collection |
| RC-06 | 2 | RC-03 | Engineering | Free slots widened to the approved count |
| RC-07 | 2 | RC-04 | Engineering | Customer library access rule |
| RC-08 | 2 | RC-05 | Engineering | Buyers keep access to later releases |
| RC-09 | 2 | RC-06–RC-08 | Engineering + QA | One access rule for reading, direct links, saving and printing |
| RC-10 | 3 | RC-02 | Engineering + design | New `/collections` page |
| RC-11 | 3 | RC-02 | Engineering + design | Redesigned `/collections/[slug]` |
| RC-12 | 3 | RC-03, RC-06 | Engineering | `/recipes` as Free Recipes |
| RC-13 | 3 | RC-10–RC-12 | Engineering | Navigation, cross-links, sitemap |
| RC-14 | 3 | RC-09–RC-13 | QA + release owner | First public milestone release |
| RC-15 | 4 | RC-14, Phase 8 gates | Engineering | Offers for the approved collections |
| RC-16 | 4 | RC-15 | Engineering | Pay first, then create the account |
| RC-17 | 4 | RC-07, RC-15 | Engineering + design | My Library |
| RC-18 | 4 | RC-15–RC-17 | QA + release owner | Full purchase journey and commercial release |
| RC-19 | 5 | RC-08, RC-18 | Engineering + content | Release workflow for collection additions |
| RC-20 | 5 | RC-19 | Engineering + design | "What's new" for buyers |
| RC-21 | 6 | RC-18, RC-19, evidence | Product | Subscription go/no-go and terms |
| RC-22 | 6 | RC-21 | Engineering | Subscription access and cancellation |

## Phase 1: define the collections and purchase benefits

No code. The output is a decisions record added to this folder (`DECISIONS.md`).

### RC-01: resolve conflicts with earlier decisions

Decide the four conflicts in the [README](README.md#conflicts-with-earlier-decisions): free recipe count, monthly vs. yearly subscription, packs vs. collections, and whether a customer library exists.

Done when each one has an owner decision and a date.

### RC-02: first collections and membership

For each launch collection, record its slug, title, summary, theme, and its exact recipe list in order. Every member recipe must pass `private.recipe_is_reviewed`. Today 67 of the 70 recipes are drafts, so list the ones that need publishing.

Done when each collection has a fixed recipe list that the content owner has signed off.

### RC-03: public sample recipes

Choose the 7–10 public recipes. Include the recipes already promised in Instagram posts (`src/config/campaigns.ts`) so no promise breaks. Spread the samples across collections so each collection has at least one recipe a visitor can try.

Done when the list is approved and every recipe on it passes the review gate.

### RC-04: customer library

Decide which recipes the included library contains, whether it grows, and its name ("Everyday Recipe Library" is the working name). Decide whether the library overlaps with paid collections. Overlap reduces the reason to buy a second collection.

### RC-05: refresh promise

For each collection, write down what "refreshed" means, how often, and whether it covers new recipes, revised guidance or both. Seasonal collections such as Halloween and everyday collections such as Meal Prep can have different schedules. This text appears on the collection page and at checkout.

## Phase 2: access foundation

Invisible to visitors. Ships together with Phase 3.

### RC-06: widen free slots

Add a migration that changes `free_recipe_slots.slot` from `CHECK (slot IN (1, 2, 3))` to the approved count, then assign the RC-03 recipes. Update pgTAP tests that assume three slots.

Targets: new migration under `supabase/migrations/`, `supabase/tests/database/`, `getFreeRecipeCatalog()` and `getFreeRecipeSlots()` in `my-curated-haven-web/src/lib/data/recipes.ts`, homepage and campaign readers that assume three.

Done when an anonymous session reads exactly the approved sample count of bodies, and the database rejects slots outside the range.

### RC-07: customer library access

Grant library recipe bodies to any user who holds at least one active entitlement. Options: model the library as its own collection release granted alongside every purchase, or add an RLS condition. Prefer the release model because it reuses `access_entitlements` and `checkRecipeAccess`.

Done when tests show:
- A buyer of collection A can read library recipes.
- A visitor cannot.
- A user whose only entitlement is revoked or expired loses library access immediately.

### RC-08: buyers keep access to later releases

Today an entitlement attaches to one `collection_releases` row. Make sure a buyer of release 1 can also read recipes added in release 2. One approach: grant new-release entitlements to existing buyers when the release is published. Another: check access per collection instead of per release.

Done when a pgTAP test publishes release 2 and shows that a release-1 buyer reads its new recipes while a non-buyer does not.

### RC-09: one access rule everywhere

Direct links, the recipe page, saving and printing must all give the same answer. Extend the `RecipeAccess` union in `my-curated-haven-web/src/lib/data/access.ts` (today `admin | free | entitled | denied | not_found | error`) if the library needs its own kind. Check `my-curated-haven-web/src/lib/data/saved-recipes.ts` and the print button.

Done when the data unit tests, pgTAP suite and `tests/e2e/saved-recipe-access.spec.ts` cover every access kind, including admin.

## Phase 3: collection experience

### RC-10: `/collections` page

New route `my-curated-haven-web/src/app/collections/page.tsx`. Show every `listed` collection: cover photo, theme, one-line benefit, recipe count, and price when an offer is on sale. Add a "Try our free recipes" link to `/recipes`. When checkout is off, still show the collection and say it is coming soon. Don't 404.

Design: a small, carefully edited cookbook. Warm paper, generous spacing, consistent food photography. The premium feeling comes from the selection and presentation, not from pressure. No countdowns, crossed-out prices or pop-ups (same rule as the Instagram pages).

Done when it reads well at 375px wide inside Instagram's in-app browser, and a parent can tell what each collection offers without scrolling past the first card.

### RC-11: redesign `/collections/[slug]`

Today the page 404s when no offer exists, and its breadcrumb points to Recipes. Redesign it to show the collection's story, who it is for, a preview of its recipes (photos and titles), the refresh promise (RC-05), the no-refunds statement, the price and the purchase button. Link free sample recipes from this collection. Point the breadcrumb at Collections.

Done when the page renders for a listed collection with and without an active offer, and every claim on it matches RC-02 and RC-05.

### RC-12: `/recipes` as Free Recipes

Keep the address. Show the approved samples, retitle the page "Free Recipes", and show which collection each recipe belongs to. Admins keep the full library view from PR #85. Consider adding a draft/published badge to admin cards so collection curation is easier.

### RC-13: navigation, links, sitemap

Update `headerLinks`, `footerLinks` and `indexableRoutes` in `my-curated-haven-web/src/config/site-navigation.ts`: add Collections, rename Recipes to Free Recipes, add `/collections` to the sitemap. Rename the account page label to "My Library" (`src/app/account/collections/page.tsx`, title "My Recipe Collections"). Add collection links on free recipe pages. Check the homepage and campaign pages that link to `/recipes` (`HomeRecipes.tsx`, `HavenHero.tsx`, `HouseExplorer.tsx`, `CampaignRelated.tsx`, `CampaignClosing.tsx`) still say the right thing.

### RC-14: first public milestone release

Release Phase 2 and Phase 3 together. Apply the migrations through the normal pipeline, after CI passes on the PR. Don't apply them to production by hand first.

Done when, on production:
- A signed-out visitor sees every listed collection and the approved sample count on `/recipes`, and can read every sample in full.
- The same visitor gets the locked state on a paid recipe.
- An admin still sees every recipe.
- The `/collections` and `/recipes` responses for signed-in users are not shared-cacheable.

## Phase 4: purchases and the customer library

Requires the existing Phase 8, 10 and 11 commerce gates: live keys, webhook, terms, support and refund-policy text.

### RC-15: offers for the approved collections

Create a `private.commercial_offers` row and `private.release_manifests` entry for each launch collection (and pack, if RC-01 keeps packs). Start with `sale_enabled = false` and turn it on only at release.

### RC-16: pay first, then create the account

Checkout currently asks parents to sign in before paying, which fails inside Instagram's in-app browser. Let a parent pay first, then create or link the account. Fulfilment stays server-side through the idempotent webhook, not the success page.

### RC-17: My Library

Show purchased collections and the customer library on `/account/collections`. Each recipe opens its `/recipes/[slug]` page.

### RC-18: full purchase journey

On production with a real or approved test purchase: buy a collection, open its recipes and a library recipe, sign out, sign back in, recover access on a second device. Confirm a non-buyer is still locked out.

Done when that journey passes from a real Instagram DM link on one iPhone and one Android phone.

## Phase 5: collection updates

### RC-19: release workflow for additions

A repeatable way to add reviewed recipes to an existing collection: draft release → review → publish → existing buyers get access (RC-08). Document it in `ops/`.

Done when one real addition ships to one collection and an existing buyer can read it without doing anything.

### RC-20: "What's new" for buyers

Show buyers what changed in their collection and when. Keep it on-site (My Library and the collection page). Email is out of scope unless approved separately.

## Phase 6: subscription

### RC-21: go/no-go

Decide only once there is evidence: repeat buyers, a steady release schedule (RC-19 running on time), and enough reviewed recipes. Decide monthly vs. yearly (README conflict 2), whether money spent on packs counts towards it, and what happens on cancellation. Collections bought outright stay the buyer's after cancelling.

### RC-22: subscription access

Model subscription access as an entitlement with `expires_at`, so the existing access checks apply. Define renewal, failed payment and cancellation behaviour before launch.

## Remaining questions

- Does "protected" mean visitors see collection covers and previews but only buyers read the full recipes? This plan assumes yes.
- Should listed collections without an offer appear on `/collections` at all, or only once on sale?
- Who owns recipe photography for collection covers, and what are the rights?
- Does the customer library count towards the "N recipes" number shown on a collection page? It shouldn't, to avoid overstating a collection's size.
