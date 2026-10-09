import { expect, test } from "@playwright/test";
import { createAdminFixture } from "./admin-fixtures";

test.describe.configure({ mode: "serial" });

test("library detail back preserves query", async ({ page }) => {
  const fixture = await createAdminFixture("inspection-soup", ["owner"]);
  try {
    const fixtureTitle = (await fixture.active()).catalog.title;
    await fixture.login(page, "aal2");
    await page.goto(`/admin/recipes?view=all&page=1&q=${encodeURIComponent(fixture.recipeSlug)}`);
    await page.getByRole("link", { name: fixtureTitle, exact: true }).click();
    await expect(page.getByRole("heading", { name: "Usage and access" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save recipe" })).toHaveCount(0);
    await page.getByRole("link", { name: "Back to recipes" }).click();
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(fixture.recipeSlug)}`));
    await expect(page.getByRole("link", { name: fixtureTitle, exact: true })).toBeFocused();
  } finally {
    await fixture.dispose();
  }
});

test("inspection separates live and working state with a visible next action on a narrow screen", async ({ page }) => {
  const fixture = await createAdminFixture("inspection-frame", ["owner"]);
  try {
    const fixtureTitle = (await fixture.active()).catalog.title;
    await fixture.login(page, "aal2");
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`/admin/recipes/${fixture.recipeId}`);
    await expect(page.getByRole("heading", { level: 1, name: fixtureTitle })).toBeVisible();
    await expect(page.getByText("Live", { exact: true })).toBeVisible();
    await expect(page.getByText("Working revision", { exact: true })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Next action" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  } finally {
    await fixture.dispose();
  }
});

test("library search and filters keep a shareable route and inspection explains usage", async ({ page }) => {
  const fixture = await createAdminFixture("library-controls", ["owner"]);
  try {
    const fixtureTitle = (await fixture.active()).catalog.title;
    await fixture.login(page, "aal2");
    await page.goto("/admin/recipes");
    await page.getByLabel("Search recipes").fill(fixture.recipeSlug);
    await page.getByLabel("Publication").selectOption("draft");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/q=.*&publication=draft/);
    await expect(page.locator(".admin-library__table th").filter({ hasText: "Review state" })).toHaveCount(1);
    if (await page.locator(".admin-library__cards").isVisible()) {
      await expect(page.locator(".admin-library__card dt").filter({ hasText: "Review" })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: fixtureTitle, exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: fixtureTitle, exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Free recipe slots" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Collection releases" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Campaign references" })).toBeVisible();
    await expect(page.getByText("No free recipe slots reference this recipe.")).toBeVisible();
  } finally {
    await fixture.dispose();
  }
});

test("inspection return link rejects an external returnTo", async ({ page }) => {
  const fixture = await createAdminFixture("return-guard", ["owner"]);
  try {
    await fixture.login(page, "aal2");
    await page.goto(`/admin/recipes/${fixture.recipeId}?returnTo=${encodeURIComponent("https://example.com/collect")}`);
    await expect(page.getByRole("link", { name: "Back to recipes" })).toHaveAttribute(
      "href",
      `/admin/recipes?selected=${fixture.recipeId}`
    );
  } finally {
    await fixture.dispose();
  }
});
