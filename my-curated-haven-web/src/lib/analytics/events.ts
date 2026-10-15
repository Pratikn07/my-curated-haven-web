/**
 * Phase 9 Measurement & Event Contract
 * Discriminated event union and envelope definitions.
 */

import type { PrimaryUx } from "./ux";

export const ANALYTICS_SCHEMA_VERSION = 1;
export const CURRENT_CONSENT_POLICY_VERSION = "2026-09-24";

export type EventEnvironment = "development" | "staging" | "production" | "test";
export type EventSource = "browser" | "server";
export type DeviceClass = "mobile" | "desktop" | "tablet";

export type ResultCountBucket = "0" | "1-5" | "6-10" | "11+";
export type RecipeAccessKind = "free" | "paid";
export type RecipeSaveAction = "saved" | "removed";
export type SignInMethod = "email_code" | "google";
/** The Buy button a checkout started from: the lock card on a locked recipe or plan page, or a collection's buy box. */
export type CheckoutSurface = "lock_card" | "buy_box";
/** The visitor's relationship to a collection, as the collection page shows it. */
export type CollectionOwnershipState = "owned" | "not_owned" | "unauthenticated" | "pending_payment" | "unavailable";
export type HomepageFeatureKey = "kitchen" | "library" | "nursery" | "shelf";
export type HomepagePlacement = "hero" | "house" | "overview" | "preview" | "footer" | "final";
export type StoryRoomKey = "kitchen";
/** Which paid options the campaign page showed. */
export type StoryOfferState = "none" | "pack" | "collection" | "both";

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
  | "story"
  | "halloween"
  | "collections"
  | "collection_plan"
  | "collection_series";

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
  // Tracking PR 2: page context on every browser event.
  /** The recipe, book, plan or story the page is about, from its address (contentSlugFromPath). */
  content_slug?: string;
  /** What this visitor can open on the page, set by TrackPageState on recipe, collection and plan pages. */
  access_state?: AccessState;
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
  collection_slug: string;
  /** Absent while nothing is on sale. */
  collection_release_id?: string;
  ownership_state?: CollectionOwnershipState;
}

/** Buy was tapped, before the request to start checkout. */
export interface CheckoutClickedPayload {
  collection_slug: string;
  surface: CheckoutSurface;
  collection_release_id?: string;
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

/** A buyer opened a book's make-ahead plan (/collections/<slug>/plan). */
export interface MakeAheadPlanOpenPayload {
  collection_release_id: string;
}

export interface HomepagePreviewOpenedPayload {
  feature_key: HomepageFeatureKey;
  placement: HomepagePlacement;
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
  make_ahead_plan_open: MakeAheadPlanOpenPayload;
  homepage_preview_opened: HomepagePreviewOpenedPayload;
  story_view: StoryViewPayload;
  // Tracking PR 2
  cta_clicked: CtaClickedPayload;
  section_viewed: SectionViewedPayload;
  offer_viewed: OfferViewedPayload;
  page_scroll_reached: PageScrollReachedPayload;
  page_time_reached: PageTimeReachedPayload;
  // Tracking PR 3
  paywall_viewed: PaywallViewedPayload;
  checkout_failed: CheckoutFailedPayload;
  checkout_cancelled: CheckoutCancelledPayload;
  purchase_confirmation_viewed: PurchaseConfirmationViewedPayload;
  purchase_claimed: PurchaseClaimedPayload;
  sign_in_method_chosen: SignInMethodChosenPayload;
  sign_in_code_sent: SignInCodeSentPayload;
  sign_in_failed: SignInFailedPayload;
  recipe_filter_value_applied: RecipeFilterValueAppliedPayload;
  faq_opened: FaqOpenedPayload;
  room_closed: RoomClosedPayload;
  sample_interacted: SampleInteractedPayload;
  not_found_viewed: NotFoundViewedPayload;
  load_failed: LoadFailedPayload;
  save_failed: SaveFailedPayload;
  empty_state_viewed: EmptyStateViewedPayload;
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

// Tracking PR 2: labelled clicks, page context, milestones and views (docs/implementation/tracking/PLAN.md).

/** internal: one of our pages; external: another site; anchor: a part of the same page; action: a button with no link. */
export type LinkType = "internal" | "external" | "anchor" | "action";
/** Where a tap goes: a route key for our own pages, else a fixed kind. Never a URL. */
export type DestinationKind =
  | CanonicalRouteKey
  | "checkout"
  | "anchor"
  | "email"
  | "instagram"
  | "stripe"
  | "external"
  | "other_page"
  | "none";
export type TargetKind = "recipe" | "collection" | "plan" | "series" | "story";
/** free: open to all; locked: needs the book; owned: this visitor has the book; preview: a plan's public preview. */
export type AccessState = "free" | "locked" | "owned" | "preview";
/** Where an offer is shown. Checkout only starts from lock_card and buy_box (CheckoutSurface). */
export type OfferSurface = CheckoutSurface | "sticky_bar" | "book_card" | "story_offer";
export type ScrollDepth = 25 | 50 | 75 | 100;
export type VisibleSeconds = 15 | 30 | 60;

/** Any link or button was tapped. Labels come from data-track-* attributes in the markup (ClickTracker). */
export interface CtaClickedPayload {
  primary_ux: PrimaryUx;
  link_type: LinkType;
  /** A fixed key written in code, never the visible text. */
  cta?: string;
  /** 1 to 50, counted inside its module. */
  cta_position?: number;
  destination_kind?: DestinationKind;
  target_kind?: TargetKind;
  target_slug?: string;
}

/** A block marked data-track-view reached two thirds of the way up the screen, once per page view. */
export interface SectionViewedPayload {
  primary_ux: PrimaryUx;
}

/** An offer was at least half on screen, once per surface per page view. */
export interface OfferViewedPayload {
  surface: OfferSurface;
  collection_slug: string;
  ownership_state?: CollectionOwnershipState;
  price_minor?: number;
  currency?: string;
}

export interface PageScrollReachedPayload {
  depth: ScrollDepth;
}

/** Seconds the page was visible (time in a background tab does not count). */
export interface PageTimeReachedPayload {
  seconds: VisibleSeconds;
}

// Tracking PR 3: funnel detail, sign-in, filters, FAQ, home samples and errors (docs/implementation/tracking/PLAN.md).

/** Why Buy failed before Stripe opened. */
export type CheckoutError = "already_owned" | "refresh_required" | "unavailable" | "network" | "server";
/** The sign-in step that failed. */
export type SignInStep = "send_code" | "verify_code" | "google";
/** Why it failed, in fixed words. Never the email or the provider's own text. */
export type SignInError = "invalid_code" | "expired_code" | "rate_limited" | "bot_check" | "cancelled" | "unknown";
export type RecipeFilterKind = "meal" | "diet" | "time";
/** How long a room on the home page stayed open. */
export type RoomSecondsBucket = "under_10s" | "10_to_30s" | "over_30s";
/** The try-it samples on the home page. */
export type HomepageSample = "storybook_story" | "storybook_style" | "nursery_stamp" | "shelf_reveal";
/** Which kind of address a 404 was for. */
export type NotFoundRouteClass = "recipe" | "collection" | "story" | "other";

/** A locked recipe page loaded. collection_slug is the open book it is in, when there is one. */
export interface PaywallViewedPayload {
  recipe_id: string;
  collection_slug?: string;
}

export interface CheckoutFailedPayload {
  collection_slug: string;
  surface: CheckoutSurface;
  checkout_error: CheckoutError;
}

/** /checkout/cancel loaded. The book is named only when the address carries a well-formed slug. */
export interface CheckoutCancelledPayload {
  collection_slug?: string;
}

/** "You're in" was shown. order_ref is the order's analytics reference, the same one purchase_confirmed carries. */
export interface PurchaseConfirmationViewedPayload {
  order_ref: string;
  collection_slug: string;
}

/** A guest unlocked a paid order with the emailed code. */
export interface PurchaseClaimedPayload {
  collection_slug?: string;
}

export interface SignInMethodChosenPayload {
  method: SignInMethod;
  entry_point: string;
}

export interface SignInCodeSentPayload {
  entry_point: string;
}

export interface SignInFailedPayload {
  sign_in_step: SignInStep;
  sign_in_error: SignInError;
}

/** One event per filter value applied; the value is a slug from the fixed lists in lib/recipes/filters.ts. */
export interface RecipeFilterValueAppliedPayload {
  filter_kind: RecipeFilterKind;
  filter_value: string;
}

export interface FaqOpenedPayload {
  primary_ux: import("./ux").PrimaryUx;
  question_key: string;
}

export interface RoomClosedPayload {
  feature_key: HomepageFeatureKey;
  seconds_bucket: RoomSecondsBucket;
}

/** choice is the story, style or keepsake picked, as a fixed slug; never the child's name typed into the sample. */
export interface SampleInteractedPayload {
  sample: HomepageSample;
  choice?: string;
}

export interface NotFoundViewedPayload {
  route_class: NotFoundRouteClass;
}

/** A list or page failed to load: recipe_grid for a recipe list, error_page for the error screen. */
export interface LoadFailedPayload {
  primary_ux: import("./ux").PrimaryUx;
}

export interface SaveFailedPayload {
  recipe_id: string;
}

/** No search results, an empty bookcase, or a book that is not on sale yet. */
export interface EmptyStateViewedPayload {
  primary_ux: "empty_state";
}
