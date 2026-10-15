import { expect, test } from "@playwright/test";
import { acceptCampaignInput } from "../../src/lib/analytics/campaigns";
import { acceptCheckoutAnalytics, checkoutErrorFor } from "../../src/lib/analytics/checkout-analytics";
import { remoteAnalyticsAllowed, trustedAnalyticsEnvironment } from "../../src/lib/analytics/environment";
import { describeLink } from "../../src/lib/analytics/links";
import { stripPrivateQueryParams, withoutNotFoundAddress, withoutPrivateQueryParams } from "../../src/lib/analytics/posthog";
import { clearNotFoundPage, markNotFoundPage } from "../../src/lib/analytics/not-found";
import { buildAnalyticsEnvelope, validateAnalyticsEvent } from "../../src/lib/analytics/sanitize";
import {
  contentSlugFromPath,
  isTrackingSlug,
  pathToCanonicalRouteKey,
  routeClassFromPath,
  toSecondsBucket,
} from "../../src/lib/analytics/schema";
import { PRIMARY_UX_VALUES } from "../../src/lib/analytics/ux";
import { inAppBrowserName, isInAppBrowser } from "../../src/lib/auth/in-app-browser";
import { isSignInMethodMarker, signInMethodCookieOptions } from "../../src/lib/auth/oauth";
import { otpRequestFailure, otpVerifyFailure, signInCodeFailure } from "../../src/lib/auth/otp-errors";
import { RECIPE_FILTER_VALUE_SLUGS, recipeFilterAnalyticsValues } from "../../src/lib/recipes/filters";

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

  // Removed in tracking PR 3: never sent after 2026-10-02. homepage_cta_clicked (PR 4) is checked with the story events.
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

  for (const story_slug of ["Frittata Fingers", "parent@example.com", "https://x.test", "../x", ""]) {
    expect(validateAnalyticsEvent("story_view", { story_slug, room: "kitchen" }).ok, story_slug).toBe(false);
  }
  expect(validateAnalyticsEvent("story_view", { story_slug: "frittata-fingers", room: "garden" }).ok).toBe(false);
});

test("[stories] story_view adds only fixed values and small counts", () => {
  expect(
    validateAnalyticsEvent("story_view", {
      story_slug: "halloween-treats",
      room: "kitchen",
      recipe_count: 5,
      offer_state: "both",
      story_series: "halloween-2026",
    }).ok
  ).toBe(true);
  expect(validateAnalyticsEvent("story_view", { story_slug: "x", room: "kitchen", offer_state: "upsell" }).ok).toBe(false);
  expect(validateAnalyticsEvent("story_view", { story_slug: "x", room: "kitchen", story_series: "Halloween 2026" }).ok).toBe(false);
  expect(validateAnalyticsEvent("story_view", { story_slug: "x", room: "kitchen", recipe_count: 500 }).ok).toBe(false);
});

// Tracking PR 4: the old click and section events are retired; cta_clicked and section_viewed carry the same taps.
test("the retired story and homepage events are refused, and their replacements carry the same labels", () => {
  expect(
    validateAnalyticsEvent("story_action_clicked", {
      story_slug: "halloween-treats",
      story_action: "campaign_recipe",
      story_placement: "recipes",
      recipe_id: RECIPE_ID,
      recipe_position: 2,
    })
  ).toEqual({ ok: false, reason: "event_name" });
  expect(validateAnalyticsEvent("story_section_viewed", { story_slug: "halloween-treats", story_section: "recipes" })).toEqual({
    ok: false,
    reason: "event_name",
  });
  expect(
    validateAnalyticsEvent("homepage_cta_clicked", {
      placement: "hero",
      destination: "recipes_index",
      presentation_state: "preparation",
      content_version: "hh-2026-10-02",
    })
  ).toEqual({ ok: false, reason: "event_name" });
  // Their old properties are not accepted on the events that stay.
  expect(validateAnalyticsEvent("story_view", { story_slug: "halloween-treats", room: "kitchen", story_section: "recipes" }).ok).toBe(false);
  expect(validateAnalyticsEvent("story_view", { story_slug: "halloween-treats", room: "kitchen", recipe_position: 2 }).ok).toBe(false);

  // What the same taps send now (the old-to-new table in the PR 4 description).
  for (const [primary_ux, cta, link_type, destination_kind, target_kind, target_slug, cta_position] of [
    ["hero", "see_recipes", "anchor", "anchor"],
    ["campaign_recipes", "open_recipe", "internal", "recipe_detail", "recipe", "synth-free-veggie-frittata", 2],
    ["campaign_recipes", "see_collection", "internal", "collection_detail", "collection", "halloween", 3],
    ["sticky_bar", "open_recipe", "internal", "recipe_detail", "recipe", "synth-free-veggie-frittata", 1],
    ["sticky_bar", "see_recipes", "anchor", "anchor"],
    ["sticky_bar", "get_book", "internal", "collection_detail", "collection", "halloween"],
    ["story_offer", "see_pack", "internal", "collection_detail", "collection", "comfort-haven-collection"],
    ["story_offer", "see_collection", "internal", "collection_detail", "collection", "comfort-haven-collection"],
    ["related_shelf", "open_recipe", "internal", "recipe_detail", "recipe", "synth-free-oat-bake", 4],
    ["related_shelf", "see_all_recipes", "internal", "recipes"],
    ["closing", "see_all_recipes", "internal", "recipes"],
    ["closing", "instagram", "external", "instagram"],
    ["closing", "home", "internal", "home"],
    ["book_card", "get_book", "internal", "collection_detail", "collection", "halloween"],
    ["plan_strip", "see_plan", "internal", "collection_plan", "plan", "halloween"],
    ["book_tiles", "open_recipe", "internal", "recipe_detail", "recipe", "ghost-bark"],
    ["book_tiles", "see_collection", "internal", "collection_detail", "collection", "halloween"],
    ["hero", "browse_recipes", "internal", "recipes"],
    ["recipe_grid", "see_all_recipes", "internal", "recipes"],
    ["collection_band", "see_collection", "internal", "collection_detail", "collection", "halloween"],
  ] as const) {
    const click = {
      primary_ux,
      link_type,
      cta,
      destination_kind,
      ...(target_kind ? { target_kind, target_slug } : {}),
      ...(cta_position ? { cta_position } : {}),
    };
    expect(validateAnalyticsEvent("cta_clicked", click).ok, JSON.stringify(click)).toBe(true);
  }
  for (const primary_ux of ["campaign_recipes", "story", "story_offer", "related_shelf", "faq", "closing", "plan_strip", "book_tiles"]) {
    expect(validateAnalyticsEvent("section_viewed", { primary_ux }).ok, primary_ux).toBe(true);
  }
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

test("the sign-in marker cookie is Secure on every deployed host, not on a local http build", () => {
  const env = process.env as Record<string, string | undefined>;
  const previous = env.NODE_ENV;
  try {
    env.NODE_ENV = "production";
    for (const host of ["mycuratedhaven.com", "www.mycuratedhaven.com", "my-curated-haven-web-git-x.vercel.app", null]) {
      expect(signInMethodCookieOptions(host).secure, String(host)).toBe(true);
    }
    for (const host of ["127.0.0.1:3105", "localhost:3000", "[::1]:3000", "app.localhost"]) {
      expect(signInMethodCookieOptions(host).secure, host).toBe(false);
    }
    env.NODE_ENV = "development";
    expect(signInMethodCookieOptions("mycuratedhaven.com").secure).toBe(false);
  } finally {
    env.NODE_ENV = previous;
  }
  expect(signInMethodCookieOptions("mycuratedhaven.com")).toMatchObject({ path: "/", maxAge: 120, sameSite: "lax" });
});

test("both sign-in methods leave a completion marker; nothing else does", () => {
  expect(isSignInMethodMarker("email_code")).toBe(true);
  expect(isSignInMethodMarker("google")).toBe(true);
  for (const value of ["apple", "", null, undefined, "EMAIL_CODE"]) {
    expect(isSignInMethodMarker(value), String(value)).toBe(false);
  }
});

// Tracking PR 2: labelled clicks, page context, milestones and views.

test("cta_clicked accepts fixed labels and rejects text, URLs and out-of-range slots", () => {
  const click = {
    primary_ux: "lock_card",
    link_type: "action",
    cta: "buy",
    cta_position: 1,
    destination_kind: "checkout",
  };
  expect(validateAnalyticsEvent("cta_clicked", click).ok).toBe(true);
  expect(validateAnalyticsEvent("cta_clicked", { primary_ux: "unlabelled", link_type: "action" }).ok).toBe(true);
  expect(
    validateAnalyticsEvent("cta_clicked", {
      primary_ux: "recipe_grid",
      link_type: "internal",
      cta: "open_recipe",
      cta_position: 50,
      destination_kind: "recipe_detail",
      target_kind: "recipe",
      target_slug: "synth-free-oat-bake",
    }).ok
  ).toBe(true);
  for (const destination_kind of ["anchor", "email", "instagram", "stripe", "external", "other_page", "none", "halloween", "collection_plan"]) {
    expect(validateAnalyticsEvent("cta_clicked", { ...click, destination_kind }).ok, destination_kind).toBe(true);
  }
  for (const target_kind of ["recipe", "collection", "plan", "series", "story"]) {
    expect(validateAnalyticsEvent("cta_clicked", { ...click, target_kind, target_slug: "halloween" }).ok, target_kind).toBe(true);
  }

  const rejected: Record<string, unknown>[] = [
    { ...click, primary_ux: "sidebar" },
    { ...click, link_type: "download" },
    { ...click, cta: "Buy now" },
    { ...click, cta: "2buy" },
    { ...click, cta: "a".repeat(33) },
    { ...click, cta_position: 0 },
    { ...click, cta_position: 51 },
    { ...click, cta_position: "2" },
    { ...click, cta_position: 1.5 },
    { ...click, destination_kind: "https://mycuratedhaven.com/recipes" },
    { ...click, destination_kind: "/recipes" },
    { ...click, target_kind: "product" },
    { ...click, target_slug: "Ghost Bark" },
    { ...click, target_slug: "/recipes/ghost-bark" },
    { ...click, destination: "recipes_index" },
    { ...click, text: "Buy now" },
    { link_type: "action" },
    { primary_ux: "buy_box" },
  ];
  for (const props of rejected) {
    expect(validateAnalyticsEvent("cta_clicked", props).ok, JSON.stringify(props)).toBe(false);
  }
});

test("section_viewed, offer_viewed and the milestones accept only their fixed values", () => {
  expect(validateAnalyticsEvent("section_viewed", { primary_ux: "story_offer" }).ok).toBe(true);
  expect(validateAnalyticsEvent("section_viewed", { primary_ux: "pack" }).ok).toBe(false);
  expect(validateAnalyticsEvent("section_viewed", {}).ok).toBe(false);

  for (const surface of ["lock_card", "buy_box", "sticky_bar", "book_card", "story_offer"]) {
    expect(validateAnalyticsEvent("offer_viewed", { surface, collection_slug: "halloween" }).ok, surface).toBe(true);
  }
  expect(
    validateAnalyticsEvent("offer_viewed", {
      surface: "buy_box",
      collection_slug: "comfort-haven-collection",
      ownership_state: "unauthenticated",
      price_minor: 1500,
      currency: "usd",
    }).ok
  ).toBe(true);
  for (const props of [
    { surface: "popup", collection_slug: "halloween" },
    { surface: "buy_box" },
    { collection_slug: "halloween" },
    { surface: "buy_box", collection_slug: "Halloween Book" },
    { surface: "buy_box", collection_slug: "halloween", price_minor: 0 },
    { surface: "buy_box", collection_slug: "halloween", price_minor: "599" },
    { surface: "buy_box", collection_slug: "halloween", currency: "USD" },
    { surface: "buy_box", collection_slug: "halloween", ownership_state: "gifted" },
    { surface: "buy_box", collection_slug: "halloween", price: "$5.99" },
  ]) {
    expect(validateAnalyticsEvent("offer_viewed", props).ok, JSON.stringify(props)).toBe(false);
  }
  // A buy bar or a book card can be seen, but checkout only starts from a Buy button.
  for (const surface of ["sticky_bar", "book_card", "story_offer"]) {
    expect(validateAnalyticsEvent("checkout_clicked", { collection_slug: "halloween", surface }).ok, surface).toBe(false);
  }

  for (const depth of [25, 50, 75, 100]) {
    expect(validateAnalyticsEvent("page_scroll_reached", { depth }).ok, String(depth)).toBe(true);
  }
  for (const depth of [0, 10, 30, 99, "50", 50.5]) {
    expect(validateAnalyticsEvent("page_scroll_reached", { depth }).ok, String(depth)).toBe(false);
  }
  for (const seconds of [15, 30, 60]) {
    expect(validateAnalyticsEvent("page_time_reached", { seconds }).ok, String(seconds)).toBe(true);
  }
  for (const seconds of [0, 10, 45, 120, "15"]) {
    expect(validateAnalyticsEvent("page_time_reached", { seconds }).ok, String(seconds)).toBe(false);
  }
  expect(validateAnalyticsEvent("page_time_reached", { seconds: 15, depth: 25 }).ok).toBe(false);
});

test("describeLink names our pages by route key and slug, and other sites only by kind", () => {
  const origin = "https://mycuratedhaven.com";
  expect(describeLink("/recipes", origin)).toEqual({ link_type: "internal", destination_kind: "recipes" });
  expect(describeLink("/recipes/ghost-bark", origin)).toEqual({
    link_type: "internal",
    destination_kind: "recipe_detail",
    target_kind: "recipe",
    target_slug: "ghost-bark",
  });
  expect(describeLink("/collections/halloween#buy", origin)).toEqual({
    link_type: "internal",
    destination_kind: "collection_detail",
    target_kind: "collection",
    target_slug: "halloween",
  });
  expect(describeLink("/collections/halloween/plan", origin)).toMatchObject({
    destination_kind: "collection_plan",
    target_kind: "plan",
    target_slug: "halloween",
  });
  expect(describeLink("/collections/series/seasons?stage=toddler", origin)).toMatchObject({
    destination_kind: "collection_series",
    target_kind: "series",
    target_slug: "seasons",
  });
  expect(describeLink("/stories/frittata-fingers", origin)).toMatchObject({
    destination_kind: "story",
    target_kind: "story",
    target_slug: "frittata-fingers",
  });
  expect(describeLink("/sign-in?returnTo=/recipes/ghost-bark", origin)).toEqual({ link_type: "internal", destination_kind: "sign_in" });
  expect(describeLink("/checkout/return?session_id=cs_test_123", origin)).toEqual({ link_type: "internal", destination_kind: "checkout_return" });
  expect(describeLink("/recipes/", origin)).toEqual({ link_type: "internal", destination_kind: "recipes" });
  expect(describeLink("/careers", origin)).toEqual({ link_type: "internal", destination_kind: "other_page" });
  expect(describeLink("https://mycuratedhaven.com/halloween", "http://127.0.0.1:3000")).toEqual({
    link_type: "internal",
    destination_kind: "halloween",
  });

  expect(describeLink("#hw-recipes", origin)).toEqual({ link_type: "anchor", destination_kind: "anchor" });
  expect(describeLink("/halloween#hw-recipes", origin, "/halloween")).toEqual({ link_type: "anchor", destination_kind: "anchor" });
  expect(describeLink("mailto:support@mycuratedhaven.com?subject=Order", origin)).toEqual({ link_type: "external", destination_kind: "email" });
  expect(describeLink("https://www.instagram.com/tinysoho/", origin)).toEqual({ link_type: "external", destination_kind: "instagram" });
  expect(describeLink("https://checkout.stripe.com/c/pay/cs_test_123", origin)).toEqual({ link_type: "external", destination_kind: "stripe" });
  expect(describeLink("https://example.com/page?x=1", origin)).toEqual({ link_type: "external", destination_kind: "external" });
  expect(describeLink(null, origin)).toEqual({ link_type: "action", destination_kind: "none" });

  // Whatever the link, the description passes the validator: no URL, address or query ever reaches an event.
  for (const href of ["/recipes/Bad Slug", "/recipes/a/b", "https://evil.test/?email=parent@example.com", "javascript:void(0)"]) {
    const link = describeLink(href, origin);
    expect(validateAnalyticsEvent("cta_clicked", { primary_ux: "unlabelled", ...link }).ok, href).toBe(true);
  }
});

test("page context: the slug comes from the address, and bad values are dropped without losing the event", () => {
  expect(contentSlugFromPath("/recipes/ghost-bark")).toBe("ghost-bark");
  expect(contentSlugFromPath("/collections/halloween")).toBe("halloween");
  expect(contentSlugFromPath("/collections/halloween/plan")).toBe("halloween");
  expect(contentSlugFromPath("/stories/frittata-fingers")).toBe("frittata-fingers");
  expect(contentSlugFromPath("/halloween")).toBe("halloween");
  for (const path of ["/", "/recipes", "/collections", "/collections/series/seasons", "/account", "/recipes/Bad%20Slug"]) {
    expect(contentSlugFromPath(path), path).toBeUndefined();
  }

  const view = { route_key: "recipe_detail", device_class: "mobile" } as const;
  const kept = buildAnalyticsEnvelope({ eventName: "page_view", payload: view, contentSlug: "ghost-bark", accessState: "locked" });
  expect(kept).toMatchObject({ content_slug: "ghost-bark", access_state: "locked" });
  for (const accessState of ["free", "owned", "preview"]) {
    expect(buildAnalyticsEnvelope({ eventName: "page_view", payload: view, accessState })?.access_state).toBe(accessState);
  }
  const dropped = buildAnalyticsEnvelope({
    eventName: "page_view",
    payload: view,
    contentSlug: "https://x.test/recipes",
    accessState: "trial",
  });
  expect(dropped).not.toBeNull();
  expect(dropped && "content_slug" in dropped).toBe(false);
  expect(dropped && "access_state" in dropped).toBe(false);
});

test("the Stripe session id and search text are removed from every address PostHog would send", () => {
  expect(stripPrivateQueryParams("https://mycuratedhaven.com/checkout/return?session_id=cs_test_a1b2")).toBe(
    "https://mycuratedhaven.com/checkout/return"
  );
  expect(stripPrivateQueryParams("https://mycuratedhaven.com/checkout/return?utm_source=instagram&session_id=cs_test_a1b2")).toBe(
    "https://mycuratedhaven.com/checkout/return?utm_source=instagram"
  );
  expect(stripPrivateQueryParams("https://mycuratedhaven.com/recipes?q=soup")).toBe("https://mycuratedhaven.com/recipes");
  expect(stripPrivateQueryParams("https://mycuratedhaven.com/recipes?q=oat+bars&meal=Snack")).toBe(
    "https://mycuratedhaven.com/recipes?meal=Snack"
  );
  // Only whole parameter names: a campaign tag or a filter is kept.
  expect(stripPrivateQueryParams("https://mycuratedhaven.com/recipes?meal=Snack&utm_campaign=story_link")).toBe(
    "https://mycuratedhaven.com/recipes?meal=Snack&utm_campaign=story_link"
  );
  expect(stripPrivateQueryParams("/recipes?q=soup&meal=Snack")).toBe("/recipes?meal=Snack");
  expect(stripPrivateQueryParams("$direct")).toBe("$direct");
  expect(stripPrivateQueryParams(undefined)).toBeUndefined();

  const event = withoutPrivateQueryParams({
    uuid: "0199",
    event: "$pageview",
    properties: {
      $current_url: "https://mycuratedhaven.com/checkout/return?session_id=cs_live_x",
      $referrer: "https://mycuratedhaven.com/checkout/return?session_id=cs_live_x&b=2",
      $session_entry_url: "https://mycuratedhaven.com/recipes?q=peanut%20free%20lunch",
      $pathname: "/checkout/return",
    },
    $set_once: { $initial_current_url: "https://mycuratedhaven.com/checkout/return?session_id=cs_live_x" },
  });
  expect(JSON.stringify(event)).not.toContain("cs_live_x");
  expect(JSON.stringify(event)).not.toContain("peanut");
  expect(event?.properties.$referrer).toBe("https://mycuratedhaven.com/checkout/return?b=2");
  expect(withoutPrivateQueryParams(null)).toBeNull();
});

test("while a 404 shows, PostHog's address properties name /404, never the typed address", () => {
  const typed = "/recipes/no-such-recipe-for-maya";
  expect(withoutNotFoundAddress(`https://mycuratedhaven.com${typed}?utm_source=instagram#x`, typed)).toBe("https://mycuratedhaven.com/404");
  expect(withoutNotFoundAddress(typed, typed)).toBe("/404");
  // Other addresses, and every address when no 404 shows, are left alone.
  expect(withoutNotFoundAddress("https://www.instagram.com/", typed)).toBe("https://www.instagram.com/");
  expect(withoutNotFoundAddress("https://mycuratedhaven.com/recipes", typed)).toBe("https://mycuratedhaven.com/recipes");
  expect(withoutNotFoundAddress(`https://mycuratedhaven.com${typed}`, null)).toBe(`https://mycuratedhaven.com${typed}`);

  markNotFoundPage(typed);
  try {
    const event = withoutPrivateQueryParams({
      uuid: "0199",
      event: "$pageview",
      properties: {
        $current_url: `https://mycuratedhaven.com${typed}?q=soup`,
        $pathname: typed,
        $referrer: "https://www.instagram.com/",
      },
      $set_once: { $initial_current_url: `https://mycuratedhaven.com${typed}` },
    });
    expect(JSON.stringify(event)).not.toContain("maya");
    expect(event?.properties.$pathname).toBe("/404");
    expect(event?.properties.$referrer).toBe("https://www.instagram.com/");
  } finally {
    clearNotFoundPage(typed);
  }
});

test("entry_app names Instagram's and Facebook's browsers with the sign-in pattern", () => {
  const instagram =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0";
  const facebook = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0]";
  const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1";
  expect(inAppBrowserName(instagram)).toBe("instagram");
  expect(inAppBrowserName(facebook)).toBe("facebook");
  expect(inAppBrowserName(safari)).toBe("browser");
  expect(inAppBrowserName(null)).toBe("browser");
  for (const agent of [instagram, facebook, safari]) {
    expect(isInAppBrowser(agent), agent).toBe(inAppBrowserName(agent) !== "browser");
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
