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

test("[stories] headline words stay whole: no word is ever split across lines", async ({ page }) => {
  // Safari once put the first letter of each hero word on a line of its own ("F / rittata").
  for (const path of [SINGLE, MULTI]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const split = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>(".campaign .cp-word-in"))
        // offsetHeight ignores the reveal's rotate, so this is the word's laid-out height: one line or more.
        .filter((word) => word.offsetHeight > parseFloat(getComputedStyle(word).fontSize) * 1.5)
        .map((word) => word.textContent)
    );
    expect(split, path).toEqual([]);
  }
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
  // The third moment rests a little before half way (the story timeline in motion/story.ts: 2.15 of 4.65 units).
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

test("[stories] the filmstrip under the pinned story jumps to any moment", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "The filmstrip belongs to the pinned story on large screens.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(MULTI);

  const story = page.locator(".cp-story");
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveAttribute("data-motion", "pinned");

  const reel = page.getByRole("list", { name: "Moments of the story" });
  const top = reel.getByRole("button", { name: "Moment 4 of 5: Top" });
  await top.click();
  const fourth = page.locator(".cp-moment").nth(3).locator(".cp-moment-text");
  await expect.poll(() => fourth.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0.9);
  await expect(top).toHaveAttribute("aria-current", "step");
  await expect(reel.getByRole("button", { name: "Moment 1 of 5: Prep" })).not.toHaveAttribute("aria-current", "step");
});

test("[stories] the promised recipe stays one tap away once it has scrolled past", async ({ page }) => {
  await page.goto(SINGLE);
  const dock = page.locator(".cp-dock");
  const open = dock.getByRole("link", { name: /Open recipe/ });
  // Not on the first screen, where the hero's button is the way down.
  await expect(dock).toHaveAttribute("data-visible", "false");
  await expect(open).toBeHidden();

  const intoStory = () =>
    page.evaluate(() => {
      const story = document.querySelector("#cp-story")!;
      window.scrollTo(0, story.getBoundingClientRect().top + window.scrollY + 300);
    });
  await intoStory();
  await expect(dock).toHaveAttribute("data-visible", "true");
  await expect(open).toBeVisible();
  await expect(open).toHaveAttribute("href", "/recipes/synth-free-veggie-frittata");

  // It steps aside while an offer is on screen, so it never competes with a price.
  await page.locator(".cp-collection").scrollIntoViewIfNeeded();
  await expect(dock).toHaveAttribute("data-visible", "false");
  await expect(open).toBeHidden();

  await intoStory();
  await expect(open).toBeVisible();
  await open.click();
  await expect(page).toHaveURL(/\/recipes\/synth-free-veggie-frittata$/);
  const taps = (await recordedEvents(page)).filter((event) => event.event_name === "story_action_clicked");
  expect(taps.map((event) => event.properties)).toEqual([
    {
      story_slug: "local-sample-frittata",
      story_action: "campaign_recipe",
      story_placement: "sticky",
      recipe_id: "10000000-0000-0000-0000-000000000002",
      recipe_position: 1,
    },
  ]);
});

test("[stories] with reduced motion every part of the page is simply in place", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(MULTI);
  for (const selector of ["#cp-recipes", "#cp-story", ".cp-pack", ".cp-questions", ".cp-closing"]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
  }
  // Nothing is held below its place or behind a mask, waiting for a reveal.
  const held = await page.evaluate(() => [
    ...Array.from(document.querySelectorAll("[data-reveal]")).filter((element) => getComputedStyle(element).translate !== "none"),
    ...Array.from(document.querySelectorAll(".cp-word-in")).filter((element) => getComputedStyle(element).transform !== "none"),
  ].length);
  expect(held).toBe(0);
  await expect(page.locator(".cp-story")).not.toHaveAttribute("data-motion", "pinned");
});

test("[stories] without script the page is complete and still", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  // The checks below are about the HTML, so don't wait for every image: in CI one
  // optimised-image request can hang and hold the load event past the test timeout.
  await page.goto(MULTI, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "3 breakfasts worth saving." })).toBeVisible();
  await expect(page.getByRole("link", { name: /See the 3 free recipes/ })).toHaveAttribute("href", "#cp-recipes");
  await expect(page.locator("#cp-recipes").getByRole("heading", { level: 3 })).toHaveCount(3);
  await expect(page.locator(".cp-moment")).toHaveCount(5);
  await expect(page.getByText("Anaika is pulling at my leg")).toBeVisible();
  // The dock needs the script to know where the reader is, so it never shows without it.
  await expect(page.locator(".cp-dock a")).toBeHidden();
  await context.close();
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
  await page.goto(MULTI, { waitUntil: "domcontentloaded" });
  // Watch requests until the network goes quiet, but don't let one hung optimised-image
  // request in CI time the test out; a preloaded painting would be requested long before.
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
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
