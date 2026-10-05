import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The collections showroom and collection pages. The three collections are
 * drafts in src/config/collections.ts, so they render locally and in CI but
 * never on production.
 */

/** The DOM is enough: waiting for every remote recipe photo makes a cold first run slow. */
const LOAD = { waitUntil: "domcontentloaded" } as const;

const COLLECTIONS = [
  { slug: "halloween", title: "Halloween", recipes: 8 },
  { slug: "meal-prep", title: "Meal Prep", recipes: 10 },
  { slug: "protein-packs", title: "Protein Packs", recipes: 10 },
];

test("the showroom shows each collection as a chapter with its price and a way in", async ({ page }) => {
  const response = await page.goto("/collections", LOAD);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Little cookbooks for the moments that fill the week.");

  for (const collection of COLLECTIONS) {
    const chapter = page.locator(`#${collection.slug}`);
    await expect(chapter.getByRole("heading", { level: 2, name: collection.title })).toBeVisible();
    await expect(chapter.getByText(`${collection.recipes} recipes`, { exact: true })).toBeVisible();
    await expect(chapter.getByRole("link", { name: `Explore ${collection.title}` })).toHaveAttribute(
      "href",
      `/collections/${collection.slug}`
    );
  }

  // The shelf rail jumps to each chapter.
  await expect(page.getByRole("navigation", { name: "Jump to a collection" }).getByRole("link")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /Try a free recipe/ }).first()).toHaveAttribute("href", "/recipes");
});

test("the header offers Collections and Free Recipes", async ({ page }) => {
  await page.goto("/", LOAD);
  const header = page.locator("header").first();
  const menu = header.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
  await expect(header.getByRole("link", { name: "Collections" }).first()).toHaveAttribute("href", "/collections");
  await expect(header.getByRole("link", { name: "Free Recipes" }).first()).toHaveAttribute("href", "/recipes");
});

test("a collection page lists every recipe with its allergens and is honest about buying", async ({ page }) => {
  const response = await page.goto("/collections/meal-prep", LOAD);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Meal Prep");
  await expect(page.locator(".cl-row")).toHaveCount(10);
  await expect(page.getByText("Contains wheat, milk, egg").first()).toBeVisible();
  await expect(page.getByText("One-time purchase")).toBeVisible();
  await expect(page.getByText(/all sales are final/i).first()).toBeVisible();
  // No live offer for a draft: no checkout control, a plain statement instead.
  await expect(page.getByRole("button", { name: /Buy Collection/ })).toHaveCount(0);
  await expect(page.getByText("Opening soon")).toBeVisible();
  await expect(page.getByRole("link", { name: "Next on the shelf Protein Packs" })).toBeVisible();
});

test("an unknown collection is a 404", async ({ page }) => {
  const response = await page.goto("/collections/not-a-collection", LOAD);
  expect(response?.status()).toBe(404);
});

test("collections pages fit a 320px screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ["/collections", "/collections/protein-packs"]) {
    await page.goto(path, LOAD);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});

test("with reduced motion every recipe card rests in its fanned place", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/collections", LOAD);
  const card = page.locator("#halloween .cl-fan-card").first();
  const transform = await card.evaluate((element) => getComputedStyle(element).transform);
  // The first card leans left: a rotation, not the identity matrix of the stacked state.
  expect(transform).not.toBe("none");
  expect(transform).not.toBe("matrix(1, 0, 0, 1, 0, 0)");
});

test("collections pages have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/collections", "/collections/halloween"]) {
    await page.goto(path, LOAD);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
    expect(serious.map((violation) => violation.id), path).toEqual([]);
  }
});
