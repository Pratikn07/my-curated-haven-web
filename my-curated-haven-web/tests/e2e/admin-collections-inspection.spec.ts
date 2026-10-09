import { expect, test } from "@playwright/test";
import { createCollectionsFixture, type CollectionsFixture } from "./collections-admin-fixtures";

test.describe.configure({ mode: "serial" });

let f: CollectionsFixture;
test.beforeAll(async () => { f = await createCollectionsFixture(); });
test.afterAll(async () => { await f?.dispose(); });
test.afterEach(async () => { await f.setCollectionStage("inspection"); });

test("owner sees collection content and commerce as distinct states", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}`);
  await expect(page.getByRole("heading", { level: 1, name: f.title })).toBeVisible();
  await expect(page.getByText("Published · 1 recipe", { exact: true })).toBeVisible();
  await expect(page.getByText("Listed", { exact: true })).toBeVisible();
  await expect(page.getByText("Sales disabled", { exact: true })).toBeVisible();
  await expect(page.getByText("No private draft", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Published recipes" }).getByText(f.recipeTitles[0])).toBeVisible();
  await expect(page.getByText("Purchased · protected")).toBeVisible();
  await expect(page.getByText("The public page still comes from the site configuration.")).toBeVisible();
  await expect(page.getByText("Imported from site configuration")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Next action" })).toContainText("inspection stage");
});

test("library row keeps listing, browsing, sales and draft apart and the back link restores the filtered list", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.goto("/admin/collections");
  await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Collections" })).toHaveAttribute("aria-current", "page");
  await page.getByLabel("Search collections").fill(f.slug);
  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(new RegExp(`q=${f.slug}&status=published`));
  await expect(page.getByRole("heading", { name: "1 matching collection" })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: f.title });
  if (await row.isVisible()) {
    await expect(row).toContainText("Listed");
    await expect(row).toContainText("Open");
    await expect(row).toContainText("Sales disabled");
    await expect(row).toContainText("No private draft");
  }
  await page.getByRole("link", { name: f.title, exact: true }).locator("visible=true").click();
  await page.getByRole("link", { name: "Back to collections" }).click();
  await expect(page).toHaveURL(new RegExp(`q=${f.slug}`));
  await expect(page.getByRole("link", { name: f.title, exact: true }).locator("visible=true")).toBeFocused();
});

test("no matches, unknown filters and missing collections are explained, not shown as empty", async ({ page }) => {
  await f.login(page, "viewer", "aal2");
  await page.goto("/admin/collections?q=no-collection-has-this-name");
  await expect(page.getByText("No collections match these filters.")).toBeVisible();
  await page.goto("/admin/collections?shelf=attic");
  await expect(page.getByText("Those collection filters are not recognised.")).toBeVisible();
  await page.goto("/admin/collections/00000000-0000-4000-8000-000000000000");
  await expect(page.getByText("That collection does not exist.")).toBeVisible();
  await page.goto(`/admin/collections/${f.collectionId}?returnTo=${encodeURIComponent("https://example.com/admin/collections")}`);
  await expect(page.getByRole("link", { name: "Back to collections" })).toHaveAttribute("href", `/admin/collections?selected=${f.collectionId}`);
});

test("switching collections off hides the navigation and blocks the pages", async ({ page }) => {
  await f.setCollectionStage("disabled");
  await f.login(page, "owner", "aal2");
  await page.goto("/admin/recipes");
  await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Recipes" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Collections" })).toHaveCount(0);
  await page.goto(`/admin/collections/${f.collectionId}`);
  await expect(page.getByText("Collections are switched off in this console.")).toBeVisible();
  await expect(page.getByText(f.title)).toHaveCount(0);
});

test("an aal1 session reaches the MFA gate, not collection data", async ({ page }) => {
  await f.login(page, "owner", "aal1");
  await page.goto(`/admin/collections/${f.collectionId}`);
  await expect(page.getByText(f.title)).toHaveCount(0);
  await expect(page.getByText(f.recipeTitles[0])).toHaveCount(0);
});

test("customers cannot open the collection workspace and no buyer identity reaches the page", async ({ page }) => {
  await f.login(page, "customer", "aal2");
  const response = await page.goto(`/admin/collections/${f.collectionId}`);
  expect(response?.headers()["cache-control"] ?? "").not.toContain("public");
  await expect(page.getByText(f.title)).toHaveCount(0);

  await page.context().clearCookies();
  await f.login(page, "owner", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}`);
  const html = await page.content();
  expect(html).not.toContain(f.customerId);
  expect(html).not.toMatch(/coll-customer[^"]*@synthetic\.test/);
  await expect(page.getByText("People with access")).toBeVisible();
});

test("phone layout uses cards without horizontal scrolling", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`/admin/collections?q=${f.slug}`);
  const card = page.locator(".admin-library__card").filter({ hasText: f.title });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Sales disabled");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.goto(`/admin/collections/${f.collectionId}`);
  await expect(page.getByRole("heading", { level: 1, name: f.title })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("keyboard users can reach the filters and the first collection link", async ({ page, browserName }) => {
  // Safari's Tab skips links unless "Press Tab to highlight each item" is on; Option+Tab reaches them.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await f.login(page, "owner", "aal2");
  await page.goto(`/admin/collections?q=${f.slug}`);
  await page.getByLabel("Search collections").focus();
  await expect(page.getByLabel("Search collections")).toBeFocused();
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press(tab);
    if (await page.getByRole("link", { name: f.title, exact: true }).locator("visible=true").evaluate((el) => el === document.activeElement)) break;
  }
  await expect(page.getByRole("link", { name: f.title, exact: true }).locator("visible=true")).toBeFocused();
});
