import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Instagram campaign pages. Runs against the local sample campaigns on the
 * seeded synthetic recipes, which are never served on Vercel deployments:
 * one recipe with the collection, and three recipes with a pack.
 */
const SINGLE = "/stories/local-sample-frittata";
const MULTI = "/stories/local-sample-breakfasts";
const FROM_DM = `${MULTI}?utm_source=instagram&utm_medium=organic_social&utm_campaign=comment_dm`;

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

async function top(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
}

test("[stories] the first screen confirms the post and how many free recipes wait below", async ({ page }) => {
  // An iPhone screen minus Instagram's own bars.
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto(FROM_DM);

  await expect(page.getByRole("heading", { level: 1, name: "3 breakfasts worth saving." })).toBeVisible();
  await expect(page.getByText("From the Tiny Soho kitchen")).toBeVisible();
  await expect(page.getByText("Picked by")).toContainText("Bhagyashree");

  const cta = page.getByRole("link", { name: /See the 3 free recipes/ });
  const box = await cta.boundingBox();
  expect(box, "the way to the recipes is laid out").not.toBeNull();
  expect(box!.y + box!.height, "and sits on the first screen").toBeLessThanOrEqual(664);

  await cta.click();
  await expect(page).toHaveURL(/#cp-recipes$/);
  await expect(page.getByRole("heading", { level: 2, name: "Your recipes are here." })).toBeInViewport();
});

test("[stories] one campaign shows every promised recipe, in order, each opening its permanent page", async ({ page }) => {
  await page.goto(MULTI);

  const recipes = page.locator("#cp-recipes");
  await expect(recipes).toHaveAttribute("data-layout", "trio");
  const links = recipes.getByRole("heading", { level: 3 }).getByRole("link");
  await expect(links).toHaveCount(3);
  expect(await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")))).toEqual([
    "/recipes/synth-free-oat-bake",
    "/recipes/synth-free-veggie-frittata",
    "/recipes/synth-free-berry-smoothie",
  ]);
  // The campaign's own words replace the catalog summary where it gives one.
  await expect(recipes.getByText("Warm, soft and ready while the kettle boils.")).toBeVisible();

  // The full recipe lives on its own page, never copied here.
  await expect(page.getByRole("heading", { name: "Ingredients" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Method/ })).toHaveCount(0);

  await links.first().click();
  await expect(page).toHaveURL(/\/recipes\/synth-free-oat-bake$/);
  await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
});

test("[stories] a one-recipe campaign gets the single layout and keeps the recipe page canonical", async ({ page }) => {
  await page.goto(SINGLE);

  await expect(page.getByRole("heading", { level: 1, name: "A sample frittata small hands can hold." })).toBeVisible();
  await expect(page.getByRole("link", { name: /See the free recipe/ })).toBeVisible();
  await expect(page.locator("#cp-recipes")).toHaveAttribute("data-layout", "single");
  await expect(page.getByRole("heading", { level: 2, name: "Your recipe is here." })).toBeVisible();
  await expect(page.locator("#cp-recipes").getByRole("link", { name: "Synthetic Free Veggie Frittata" })).toHaveAttribute(
    "href",
    "/recipes/synth-free-veggie-frittata"
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://mycuratedhaven.com/recipes/synth-free-veggie-frittata"
  );
});

test("[stories] Bhagyashree and Anaika's kitchen story is five moments in order, then her note", async ({ page }) => {
  await page.goto(MULTI);

  const story = page.getByRole("region", { name: "Meet Bhagyashree & Anaika" });
  await expect(story).toBeVisible();
  const moments = story.locator(".cp-moment");
  await expect(moments).toHaveCount(5);
  const steps = await story.locator(".cp-moment-step").allTextContents();
  expect(steps.map((step) => step.replace(/\s+/g, " ").trim())).toEqual(["01 Prep", "02 Mix", "03 Shape", "04 Top", "05 Taste"]);
  for (const alt of [/slices a banana/, /stirs oats and blueberries/, /rows of oat bites/, /presses a blueberry/, /take a bite/]) {
    await expect(story.getByRole("img", { name: alt })).toHaveCount(1);
  }
  await expect(story.getByText("It started in our kitchen.")).toBeAttached();
  await expect(story.getByText("Anaika is pulling at my leg")).toBeVisible();
});

test("[stories] large screens pin the story and move through it with scroll; less motion keeps it still", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Pinning is for large screens; phones keep the stacked story.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(MULTI);

  const story = page.locator(".cp-story");
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-motion", "pinned");

  const third = page.locator(".cp-moment").nth(2).locator(".cp-moment-text");
  await expect.poll(() => third.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThan(0.1);
  // The pinned range runs from the track's top meeting the header to its bottom meeting the screen's.
  // The third moment rests a little before half way (KitchenStoryMotion's timeline: 2.15 of 4.65 units).
  const target = await page.locator(".cp-story-track").evaluate((element) => {
    const track = element as HTMLElement;
    const header = parseFloat(getComputedStyle(track.querySelector(".cp-story-stage")!).top);
    const start = track.getBoundingClientRect().top + window.scrollY - header;
    const range = track.offsetHeight - (window.innerHeight - header);
    return start + range * (2.15 / 4.65);
  });
  await page.evaluate((y) => window.scrollTo(0, y), target);
  await expect.poll(() => third.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0.9);

  // A phone-sized screen undoes the pin and every moment is plainly visible again.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(story).not.toHaveAttribute("data-motion", "pinned");
  await expect.poll(() => third.evaluate((element) => Number(getComputedStyle(element).opacity))).toBe(1);

  const still = await page.context().newPage();
  await still.emulateMedia({ reducedMotion: "reduce" });
  await still.setViewportSize({ width: 1440, height: 900 });
  await still.goto(MULTI);
  await still.locator(".cp-story").scrollIntoViewIfNeeded();
  await still.waitForTimeout(1500);
  await expect(still.locator(".cp-story")).not.toHaveAttribute("data-motion", "pinned");
  await still.close();
});

test("[stories] commerce comes after the recipes and the story, with one honest price per offer", async ({ page }) => {
  // Checkout is on in local runs and the seeded collection is on sale.
  await page.goto(SINGLE);
  const collection = page.getByRole("region", { name: "The Comfort Haven Collection" });
  await expect(collection).toBeVisible();
  await expect(collection.getByText("Plus every recipe we add to it later, at no extra cost.")).toBeVisible();
  await expect(collection.getByRole("link", { name: /See the collection/ })).toHaveAttribute(
    "href",
    "/collections/comfort-haven-collection"
  );
  await expect(collection.getByText("$15.00").first()).toBeVisible();
  await expect(collection.getByRole("heading", { name: "Free, pack or collection?" })).toBeVisible();
  expect(await top(page, "#cp-recipes")).toBeLessThan(await top(page, "#cp-story"));
  expect(await top(page, "#cp-story")).toBeLessThan(await top(page, ".cp-collection"));
  // The way back appears only with an offer and a keyword the DM tool answers.
  await expect(page.getByText("COLLECTION", { exact: true })).toBeVisible();

  await page.goto(MULTI);
  const pack = page.getByRole("region", { name: "Want more mornings like these?" });
  await expect(pack).toBeVisible();
  await expect(pack.getByRole("link", { name: /See what’s inside/ })).toHaveAttribute("href", "/collections/comfort-haven-collection");
  await expect(pack.getByText("Free on this page")).toBeVisible();
  expect(await top(page, "#cp-story")).toBeLessThan(await top(page, ".cp-pack"));

  for (const path of [SINGLE, MULTI]) {
    await page.goto(path);
    // No pressure tactics, no refund talk, nothing that asks for an account, and never the parenting app.
    await expect(page.getByText(/no refund|only \d+ left|hurry|limited time|countdown/i)).toHaveCount(0);
    await expect(page.locator(".campaign s, .campaign del")).toHaveCount(0);
    await expect(
      page.locator(".campaign").getByRole("link", { name: /sign in|log in|account|app store|google play|download/i })
    ).toHaveCount(0);
    await expect(page.locator("footer")).toContainText("Nibble & Nurture");
  }
});

test("[stories] analytics names the post, keeps comment_dm and records taps and sections with fixed values", async ({ page }) => {
  await page.goto(FROM_DM);

  await expect.poll(async () => (await recordedEvents(page)).some((event) => event.event_name === "story_view")).toBe(true);
  const view = (await recordedEvents(page)).find((event) => event.event_name === "story_view");
  expect(view?.properties).toEqual({
    story_slug: "local-sample-breakfasts",
    room: "kitchen",
    recipe_count: 3,
    offer_state: "pack",
    story_series: "sample-breakfasts",
  });
  expect(view?.campaign_code).toBe("comment_dm");
  expect(await page.evaluate(() => sessionStorage.getItem("mch_entry_story"))).toBe("local-sample-breakfasts");

  await page.getByRole("link", { name: /See the 3 free recipes/ }).click();
  await expect
    .poll(async () => (await recordedEvents(page)).filter((event) => event.event_name === "story_action_clicked").length)
    .toBe(1);
  expect((await recordedEvents(page)).find((event) => event.event_name === "story_action_clicked")?.properties).toEqual({
    story_slug: "local-sample-breakfasts",
    story_action: "recipe_jump",
    story_placement: "hero",
  });
  await expect
    .poll(async () =>
      (await recordedEvents(page)).some(
        (event) => event.event_name === "story_section_viewed" && event.properties.story_section === "recipes"
      )
    )
    .toBe(true);

  await page.locator("#cp-recipes").getByRole("link", { name: "Synthetic Free Veggie Frittata" }).click();
  await expect(page).toHaveURL(/\/recipes\/synth-free-veggie-frittata$/);
  const opened = (await recordedEvents(page)).filter(
    (event) => event.event_name === "story_action_clicked" && event.properties.story_action === "campaign_recipe"
  );
  expect(opened.map((event) => event.properties)).toEqual([
    {
      story_slug: "local-sample-breakfasts",
      story_action: "campaign_recipe",
      story_placement: "recipes",
      recipe_id: "10000000-0000-0000-0000-000000000002",
      recipe_position: 2,
    },
  ]);
  // The visit stays tied to the post after leaving it.
  expect(await page.evaluate(() => sessionStorage.getItem("mch_entry_story"))).toBe("local-sample-breakfasts");
});

test("[stories] a campaign page never downloads the homepage house painting", async ({ page }) => {
  const houseRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/images/house/")) houseRequests.push(request.url());
  });
  await page.goto(MULTI);
  await page.waitForLoadState("networkidle");
  await expect(page.locator('link[rel="preload"][imagesrcset*="house-"]')).toHaveCount(0);
  expect(houseRequests).toEqual([]);
});

test("[stories] unknown campaigns are not found and pages stay out of search results", async ({ page }) => {
  const missing = await page.goto("/stories/not-a-real-post");
  expect(missing?.status()).toBe(404);

  await page.goto(MULTI);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://mycuratedhaven.com/stories/local-sample-breakfasts"
  );
});

test("[stories] campaign pages have no serious accessibility violations", async ({ page }) => {
  for (const path of [SINGLE, MULTI]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
    expect(serious.map((violation) => violation.id), path).toEqual([]);
  }
});
