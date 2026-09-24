# Customer experience and route contracts

## The intended journey

A visitor arrives from Tiny Soho, reads free recipes, reviews one collection and chooses to buy. Sign-in establishes the account receiving access. Stripe hosts payment. The return page reports the order's verified state. The account library becomes the stable destination for purchased recipes.

Reuse Phase 3 typography, spacing, buttons and cream/terracotta/sage tokens. This phase does not redesign the whole site. Prioritise clear price, contents and status over promotional animations. Reuse Phase 6 recipe discovery and printable layouts.

## Proposed routes

Resolve final names against the implemented Phase 6/7 route tree. Avoid duplicate library or sign-in flows.

| Route | Audience | Behaviour |
| --- | --- | --- |
| `/collections/[slug]` | Public | Approved product details and safe preview metadata |
| `/sign-in?returnTo=...` | Visitor | Existing Phase 7 flow, with a validated local collection destination |
| `POST /api/checkout` | Verified account | Reserve/reuse attempt and create hosted Session |
| `/checkout/return?session_id=...` | Owner after sign-in | Status lookup, never ownership by URL possession |
| `/checkout/cancel` | Returning visitor | Explain checkout was left, retrieve owned status if available |
| `GET /api/orders/[orderId]/status` | Verified owner | Minimal private order/fulfilment DTO |
| `POST /api/orders/[orderId]/refresh` | Verified owner | Rate-limited canonical recheck through the existing worker pathway |
| `/account/collections` | Verified account | Owned library, pending purchases and support entry |
| `/account/collections/[releaseId]` | Verified owner | Purchased release list and authorised recipe links |
| `/recipes/[slug]` and existing print route | Visitor or owner | Three free bodies for all, paid bodies for valid grants |
| `POST /api/stripe/webhook` | Stripe | Signature verification and durable event receipt |

Return/status/account routes use private, no-store responses. The public collection page contains no owner-specific HTML in shared caches. Load personalised ownership through a private boundary or make the whole personalised response private.

## Sales page requirements

Show the approved recipe list or preview list, total count, free overlap, one-time price/currency, tax treatment, printable-page inclusion, access duration, update policy, refund summary and support destination. Link the three full samples. Do not show unresolved placeholders on the live purchase page.

Suggested truthful labels after C01–C14 close: “One-time purchase”, “Includes printable recipe pages”, “Sign in to keep your recipes in your account”, “Open your collection”. Do not promise all future recipes, lifetime access or nutrition outcomes without approved support.

| Viewer state | Primary action |
| --- | --- |
| Signed out | Sign in to buy |
| Signed in, no entitlement, healthy checkout | Buy collection with approved price |
| Active access from any verified source | Open your collection |
| Unresolved prior payment attempt | Resume checkout or check payment, based on provider state |
| Ownership lookup unavailable | Retry access check, with Support |
| Release retired/unlisted for sale | Not available for new purchase, owners retain library entry |
| Commercial configuration incomplete | Purchase unavailable, free samples remain usable |

## Sign-in boundary

After authentication, return to the same collection. Revalidate sale availability, price and ownership. If terms or price changed while sign-in was underway, show the updated offer and require an explicit buy action. Do not automatically start a charge after a long authentication detour.

Display the account receiving access before redirecting to Stripe. Keep email display private and masked where suitable. Changing the billing/receipt email inside Checkout does not change the product account. For account switching, cancel local pending UI, refetch owner state and avoid leaking the previous account's order.

## Hosted Checkout

Stripe supplies the payment form. Configure approved logo, colours, business identity, return behaviour and supported methods. The site supplies the surrounding product and recovery screens. Do not build card-number, security-code or wallet-token inputs in My Curated Haven.

Show progress while creating a Session, prevent repeated local clicks and provide a recovery action after a timeout. Server idempotency remains required even with a disabled button. Open the returned provider URL through a top-level navigation. Do not use an embedded browser popup as a requirement.

Keep checkout return origins fixed in server configuration. Never pass arbitrary user URLs to Stripe. Display payment-method availability only where supported, not as an unconditional wallet guarantee.

## Return and pending states

| Authoritative result | Customer message and action |
| --- | --- |
| Verified paid and active access | Purchase confirmed. Open your collection. |
| Verified paid, access pending | Payment received. We are preparing your access. Check again or contact Support. |
| Provider payment processing | Payment is still processing. Check status later. |
| Open unpaid Session | Payment is not complete. Resume your checkout. |
| Expired unpaid Session | Checkout expired. Return to the collection to try again. |
| Binding mismatch or review hold | We need to review this payment. Contact Support with your reference. |
| Temporary backend failure | We cannot check the payment right now. Retry status, avoid another purchase. |
| Unknown or other account's order | Neutral unavailable result, sign-in/account guidance without order details |

The wording above is draft UI copy for implementation review. A successful redirect alone must never show “Purchase confirmed”. Poll the owned status endpoint with bounded backoff for up to 60 seconds, then offer manual refresh and the account library. Do not poll indefinitely or trigger a new payment.

If a signed-out customer returns, use the Phase 7 sign-in flow and retain only a validated opaque reference. Recheck ownership after sign-in. Never disclose payment details from an unauthenticated Session ID lookup.

## Cancellation and recovery

Returning through the cancel route does not mark the provider payment cancelled. A second tab or delayed method still might complete. Retrieve current owned state before offering retry. Only permit a replacement after canonical provider checks resolve the previous attempt, as defined in checkout implementation.

The user should also recover through `/account/collections` without the original checkout URL. List paid/access-pending orders with a neutral support reference. Do not require the Stripe receipt link to prove ownership.

## Reading, printing and account changes

Use existing recipe pages with the same filtering and print patterns. Print controls appear only when the full recipe is authorised. Keep the purchase banner out of an owner's print output. A purchased collection is not a separate copy of the recipe database.

After sign-out or account switch, clear private component/query state. Browser Back must not display a reusable previous-user payload. If access expires or is revoked, subsequent reads show the correct state. Previously printed/downloaded content is not remotely retractable.

## Accessibility and mobile checks

Test 320, 390 and desktop widths with existing Phase 3 rules. Keep price and primary action visible without overlapping content or safe areas. Provide visible focus, meaningful button names, readable errors, non-colour status cues and appropriate live-region announcements for changing payment state. Avoid repeatedly announcing polling updates.

Check iOS Safari, Android/desktop Chromium and the Instagram in-app browser, including switching to email for sign-in and returning from a wallet. Preserve free reading under auth, payment-provider and optional analytics outages.
