import { expect, test, type Page } from "@playwright/test";

async function overflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

test.describe("Phase 6 Free Recipe Experience", () => {
  test("public listing /recipes loads and displays free recipes with attribution", async ({
    page,
  }) => {
    const response = await page.goto("/recipes");
    expect(response?.status()).toBe(200);

    // Attribution and Header
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Simple Toddler Recipes"
    );
    await expect(
      page.locator("#main").getByText("Recipes by Tiny Soho, inside My Curated Haven.")
    ).toBeVisible();

    // Recipe Cards
    const cards = page.locator("article");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // First card checks
    const firstCard = cards.first();
    const titleLink = firstCard.locator("h3 a");
    await expect(titleLink).toBeVisible();
    const href = await titleLink.getAttribute("href");
    expect(href).toMatch(/^\/recipes\/[a-z0-9-]+$/);
    await expect(firstCard.getByText(/Free recipe/i)).toBeVisible();
  });

  test("search input updates URL state and filters recipes", async ({ page }) => {
    await page.goto("/recipes");

    const searchInput = page.getByPlaceholder(/search recipes/i);
    await searchInput.fill("Frittata");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/q=Frittata/);
    const visibleCards = page.locator("article");
    const count = await visibleCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Chip appears and can be removed
    const queryChip = page.getByRole("button", { name: /Remove search term/i });
    await expect(queryChip).toBeVisible();
    await queryChip.click();

    await expect(page).not.toHaveURL(/q=Frittata/);
  });

  test("mobile filter dialog opens, updates draft state, and applies", async ({
    page,
  }) => {
    await page.goto("/recipes");

    const filterButton = page.getByRole("button", { name: /^Filters/i });
    await filterButton.click();

    const dialog = page.locator("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Filter Recipes" })).toBeVisible();

    // Select a meal type
    const breakfastLabel = dialog.locator("label").filter({ hasText: "Breakfast" });
    if (await breakfastLabel.isVisible()) {
      await breakfastLabel.click();
    }

    // Apply filters
    await dialog.getByRole("button", { name: "Apply Filters" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/meal=Breakfast/);

    // Clear all action
    const clearAll = page.getByRole("button", { name: "Clear all" });
    await expect(clearAll).toBeVisible();
    await clearAll.click();
    await expect(page).not.toHaveURL(/meal=Breakfast/);
  });

  test("no matches state displays helpful recovery UI", async ({ page }) => {
    await page.goto("/recipes?q=nonexistentxyz12345");
    await expect(page.getByRole("heading", { level: 2 })).toContainText(
      "No matching recipes found"
    );
    const clearLink = page.getByRole("link", { name: "Clear all filters" });
    await expect(clearLink).toBeVisible();
    await clearLink.click();
    await expect(page).toHaveURL(/\/recipes$/);
  });

  test("recipe detail page renders complete recipe structure", async ({ page }) => {
    // Go to recipes and click first recipe card
    await page.goto("/recipes");
    const firstTitleLink = page.locator("article h3 a").first();
    const recipeTitle = (await firstTitleLink.textContent())?.trim() ?? "";
    const href = await firstTitleLink.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);

    // Breadcrumb
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByRole("link", { name: "Recipes" })).toBeVisible();

    // Attribution & Title
    await expect(page.getByRole("heading", { level: 1 })).toContainText(recipeTitle);
    await expect(
      page.locator("header").getByText("Recipes by Tiny Soho, inside My Curated Haven.")
    ).toBeVisible();

    // Meta stats & Actions
    await expect(page.getByText("Free Toddler Recipe", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /print/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Jump to recipe/i })).toBeVisible();

    // Ingredients
    const ingredientsSection = page.locator("section[aria-labelledby='ingredients-heading']");
    await expect(ingredientsSection).toBeVisible();
    const ingredientsList = ingredientsSection.locator("li");
    expect(await ingredientsList.count()).toBeGreaterThan(0);

    // Method / Instructions
    const methodSection = page.locator("section[aria-labelledby='instructions-heading']");
    await expect(methodSection).toBeVisible();
    const stepList = methodSection.locator("li");
    expect(await stepList.count()).toBeGreaterThan(0);

    // Allergens
    const allergensSection = page.locator("section[aria-labelledby='allergens-heading']");
    await expect(allergensSection).toBeVisible();

    // Schema.org structured data
    const jsonLdScript = page.locator('script[type="application/ld+json"]');
    await expect(jsonLdScript).toBeAttached();
    const jsonLdContent = await jsonLdScript.textContent();
    expect(jsonLdContent).toBeTruthy();
    const parsed = JSON.parse(jsonLdContent!);
    expect(parsed["@type"]).toBe("Recipe");
    expect(parsed.name).toBe(recipeTitle);
    expect(parsed.recipeIngredient.length).toBeGreaterThan(0);
    expect(parsed.recipeInstructions.length).toBeGreaterThan(0);
  });

  test("unentitled, draft, or invalid recipe slugs return not-found", async ({
    page,
  }) => {
    // Non-existent slug
    const nonexistentRes = await page.goto("/recipes/definitely-not-a-real-recipe");
    expect(nonexistentRes?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /not available|not found/i
    );

    // Draft slug
    const draftRes = await page.goto("/recipes/synth-draft-warm-salad");
    expect(draftRes?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /not available|not found/i
    );

    // Paid slug without entitlement
    const paidRes = await page.goto("/recipes/synth-paid-golden-soup");
    expect(paidRes?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /not available|not found/i
    );
  });

  test("mobile viewport (320px) has zero horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });

    // 1. Check listing page
    await page.goto("/recipes");
    expect(await overflow(page)).toBeLessThanOrEqual(1);

    // 2. Check detail page
    const firstLink = page.locator("article h3 a").first();
    const href = await firstLink.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    await page.waitForLoadState("domcontentloaded");
    expect(await overflow(page)).toBeLessThanOrEqual(1);
  });
});
