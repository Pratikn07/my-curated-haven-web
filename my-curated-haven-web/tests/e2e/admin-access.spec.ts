import { expect, test } from "@playwright/test";
import { createAdminFixture } from "./admin-fixtures";

test("signed-out admin redirects to sign-in with validated returnTo", async ({ page }) => {
  await page.goto("/admin/recipes");
  await expect(page).toHaveURL(/sign-in.*returnTo=%2Fadmin%2Frecipes/);
});

test("aal1 operator cannot receive private content", async ({ page }) => {
  const fixture = await createAdminFixture("mfa-boundary", ["owner"]);
  try {
    await fixture.login(page, "aal1");
    await page.goto(`/admin/recipes/${fixture.recipeId}`);
    await expect(page.getByRole("heading", { name: "Verify your admin access" })).toBeVisible();
    await expect(page.getByText("SENTINEL_PRIVATE_ADMIN_RECIPE")).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});

test("owner can manage team", async ({ page }) => {
  const owner = await createAdminFixture("team-owner", ["owner"]);
  const staff = await createAdminFixture("team-staff", ["viewer"]);
  try {
    await owner.login(page, "aal2");
    await page.goto("/admin/team");
    await page.getByLabel("Existing account email").fill(staff.email);
    await page.getByRole("button", { name: "Find account" }).click();
    await expect(page.getByText(staff.email, { exact: true })).toBeVisible();
  } finally {
    await staff.dispose();
    await owner.dispose();
  }
});
