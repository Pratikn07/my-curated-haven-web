import {
  ANALYTICS_SCHEMA_VERSION,
  CURRENT_CONSENT_POLICY_VERSION,
  type AccessState,
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
import { isPrimaryUx } from "./ux";
import { RECIPE_FILTER_VALUE_SLUGS } from "../recipes/filters";

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
  "story",
  "halloween",
  "collections",
  "collection_plan",
  "collection_series",
]);

const DEVICE_CLASSES = new Set(["mobile", "desktop", "tablet"]);
const RESULT_BUCKETS = new Set(["0", "1-5", "6-10", "11+"]);
const ENTRY_POINTS = new Set([
  "direct",
  "recipe",
  "collection",
  "account",
  "other",
]);
const DELAY_BUCKETS = new Set(["under_1m", "1m_to_5m", "over_5m"]);
const SIGN_IN_METHODS = new Set(["email_code", "google"]);
const HOMEPAGE_FEATURE_KEYS = new Set(["kitchen", "library", "nursery", "shelf"]);
const HOMEPAGE_PLACEMENTS = new Set(["hero", "house", "overview", "preview", "footer", "final"]);
const HOMEPAGE_DESTINATIONS = new Set([
  "recipes_index",
  "recipe_detail",
  "collection_detail",
  "previews",
  "about",
  "support",
]);
const HOMEPAGE_PRESENTATION_STATES = new Set(["preparation", "free_ready", "collection_ready"]);
const STORY_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** Public slugs of books, recipes and landing pages. */
const SLUG_REGEX = STORY_SLUG_REGEX;
const CHECKOUT_SURFACES = new Set(["lock_card", "buy_box"]);
const OWNERSHIP_STATES = new Set(["owned", "not_owned", "unauthenticated", "pending_payment", "unavailable"]);
const STORY_ROOMS = new Set(["kitchen"]);
const STORY_ACTIONS = new Set([
  "recipe_jump",
  "full_recipe",
  "more_recipe",
  "collection",
  "about",
  "campaign_recipe",
  "pack",
  "instagram",
  "recipes_index",
  "home",
  "make_ahead_plan",
]);
const STORY_PLACEMENTS = new Set([
  "card",
  "sticky",
  "recipe",
  "next",
  "offer",
  "about",
  "hero",
  "recipes",
  "story",
  "pack",
  "collection",
  "related",
  "closing",
  "plan",
]);
const STORY_OFFER_STATES = new Set(["none", "pack", "collection", "both"]);
const STORY_SECTIONS = new Set(["recipes", "story", "story_end", "pack", "collection", "related", "questions", "closing", "plan"]);
const STORY_SERIES_REGEX = /^[a-z0-9][a-z0-9-]{0,39}$/;
/** Small counts on campaign pages; anything larger is a bug, not data. */
const SMALL_COUNT_FIELDS: Record<string, [number, number]> = { recipe_count: [0, 50], recipe_position: [1, 50] };

const UUID_FIELDS = new Set([
  "recipe_id",
  "collection_release_id",
  "attempt_ref",
  "order_ref",
  "refund_ref",
]);

// Tracking PR 2: labelled clicks, page context, milestones and views.
const LINK_TYPES = new Set(["internal", "external", "anchor", "action"]);
const DESTINATION_KINDS = new Set([
  ...ROUTE_KEYS,
  "checkout",
  "anchor",
  "email",
  "instagram",
  "stripe",
  "external",
  "other_page",
  "none",
]);
const TARGET_KINDS = new Set(["recipe", "collection", "plan", "series", "story"]);
const ACCESS_STATES = new Set(["free", "locked", "owned", "preview"]);
const CTA_REGEX = /^[a-z][a-z0-9_]{0,31}$/;
/** Where an offer is shown. surface is checked by name, so it holds all of them; checkout events allow only CHECKOUT_SURFACES. */
const OFFER_SURFACES = new Set(["lock_card", "buy_box", "sticky_bar", "book_card", "story_offer"]);
/** Events whose surface is the Buy button checkout started from. checkout_failed arrives in tracking PR 3. */
const CHECKOUT_EVENTS = new Set(["checkout_clicked", "checkout_failed"]);
const SCROLL_DEPTHS = new Set([25, 50, 75, 100]);
const VISIBLE_SECONDS = new Set([15, 30, 60]);
/** Fields with one type only: a number sent as text (or text as a number) is a bug, not data. */
const NUMBER_ONLY_FIELDS = new Set(["cta_position", "price_minor", "depth", "seconds"]);
const STRING_ONLY_FIELDS = new Set([
  "primary_ux",
  "link_type",
  "cta",
  "destination_kind",
  "target_kind",
  "target_slug",
  "surface",
]);
// Tracking PR 3
const CHECKOUT_ERRORS = new Set(["already_owned", "refresh_required", "unavailable", "network", "server"]);
const SIGN_IN_STEPS = new Set(["send_code", "verify_code", "google"]);
const SIGN_IN_ERRORS = new Set(["invalid_code", "expired_code", "rate_limited", "bot_check", "cancelled", "unknown"]);
const FILTER_KINDS = new Set(["meal", "diet", "time"]);
const FILTER_VALUES = new Set<string>([
  ...RECIPE_FILTER_VALUE_SLUGS.meal,
  ...RECIPE_FILTER_VALUE_SLUGS.diet,
  ...RECIPE_FILTER_VALUE_SLUGS.time,
]);
const SECONDS_BUCKETS = new Set(["under_10s", "10_to_30s", "over_30s"]);
const HOMEPAGE_SAMPLES = new Set(["storybook_story", "storybook_style", "nursery_stamp", "shelf_reveal"]);
const ROUTE_CLASSES = new Set(["recipe", "collection", "story", "other"]);

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
  if (key === "method" && !SIGN_IN_METHODS.has(value)) return fail("method");
  if (key === "currency" && !CURRENCY_REGEX.test(value)) return fail("currency");
  if (key === "activation_delay_bucket" && !DELAY_BUCKETS.has(value)) {
    return fail("activation_delay_bucket");
  }
  if (key === "feature_key" && !HOMEPAGE_FEATURE_KEYS.has(value)) return fail("feature_key");
  if (key === "placement" && !HOMEPAGE_PLACEMENTS.has(value)) return fail("placement");
  if (key === "destination" && !HOMEPAGE_DESTINATIONS.has(value)) return fail("destination");
  if (key === "presentation_state" && !HOMEPAGE_PRESENTATION_STATES.has(value)) {
    return fail("presentation_state");
  }
  if (key === "story_slug" && !STORY_SLUG_REGEX.test(value)) return fail("story_slug");
  if (key === "collection_slug" && !SLUG_REGEX.test(value)) return fail("collection_slug");
  if (key === "surface" && !OFFER_SURFACES.has(value)) return fail("surface");
  if (key === "ownership_state" && !OWNERSHIP_STATES.has(value)) return fail("ownership_state");
  if (key === "primary_ux" && !isPrimaryUx(value)) return fail("primary_ux");
  if (key === "room" && !STORY_ROOMS.has(value)) return fail("room");
  if (key === "story_action" && !STORY_ACTIONS.has(value)) return fail("story_action");
  if (key === "story_placement" && !STORY_PLACEMENTS.has(value)) return fail("story_placement");
  if (key === "offer_state" && !STORY_OFFER_STATES.has(value)) return fail("offer_state");
  if (key === "story_section" && !STORY_SECTIONS.has(value)) return fail("story_section");
  if (key === "story_series" && !STORY_SERIES_REGEX.test(value)) return fail("story_series");
  if (key === "content_version" && !/^h[vh]-[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) {
    return fail("content_version");
  }
  // Tracking PR 2
  if (NUMBER_ONLY_FIELDS.has(key)) return fail(key);
  if (key === "link_type" && !LINK_TYPES.has(value)) return fail("link_type");
  if (key === "cta" && !CTA_REGEX.test(value)) return fail("cta");
  if (key === "destination_kind" && !DESTINATION_KINDS.has(value)) return fail("destination_kind");
  if (key === "target_kind" && !TARGET_KINDS.has(value)) return fail("target_kind");
  if (key === "target_slug" && !SLUG_REGEX.test(value)) return fail("target_slug");
  // Tracking PR 3
  if (key === "checkout_error" && !CHECKOUT_ERRORS.has(value)) return fail("checkout_error");
  if (key === "sign_in_step" && !SIGN_IN_STEPS.has(value)) return fail("sign_in_step");
  if (key === "sign_in_error" && !SIGN_IN_ERRORS.has(value)) return fail("sign_in_error");
  if (key === "filter_kind" && !FILTER_KINDS.has(value)) return fail("filter_kind");
  if (key === "filter_value" && !FILTER_VALUES.has(value)) return fail("filter_value");
  if (key === "question_key" && !SLUG_REGEX.test(value)) return fail("question_key");
  if (key === "seconds_bucket" && !SECONDS_BUCKETS.has(value)) return fail("seconds_bucket");
  if (key === "sample" && !HOMEPAGE_SAMPLES.has(value)) return fail("sample");
  if (key === "choice" && !SLUG_REGEX.test(value)) return fail("choice");
  if (key === "route_class" && !ROUTE_CLASSES.has(value)) return fail("route_class");
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
      const range = SMALL_COUNT_FIELDS[key];
      if (range && (value < range[0] || value > range[1])) return fail(key);
      // Tracking PR 2
      if (STRING_ONLY_FIELDS.has(key)) return fail(key);
      if (key === "cta_position" && (value < 1 || value > 50)) return fail(key);
      if (key === "price_minor" && value <= 0) return fail(key);
      if (key === "depth" && !SCROLL_DEPTHS.has(value)) return fail(key);
      if (key === "seconds" && !VISIBLE_SECONDS.has(value)) return fail(key);
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

  // Tracking PR 2: a phone buy bar or a book card can be seen, but checkout only starts from a Buy button.
  if (CHECKOUT_EVENTS.has(name) && sanitized.surface !== undefined && !CHECKOUT_SURFACES.has(String(sanitized.surface))) {
    return fail("surface");
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
  // Tracking PR 2: page context. Invalid values are left out; they never drop the event.
  contentSlug?: string;
  accessState?: string;
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
    // Tracking PR 2
    ...pageContext(options.contentSlug, options.accessState),
  };
}

// Tracking PR 2
function pageContext(contentSlug: string | undefined, accessState: string | undefined): Pick<AnalyticsEnvelope, "content_slug" | "access_state"> {
  return {
    ...(contentSlug && SLUG_REGEX.test(contentSlug) ? { content_slug: contentSlug } : {}),
    ...(accessState && ACCESS_STATES.has(accessState) ? { access_state: accessState as AccessState } : {}),
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
