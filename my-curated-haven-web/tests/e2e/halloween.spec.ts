import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The Halloween landing page. Runs against the local database, where the
 * Halloween recipes are not free, so every recipe link must go to the Halloween
 * collection instead of a recipe page that would not open. The same checks hold
 * once the recipes are free: then each link goes to /recipes/<slug>.
 */
const PAGE = "/halloween";
const FROM_DM = `${PAGE}?utm_source=instagram&utm_medium=organic_social&utm_campaign=comment_dm`;
const SLIDER = "Compare the everyday and Halloween versions";

type RecordedEvent = { event_name: string; properties: Record<string, unknown> };

function recordedEvents(page: Page): Promise<RecordedEvent[]> {
  return page.evaluate(() => {
    const provider = (window as unknown as { __mch_analytics_provider?: { getRecordedEvents?: () => RecordedEvent[] } })
      .__mch_analytics_provider;
    return provider?.getRecordedEvents?.() ?? [];
  });
}

test("[halloween] the recipes come first as sliders, each marked Free or In the book, and every link opens", async ({ page }) => {
  // An iPhone screen minus Instagram's own bars.
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto(FROM_DM);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Halloween, the not-scary way\./);
  const recipes = page.locator("#hw-recipes");
  await expect(recipes.getByRole("heading", { name: "Make them Halloween" })).toBeVisible();
  await expect(recipes.locator(".hw-trick")).toHaveCount(3);
  // Each photo says what a tap opens.
  await expect(recipes.locator(".hw-trick-media").getByText(/^(Free|In the book)$/)).toHaveCount(3);

  const first = await recipes.getByRole("slider", { name: SLIDER }).first().evaluate((knob) => knob.closest(".hw-compare")!.getBoundingClientRect().top);
  expect(first + 80, "the first photo starts on the first screen").toBeLessThanOrEqual(664);

  const links = recipes.locator("a.hw-open");
  await expect(links).toHaveCount(3);
  for (const href of await links.evaluateAll((all) => all.map((link) => link.getAttribute("href")))) {
    expect(href).toMatch(/^\/(recipes\/[a-z0-9-]+|collections\/halloween)$/);
    const response = await page.request.get(href!);
    expect(response.status(), href!).toBe(200);
  }
});

test("[halloween] the book follows the recipes, and the buy bar follows once it scrolls away", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto(PAGE);

  const card = page.locator("#hw-recipes + #hw-bookcard");
  await expect(card, "the book card comes straight after the recipes").toHaveCount(1);
  await expect(card.getByRole("link")).toHaveAttribute("href", /^\/collections\/halloween(#buy)?$/);

  const dock = page.locator(".hw-dock");
  await expect(dock).not.toHaveAttribute("data-on");
  await page.locator("#hw-walk").scrollIntoViewIfNeeded();
  await expect(dock).toHaveAttribute("data-on", "");
  await expect(dock).toContainText(/\d+ recipes \+ plan/);
  await expect(dock.getByRole("link")).toHaveAttribute("href", /^\/collections\/halloween(#buy)?$/);

  // The full book section near the end takes over from the bar.
  await page.locator("#hw-collection").scrollIntoViewIfNeeded();
  await expect(dock).not.toHaveAttribute("data-on");
});

test("[halloween] the make-ahead plan follows the book card: three days, what comes with the book, and the plan page", async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator("#hw-bookcard")).toContainText("Comes with a make-ahead plan and one shopping list for Halloween weekend.");

  const strip = page.locator("#hw-bookcard + #hw-plan");
  await expect(strip, "the plan comes straight after the book card").toHaveCount(1);
  await expect(strip.getByRole("listitem")).toHaveCount(3);
  for (const day of ["Freezer night", "Fridge day", "Halloween"]) {
    await expect(strip.getByText(day, { exact: true })).toBeVisible();
  }
  await expect(strip).toContainText("The full plan, the party menu and one shopping list come with the book.");
  await expect(strip.getByRole("link", { name: /See the plan/ })).toHaveAttribute("href", "/collections/halloween/plan");
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
  // The checks below read text and links only. Waiting for every photo made this flaky: under load the image
  // resizer could stall one request and the page's load event never came.
  await page.goto(PAGE, { waitUntil: "domcontentloaded" });
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

test("[halloween] each tap the old story events counted sends cta_clicked with its part of the page and slot", async ({ page }) => {
  await page.goto(PAGE);
  await expect.poll(async () => (await recordedEvents(page)).some((event) => event.event_name === "story_view")).toBe(true);
  // Tapped in place, so the recorder on this page can still be read.
  await page.evaluate(() => window.addEventListener("click", (event) => event.preventDefault(), true));
  const tap = async (link: Locator) => {
    const before = (await recordedEvents(page)).length;
    await link.evaluate((element) => (element as HTMLElement).click());
    let added: RecordedEvent[] = [];
    await expect
      .poll(async () => {
        added = (await recordedEvents(page)).slice(before).filter((event) => event.event_name === "cta_clicked");
        return added.length;
      })
      .toBe(1);
    return added[0].properties;
  };
  // In the local data the Halloween recipes are in the book, so their links open the collection; free ones open the recipe.
  const second = page.locator("#hw-recipes .hw-trick").nth(1).locator("a.hw-open");
  const href = await second.getAttribute("href");
  const target = href!.startsWith("/recipes/")
    ? { cta: "open_recipe", destination_kind: "recipe_detail", target_kind: "recipe", target_slug: href!.slice("/recipes/".length) }
    : { cta: "see_collection", destination_kind: "collection_detail", target_kind: "collection", target_slug: "halloween" };
  const { cta, ...where } = target;
  expect(await tap(second)).toEqual({ primary_ux: "campaign_recipes", link_type: "internal", cta, cta_position: 2, ...where });

  const book = { link_type: "internal", destination_kind: "collection_detail", target_kind: "collection", target_slug: "halloween" };
  expect(await tap(page.locator("#hw-bookcard a"))).toEqual({ primary_ux: "book_card", cta: "get_book", ...book });
  expect(await tap(page.locator("#hw-plan a"))).toEqual({
    primary_ux: "plan_strip",
    link_type: "internal",
    cta: "see_plan",
    destination_kind: "collection_plan",
    target_kind: "plan",
    target_slug: "halloween",
  });
  expect(await tap(page.locator("#hw-collection a.hw-cta"))).toEqual({ primary_ux: "book_tiles", cta: "see_collection", ...book });
  expect(await tap(page.locator(".hw-closing a[href='/recipes']"))).toEqual({
    primary_ux: "closing",
    link_type: "internal",
    cta: "see_all_recipes",
    destination_kind: "recipes",
  });
  expect(
    (await recordedEvents(page)).filter((event) => /^story_(action_clicked|section_viewed)$/.test(event.event_name))
  ).toEqual([]);
});

test("[halloween] reading to the end sends section_viewed for each part, and twice for the story once its night is reached", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PAGE);
  await expect.poll(async () => (await recordedEvents(page)).some((event) => event.event_name === "story_view")).toBe(true);
  // Small steps, so every part passes the line the observer uses.
  // Each step waits two frames, so the browser has rendered the position and run its intersection checks: a fixed
  // pause was too short for WebKit under CI load, which then skipped a part as if it had never been on screen.
  for (let y = 0; ; y += 200) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    await page.evaluate(async (top) => {
      window.scrollTo(0, top);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, Math.min(y, height));
    await page.waitForTimeout(30);
    if (y >= height) break;
  }
  const tally = async () => {
    const counts: Record<string, number> = {};
    for (const event of await recordedEvents(page)) {
      if (event.event_name !== "section_viewed") continue;
      const ux = String(event.properties.primary_ux);
      counts[ux] = (counts[ux] ?? 0) + 1;
    }
    return counts;
  };
  await expect
    .poll(tally)
    .toEqual({ campaign_recipes: 1, book_card: 1, plan_strip: 1, story: 2, book_tiles: 1, closing: 1 });
});

test("[halloween] the before-and-after slider rests half and half, and the arrow keys or a tap move the line", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PAGE);
  const knob = page.getByRole("slider", { name: SLIDER }).first();
  // The whole photo in the middle of the screen, so the tap below lands on it.
  await page.locator(".hw-compare").first().evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect(knob).toHaveAttribute("aria-valuenow", "50");
  await knob.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(knob).toHaveAttribute("aria-valuenow", "40");

  // A tap on the photo moves the line there.
  const compare = page.locator(".hw-compare").first();
  const box = (await compare.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.8);
  const value = Number(await knob.getAttribute("aria-valuenow"));
  expect(value).toBeGreaterThan(20);
  expect(value).toBeLessThan(30);
});

test("[halloween] the first time a slider is seen it shows the whole everyday photo, then the whole Halloween one, then rests", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // Short enough that the first slider is not yet in view, so the sweep starts on the scroll below.
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto(PAGE);
  const knob = page.getByRole("slider", { name: SLIDER }).first();
  await knob.evaluate((element) => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    new MutationObserver(() => seen.push(element.getAttribute("aria-valuenow")!)).observe(element, { attributes: true, attributeFilter: ["aria-valuenow"] });
  });
  await page.locator(".hw-compare").first().evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect.poll(() => page.evaluate(() => (window as unknown as { seen: string[] }).seen.join(" ")), { timeout: 8000 }).toBe("100 0 50");
});
