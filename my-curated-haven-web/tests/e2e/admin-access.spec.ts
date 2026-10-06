import { expect, test } from "@playwright/test";
import { createAdminFixture } from "./admin-fixtures";

test.describe.configure({ mode: "serial" });

test("signed-out admin redirects to sign-in with validated returnTo", async ({ page, request }) => {
  const redirect = await request.get("/admin/recipes", { maxRedirects: 0 });
  expect(redirect.status()).toBe(307);
  expect(redirect.headers()["location"]).toContain("/sign-in?returnTo=%2Fadmin%2Frecipes");
  expect(redirect.headers()["cache-control"]).toContain("no-store");
  expect(redirect.headers()["x-robots-tag"]).toContain("noindex");
  await page.goto("/admin/recipes");
  await expect(page).toHaveURL(/sign-in.*returnTo=%2Fadmin%2Frecipes/);
});

test("aal1 operator cannot receive private content", async ({ page }) => {
  const fixture = await createAdminFixture("mfa-boundary", ["owner"]);
  try {
    await fixture.login(page, "aal1");
    await page.goto(`/admin/recipes/${fixture.recipeId}`);
    await expect(page.getByRole("heading", { name: "Verify your admin access" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Usage and access" })).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});

test("owner can look up and assign a staff role", async ({ page }) => {
  const owner = await createAdminFixture("team-owner", ["owner"]);
  const staff = await createAdminFixture("team-staff", ["viewer"]);
  try {
    await owner.login(page, "aal2");
    await page.goto("/admin/team");
    await page.getByLabel("Existing account email").fill(staff.email);
    await page.getByRole("button", { name: "Find account" }).click();
    await expect(page.getByText(staff.email, { exact: true })).toBeVisible();
    await page.getByLabel("Editor", { exact: true }).check();
    await page.getByLabel("Reason").fill("Help maintain recipe drafts");
    await page.getByRole("button", { name: "Confirm role assignment" }).click();
    await expect(page.getByRole("status")).toContainText("Roles assigned");
  } finally {
    await staff.dispose();
    await owner.dispose();
  }
});

test("viewer cannot manage the team", async ({ page }) => {
  const owner = await createAdminFixture("team-guard-owner", ["owner"]);
  const staff = await createAdminFixture("team-guard-staff", ["viewer"]);
  try {
    await staff.login(page, "aal2");
    await page.goto("/admin/team");
    await expect(page.getByText("Team management requires the owner role.")).toBeVisible();
  } finally {
    await staff.dispose();
    await owner.dispose();
  }
});
