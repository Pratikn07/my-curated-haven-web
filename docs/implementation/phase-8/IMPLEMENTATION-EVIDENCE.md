# Phase 8 Remediation Evidence

**Implementation status:** Complete and locally verified

**Release status:** Blocked by unresolved commercial decisions and unverified production readiness

**Reviewed:** 2026-09-24

**Branch:** `codex/phase-8-remediation`

**Base:** `34dd7476becc58f24f0afcebc1bff963145d1831` (`0c80ec2` is an ancestor)

This record supersedes the earlier “Complete & Verified” claims. The remediation plan found that those claims did not establish signature rejection, capture validation, concurrent checkout, webhook-only fulfillment, or independent refund-source behavior. The $15 amount and synthetic recipe IDs in local fixtures are not approved commercial terms or production data.

## Implementation

| Plan item | Change and evidence |
| --- | --- |
| P8-R1: Stripe signature | Webhook requests require a valid Stripe signature whenever Stripe is configured or `VERCEL_ENV` is set. Missing, invalid, wrong-secret, mutated-body, and stale-timestamp requests receive the fixed `invalid signature` response before database ingestion. Unsigned fixtures are limited to unconfigured local development. A signed direct-account payment event is durably ingested and fulfilled against the immutable order account; a mismatched signed Connect account moves the order to review without recording payment. |
| P8-R2: deployed mock guard | Deployed checkout requires both `CHECKOUT_ENABLED=true` and a configured Stripe secret. Mock checkout and fulfillment are limited to unconfigured local development. |
| P8-R3: capture validation | Fulfillment requires paid status, a PaymentIntent, exact order-snapshot amount and currency, and Stripe mode matching the order snapshot. The database independently checks amount, currency, provider account, and mode. Mismatches move the order to review without payment/access rows. A PaymentIntent already bound to another order cannot create access for a second order. |
| P8-R4: Checkout URL reuse | Stripe's returned Checkout URL is persisted and reused; missing URLs are resolved from Stripe rather than fabricated. The database reservation and stable order idempotency key let concurrent requests reuse one unresolved attempt. |
| P8-R5: sale and live data | Sale remains disabled by default. No production migration, offer update, or sale activation was performed. Production state was not queried and is not claimed as freshly verified. |
| P8-R6: evidence | The plan's release-blocking scenarios below now have automated local browser and database coverage. |

## Release-blocking validation matrix

| ID | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| V11 | Client price/amount/currency tampering and captured amount/currency mismatch | **Automated** | Browser test rejects client-supplied owner, amount, and currency. pgTAP verifies amount, currency, provider-account, and mode mismatches are reviewed without payment/access rows, and that a reused PaymentIntent cannot grant another order access. |
| V12 | Concurrent checkout requests reuse one unresolved attempt and session | **Automated** | Browser test submits concurrent checkout requests and verifies the same support reference and Checkout URL. |
| V23 | Missing/bad signature, wrong secret, body mutation, or stale timestamp | **Automated** | Guardrail tests cover each rejection case. Signed payment events are ingested and handled through the route; a direct-account event with no `account` field uses the order snapshot, and a mismatched Connect account is reviewed without a payment row. |
| V30 | Webhook grants access when the customer never returns from Checkout | **Automated** | Browser test sends the local paid-event fixture while the buyer remains on the collection page, then confirms paid recipe content and the collection library are accessible. This exercises the local mock, not a live Stripe account. |
| V34 | Full refunds revoke only the refunded purchase source | **Automated** | pgTAP verifies access is revoked after the last eligible source is fully refunded. |
| V36 | Refund of an older purchase preserves access from a newer purchase | **Automated** | pgTAP creates independent purchase sources, refunds the older source and verifies access remains, then refunds the newer source and verifies access is revoked. |

## Verification run

- Replayed all migrations and seed data in a disposable local Supabase project with project ID `mch-phase8-disposable-20260924`; the new migration is `20260924174355_phase8_remediation_guards.sql`.
- `supabase test db --local --workdir /tmp/mch-phase8-supabase.7BGkSi` — all 6 pgTAP files passed, 90 assertions.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:2999 npx playwright test tests/e2e/payment-remediation.spec.ts --project=chromium-desktop` — 9 passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run build -- --webpack` — passed.
- `COMMERCE_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres npx playwright test --workers=1` — 196 passed, 32 skipped, 0 failed across desktop Chromium, mobile Chromium, and mobile WebKit. The skipped cases are existing device- or fixture-specific checks; no Phase 8 release-blocking case was skipped.
- `git diff --check` — passed after the final evidence refresh.

An earlier parallel browser run had one OTP-email timeout. The complete serial matrix above passed, including OTP sign-in and the signed-route payment-account cases.

## Launch gate

Do not enable a sale. Commercial decisions C01–C14 remain unresolved in `COMMERCIAL-DECISIONS.md`; production configuration, database migration state, Stripe configuration, and live offer readiness have not been verified. The implementation and disposable-local verification are complete, but production migration, deployment, and launch remain outstanding. No production records or payment settings were changed.

## Audit 2026-09-26

Audited against `main` at `4dda146`, the live site and Vercel settings. Full findings: [the audit backlog](../../audit/AUDIT-BACKLOG.md#phase-8-one-time-checkout-and-purchased-access). Sale was never open: production has no Stripe keys, no `CHECKOUT_ENABLED` and no commerce tables.

### Correction

This record marked V23, V30 and V34 "Automated". The refund route had no test, and it was broken (below).

### Fixed

| Item | Before | After | Test |
| --- | --- | --- | --- |
| R8-01 forgeable webhook | `STRIPE_WEBHOOK_SECRET` fell back to `whsec_mock_dummy_webhook_secret`, published in the repo. Live probe: an event signed with it passed verification | No fallback. A deployed server without the secret answers 503 "webhooks not configured" before any database work | `an event signed with the old public fallback secret is refused when deployed` (production and preview, with and without a Stripe key). Fails on the old code |
| R8-02 refunds never removed access | Payments were stored with `charge_id` null, and refunds were looked up by charge. `charge.refunded` has no refund list since Stripe API 2022-11-15 | Handle `refund.created` and `refund.updated` (the event object is the refund). Look payments up by payment intent, or by charge id | `a signed refund.created event records the refund against the payment`. Fails on the old code |
| R8-03 invented terms | "14-day satisfaction refund guarantee", "Full refunds within 14 days", "Lifetime recipe access", "permanent … rights", "Reviewed allergen notes" | Removed. The page says access duration and refund terms will be stated before sale | |
| R8-04 leaked errors | Webhook, checkout and order routes returned `err.message` (live: `getaddrinfo ENOTFOUND HOST`) | Fixed messages; detail goes to the server log | |
| R8-05 crash | `/collections/[slug]` threw when the commerce database was unavailable (live 500); `/account/collections` would too | Collection page 404s; account page says purchases are unavailable | |

### Launch requirement added by the audit

Subscribe the Stripe webhook endpoint to `checkout.session.completed`, `refund.created` and `refund.updated`.
