import {
  type AnalyticsEventName,
  type ResultCountBucket,
  type CanonicalRouteKey,
  type DeviceClass,
} from "./events";

export function toResultCountBucket(count: number): ResultCountBucket {
  if (count <= 0) return "0";
  if (count <= 5) return "1-5";
  if (count <= 10) return "6-10";
  return "11+";
}

export function toDeviceClass(userAgent: string): DeviceClass {
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    return "mobile";
  }
  return "desktop";
}

export const ALLOWED_ROUTE_KEYS: Record<string, CanonicalRouteKey> = {
  "/": "home",
  "/recipes": "recipes",
  "/sign-in": "sign_in",
  "/account": "account",
  "/account/saved-recipes": "account_saved_recipes",
  "/account/collections": "account_collections",
  "/checkout/return": "checkout_return",
  "/checkout/cancel": "checkout_cancel",
  "/privacy": "privacy",
  "/support": "support",
  "/about": "about",
  "/terms": "terms",
  "/halloween": "halloween",
  "/collections": "collections",
};

export function pathToCanonicalRouteKey(pathname: string): CanonicalRouteKey | null {
  if (ALLOWED_ROUTE_KEYS[pathname]) {
    return ALLOWED_ROUTE_KEYS[pathname];
  }
  if (pathname.startsWith("/recipes/")) {
    return "recipe_detail";
  }
  if (pathname.startsWith("/collections/series/")) {
    return "collection_series";
  }
  if (/^\/collections\/[^/]+\/plan\/?$/.test(pathname)) {
    return "collection_plan";
  }
  if (pathname.startsWith("/collections/")) {
    return "collection_detail";
  }
  if (pathname.startsWith("/stories/")) {
    return "story";
  }
  return null;
}

export function coarseEntryPoint(
  returnTo?: string | null
): "direct" | "recipe" | "collection" | "account" | "other" {
  if (!returnTo) return "direct";
  const path = returnTo.split("?")[0]?.split("#")[0] ?? "";
  if (path.startsWith("/recipes")) return "recipe";
  if (path.startsWith("/collections")) return "collection";
  if (path.startsWith("/account")) return "account";
  if (
    path === "direct" ||
    path === "recipe" ||
    path === "collection" ||
    path === "account" ||
    path === "other"
  ) {
    return path;
  }
  return "other";
}

export const EVENT_ALLOWED_PROPERTIES: Record<AnalyticsEventName, string[]> = {
  page_view: ["route_key", "device_class"],
  recipe_list_view: ["result_count_bucket", "listing_kind"],
  recipe_open: ["recipe_id", "access_kind"],
  recipe_search_submit: ["result_count_bucket", "zero_results"],
  recipe_filter_apply: ["active_filter_count", "result_count_bucket"],
  recipe_print_requested: ["recipe_id", "access_kind"],
  sign_in_started: ["entry_point"],
  sign_in_completed: ["entry_point", "method"],
  recipe_save_changed: ["recipe_id", "action"],
  collection_view: ["collection_slug", "collection_release_id", "ownership_state"],
  checkout_clicked: ["collection_slug", "surface", "collection_release_id"],
  checkout_created: ["collection_release_id", "attempt_ref"],
  purchase_confirmed: ["order_ref", "collection_release_id", "currency", "paid_minor"],
  purchase_access_activated: ["order_ref", "collection_release_id", "activation_delay_bucket"],
  refund_confirmed: ["refund_ref", "order_ref", "currency", "refunded_minor"],
  purchased_library_open: ["collection_release_id"],
  make_ahead_plan_open: ["collection_release_id"],
  homepage_preview_opened: ["feature_key", "placement", "content_version"],
  story_view: ["story_slug", "room", "recipe_count", "offer_state", "story_series"],
  // Tracking PR 2
  cta_clicked: ["primary_ux", "link_type", "cta", "cta_position", "destination_kind", "target_kind", "target_slug"],
  section_viewed: ["primary_ux"],
  offer_viewed: ["surface", "collection_slug", "ownership_state", "price_minor", "currency"],
  page_scroll_reached: ["depth"],
  page_time_reached: ["seconds"],
  // Tracking PR 3
  paywall_viewed: ["recipe_id", "collection_slug"],
  checkout_failed: ["collection_slug", "surface", "checkout_error"],
  checkout_cancelled: ["collection_slug"],
  purchase_confirmation_viewed: ["order_ref", "collection_slug"],
  purchase_claimed: ["collection_slug"],
  sign_in_method_chosen: ["method", "entry_point"],
  sign_in_code_sent: ["entry_point"],
  sign_in_failed: ["sign_in_step", "sign_in_error"],
  recipe_filter_value_applied: ["filter_kind", "filter_value"],
  faq_opened: ["primary_ux", "question_key"],
  room_closed: ["feature_key", "seconds_bucket"],
  sample_interacted: ["sample", "choice"],
  not_found_viewed: ["route_class"],
  load_failed: ["primary_ux"],
  save_failed: ["recipe_id"],
  empty_state_viewed: ["primary_ux"],
};

export const EVENT_REQUIRED_PROPERTIES: Record<AnalyticsEventName, string[]> = {
  page_view: ["route_key", "device_class"],
  recipe_list_view: ["result_count_bucket", "listing_kind"],
  recipe_open: ["recipe_id", "access_kind"],
  recipe_search_submit: ["result_count_bucket", "zero_results"],
  recipe_filter_apply: ["active_filter_count", "result_count_bucket"],
  recipe_print_requested: ["recipe_id", "access_kind"],
  sign_in_started: ["entry_point"],
  sign_in_completed: ["entry_point", "method"],
  recipe_save_changed: ["recipe_id", "action"],
  collection_view: ["collection_slug"],
  checkout_clicked: ["collection_slug", "surface"],
  checkout_created: ["collection_release_id", "attempt_ref"],
  purchase_confirmed: ["order_ref", "collection_release_id", "currency", "paid_minor"],
  purchase_access_activated: ["order_ref", "collection_release_id", "activation_delay_bucket"],
  refund_confirmed: ["refund_ref", "order_ref", "currency", "refunded_minor"],
  purchased_library_open: [],
  make_ahead_plan_open: ["collection_release_id"],
  homepage_preview_opened: ["feature_key", "placement", "content_version"],
  story_view: ["story_slug", "room"],
  // Tracking PR 2
  cta_clicked: ["primary_ux", "link_type"],
  section_viewed: ["primary_ux"],
  offer_viewed: ["surface", "collection_slug"],
  page_scroll_reached: ["depth"],
  page_time_reached: ["seconds"],
  // Tracking PR 3
  paywall_viewed: ["recipe_id"],
  checkout_failed: ["collection_slug", "surface", "checkout_error"],
  checkout_cancelled: [],
  purchase_confirmation_viewed: ["order_ref", "collection_slug"],
  purchase_claimed: [],
  sign_in_method_chosen: ["method", "entry_point"],
  sign_in_code_sent: ["entry_point"],
  sign_in_failed: ["sign_in_step", "sign_in_error"],
  recipe_filter_value_applied: ["filter_kind", "filter_value"],
  faq_opened: ["primary_ux", "question_key"],
  room_closed: ["feature_key", "seconds_bucket"],
  sample_interacted: ["sample"],
  not_found_viewed: ["route_class"],
  load_failed: ["primary_ux"],
  save_failed: ["recipe_id"],
  empty_state_viewed: ["primary_ux"],
};

// Tracking PR 2: page context.
const CONTENT_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CONTENT_PATHS = [
  /^\/recipes\/([^/]+)\/?$/,
  /^\/collections\/(?!series(?:\/|$))([^/]+)(?:\/plan)?\/?$/,
  /^\/stories\/([^/]+)\/?$/,
];

/**
 * The recipe, book, plan or story a page is about, from its address: /recipes/<slug>, /collections/<slug>,
 * /collections/<slug>/plan and /stories/<slug> give the slug, /halloween gives "halloween". Other pages have none.
 */
export function contentSlugFromPath(pathname: string): string | undefined {
  if (pathname === "/halloween" || pathname === "/halloween/") return "halloween";
  for (const pattern of CONTENT_PATHS) {
    const match = pattern.exec(pathname);
    if (match) return CONTENT_SLUG.test(match[1]) ? match[1] : undefined;
  }
  return undefined;
}

// Tracking PR 3

/** A public slug (book, recipe, landing page, question key), the same pattern the validator checks. */
export function isTrackingSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

/** How long something stayed open, in the three buckets room_closed reports. */
export function toSecondsBucket(seconds: number): import("./events").RoomSecondsBucket {
  if (seconds < 10) return "under_10s";
  if (seconds <= 30) return "10_to_30s";
  return "over_30s";
}

/** Which kind of address a 404 page was shown for. */
export function routeClassFromPath(pathname: string): import("./events").NotFoundRouteClass {
  if (pathname.startsWith("/recipes/")) return "recipe";
  if (pathname.startsWith("/collections/")) return "collection";
  if (pathname.startsWith("/stories/")) return "story";
  return "other";
}
