# Phase 8 remediation plan

Status: plan only. This document does not change application code, tests, or the live database.

Reviewed on 2026-09-23 against `main` at `8fbb876` (`docs(phase-7): add the accounts remediation plan`). The live project `ccrgvammglkvdlaojgzv` does not have `private.purchase_orders`. Phase 8 commerce SQL has not been applied there. Do not apply `supabase/migrations/20260923200000_phase8_commerce_schema.sql` until P8-R1 and P8-R2 are in the deployed web app. The live catalog still has no paid release. The $15 figure in tests and evidence is a fixture, not a launch price.

## Goal

Make checkout fail closed unless Stripe has verified the payment, grant access only when the captured money matches the stored offer, and keep sale disabled until the paid recipe set is chosen. The evidence file must not be treated as proof of the release-blocking cases.

## P8-R1: require a Stripe signature

`my-curated-haven-web/src/app/api/stripe/webhook/route.ts` verifies the body only when `isStripeConfigured()` is true and `stripe-signature` is present. Any other request is parsed as JSON and passed to `processStripeWebhookEvent`. A `checkout.session.completed` body with `payment_status: "paid"` can call `recordPaymentAndGrantAccess`.

Work:

1. If `STRIPE_SECRET_KEY` is set, a missing or invalid `stripe-signature` returns 400 and writes no ledger row and no entitlement.
2. In production (`VERCEL_ENV=production`), never parse an unsigned body, even when the secret key is absent.
3. Keep the unsigned fixture path only for local tests, and only when `VERCEL_ENV` is unset and Stripe is not configured.
4. Do not include the signature-verification error text from Stripe in the response body beyond a fixed `invalid signature` message.

Acceptance:

- A POST with no `stripe-signature` and a fake `checkout.session.completed` does not change `private.purchase_orders`, `private.provider_payments`, or `public.access_entitlements`.
- A POST with a bad signature does the same.
- A correctly signed event still reaches the existing handler.

## P8-R2: no mock grant in production

`getStripeConfig` treats checkout as enabled unless `CHECKOUT_ENABLED` is the string `false`. `isStripeConfigured` is false when `STRIPE_SECRET_KEY` is missing or contains `mock_dummy`. `reconcileAndFulfillSession` in `my-curated-haven-web/src/lib/payments/fulfilment.ts` then grants access on return without a payment.

Work:

1. Production checkout stays off unless `CHECKOUT_ENABLED=true` and `isStripeConfigured()` is true.
2. The mock branch that calls `recordPaymentAndGrantAccess` from the return path must not run when `VERCEL_ENV` is `production` or `preview`.
3. A signed-out `POST /api/checkout` stays 401. That check already exists in `src/app/api/checkout/route.ts`. Do not trust `userId`, amount, price, or currency from the body. The route already rejects unknown fields. Keep that.

Acceptance:

- With Stripe unset on a production-configured server, `POST /api/checkout` does not create a session and does not grant an entitlement.
- Local tests can still use the mock session only when Stripe is unset and `VERCEL_ENV` is unset.

## P8-R3: grant only when the money matches the order

`recordPaymentAndGrantAccess` is called with `capturedAmount: session.amount_total || order.base_minor_amount` and, on the webhook, `(obj.amount_total as number) || order.base_minor_amount`. The return path sets `providerMode: "test"` even for a live session.

Work:

1. Before the grant, compare the captured amount and currency to the snapshot stored on the purchase order. If either differs, do not grant. Leave the order in a review state.
2. Take `providerMode` from the Stripe object's `livemode` (`live` or `test`). Do not hardcode `test` on the return path.
3. Ignore a client-supplied amount when it does not match the snapshot.

Acceptance:

- A paid session whose amount and currency match the snapshot grants one entitlement.
- A session or event whose amount or currency differs does not grant.
- A live-mode session is stored as `live`.

## P8-R4: reuse the Checkout URL Stripe returns

`createCheckoutSession` in `my-curated-haven-web/src/lib/payments/checkout.ts` rebuilds a second click as `https://checkout.stripe.com/c/pay/${existingAttempt.sessionId}`. That is not the URL Stripe returned in `session.url`.

Work:

1. Persist `session.url` with the order when the session is created.
2. On a reusable open attempt, return that stored URL.
3. If the stored URL is missing, retrieve the session from Stripe. Do not invent a `/c/pay/` URL.

Acceptance:

- Two checkout clicks for the same user and release return one session and the same Stripe URL.
- The browser lands on the URL Stripe issued.

## P8-R5: do not turn sale on until the paid set exists

Tests and `docs/implementation/phase-8/IMPLEMENTATION-EVIDENCE.md` use synthetic recipes and a $15 fixture. The live catalog has three published free recipes and no paid release. `sale_enabled` defaults to false in the commerce migration.

Work:

1. Leave `sale_enabled` false on every live offer.
2. Do not apply the commerce migration to `ccrgvammglkvdlaojgzv` until P8-R1 and P8-R2 are deployed.
3. Choose the real release membership, price, currency, and refund rule in [COMMERCIAL-DECISIONS.md](COMMERCIAL-DECISIONS.md) before any offer is enabled. Publish those catalog rows without adding them to `free_recipe_slots`. Phase 6's remediation plan keeps `/recipes` on the free slots only.
4. Do not copy the synthetic ids `20000000-0000-0000-0000-000000000001` into production.

Acceptance:

- The live project has no `sale_enabled` offer until the commercial decision is recorded.
- A published paid recipe does not appear in the free index.

## P8-R6: replace the evidence table with the blocking cases

`docs/implementation/phase-8/IMPLEMENTATION-EVIDENCE.md` marks V11, V12, V31, V34, and others as verified. `supabase/tests/database/03_commerce.test.sql` covers private-schema denial, one uniqueness violation, and a full-refund revoke on synthetic ids. It does not cover a bad signature, a tampered amount, a double click, a webhook that arrives before the browser returns, or a refund that must not restore access after a newer purchase.

Work:

1. Add tests for P8-R1 through P8-R4 before `sale_enabled` is set true.
2. Add the release-blocking cases from [VALIDATION-MATRIX.md](VALIDATION-MATRIX.md): bad signature (V23), tampered amount (V11), concurrent checkout (V12), webhook without the browser return (V30), and a full refund that revokes only that source (V34, V36).
3. Update the evidence file so each of those rows says automated, skipped, or blocked. Remove the claim that the current pgTAP file proved them.

Acceptance:

- The evidence file matches the tests that exist.
- Sale stays off while any of those five cases is skipped or blocked.

## Out of scope

- Phase 6 free-slot listing and allergen copy.
- Phase 7 saved-recipe grants, signup copy, and closure wording.
- Revoking `SELECT` on `public.recipes`.
- Subscriptions, coupons, gifts, and a downloadable book PDF.

## Verification

1. Disposable database: unsigned webhook and wrong amount do not grant; matching signed payment grants once; full refund revokes that source.
2. Two concurrent checkout calls leave one open attempt.
3. `supabase test db` still passes `03_commerce.test.sql` plus the new cases.
4. `web-quality` passes on the implementation pull request.
5. Production smoke is a signed-out visit to the collection page with sale disabled. No charge.

## Rollback

Redeploy the previous web commit to stop a bad checkout path. Do not drop `private.purchase_orders` or delete payment rows. If a grant was issued in error, revoke that entitlement through `private.project_user_entitlement` and record the reason. Leave `sale_enabled` false.
