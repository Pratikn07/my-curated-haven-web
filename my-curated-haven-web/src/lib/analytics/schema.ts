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
};

export function pathToCanonicalRouteKey(pathname: string): CanonicalRouteKey | null {
  if (ALLOWED_ROUTE_KEYS[pathname]) {
    return ALLOWED_ROUTE_KEYS[pathname];
  }
  if (pathname.startsWith("/recipes/")) {
    return "recipe_detail";
  }
  if (pathname.startsWith("/collections/")) {
    return "collection_detail";
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
  sign_in_completed: ["entry_point"],
  recipe_save_changed: ["recipe_id", "action"],
  collection_view: ["collection_release_id"],
  checkout_clicked: ["collection_release_id", "entry_point"],
  checkout_created: ["collection_release_id", "attempt_ref"],
  purchase_confirmed: ["order_ref", "collection_release_id", "currency", "paid_minor"],
  purchase_access_activated: ["order_ref", "collection_release_id", "activation_delay_bucket"],
  refund_confirmed: ["refund_ref", "order_ref", "currency", "refunded_minor"],
  purchased_library_open: ["collection_release_id"],
  homepage_cta_clicked: ["placement", "destination", "presentation_state", "content_version"],
  homepage_preview_opened: ["feature_key", "placement", "content_version"],
  homepage_preview_viewed: ["feature_key", "content_version"],
};

export const EVENT_REQUIRED_PROPERTIES: Record<AnalyticsEventName, string[]> = {
  page_view: ["route_key", "device_class"],
  recipe_list_view: ["result_count_bucket", "listing_kind"],
  recipe_open: ["recipe_id", "access_kind"],
  recipe_search_submit: ["result_count_bucket", "zero_results"],
  recipe_filter_apply: ["active_filter_count", "result_count_bucket"],
  recipe_print_requested: ["recipe_id", "access_kind"],
  sign_in_started: ["entry_point"],
  sign_in_completed: ["entry_point"],
  recipe_save_changed: ["recipe_id", "action"],
  collection_view: ["collection_release_id"],
  checkout_clicked: ["collection_release_id", "entry_point"],
  checkout_created: ["collection_release_id", "attempt_ref"],
  purchase_confirmed: ["order_ref", "collection_release_id", "currency", "paid_minor"],
  purchase_access_activated: ["order_ref", "collection_release_id", "activation_delay_bucket"],
  refund_confirmed: ["refund_ref", "order_ref", "currency", "refunded_minor"],
  purchased_library_open: [],
  homepage_cta_clicked: ["placement", "destination", "presentation_state", "content_version"],
  homepage_preview_opened: ["feature_key", "placement", "content_version"],
  homepage_preview_viewed: ["feature_key", "content_version"],
};
