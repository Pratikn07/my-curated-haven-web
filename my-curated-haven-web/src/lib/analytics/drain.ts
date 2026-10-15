import { getCommercePool } from "@/lib/payments/repository";
import { trustedAnalyticsEnvironment } from "./environment";

const QUEUE_LIMIT = 20;

function remoteDrainAllowed(): boolean {
  if (process.env.ANALYTICS_EXPORT_ENABLED !== "true") return false;
  if (!process.env.POSTHOG_SERVER_KEY || !process.env.POSTHOG_HOST) return false;
  const env = trustedAnalyticsEnvironment();
  if (env !== "staging" && env !== "production") return false;
  const productionHost = process.env.POSTHOG_PRODUCTION_HOST;
  if (env !== "production" && productionHost && process.env.POSTHOG_HOST === productionHost) {
    return false;
  }
  return true;
}

/**
 * Sends pending optional exports. Financial rows stay either way.
 * No-op unless the server export switch, key, and environment all agree.
 */
export async function drainOptionalAnalyticsExports(): Promise<void> {
  if (!remoteDrainAllowed()) return;

  const environment = trustedAnalyticsEnvironment();
  const pool = getCommercePool();
  const { rows } = await pool.query(
    `SELECT e.id, e.event_name, e.payload, po.analytics_consent, po.analytics_distinct_id, po.user_id
     FROM private.analytics_exports e
     JOIN private.purchase_orders po ON po.id = e.order_id
     WHERE e.delivery_state = 'pending'
       AND e.environment = $1
     ORDER BY e.ingested_at
     LIMIT $2`,
    [environment, QUEUE_LIMIT]
  );

  const host = (process.env.POSTHOG_HOST || "").replace(/\/$/, "");
  const apiKey = process.env.POSTHOG_SERVER_KEY || "";

  for (const row of rows) {
    if (row.analytics_consent !== true) {
      await pool.query(
        `UPDATE private.analytics_exports
         SET delivery_state = 'suppressed', suppressed_reason = 'withdrawn'
         WHERE id = $1 AND delivery_state = 'pending'`,
        [row.id]
      );
      continue;
    }

    const properties = row.payload ?? {};
    // The visitor who tapped Buy, so the purchase joins their visit in PostHog. Orders placed before the
    // checkout passed it along fall back to their random attempt reference.
    const distinctId =
      typeof row.analytics_distinct_id === "string"
        ? row.analytics_distinct_id
        : typeof properties.attempt_ref === "string"
          ? properties.attempt_ref
          : typeof properties.order_ref === "string"
            ? properties.order_ref
            : "server";
    // A signed-in buyer already has a PostHog profile; a guest's anonymous visit stays without one.
    const personless = row.user_id === null || typeof row.analytics_distinct_id !== "string";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${host}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          event: row.event_name,
          distinct_id: distinctId,
          properties: {
            ...properties,
            environment,
            source: "server",
            ...(personless ? { $process_person_profile: false } : {}),
          },
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("analytics export rejected");

      await pool.query(
        `UPDATE private.analytics_exports
         SET delivery_state = 'exported', attempts = attempts + 1
         WHERE id = $1 AND delivery_state = 'pending'`,
        [row.id]
      );
    } catch {
      await pool.query(
        `UPDATE private.analytics_exports
         SET attempts = attempts + 1,
             delivery_state = CASE WHEN attempts + 1 >= 5 THEN 'failed' ELSE 'pending' END
         WHERE id = $1 AND delivery_state = 'pending'`,
        [row.id]
      );
    }
  }
}
