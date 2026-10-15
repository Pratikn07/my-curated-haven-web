import { expect, test } from "@playwright/test";
import { acceptCampaignInput } from "../../src/lib/analytics/campaigns";
import { remoteAnalyticsAllowed, trustedAnalyticsEnvironment } from "../../src/lib/analytics/environment";
import { validateAnalyticsEvent } from "../../src/lib/analytics/sanitize";
import { pathToCanonicalRouteKey } from "../../src/lib/analytics/schema";
import { acceptCheckoutAnalytics } from "../../src/lib/analytics/checkout-analytics";
import { isSignInMethodMarker } from "../../src/lib/auth/oauth";
import { checkoutErrorFor } from "../../src/lib/analytics/checkout-analytics";
import { isTrackingSlug, routeClassFromPath, toSecondsBucket } from "../../src/lib/analytics/schema";
import { PRIMARY_UX_VALUES } from "../../src/lib/analytics/ux";
import { RECIPE_FILTER_VALUE_SLUGS, recipeFilterAnalyticsValues } from "../../src/lib/recipes/filters";
import { otpRequestFailure, otpVerifyFailure, signInCodeFailure } from "../../src/lib/auth/otp-errors";

const RECIPE_ID = "10000000-0000-0000-0000-000000000001";

test("rejects emails, extra fields, and unknown events", () => {
  expect(validateAnalyticsEvent("recipe_cooked", { recipe_id: RECIPE_ID }).ok).toBe(false);

  const extra = validateAnalyticsEvent("recipe_open", {
    recipe_id: RECIPE_ID,
    access_kind: "free",
    query: "banana",
  });
  expect(extra.ok).toBe(false);

  const email = validateAnalyticsEvent("sign_in_started", {
    entry_point: "parent@example.com",
  });
  expect(email.ok).toBe(false);

  const tokenUrl = validateAnalyticsEvent("page_view", {
    route_key: "https://mycuratedhaven.com/recipes?token=secret",
    device_class: "mobile",
  });
  expect(tokenUrl.ok).toBe(false);
});

test("[make-ahead] accepts a plan open with only the release id", () => {
  const releaseId = "a0000000-0000-0000-0000-000000000001";
  expect(validateAnalyticsEvent("make_ahead_plan_open", { collection_release_id: releaseId }).ok).toBe(true);
  expect(validateAnalyticsEvent("make_ahead_plan_open", {}).ok).toBe(false);
  expect(validateAnalyticsEvent("make_ahead_plan_open", { collection_release_id: "halloween" }).ok).toBe(false);
  expect(validateAnalyticsEvent("make_ahead_plan_open", { collection_release_id: releaseId, item: "Bananas" }).ok).toBe(false);
});

test("accepts a minimal recipe open", () => {
  const result = validateAnalyticsEvent("recipe_open", {
    recipe_id: RECIPE_ID,
    access_kind: "free",
  });
  expect(result.ok).toBe(true);
});

test("[haven-house] accepts bounded room events and rejects raw destinations", () => {
  const accepted = validateAnalyticsEvent("homepage_preview_opened", {
    feature_key: "library",
    placement: "house",
    content_version: "hh-2026-10-02",
  });
  expect(accepted.ok).toBe(true);

  const rawDestination = validateAnalyticsEvent("homepage_preview_opened", {
    feature_key: "library",
    placement: "house",
    content_version: "hh-2026-10-02",
    destination_url: "/library?child_id=private",
  });
  expect(rawDestination.ok).toBe(false);

  const unknownFeature = validateAnalyticsEvent("homepage_preview_opened", {
    feature_key: "expert_marketplace",
    placement: "overview",
    content_version: "hh-2026-10-02",
  });
  expect(unknownFeature.ok).toBe(false);

  const cta = validateAnalyticsEvent("homepage_cta_clicked", {
    placement: "hero",
    destination: "recipes_index",
    presentation_state: "preparation",
    content_version: "hh-2026-10-02",
  });
  expect(cta.ok).toBe(true);

  expect(
    validateAnalyticsEvent("homepage_cta_clicked", {
      placement: "hero",
      destination: "/recipes?email=person@example.com",
      presentation_state: "preparation",
      content_version: "hh-2026-10-02",
    }).ok,
  ).toBe(false);

  // Removed in tracking PR 3: never sent after 2026-10-02.
  expect(
    validateAnalyticsEvent("homepage_preview_viewed", {
      feature_key: "nursery",
      content_version: "hh-2026-10-02",
    }),
  ).toEqual({ ok: false, reason: "event_name" });
});

test("keeps only registered campaign values", () => {
  const link = (campaign: string, content?: string) =>
    acceptCampaignInput({
      utm_source: "instagram",
      utm_medium: "organic_social",
      utm_campaign: campaign,
      utm_content: content,
    });

  for (const campaign of ["bio_link", "story_link", "instagram_dm", "comment_dm"]) {
    expect(link(campaign)?.utm_campaign, campaign).toBe(campaign);
  }
  expect(link("story_link", "2026-10-01")?.utm_content).toBe("2026-10-01");
  expect(link("story_link", "oat_bars")?.utm_content).toBe("oat_bars");

  expect(link("not_registered")).toBeNull();
  expect(link("sample_reel_001")).toBeNull();
  // A label that could carry personal data or a URL drops the whole campaign.
  for (const content of ["parent@example.com", "https://x.test", "two words", "a.b", "../x"]) {
    expect(link("story_link", content), content).toBeNull();
  }

  expect(
    acceptCampaignInput({
      utm_source: "parent@example.com",
      utm_medium: "organic_social",
      utm_campaign: "bio_link",
    })
  ).toBeNull();
});

test("remote analytics stays off without an explicit environment", () => {
  const previous = {
    NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    ANALYTICS_ENVIRONMENT: process.env.ANALYTICS_ENVIRONMENT,
  };
  try {
    delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_APP_ENV;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    delete process.env.ANALYTICS_ENVIRONMENT;

    expect(remoteAnalyticsAllowed()).toBe(false);
    expect(trustedAnalyticsEnvironment()).toBe("development");

    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "true";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "ph_test";
    process.env.NEXT_PUBLIC_APP_ENV = "staging";
    expect(remoteAnalyticsAllowed()).toBe(false);

    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://staging.example.test";
    expect(remoteAnalyticsAllowed()).toBe(true);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("[stories] landing page events accept only fixed values", () => {
  expect(pathToCanonicalRouteKey("/stories/frittata-fingers")).toBe("story");
  expect(validateAnalyticsEvent("page_view", { route_key: "story", device_class: "mobile" }).ok).toBe(true);

  expect(validateAnalyticsEvent("story_view", { story_slug: "frittata-fingers", room: "kitchen" }).ok).toBe(true);
  expect(
    validateAnalyticsEvent("story_action_clicked", {
      story_slug: "frittata-fingers",
      story_action: "collection",
      story_placement: "offer",
    }).ok
  ).toBe(true);

  for (const story_slug of ["Frittata Fingers", "parent@example.com", "https://x.test", "../x", ""]) {
    expect(validateAnalyticsEvent("story_view", { story_slug, room: "kitchen" }).ok, story_slug).toBe(false);
  }
  expect(validateAnalyticsEvent("story_view", { story_slug: "frittata-fingers", room: "garden" }).ok).toBe(false);
  expect(
    validateAnalyticsEvent("story_action_clicked", {
      story_slug: "frittata-fingers",
      story_action: "https://mycuratedhaven.com/collections/x",
      story_placement: "offer",
    }).ok
  ).toBe(false);
  expect(
    validateAnalyticsEvent("story_action_clicked", {
      story_slug: "frittata-fingers",
      story_action: "recipe_jump",
      story_placement: "popup",
    }).ok
  ).toBe(false);
});

test("[stories] campaign page events add only fixed values and small counts", () => {
  expect(
    validateAnalyticsEvent("story_view", {
      story_slug: "halloween-treats",
      room: "kitchen",
      recipe_count: 5,
      offer_state: "both",
      story_series: "halloween-2026",
    }).ok
  ).toBe(true);
  expect(
    validateAnalyticsEvent("story_action_clicked", {
      story_slug: "halloween-treats",
      story_action: "campaign_recipe",
      story_placement: "recipes",
      recipe_id: "10000000-0000-0000-0000-000000000001",
      recipe_position: 2,
    }).ok
  ).toBe(true);
  for (const [story_action, story_placement] of [
    ["pack", "pack"],
    ["collection", "collection"],
    ["instagram", "closing"],
    ["recipes_index", "closing"],
    ["recipe_jump", "hero"],
    ["more_recipe", "related"],
    ["make_ahead_plan", "plan"],
  ]) {
    expect(
      validateAnalyticsEvent("story_action_clicked", { story_slug: "halloween-treats", story_action, story_placement }).ok,
      `${story_action}/${story_placement}`
    ).toBe(true);
  }
  for (const story_section of ["recipes", "story", "story_end", "pack", "collection", "related", "questions", "closing", "plan"]) {
    expect(validateAnalyticsEvent("story_section_viewed", { story_slug: "halloween-treats", story_section }).ok).toBe(true);
  }

  expect(validateAnalyticsEvent("story_section_viewed", { story_slug: "halloween-treats", story_section: "footer" }).ok).toBe(false);
  expect(validateAnalyticsEvent("story_view", { story_slug: "x", room: "kitchen", offer_state: "upsell" }).ok).toBe(false);
  expect(validateAnalyticsEvent("story_view", { story_slug: "x", room: "kitchen", story_series: "Halloween 2026" }).ok).toBe(false);
  expect(validateAnalyticsEvent("story_view", { story_slug: "x", room: "kitchen", recipe_count: 500 }).ok).toBe(false);
  expect(
    validateAnalyticsEvent("story_action_clicked", {
      story_slug: "x",
      story_action: "campaign_recipe",
      story_placement: "recipes",
      recipe_position: 0,
    }).ok
  ).toBe(false);
  expect(
    validateAnalyticsEvent("story_action_clicked", {
      story_slug: "x",
      story_action: "campaign_recipe",
      story_placement: "recipes",
      recipe_id: "sweet-potato-frittata",
    }).ok
  ).toBe(false);
});

test("landing, bookcase, plan and series pages have their own route names", () => {
  expect(pathToCanonicalRouteKey("/halloween")).toBe("halloween");
  expect(pathToCanonicalRouteKey("/collections")).toBe("collections");
  expect(pathToCanonicalRouteKey("/collections/halloween")).toBe("collection_detail");
  expect(pathToCanonicalRouteKey("/collections/halloween/plan")).toBe("collection_plan");
  expect(pathToCanonicalRouteKey("/collections/series/seasons")).toBe("collection_series");
  for (const route_key of ["halloween", "collections", "collection_plan", "collection_series"]) {
    expect(validateAnalyticsEvent("page_view", { route_key, device_class: "mobile" }).ok, route_key).toBe(true);
  }
});

test("checkout_clicked and collection_view name the book and the Buy button", () => {
  expect(validateAnalyticsEvent("checkout_clicked", { collection_slug: "halloween", surface: "buy_box" }).ok).toBe(true);
  expect(
    validateAnalyticsEvent("checkout_clicked", {
      collection_slug: "halloween",
      surface: "lock_card",
      collection_release_id: RECIPE_ID,
    }).ok
  ).toBe(true);
  // The phone buy bar only scrolls to the buy box; it never starts checkout itself.
  expect(validateAnalyticsEvent("checkout_clicked", { collection_slug: "halloween", surface: "sticky_bar" }).ok).toBe(false);
  expect(validateAnalyticsEvent("checkout_clicked", { collection_slug: "halloween" }).ok).toBe(false);
  expect(validateAnalyticsEvent("checkout_clicked", { collection_slug: "Halloween Book", surface: "buy_box" }).ok).toBe(false);
  expect(validateAnalyticsEvent("checkout_clicked", { collection_slug: "halloween", surface: "buy_box", entry_point: "collection_page" }).ok).toBe(false);

  expect(validateAnalyticsEvent("collection_view", { collection_slug: "halloween" }).ok).toBe(true);
  for (const ownership_state of ["owned", "not_owned", "unauthenticated", "pending_payment", "unavailable"]) {
    expect(validateAnalyticsEvent("collection_view", { collection_slug: "halloween", ownership_state }).ok, ownership_state).toBe(true);
  }
  expect(validateAnalyticsEvent("collection_view", { collection_slug: "halloween", ownership_state: "gifted" }).ok).toBe(false);
  expect(validateAnalyticsEvent("collection_view", { collection_release_id: RECIPE_ID }).ok).toBe(false);
});

test("checkout keeps well-formed visit details and drops the rest without refusing", () => {
  const visitor = "01990000-0000-7000-8000-000000000001";
  const session = "01990000-0000-7000-8000-000000000002";
  expect(acceptCheckoutAnalytics({ distinct_id: visitor, session_id: session, surface: "buy_box", entry_story: "halloween" })).toEqual({
    distinctId: visitor,
    sessionId: session,
    surface: "buy_box",
    entryStory: "halloween",
  });
  expect(acceptCheckoutAnalytics({ distinct_id: "parent@example.com", surface: "sticky_bar", entry_story: "https://x.test" })).toBeNull();
  expect(acceptCheckoutAnalytics({ distinct_id: "not-a-uuid", surface: "lock_card" })).toEqual({
    distinctId: null,
    sessionId: null,
    surface: "lock_card",
    entryStory: null,
  });
  for (const raw of [undefined, null, "buy_box", ["buy_box"], 7]) {
    expect(acceptCheckoutAnalytics(raw), String(raw)).toBeNull();
  }
});

test("both sign-in methods leave a completion marker; nothing else does", () => {
  expect(isSignInMethodMarker("email_code")).toBe(true);
  expect(isSignInMethodMarker("google")).toBe(true);
  for (const value of ["apple", "", null, undefined, "EMAIL_CODE"]) {
    expect(isSignInMethodMarker(value), String(value)).toBe(false);
  }
});

// Tracking PR 3: every new property accepts its fixed values and rejects anything else.

const ORDER_REF = "01990000-0000-7000-8000-00000000b001";
const NOT_ALLOWED = ["parent@example.com", "https://x.test", "two words", "", "a?b"];

test("[tracking-pr3] paywall, checkout failure, cancel, confirmation and claim name only fixed values", () => {
  expect(validateAnalyticsEvent("paywall_viewed", { recipe_id: RECIPE_ID }).ok).toBe(true);
  expect(validateAnalyticsEvent("paywall_viewed", { recipe_id: RECIPE_ID, collection_slug: "halloween" }).ok).toBe(true);
  expect(validateAnalyticsEvent("paywall_viewed", { collection_slug: "halloween" }).ok).toBe(false);
  expect(validateAnalyticsEvent("paywall_viewed", { recipe_id: "golden-soup" }).ok).toBe(false);

  for (const checkout_error of ["already_owned", "refresh_required", "unavailable", "network", "server"]) {
    expect(
      validateAnalyticsEvent("checkout_failed", { collection_slug: "halloween", surface: "buy_box", checkout_error }).ok,
      checkout_error
    ).toBe(true);
  }
  for (const checkout_error of ["timeout", "CHECKOUT_DISABLED", ...NOT_ALLOWED]) {
    expect(
      validateAnalyticsEvent("checkout_failed", { collection_slug: "halloween", surface: "lock_card", checkout_error }).ok,
      checkout_error
    ).toBe(false);
  }
  expect(validateAnalyticsEvent("checkout_failed", { collection_slug: "halloween", checkout_error: "server" }).ok).toBe(false);
  // `reason` is not a checkout_failed property; the failure has its own name.
  expect(validateAnalyticsEvent("checkout_failed", { collection_slug: "halloween", surface: "buy_box", reason: "server" }).ok).toBe(false);

  expect(checkoutErrorFor(409, "already_owned")).toBe("already_owned");
  expect(checkoutErrorFor(409, "refresh_required")).toBe("refresh_required");
  expect(checkoutErrorFor(400, "CHECKOUT_DISABLED")).toBe("unavailable");
  expect(checkoutErrorFor(409, undefined)).toBe("server");
  expect(checkoutErrorFor(400, "OFFER_NOT_FOUND")).toBe("server");
  expect(checkoutErrorFor(500, undefined)).toBe("server");

  expect(validateAnalyticsEvent("checkout_cancelled", {}).ok).toBe(true);
  expect(validateAnalyticsEvent("checkout_cancelled", { collection_slug: "halloween" }).ok).toBe(true);
  for (const value of ["Halloween Book", "../x", "parent@example.com"]) {
    expect(isTrackingSlug(value), value).toBe(false);
    expect(validateAnalyticsEvent("checkout_cancelled", { collection_slug: value }).ok, value).toBe(false);
  }
  expect(isTrackingSlug("comfort-haven-collection")).toBe(true);
  expect(isTrackingSlug(["halloween"])).toBe(false);

  expect(validateAnalyticsEvent("purchase_confirmation_viewed", { order_ref: ORDER_REF, collection_slug: "halloween" }).ok).toBe(true);
  expect(validateAnalyticsEvent("purchase_confirmation_viewed", { order_ref: ORDER_REF }).ok).toBe(false);
  expect(validateAnalyticsEvent("purchase_confirmation_viewed", { order_ref: "MCH-1234", collection_slug: "halloween" }).ok).toBe(false);

  expect(validateAnalyticsEvent("purchase_claimed", {}).ok).toBe(true);
  expect(validateAnalyticsEvent("purchase_claimed", { collection_slug: "halloween" }).ok).toBe(true);
  expect(validateAnalyticsEvent("purchase_claimed", { collection_slug: "halloween", email: "parent@example.com" }).ok).toBe(false);
});

test("[tracking-pr3] sign-in events carry a method, a step and a fixed reason, never an address", () => {
  for (const method of ["email_code", "google"]) {
    expect(validateAnalyticsEvent("sign_in_method_chosen", { method, entry_point: "collection" }).ok, method).toBe(true);
  }
  expect(validateAnalyticsEvent("sign_in_method_chosen", { method: "apple", entry_point: "collection" }).ok).toBe(false);
  expect(validateAnalyticsEvent("sign_in_method_chosen", { method: "google" }).ok).toBe(false);
  expect(validateAnalyticsEvent("sign_in_code_sent", { entry_point: "recipe" }).ok).toBe(true);
  expect(validateAnalyticsEvent("sign_in_code_sent", { entry_point: "parent@example.com" }).ok).toBe(false);
  expect(validateAnalyticsEvent("sign_in_code_sent", { entry_point: "recipe", email: "parent@example.com" }).ok).toBe(false);

  for (const sign_in_step of ["send_code", "verify_code", "google"]) {
    for (const sign_in_error of ["invalid_code", "expired_code", "rate_limited", "bot_check", "cancelled", "unknown"]) {
      expect(validateAnalyticsEvent("sign_in_failed", { sign_in_step, sign_in_error }).ok, `${sign_in_step}/${sign_in_error}`).toBe(true);
    }
  }
  for (const value of ["captcha_failed", "otp_expired", ...NOT_ALLOWED]) {
    expect(validateAnalyticsEvent("sign_in_failed", { sign_in_step: "send_code", sign_in_error: value }).ok, value).toBe(false);
    expect(validateAnalyticsEvent("sign_in_failed", { sign_in_step: value, sign_in_error: "unknown" }).ok, value).toBe(false);
  }

  // Supabase's answers, mapped to the fixed reasons. The texts are Supabase's own.
  const wait = "For security purposes, you can only request this after 42 seconds.";
  expect(otpRequestFailure({ code: "over_email_send_rate_limit", message: wait })).toBe("rate_limited");
  expect(otpRequestFailure({ code: "over_request_rate_limit", message: wait })).toBe("rate_limited");
  expect(otpRequestFailure({ message: "email rate limit exceeded" })).toBe("rate_limited");
  expect(otpRequestFailure({ code: "captcha_failed", message: "captcha protection: request disallowed" })).toBe("bot_check");
  expect(otpRequestFailure({ code: "email_address_not_authorized", message: "Email address not authorized" })).toBe("unknown");
  expect(otpRequestFailure({ code: "unexpected_failure", message: "Database error saving new user" })).toBe("unknown");

  expect(otpVerifyFailure({ code: "otp_expired", message: "Token has expired or is invalid" })).toBe("invalid_code");
  expect(otpVerifyFailure({ code: "over_request_rate_limit", message: "Request rate limit reached" })).toBe("rate_limited");
  expect(otpVerifyFailure({ code: "unexpected_failure", message: "Database error" })).toBe("unknown");

  // Supabase can't tell a mistyped code from an expired one; the code's age (10 minutes) can.
  const sentAt = Date.parse("2026-10-14T10:00:00Z");
  expect(signInCodeFailure("invalid_code", sentAt, sentAt + 9 * 60_000)).toBe("invalid_code");
  expect(signInCodeFailure("invalid_code", sentAt, sentAt + 10 * 60_000)).toBe("expired_code");
  expect(signInCodeFailure("invalid_code", null, sentAt)).toBe("invalid_code");
  expect(signInCodeFailure("rate_limited", sentAt, sentAt + 60 * 60_000)).toBe("rate_limited");
});

test("[tracking-pr3] filter values come only from the fixed meal, diet and time lists", () => {
  expect(RECIPE_FILTER_VALUE_SLUGS).toEqual({
    meal: ["breakfast", "lunch", "dinner", "snack"],
    diet: ["vegetarian", "dairy-free", "nut-free", "gluten-free", "soy-free"],
    time: ["under-15-min", "under-30-min", "under-45-min"],
  });
  for (const [filter_kind, values] of Object.entries(RECIPE_FILTER_VALUE_SLUGS)) {
    for (const filter_value of values) {
      expect(validateAnalyticsEvent("recipe_filter_value_applied", { filter_kind, filter_value }).ok, filter_value).toBe(true);
    }
  }
  for (const filter_value of ["Breakfast", "brunch", "pumpkin", "under-20-min", ...NOT_ALLOWED]) {
    expect(validateAnalyticsEvent("recipe_filter_value_applied", { filter_kind: "meal", filter_value }).ok, filter_value).toBe(false);
  }
  expect(validateAnalyticsEvent("recipe_filter_value_applied", { filter_kind: "allergen", filter_value: "nut-free" }).ok).toBe(false);

  // Case from the address is normalised, duplicates go, and values off the lists are dropped.
  expect(
    recipeFilterAnalyticsValues({ meals: ["breakfast", "Breakfast", "Brunch"], diets: ["DAIRY-FREE"], maxTime: 30 })
  ).toEqual([
    { kind: "meal", value: "breakfast" },
    { kind: "diet", value: "dairy-free" },
    { kind: "time", value: "under-30-min" },
  ]);
  expect(recipeFilterAnalyticsValues({ meals: [], diets: [], maxTime: 20 })).toEqual([]);
});

test("[tracking-pr3] FAQ, rooms and samples send fixed keys only", () => {
  expect(validateAnalyticsEvent("faq_opened", { primary_ux: "faq", question_key: "subscription" }).ok).toBe(true);
  expect(validateAnalyticsEvent("faq_opened", { primary_ux: "faq", question_key: "future-recipes" }).ok).toBe(true);
  for (const question_key of ["Is this a subscription?", "future_recipes", ...NOT_ALLOWED]) {
    expect(validateAnalyticsEvent("faq_opened", { primary_ux: "faq", question_key }).ok, question_key).toBe(false);
  }
  expect(validateAnalyticsEvent("faq_opened", { primary_ux: "questions", question_key: "account" }).ok).toBe(false);

  for (const seconds_bucket of ["under_10s", "10_to_30s", "over_30s"]) {
    expect(validateAnalyticsEvent("room_closed", { feature_key: "library", seconds_bucket }).ok, seconds_bucket).toBe(true);
  }
  expect(validateAnalyticsEvent("room_closed", { feature_key: "library", seconds_bucket: "12" }).ok).toBe(false);
  expect(validateAnalyticsEvent("room_closed", { feature_key: "garage", seconds_bucket: "under_10s" }).ok).toBe(false);
  expect([0, 9.9, 10, 30, 30.1, 600].map(toSecondsBucket)).toEqual([
    "under_10s",
    "under_10s",
    "10_to_30s",
    "10_to_30s",
    "over_30s",
    "over_30s",
  ]);

  for (const sample of ["storybook_story", "storybook_style", "nursery_stamp", "shelf_reveal"]) {
    expect(validateAnalyticsEvent("sample_interacted", { sample }).ok, sample).toBe(true);
  }
  expect(validateAnalyticsEvent("sample_interacted", { sample: "storybook_story", choice: "moon" }).ok).toBe(true);
  expect(validateAnalyticsEvent("sample_interacted", { sample: "nursery_stamp", choice: "first-word" }).ok).toBe(true);
  // A typed child's name is never a choice: names are capitalised, may hold spaces, and are not on any list.
  for (const choice of ["Maya", "Maya Rose", ...NOT_ALLOWED]) {
    expect(validateAnalyticsEvent("sample_interacted", { sample: "storybook_story", choice }).ok, choice).toBe(false);
  }
  expect(validateAnalyticsEvent("sample_interacted", { sample: "storybook_name", choice: "moon" }).ok).toBe(false);
  expect(validateAnalyticsEvent("sample_interacted", { sample: "storybook_story", name: "maya" }).ok).toBe(false);
});

test("[tracking-pr3] errors and empty states name the kind of page, never the address", () => {
  for (const route_class of ["recipe", "collection", "story", "other"]) {
    expect(validateAnalyticsEvent("not_found_viewed", { route_class }).ok, route_class).toBe(true);
  }
  expect(validateAnalyticsEvent("not_found_viewed", { route_class: "/recipes/missing" }).ok).toBe(false);
  expect(validateAnalyticsEvent("not_found_viewed", {}).ok).toBe(false);
  expect(routeClassFromPath("/recipes/no-such-recipe")).toBe("recipe");
  expect(routeClassFromPath("/collections/no-such-book")).toBe("collection");
  expect(routeClassFromPath("/collections/series/none")).toBe("collection");
  expect(routeClassFromPath("/stories/no-such-post")).toBe("story");
  expect(routeClassFromPath("/no-such-page")).toBe("other");
  expect(routeClassFromPath("/recipes")).toBe("other");

  for (const primary_ux of ["recipe_grid", "error_page", "buy_box"]) {
    expect(validateAnalyticsEvent("load_failed", { primary_ux }).ok, primary_ux).toBe(true);
  }
  expect(validateAnalyticsEvent("load_failed", { primary_ux: "database" }).ok).toBe(false);
  expect(validateAnalyticsEvent("load_failed", { primary_ux: "recipe_grid", message: "timeout" }).ok).toBe(false);
  expect(PRIMARY_UX_VALUES).toContain("empty_state");
  expect(validateAnalyticsEvent("empty_state_viewed", { primary_ux: "empty_state" }).ok).toBe(true);
  expect(validateAnalyticsEvent("empty_state_viewed", { primary_ux: "nothing" }).ok).toBe(false);

  expect(validateAnalyticsEvent("save_failed", { recipe_id: RECIPE_ID }).ok).toBe(true);
  expect(validateAnalyticsEvent("save_failed", { recipe_id: "synth-free-oat-bake" }).ok).toBe(false);
  expect(validateAnalyticsEvent("save_failed", {}).ok).toBe(false);
});
