import { expect, test, type Page } from "@playwright/test";
import { isPrivatePath } from "../../src/lib/analytics/private-paths";

type RecordedEvent = { event_name: string; properties: Record<string, unknown>; campaign_code?: string };

function recordedEvents(page: Page): Promise<RecordedEvent[]> {
  return page.evaluate(() => {
    const provider = (
      window as unknown as {
        __mch_analytics_provider?: { getRecordedEvents?: () => RecordedEvent[] };
      }
    ).__mch_analytics_provider;
    return provider?.getRecordedEvents?.() ?? [];
  });
}

async function countEvents(page: Page, match: (event: RecordedEvent) => boolean): Promise<number> {
  return (await recordedEvents(page)).filter(match).length;
}

test("page views are recorded with no banner, and nothing leaves the browser without a PostHog key", async ({ page }) => {
  const captures: string[] = [];
  await page.route(/posthog\.com|\/capture\//, async (route) => {
    captures.push(route.request().url());
    await route.abort();
  });

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Accept Analytics" })).toHaveCount(0);
  await expect
    .poll(() => countEvents(page, (event) => event.event_name === "page_view"))
    .toBe(1);
  expect(await page.evaluate(() => localStorage.getItem("mch_analytics_consent"))).toBeNull();
  expect(captures).toEqual([]);
});

test("sign-in, account and checkout pages are never session-recorded", () => {
  for (const path of ["/sign-in", "/account", "/account/saved", "/checkout", "/checkout/success"]) {
    expect(isPrivatePath(path), path).toBe(true);
  }
  for (const path of ["/", "/recipes", "/recipes/synth-free-oat-bake", "/accounting", "/sign-in-help"]) {
    expect(isPrivatePath(path), path).toBe(false);
  }
});

test("[haven-house] opening a room records only fixed analytics values", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("list", { name: "Rooms in the house" })
    .getByRole("link", { name: /^Library/ })
    .click();
  await expect(page).toHaveURL(/#room-library$/);

  await expect
    .poll(() => countEvents(page, (event) => event.event_name === "homepage_preview_opened"))
    .toBe(1);

  const event = (await recordedEvents(page)).find((item) => item.event_name === "homepage_preview_opened");
  expect(event?.properties).toEqual({
    feature_key: "library",
    placement: "house",
    content_version: "hh-2026-10-02",
  });
});

test("[haven-house] analytics provider failure does not block opening a room", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const provider = (
      window as unknown as {
        __mch_analytics_provider?: { send?: () => Promise<void> };
      }
    ).__mch_analytics_provider;
    if (provider) provider.send = async () => { throw new Error("offline"); };
  });

  await page.getByRole("list", { name: "Rooms in the house" }).getByRole("link", { name: /^Kitchen/ }).click();
  await expect(page.locator("#room-kitchen")).toBeVisible();
});

test("a registered Instagram campaign is kept from the first page", async ({ page }) => {
  await page.goto(
    "/recipes?utm_source=instagram&utm_medium=organic_social&utm_campaign=bio_link&utm_content=bio"
  );
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("mch_campaign_attribution")))
    .toContain("bio_link");
  await expect
    .poll(() => countEvents(page, (event) => event.event_name === "recipe_list_view" && event.campaign_code === "bio_link"))
    .toBeGreaterThan(0);
});

test("[tracking] the Halloween landing page records its own page view", async ({ page }) => {
  await page.goto("/halloween");
  await expect
    .poll(() => countEvents(page, (event) => event.event_name === "page_view" && event.properties.route_key === "halloween"))
    .toBe(1);
});

test("[tracking] tapping buy records checkout_clicked for the release on sale", async ({ page }) => {
  const checkoutBodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/checkout", async (route) => {
    checkoutBodies.push(route.request().postDataJSON());
    // Stop here: the test is about the click, not the purchase.
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });

  await page.goto("/collections/comfort-haven-collection");
  const buy = page.getByRole("button", { name: /Buy now/i });
  const expected = JSON.parse((await buy.getAttribute("data-checkout-expected")) ?? "{}");
  expect(expected.releaseId).toBeTruthy();
  await buy.click();

  await expect
    .poll(() =>
      countEvents(
        page,
        (event) =>
          event.event_name === "checkout_clicked" &&
          event.properties.collection_release_id === expected.releaseId &&
          event.properties.collection_slug === "comfort-haven-collection" &&
          event.properties.surface === "buy_box" &&
          !("entry_point" in event.properties)
      )
    )
    .toBe(1);
  // PostHog is off in tests, so only the button travels with the checkout request, never PostHog ids.
  expect(checkoutBodies).toHaveLength(1);
  expect(checkoutBodies[0].analytics).toEqual({ surface: "buy_box" });
});

test("an unknown campaign is not stored", async ({ page }) => {
  await page.goto(
    "/recipes?utm_source=instagram&utm_medium=organic_social&utm_campaign=not_registered&utm_content=bio"
  );
  await page.waitForLoadState("networkidle");
  const stored = await page.evaluate(() => sessionStorage.getItem("mch_campaign_attribution"));
  expect(stored).toBeNull();
});
