# Product decisions and Phase 1 scope

## Confirmed by the owner

| Topic | Decision |
| --- | --- |
| Brand | My Curated Haven |
| Official domain | https://mycuratedhaven.com/ |
| Tiny Soho relationship | Recipes by Tiny Soho, inside My Curated Haven. |
| First audience | Parents feeding toddlers |
| Initial promise | Simple toddler recipes for busy families |
| Free offering | Exactly three complete free recipes at recipe launch |
| Paid offering | One clearly defined recipe collection |
| Billing | One-time purchase |
| Format | Mobile-first web experience with printable recipe pages |
| First purchase exclusions | Unlimited AI, milestone tracking and future parenting tools |
| Existing pages | Preserve existing work, remove deferred pages from public navigation |
| Long-term direction | Add parenting features gradually after recipe demand is understood |

The recipe experience should reuse useful product ideas from the parenting app. This is not a PDF-only plan. A full native feature migration is outside Phase 1.

## Decisions still open

| ID | Decision | Owner | Blocks |
| --- | --- | --- | --- |
| O1 | Exact paid recipe list and count | Product owner | Collection sales copy and checkout launch |
| O2 | Price and currency | Product owner | Payment configuration |
| O3 | Refund terms and support process | Product owner | Public purchase terms |
| O4 | Future additions included or sold separately | Product owner | Collection promise |
| O5 | Duration and conditions of hosted recipe access | Product owner | Access terms |
| O6 | Three free recipe identities and editorial approval | Product/content owner | Free recipe launch |
| O7 | Confirm monitored support email | Product owner | Phase 1 support cutover |
| O8 | Existing native users, subscriptions, store requirements and legal URL dependencies | Product/engineering | Removing existing public support or download guidance |
| O9 | Actual deployment provider, production branch and preview protection | Engineering | Phase 1 code deployment |

Agreement to sell a collection does not establish its count, price or future entitlements. Record decisions explicitly. Do not invent these values to complete a screen.

## Phase 1 deliverables

- A recoverable source baseline and route inventory.
- Deferred page source preserved outside the active production route tree.
- Consistent desktop, mobile and footer navigation.
- A truthful transition homepage and About page.
- Working support access.
- A claims review covering visible copy, metadata and dormant components.
- Indexing rules matching published route status.
- A preview verification record and documented rollback.
- A handoff to Phase 2 and later recipe implementation.

## Recommended route interpretation

The owner wants deferred pages kept for future use and kept away from end users. Navigation removal alone leaves direct URLs public. The implementation recommendation is to preserve source and make deferred routes unavailable in production.

For the smallest implementation, retain source in an unreferenced legacy directory and return an unavailable/404 response from the old routes. Review the old experience locally from the recorded baseline. A protected shared preview is optional follow-on work, not a requirement to build an admin system now.

This is a proposed implementation detail, not evidence of an already approved access-control design. Record the selected behaviour in the implementation PR. If the owner explicitly chooses unlisted-but-public pages, document direct URL availability and adjust acceptance expectations.

## Outside Phase 1

Do not implement Stripe, subscription billing, recipe database migrations, login, favourites, child profiles, AI features, milestone tracking, automated Instagram outreach, or bulk native-app porting. Do not change Supabase or copy production user data for this phase.

Retain the cream, terracotta and sage brand direction for now. Phase 3 should review contrast, typography, component states and responsive layouts together. Fix readability and navigation defects encountered in Phase 1 without starting a full visual redesign.

## Public content before recipe launch

Use an honest transition message such as:

> Simple toddler recipes for busy families. Recipes by Tiny Soho, inside My Curated Haven. Our recipe collection is in preparation.

Do not show “Browse 3 free recipes” until three reviewed recipes are available. Do not show “Buy” until the complete payment and access flow is ready. Use an existing working Support destination during the transition. A waitlist requires a separate consent and delivery design.
