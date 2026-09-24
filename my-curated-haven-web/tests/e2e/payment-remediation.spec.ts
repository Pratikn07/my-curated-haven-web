import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { POST as stripeWebhookPost } from "@/app/api/stripe/webhook/route";
import { canUseMockCheckout, getStripeConfig } from "@/lib/payments/config";
import { getCommercePool } from "@/lib/payments/repository";
import { constructWebhookEvent } from "@/lib/payments/stripe";
import {
  paymentCaptureMatchesSnapshot,
  reusableCheckoutUrl,
} from "@/lib/payments/guardrails";

const ENV_KEYS = [
  "VERCEL_ENV",
  "CHECKOUT_ENABLED",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

async function withEnvironment(
  values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>,
  run: () => Promise<void> | void
) {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    await run();
  } finally {
    for (const key of ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const paidCheckoutEvent = JSON.stringify({
  id: "evt_test_unsigned_fixture",
  type: "checkout.session.completed",
  livemode: false,
  data: {
    object: {
      id: "cs_test_unsigned_fixture",
      payment_status: "paid",
      amount_total: 1500,
      currency: "usd",
    },
  },
});

async function createWebhookOrder(pool: ReturnType<typeof getCommercePool>, sessionId: string) {
  const id = randomUUID();
  const unique = randomUUID();
  await pool.query(
    `INSERT INTO private.purchase_orders (
       id, support_reference, owner_principal, user_id, offer_id, release_id,
       snapshot, attempt_state, session_id, idempotency_key
     ) VALUES ($1, $2, $3, NULL, $4, $5, $6::jsonb, 'open', $7, $8)`,
    [
      id,
      `ORD-P8-V23-${unique}`,
      randomUUID(),
      "f0000000-0000-0000-0000-000000000001",
      "a0000000-0000-0000-0000-000000000001",
      JSON.stringify({
        price_minor: 1500,
        currency: "usd",
        provider_account_id: "acct_test_synthetic",
        provider_mode: "test",
      }),
      sessionId,
      `idemp-p8-v23-${unique}`,
    ]
  );
  return id;
}

test.describe("Phase 8 remediation guardrails", () => {
  test.describe.configure({ mode: "serial" });

  test("P8-R1: production rejects an unsigned paid event before database access", async () => {
    await withEnvironment({ VERCEL_ENV: "production" }, async () => {
      const response = await stripeWebhookPost(
        new Request("http://localhost/api/stripe/webhook", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: paidCheckoutEvent,
        })
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid signature" });
    });
  });

  test("P8-R1: a bad Stripe signature returns only the fixed error", async () => {
    await withEnvironment(
      {
        STRIPE_SECRET_KEY: "sk_test_signature_fixture",
        STRIPE_WEBHOOK_SECRET: "whsec_signature_fixture",
      },
      async () => {
        const stripe = new Stripe("sk_test_signature_fixture");
        const validSignature = stripe.webhooks.generateTestHeaderString({
          payload: paidCheckoutEvent,
          secret: "whsec_signature_fixture",
        });
        const staleSignature = stripe.webhooks.generateTestHeaderString({
          payload: paidCheckoutEvent,
          secret: "whsec_signature_fixture",
          timestamp: Math.floor(Date.now() / 1000) - 3600,
        });
        const wrongSecretSignature = stripe.webhooks.generateTestHeaderString({
          payload: paidCheckoutEvent,
          secret: "whsec_wrong_fixture",
        });
        const mutatedBody = paidCheckoutEvent.replace("1500", "1");
        const requests = [
          { body: paidCheckoutEvent, signature: "t=0,v1=invalid" },
          { body: paidCheckoutEvent, signature: wrongSecretSignature },
          { body: mutatedBody, signature: validSignature },
          { body: paidCheckoutEvent, signature: staleSignature },
        ];

        for (const requestData of requests) {
          const response = await stripeWebhookPost(
            new Request("http://localhost/api/stripe/webhook", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "stripe-signature": requestData.signature,
              },
              body: requestData.body,
            })
          );

          expect(response.status).toBe(400);
          expect(await response.json()).toEqual({ error: "invalid signature" });
        }
      }
    );
  });

  test("P8-R1: Stripe accepts a correctly signed raw event", async () => {
    await withEnvironment(
      {
        STRIPE_SECRET_KEY: "sk_test_signature_fixture",
        STRIPE_WEBHOOK_SECRET: "whsec_valid_signature_fixture",
      },
      () => {
        const payload = JSON.stringify({
          id: "evt_test_signed_fixture",
          object: "event",
          type: "checkout.session.completed",
          livemode: false,
          data: { object: { id: "cs_test_signed_fixture" } },
        });
        const stripe = new Stripe("sk_test_signature_fixture");
        const signature = stripe.webhooks.generateTestHeaderString({
          payload,
          secret: "whsec_valid_signature_fixture",
        });

        expect(constructWebhookEvent(payload, signature, "whsec_valid_signature_fixture").id)
          .toBe("evt_test_signed_fixture");
      }
    );
  });

  test("P8-R1/R3: signed direct-account capture uses the order account; mismatched Connect account is reviewed", async () => {
    test.skip(
      !process.env.COMMERCE_DATABASE_URL,
      "Requires the disposable local Supabase database."
    );

    await withEnvironment(
      {
        VERCEL_ENV: undefined,
        STRIPE_SECRET_KEY: "sk_test_signature_fixture",
        STRIPE_WEBHOOK_SECRET: "whsec_valid_signature_fixture",
      },
      async () => {
        const pool = getCommercePool();
        const stripe = new Stripe("sk_test_signature_fixture");
        const directEventId = `evt_test_direct_${randomUUID()}`;
        const connectEventId = `evt_test_connect_${randomUUID()}`;
        const directSessionId = `cs_test_direct_${randomUUID()}`;
        const connectSessionId = `cs_test_connect_${randomUUID()}`;
        const orderIds: string[] = [];
        const eventIds = [directEventId, connectEventId];

        const signedEventRequest = async (
          eventId: string,
          sessionId: string,
          orderId: string,
          paymentIntentId: string,
          account?: string
        ) => {
          const payload = JSON.stringify({
            id: eventId,
            object: "event",
            type: "checkout.session.completed",
            ...(account ? { account } : {}),
            livemode: false,
            data: {
              object: {
                id: sessionId,
                object: "checkout.session",
                client_reference_id: orderId,
                payment_status: "paid",
                amount_total: 1500,
                currency: "usd",
                payment_intent: paymentIntentId,
              },
            },
          });
          const signature = stripe.webhooks.generateTestHeaderString({
            payload,
            secret: "whsec_valid_signature_fixture",
          });
          return stripeWebhookPost(
            new Request("http://localhost/api/stripe/webhook", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "stripe-signature": signature,
              },
              body: payload,
            })
          );
        };

        try {
          const directOrderId = await createWebhookOrder(pool, directSessionId);
          orderIds.push(directOrderId);
          const connectOrderId = await createWebhookOrder(pool, connectSessionId);
          orderIds.push(connectOrderId);

          const directResponse = await signedEventRequest(
            directEventId,
            directSessionId,
            directOrderId,
            `pi_direct_${randomUUID()}`
          );
          expect(directResponse.status).toBe(200);
          const directOrder = await pool.query(
            `SELECT attempt_state FROM private.purchase_orders WHERE id = $1`,
            [directOrderId]
          );
          expect(directOrder.rows).toEqual([{ attempt_state: "closed" }]);
          const directPayment = await pool.query(
            `SELECT provider_account_id
             FROM private.provider_payments
             WHERE order_id = $1`,
            [directOrderId]
          );
          expect(directPayment.rows).toEqual([{ provider_account_id: "acct_test_synthetic" }]);

          const connectResponse = await signedEventRequest(
            connectEventId,
            connectSessionId,
            connectOrderId,
            `pi_connect_${randomUUID()}`,
            "acct_connect_mismatch"
          );
          expect(connectResponse.status).toBe(200);
          const connectOrder = await pool.query(
            `SELECT attempt_state FROM private.purchase_orders WHERE id = $1`,
            [connectOrderId]
          );
          expect(connectOrder.rows).toEqual([{ attempt_state: "review" }]);
          const connectPayment = await pool.query(
            `SELECT count(*)::int AS count
             FROM private.provider_payments
             WHERE order_id = $1`,
            [connectOrderId]
          );
          expect(connectPayment.rows).toEqual([{ count: 0 }]);
          const ingested = await pool.query(
            `SELECT event_id FROM private.payment_events WHERE event_id = ANY($1::text[]) ORDER BY event_id`,
            [eventIds]
          );
          expect(ingested.rows.map((row) => row.event_id).sort()).toEqual([...eventIds].sort());
        } finally {
          await pool.query(`DELETE FROM private.payment_events WHERE event_id = ANY($1::text[])`, [eventIds]);
          if (orderIds.length > 0) {
            await pool.query(`DELETE FROM private.provider_payments WHERE order_id = ANY($1::uuid[])`, [orderIds]);
            await pool.query(`DELETE FROM private.commerce_outbox WHERE order_id = ANY($1::uuid[])`, [orderIds]);
            await pool.query(`DELETE FROM private.purchase_orders WHERE id = ANY($1::uuid[])`, [orderIds]);
          }
        }
      }
    );
  });

  test("P8-R2: deployed checkout requires an explicit flag and a configured Stripe secret", async () => {
    await withEnvironment({ VERCEL_ENV: "production" }, () => {
      expect(getStripeConfig().checkoutEnabled).toBe(false);
    });

    await withEnvironment(
      { VERCEL_ENV: "production", CHECKOUT_ENABLED: "true" },
      () => expect(getStripeConfig().checkoutEnabled).toBe(false)
    );

    await withEnvironment(
      {
        VERCEL_ENV: "production",
        CHECKOUT_ENABLED: "true",
        STRIPE_SECRET_KEY: "sk_live_configured_fixture",
      },
      () => expect(getStripeConfig().checkoutEnabled).toBe(true)
    );
  });

  test("P8-R2: preview cannot use an unconfigured mock checkout", async () => {
    await withEnvironment({ VERCEL_ENV: "preview" }, () => {
      expect(getStripeConfig().checkoutEnabled).toBe(false);
      expect(canUseMockCheckout()).toBe(false);
    });
  });

  test("P8-R2: only unconfigured local development may grant a mock session", async () => {
    await withEnvironment({}, () => expect(canUseMockCheckout()).toBe(true));
    await withEnvironment(
      { STRIPE_SECRET_KEY: "sk_test_configured_fixture" },
      () => expect(canUseMockCheckout()).toBe(false)
    );
    await withEnvironment({ VERCEL_ENV: "production" }, () => {
      expect(canUseMockCheckout()).toBe(false);
    });
  });

  test("P8-R3: capture validation requires the exact snapshot amount, currency, and mode", async () => {
    const expected = {
      expectedAmount: 1500,
      expectedCurrency: "usd",
      expectedMode: "test",
      capturedAmount: 1500,
      currency: "USD",
      livemode: false,
    };

    expect(paymentCaptureMatchesSnapshot(expected)).toBe(true);
    expect(
      paymentCaptureMatchesSnapshot({
        ...expected,
        expectedMode: "live",
        livemode: true,
      })
    ).toBe(true);
    expect(paymentCaptureMatchesSnapshot({ ...expected, capturedAmount: 1400 })).toBe(false);
    expect(paymentCaptureMatchesSnapshot({ ...expected, currency: "eur" })).toBe(false);
    expect(paymentCaptureMatchesSnapshot({ ...expected, livemode: true })).toBe(false);
    expect(paymentCaptureMatchesSnapshot({ ...expected, expectedAmount: undefined })).toBe(false);
  });

  test("P8-R4: a reusable attempt keeps Stripe's stored or retrieved URL", async () => {
    const storedUrl = "https://checkout.stripe.com/c/pay/cs_test_original";
    const retrievedUrl = "https://checkout.stripe.com/c/pay/cs_test_retrieved";

    expect(reusableCheckoutUrl(storedUrl, retrievedUrl)).toBe(storedUrl);
    expect(reusableCheckoutUrl(null, retrievedUrl)).toBe(retrievedUrl);
    expect(reusableCheckoutUrl(null, null)).toBeNull();
  });
});
