import crypto from "crypto";
import { getStripeConfig, isStripeConfigured } from "./config";
import { getStripeClient } from "./stripe";
import {
  getCommercialOfferBySlug,
  getUserActiveEntitlement,
  getActiveOrderAttempt,
  reservePurchaseOrder,
  bindSessionToOrder,
} from "./repository";
import type { CheckoutResult } from "./types";

export interface CreateCheckoutParams {
  collectionSlug: string;
  user: {
    id: string;
    email?: string;
  };
  requestOrigin?: string;
}

export async function createCheckoutSession({
  collectionSlug,
  user,
  requestOrigin,
}: CreateCheckoutParams): Promise<CheckoutResult> {
  const config = getStripeConfig();

  if (!config.checkoutEnabled) {
    return {
      status: "error",
      message: "Checkout is temporarily disabled for maintenance.",
      code: "CHECKOUT_DISABLED",
    };
  }

  // 1. Resolve offer
  const resolved = await getCommercialOfferBySlug(collectionSlug);
  if (!resolved) {
    return {
      status: "error",
      message: "This collection is not currently available for purchase.",
      code: "OFFER_NOT_FOUND",
    };
  }

  const { offer, releaseId } = resolved;

  // 2. Fast check: is user already entitled?
  const isEntitled = await getUserActiveEntitlement(user.id, releaseId);
  if (isEntitled) {
    return {
      status: "already_owned",
      collectionSlug,
    };
  }

  // 3. Check for reusable open attempt
  const existingAttempt = await getActiveOrderAttempt(user.id, releaseId);
  if (existingAttempt && existingAttempt.sessionId && existingAttempt.attemptState === "open") {
    // If Stripe is configured and session is open, we can reuse
    const checkoutUrl = isStripeConfigured()
      ? `https://checkout.stripe.com/c/pay/${existingAttempt.sessionId}`
      : `/checkout/return?session_id=${existingAttempt.sessionId}`;

    return {
      status: "success",
      checkoutUrl,
      supportReference: existingAttempt.supportReference,
    };
  }

  // 4. Reserve order attempt in database
  const idempotencyKey = crypto.randomUUID();
  const snapshot = {
    offer_id: offer.id,
    release_id: releaseId,
    price_id: offer.providerPriceId,
    price_minor: offer.baseMinorAmount,
    currency: offer.currency,
    terms_version: offer.termsVersion,
  };

  const order = await reservePurchaseOrder({
    userId: user.id,
    offerId: offer.id,
    releaseId,
    snapshot,
    idempotencyKey,
  });

  const origin = requestOrigin || config.appOrigin;
  let sessionId: string;
  let checkoutUrl: string;

  if (isStripeConfigured()) {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price: offer.providerPriceId,
            quantity: 1,
          },
        ],
        customer_email: user.email,
        client_reference_id: order.id,
        metadata: {
          order_id: order.id,
          release_id: releaseId,
          offer_id: offer.id,
        },
        success_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancel?order_id=${order.id}`,
      },
      {
        idempotencyKey,
      }
    );

    if (!session.url || !session.id) {
      throw new Error("Stripe checkout session creation failed to return a URL.");
    }

    sessionId = session.id;
    checkoutUrl = session.url;
  } else {
    // Mock / sandbox fallback for testing
    sessionId = `cs_test_mock_${crypto.randomBytes(8).toString("hex")}`;
    checkoutUrl = `/checkout/return?session_id=${sessionId}`;
  }

  // 5. Bind session to order in database
  await bindSessionToOrder(order.id, sessionId);

  return {
    status: "success",
    checkoutUrl,
    supportReference: order.supportReference,
  };
}
