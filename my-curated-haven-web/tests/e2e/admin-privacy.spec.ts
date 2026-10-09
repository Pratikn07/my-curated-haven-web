import { expect, test, type Page } from "@playwright/test";
import { createAdminFixture } from "./admin-fixtures";
import { createCollectionsFixture } from "./collections-admin-fixtures";

test.describe.configure({ mode: "serial" });

const SINK_PREFIX = "http://127.0.0.1:54349/";

type SinkHit = { url: string; body: string };

async function watchSink(page: Page): Promise<SinkHit[]> {
  const hits: SinkHit[] = [];
  await page.route("**/*", (route) => {
    const request = route.request();
    const url = request.url();
    if (url.startsWith(SINK_PREFIX)) {
      hits.push({ url, body: request.postData() ?? "" });
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    } else {
      route.continue();
    }
  });
  return hits;
}

function adminIdentifiers(hits: SinkHit[]): SinkHit[] {
  return hits.filter(
    (hit) =>
      hit.url.toLowerCase().includes("admin") ||
      hit.body.toLowerCase().includes("admin") ||
      hit.body.includes("SENTINEL")
  );
}

test("public pages capture through the installed SDK (positive control)", async ({ page }) => {
  const hits = await watchSink(page);
  await page.goto("/");
  await page.waitForTimeout(1500);
  expect(hits.length).toBeGreaterThan(0);
});

test("direct admin entry leaks no admin identifiers to the SDK sink", async ({ page }) => {
  const hits = await watchSink(page);
  await page.goto("/admin/recipes");
  await expect(page).toHaveURL(/sign-in/);
  await page.waitForTimeout(1500);
  // Traffic here belongs to the public sign-in page after the redirect.
  expect(adminIdentifiers(hits).length).toBe(0);
});

test("signed-in admin navigation sends nothing to the SDK sink", async ({ page }) => {
  const fixture = await createAdminFixture("privacy-walk", ["owner"]);
  try {
    const hits = await watchSink(page);
    await fixture.login(page, "aal2");
    await page.goto("/admin/recipes");
    await expect(page.getByRole("link", { name: "Recipes" }).first()).toBeVisible();
    await page.getByRole("link", { name: "Team" }).click();
    await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(hits.length).toBe(0);
  } finally {
    await fixture.dispose();
  }
});

test("public-to-admin navigation into collections sends nothing once admin pages load", async ({ page }) => {
  const fixture = await createCollectionsFixture();
  try {
    const hits = await watchSink(page);
    await fixture.login(page, "owner", "aal2");
    await page.goto("/");
    await page.waitForTimeout(1500);
    const publicHits = hits.length;
    expect(publicHits).toBeGreaterThan(0);
    await page.goto(`/admin/collections?q=${fixture.slug}`);
    await page.getByRole("link", { name: fixture.title, exact: true }).locator("visible=true").click();
    await expect(page.getByRole("heading", { level: 1, name: fixture.title })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(hits.slice(publicHits)).toEqual([]);
  } finally {
    await fixture.dispose();
  }
});
