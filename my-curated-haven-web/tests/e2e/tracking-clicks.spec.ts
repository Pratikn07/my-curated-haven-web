import { expect, test, type Page } from "@playwright/test";

// Tracking plan PR 2 (docs/implementation/tracking/PLAN.md): what a parent's tap, scroll, time on the page and a
// sight of an offer now record. Events are read from the in-memory recorder (no PostHog key in tests).

const BOOK = "comfort-haven-collection";

type RecordedEvent = {
  event_name: string;
  route_key?: string;
  content_slug?: string;
  access_state?: string;
  properties: Record<string, unknown>;
};

function recordedEvents(page: Page): Promise<RecordedEvent[]> {
  return page.evaluate(() => {
    const provider = (
      window as unknown as { __mch_analytics_provider?: { getRecordedEvents?: () => RecordedEvent[] } }
    ).__mch_analytics_provider;
    return provider?.getRecordedEvents?.() ?? [];
  });
}

async function eventsNamed(page: Page, name: string): Promise<RecordedEvent[]> {
  return (await recordedEvents(page)).filter((event) => event.event_name === name);
}

async function waitForEvent(page: Page, match: (event: RecordedEvent) => boolean): Promise<RecordedEvent> {
  let found: RecordedEvent | undefined;
  await expect
    .poll(async () => {
      found = (await recordedEvents(page)).find(match);
      return Boolean(found);
    })
    .toBe(true);
  return found as RecordedEvent;
}

/** Keeps the page in place when a plain link is tapped, so the recorder (in this page) can still be read. */
async function holdNavigation(page: Page): Promise<void> {
  await page.evaluate(() => window.addEventListener("click", (event) => event.preventDefault(), true));
}

const pageView = (route: string) => (event: RecordedEvent) => event.event_name === "page_view" && event.route_key === route;

test.describe("labelled clicks", () => {
  test("the header Recipes link records header_nav, its label and where it goes", async ({ page, isMobile }) => {
    test.skip(isMobile, "the header links sit in the menu on phones (next test)");
    await page.goto("/");
    await waitForEvent(page, pageView("home"));
    await holdNavigation(page);
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Recipes", exact: true }).click();

    const click = await waitForEvent(page, (event) => event.event_name === "cta_clicked");
    expect(click.properties).toEqual({
      primary_ux: "header_nav",
      link_type: "internal",
      cta: "recipes",
      destination_kind: "recipes",
    });
    // The tap is counted on the page it happened on.
    expect(click.route_key).toBe("home");
  });

  test("on a phone, the menu and its links record mobile_nav", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone layout only");
    await page.goto("/");
    await waitForEvent(page, pageView("home"));
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.locator("[data-track-ux='mobile_nav']").getByRole("link", { name: "Recipes", exact: true }).click();
    await expect(page).toHaveURL(/\/recipes$/);

    const clicks = await eventsNamed(page, "cta_clicked");
    expect(clicks.map((event) => event.properties)).toEqual([
      { primary_ux: "mobile_nav", link_type: "action", cta: "menu", destination_kind: "none" },
      { primary_ux: "mobile_nav", link_type: "internal", cta: "recipes", destination_kind: "recipes" },
    ]);
  });

  test("a recipe card records its slot in the grid and the recipe it opens", async ({ page }) => {
    // The home grid shows only the owner's approved recipes, which the local seed doesn't have; /recipes uses
    // the same card and the same recipe_grid label.
    await page.goto("/recipes");
    await waitForEvent(page, pageView("recipes"));
    const second = page.locator("[data-track-ux='recipe_grid'] article").nth(1);
    const href = await second.getByRole("heading").getByRole("link").getAttribute("href");
    await holdNavigation(page);
    await second.getByRole("heading").getByRole("link").click();

    const click = await waitForEvent(page, (event) => event.event_name === "cta_clicked");
    expect(click.properties).toEqual({
      primary_ux: "recipe_grid",
      link_type: "internal",
      cta: "open_recipe",
      cta_position: 2,
      destination_kind: "recipe_detail",
      target_kind: "recipe",
      target_slug: href?.replace("/recipes/", ""),
    });
  });

  test("Buy records the buy box tap with checkout as its destination, then checkout_clicked", async ({ page }) => {
    await page.route("**/api/checkout", (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    await page.goto(`/collections/${BOOK}`);
    await waitForEvent(page, pageView("collection_detail"));
    await page.getByRole("button", { name: /Buy now — \$15\.00/i }).click();
    await waitForEvent(page, (event) => event.event_name === "checkout_clicked");

    const names = (await recordedEvents(page)).map((event) => event.event_name).filter((name) => name.includes("click"));
    expect(names).toEqual(["cta_clicked", "checkout_clicked"]);
    const [click] = await eventsNamed(page, "cta_clicked");
    expect(click.properties).toEqual({ primary_ux: "buy_box", link_type: "action", cta: "buy", destination_kind: "checkout" });
    expect(click).toMatchObject({ content_slug: BOOK, access_state: "locked" });
  });

  test("the Halloween phone buy bar records sticky_bar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto("/halloween");
    await waitForEvent(page, pageView("halloween"));
    const dock = page.locator(".hw-dock");
    await page.locator("#hw-walk").scrollIntoViewIfNeeded();
    await expect(dock).toHaveAttribute("data-on", "");
    await holdNavigation(page);
    await dock.getByRole("link").click();

    const click = await waitForEvent(page, (event) => event.event_name === "cta_clicked");
    expect(click.properties).toEqual({
      primary_ux: "sticky_bar",
      link_type: "internal",
      cta: "get_book",
      destination_kind: "collection_detail",
      target_kind: "collection",
      target_slug: "halloween",
    });
    expect(click).toMatchObject({ route_key: "halloween", content_slug: "halloween" });
  });

  test("an email link records only its kind, never the address", async ({ page }) => {
    await page.goto("/support");
    await waitForEvent(page, pageView("support"));
    await holdNavigation(page);
    await page.getByRole("link", { name: "Email support" }).click();
    const click = await waitForEvent(page, (event) => event.event_name === "cta_clicked");
    expect(click.properties).toEqual({ primary_ux: "support", link_type: "external", cta: "email_button", destination_kind: "email" });
    expect(JSON.stringify(click)).not.toContain("@");
  });

  test("an unlabelled control reports unlabelled, and the skip link is not tracked", async ({ page }) => {
    await page.goto("/about");
    await waitForEvent(page, pageView("about"));
    await page.locator(".skip-link").dispatchEvent("click");
    await page.evaluate(() => {
      const button = document.createElement("button");
      button.textContent = "Stray";
      button.id = "stray";
      document.body.append(button);
    });
    await page.locator("#stray").click();

    const click = await waitForEvent(page, (event) => event.event_name === "cta_clicked");
    expect(click.properties).toEqual({ primary_ux: "unlabelled", link_type: "action", destination_kind: "none" });
    expect(await eventsNamed(page, "cta_clicked")).toHaveLength(1);
  });
});

test.describe("page context", () => {
  test("recipe and collection pages say what the visitor can open, and it never carries to the next page", async ({ page }) => {
    await page.goto("/recipes/synth-free-oat-bake");
    const free = await waitForEvent(page, pageView("recipe_detail"));
    expect(free).toMatchObject({ content_slug: "synth-free-oat-bake", access_state: "free" });

    await page.goto("/recipes/synth-paid-golden-soup");
    const locked = await waitForEvent(page, pageView("recipe_detail"));
    expect(locked).toMatchObject({ content_slug: "synth-paid-golden-soup", access_state: "locked" });

    await page.goto("/collections/halloween/plan");
    const plan = await waitForEvent(page, pageView("collection_plan"));
    expect(plan).toMatchObject({ content_slug: "halloween", access_state: "preview" });

    await page.goto(`/collections/${BOOK}`);
    const book = await waitForEvent(page, pageView("collection_detail"));
    expect(book).toMatchObject({ content_slug: BOOK, access_state: "locked" });

    // In-app navigation keeps the same recorder: the next page has neither the slug nor the access state.
    await page.locator("[data-track-ux='breadcrumb']").getByRole("link", { name: "Collections" }).click();
    const shelf = await waitForEvent(page, pageView("collections"));
    expect(shelf.content_slug).toBeUndefined();
    expect(shelf.access_state).toBeUndefined();
  });
});

test.describe("milestones", () => {
  test("scrolling to the bottom sends each depth once, in order", async ({ page }) => {
    await page.goto("/halloween");
    await waitForEvent(page, pageView("halloween"));
    for (let step = 0; step < 60; step += 1) {
      const atBottom = await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.8);
        return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      });
      await page.waitForTimeout(50);
      if (atBottom) break;
    }
    await waitForEvent(page, (event) => event.event_name === "page_scroll_reached" && event.properties.depth === 100);
    // Back up and down again: nothing more.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);

    const depths = (await eventsNamed(page, "page_scroll_reached")).map((event) => event.properties.depth);
    expect(depths).toEqual([25, 50, 75, 100]);
  });

  test("a jump to the end sends the skipped depths on the way", async ({ page }) => {
    await page.goto("/recipes");
    await waitForEvent(page, pageView("recipes"));
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await waitForEvent(page, (event) => event.event_name === "page_scroll_reached" && event.properties.depth === 100);
    const depths = (await eventsNamed(page, "page_scroll_reached")).map((event) => event.properties.depth);
    expect(depths).toEqual([25, 50, 75, 100]);
  });

  test("visible time sends 15, 30 and 60 seconds once each, and a hidden tab doesn't count", async ({ page }) => {
    await page.clock.install();
    await page.goto("/about");
    await waitForEvent(page, pageView("about"));
    const seconds = async () => (await eventsNamed(page, "page_time_reached")).map((event) => event.properties.seconds);

    await page.clock.runFor(16_000);
    expect(await seconds()).toEqual([15]);

    // The parent switches apps for a minute: that time is not reading time.
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.clock.runFor(60_000);
    expect(await seconds()).toEqual([15]);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.clock.runFor(15_000);
    expect(await seconds()).toEqual([15, 30]);
    await page.clock.runFor(31_000);
    expect(await seconds()).toEqual([15, 30, 60]);
    await page.clock.runFor(120_000);
    expect(await seconds()).toEqual([15, 30, 60]);
    for (const event of await eventsNamed(page, "page_time_reached")) expect(event.route_key).toBe("about");
  });
});

test.describe("section and offer views", () => {
  test("the buy box sends offer_viewed once per page view, with the book, ownership and price", async ({ page }) => {
    await page.goto(`/collections/${BOOK}`);
    await page.locator("#buy").scrollIntoViewIfNeeded();
    const offer = await waitForEvent(page, (event) => event.event_name === "offer_viewed" && event.properties.surface === "buy_box");
    expect(offer.properties).toEqual({
      surface: "buy_box",
      collection_slug: BOOK,
      ownership_state: "unauthenticated",
      price_minor: 1500,
      currency: "usd",
    });
    expect(offer).toMatchObject({ route_key: "collection_detail", content_slug: BOOK, access_state: "locked" });

    // Away and back on the same page: still one.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    await page.locator("#buy").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const buyBox = async () =>
      (await eventsNamed(page, "offer_viewed")).filter((event) => event.properties.surface === "buy_box").length;
    expect(await buyBox()).toBe(1);

    // A new page view counts again.
    await page.locator("[data-track-ux='breadcrumb']").getByRole("link", { name: "Collections" }).click();
    await waitForEvent(page, pageView("collections"));
    await page.goBack();
    await expect
      .poll(async () => (await recordedEvents(page)).filter(pageView("collection_detail")).length)
      .toBe(2);
    await page.locator("#buy").scrollIntoViewIfNeeded();
    await expect.poll(buyBox).toBe(2);
  });

  test("the phone buy bar sends offer_viewed for sticky_bar once it slides in", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto(`/collections/${BOOK}`);
    await waitForEvent(page, pageView("collection_detail"));
    expect((await eventsNamed(page, "offer_viewed")).filter((event) => event.properties.surface === "sticky_bar")).toHaveLength(0);

    // Just past the buy box, where the bar slides in (it hides again at the next book).
    await page.evaluate(() => {
      const buy = document.querySelector("#buy") as HTMLElement;
      window.scrollTo(0, buy.getBoundingClientRect().bottom + window.scrollY + 10);
    });
    await expect(page.locator(".cl-dock")).toHaveAttribute("data-on", "");
    const offer = await waitForEvent(page, (event) => event.event_name === "offer_viewed" && event.properties.surface === "sticky_bar");
    expect(offer.properties).toMatchObject({ collection_slug: BOOK, price_minor: 1500 });
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    expect((await eventsNamed(page, "offer_viewed")).filter((event) => event.properties.surface === "sticky_bar")).toHaveLength(1);
  });

  test("a marked section sends section_viewed once, with its module's label", async ({ page }) => {
    await page.goto("/halloween");
    await waitForEvent(page, pageView("halloween"));
    await page.locator("[data-track-ux='closing']").scrollIntoViewIfNeeded();
    await waitForEvent(page, (event) => event.event_name === "section_viewed" && event.properties.primary_ux === "closing");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator("[data-track-ux='closing']").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const closing = (await eventsNamed(page, "section_viewed")).filter((event) => event.properties.primary_ux === "closing");
    expect(closing).toHaveLength(1);
  });
});
