import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Instagram landing pages. Runs against the local sample story, which sits on
 * the seeded synthetic frittata and is never served on Vercel deployments.
 */
const STORY = "/stories/local-sample-frittata";
const FROM_DM = `${STORY}?utm_source=instagram&utm_medium=organic_social&utm_campaign=comment_dm`;

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

test("[stories] the first screen repeats the post and offers the recipe in thumb reach", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(FROM_DM);

  await expect(page.getByRole("heading", { level: 1, name: "A sample frittata small hands can hold." })).toBeVisible();
  await expect(page.getByText("Picked by")).toContainText("Bhagyashree");

  const button = page.locator("#story-card-action");
  await expect(button).toHaveText(/Get the recipe · 25 min/);
  const box = await button.boundingBox();
  expect(box, "card button is laid out").not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);

  await button.click();
  await expect(page).toHaveURL(/#story-recipe$/);
  const recipe = page.locator("#story-recipe");
  await expect(recipe.getByRole("heading", { name: "Ingredients" })).toBeInViewport();
  await expect(recipe.getByRole("link", { name: /Open the full recipe page/ })).toHaveAttribute(
    "href",
    "/recipes/synth-free-veggie-frittata"
  );
});

test("[stories] the sticky button shows only while the card button is off screen and the recipe isn't reached", async ({ page }) => {
  // A short screen pushes the card button below the fold. (The local sample has no photo,
  // so its card sits higher than a real post's would.)
  await page.setViewportSize({ width: 360, height: 400 });
  await page.goto(STORY);
  await expect(page.locator("#story-card-action")).not.toBeInViewport();

  const sticky = page.locator(".story-sticky");
  await expect(sticky).toHaveAttribute("data-visible", "true");
  await sticky.click();
  await expect(page.locator("#story-recipe").getByRole("heading", { name: "Ingredients" })).toBeInViewport();
  await expect(sticky).toHaveAttribute("data-visible", "false");

  // Further down the page it never comes back to chase the reader.
  await page.getByRole("heading", { name: "Questions" }).scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-visible", "false");
});

test("[stories] the page ends with Bhagyashree's note, one honest offer and a way back", async ({ page }) => {
  await page.goto(STORY);

  await expect(page.getByRole("heading", { name: "Who’s behind this kitchen" })).toBeVisible();
  await expect(page.getByText("Anaika is pulling at my leg")).toBeVisible();

  // Checkout is on in local runs and the seeded collection is on sale.
  const offer = page.getByRole("region", { name: "This one’s free. There are more like it in the collection." });
  await expect(offer).toBeVisible();
  await expect(offer.getByText("1 recipe · $15.00")).toBeVisible();
  await expect(offer.getByRole("link", { name: /See what’s inside/ })).toHaveAttribute(
    "href",
    "/collections/comfort-haven-collection"
  );
  await expect(page.getByText("Every recipe we add later is yours too.")).toBeVisible();
  await expect(page.getByText(/no refund/i)).toHaveCount(0);
  await expect(page.getByText("COLLECTION", { exact: true })).toBeVisible();

  // Nothing on the path asks for an account, and the parenting app never appears.
  await expect(
    page.locator(".story").getByRole("link", { name: /sign in|log in|account|app store|google play|download/i })
  ).toHaveCount(0);
  await expect(page.locator("footer")).toContainText("Nibble & Nurture");
});

test("[stories] analytics names the post, keeps comment_dm and records taps with fixed values", async ({ page }) => {
  await page.goto(FROM_DM);

  await expect.poll(async () => (await recordedEvents(page)).some((event) => event.event_name === "story_view")).toBe(true);
  const view = (await recordedEvents(page)).find((event) => event.event_name === "story_view");
  expect(view?.properties).toEqual({ story_slug: "local-sample-frittata", room: "kitchen" });
  expect(view?.campaign_code).toBe("comment_dm");
  expect(await page.evaluate(() => sessionStorage.getItem("mch_entry_story"))).toBe("local-sample-frittata");

  await page.locator("#story-card-action").click();
  await expect
    .poll(async () => (await recordedEvents(page)).filter((event) => event.event_name === "story_action_clicked").length)
    .toBe(1);
  const tap = (await recordedEvents(page)).find((event) => event.event_name === "story_action_clicked");
  expect(tap?.properties).toEqual({
    story_slug: "local-sample-frittata",
    story_action: "recipe_jump",
    story_placement: "card",
  });
});

test("[stories] a landing page never downloads the homepage house painting", async ({ page }) => {
  const houseRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/images/house/")) houseRequests.push(request.url());
  });
  await page.goto(STORY);
  await page.waitForLoadState("networkidle");
  await expect(page.locator('link[rel="preload"][imagesrcset*="house-"]')).toHaveCount(0);
  expect(houseRequests).toEqual([]);
});

test("[stories] unknown stories are not found and pages stay out of search results", async ({ page }) => {
  const missing = await page.goto("/stories/not-a-real-post");
  expect(missing?.status()).toBe(404);

  await page.goto(STORY);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://mycuratedhaven.com/recipes/synth-free-veggie-frittata"
  );
});

test("[stories] the landing page has no serious accessibility violations", async ({ page }) => {
  await page.goto(STORY);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
  expect(serious.map((violation) => violation.id)).toEqual([]);
});
