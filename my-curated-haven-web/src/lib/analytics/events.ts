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
export type SignInMethod = "email_code" | "google";
export type HomepageFeatureKey = "kitchen" | "library" | "nursery" | "shelf";
export type HomepagePlacement = "hero" | "house" | "overview" | "preview" | "footer" | "final";
export type HomepageDestination =
  | "recipes_index"
  | "recipe_detail"
  | "collection_detail"
  | "previews"
  | "about"
  | "support";
export type HomepagePresentationState = "preparation" | "free_ready" | "collection_ready";
export type StoryRoomKey = "kitchen";
/**
 * Taps on a campaign page (/stories/<slug>). The first five values come from the
 * single-recipe pages and stay valid so older events keep their meaning.
 */
export type StoryAction =
  | "recipe_jump"
  | "full_recipe"
  | "more_recipe"
  | "collection"
  | "about"
  | "campaign_recipe"
  | "pack"
  | "instagram"
  | "recipes_index"
  | "home";
export type StoryPlacement =
  | "card"
  | "sticky"
  | "recipe"
  | "next"
  | "offer"
  | "about"
  | "hero"
  | "recipes"
  | "story"
  | "pack"
  | "collection"
  | "related"
  | "closing";
/** Which paid options the campaign page showed. */
export type StoryOfferState = "none" | "pack" | "collection" | "both";
/** Parts of a campaign page, in page order. story_end is the last moment of the kitchen story. */
export type StorySection =
  | "recipes"
  | "story"
  | "story_end"
  | "pack"
  | "collection"
  | "related"
  | "questions"
  | "closing";

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
  | "terms"
  | "story";

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
  method: SignInMethod;
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

/** An Instagram landing page was shown. The slug names the post. */
export interface StoryViewPayload {
  story_slug: string;
  room: StoryRoomKey;
  /** How many promised recipes the page showed. */
  recipe_count?: number;
  offer_state?: StoryOfferState;
  /** Groups several posts, for example "halloween-2026". */
  story_series?: string;
}

export interface StoryActionClickedPayload {
  story_slug: string;
  story_action: StoryAction;
  story_placement: StoryPlacement;
  /** The recipe opened, for campaign_recipe and more_recipe taps. */
  recipe_id?: string;
  /** Its 1-based place in the list the parent tapped. */
  recipe_position?: number;
}

/** A part of a campaign page came into view, once per page view. */
export interface StorySectionViewedPayload {
  story_slug: string;
  story_section: StorySection;
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
  story_view: StoryViewPayload;
  story_action_clicked: StoryActionClickedPayload;
  story_section_viewed: StorySectionViewedPayload;
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
