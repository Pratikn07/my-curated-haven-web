# Decisions and copy record

Reviewed: 2026-09-24
Content version: `hv-2026-09-24`

## Presentation state

The default is `preparation`. The homepage does not assert that recipes are available or that a collection is for sale. `resolveHomepageRecipeState` accepts only a small typed state contract; missing, malformed or unsafe state falls back to preparation. Recipe cards are limited to approved slot slugs, in slot order, and the collection handoff requires an owner-approved canonical `/collections/<slug>` reference. No readiness value comes from a public URL parameter or arbitrary external link.

The `free_ready` and `collection_ready` branches have contract/projection unit coverage, but the current candidate renders only preparation. A later content owner must verify prerequisites and change the authored configuration through review.

## Visible content decisions

- The hero introduces everyday parenting support while stating that the site is starting with toddler recipes from Tiny Soho.
- The primary action is “See the recipe plan” and moves to the preparation section. “See what’s ahead” moves to the static preview section.
- The four overview areas are Recipes, Parenting Chat, Curated Shop and Bloom. Only Recipes is the starting point; the other three are marked as previews/planned for the web.
- Recipe attribution is “Recipes by Tiny Soho, inside My Curated Haven.”
- The brand story uses the existing About-page facts: My Curated Haven is the product; it began as a parenting companion; Tiny Soho grew from that work as a place to find toddler food ideas.
- The FAQ says the previews are not live, nothing is for sale in this state, and existing Support is the question path. It does not promise a waitlist, signup, launch date, provider or future product entitlement.
- The social image says “Starting with toddler recipes by Tiny Soho” and labels Parenting Chat, Curated Shop and Bloom “Planned.” It is generated at 1200 × 630.

## Static preview contracts

- Chat is a short synthetic mealtime example, expressly labelled static and not a live conversation or guidance service.
- Shop displays only Feeding, Sleep and Play categories. No product, retailer, price, rating, booking or checkout action is present.
- Bloom contains a made-up milestone with an explicit synthetic-example label and no real child identifier.
- Each detailed preview displays “Planned for the web,” a nearby illustrative caption, and a normal link back to recipes. There are no inputs, forms, fake send buttons or feature routes.

## Measurement decision

Three fixed, bounded homepage events were added to the existing analytics schema. Events continue to use the existing consent gate; declined visitors can navigate normally, pre-consent preview clicks are not queued, exposure is deduplicated per page view, and a provider error does not block the link. The tests use the local test provider; no live provider behavior or production analytics configuration is asserted here.

Content facts were cross-checked against existing project copy. A separate content-owner approval of the rendered page is still outstanding and is not implied by this source comparison.
