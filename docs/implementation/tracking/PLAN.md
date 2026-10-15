# Site tracking plan

Updated 2026-10-14. Covers the public site at mycuratedhaven.com and the PostHog project 630160. Nothing in this plan is built yet.

Today PostHog records page views and raw clicks, but a click doesn't say which part of the page it came from, its position, or what it opened. 147 of the 529 clicks recorded in the 30 days to 2026-10-14 (28%) carry no text at all. No purchase reaches PostHog, and the database drops 3 of the 4 Instagram campaign codes. This plan adds one labelled click event, page context on every event, scroll and time milestones, offer views, and a purchase funnel that ends in a server-side purchase tied to the visitor who bought.

Example: a parent taps Buy on `/collections/halloween`.

- Today: one `$autocapture` row with the button text. `checkout_clicked` never fires and the sale never reaches PostHog.
- After this plan: `cta_clicked {primary_ux: buy_box, cta: buy, destination_kind: checkout}`, then `checkout_clicked {collection_slug: halloween, surface: buy_box}`, then the server sends `purchase_confirmed {paid_minor: 599, currency: usd, campaign_code: comment_dm, checkout_surface: buy_box}` on the same PostHog visitor.

## Questions it answers

| Question | Events |
| --- | --- |
| Which Instagram link sells books? | `campaign_code` and `campaign_content` on `purchase_confirmed` |
| Which button sells: the buy box, the lock card on a locked recipe, or the plan page? | `checkout_clicked.surface`, `purchase_confirmed.checkout_surface` |
| Where on a page do parents tap, and which slot in a list? | `cta_clicked` by `primary_ux` and `cta_position` |
| Of parents who see an offer, how many tap it? | `offer_viewed` then `checkout_clicked`, per surface |
| How far do parents read `/halloween` on a phone? | `page_scroll_reached`, `page_time_reached` |
| Where do parents drop out of sign-in? | `sign_in_started` to `sign_in_completed` |
| What do parents ask before buying? | `faq_opened` |
| What breaks? | `not_found_viewed`, `load_failed`, `checkout_failed`, `$exception` |

## Decisions

| Decision | Choice |
| --- | --- |
| Tool | PostHog only. No GA4, no ad pixels |
| Click model | One `cta_clicked` event for every link and button. Each click carries the module it sits in (`primary_ux`), a fixed label (`cta`), its slot (`cta_position`) and where it goes (`destination_kind`). Labels live in markup as `data-track-*` attributes and one page-wide listener reads them |
| Labels | Fixed keys written in code, never the visible text, so renaming a button keeps its history |
| Destinations | Route keys and slugs worked out from the link, never URLs (the validator rejects URLs) |
| Autocapture | Stays on as a backup. Reports use the labelled events |
| Old events | `story_action_clicked`, `story_section_viewed` and `homepage_cta_clicked` keep firing until 2026-11-30 so the new events can be checked against them, then retire in PR 4 |
| Purchase of record | The server `purchase_confirmed` from the Stripe webhook, sent under the visitor's PostHog id. The browser only sends `purchase_confirmation_viewed`, so a sale is never counted twice |
| Engagement | Live milestones while the parent is on the page: scroll 25/50/75/100% and visible time 15/30/60 s. PostHog's page-leave scroll depth exists for only 27% of phone page views (74 of 276), because Instagram's browser usually closes without sending it |
| Free text | Never sent: search text, the child's name typed into the storybook sample, emails |
| Internal traffic | Admin browsers are marked `is_internal` and filtered in PostHog instead of being switched off |
| Test traffic | Reports start on 2026-10-15. Everything before is test traffic |
| Skipped | Cooking-progress events (age switch, ingredient ticks, steps reached, step photos, "We made it!"). Decided 2026-10-14. Method controls get the generic `recipe_method` label only |

## Rules for every event

1. Event names are snake_case, object then verb, like the existing `recipe_open` and `checkout_clicked`.
2. Each event is declared in three places: its payload type in `src/lib/analytics/events.ts`, its allowed and required properties in `src/lib/analytics/schema.ts`, and its allowed values in `src/lib/analytics/sanitize.ts`. The validator drops any event with an unknown property.
3. The validator checks values by property name, not by event (`checkString` in `sanitize.ts`). A new property must not reuse an existing name with different values. That is why the click event uses `cta_position` and `destination_kind`: `destination` already means a homepage destination.
4. Strings are 64 characters or fewer, with no URLs, `?`, `#` or emails. UUID fields must be valid UUIDs. Slugs match `^[a-z0-9][a-z0-9-]{0,63}$`.
5. A property that doesn't apply is left out. Never send `0`, `""` or `false` as a stand-in for "not known".
6. Booleans are allowed only for named fields (today only `zero_results`). New boolean fields go on an allowlist in `sanitize.ts`.
7. One spelling per field across all events.
8. View events fire once per page view.

## Event catalogue

### New events

| Event | Fires when | Properties (`*` = required) | PR |
| --- | --- | --- | --- |
| `cta_clicked` | Any link or button is tapped | `primary_ux`*, `link_type`*, `cta`, `cta_position`, `destination_kind`, `target_kind`, `target_slug` | 2 |
| `section_viewed` | A block marked `data-track-view` passes two thirds of the way up the screen | `primary_ux`* | 2 |
| `offer_viewed` | An offer is at least half on screen, once per surface per page view | `surface`*, `collection_slug`*, `ownership_state`, `price_minor`, `currency` | 2 |
| `page_scroll_reached` | The page passes 25, 50, 75 and 100% | `depth`* | 2 |
| `page_time_reached` | 15, 30 and 60 seconds of visible time on the page | `seconds`* | 2 |
| `paywall_viewed` | A locked recipe page loads | `recipe_id`*, `collection_slug` | 3 |
| `checkout_failed` | Buy fails before Stripe opens | `collection_slug`*, `surface`*, `checkout_error`* | 3 |
| `checkout_cancelled` | `/checkout/cancel` loads | `collection_slug` | 3 |
| `purchase_confirmation_viewed` | `/checkout/return` shows a confirmed order, once per order | `order_ref`*, `collection_slug`* | 3 |
| `purchase_claimed` | A guest unlocks an order with the emailed code | `collection_slug` | 3 |
| `sign_in_method_chosen` | Continue with Email or Continue with Google is tapped | `method`*, `entry_point`* | 3 |
| `sign_in_code_sent` | The sign-in code email is sent | `entry_point`* | 3 |
| `sign_in_failed` | Sending the code, verifying it, or Google sign-in fails | `sign_in_step`*, `sign_in_error`* | 3 |
| `recipe_filter_value_applied` | Once per filter value when Apply Filters is tapped | `filter_kind`*, `filter_value`* | 3 |
| `faq_opened` | A question on the collection page or a story page opens | `primary_ux`*, `question_key`* | 3 |
| `room_closed` | A room on the home page closes | `feature_key`*, `seconds_bucket`* | 3 |
| `sample_interacted` | Storybook story or style picked, nursery stamp, shelf reveal | `sample`*, `choice` | 3 |
| `not_found_viewed` | A 404 page shows | `route_class`* | 3 |
| `load_failed` | A recipe list fails to load | `primary_ux`* | 3 |
| `save_failed` | Saving a recipe fails | `recipe_id`* | 3 |
| `empty_state_viewed` | No search results, an empty bookcase, "Opening soon" | `primary_ux`* | 3 |
| `$exception` | An uncaught error (PostHog error tracking, `capture_exceptions: true`) | PostHog's own | 3 |

### Changed events

| Event | Change | PR |
| --- | --- | --- |
| `page_view` | New route keys `halloween`, `collections`, `collection_plan`, `collection_series`. Plan pages were labelled `collection_detail` before this change | 1 |
| `checkout_clicked` | Always fires. Adds `collection_slug`* and `surface`*. `collection_release_id` becomes optional | 1 |
| `collection_view` | Mounted on the collection page. Adds `collection_slug`* and `ownership_state`. `collection_release_id` becomes optional | 1 |
| `purchased_library_open` | Mounted on `/account/collections` | 1 |
| `sign_in_completed` | Email-code sign-ins are recorded too. Today all 7 recorded completions are Google | 1 |
| `recipe_search_submit`, `recipe_filter_apply` | Result counts are read after the new results load, not before | 1 |
| Server events `checkout_created`, `purchase_confirmed`, `purchase_access_activated`, `refund_confirmed` | Sent under the visitor's PostHog id and session. Add `campaign_code`, `campaign_content`, `checkout_surface`, `entry_story`, `collection_slug` | 1 |
| Every browser event | Adds page context: `content_slug`, `access_state` | 2 |

### Removed events

- `homepage_preview_viewed`: defined but not sent since 2026-10-02. Removed in PR 3.
- After 2026-11-30 (PR 4): `story_action_clicked` and `homepage_cta_clicked` (replaced by `cta_clicked`), `story_section_viewed` (replaced by `section_viewed`). `story_view` and `homepage_preview_opened` stay.

### Property values

| Property | Values |
| --- | --- |
| `primary_ux` | `header_nav`, `mobile_nav`, `footer`, `breadcrumb`, `intro`, `hero`, `house`, `room_dialog`, `storybook`, `recipe_grid`, `collection_band`, `faq`, `search`, `filters`, `recipe_toolbar`, `recipe_method`, `lock_card`, `more_recipes`, `campaign_recipes`, `book_card`, `plan_strip`, `book_tiles`, `story`, `story_offer`, `related_shelf`, `closing`, `sticky_bar`, `bookcase`, `buy_box`, `plan_card`, `contents_list`, `free_samples`, `next_book`, `plan`, `shopping_list`, `sign_in`, `confirmation`, `claim_form`, `checkout_status`, `checkout_cancel`, `account`, `library`, `saved_recipes`, `support`, `static_page`, `error_page`, `empty_state`, `unlabelled` |
| `link_type` | `internal`, `external`, `anchor`, `action` (a button with no link) |
| `cta` | A key matching `^[a-z][a-z0-9_]{0,31}$`, written in code. Suggested keys: `buy`, `see_collection`, `see_all_recipes`, `open_recipe`, `see_plan`, `browse_recipes`, `browse_collections`, `sign_in`, `account`, `home`, `recipes`, `collections`, `about`, `support`, `privacy`, `terms`, `logo`, `menu`, `back`, `next`, `previous`, `jump`, `copy`, `email`, `instagram`, `refresh`, `retry`, `search`, `open_filters`, `apply_filters`, `remove_filter`, `clear_filters`, `save`, `print` |
| `cta_position` | 1 to 50, counted from 1 inside its module |
| `destination_kind` | Any route key, plus `checkout`, `anchor`, `email`, `instagram`, `stripe`, `external`, `other_page`, `none` |
| `target_kind` | `recipe`, `collection`, `plan`, `series`, `story` |
| `target_slug`, `collection_slug`, `content_slug`, `question_key`, `choice` | The slug pattern |
| `access_state` | `free`, `locked`, `owned`, `preview` |
| `surface`, `checkout_surface` | `lock_card`, `buy_box`, `sticky_bar`, `book_card`, `story_offer` (checkout only happens from `lock_card` and `buy_box`) |
| `ownership_state` | `owned`, `not_owned`, `unauthenticated`, `unavailable` (the existing `OwnershipStatus`) |
| `price_minor` | Integer above 0 |
| `depth` | 25, 50, 75, 100 |
| `seconds` | 15, 30, 60 |
| `checkout_error` | `already_owned`, `refresh_required`, `unavailable`, `network`, `server` |
| `sign_in_step` | `send_code`, `verify_code`, `google` |
| `sign_in_error` | `invalid_code`, `expired_code`, `rate_limited`, `bot_check`, `cancelled`, `unknown` |
| `filter_kind` | `meal`, `diet`, `time` |
| `filter_value` | The fixed meal, diet and time values already listed in `RecipeFilters.tsx` |
| `seconds_bucket` | `under_10s`, `10_to_30s`, `over_30s` |
| `sample` | `storybook_story`, `storybook_style`, `nursery_stamp`, `shelf_reveal` |
| `route_class` | `recipe`, `collection`, `story`, `other` |
| `method`, `entry_point`, `feature_key`, `recipe_id`, `order_ref`, `currency` | Unchanged, as defined today |

## How labelled clicks work

### Markup

| Attribute | Goes on | Meaning |
| --- | --- | --- |
| `data-track-ux="<primary_ux>"` | The module's container (`nav`, `section`, card grid) | Which part of the page |
| `data-track-cta="<key>"` | The link or button | Fixed label. Optional; the click is tracked without it |
| `data-track-pos="<n>"` | The card or row, or the link itself | Slot inside the module |
| `data-track-dest="checkout"` | Only where the destination can't be read from a link (the Buy button) | Overrides the derived destination |
| `data-track-ignore` | Skip link, purely decorative elements | Not tracked, and exempt from the coverage test |
| `data-track-view` | A container whose arrival should send `section_viewed` | |
| `data-track-offer="<surface>"` and `data-track-collection="<slug>"` | An offer container | Sends `offer_viewed` |
| `data-track-faq="<question_key>"` | Each `<details>` question | Sends `faq_opened` |

### Listener

New `src/components/analytics/ClickTracker.tsx`, mounted once in `src/components/layout/SiteShell.tsx`:

1. Listens for `click` on `document` in the capture phase, so handlers that stop propagation (the bookcase tile animation, for example) can't hide a click.
2. Finds the clicked control: `target.closest("a, button, [role=button]")`. Returns if there is none, or if it sits inside `[data-track-ignore]`.
3. `primary_ux` comes from `closest("[data-track-ux]")`. Without one it is `unlabelled`, so gaps show up in PostHog instead of disappearing.
4. `cta` comes from `data-track-cta`, `cta_position` from `closest("[data-track-pos]")`.
5. `link_type`, `destination_kind`, `target_kind` and `target_slug` come from the link's `href`, through a new `describeLink(href, origin)` in `src/lib/analytics/links.ts`:
   - `#…`: `anchor`
   - `mailto:`: `email`
   - `instagram.com`: `instagram`
   - `stripe.com`: `stripe`
   - any other site: `external`
   - our own paths: the route key from `pathToCanonicalRouteKey`, else `other_page`. `/recipes/<slug>` gives `target_kind: recipe`, `/collections/<slug>` gives `collection`, `/collections/<slug>/plan` gives `plan`, `/collections/series/<s>` gives `series`, `/stories/<slug>` gives `story`
   - a button with no link: `link_type: action`, `destination_kind: none`
6. Sends through `trackAnalyticsEvent("cta_clicked", …)`, which already refuses admin pages.

Custom events are not blocked by the `ph-no-capture` wrapper, so this also covers sign-in, checkout and account pages, where autocapture records nothing today.

`CampaignTracker.tsx` keeps sending `story_action_clicked` and `story_section_viewed` until PR 4. The dead `/#house` branch in `Navbar.tsx` (`handleNavigation`) is removed in PR 2.

### Where the labels go

| Page | Module | `primary_ux` | Files |
| --- | --- | --- | --- |
| Every page | Logo, header links, Sign In / Account | `header_nav` | `components/Navbar.tsx` |
| | Menu toggle and drawer links | `mobile_nav` | `components/Navbar.tsx` |
| | Footer links | `footer` | `components/Footer.tsx` |
| | Skip link | `data-track-ignore` | `components/layout/SiteFrame.tsx` |
| Home `/` | "Browse recipes" | `hero` | `components/house/HavenHero.tsx` |
| | Room hotspots, room tags, "Or pick a room" | `house` | `components/house/HouseExplorer.tsx` |
| | Room dialog: recipe rows, browse links, sample page, other rooms, back | `room_dialog` | `HouseExplorer.tsx`, `RoomSamples.tsx` |
| | Story and style pickers | `storybook` | `components/home/StorybookSample.tsx` |
| | Recipe cards (with position), "See all recipes" | `recipe_grid` | `components/home/HomeRecipes.tsx`, `components/recipe/RecipeCard.tsx` |
| | Collection band (when shown) | `collection_band` | `components/home/CollectionSummary.tsx` |
| | FAQ links | `faq` | `components/home/HomeFaq.tsx` |
| `/halloween` | Recipe cards (with position) | `campaign_recipes` | `components/halloween/HalloweenSections.tsx` |
| | Book card, also an offer | `book_card` | `HalloweenSections.tsx` |
| | Plan strip | `plan_strip` | `HalloweenSections.tsx` |
| | Book page tiles, captions, "See the Halloween collection" | `book_tiles` | `components/halloween/HalloweenClient.tsx`, `HalloweenSections.tsx` |
| | Ghost | `story` | `HalloweenClient.tsx` |
| | Closing links | `closing` | `HalloweenSections.tsx` |
| | Phone buy bar, also an offer | `sticky_bar` | `HalloweenClient.tsx` |
| `/stories/[slug]` | Hero button | `hero` | `components/campaign/CampaignHero.tsx` |
| | Recipe tiles (with position) | `campaign_recipes` | `CampaignRecipes.tsx` |
| | Filmstrip buttons | `story` | `KitchenStory.tsx` |
| | Pack and collection offers | `story_offer` | `CampaignOffers.tsx` |
| | Shelf cards (with position), previous and next, end card | `related_shelf` | `CampaignRelated.tsx`, `ShelfControls.tsx` |
| | Questions | `faq` | `CampaignQuestions.tsx` |
| | Closing links | `closing` | `CampaignClosing.tsx` |
| | Dock | `sticky_bar` | `CampaignDock.tsx` |
| `/recipes` | "Browse the collections" | `intro` | `app/recipes/page.tsx` |
| | Search form | `search` | `components/recipe/RecipeFilters.tsx` |
| | Filters button, chips, dialog controls | `filters` | `RecipeFilters.tsx` |
| | Result cards (with position) and save buttons | `recipe_grid` | `app/recipes/page.tsx`, `RecipeCard.tsx` |
| | Retry, "Clear all filters" | `empty_state` | `app/recipes/page.tsx` |
| `/recipes/[slug]` | Breadcrumb | `breadcrumb` | `app/recipes/[slug]/page.tsx` |
| | Save, Jump to recipe, Print | `recipe_toolbar` | same page, `SaveRecipeButton.tsx`, `PrintButton.tsx` |
| | Method controls (generic label only) | `recipe_method` | `components/recipe/RecipeMethodLayout.tsx` |
| | Lock card: Buy, see all, free recipe, sign in; also an offer | `lock_card` | `app/recipes/[slug]/page.tsx`, `CheckoutButton.tsx` |
| | More free recipes (with position) | `more_recipes` | `app/recipes/[slug]/page.tsx` |
| `/collections` | Stage buttons, chips, book tiles (with position), featured book, series | `bookcase` | `components/collections/Bookcase.tsx` |
| | Free recipe links | `intro` | `app/collections/page.tsx` |
| `/collections/[slug]` | Breadcrumb | `breadcrumb` | `components/collections/CollectionDetail.tsx` |
| | Plan card | `plan_card` | `CollectionDetail.tsx`, `MakeAheadPlan.tsx` |
| | Buy box: Buy, See the plan, Sign in, cook a free recipe first; also an offer | `buy_box` | `CollectionDetail.tsx`, `CheckoutButton.tsx` |
| | Recipe rows (with position) | `contents_list` | `CollectionDetail.tsx` |
| | Free samples (with position) | `free_samples` | `CollectionDetail.tsx`, `Showroom.tsx` |
| | Questions | `faq` | `CollectionDetail.tsx` |
| | Next book | `next_book` | `CollectionDetail.tsx` |
| | Phone buy bar, also an offer | `sticky_bar` | `CollectionDetail.tsx` |
| `/collections/[slug]/plan` | Breadcrumb | `breadcrumb` | `MakeAheadPlan.tsx` |
| | Recipe links inside the plan | `plan` | `MakeAheadPlan.tsx` |
| | Copy list, ticks | `shopping_list` | `MakeAheadShopping.tsx` |
| | Lock card; also an offer | `lock_card` | `app/collections/[slug]/plan/page.tsx` |
| `/sign-in` | Every control | `sign_in` | `components/auth/SignInForm.tsx` |
| `/checkout/return` | Open recipes, My Library | `confirmation` | `PurchaseConfirmed.tsx`, `OpenBoughtRecipe.tsx` |
| | Claim form | `claim_form` | `ClaimPurchaseForm.tsx` |
| | Refresh, support, sign in | `checkout_status` | `app/checkout/return/page.tsx` |
| `/checkout/cancel` | Every link | `checkout_cancel` | `app/checkout/cancel/page.tsx` |
| Account | Overview cards, sign out | `account` | `app/account/page.tsx` |
| | Library cards | `library` | `app/account/collections/page.tsx` |
| | Saved recipe cards (with position) | `saved_recipes` | `app/account/saved-recipes/page.tsx` |
| `/support` | Email links, Copy address | `support` | `app/support/page.tsx` |
| About, Privacy, Terms | Inline links | `static_page` | `app/{about,privacy,terms}/page.tsx` |
| 404 and error pages | Home, Support, Try again | `error_page` | `app/not-found.tsx`, `app/error.tsx`, `app/recipes/[slug]/not-found.tsx`, `app/recipes/[slug]/error.tsx` |

Admin pages are not labelled. Analytics never runs there.

## Page context

Two fields go on every browser event, next to `route_key`:

- `content_slug`: worked out from the address by a new `contentSlugFromPath()` in `schema.ts`. `/recipes/<slug>`, `/collections/<slug>`, `/collections/<slug>/plan` and `/stories/<slug>` give the slug; `/halloween` gives `halloween`.
- `access_state`: set by the recipe, collection and plan pages through a new `<TrackPageState accessState="locked" />` client component. `client.ts` stores it with the pathname it belongs to, so it never carries over to the next page.

Plus one PostHog super property, `signed_in`, set in `AnalyticsProvider.tsx` from the auth state and cleared on sign-out.

Code changes: `AnalyticsEnvelope` gets optional `content_slug` and `access_state`. `buildAnalyticsEnvelope` validates them. `PostHogAnalyticsProvider.send` in `provider.ts` adds them to the captured properties.

## Scroll and time milestones

New `src/components/analytics/PageEngagementTracker.tsx`, mounted in `SiteShell.tsx`, reset on every pathname change:

- Scroll depth is `(scrollY + innerHeight) / scrollHeight`, read on load and on scroll (throttled to one read per animation frame). Each depth fires once per page view. Reaching 75% also sends 25% and 50% if they were skipped. A page that fits on one screen sends all four at load.
- Visible time counts only while `document.visibilityState === "visible"`, and sends 15, 30 and 60 seconds.
- Volume: at most 7 extra events per page view. At about 650 page views a month that is about 4,500 events, well inside the free plan's 1M.

## Section and offer views

New `src/components/analytics/ViewTracker.tsx`, mounted in `SiteShell.tsx`, with one IntersectionObserver:

- `[data-track-view]` sends `section_viewed` when its top passes two thirds of the way up the screen. This is the rule `CampaignTracker` uses today.
- `[data-track-offer]` sends `offer_viewed` when half of it is on screen.
- Each element sends once per page view. Offer containers carry `data-track-collection`, and where the page knows them, `data-track-ownership` and `data-track-price-minor`. The Halloween page only has a formatted price string today, so its offers send no `price_minor`.

## Purchase linked to the visitor

Today `checkout_created` and `purchase_confirmed` are written to `private.analytics_exports` under a random `attempt_ref`, with no campaign, and the export is switched off. Changes, all in PR 1:

1. **Browser.** `CheckoutButton.tsx` adds to the `/api/checkout` body `analytics: { distinct_id: posthog.get_distinct_id(), session_id: posthog.get_session_id(), surface, entry_story }`, only when PostHog is active. `entry_story` is read from session storage (`mch_entry_story`).
2. **API.** `app/api/checkout/route.ts` adds `analytics` to `CHECKOUT_FIELDS`. It checks that `distinct_id` and `session_id` are UUIDs, `surface` is `lock_card` or `buy_box`, and `entry_story` matches the slug pattern. Invalid values are dropped silently; analytics must never block a purchase.
3. **Library.** `lib/payments/checkout.ts` passes these values and `campaign.utm_content` to `recordCheckoutMeasurement` in `lib/payments/repository.ts:154`, which calls the new SQL function signature.
4. **Migration** `supabase/migrations/20261015090000_tracking_purchase_link.sql`:
   - New columns on `private.purchase_orders`: `analytics_distinct_id uuid`, `analytics_session_id uuid`, `checkout_surface text` (check: `lock_card`, `buy_box`), `campaign_content text` (check: `^[a-z0-9][a-z0-9_-]{0,39}$`), `entry_story text` (check: the slug pattern).
   - Replace `purchase_orders_campaign_code_check` so it also accepts `story_link`, `instagram_dm` and `comment_dm`. Keep the old codes so existing rows still pass.
   - Drop `private.record_checkout_measurement(UUID, TEXT, BOOLEAN, TEXT)` and create it again with the new optional parameters and the same campaign list. Re-apply the `REVOKE ALL … FROM PUBLIC, anon, authenticated` line for the new signature, as in `20260924010000_phase9_measurement.sql:482`.
   - Replace `private.capture_optional_analytics()` so the `checkout_created` and `purchase_confirmed` payloads also carry `campaign_code`, `campaign_content`, `checkout_surface`, `entry_story`, `collection_slug` (joined from the release) and `$session_id`.
5. **Drain.** `lib/analytics/drain.ts` selects `po.analytics_distinct_id` and `po.user_id`.
   - It uses the visitor's id as `distinct_id` when present, else `attempt_ref` (orders placed before this change).
   - It keeps `$process_person_profile: false` for guest buyers and drops it when the order has a `user_id`, so the purchase lands on the buyer's PostHog profile.
6. **Return page.** `OrderSummaryDto` in `lib/payments/types.ts` gets `analyticsRef` (the order's `analytics_attempt_ref`) for `purchase_confirmation_viewed` in PR 3.
7. **Account closure.** Closing an account sets `analytics_distinct_id` and `analytics_session_id` to null. Add this step to `ops/ACCOUNT-CLOSURE.md`.
8. **Privacy page.** Add one line saying a purchase is linked to the analytics visit that started it. Add the storage keys `mch_entry_story` (in use but not listed today) and `mch_internal`. The owner approves the wording.

## Pull requests

### PR 1: fix what's broken and link purchases

Target: 2026-10-15, before the Halloween posts on about 2026-10-16. Size: medium.

| # | Task | Files |
| --- | --- | --- |
| 1 | `checkout_clicked` always fires. Use `releaseId ?? expected?.releaseId`. Add a required `surface` prop: `lock_card` on the recipe and plan pages, `buy_box` on the collection page. Add `collection_slug` and `surface` to the event | `components/commerce/CheckoutButton.tsx`, `app/recipes/[slug]/page.tsx:409`, `app/collections/[slug]/plan/page.tsx:166`, `components/collections/CollectionDetail.tsx:125`, `events.ts`, `schema.ts`, `sanitize.ts` |
| 2 | Purchase linked to the visitor, and the campaign codes fixed in the database (the section above) | `route.ts`, `checkout.ts`, `repository.ts`, `drain.ts`, `types.ts`, new migration |
| 3 | Mount `CollectionViewTracker` with slug, optional release id and ownership state | `components/commerce/CollectionViewTracker.tsx`, `CollectionDetail.tsx` |
| 4 | Mount `PurchasedLibraryTracker` | `app/account/collections/page.tsx` |
| 5 | Email-code sign-in completion. `verifyOtpAction` sets the `mch_signin_method=email_code` cookie (120 s, same options as the Google callback) before it redirects. `SignInCompletionTracker` accepts any `SignInMethod`, not only OAuth providers. Remove the unreachable call | `app/sign-in/actions.ts`, `lib/auth/oauth.ts`, `components/auth/SignInCompletionTracker.tsx`, `components/auth/SignInForm.tsx:136-141` |
| 6 | Route keys `halloween`, `collections`, `collection_plan`, `collection_series` | `events.ts` (`CanonicalRouteKey`), `schema.ts` (`ALLOWED_ROUTE_KEYS`, `pathToCanonicalRouteKey`), `sanitize.ts` (`ROUTE_KEYS`) |
| 7 | Search and filter events read the result count after the new results load. Remember the pending submit in a ref and send it from an effect on `totalCount` and the search params, like `RecipeCatalogTracker` | `components/recipe/RecipeFilters.tsx` |
| 8 | Admin browsers stay tracked but marked internal. `syncAdminPrivacy` stops calling `opt_out_capturing()` and only sets `localStorage.mch_internal = "1"`. On public pages `AnalyticsProvider` checks that flag or `has_opted_out_capturing()` (only admin ever opted out). If either is set, it calls `opt_in_capturing()` once, `register({ is_internal: true })`, and `setPersonProperties({ is_internal: true })` when signed in | `lib/analytics/posthog.ts`, `components/analytics/AnalyticsProvider.tsx` |
| 9 | Record the new server variables and the privacy line | `ops/PRODUCTION-CONFIG.md`, `ops/ACCOUNT-CLOSURE.md`, `app/privacy/page.tsx` |

Tests:

- `tests/e2e/analytics-contract.spec.ts`: new and changed properties are accepted, and wrong values are rejected.
- `tests/e2e/commerce-events.spec.ts`: tapping Buy on a collection page records `checkout_clicked {surface: buy_box}`, and the page records `collection_view`.
- `tests/e2e/halloween.spec.ts`: `/halloween` records `page_view {route_key: halloween}`.
- `tests/e2e/recipes.spec.ts`: after a search, `result_count_bucket` matches the results on screen.
- A new `tests/e2e/auth-email-analytics.spec.ts`, next to `auth-google.spec.ts`: an email-code sign-in records `sign_in_completed {method: email_code}` on the page it lands on.
- `tests/e2e/admin-privacy.spec.ts`, in the CI job that runs with analytics on: after visiting `/admin`, a public page still sends events and registers `is_internal`.
- New `supabase/tests/database/87_tracking_purchase_link.test.sql`:
  - each of `bio_link`, `story_link`, `instagram_dm` and `comment_dm` is stored, and an unknown code becomes null;
  - the distinct id, session, surface and `utm_content` are stored, and an invalid surface is rejected;
  - the `purchase_confirmed` export payload carries the campaign and surface.

Done when: a live test purchase made from a `comment_dm` link shows in PostHog as `checkout_clicked` then `purchase_confirmed` on the same visitor, with `campaign_code: comment_dm` and `checkout_surface`, and `private.purchase_orders.campaign_code` is `comment_dm`.

### Production steps after PR 1 (owner approval needed)

1. Set `ANALYTICS_EXPORT_ENABLED=true`, `POSTHOG_SERVER_KEY` (the project token) and `POSTHOG_HOST=https://us.i.posthog.com` on the production Vercel project, using the repo's `ops/vercel` login.
2. Switch the database export on: `UPDATE private.analytics_settings SET optional_export_enabled = true, updated_at = now() WHERE singleton = true;`
3. Redeploy, make one live guest test purchase, and check PostHog's live events for `purchase_confirmed`.
4. In PostHog, turn on the internal-users filter (`is_internal = true`) as the default for insights.

### PR 2: labelled clicks, page context, milestones and views

Target: 2026-10-17. Size: large, mostly markup.

| # | Task | Files |
| --- | --- | --- |
| 1 | `describeLink()` | new `lib/analytics/links.ts` |
| 2 | `ClickTracker` and the `cta_clicked` event | new `components/analytics/ClickTracker.tsx`, `SiteShell.tsx`, `events.ts`, `schema.ts`, `sanitize.ts` |
| 3 | Labels on every public page (the table above) | about 40 components |
| 4 | Page context and the `signed_in` super property | `schema.ts`, `client.ts`, `sanitize.ts`, `provider.ts`, `events.ts`, new `components/analytics/TrackPageState.tsx`, `AnalyticsProvider.tsx` |
| 5 | Scroll and time milestones | new `components/analytics/PageEngagementTracker.tsx` |
| 6 | Section and offer views | new `components/analytics/ViewTracker.tsx`, offer containers |
| 7 | Session properties for where a visit came from. `entry_app` is `instagram` when the user agent contains `Instagram`, `facebook` for the other markers in the existing `IN_APP` pattern (`FBAN`, `FBAV`, `FB_IAB`, `FBIOS`), else `browser`. Extend `lib/auth/in-app-browser.ts` with an `inAppBrowserName()` next to `isInAppBrowser()` so sign-in and analytics share one pattern. `has_click_id` is true when `fbclid` or `gclid` is in the address; the value itself is never stored. Both are set once with `register_for_session` | `components/analytics/CampaignCapture.tsx`, `lib/auth/in-app-browser.ts` |
| 8 | A `before_send` hook that removes the `session_id` query parameter (the Stripe session) from `$current_url` and `$referrer` | `lib/analytics/posthog.ts` |
| 9 | Raise the test recorder's limit from 20 to 200 events so tests can read every milestone | `lib/analytics/provider.ts` (`QUEUE_LIMIT`) |
| 10 | Remove the dead `/#house` handler | `components/Navbar.tsx` |

Tests:

- New `tests/e2e/tracking-coverage.spec.ts` visits home, `/recipes`, a free recipe, a locked recipe, `/collections`, `/collections/halloween`, the plan page, `/halloween` and one story. On each, every visible `a` and `button` must sit inside `[data-track-ux]` or `[data-track-ignore]`.
- Spot checks:
  - The header Recipes link gives `cta_clicked {primary_ux: header_nav, cta: recipes, destination_kind: recipes}`.
  - The second home recipe card gives `cta_position: 2`, `target_kind: recipe`.
  - The `/halloween` phone buy bar gives `primary_ux: sticky_bar`.
- Milestones: scrolling to the bottom sends each depth once. Playwright's `page.clock` moves time forward to check 15, 30 and 60 seconds.
- `offer_viewed` fires once per surface per page view.
- Contract tests for every new property.

Done when: the coverage test passes on every listed page, and in PostHog `unlabelled` is under 1% of `cta_clicked` for a week.

### PR 3: funnel detail, sign-in, filters, FAQ, home and errors

Target: 2026-10-20. Size: medium.

| # | Task | Files |
| --- | --- | --- |
| 1 | `paywall_viewed` on the locked branch of the recipe page | `app/recipes/[slug]/page.tsx`, new tracker component |
| 2 | `checkout_failed`. The 409 `already_owned` and `refresh_required` codes map directly, `CHECKOUT_DISABLED` maps to `unavailable`, a failed fetch to `network`, anything else to `server` | `CheckoutButton.tsx` |
| 3 | `checkout_cancelled` with the checked `?book=` slug | `app/checkout/cancel/page.tsx`, new tracker component |
| 4 | `purchase_confirmation_viewed`, once per order (remembered in local storage by `analyticsRef`) | `PurchaseConfirmed.tsx`, `app/checkout/return/page.tsx` |
| 5 | `purchase_claimed` when the claim form succeeds | `components/commerce/ClaimPurchaseForm.tsx` |
| 6 | `sign_in_method_chosen`, `sign_in_code_sent`, `sign_in_failed`. Map the actions' existing error results to `sign_in_error`, and read `?authError=cancelled` or `failed` on load | `SignInForm.tsx`, `app/sign-in/page.tsx` |
| 7 | `recipe_filter_value_applied` | `RecipeFilters.tsx` |
| 8 | `faq_opened`, from a `toggle` listener in the capture phase (toggle events don't bubble) on `details[data-track-faq]` | `ClickTracker.tsx`, `CollectionDetail.tsx`, `CampaignQuestions.tsx` |
| 9 | `room_closed`, `sample_interacted` | `HouseExplorer.tsx`, `RoomSamples.tsx`, `StorybookSample.tsx` |
| 10 | `not_found_viewed`, `load_failed`, `save_failed`, `empty_state_viewed`, and `capture_exceptions: true` in the PostHog setup | the 404 and error pages, `app/recipes/page.tsx`, `HomeRecipes.tsx`, `SaveRecipeButton.tsx`, `Bookcase.tsx`, `CollectionDetail.tsx`, `posthog.ts` |
| 11 | Remove `homepage_preview_viewed` | `events.ts`, `schema.ts`, `sanitize.ts`, tests |

Tests: one recorder test per new event, and contract tests for every new property.

### PR 4: retire the old events

After 2026-11-30, compare counts of `cta_clicked` against `story_action_clicked` and `homepage_cta_clicked` for the same taps. If they agree within 2%:

- remove the old events, the click handling in `CampaignTracker.tsx` and the event in `TrackedHomepageLink.tsx`;
- replace `story_section_viewed` with `section_viewed`.

## PostHog setup after PR 2

Dashboard "Instagram to sale", all insights from 2026-10-15 with the internal-users filter on:

1. Funnel: `page_view` (`halloween` or `story`), then `offer_viewed`, then `checkout_clicked`, then `purchase_confirmed`. Broken down by `campaign_code`.
2. Sales by `checkout_surface` and by `campaign_content` (which post).
3. Clicks: `cta_clicked` by `primary_ux` and `cta`, filtered by `route_key`.
4. Offer click-through: `offer_viewed` against `checkout_clicked`, by `surface`.
5. Reading depth: `page_scroll_reached` by `route_key` and device.
6. Sign-in funnel: `sign_in_started`, then `sign_in_method_chosen`, then `sign_in_completed`.
7. Problems: `not_found_viewed`, `checkout_failed`, `load_failed`, `$exception`.

## Checks for every PR

From `my-curated-haven-web/`:

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npx playwright test analytics analytics-contract commerce-events collections halloween recipes stories --workers=1
```

From the repo root, for PR 1:

```bash
supabase test db
```

Then by hand: send a link in an Instagram DM, open it in Instagram's browser on an iPhone and on an Android phone, tap through to Buy, and watch the events arrive in PostHog's live view.

## Open decisions

1. Wording of the privacy page line about linking purchases to the analytics visit (owner).
2. Switching on the server export in production (owner).
3. Whether a page that fits on one screen should count as read to 100%. Default: yes.
4. Paid Instagram ads. If they start, add `utm_medium=paid_social` and ad campaign codes in a separate change.
5. Retirement date for the old events. Default: 2026-11-30.

## Out of scope

- Cooking-progress events (skipped 2026-10-14).
- Ad pixels, Meta Conversions API, Google tags. The privacy page says the site shows no advertising.
- A consent banner (accepted risk M9-01 in `docs/audit/AUDIT-BACKLOG.md`).
- Search text.
