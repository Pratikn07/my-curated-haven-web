import { canUseMockCheckout, isStripeConfigured } from "./config";
import { getStripeClient } from "./stripe";
import {
  getCommercePool,
  recordPaymentAndGrantAccess,
  recordRefundAndRecomputeAccess,
  getOrderSummaryBySessionId,
  markPurchaseOrderForReview,
} from "./repository";
import type { OrderSummaryDto } from "./types";
import { drainOptionalAnalyticsExports } from "@/lib/analytics/drain";
import { paymentCaptureMatchesSnapshot } from "./guardrails";

export async function reconcileAndFulfillSession(
  sessionId: string,
  userId: string
): Promise<OrderSummaryDto | null> {
  const pool = getCommercePool();

  // Find order
  const orderRes = await pool.query(
    `SELECT po.id, po.user_id, po.release_id, po.attempt_state, po.snapshot,
            COALESCE(NULLIF(po.snapshot->>'provider_account_id', ''), co.provider_account_id) AS provider_account_id
     FROM private.purchase_orders po
     JOIN private.commercial_offers co ON co.id = po.offer_id
     WHERE po.session_id = $1 AND po.user_id = $2`,
    [sessionId, userId]
  );

  if (orderRes.rows.length === 0) return null;
  const order = orderRes.rows[0];

  // Check if payment was already recorded
  const payRes = await pool.query(
    `SELECT id FROM private.provider_payments WHERE order_id = $1 AND status = 'succeeded'`,
    [order.id]
  );

  if (payRes.rows.length === 0) {
    if (isStripeConfigured() && !sessionId.startsWith("cs_test_mock_")) {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      });

      if (session.payment_status === "paid") {
        const snapshot = order.snapshot as Record<string, unknown> | null;
        const paymentIntent = session.payment_intent;
        const piId =
          typeof paymentIntent === "string"
            ? paymentIntent
            : paymentIntent && typeof paymentIntent === "object"
              ? paymentIntent.id
              : null;
        const latestCharge =
          paymentIntent && typeof paymentIntent === "object"
            ? paymentIntent.latest_charge
            : null;
        const matchesSnapshot = paymentCaptureMatchesSnapshot({
          expectedAmount: snapshot?.price_minor,
          expectedCurrency: snapshot?.currency,
          expectedMode: snapshot?.provider_mode,
          capturedAmount: session.amount_total,
          currency: session.currency,
          livemode: session.livemode,
        });

        if (!matchesSnapshot || !piId) {
          await markPurchaseOrderForReview(order.id);
          return getOrderSummaryBySessionId(sessionId, userId);
        }

        await recordPaymentAndGrantAccess({
          orderId: order.id,
          providerAccountId: order.provider_account_id,
          providerMode: session.livemode ? "live" : "test",
          paymentIntentId: piId,
          chargeId:
            typeof latestCharge === "string"
              ? latestCharge
              : latestCharge && typeof latestCharge === "object"
                ? latestCharge.id
                : null,
          capturedAmount: session.amount_total as number,
          currency: session.currency as string,
          paidAt: new Date(),
        });
      }
    } else if (canUseMockCheckout() && sessionId.startsWith("cs_test_mock_")) {
      // Local unsigned fixtures can only grant for locally-created mock sessions.
      await recordPaymentAndGrantAccess({
        orderId: order.id,
        providerAccountId: order.provider_account_id || "acct_test_synthetic",
        providerMode: "test",
        paymentIntentId: `pi_${sessionId}`,
        chargeId: `ch_${sessionId}`,
        capturedAmount: Number((order.snapshot as Record<string, unknown> | null)?.price_minor),
        currency: String((order.snapshot as Record<string, unknown> | null)?.currency ?? ""),
        paidAt: new Date(),
      });
    }
  }

  return getOrderSummaryBySessionId(sessionId, userId);
}

export async function processStripeWebhookEvent(event: {
  id: string;
  type: string;
  account?: string;
  livemode: boolean;
  data: {
    object: Record<string, unknown>;
  };
}): Promise<void> {
  const pool = getCommercePool();
  const obj = event.data.object;

  if (event.type === "checkout.session.completed") {
    const sessionId = obj.id as string;
    const clientRef = obj.client_reference_id as string | undefined;

    let orderId = clientRef;
    if (!orderId) {
      const orderRes = await pool.query(
        `SELECT id FROM private.purchase_orders WHERE session_id = $1 LIMIT 1`,
        [sessionId]
      );
      if (orderRes.rows.length > 0) {
        orderId = orderRes.rows[0].id;
      }
    }

    if (orderId && obj.payment_status === "paid") {
      const orderRes = await pool.query(
        `SELECT po.id, po.user_id, po.session_id, po.snapshot,
                COALESCE(NULLIF(po.snapshot->>'provider_account_id', ''), co.provider_account_id) AS provider_account_id
         FROM private.purchase_orders po
         JOIN private.commercial_offers co ON co.id = po.offer_id
         WHERE po.id = $1`,
        [orderId]
      );

      if (orderRes.rows.length > 0) {
        const order = orderRes.rows[0];
        const paymentIntent = obj.payment_intent;
        const piId =
          typeof paymentIntent === "string"
            ? paymentIntent
            : paymentIntent && typeof paymentIntent === "object" && "id" in paymentIntent
              ? String(paymentIntent.id)
              : null;
        const snapshot = order.snapshot as Record<string, unknown> | null;
        const matchesSnapshot = paymentCaptureMatchesSnapshot({
          expectedAmount: snapshot?.price_minor,
          expectedCurrency: snapshot?.currency,
          expectedMode: snapshot?.provider_mode,
          capturedAmount: obj.amount_total,
          currency: obj.currency,
          livemode: event.livemode,
        });

        if (
          !matchesSnapshot ||
          !piId ||
          (order.session_id && order.session_id !== sessionId) ||
          (event.account && event.account !== order.provider_account_id)
        ) {
          await markPurchaseOrderForReview(order.id);
        } else {
          const latestCharge =
            paymentIntent && typeof paymentIntent === "object" && "latest_charge" in paymentIntent
              ? paymentIntent.latest_charge
              : null;

          // Direct-account events omit `account`; their endpoint signature binds the account.
          // Connect events include it and must match the immutable order binding above.
          const providerAccountId = event.account ?? order.provider_account_id;

          await recordPaymentAndGrantAccess({
            orderId: order.id,
            providerAccountId,
            providerMode: event.livemode ? "live" : "test",
            paymentIntentId: piId,
            chargeId:
              typeof latestCharge === "string"
                ? latestCharge
                : latestCharge && typeof latestCharge === "object" && "id" in latestCharge
                  ? String(latestCharge.id)
                  : null,
            capturedAmount: obj.amount_total as number,
            currency: obj.currency as string,
            paidAt: new Date(),
          });
        }
      }
    }
  } else if (event.type === "charge.refunded") {
    const chargeId = obj.id as string;
    const refunds = (obj.refunds as { data: Array<{ id: string; amount: number; currency: string; status: string }> })?.data || [];

    for (const ref of refunds) {
      const payRes = await pool.query(
        `SELECT id, order_id FROM private.provider_payments WHERE charge_id = $1 LIMIT 1`,
        [chargeId]
      );

      if (payRes.rows.length > 0) {
        const pay = payRes.rows[0];
        await recordRefundAndRecomputeAccess({
          orderId: pay.order_id,
          providerRefundId: ref.id,
          paymentId: pay.id,
          amount: ref.amount,
          currency: ref.currency,
          status: ref.status,
          reason: "customer_requested",
          occurredAt: new Date(),
        });
      }
    }
  }

  try {
    await drainOptionalAnalyticsExports();
  } catch {
    // Optional export never blocks payment or access.
  }
}
