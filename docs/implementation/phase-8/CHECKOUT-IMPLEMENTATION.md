# Checkout implementation

## Stripe setup inventory

Record the business account identifier, test/live mode, provider SDK version, pinned API version, event destination version, approved origins, Product/Price mapping and enabled payment methods. Verify payout readiness separately from successful customer payment. Access follows verified payment, not the later transfer to the owner's bank.

Create a sandbox one-time Product/Price first. Live activation waits for C01–C14 and the release gates. Stripe hosts payment collection and supplies supported branding controls. My Curated Haven supplies product details and recovery UI. No custom card-handling code is needed.

Proposed server-only configuration:

| Setting | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server provider API authentication |
| `STRIPE_WEBHOOK_SECRET` | Signature verification for this environment's endpoint |
| `STRIPE_EXPECTED_ACCOUNT_ID` | Provider account verification |
| `STRIPE_EXPECTED_LIVEMODE` | Reject cross-mode objects |
| `COMMERCE_DATABASE_URL` | Restricted server database connection |
| `COMMERCE_WORKER_SECRET` | Authentication for the chosen scheduled worker transport |
| `CHECKOUT_ENABLED` | Stop new purchase attempts without stopping fulfilment |
| `APP_ORIGIN` | Fixed approved return origin |

Use the host secret store. `.env.example` contains names and descriptions only. A minimal hosted redirect flow does not need a Stripe publishable key or Stripe.js. Add either only for a documented frontend requirement.

## POST checkout request

Proposed input: collection slug or approved release ID plus a bounded request token. Optional consented campaign context follows Phase 9's allowlist. Reject unknown fields. Never accept owner ID, price amount, currency, Stripe Price ID, quantity, arbitrary URLs or an entitlement flag from the browser.

1. Validate request shape, content type, origin/CSRF controls and rate limits.
2. Verify current account identity and checkout eligibility through Phase 7.
3. Resolve the approved live commercial offer on the server.
4. Check current access from every source. Existing owners receive `already_owned`.
5. Refuse checkout if ownership queries fail or the release fails readiness checks.
6. Under a user/release lock, inspect unresolved attempts. Reuse or recover an existing attempt before creating another.
7. Persist a new order attempt, immutable snapshot, terms acceptance record and provider idempotency key.
8. Outside the SQL transaction, create the Stripe Session using server-owned values.
9. Verify response mode/account/references and persist the Session binding.
10. Return only a validated hosted URL and opaque order reference, with private/no-store headers.

Validate local origins against fixed configuration, not forwarded host headers. Rate-limit authenticated checkout by owner and relevant abuse signals. A local disabled button does not provide server protection.

## Session configuration contract

Use `mode=payment`, a single approved one-time Price and quantity one. Use hosted checkout for the pinned API version. Verify exact SDK enum names against current documentation rather than copying an obsolete `ui_mode` value. Avoid adjustable quantity, promotions, shipping collection and future-usage card storage for launch.

Use a server-generated opaque order ID in `client_reference_id` and minimal metadata. Include an immutable offer/release reference where needed. Avoid names, child data, recipe bodies, email addresses or credentials in metadata. Keep the authoritative owner binding local. Metadata alone never proves ownership.

Use approved fixed-origin success/cancel destinations. The success route receives the documented Session placeholder solely for lookup. Persist a minimal customer mapping only if needed. Prefilled billing email comes from the verified account, but changes to receipt details never change local ownership.

Tax settings follow C04. If tax is exclusive, the final total includes a provider-calculated tax component. If inclusive, use the approved inclusive price semantics. Verify the configured tax behaviour, currency and calculation completion. Do not compare final total to base price blindly or silently enable tax assumptions.

## Provider idempotency and unknown outcomes

The provider key identifies one local order attempt, not the customer forever. Retry the same attempt with the same body/key after a timeout. A changed request uses a new attempt only after resolving the previous one. Bound the automatic retry window within the provider's documented idempotency retention, reverified during implementation.

If Session creation succeeded but the local save failed, mark or retain `creation_unknown`. Recover through the original key within its safe window, verified events referencing the order or a canonical provider lookup. Do not create a new Session merely because the website did not receive a response.

Beyond a safe retry window, hold the attempt for reconciliation. Do not reuse an old pruned key blindly because the provider might treat the call as new. Do not infer absence from an eventually consistent search result. Record evidence before releasing the reservation.

## Resuming and replacing attempts

An unpaid open Session is reused while eligible. If the commercial offer changes, either honour its immutable snapshot or expire the old Session through a reviewed transition before showing a new offer. Initial recommendation: honour valid existing snapshots unless a safety/configuration incident requires stopping them.

Before replacing, retrieve the Session and related payment state. If open, expire through the provider API and then recheck for concurrent completion. If processing or paid, do not offer a new checkout. If conclusively expired/unpaid with no unresolved payment, close the attempt and release the reservation. Store reason and verification time.

An eventual duplicate successful charge still requires an operational path. Grant access once, retain both financial records and flag the duplicate for review/refund under policy. Do not erase the second payment to satisfy a uniqueness assumption or silently keep the duplicate charge.

## Server outcomes

| Result | HTTP/DTO intent | UI |
| --- | --- | --- |
| New or reusable Session | Success with safe hosted URL | Navigate to Checkout |
| Already owned | Successful ownership result | Open collection |
| Existing unresolved attempt | Conflict/pending with owned reference | Check existing payment |
| Not signed in | Auth required | Sign in with safe return |
| Invalid request | Validation failure | Correct request without provider call |
| Rate limited | Throttled with bounded retry advice | Wait and retry |
| Offer unavailable | Not saleable | Keep free samples available |
| Ownership/provider/DB outage | Retryable unavailable | No new charge attempt |

Choose exact HTTP codes in the handler contract and test them consistently. Never expose raw provider or SQL errors to the browser.

## Readiness checks

Validate the Price's active status, positive amount, currency, one-time type, product identity and mapping to the frozen release. Check manifest approval, all paid members' publication/readiness, all three free slots, terms version and receipt/support configuration. Fetch fresh provider configuration at release and detect drift through operational checks. A changed dashboard setting should disable new checkout until reviewed, not silently change the offer.

## Primary references

- [Checkout Session creation](https://docs.stripe.com/api/checkout/sessions/create)
- [Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Expire a Checkout Session](https://docs.stripe.com/api/checkout/sessions/expire)
- [Checkout customisation](https://docs.stripe.com/payments/checkout/customization)
- [API key practices](https://docs.stripe.com/keys-best-practices)

These references support provider mechanics. Account binding, reservation policy and commercial gates above are project design decisions.
