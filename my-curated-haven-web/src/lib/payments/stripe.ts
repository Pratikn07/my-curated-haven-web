import Stripe from "stripe";
import { getStripeConfig } from "./config";

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const config = getStripeConfig();
    stripeInstance = new Stripe(config.secretKey, {
      apiVersion: "2025-02-24.acacia" as const,
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
