import { expect, test, type Page } from "@playwright/test";

// Tracking plan PR 4 (docs/implementation/tracking/PLAN.md): before story_action_clicked, story_section_viewed and
// homepage_cta_clicked retire, every tap and section they record must also send cta_clicked or section_viewed with
// the same information. This spec taps each marked link and scrolls each page, and checks the pairs against the
// old-to-new table the 30 Nov comparison uses.

type RecordedEvent = { event_name: string; route_key?: string; properties: Record<string, unknown> };

function recordedEvents(page: Page): Promise<RecordedEvent[]> {
  return page.evaluate(() => {
    const provider = (
      window as unknown as { __mch_analytics_provider?: { getRecordedEvents?: () => RecordedEvent[] } }
    ).__mch_analytics_provider;
    return provider?.getRecordedEvents?.() ?? [];
  });
}

/** primary_ux for each story_placement, per page. */
const STORY_UX: Record<string, string> = {
  hero: "hero",
  recipes: "campaign_recipes",
  sticky: "sticky_bar",
  pack: "story_offer",
  collection: "story_offer",
  related: "related_shelf",
  closing: "closing",
};
const HALLOWEEN_UX: Record<string, string> = {
  card: "book_card",
  plan: "plan_strip",
  recipes: "campaign_recipes",
  collection: "book_tiles",
  closing: "closing",
  sticky: "sticky_bar",
};
/** cta for each story_action. A Halloween "collection" tap on the book card or the buy bar is get_book. */
const CTA: Record<string, string> = {
  recipe_jump: "see_recipes",
  campaign_recipe: "open_recipe",
  more_recipe: "open_recipe",
  pack: "see_pack",
  collection: "see_collection",
  recipes_index: "see_all_recipes",
  instagram: "instagram",
  home: "home",
  make_ahead_plan: "see_plan",
};
/** primary_ux for each story_section, per page. */
const STORY_SECTION_UX: Record<string, string> = {
  recipes: "campaign_recipes",
  story: "story",
  story_end: "story",
  pack: "story_offer",
  collection: "story_offer",
  related: "related_shelf",
  questions: "faq",
  closing: "closing",
};
const HALLOWEEN_SECTION_UX: Record<string, string> = {
  recipes: "campaign_recipes",
  plan: "plan_strip",
  story: "story",
  story_end: "story",
  collection: "book_tiles",
  closing: "closing",
};

/**
 * Taps every link the old click handler counts, in place (navigation held), and returns each tap's old and new event.
 * Links in the book's caption appear after a tile is picked, so the first tile is picked first when there is one.
 */
async function tapMarkedLinks(page: Page): Promise<{ old: Record<string, unknown>; next: Record<string, unknown> }[]> {
  await page.evaluate(() => window.addEventListener("click", (event) => event.preventDefault(), true));
  const tile = page.locator(".hw-book-tile").first();
  if (await tile.count()) await tile.evaluate((button) => (button as HTMLElement).click());
  const count = await page.evaluate(() => {
    const links = new Set<HTMLAnchorElement>();
    document.querySelectorAll<HTMLAnchorElement>("a[data-story-action], [data-story-action] a").forEach((link) => links.add(link));
    (window as unknown as { __pr4Links: HTMLAnchorElement[] }).__pr4Links = [...links];
    return links.size;
  });
  expect(count).toBeGreaterThan(0);

  const pairs: { old: Record<string, unknown>; next: Record<string, unknown> }[] = [];
  for (let index = 0; index < count; index += 1) {
    const before = (await recordedEvents(page)).length;
    await page.evaluate((at) => (window as unknown as { __pr4Links: HTMLAnchorElement[] }).__pr4Links[at].click(), index);
    let added: RecordedEvent[] = [];
    await expect
      .poll(async () => {
        added = (await recordedEvents(page)).slice(before);
        return added.map((event) => event.event_name).sort();
      })
      .toEqual(["cta_clicked", "story_action_clicked"]);
    pairs.push({
      old: added.find((event) => event.event_name === "story_action_clicked")!.properties,
      next: added.find((event) => event.event_name === "cta_clicked")!.properties,
    });
  }
  return pairs;
}

function expectSameTap(pair: { old: Record<string, unknown>; next: Record<string, unknown> }, ux: Record<string, string>, halloween: boolean) {
  const { old, next } = pair;
  const label = JSON.stringify(pair);
  const action = String(old.story_action);
  const placement = String(old.story_placement);
  expect(next.primary_ux, label).toBe(ux[placement]);
  const getBook = halloween && action === "collection" && (placement === "card" || placement === "sticky");
  expect(next.cta, label).toBe(getBook ? "get_book" : CTA[action]);
  // A Halloween recipe that is only in the book had no recipe_id, so the old event had no position; the new one has.
  if (old.recipe_position !== undefined || !halloween) expect(next.cta_position, label).toBe(old.recipe_position);
  if (old.recipe_id) expect(next.target_kind, label).toBe("recipe");
  if (action === "campaign_recipe" || action === "more_recipe") expect(next.target_kind, label).toBe("recipe");
  if (action === "pack" || action === "collection") expect(next.target_kind, label).toBe("collection");
}

/** Scrolls down the page in small steps, so every section passes the line the observers use. */
async function readToTheEnd(page: Page) {
  for (let y = 0; ; y += 250) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    await page.evaluate((top) => window.scrollTo(0, top), Math.min(y, height));
    await page.waitForTimeout(60);
    if (y >= height) break;
  }
  await page.waitForTimeout(300);
}

function tally(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

async function expectSameSections(page: Page, sectionUx: Record<string, string>, extraUx: string[] = []) {
  const events = await recordedEvents(page);
  const old = events.filter((event) => event.event_name === "story_section_viewed").map((event) => sectionUx[String(event.properties.story_section)]);
  const next = events
    .filter((event) => event.event_name === "section_viewed")
    .map((event) => String(event.properties.primary_ux))
    .filter((ux) => !extraUx.includes(ux));
  expect(old.length).toBeGreaterThan(0);
  expect(tally(next)).toEqual(tally(old));
}

for (const path of ["/stories/local-sample-frittata", "/stories/local-sample-breakfasts"]) {
  test(`[tracking-parity] ${path}: every story tap also sends cta_clicked with the same labels`, async ({ page }) => {
    await page.goto(path);
    for (const pair of await tapMarkedLinks(page)) expectSameTap(pair, STORY_UX, false);
  });

  test(`[tracking-parity] ${path}: every story section also sends section_viewed`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    await readToTheEnd(page);
    await expectSameSections(page, STORY_SECTION_UX);
  });
}

test("[tracking-parity] /halloween: every story tap also sends cta_clicked with the same labels", async ({ page }) => {
  await page.goto("/halloween");
  for (const pair of await tapMarkedLinks(page)) expectSameTap(pair, HALLOWEEN_UX, true);
});

test("[tracking-parity] /halloween: every story section also sends section_viewed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/halloween");
  await readToTheEnd(page);
  // The book card has no story section; it is new with section_viewed.
  await expectSameSections(page, HALLOWEEN_SECTION_UX, ["book_card"]);
});

test("[tracking-parity] the home hero's Browse recipes sends cta_clicked next to homepage_cta_clicked", async ({ page }) => {
  await page.goto("/");
  await page.locator("#house").getByRole("link", { name: "Browse recipes" }).click();
  // Both are sent on the tap; the recorder lives on through the client-side move to /recipes.
  await expect
    .poll(async () => (await recordedEvents(page)).filter((event) => /^(homepage_cta_clicked|cta_clicked)$/.test(event.event_name)).length)
    .toBe(2);
  const events = await recordedEvents(page);
  expect(events.find((event) => event.event_name === "homepage_cta_clicked")?.properties).toMatchObject({
    placement: "hero",
    destination: "recipes_index",
  });
  const click = events.find((event) => event.event_name === "cta_clicked");
  expect(click?.properties).toEqual({ primary_ux: "hero", link_type: "internal", cta: "browse_recipes", destination_kind: "recipes" });
  expect(click?.route_key).toBe("home");
});
