import { expect, test } from "@playwright/test";
import { createAdminFixture } from "./admin-fixtures";
import { setCollectionStage } from "./collections-admin-fixtures";

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
    await expect(page.getByRole("status")).toContainText(`Found ${staff.email}`);
    await page.getByRole("checkbox", { name: /^Editor\b/ }).check();
    await page.getByLabel("Reason").fill("Help maintain recipe drafts");
    await page.getByRole("button", { name: "Confirm role assignment" }).click();
    await expect(page.getByRole("status")).toContainText("Roles assigned");
    await expect(page.getByRole("heading", { name: "Current team" })).toBeVisible();
    const staffRow = page.getByRole("row", { name: new RegExp(staff.email) });
    await expect(staffRow).toContainText("Editor");
    await staffRow.getByRole("button", { name: "Revoke access" }).click();
    await page.getByLabel("Reason for revocation").fill("Access no longer needed");
    await page.getByRole("button", { name: "Confirm revocation" }).click();
    await expect(page.getByRole("status")).toContainText("Access revoked");
    await expect(staffRow).toContainText("Revoked");
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

test("admin navigation exposes only permitted destinations and keeps actions visible at 320px", async ({ page }) => {
  const owner = await createAdminFixture("shell-owner", ["owner"]);
  const viewer = await createAdminFixture("shell-viewer", ["viewer"]);
  const collectionStage = await setCollectionStage("disabled");
  try {
    await owner.login(page, "aal2");
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/admin/recipes");
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link", { name: "Recipes" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Team" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Collections" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Public site" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#admin-main");
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Primary" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    await viewer.login(page, "aal2");
    await page.goto("/admin/recipes");
    const viewerNav = page.getByRole("navigation", { name: "Admin" });
    await expect(viewerNav.getByRole("link", { name: "Recipes" })).toHaveAttribute("aria-current", "page");
    await expect(viewerNav.getByRole("link", { name: "Team" })).toHaveCount(0);

    // Collections appears only while its own workspace stage is switched on.
    await setCollectionStage("inspection");
    await page.goto("/admin/recipes");
    await expect(viewerNav.getByRole("link", { name: "Collections" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  } finally {
    await setCollectionStage(collectionStage);
    await viewer.dispose();
    await owner.dispose();
  }
});
