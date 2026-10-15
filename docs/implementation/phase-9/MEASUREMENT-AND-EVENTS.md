# Measurement and event contract

## Shared envelope

Every optional event has `event_id`, `event_name`, `schema_version`, `occurred_at`, `environment`, `source` and a validated property object. Browser events additionally use a random consented `browser_id`, `session_id`, canonical `route_key` and consent-policy version. Since 2026-10-15 they also carry page context when the page has it: `content_slug` (the recipe, book, plan or story slug from the address; `/halloween` gives `halloween`) and `access_state` (`free`, `locked`, `owned`, `preview`). Use UTC storage. Record server receipt time separately from the untrusted browser clock.

Start a new session after 30 minutes of inactivity. Persist the random browser identifier for up to 90 days only while consent remains accepted. These are proposed product defaults, pending the retention decision. Never fingerprint a visitor to recover missing identity. One browser is not one person. Signing out resets the optional identity.

`environment` and server-event ownership are assigned by trusted deployment configuration. Do not accept a client-supplied `source=server`. Extra fields are rejected, not silently forwarded.

Allowed common dimensions: registered campaign code, canonical route category, coarse device class, recipe UUID, collection release UUID and bounded outcome enums. Recipe IDs describe content interactions, not a child's health or diet. No recipe bodies, names of children, family profiles, emails, auth UUIDs, payment-provider customer IDs, raw search strings, exact dietary selections, full referrers or query strings enter the optional provider.

## Initial events

| Event | Producer and precise trigger | Allowed event properties |
| --- | --- | --- |
| `page_view` | Browser, completed navigation to an allowlisted product route | `route_key`, coarse `device_class` |
| `recipe_list_view` | Browser, list rendered, once per navigation | `result_count_bucket`, `listing_kind` |
| `recipe_open` | Browser, authorised full recipe content rendered | `recipe_id`, `access_kind=free/paid` |
| `recipe_search_submit` | Browser, deliberate submitted search and results available | `result_count_bucket`, `zero_results` |
| `recipe_filter_apply` | Browser, changed filters applied and results available | `active_filter_count`, `result_count_bucket` |
| `recipe_print_requested` | Browser, explicit print control activated | `recipe_id`, `access_kind` |
| `sign_in_started` | Browser, sign-in flow opened | `entry_point` |
| `sign_in_completed` | Browser, verified server success response | `entry_point`, `method` (`email_code` \| `google`) |
| `recipe_save_changed` | Browser, successful server mutation response | `recipe_id`, `action=saved/removed` |
| `collection_view` | Browser, collection page rendered, once per page view | `collection_slug`, optional `collection_release_id` (absent while nothing is on sale), optional `ownership_state` (`owned` \| `not_owned` \| `unauthenticated` \| `pending_payment` \| `unavailable`) |
| `checkout_clicked` | Browser, Buy tapped, before the checkout request | `collection_slug`, `surface` (`lock_card` on a locked recipe or plan page \| `buy_box` on the collection page), optional `collection_release_id` |
| `checkout_created` | Server, Phase 8 checkout session stored successfully | `collection_release_id`, opaque analytics `attempt_ref`, plus the visit context below |
| `purchase_confirmed` | Server, validated paid transition committed | opaque `order_ref`, release, `currency`, `paid_minor`, plus the visit context below |
| `purchase_access_activated` | Server, paid order's access first becomes available | opaque `order_ref`, release, `activation_delay_bucket` |
| `refund_confirmed` | Server, successful refund adjustment committed | opaque `refund_ref`, `order_ref`, `currency`, `refunded_minor` |
| `purchased_library_open` | Browser, owned collection library (`/account/collections`) rendered | optional `collection_release_id` |
| `make_ahead_plan_open` | Browser, a buyer's full make-ahead plan rendered (`/collections/halloween/plan`, added 2026-10-14). Not sent for the locked preview or for admins | `collection_release_id` |

Browser sign-in and save events are observations for UX reporting, not an audit trail. Server payment events exported to optional analytics require eligible consent and a valid anonymous attribution link. Their authoritative counterparts always remain in the Phase 8 ledger. Opaque analytics references are random mappings, not emails or reversible provider IDs, and remain restricted.

Since 2026-10-15 the Buy button sends the visit behind the tap with checkout, only while analytics is on: the PostHog distinct and session ids (UUIDs only), the `surface` and the Instagram landing page the session started on (`entry_story`, a slug). The server keeps the well-formed values and drops the rest without refusing the checkout. With the registered campaign's `utm_content` (`campaign_content`), they are stored on the order (`private.purchase_orders`: `analytics_distinct_id`, `analytics_session_id`, `checkout_surface`, `campaign_content`, `entry_story`; migrations `20261014220000` and `20261015090000`). The visit context added to `checkout_created` and `purchase_confirmed` is `collection_slug`, `campaign_code`, `campaign_content`, `checkout_surface`, `entry_story` and `$session_id`; absent values are left out. The server sends these events under the stored distinct id, with the export row id as the event `uuid` (a retry is not counted twice) and the time the transition happened as the event time. Guest orders stay personless (`$process_person_profile: false`); a signed-in buyer's purchase joins their PostHog person. Orders without a stored id fall back to the opaque reference.

### Tracking events (2026-10-15)

Added by the tracking plan (`docs/implementation/tracking/PLAN.md`), PRs 1 to 3. Values are checked by property name in `src/lib/analytics/sanitize.ts`; a name keeps one value set across events (the checkout events accept only the two Buy surfaces of the five `surface` values).

| Event | Producer and precise trigger | Allowed event properties (`*` required) |
| --- | --- | --- |
| `cta_clicked` | Browser, any link or button tapped on a public page (one capture-phase listener, labels from `data-track-*`) | `primary_ux`*, `link_type`* (`internal` \| `external` \| `anchor` \| `action`), `cta`, `cta_position` (1 to 50), `destination_kind` (a route key, `checkout`, `anchor`, `email`, `instagram`, `stripe`, `external`, `other_page`, `none`), `target_kind` (`recipe` \| `collection` \| `plan` \| `series` \| `story`), `target_slug` |
| `section_viewed` | Browser, a `data-track-view` block's top passes two thirds up the screen, once per page view | `primary_ux`* |
| `offer_viewed` | Browser, an offer is half on screen, once per surface and book per page view | `surface`* (`lock_card` \| `buy_box` \| `sticky_bar` \| `book_card` \| `story_offer`), `collection_slug`*, `ownership_state`, `price_minor`, `currency` |
| `page_scroll_reached` | Browser, the page passes a depth, once each per page view | `depth`* (25 \| 50 \| 75 \| 100) |
| `page_time_reached` | Browser, visible time on the page | `seconds`* (15 \| 30 \| 60) |
| `paywall_viewed` | Browser, a locked recipe page loads | `recipe_id`*, `collection_slug` |
| `checkout_failed` | Browser, Buy fails before Stripe opens | `collection_slug`*, `surface`* (`lock_card` \| `buy_box`), `checkout_error`* (`already_owned` \| `refresh_required` \| `unavailable` \| `network` \| `server`) |
| `checkout_cancelled` | Browser, `/checkout/cancel` loads | `collection_slug` (only from a well-formed `?book=` slug) |
| `purchase_confirmation_viewed` | Browser, "You're in" shown (each showing; count distinct `order_ref`) | `order_ref`*, `collection_slug`* |
| `purchase_claimed` | Browser, a guest unlocks an order with the emailed code | `collection_slug` |
| `sign_in_method_chosen` | Browser, Continue with Email or Google tapped | `method`*, `entry_point`* |
| `sign_in_code_sent` | Browser, the sign-in code email is sent (not on resend) | `entry_point`* |
| `sign_in_failed` | Browser, sending the code, checking it, or Google sign-in fails | `sign_in_step`* (`send_code` \| `verify_code` \| `google`), `sign_in_error`* (`invalid_code` \| `expired_code` \| `rate_limited` \| `bot_check` \| `cancelled` \| `unknown`) |
| `recipe_filter_value_applied` | Browser, one per value when Apply Filters is tapped | `filter_kind`* (`meal` \| `diet` \| `time`), `filter_value`* (the fixed filter slugs) |
| `faq_opened` | Browser, a `details[data-track-faq]` question opens | `primary_ux`*, `question_key`* |
| `room_closed` | Browser, a room on the home page closes | `feature_key`*, `seconds_bucket`* (`under_10s` \| `10_to_30s` \| `over_30s`) |
| `sample_interacted` | Browser, storybook story or style picked, nursery stamp, shelf reveal | `sample`*, `choice` (a fixed option slug, never the typed name) |
| `not_found_viewed` | Browser, a 404 page shows | `route_class`* (`recipe` \| `collection` \| `story` \| `other`) |
| `load_failed` | Browser, a recipe list, page or price lookup fails | `primary_ux`* |
| `save_failed` | Browser, saving a recipe fails or gets no answer | `recipe_id`* |
| `empty_state_viewed` | Browser, no search results, an empty bookcase, a book not on sale yet | `primary_ux`* (`empty_state`) |
| `$exception` | Browser, PostHog error tracking (`capture_exceptions: true`) | PostHog's own |

Retired 2026-10-15 with the release (tracking PR 4): `story_action_clicked` and `homepage_cta_clicked` (their taps are `cta_clicked`) and `story_section_viewed` (now `section_viewed`); the validator refuses them. `story_view` and `homepage_preview_opened` stay. PostHog insights built on the retired events must be switched to the new ones (mapping in PR 4's description).

`page_view` also has the route keys `halloween`, `collections`, `collection_plan` and `collection_series`. `sign_in_completed` is recorded for email codes as well as Google, on the page the sign-in lands on. `homepage_preview_viewed` is removed.

PostHog's own properties: the `before_send` hook removes `session_id` (the Stripe checkout session) and `q` (search text) from every address on an event, and `mask_personal_data_properties` masks ad click ids (`fbclid`, `gclid`, `igshid`, …) wherever PostHog records them. Session properties `entry_app` (`instagram` \| `facebook` \| `browser`) and `has_click_id` are set once per session; `signed_in` and, in admin browsers, `is_internal` are super properties.

Do not implement `recipe_cooked`, `print_completed`, `meal_eaten` or a child's preference. The current app does not observe these outcomes. A locked preview does not produce `recipe_open`. A future explicit feedback feature requires a separate contract.

## Deduplication and delivery

Generate a new browser event ID for each real action. Keep the ID when retrying the same event. Deduplicate navigation views using navigation identity plus event name, not recipe ID forever. Cap the in-memory retry queue at 20 events and expire entries after five minutes. Drop optional events when disabled, consent is withdrawn or retries are exhausted.

For server events, derive a durable uniqueness key from environment, order or refund identity and semantic transition. Webhook event ID alone is insufficient because several provider events might describe the same payment. A replay of the same transition reuses its export ID. A later refund is a distinct transition.

Record exported, pending, failed and suppressed-by-consent separately. Reconcile against the ledger, never rebuild purchase truth from a third-party event count. Backfilled business events retain their original occurrence time, include ingestion time and are labelled backfilled. Do not invent historical browser activity.

## Metric definitions

All behavioural rates below use consented, valid browser observations and exclude known test traffic. Use the same session population for numerator and denominator.

| Metric | Definition | Interpretation limit |
| --- | --- | --- |
| Free recipe reach | Distinct sessions with at least one free `recipe_open` | Observed sessions, not all visitors |
| Recipe engagement rate | Sessions with free `recipe_open` divided by sessions with product `page_view` | A render does not prove cooking |
| Print request rate | Sessions requesting print divided by sessions opening that recipe | Native print shortcuts and cancelled dialogs are unknown |
| Search zero-result rate | Submitted searches with zero results divided by submitted searches | Counts searches, not people |
| Save success participation | Sessions with a confirmed save divided by signed-in observed sessions opening a recipe | Requires Phase 7 and reliable session state |
| Same-session collection-to-checkout rate | Sessions with collection view then checkout created, divided by sessions with collection view | Use ordered steps, one count per session |
| Checkout-to-paid rate | Unique attempts created in a cohort that paid within seven days divided by unique attempts created in that cohort | Ledger metric, cohort matures after seven days |
| Observed end-to-end conversion | Sessions with free recipe open then checkout created and linked paid order within seven days, divided by sessions with free recipe open | Same acquisition session, delayed payment allowed, no cross-device claim |
| Paid access delivery rate | Confirmed orders whose entitlement became available divided by confirmed orders | Display pending age and failures separately |
| Seven-day return usage | Eligible browser IDs with recipe/library usage on a later UTC day within seven days divided by browser IDs first opening a recipe in the cohort | Mature cohorts only, browser identity resets undercount returns |

For seven-day return usage, require a complete seven-day observation window before including a cohort in the denominator. Show the exact calendar interval and keep incomplete cohorts labelled provisional. A later same-day visit is not a seven-day return under this definition.

Record captured and refunded amounts in integer currency minor units. Never assume every currency has two decimal places. Gross captured amount, successful refunds and captured amount less refunds are separate measures. Tax, fees, disputes and bank payouts require their own reconciled definitions. Do not label captured amount less refunds as profit or accounting revenue.

Refund rate by order is distinct orders with successful refunds divided by paid orders in a purchase cohort, with the observation cutoff shown. Display partial and full refunds separately. A refund requested or failed is not a successful refund. Never sum several currencies into one total without an explicit exchange-rate methodology.
