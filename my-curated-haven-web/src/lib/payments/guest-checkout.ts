import { canUseMockCheckout, isStripeConfigured } from "./config";
import { getStripeClient } from "./stripe";
import { getCommercePool, markPurchaseOrderForReview, recordPaymentAndGrantAccess } from "./repository";
import { paymentCaptureMatchesSnapshot } from "./guardrails";
import { refreshOrderFromProvider } from "./reconciliation/service";
import { maskEmail } from "./mask-email";

/**
 * Pay first, account after (RC-16). A signed-out parent pays at Stripe, which collects their email; the order has no
 * account until they confirm that email with a one-time code. Any later sign-in with the same confirmed email also
 * claims it, so a parent who closes the page after paying never loses the book.
 */

/** Local fixtures only: a mock checkout session id, which has no Stripe page to collect the buyer's email. */
export function isMockCheckoutSession(sessionId: string): boolean {
  return sessionId.startsWith("cs_test_mock_");
}

/** The browser cookie holding a signed-out buyer's random id, so a second tap reuses their open checkout. */
export const GUEST_COOKIE = "mch_guest";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isGuestPrincipal(value: string | undefined | null): value is string {
  return Boolean(value && UUID.test(value));
}

/** Keep the email Stripe collected for a paid guest order. Set once; an order with an account or an email keeps it. */
export async function recordGuestBuyerEmail(orderId: string, email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const { rows } = await getCommercePool().query("SELECT private.record_guest_buyer_email($1, $2) AS recorded", [orderId, email]);
  return rows[0]?.recorded === true;
}

/**
 * Attach every paid guest order bought with this account's confirmed email, and grant its access. The database checks
 * the email is confirmed; the caller only names the account. Never throws: a failed claim is retried at the next
 * sign-in or library visit, and must not block signing in.
 */
export async function claimGuestOrders(userId: string): Promise<number> {
  try {
    const { rows } = await getCommercePool().query("SELECT private.claim_guest_orders($1) AS result", [userId]);
    const claimed = Number((rows[0]?.result as { claimed?: unknown } | undefined)?.claimed ?? 0);
    return Number.isFinite(claimed) ? claimed : 0;
  } catch (error) {
    console.error("[guest-checkout] claim failed", error instanceof Error ? error.message : error);
    return 0;
  }
}

export type GuestCheckout =
  | { state: "not_guest" }
  | { state: "pending"; supportReference: string; collectionTitle: string }
  | { state: "needs_email"; supportReference: string; collectionTitle: string }
  | { state: "paid"; supportReference: string; collectionTitle: string; collectionSlug: string; maskedEmail: string; claimed: boolean };

type GuestOrderRow = {
  id: string;
  user_id: string | null;
  buyer_email: string | null;
  support_reference: string;
  snapshot: Record<string, unknown> | null;
  provider_account_id: string;
  collection_slug: string;
  collection_title: string;
  owner_principal: string;
};

async function loadGuestOrder(sessionId: string): Promise<GuestOrderRow | null> {
  const { rows } = await getCommercePool().query(
    `SELECT po.id, po.user_id, po.buyer_email, po.support_reference, po.snapshot, po.owner_principal,
            COALESCE(NULLIF(po.snapshot->>'provider_account_id', ''), co.provider_account_id) AS provider_account_id,
            c.slug AS collection_slug, c.title AS collection_title
     FROM private.purchase_orders po
     JOIN private.commercial_offers co ON co.id = po.offer_id
     JOIN public.collection_releases r ON r.id = po.release_id
     JOIN public.recipe_collections c ON c.id = r.collection_id
     WHERE po.session_id = $1 AND po.snapshot->>'checkout_kind' = 'guest'`,
    [sessionId]);
  return (rows[0] as GuestOrderRow | undefined) ?? null;
}

async function isPaid(orderId: string): Promise<boolean> {
  const { rows } = await getCommercePool().query(
    "SELECT EXISTS(SELECT 1 FROM private.provider_payments WHERE order_id = $1 AND status = 'succeeded') AS paid", [orderId]);
  return rows[0]?.paid === true;
}

/**
 * The guest order behind a Stripe return link, with its payment and email recorded if the webhook has not done so
 * yet. Only guest orders answer; an account's order is read through the signed-in path.
 */
export async function loadGuestCheckout(sessionId: string): Promise<GuestCheckout> {
  const order = await loadGuestOrder(sessionId);
  if (!order) return { state: "not_guest" };
  const base = { supportReference: order.support_reference, collectionTitle: order.collection_title };

  let paid = await isPaid(order.id);
  let email = order.buyer_email;
  const mock = isMockCheckoutSession(sessionId);

  if (!mock && isStripeConfigured()) {
    // With an approved policy the shared writer records the payment (and any refund) from Stripe's own answer.
    if (await refreshOrderFromProvider(order.id, paid)) paid = await isPaid(order.id);
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    if (!paid && session.payment_status === "paid") {
      const snapshot = order.snapshot;
      const paymentIntent = session.payment_intent;
      const piId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null;
      const latestCharge = paymentIntent && typeof paymentIntent === "object" ? paymentIntent.latest_charge : null;
      const matches = paymentCaptureMatchesSnapshot({
        expectedAmount: snapshot?.price_minor, expectedCurrency: snapshot?.currency, expectedMode: snapshot?.provider_mode,
        capturedAmount: session.amount_total, currency: session.currency, livemode: session.livemode,
      });
      if (!matches || !piId) {
        await markPurchaseOrderForReview(order.id);
        return { state: "pending", ...base };
      }
      await recordPaymentAndGrantAccess({
        orderId: order.id,
        providerAccountId: order.provider_account_id,
        providerMode: session.livemode ? "live" : "test",
        paymentIntentId: piId,
        chargeId: typeof latestCharge === "string" ? latestCharge : latestCharge?.id ?? null,
        capturedAmount: session.amount_total as number,
        currency: session.currency as string,
        paidAt: new Date(),
      });
      paid = await isPaid(order.id);
    }
    if (paid && !email && (await recordGuestBuyerEmail(order.id, session.customer_details?.email))) {
      email = (await loadGuestOrder(sessionId))?.buyer_email ?? null;
    }
  } else if (mock && canUseMockCheckout() && !paid) {
    // Local fixtures only: a mock session stands in for a paid Stripe checkout.
    const snapshot = order.snapshot;
    await recordPaymentAndGrantAccess({
      orderId: order.id,
      providerAccountId: order.provider_account_id,
      providerMode: "test",
      paymentIntentId: `pi_${sessionId}`,
      chargeId: `ch_${sessionId}`,
      capturedAmount: Number(snapshot?.price_minor),
      currency: String(snapshot?.currency ?? ""),
      paidAt: new Date(),
    });
    paid = await isPaid(order.id);
  }

  if (!paid) return { state: "pending", ...base };
  // Stripe always collects an email; only a local mock session reaches here without one.
  if (!email) return { state: "needs_email", ...base };
  return {
    state: "paid",
    ...base,
    collectionSlug: order.collection_slug,
    maskedEmail: maskEmail(email),
    claimed: order.user_id !== null,
  };
}

/** The full buyer email of a paid, unclaimed guest order, for sending its confirmation code. Server use only. */
export async function guestBuyerEmail(sessionId: string): Promise<string | null> {
  const order = await loadGuestOrder(sessionId);
  if (!order || order.user_id !== null || !order.buyer_email) return null;
  return (await isPaid(order.id)) ? order.buyer_email : null;
}

/** Local fixtures only: a mock session has no Stripe page, so the parent types the email Stripe would collect. */
export async function recordMockGuestEmail(sessionId: string, email: string): Promise<boolean> {
  if (!isMockCheckoutSession(sessionId) || !canUseMockCheckout()) return false;
  const order = await loadGuestOrder(sessionId);
  if (!order || !(await isPaid(order.id))) return false;
  return recordGuestBuyerEmail(order.id, email);
}
