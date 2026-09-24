import { NextResponse } from "next/server";
import crypto from "crypto";
import { getStripeConfig, isStripeConfigured } from "@/lib/payments/config";
import { constructWebhookEvent } from "@/lib/payments/stripe";
import { ingestPaymentEvent } from "@/lib/payments/repository";
import { processStripeWebhookEvent } from "@/lib/payments/fulfilment";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");
    const config = getStripeConfig();

    let event: {
      id: string;
      type: string;
      account?: string;
      livemode: boolean;
      data: {
        object: Record<string, unknown>;
      };
    };

    const stripeConfigured = isStripeConfigured();
    const allowUnsignedFixture =
      !stripeConfigured && process.env.VERCEL_ENV === undefined;

    if (!allowUnsignedFixture) {
      if (!signature) {
        return NextResponse.json({ error: "invalid signature" }, { status: 400 });
      }

      try {
        const verified = constructWebhookEvent(rawBody, signature, config.webhookSecret);
        event = verified as unknown as typeof event;
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
          data: parsed.data || { object: parsed },
        };
      } catch {
        return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
      }
    }

    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    const objectId = (event.data?.object?.id as string) || event.id;

    // Ingest event into database inbox
    await ingestPaymentEvent({
      eventId: event.id,
      providerAccountId: event.account || "acct_test",
      providerMode: event.livemode ? "live" : "test",
      apiVersion: "2025-02-24.acacia",
      eventType: event.type,
      objectId,
      payloadHash,
    });

    // Fulfill
    await processStripeWebhookEvent(event);

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
