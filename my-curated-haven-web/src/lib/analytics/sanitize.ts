import {
  ANALYTICS_SCHEMA_VERSION,
  CURRENT_CONSENT_POLICY_VERSION,
  type AnalyticsEnvelope,
  type AnalyticsEventMap,
  type AnalyticsEventName,
  type EventEnvironment,
  type EventSource,
  type CanonicalRouteKey,
} from "./events";
import { EVENT_ALLOWED_PROPERTIES } from "./schema";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const URL_WITH_PARAMS_REGEX = /https?:\/\/[^\s]+[?#]/;

export function sanitizeString(val: string, maxLen = 64): string {
  // Strip control chars, limit length
  const clean = val.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  return clean.slice(0, maxLen);
}

export function sanitizeProperties<T extends AnalyticsEventName>(
  eventName: T,
  props: AnalyticsEventMap[T]
): Record<string, unknown> {
  const allowed = EVENT_ALLOWED_PROPERTIES[eventName] || [];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    if (!allowed.includes(key)) {
      continue; // Drop unexpected or non-whitelisted property
    }

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "string") {
      // Security: Disallow emails or token-bearing URLs
      if (EMAIL_REGEX.test(value)) {
        continue;
      }
      if (URL_WITH_PARAMS_REGEX.test(value)) {
        continue;
      }
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "number") {
      if (Number.isFinite(value)) {
        sanitized[key] = value;
      }
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export interface BuildEnvelopeOptions<T extends AnalyticsEventName> {
  eventName: T;
  payload: AnalyticsEventMap[T];
  environment?: EventEnvironment;
  source?: EventSource;
  browserId?: string;
  sessionId?: string;
  routeKey?: CanonicalRouteKey;
  campaignCode?: string;
}

export function buildAnalyticsEnvelope<T extends AnalyticsEventName>({
  eventName,
  payload,
  environment = (process.env.NODE_ENV === "production" ? "production" : "development") as EventEnvironment,
  source = "browser",
  browserId,
  sessionId,
  routeKey,
  campaignCode,
}: BuildEnvelopeOptions<T>): AnalyticsEnvelope {
  const sanitizedProps = sanitizeProperties(eventName, payload);

  return {
    event_id: crypto.randomUUID(),
    event_name: eventName,
    schema_version: ANALYTICS_SCHEMA_VERSION,
    occurred_at: new Date().toISOString(),
    environment,
    source,
    consent_version: CURRENT_CONSENT_POLICY_VERSION,
    browser_id: browserId ? sanitizeString(browserId) : undefined,
    session_id: sessionId ? sanitizeString(sessionId) : undefined,
    route_key: routeKey,
    campaign_code: campaignCode ? sanitizeString(campaignCode, 32) : undefined,
    properties: sanitizedProps,
  };
}
