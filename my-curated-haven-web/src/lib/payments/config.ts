import { SITE_ORIGIN } from "@/config/site-navigation";

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  expectedAccountId?: string;
  isLiveMode: boolean;
  checkoutEnabled: boolean;
  appOrigin: string;
}

export function getStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mock_dummy_key_for_development";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock_dummy_webhook_secret";
  const expectedAccountId = process.env.STRIPE_EXPECTED_ACCOUNT_ID;
  const isLiveMode = process.env.STRIPE_EXPECTED_LIVEMODE === "true";
  const checkoutEnabled = process.env.CHECKOUT_ENABLED !== "false";
  const appOrigin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_ORIGIN || SITE_ORIGIN;

  return {
    secretKey,
    webhookSecret,
    expectedAccountId,
    isLiveMode,
    checkoutEnabled,
    appOrigin,
  };
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.includes("mock_dummy")
  );
}
