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

test("sign-in, account, checkout and admin pages are never session-recorded", () => {
  for (const path of ["/sign-in", "/account", "/account/saved", "/checkout", "/checkout/success", "/admin", "/admin/recipes/new"]) {
    expect(isPrivatePath(path), path).toBe(true);
  }
  for (const path of ["/", "/recipes", "/recipes/synth-free-oat-bake", "/accounting", "/sign-in-help", "/administer"]) {
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

test("an unknown campaign is not stored", async ({ page }) => {
  await page.goto(
    "/recipes?utm_source=instagram&utm_medium=organic_social&utm_campaign=not_registered&utm_content=bio"
  );
  await page.waitForLoadState("networkidle");
  const stored = await page.evaluate(() => sessionStorage.getItem("mch_campaign_attribution"));
  expect(stored).toBeNull();
});
