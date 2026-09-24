# Phase 9 implementation evidence

Status: implemented, optional export disabled by default.
Branch: `phase-9-analytics-measurement`
Provider account: not provisioned. `NEXT_PUBLIC_ANALYTICS_ENABLED` must be `true` and `NEXT_PUBLIC_APP_ENV` must be `staging` or `production` before any remote capture.
Instagram aggregate source: unavailable (`credential_missing`). No Instagram credential is stored in this repo.

## Source inventory

| Question | Source | Unit | Window | Blind spot |
| --- | --- | --- | --- | --- |
| Which placement brought a consented visit? | Browser campaign registry plus `private.purchase_orders.campaign_code` | Registered campaign code | Current consented session | Declined visitors and untagged in-app browsers stay unknown |
| Are the free recipes opened? | `recipe_open` where `access_kind=free` | Consented session | UTC day | A render is not a cooked meal. Native print shortcuts are not events |
| Did checkout get paid? | `private.provider_payments` via `private.founder_commerce_totals` | Order, minor units | Provider occurrence time, labelled UTC | Optional analytics coverage is not the order count |
| Was access delivered? | `paid_without_access` on the same function | Order | Same | Pending age still needs an operator alert route |
| Did a purchaser return? | Consented `recipe_open` or `purchased_library_open` on a later UTC day | Browser id | Mature 7-day cohort | Sign-out resets the browser id, so returns are undercounted |
| What did Instagram reach? | `private.instagram_aggregate_snapshots` | Post-level aggregate | Source window, not summed lifetime snapshots | Empty table means unavailable, not zero |

Owners for the weekly read: founder for the product decision, engineering for export health and access delivery. First live review date is unset until a staging analytics project exists. The fixture review below is the rehearsal.

## What shipped

- Raw `public.search_analytics` is revoked from `anon` and `authenticated`. Migration `20260924000000_phase9_analytics_security.sql`.
- Event contract, consent banner, withdrawal, and browser instrumentation for recipe, account, and checkout clicks.
- Campaign values persist only when source, medium, campaign, and optional content are on the registry.
- Checkout stores an opaque `analytics_attempt_ref`, not an email. Unknown campaign codes are dropped.
- `private.analytics_exports` records checkout, purchase, access, and successful refund transitions. Payloads omit support references and provider ids. Pending refunds do not create a refund export.
- Optional export defaults off (`private.analytics_settings.optional_export_enabled = false`). Withdrawal marks queued rows `suppressed`. The order ledger stays.
- `private.preview_amount_summary` encodes the reconciliation fixture: captured 1000 + 1500 + 2000, succeeded refunds 300 + 1500, pending refund ignored. Expected 3 orders, 4500 captured, 1800 refunded, 2700 captured less refunds.
- Remote PostHog capture and the server drain stay off unless the environment is explicitly staging or production and the host is not the production project host.

## Rehearsed review

| Field | Entry |
| --- | --- |
| Question | Does the commerce summary keep unpaid-looking pending refunds out of the refund total? |
| Observation | Fixture `preview_amount_summary(ARRAY[1000,1500,2000], refunds 300 succeeded, 1500 succeeded, 100 pending)` returns 3 / 4500 / 1800 / 2700. |
| Confidence limits | Synthetic fixture. Instagram source unavailable. No live PostHog project. |
| Proposed action | Keep the export switch off until a staging PostHog project and spend ceiling are named. |
| Guardrail | Checkout, entitlement, and refund SQL keep working when analytics is disabled. |
| Owner and review date | Founder, after the staging project exists. |
| Result | Fixture matches the contract. No product change from this rehearsal. |

## Not live

- PostHog project, region, and spend ceiling.
- Scheduled Instagram read. The website does not call Instagram.
- A named paging route for paid-without-access older than five minutes. The count exists on `founder_commerce_totals`.
- Mobile Safari and Instagram in-app browser payload inspection. CI covers Chromium and WebKit automated browsers only.
