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

test("[homepage-vision] preview click records only fixed analytics values", async ({ page }) => {
  await page.goto("/");

  await page
    .locator("#explore-haven")
    .getByRole("link", { name: "Preview Parenting Chat" })
    .click();
  await expect(page).toHaveURL(/#parenting-chat-preview$/);

  await expect
    .poll(() => countEvents(page, (event) => event.event_name === "homepage_preview_opened"))
    .toBe(1);

  const event = (await recordedEvents(page)).find((item) => item.event_name === "homepage_preview_opened");
  expect(event?.properties).toEqual({
    feature_key: "chat",
    placement: "overview",
    content_version: "hv-2026-09-24",
  });
});

test("[homepage-vision] preview visibility is recorded once", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const isBloomView = (event: RecordedEvent) =>
    event.event_name === "homepage_preview_viewed" && event.properties.feature_key === "bloom";
  const preview = page.locator("#bloom-preview");
  await preview.scrollIntoViewIfNeeded();
  await expect.poll(() => countEvents(page, isBloomView)).toBe(1);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await preview.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1100);
  expect(await countEvents(page, isBloomView)).toBe(1);
});

test("[homepage-vision] analytics provider failure does not block preview navigation", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const provider = (
      window as unknown as {
        __mch_analytics_provider?: { send?: () => Promise<void> };
      }
    ).__mch_analytics_provider;
    if (provider) provider.send = async () => { throw new Error("offline"); };
  });

  await page.locator("#explore-haven").getByRole("link", { name: "Preview Parenting Chat" }).click();
  await expect(page).toHaveURL(/#parenting-chat-preview$/);
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

test("an unknown campaign is not stored", async ({ page }) => {
  await page.goto(
    "/recipes?utm_source=instagram&utm_medium=organic_social&utm_campaign=not_registered&utm_content=reel_001"
  );
  await page.waitForLoadState("networkidle");
  const stored = await page.evaluate(() => sessionStorage.getItem("mch_campaign_attribution"));
  expect(stored).toBeNull();
});
