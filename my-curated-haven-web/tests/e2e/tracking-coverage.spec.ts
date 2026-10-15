import { expect, test, type Page } from "@playwright/test";

// Tracking plan PR 2 (docs/implementation/tracking/PLAN.md): every visible link and button on the public pages sits
// inside a labelled module (data-track-ux), so cta_clicked says which part of the page a tap came from.
// Controls marked data-track-ignore (the skip link) are exempt.

const PAGES: [path: string, status?: number][] = [
  ["/"],
  ["/recipes"],
  ["/recipes/synth-free-oat-bake"], // free
  ["/recipes/synth-paid-golden-soup"], // locked
  ["/collections"],
  ["/collections/comfort-haven-collection"],
  ["/collections/halloween"],
  ["/collections/halloween/plan"],
  ["/collections/series/breakfast"],
  ["/halloween"],
  ["/stories/local-sample-breakfasts"],
  ["/sign-in"],
  ["/checkout/cancel"],
  ["/support"],
  ["/about"],
  ["/privacy"],
  ["/terms"],
  ["/no-such-page", 404],
];

/** Visible links and buttons outside any data-track-ux or data-track-ignore, described for the failure message. */
function unlabelledControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const missing: string[] = [];
    for (const element of Array.from(document.querySelectorAll<HTMLElement>("a, button"))) {
      if (element.closest("[data-track-ux], [data-track-ignore]")) continue;
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (!element.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true })) continue;
      const name = (element.getAttribute("aria-label") || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
      missing.push(`<${element.tagName.toLowerCase()}> "${name}" ${element.getAttribute("href") ?? ""}`.trim());
    }
    return missing;
  });
}

/**
 * The page is hydrated (analytics has started, which happens in an effect) and its links and buttons have stopped
 * changing. Not network-idle: /collections and the series pages never reach it in CI.
 */
async function settled(page: Page): Promise<void> {
  await page.waitForLoadState("load");
  await page.waitForFunction(() => Boolean((window as unknown as { __mch_analytics_provider?: unknown }).__mch_analytics_provider));
  let previous = -1;
  await expect
    .poll(
      async () => {
        const count = await page.locator("a, button").count();
        const steady = count === previous;
        previous = count;
        return steady;
      },
      { intervals: [400], timeout: 15_000 }
    )
    .toBe(true);
}

for (const [path, status = 200] of PAGES) {
  test(`every visible link and button on ${path} is labelled`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status(), `${path} renders`).toBe(status);
    await settled(page);
    expect(await unlabelledControls(page)).toEqual([]);

    // The phone menu's links only exist once it opens.
    const menu = page.getByRole("button", { name: "Open menu" });
    if (await menu.isVisible()) {
      await menu.click();
      await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
      expect(await unlabelledControls(page)).toEqual([]);
    }
  });
}

test("the controls inside an open room and the filter dialog are labelled", async ({ page }) => {
  await page.goto("/");
  await page.locator(".house-tags").getByRole("link", { name: /Kitchen/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await unlabelledControls(page)).toEqual([]);

  await page.goto("/recipes");
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByRole("dialog", { name: "Filter Recipes" })).toBeVisible();
  expect(await unlabelledControls(page)).toEqual([]);
});
