import type { EventEnvironment } from "./events";

/**
 * Trusted deployment label. Preview and local builds stay "development"
 * until ANALYTICS_ENVIRONMENT or NEXT_PUBLIC_APP_ENV is set explicitly.
 * NODE_ENV=production is not enough: Vercel previews use that too.
 */
export function trustedAnalyticsEnvironment(): EventEnvironment {
  const raw = process.env.ANALYTICS_ENVIRONMENT || process.env.NEXT_PUBLIC_APP_ENV || "";
  if (
    raw === "production" ||
    raw === "staging" ||
    raw === "test" ||
    raw === "development"
  ) {
    return raw;
  }
  return "development";
}

/**
 * Remote capture is off unless a human turns the switch on and names
 * the environment. Non-production never uses the production PostHog host.
 */
export function remoteAnalyticsAllowed(): boolean {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true") return false;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return false;

  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  if (appEnv !== "production" && appEnv !== "staging") return false;

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "";
  if (appEnv !== "production" && host.length === 0) return false;

  const productionHost = process.env.NEXT_PUBLIC_POSTHOG_PRODUCTION_HOST;
  if (appEnv !== "production" && productionHost && host === productionHost) {
    return false;
  }

  return true;
}
