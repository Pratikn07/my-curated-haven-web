import { expect, test } from "@playwright/test";
import { acceptCampaignInput } from "../../src/lib/analytics/campaigns";
import { remoteAnalyticsAllowed, trustedAnalyticsEnvironment } from "../../src/lib/analytics/environment";
import { validateAnalyticsEvent } from "../../src/lib/analytics/sanitize";

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

test("accepts a minimal recipe open", () => {
  const result = validateAnalyticsEvent("recipe_open", {
    recipe_id: RECIPE_ID,
    access_kind: "free",
  });
  expect(result.ok).toBe(true);
});

test("[homepage-vision] accepts bounded preview events and rejects raw destinations", () => {
  const accepted = validateAnalyticsEvent("homepage_preview_opened", {
    feature_key: "chat",
    placement: "overview",
    content_version: "hv-2026-09-24",
  });
  expect(accepted.ok).toBe(true);

  const rawDestination = validateAnalyticsEvent("homepage_preview_opened", {
    feature_key: "chat",
    placement: "overview",
    content_version: "hv-2026-09-24",
    destination_url: "/chat?child_id=private",
  });
  expect(rawDestination.ok).toBe(false);

  const unknownFeature = validateAnalyticsEvent("homepage_preview_opened", {
    feature_key: "expert_marketplace",
    placement: "overview",
    content_version: "hv-2026-09-24",
  });
  expect(unknownFeature.ok).toBe(false);

  const cta = validateAnalyticsEvent("homepage_cta_clicked", {
    placement: "hero",
    destination: "recipes_index",
    presentation_state: "preparation",
    content_version: "hv-2026-09-24",
  });
  expect(cta.ok).toBe(true);

  expect(
    validateAnalyticsEvent("homepage_cta_clicked", {
      placement: "hero",
      destination: "/recipes?email=person@example.com",
      presentation_state: "preparation",
      content_version: "hv-2026-09-24",
    }).ok,
  ).toBe(false);

  expect(
    validateAnalyticsEvent("homepage_preview_viewed", {
      feature_key: "bloom",
      content_version: "hv-2026-09-24",
    }).ok,
  ).toBe(true);
});

test("keeps only registered campaign values", () => {
  expect(
    acceptCampaignInput({
      utm_source: "instagram",
      utm_medium: "organic_social",
      utm_campaign: "toddler_recipes_launch",
      utm_content: "reel_001",
    })?.utm_campaign
  ).toBe("toddler_recipes_launch");

  expect(
    acceptCampaignInput({
      utm_source: "instagram",
      utm_medium: "organic_social",
      utm_campaign: "not_registered",
    })
  ).toBeNull();

  expect(
    acceptCampaignInput({
      utm_source: "parent@example.com",
      utm_medium: "organic_social",
      utm_campaign: "toddler_recipes_launch",
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
