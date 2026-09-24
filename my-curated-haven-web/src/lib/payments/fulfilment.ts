import { isStripeConfigured } from "./config";
import { getStripeClient } from "./stripe";
import {
  getCommercePool,
  recordPaymentAndGrantAccess,
  recordRefundAndRecomputeAccess,
  getOrderSummaryBySessionId,
} from "./repository";
import type { OrderSummaryDto } from "./types";
import { drainOptionalAnalyticsExports } from "@/lib/analytics/drain";

export async function reconcileAndFulfillSession(
  sessionId: string,
  userId: string
): Promise<OrderSummaryDto | null> {
  const pool = getCommercePool();

  // Find order
  const orderRes = await pool.query(
    `SELECT po.id, po.user_id, po.release_id, po.attempt_state, co.base_minor_amount, co.currency, co.provider_account_id
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
        const pi = session.payment_intent as { id: string; latest_charge?: string } | null;
        const piId = pi?.id || `pi_${sessionId}`;
        const chargeId = typeof pi?.latest_charge === "string" ? pi.latest_charge : `ch_${sessionId}`;

        await recordPaymentAndGrantAccess({
          orderId: order.id,
          providerAccountId: order.provider_account_id,
          providerMode: "test",
          paymentIntentId: piId,
          chargeId,
          capturedAmount: session.amount_total || order.base_minor_amount,
          currency: session.currency || order.currency,
          paidAt: new Date(),
        });
      }
    } else {
      // In mock / test mode: fulfill immediately upon return
      await recordPaymentAndGrantAccess({
        orderId: order.id,
        providerAccountId: order.provider_account_id || "acct_test_synthetic",
        providerMode: "test",
        paymentIntentId: `pi_${sessionId}`,
        chargeId: `ch_${sessionId}`,
        capturedAmount: order.base_minor_amount || 1500,
        currency: order.currency || "usd",
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

    if (orderId && (obj.payment_status === "paid" || obj.status === "complete")) {
      const orderRes = await pool.query(
        `SELECT po.id, po.user_id, co.base_minor_amount, co.currency, co.provider_account_id
         FROM private.purchase_orders po
         JOIN private.commercial_offers co ON co.id = po.offer_id
         WHERE po.id = $1`,
        [orderId]
      );

      if (orderRes.rows.length > 0) {
        const order = orderRes.rows[0];
        const piId = (obj.payment_intent as string) || `pi_${sessionId}`;

        await recordPaymentAndGrantAccess({
          orderId: order.id,
          providerAccountId: event.account || order.provider_account_id || "acct_test",
          providerMode: event.livemode ? "live" : "test",
          paymentIntentId: piId,
          chargeId: `ch_${sessionId}`,
          capturedAmount: (obj.amount_total as number) || order.base_minor_amount,
          currency: (obj.currency as string) || order.currency,
          paidAt: new Date(),
        });
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
