import { expect, test, type Page } from "@playwright/test";
import { createAdminFixture } from "./admin-fixtures";
import { createCollectionsFixture } from "./collections-admin-fixtures";
import { createSupportFixture } from "./support-admin-fixtures";

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

test("Home and the collection publish page send nothing once admin pages load", async ({ page }) => {
  const fixture = await createCollectionsFixture();
  try {
    await fixture.setCollectionStage("publication");
    const hits = await watchSink(page);
    await fixture.login(page, "owner", "aal2");
    await page.goto("/");
    await page.waitForTimeout(1500);
    const publicHits = hits.length;
    expect(publicHits).toBeGreaterThan(0);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
    await page.goto(`/admin/collections/${fixture.collectionId}/publish`);
    await expect(page.getByRole("heading", { level: 1, name: "Review collection effect" })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(hits.slice(publicHits)).toEqual([]);
  } finally {
    await fixture.dispose();
  }
});

test("support lookups and order pages send nothing once admin pages load", async ({ page }) => {
  const fixture = await createSupportFixture("support_operator");
  try {
    const hits = await watchSink(page);
    await fixture.login(page, "aal2");
    await page.goto("/");
    await page.waitForTimeout(1500);
    const publicHits = hits.length;
    expect(publicHits).toBeGreaterThan(0);
    await page.goto("/admin/support");
    await page.getByLabel("Search by").selectOption("email");
    await page.getByLabel("Email").fill(fixture.customerEmail);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(fixture.customerEmail);
    await page.getByRole("link", { name: fixture.supportReference }).click();
    await expect(page.getByRole("region", { name: "Where this order stands" })).toBeVisible();
    await page.waitForTimeout(1000);
    const later = hits.slice(publicHits);
    expect(later).toEqual([]);
    expect(JSON.stringify(hits)).not.toContain(fixture.customerEmail);
    expect(JSON.stringify(hits)).not.toContain(fixture.supportReference);
  } finally {
    await fixture.dispose();
  }
});

test("refund and dispute notice reviews send nothing and keep people and money out of URLs", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: "e2e-privacy", refundSending: false,
    noticeSending: false });
  try {
    const disputeId = await fixture.openDispute();
    const hits = await watchSink(page);
    const urls: string[] = [];
    page.on("request", (request) => urls.push(request.url()));
    await fixture.login(page, "aal2");
    await page.goto("/");
    await page.waitForTimeout(1500);
    const publicHits = hits.length;
    await page.goto(`/admin/support/orders/${fixture.orderId}`);
    await page.getByRole("button", { name: "Check provider status" }).click();
    await expect(page.getByRole("status", { name: "Check status" })).toContainText("Checked.");
    // WebKit can cut this load off with the page's own refresh after the check; retry it.
    await expect(async () => { await page.goto(`/admin/support/orders/${fixture.orderId}`); }).toPass();
    const notice = page.getByRole("region", { name: "Dispute notice" });
    await notice.getByRole("button", { name: `Prepare notice for dispute ${disputeId}` }).click();
    await expect(notice.getByRole("group", { name: "Notice preview" })).toContainText(fixture.customerEmail.toLowerCase());
    const refund = page.getByRole("region", { name: "Refund", exact: true });
    await refund.getByRole("button", { name: "Check Stripe before a refund" }).click();
    await refund.getByLabel("Part of it").check();
    await refund.getByLabel("Amount in USD").fill("4.00");
    await refund.getByLabel("Internal reason").fill("Privacy check reason");
    await refund.getByRole("button", { name: "Prepare refund" }).click();
    await expect(refund.getByRole("group", { name: "Refund preview" })).toContainText("Refund $4.00");
    await page.waitForTimeout(1000);
    expect(hits.slice(publicHits)).toEqual([]);
    const sent = JSON.stringify(hits) + urls.join("\n");
    for (const secret of [fixture.customerEmail.toLowerCase(), fixture.supportReference, disputeId, "Privacy check reason", "amountMinor"]) {
      expect(sent).not.toContain(secret);
    }
  } finally {
    await fixture.dispose();
  }
});
