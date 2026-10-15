import { expect, test } from "@playwright/test";
import { acceptCampaignInput } from "../../src/lib/analytics/campaigns";
import { remoteAnalyticsAllowed, trustedAnalyticsEnvironment } from "../../src/lib/analytics/environment";
import { validateAnalyticsEvent } from "../../src/lib/analytics/sanitize";
import { pathToCanonicalRouteKey } from "../../src/lib/analytics/schema";
import { acceptCheckoutAnalytics } from "../../src/lib/analytics/checkout-analytics";
import { isSignInMethodMarker } from "../../src/lib/auth/oauth";
// Tracking PR 2
import { describeLink } from "../../src/lib/analytics/links";
import { buildAnalyticsEnvelope } from "../../src/lib/analytics/sanitize";
import { contentSlugFromPath } from "../../src/lib/analytics/schema";
import { stripCheckoutSessionId, withoutCheckoutSession } from "../../src/lib/analytics/posthog";
import { inAppBrowserName, isInAppBrowser } from "../../src/lib/auth/in-app-browser";

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

  expect(
    validateAnalyticsEvent("homepage_preview_viewed", {
      feature_key: "nursery",
      content_version: "hh-2026-10-02",
    }).ok,
  ).toBe(true);
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

test("the Stripe session id is removed from every address PostHog would send", () => {
  expect(stripCheckoutSessionId("https://mycuratedhaven.com/checkout/return?session_id=cs_test_a1b2")).toBe(
    "https://mycuratedhaven.com/checkout/return"
  );
  expect(stripCheckoutSessionId("https://mycuratedhaven.com/checkout/return?utm_source=instagram&session_id=cs_test_a1b2")).toBe(
    "https://mycuratedhaven.com/checkout/return?utm_source=instagram"
  );
  expect(stripCheckoutSessionId("https://mycuratedhaven.com/recipes?q=soup")).toBe("https://mycuratedhaven.com/recipes?q=soup");
  expect(stripCheckoutSessionId("$direct")).toBe("$direct");
  expect(stripCheckoutSessionId(undefined)).toBeUndefined();

  const event = withoutCheckoutSession({
    uuid: "0199",
    event: "$pageview",
    properties: {
      $current_url: "https://mycuratedhaven.com/checkout/return?session_id=cs_live_x",
      $referrer: "https://mycuratedhaven.com/checkout/return?session_id=cs_live_x&b=2",
      $pathname: "/checkout/return",
    },
    $set_once: { $initial_current_url: "https://mycuratedhaven.com/checkout/return?session_id=cs_live_x" },
  });
  expect(JSON.stringify(event)).not.toContain("cs_live_x");
  expect(event?.properties.$referrer).toBe("https://mycuratedhaven.com/checkout/return?b=2");
  expect(withoutCheckoutSession(null)).toBeNull();
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
