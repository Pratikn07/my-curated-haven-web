import crypto from "crypto";
import { canUseMockCheckout, getStripeConfig, isStripeConfigured } from "./config";
import { getStripeClient } from "./stripe";
import { bindSessionToOrder, closeExpiredCheckoutAttempt, recordCheckoutMeasurement } from "./repository";
import { findCollectionIdBySlug, reserveCollectionOrder, reserveGuestCollectionOrder } from "./collection-reservation";
import type { CheckoutExpectation, CheckoutResult } from "./types";
import { acceptCampaignInput, type CampaignInput } from "@/lib/analytics/campaigns";
import type { CheckoutAnalytics } from "@/lib/analytics/checkout-analytics";
import { trustedAnalyticsEnvironment } from "@/lib/analytics/environment";
import { reusableCheckoutUrl } from "./guardrails";

export interface CreateCheckoutParams {
  collectionSlug: string;
  /** What the buyer's page showed for sale; a mismatch returns "stale" instead of charging. */
  expected: CheckoutExpectation | null;
  /** The signed-in buyer, or null to pay first: Stripe then collects the email and the order is claimed afterwards. */
  user: {
    id: string;
    email?: string;
  } | null;
  /** A signed-out buyer's random id (browser cookie), so a second tap reuses their open checkout. Required without a user. */
  guestPrincipal?: string | null;
  requestOrigin?: string;
  analyticsConsent?: boolean;
  attribution?: CampaignInput | null;
  /** The visit behind the tap: PostHog visitor and session, Buy button, Instagram landing page. */
  analytics?: CheckoutAnalytics | null;
}

export async function createCheckoutSession({
  collectionSlug,
  expected,
  user,
  guestPrincipal = null,
  requestOrigin,
  analyticsConsent = false,
  attribution = null,
  analytics = null,
}: CreateCheckoutParams): Promise<CheckoutResult> {
  const config = getStripeConfig();

  if (!config.checkoutEnabled) {
    return {
      status: "error",
      message: "Checkout is temporarily disabled for maintenance.",
      code: "CHECKOUT_DISABLED",
    };
  }

  // 1. Reserve or reuse the order under the collection lock. Ownership covers every release, and an
  //    unresolved attempt for any release is reused with its own frozen snapshot.
  const collectionId = await findCollectionIdBySlug(collectionSlug);
  if (!collectionId) {
    return { status: "error", message: "This collection is not currently available for purchase.", code: "OFFER_NOT_FOUND" };
  }
  if (!user && !guestPrincipal) {
    return { status: "error", message: "Please refresh the page and try again.", code: "CHECKOUT_INVALID" };
  }
  const reserve = () => user
    ? reserveCollectionOrder(user.id, collectionId, expected, crypto.randomUUID())
    : reserveGuestCollectionOrder(guestPrincipal as string, collectionId, expected, crypto.randomUUID());
  // A stored session that Stripe already expired is closed and the reservation retried once.
  let reservation = await reserve();
  for (let attempt = 0; ; attempt++) {
    if (reservation.state === "owned") return { status: "already_owned", collectionSlug };
    if (reservation.state === "stale") return { status: "stale", expected: reservation.expected };
    if (reservation.state === "unavailable") {
      return { status: "error", message: "This collection is not currently available for purchase.", code: "OFFER_NOT_FOUND" };
    }
    if (reservation.state === "review_required") {
      return {
        status: "error",
        message: "An earlier checkout for this collection needs a quick check. Please contact support before buying again.",
        code: "CHECKOUT_REVIEW_REQUIRED",
      };
    }
    const pending = reservation.order;
    if (
      attempt === 0 &&
      pending.sessionId &&
      pending.attemptState === "open" &&
      isStripeConfigured() &&
      !pending.sessionId.startsWith("cs_test_mock_")
    ) {
      const session = await getStripeClient().checkout.sessions.retrieve(pending.sessionId);
      if (session.status === "expired") {
        await closeExpiredCheckoutAttempt(pending.sessionId);
        reservation = await reserve();
        continue;
      }
      if (session.status === "complete") {
        // Paid but not yet recorded: the return page reconciles it instead of offering a dead link.
        return {
          status: "success",
          checkoutUrl: `/checkout/return?session_id=${encodeURIComponent(pending.sessionId)}`,
          supportReference: pending.supportReference,
        };
      }
      if (!pending.checkoutUrl && session.url) {
        await bindSessionToOrder(pending.id, pending.sessionId, session.url);
        pending.checkoutUrl = session.url;
      }
    }
    break;
  }
  const order = reservation.order;

  // 2. An open attempt with a session is reused as it is.
  if (order.sessionId && order.attemptState === "open") {
    let retrievedUrl: string | null = null;
    if (!order.checkoutUrl && canUseMockCheckout() && order.sessionId.startsWith("cs_test_mock_")) {
      retrievedUrl = `/checkout/return?session_id=${encodeURIComponent(order.sessionId)}`;
      await bindSessionToOrder(order.id, order.sessionId, retrievedUrl);
    }
    const checkoutUrl = reusableCheckoutUrl(order.checkoutUrl, retrievedUrl);
    if (!checkoutUrl) {
      return {
        status: "error",
        message: "The existing checkout link is unavailable. Please contact support.",
        code: "CHECKOUT_URL_UNAVAILABLE",
      };
    }
    return { status: "success", checkoutUrl, supportReference: order.supportReference };
  }

  // 3. Otherwise create the provider session from the order's frozen snapshot, never the live offer row.
  const priceId = typeof order.snapshot.price_id === "string" ? order.snapshot.price_id : null;
  if (!priceId) {
    return { status: "error", message: "This checkout needs support to finish. Please contact us.", code: "CHECKOUT_SNAPSHOT_INCOMPLETE" };
  }

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
            price: priceId,
            quantity: 1,
          },
        ],
        // A signed-in buyer's email is known; for a guest, Stripe asks for it and the order is claimed with it later.
        ...(user?.email ? { customer_email: user.email } : {}),
        client_reference_id: order.id,
        metadata: {
          order_id: order.id,
          release_id: order.releaseId,
          offer_id: order.offerId,
        },
        success_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        // The cancel page offers the way back to this book; the order id stays out of the address bar.
        cancel_url: `${origin}/checkout/cancel?book=${encodeURIComponent(collectionSlug)}`,
      },
      { idempotencyKey: order.idempotencyKey }
    );

    if (!session.url || !session.id) {
      throw new Error("Stripe checkout session creation failed to return a URL.");
    }

    sessionId = session.id;
    checkoutUrl = session.url;
  } else {
    if (!canUseMockCheckout()) {
      return {
        status: "error",
        message: "Checkout is temporarily unavailable.",
        code: "CHECKOUT_DISABLED",
      };
    }

    // Local unconfigured fixture session for tests.
    sessionId = `cs_test_mock_${order.id.replaceAll("-", "")}`;
    checkoutUrl = `/checkout/return?session_id=${sessionId}`;
  }

  // 5. Bind session to order in database
  await bindSessionToOrder(order.id, sessionId, checkoutUrl);

  const campaign = attribution ? acceptCampaignInput(attribution) : null;
  let analyticsAttemptRef: string | null = null;
  try {
    analyticsAttemptRef = await recordCheckoutMeasurement({
      orderId: order.id,
      campaignCode: campaign?.utm_campaign ?? null,
      campaignContent: campaign?.utm_content ?? null,
      analyticsConsent: analyticsConsent === true,
      environment: trustedAnalyticsEnvironment(),
      distinctId: analytics?.distinctId ?? null,
      sessionId: analytics?.sessionId ?? null,
      checkoutSurface: analytics?.surface ?? null,
      entryStory: analytics?.entryStory ?? null,
    });
  } catch {
    analyticsAttemptRef = null;
  }

  return {
    status: "success",
    checkoutUrl,
    supportReference: order.supportReference,
    analyticsAttemptRef,
  };
}
