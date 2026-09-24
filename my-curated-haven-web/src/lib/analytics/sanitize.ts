import {
  ANALYTICS_SCHEMA_VERSION,
  CURRENT_CONSENT_POLICY_VERSION,
  type AnalyticsEnvelope,
  type AnalyticsEventMap,
  type AnalyticsEventName,
  type CanonicalRouteKey,
  type EventEnvironment,
  type EventSource,
} from "./events";
import { isAllowedCampaign } from "./campaigns";
import { trustedAnalyticsEnvironment } from "./environment";
import { EVENT_ALLOWED_PROPERTIES, EVENT_REQUIRED_PROPERTIES } from "./schema";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURRENCY_REGEX = /^[a-z]{3}$/;

const ROUTE_KEYS = new Set([
  "home",
  "recipes",
  "recipe_detail",
  "collection_detail",
  "sign_in",
  "account",
  "account_saved_recipes",
  "account_collections",
  "checkout_return",
  "checkout_cancel",
  "privacy",
  "support",
  "about",
  "terms",
]);

const DEVICE_CLASSES = new Set(["mobile", "desktop", "tablet"]);
const RESULT_BUCKETS = new Set(["0", "1-5", "6-10", "11+"]);
const ENTRY_POINTS = new Set([
  "direct",
  "recipe",
  "collection",
  "account",
  "other",
  "collection_page",
]);
const DELAY_BUCKETS = new Set(["under_1m", "1m_to_5m", "over_5m"]);

const UUID_FIELDS = new Set([
  "recipe_id",
  "collection_release_id",
  "attempt_ref",
  "order_ref",
  "refund_ref",
]);

export type ValidationFailure = { ok: false; reason: string };
export type ValidationSuccess = { ok: true; properties: Record<string, unknown> };
export type ValidationResult = ValidationSuccess | ValidationFailure;

function fail(reason: string): ValidationFailure {
  return { ok: false, reason };
}

function checkString(key: string, value: string): string | ValidationFailure {
  if (value.length === 0 || value.length > 64) {
    return fail(`${key} length`);
  }
  if (/[\u0000-\u001F\u007F-\u009F]/.test(value)) {
    return fail(`${key} control`);
  }
  if (EMAIL_REGEX.test(value)) {
    return fail(`${key} email`);
  }
  if (/https?:\/\//i.test(value) || /[?#]/.test(value)) {
    return fail(`${key} url`);
  }
  if (UUID_FIELDS.has(key) && !UUID_REGEX.test(value)) {
    return fail(`${key} id`);
  }
  if (key === "route_key" && !ROUTE_KEYS.has(value)) return fail("route_key");
  if (key === "device_class" && !DEVICE_CLASSES.has(value)) return fail("device_class");
  if (key === "result_count_bucket" && !RESULT_BUCKETS.has(value)) {
    return fail("result_count_bucket");
  }
  if (key === "listing_kind" && value !== "all" && value !== "free") {
    return fail("listing_kind");
  }
  if (key === "access_kind" && value !== "free" && value !== "paid") {
    return fail("access_kind");
  }
  if (key === "action" && value !== "saved" && value !== "removed") return fail("action");
  if (key === "entry_point" && !ENTRY_POINTS.has(value)) return fail("entry_point");
  if (key === "currency" && !CURRENCY_REGEX.test(value)) return fail("currency");
  if (key === "activation_delay_bucket" && !DELAY_BUCKETS.has(value)) {
    return fail("activation_delay_bucket");
  }
  return value;
}

export function validateAnalyticsEvent(
  eventName: string,
  props: unknown
): ValidationResult {
  if (!(eventName in EVENT_ALLOWED_PROPERTIES)) {
    return fail("event_name");
  }
  const name = eventName as AnalyticsEventName;
  if (props === null || typeof props !== "object" || Array.isArray(props)) {
    return fail("properties");
  }

  const allowed = EVENT_ALLOWED_PROPERTIES[name];
  const required = EVENT_REQUIRED_PROPERTIES[name];
  const input = props as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) {
      return fail(`extra:${key}`);
    }
  }

  for (const key of required) {
    if (input[key] === undefined || input[key] === null) {
      return fail(`missing:${key}`);
    }
  }

  for (const key of allowed) {
    const value = input[key];
    if (value === undefined || value === null) continue;

    if (typeof value === "string") {
      const checked = checkString(key, value);
      if (typeof checked !== "string") return checked;
      sanitized[key] = checked;
    } else if (typeof value === "number") {
      if (!Number.isInteger(value) || value < 0 || value > 100_000_000) {
        return fail(key);
      }
      if ((key === "refunded_minor" || key === "paid_minor") && value <= 0) {
        return fail(key);
      }
      sanitized[key] = value;
    } else if (typeof value === "boolean") {
      if (key !== "zero_results") return fail(key);
      sanitized[key] = value;
    } else {
      return fail(key);
    }
  }

  for (const key of required) {
    if (sanitized[key] === undefined) return fail(`missing:${key}`);
  }

  return { ok: true, properties: sanitized };
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

export function buildAnalyticsEnvelope<T extends AnalyticsEventName>(
  options: BuildEnvelopeOptions<T>
): AnalyticsEnvelope | null {
  const validated = validateAnalyticsEvent(options.eventName, options.payload);
  if (!validated.ok) return null;

  const browserId = boundedId(options.browserId);
  const sessionId = boundedId(options.sessionId);
  const campaignCode =
    options.campaignCode && isAllowedCampaign(options.campaignCode)
      ? options.campaignCode
      : undefined;

  return {
    event_id: crypto.randomUUID(),
    event_name: options.eventName,
    schema_version: ANALYTICS_SCHEMA_VERSION,
    occurred_at: new Date().toISOString(),
    environment: options.environment ?? trustedAnalyticsEnvironment(),
    source: options.source === "server" ? "server" : "browser",
    consent_version: CURRENT_CONSENT_POLICY_VERSION,
    browser_id: browserId,
    session_id: sessionId,
    route_key: options.routeKey,
    campaign_code: campaignCode,
    properties: validated.properties,
  };
}

function boundedId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.length > 64) return undefined;
  if (EMAIL_REGEX.test(value) || /[?#]/.test(value)) return undefined;
  return value;
}

export function buildServerAnalyticsEnvelope<T extends AnalyticsEventName>(
  options: Omit<BuildEnvelopeOptions<T>, "source" | "browserId"> & {
    environment: EventEnvironment;
  }
): AnalyticsEnvelope | null {
  return buildAnalyticsEnvelope({
    ...options,
    source: "server",
    browserId: undefined,
  });
}
