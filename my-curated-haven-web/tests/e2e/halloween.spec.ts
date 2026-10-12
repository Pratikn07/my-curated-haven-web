import { expect, test, type Page } from "@playwright/test";

/**
 * The Halloween landing page. Runs against the local database, where the
 * Halloween recipes are not free, so every menu link must go to the Halloween
 * collection instead of a recipe page that would not open. The same checks hold
 * once the recipes are free: then each link goes to /recipes/<slug>.
 */
const PAGE = "/halloween";
const FROM_DM = `${PAGE}?utm_source=instagram&utm_medium=organic_social&utm_campaign=comment_dm`;

type RecordedEvent = { event_name: string; properties: Record<string, unknown> };

function recordedEvents(page: Page): Promise<RecordedEvent[]> {
  return page.evaluate(() => {
    const provider = (window as unknown as { __mch_analytics_provider?: { getRecordedEvents?: () => RecordedEvent[] } })
      .__mch_analytics_provider;
    return provider?.getRecordedEvents?.() ?? [];
  });
}

test("[halloween] the first screen is the menu, and every dish opens a page that exists", async ({ page }) => {
  // An iPhone screen minus Instagram's own bars.
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto(FROM_DM);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Halloween, the not-scary way\./);
  const menu = page.getByRole("navigation", { name: "Halloween menu" });
  const dishes = menu.getByRole("link");
  await expect(dishes).toHaveCount(3);

  const first = await dishes.first().boundingBox();
  expect(first, "the first dish is laid out").not.toBeNull();
  expect(first!.y + first!.height, "and sits on the first screen").toBeLessThanOrEqual(664);

  for (const href of await dishes.evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
    expect(href).toMatch(/^\/(recipes\/[a-z0-9-]+|collections\/halloween)$/);
    const response = await page.request.get(href!);
    expect(response.status(), href!).toBe(200);
  }
});

test("[halloween] the page never scrolls sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PAGE);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    const wider = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(wider, `at ${y}px`).toBe(false);
  }
});

test("[halloween] with reduced motion the street stands still with every light on", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PAGE);
  await page.locator("#hw-walk").scrollIntoViewIfNeeded();
  await expect(page.locator(".hw")).not.toHaveAttribute("data-motion", "on");
  for (const opacity of await page.locator(".hw-s-on").evaluateAll((lights) => lights.map((light) => getComputedStyle(light).opacity))) {
    expect(opacity).toBe("1");
  }
});

test("[halloween] without script the whole page is there to read", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.getByRole("heading", { name: "Make them Halloween" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How we're doing Halloween this year" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Three doorbells, then home" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Why we cook for Halloween" })).toBeVisible();
  await expect(page.getByRole("link", { name: /See the Halloween collection/ })).toHaveAttribute("href", "/collections/halloween");
  await context.close();
});

test("[halloween] the visit is counted as the Halloween story", async ({ page }) => {
  await page.goto(FROM_DM);
  await expect.poll(async () => (await recordedEvents(page)).some((event) => event.event_name === "story_view")).toBe(true);
  const view = (await recordedEvents(page)).find((event) => event.event_name === "story_view")!;
  expect(view.properties).toMatchObject({ story_slug: "halloween", room: "kitchen", story_series: "halloween-2026" });
});
