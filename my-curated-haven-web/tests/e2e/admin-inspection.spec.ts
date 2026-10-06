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
