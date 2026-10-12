import Stripe from "stripe";
import { getStripeConfig } from "./config";

let stripeInstance: Stripe | null = null;

/** The Stripe API version every server read and write uses; provider observations record it. */
export const STRIPE_API_VERSION = "2026-08-26.dahlia" as const;

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const config = getStripeConfig();
    stripeInstance = new Stripe(config.secretKey, {
      apiVersion: STRIPE_API_VERSION,
      appInfo: {
        name: "My Curated Haven Web",
        version: "0.1.0",
      },
      timeout: 10_000,
      maxNetworkRetries: 2,
    });
  }
  return stripeInstance;
}

export function constructWebhookEvent(
  payload: string | Buffer,
  header: string,
  secret: string
): Stripe.Event {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, header, secret);
}
