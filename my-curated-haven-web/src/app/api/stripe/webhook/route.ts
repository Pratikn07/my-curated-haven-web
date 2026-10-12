import { NextResponse } from "next/server";
import crypto from "crypto";
import { getStripeConfig, isStripeConfigured } from "@/lib/payments/config";
import { constructWebhookEvent, STRIPE_API_VERSION } from "@/lib/payments/stripe";
import { ingestPaymentEvent, markPaymentEventProcessed, resolveEventOrder } from "@/lib/payments/repository";
import { processStripeWebhookEvent } from "@/lib/payments/fulfilment";
import { processVerifiedCommerceEvent, routingHints, type EventResult } from "@/lib/payments/reconciliation/events";
import { verifierConfigured } from "@/lib/payments/reconciliation/repository";
import { eventDependencies } from "@/lib/payments/reconciliation/service";

type StripeEvent = {
  id: string;
  type: string;
  account?: string;
  livemode: boolean;
  api_version?: string | null;
  data: {
    object: Record<string, unknown>;
  };
};

/**
 * Verify, store once, then process. With a registered verifier, an order whose policy is approved is re-checked with
 * Stripe and reconciled through the shared writer; otherwise the guarded older processing handles the delivery.
 * A retryable failure answers 500 so Stripe delivers the event again.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");
    const config = getStripeConfig();

    let event: StripeEvent;

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
        event = verified as unknown as StripeEvent;
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
    const objectId = (event.data?.object?.id as string) || event.id;
    const mode = event.livemode ? "live" : "test";
    // The event body only identifies the order; the facts are re-read from Stripe.
    const target = await resolveEventOrder(mode, routingHints(event.type, event.data?.object ?? {}));

    const inboxId = await ingestPaymentEvent({
      eventId: event.id,
      // Direct-account events omit `account`; the endpoint signature binds them to the configured account.
      providerAccountId: event.account || config.expectedAccountId || target?.accountId || "acct_unbound",
      providerMode: mode,
      apiVersion: event.api_version || STRIPE_API_VERSION,
      eventType: event.type,
      objectId,
      payloadHash,
      orderId: target?.orderId ?? null,
    });

    const legacy = () => processStripeWebhookEvent(event);
    const result: EventResult = verifierConfigured()
      ? await processVerifiedCommerceEvent(inboxId, eventDependencies(legacy))
      : { state: "unavailable" };

    if (result.state === "unavailable") {
      try {
        await legacy();
      } catch (err) {
        await markPaymentEventProcessed(inboxId, "failed", "LEGACY_FAILED").catch(() => {});
        throw err;
      }
      await markPaymentEventProcessed(inboxId, "completed", null);
    } else if (result.state === "retry") {
      return NextResponse.json({ error: "retry later" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    // Log the detail; never echo database or provider errors to the caller (R8-04).
    console.error("[stripe-webhook] processing failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "webhook processing failed" }, { status: 500 });
  }
}
