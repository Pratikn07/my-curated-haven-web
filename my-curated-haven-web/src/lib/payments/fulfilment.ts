import { canUseMockCheckout, isStripeConfigured } from "./config";
import { getStripeClient } from "./stripe";
import {
  getCommercePool,
  recordPaymentAndGrantAccess,
  recordRefundAndRecomputeAccess,
  getOrderSummaryBySessionId,
  markPurchaseOrderForReview,
  recordDisputeAndRecomputeAccess,
  closeExpiredCheckoutAttempt,
  type PaymentEventOutcome,
} from "./repository";
import type { OrderSummaryDto } from "./types";
import { drainOptionalAnalyticsExports } from "@/lib/analytics/drain";
import { paymentCaptureMatchesSnapshot } from "./guardrails";
import { refreshOrderFromProvider } from "./reconciliation/service";
import { loadGuestCheckout, recordGuestBuyerEmail } from "./guest-checkout";

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

  // With an approved policy the order is re-checked with Stripe through the shared writer, which also catches refunds
  // and disputes after payment; a recorded success alone is not trusted. The ownership check above still applies.
  if (!sessionId.startsWith("cs_test_mock_") && (await refreshOrderFromProvider(order.id, payRes.rows.length > 0))) {
    return getOrderSummaryBySessionId(sessionId, userId);
  }

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
        providerAccountId: order.provider_account_id,
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
}): Promise<PaymentEventOutcome> {
  const pool = getCommercePool();
  const obj = event.data.object;
  // Ignored events carry a reason; anything that changed an order or access completes.
  let outcome: PaymentEventOutcome = { state: "ignored", reason: "unhandled_event_type" };

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

    outcome = { state: "ignored", reason: orderId ? "session_not_paid" : "order_not_found" };
    if (orderId && obj.payment_status === "paid") {
      const orderRes = await pool.query(
        `SELECT po.id, po.user_id, po.session_id, po.snapshot,
                COALESCE(NULLIF(po.snapshot->>'provider_account_id', ''), co.provider_account_id) AS provider_account_id
         FROM private.purchase_orders po
         JOIN private.commercial_offers co ON co.id = po.offer_id
         WHERE po.id = $1`,
        [orderId]
      );

      if (orderRes.rows.length === 0) {
        outcome = { state: "ignored", reason: "order_not_found" };
      } else {
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
          outcome = { state: "completed", reason: "order_held_for_review" };
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
          // Pay first: a guest order keeps the email Stripe collected, so the buyer can claim it by confirming it.
          if (order.user_id === null) {
            const details = obj.customer_details as { email?: unknown } | null | undefined;
            await recordGuestBuyerEmail(order.id, typeof details?.email === "string" ? details.email : null);
          }
          outcome = { state: "completed" };
        }
      }
    }
  } else if (event.type === "checkout.session.expired") {
    // Stripe never charges an expired session, so closing it only frees the buyer to start again.
    outcome = (await closeExpiredCheckoutAttempt(obj.id as string))
      ? { state: "completed" }
      : { state: "ignored", reason: "no_open_attempt" };
  } else if (event.type.startsWith("charge.dispute.")) {
    outcome = (await recordStripeDispute(pool, obj))
      ? { state: "completed" }
      : { state: "ignored", reason: "payment_not_found" };
  } else if (event.type === "refund.created" || event.type === "refund.updated") {
    // The event object is the Refund itself, so no expansion or extra API call is needed.
    outcome = (await recordStripeRefund(pool, obj, null, null))
      ? { state: "completed" }
      : { state: "ignored", reason: "payment_not_found" };
  } else if (event.type === "charge.refunded") {
    // Since Stripe API 2022-11-15 a Charge no longer includes its refunds unless expanded,
    // so this list is usually empty; refund.created/updated carry the refunds (Phase 8 audit R8-02).
    const refundList = (obj.refunds as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];
    const chargePaymentIntent = stripeObjectId(obj.payment_intent);
    let recorded = 0;
    for (const refund of refundList) {
      if (await recordStripeRefund(pool, refund, chargePaymentIntent, obj.id as string)) recorded++;
    }
    outcome = recorded > 0
      ? { state: "completed" }
      : { state: "ignored", reason: refundList.length ? "payment_not_found" : "refunds_not_expanded" };
  }

  try {
    await drainOptionalAnalyticsExports();
  } catch {
    // Optional export never blocks payment or access.
  }

  return outcome;
}

/** A Stripe expandable field is either an id string or an object with an id. */
function stripeObjectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) return String((value as { id: unknown }).id);
  return null;
}

/** Find our payment row for a Stripe object that names a payment intent and/or charge. */
async function findProviderPayment(
  pool: ReturnType<typeof getCommercePool>,
  paymentIntentId: string | null,
  chargeId: string | null
): Promise<{ id: string; order_id: string } | null> {
  if (!paymentIntentId && !chargeId) return null;
  const lookup = () =>
    pool.query(
      `SELECT id, order_id FROM private.provider_payments
       WHERE ($1::text IS NOT NULL AND payment_intent_id = $1)
          OR ($2::text IS NOT NULL AND charge_id = $2)
       LIMIT 1`,
      [paymentIntentId, chargeId]
    );
  const payRes = await lookup();
  if (payRes.rows.length > 0) return payRes.rows[0];

  // Stripe does not order events: a refund or dispute can arrive before checkout.session.completed.
  // Record the payment from its Checkout Session first; a charge from no session of ours stays unknown.
  if (!paymentIntentId || !isStripeConfigured()) return null;
  const sessions = await getStripeClient().checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const session = sessions.data[0];
  if (!session) return null;
  const orderRes = await pool.query(
    `SELECT user_id FROM private.purchase_orders WHERE session_id = $1`,
    [session.id]
  );
  if (orderRes.rows.length === 0) return null;
  // A guest order (pay first) has no account yet; its own path records the payment and the email.
  if (orderRes.rows[0].user_id === null) await loadGuestCheckout(session.id);
  else await reconcileAndFulfillSession(session.id, orderRes.rows[0].user_id);
  return (await lookup()).rows[0] ?? null;
}

/**
 * Record one Stripe dispute against its payment, with Stripe's response deadline. The database function owns the
 * access rule: an open formal dispute holds this purchase, a lost one removes it, anything else keeps it.
 */
async function recordStripeDispute(
  pool: ReturnType<typeof getCommercePool>,
  dispute: Record<string, unknown>
): Promise<boolean> {
  const disputeId = dispute.id as string | undefined;
  if (!disputeId) return false;
  const pay = await findProviderPayment(
    pool,
    stripeObjectId(dispute.payment_intent),
    stripeObjectId(dispute.charge)
  );
  if (!pay) return false;

  await recordDisputeAndRecomputeAccess({
    providerDisputeId: disputeId,
    paymentId: pay.id,
    amount: dispute.amount as number,
    currency: dispute.currency as string,
    status: dispute.status as string,
    reason: typeof dispute.reason === "string" ? dispute.reason : null,
    responseDeadline: typeof (dispute.evidence_details as { due_by?: unknown } | undefined)?.due_by === "number"
      ? new Date(((dispute.evidence_details as { due_by: number }).due_by) * 1000) : null,
  });
  return true;
}

/**
 * Record one Stripe refund against its payment and recompute access.
 * Payments are found by payment intent: the checkout webhook stores charge_id as null
 * when Stripe sends payment_intent as an id, so a charge-id lookup alone found nothing.
 */
async function recordStripeRefund(
  pool: ReturnType<typeof getCommercePool>,
  refund: Record<string, unknown>,
  fallbackPaymentIntentId: string | null,
  fallbackChargeId: string | null
): Promise<boolean> {
  const refundId = refund.id as string | undefined;
  if (!refundId) return false;
  const pay = await findProviderPayment(
    pool,
    stripeObjectId(refund.payment_intent) ?? fallbackPaymentIntentId,
    stripeObjectId(refund.charge) ?? fallbackChargeId
  );
  if (!pay) return false;

  await recordRefundAndRecomputeAccess({
    orderId: pay.order_id,
    providerRefundId: refundId,
    paymentId: pay.id,
    amount: refund.amount as number,
    currency: refund.currency as string,
    status: refund.status as string,
    reason: typeof refund.reason === "string" ? refund.reason : "customer_requested",
    occurredAt: typeof refund.created === "number" ? new Date(refund.created * 1000) : new Date(),
  });
  return true;
}
