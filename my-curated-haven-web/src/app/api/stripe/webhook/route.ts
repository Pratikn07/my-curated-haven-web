import { NextResponse } from "next/server";
import crypto from "crypto";
import { getStripeConfig, isStripeConfigured } from "@/lib/payments/config";
import { constructWebhookEvent } from "@/lib/payments/stripe";
import { handleStripeEvent, StripeAccountUnknown, type StripeInboxEvent } from "@/lib/payments/inbox";

/**
 * Verify the signature, then store and process the event once (`handleStripeEvent`). A retryable failure answers 500
 * so Stripe delivers the event again; a deployed site without STRIPE_EXPECTED_ACCOUNT_ID answers 503.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");
    const config = getStripeConfig();

    let event: StripeInboxEvent;

    const stripeConfigured = isStripeConfigured();
    const allowUnsignedFixture =
      !stripeConfigured && process.env.VERCEL_ENV === undefined;

    if (!allowUnsignedFixture) {
      if (!config.webhookSecret) {
        console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set; refusing event");
        return NextResponse.json({ error: "webhooks not configured" }, { status: 503 });
      }
      if (!signature) {
        return NextResponse.json({ error: "invalid signature" }, { status: 400 });
      }

      try {
        const verified = constructWebhookEvent(rawBody, signature, config.webhookSecret);
        event = verified as unknown as StripeInboxEvent;
      } catch {
        return NextResponse.json({ error: "invalid signature" }, { status: 400 });
      }
    } else {
      // Unsigned fixtures are restricted to local, unconfigured development.
      try {
        const parsed = JSON.parse(rawBody);
        event = {
          id: parsed.id || `evt_mock_${crypto.randomUUID()}`,
          type: parsed.type || "checkout.session.completed",
          account: parsed.account || config.expectedAccountId,
          livemode: parsed.livemode || false,
          api_version: parsed.api_version ?? null,
          data: parsed.data || { object: parsed },
        };
      } catch {
        return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
      }
    }

    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    const outcome = await handleStripeEvent(event, payloadHash, { fixtureAccount: allowUnsignedFixture ? "acct_test" : null });
    if (outcome === "retry") return NextResponse.json({ error: "retry later" }, { status: 500 });
    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    if (err instanceof StripeAccountUnknown) {
      console.error("[stripe-webhook] STRIPE_EXPECTED_ACCOUNT_ID is not set; refusing event");
      return NextResponse.json({ error: "webhooks not configured" }, { status: 503 });
    }
    // Log the detail; never echo database or provider errors to the caller (R8-04).
    console.error("[stripe-webhook] processing failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "webhook processing failed" }, { status: 500 });
  }
}
