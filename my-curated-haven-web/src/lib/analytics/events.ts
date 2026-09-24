/**
 * Phase 9 Measurement & Event Contract
 * Discriminated event union and envelope definitions.
 */

export const ANALYTICS_SCHEMA_VERSION = 1;
export const CURRENT_CONSENT_POLICY_VERSION = "2026-09-24";

export type EventEnvironment = "development" | "staging" | "production" | "test";
export type EventSource = "browser" | "server";
export type DeviceClass = "mobile" | "desktop" | "tablet";

export type ResultCountBucket = "0" | "1-5" | "6-10" | "11+";
export type RecipeAccessKind = "free" | "paid";
export type RecipeSaveAction = "saved" | "removed";
export type HomepageFeatureKey = "chat" | "shop" | "bloom";
export type HomepagePlacement = "hero" | "overview" | "preview" | "footer" | "final";
export type HomepageDestination =
  | "recipes_index"
  | "recipe_detail"
  | "collection_detail"
  | "previews"
  | "about"
  | "support";
export type HomepagePresentationState = "preparation" | "free_ready" | "collection_ready";

export type CanonicalRouteKey =
  | "home"
  | "recipes"
  | "recipe_detail"
  | "collection_detail"
  | "sign_in"
  | "account"
  | "account_saved_recipes"
  | "account_collections"
  | "checkout_return"
  | "checkout_cancel"
  | "privacy"
  | "support"
  | "about"
  | "terms";

export interface AnalyticsEnvelope {
  event_id: string;
  event_name: string;
  schema_version: number;
  occurred_at: string;
  environment: EventEnvironment;
  source: EventSource;
  consent_version: string;
  browser_id?: string;
  session_id?: string;
  route_key?: CanonicalRouteKey;
  campaign_code?: string;
  properties: Record<string, unknown>;
}

export interface PageViewPayload {
  route_key: CanonicalRouteKey;
  device_class: DeviceClass;
}

export interface RecipeListViewPayload {
  result_count_bucket: ResultCountBucket;
  listing_kind: "all" | "free";
}

export interface RecipeOpenPayload {
  recipe_id: string;
  access_kind: RecipeAccessKind;
}

export interface RecipeSearchSubmitPayload {
  result_count_bucket: ResultCountBucket;
  zero_results: boolean;
}

export interface RecipeFilterApplyPayload {
  active_filter_count: number;
  result_count_bucket: ResultCountBucket;
}

export interface RecipePrintRequestedPayload {
  recipe_id: string;
  access_kind: RecipeAccessKind;
}

export interface SignInStartedPayload {
  entry_point: string;
}

export interface SignInCompletedPayload {
  entry_point: string;
}

export interface RecipeSaveChangedPayload {
  recipe_id: string;
  action: RecipeSaveAction;
}

export interface CollectionViewPayload {
  collection_release_id: string;
}

export interface CheckoutClickedPayload {
  collection_release_id: string;
  entry_point: string;
}

export interface CheckoutCreatedPayload {
  collection_release_id: string;
  attempt_ref: string;
}

export interface PurchaseConfirmedPayload {
  order_ref: string;
  collection_release_id: string;
  currency: string;
  paid_minor: number;
}

export interface PurchaseAccessActivatedPayload {
  order_ref: string;
  collection_release_id: string;
  activation_delay_bucket: string;
}

export interface RefundConfirmedPayload {
  refund_ref: string;
  order_ref: string;
  currency: string;
  refunded_minor: number;
}

export interface PurchasedLibraryOpenPayload {
  collection_release_id?: string;
}

export interface HomepageCtaClickedPayload {
  placement: HomepagePlacement;
  destination: HomepageDestination;
  presentation_state: HomepagePresentationState;
  content_version: string;
}

export interface HomepagePreviewOpenedPayload {
  feature_key: HomepageFeatureKey;
  placement: HomepagePlacement;
  content_version: string;
}

export interface HomepagePreviewViewedPayload {
  feature_key: HomepageFeatureKey;
  content_version: string;
}

export type AnalyticsEventMap = {
  page_view: PageViewPayload;
  recipe_list_view: RecipeListViewPayload;
  recipe_open: RecipeOpenPayload;
  recipe_search_submit: RecipeSearchSubmitPayload;
  recipe_filter_apply: RecipeFilterApplyPayload;
  recipe_print_requested: RecipePrintRequestedPayload;
  sign_in_started: SignInStartedPayload;
  sign_in_completed: SignInCompletedPayload;
  recipe_save_changed: RecipeSaveChangedPayload;
  collection_view: CollectionViewPayload;
  checkout_clicked: CheckoutClickedPayload;
  checkout_created: CheckoutCreatedPayload;
  purchase_confirmed: PurchaseConfirmedPayload;
  purchase_access_activated: PurchaseAccessActivatedPayload;
  refund_confirmed: RefundConfirmedPayload;
  purchased_library_open: PurchasedLibraryOpenPayload;
  homepage_cta_clicked: HomepageCtaClickedPayload;
  homepage_preview_opened: HomepagePreviewOpenedPayload;
  homepage_preview_viewed: HomepagePreviewViewedPayload;
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
