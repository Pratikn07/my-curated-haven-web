import { expect, test } from "@playwright/test";
import { createAdminFixture } from "./admin-fixtures";

test("library detail back preserves query", async ({ page }) => {
  const fixture = await createAdminFixture("inspection-soup", ["owner"]);
  try {
    const fixtureTitle = (await fixture.active()).catalog.title as string;
    await fixture.login(page, "aal2");
    await page.goto("/admin/recipes?view=published&page=1&q=inspection-soup");
    await page.getByRole("link", { name: fixtureTitle, exact: true }).click();
    await expect(page.getByRole("heading", { name: "Usage and access" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save recipe" })).toHaveCount(0);
    await page.getByRole("link", { name: "Back to recipes" }).click();
    await expect(page).toHaveURL(/view=published.*page=1.*q=inspection-soup/);
  } finally {
    await fixture.dispose();
  }
});
