# Measurement and event contract

## Shared envelope

Every optional event has `event_id`, `event_name`, `schema_version`, `occurred_at`, `environment`, `source` and a validated property object. Browser events additionally use a random consented `browser_id`, `session_id`, canonical `route_key` and consent-policy version. Use UTC storage. Record server receipt time separately from the untrusted browser clock.

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
| `sign_in_completed` | Browser, verified server success response | `entry_point` |
| `recipe_save_changed` | Browser, successful server mutation response | `recipe_id`, `action=saved/removed` |
| `collection_view` | Browser, actual saleable collection detail rendered | `collection_release_id` |
| `checkout_clicked` | Browser, explicit buy action | `collection_release_id`, `entry_point` |
| `checkout_created` | Server, Phase 8 checkout session stored successfully | `collection_release_id`, opaque analytics `attempt_ref` |
| `purchase_confirmed` | Server, validated paid transition committed | opaque `order_ref`, release, `currency`, `paid_minor` |
| `purchase_access_activated` | Server, paid order's access first becomes available | opaque `order_ref`, release, `activation_delay_bucket` |
| `refund_confirmed` | Server, successful refund adjustment committed | opaque `refund_ref`, `order_ref`, `currency`, `refunded_minor` |
| `purchased_library_open` | Browser, owned collection library rendered | `collection_release_id` |

Browser sign-in and save events are observations for UX reporting, not an audit trail. Server payment events exported to optional analytics require eligible consent and a valid anonymous attribution link. Their authoritative counterparts always remain in the Phase 8 ledger. Opaque analytics references are random mappings, not emails or reversible provider IDs, and remain restricted.

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
