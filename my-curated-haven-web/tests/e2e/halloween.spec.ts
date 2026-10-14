import { expect, test, type Page } from "@playwright/test";
import { HALLOWEEN_TRICKS } from "../../src/config/halloween";

/**
 * The Halloween landing page. Runs against the local database, where the
 * Halloween recipes are not free, so every menu link must go to the Halloween
 * collection instead of a recipe page that would not open. The same checks hold
 * once the recipes are free: then each link goes to /recipes/<slug>.
 */
const PAGE = "/halloween";
const FROM_DM = `${PAGE}?utm_source=instagram&utm_medium=organic_social&utm_campaign=comment_dm`;
/** The before-and-after section is empty until new photos exist (src/config/halloween.ts). */
const HAS_TRICKS = HALLOWEEN_TRICKS.length > 0;

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
  // Each dish says what a tap opens, instead of a count in the header.
  await expect(menu.getByText(/^(Free|In the book)$/)).toHaveCount(3);

  const first = await dishes.first().boundingBox();
  expect(first, "the first dish is laid out").not.toBeNull();
  expect(first!.y + first!.height, "and sits on the first screen").toBeLessThanOrEqual(664);

  for (const href of await dishes.evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
    expect(href).toMatch(/^\/(recipes\/[a-z0-9-]+|collections\/halloween)$/);
    const response = await page.request.get(href!);
    expect(response.status(), href!).toBe(200);
  }
});

test("[halloween] the book sits under the menu, and the buy bar follows once it scrolls away", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto(PAGE);

  const card = page.locator("#hw-bookcard");
  const top = await card.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  expect(top, "the book starts by the second screen").toBeLessThan(2 * 664);
  await expect(card.getByRole("link")).toHaveAttribute("href", /^\/collections\/halloween(#buy)?$/);

  const dock = page.locator(".hw-dock");
  await expect(dock).not.toHaveAttribute("data-on");
  await page.locator("#hw-walk").scrollIntoViewIfNeeded();
  await expect(dock).toHaveAttribute("data-on", "");
  await expect(dock.getByRole("link")).toHaveAttribute("href", /^\/collections\/halloween(#buy)?$/);

  // The full book section near the end takes over from the bar.
  await page.locator('[data-story-section="collection"]').scrollIntoViewIfNeeded();
  await expect(dock).not.toHaveAttribute("data-on");
});

test("[halloween] the open book shows every recipe as a photo, and a tap names it", async ({ page }) => {
  // Reduced motion keeps the cover still beside the page, so the tap does not race the scroll-driven swing.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PAGE);
  const book = page.locator(".hw-book");
  const tiles = book.locator(".hw-book-tile");
  const count = await tiles.count();
  expect(count, "one photo per recipe").toBeGreaterThan(0);

  // The page is the cover's size, so the open book reads as a book.
  const [cover, inside] = await Promise.all([book.locator(".hw-book-cover").boundingBox(), book.locator(".hw-book-page").boundingBox()]);
  expect(Math.abs(cover!.height - inside!.height), "the page matches the cover").toBeLessThan(2);

  await tiles.first().click();
  const caption = book.locator(".hw-book-caption");
  await expect(caption).toHaveAttribute("data-on", "");
  await expect(caption.getByRole("link")).toHaveAttribute("href", /^\/(recipes\/[a-z0-9-]+|collections\/halloween)$/);
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
  if (HAS_TRICKS) await expect(page.getByRole("heading", { name: "Make them Halloween" })).toBeVisible();
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

test("[halloween] the before-and-after slider shows more of the everyday version as it moves left", async ({ page }) => {
  test.skip(!HAS_TRICKS, "No before-and-after photos on the page right now");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PAGE);
  const knob = page.getByRole("slider", { name: "Compare the everyday and Halloween versions" }).first();
  await knob.scrollIntoViewIfNeeded();
  await expect(knob).toHaveAttribute("aria-valuenow", "78");
  await knob.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(knob).toHaveAttribute("aria-valuenow", "68");

  // A tap on the photo moves the line there.
  const compare = page.locator(".hw-compare").first();
  const box = (await compare.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.8);
  const value = Number(await knob.getAttribute("aria-valuenow"));
  expect(value).toBeGreaterThan(20);
  expect(value).toBeLessThan(30);
});
