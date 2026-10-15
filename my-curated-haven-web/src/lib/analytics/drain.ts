import { getCommercePool } from "@/lib/payments/repository";
import { trustedAnalyticsEnvironment } from "./environment";

const QUEUE_LIMIT = 20;

/**
 * The capture key is PostHog's public project key, the same one the browser uses, so the server falls back to the
 * browser's key and host. Setting ANALYTICS_EXPORT_ENABLED is then the only extra step to switch exports on.
 */
function posthogTarget(): { host: string; apiKey: string } {
  return {
    host: (process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || "").replace(/\/$/, ""),
    apiKey: process.env.POSTHOG_SERVER_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
  };
}

function remoteDrainAllowed(): boolean {
  if (process.env.ANALYTICS_EXPORT_ENABLED !== "true") return false;
  const { host, apiKey } = posthogTarget();
  if (!apiKey || !host) return false;
  const env = trustedAnalyticsEnvironment();
  if (env !== "staging" && env !== "production") return false;
  const productionHost = (process.env.POSTHOG_PRODUCTION_HOST || "").replace(/\/$/, "");
  if (env !== "production" && productionHost && host === productionHost) {
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
    `SELECT e.id, e.event_name, e.payload, e.occurred_at, po.analytics_consent, po.user_id,
            po.analytics_distinct_id, po.analytics_session_id, po.campaign_code
     FROM private.analytics_exports e
     JOIN private.purchase_orders po ON po.id = e.order_id
     WHERE e.delivery_state = 'pending'
       AND e.environment = $1
     ORDER BY e.ingested_at
     LIMIT $2`,
    [environment, QUEUE_LIMIT]
  );

  const { host, apiKey } = posthogTarget();

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
    // The buyer's own PostHog id puts the purchase on the same visitor as their page views and campaign.
    // Orders from before it was stored fall back to the random attempt reference.
    const distinctId =
      typeof row.analytics_distinct_id === "string"
        ? row.analytics_distinct_id
        : typeof properties.attempt_ref === "string"
          ? properties.attempt_ref
          : typeof properties.order_ref === "string"
            ? properties.order_ref
            : "server";
    const occurredAt = row.occurred_at ? new Date(row.occurred_at) : new Date();
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
          // The export row id and the time it happened stay the same on a retry, so PostHog keeps one copy.
          uuid: row.id,
          event: row.event_name,
          distinct_id: distinctId,
          properties: {
            ...properties,
            environment,
            source: "server",
            ...(personless ? { $process_person_profile: false } : {}),
            // Read from the order too, so exports queued before 20261015090000 added them to the payload carry
            // them as well. Same property names the browser events use.
            ...(typeof row.analytics_session_id === "string" ? { $session_id: row.analytics_session_id } : {}),
            ...(typeof row.campaign_code === "string" ? { campaign_code: row.campaign_code } : {}),
          },
          timestamp: occurredAt.toISOString(),
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
