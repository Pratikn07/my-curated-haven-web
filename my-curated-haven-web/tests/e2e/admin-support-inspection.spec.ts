import { expect, test } from "@playwright/test";
import { createSupportFixture } from "./support-admin-fixtures";

// Each test owns its fixture; the owner role is a singleton, so these run one at a time.
test.describe.configure({ mode: "serial" });

test("recipe editor cannot inspect a customer", async ({ page }) => {
  const fixture = await createSupportFixture("recipe_editor");
  try {
    await fixture.login(page);
    await page.goto(`/admin/support/orders/${fixture.orderId}`);
    await expect(page.getByText(fixture.customerEmail, { exact: true })).toHaveCount(0);
    await expect(page.getByText(fixture.supportReference)).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("DENIED");
    await page.goto("/admin/support");
    await expect(page.getByRole("status")).toContainText("not available to you");
    await expect(page.getByRole("link", { name: "Support" })).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});

test("a support viewer finds a customer by exact email and reads the order's separate states", async ({ page }) => {
  const fixture = await createSupportFixture("support_viewer");
  try {
    await fixture.login(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/support$/);
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link")).toHaveText(["Support"]);
    await page.getByLabel("Search by").selectOption("email");
    await page.getByLabel("Email").fill(` ${fixture.customerEmail.toUpperCase()} `);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/support/customers/${fixture.customerId}$`));
    expect(page.url()).not.toContain("synthetic.test");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(fixture.customerEmail);
    await page.getByRole("link", { name: fixture.supportReference }).click();

    const states = page.getByRole("region", { name: "Where this order stands" });
    await expect(states).toContainText("PaymentPaid: $15.00");
    await expect(states).toContainText("Refunds$1.00 succeeded");
    await expect(states).toContainText("DisputesNone recorded");
    await expect(states).toContainText("Purchase sourcesEligible");
    await expect(states).toContainText("Access to the collectionHas access");
    await expect(states).toContainText("AccountActive");
    const terms = page.getByRole("region", { name: "What was bought" });
    await expect(terms).toContainText("Price at purchase$15.00");
    await expect(terms).toContainText("Refund policy at purchasev1");
    await expect(page.getByRole("region", { name: "Access" })).toContainText("later recipes: included");
    // A viewer sees no Stripe identifiers and no case controls.
    await expect(page.locator("main")).not.toContainText(/pi_support_|re_support_|cs_test_support_/);
    await expect(page.getByRole("button", { name: "Open case" })).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});

test("lookups that match nothing exactly select nothing", async ({ page }) => {
  const fixture = await createSupportFixture("support_viewer");
  try {
    await fixture.login(page);
    await page.goto("/admin/support");
    await page.getByLabel("Search by").selectOption("support_reference");
    await page.getByLabel("Order reference").fill("MCH-ZZZZZ9");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("status", { name: "Lookup result" })).toContainText("No exact match");
    await expect(page).toHaveURL(/\/admin\/support$/);
    await page.getByLabel("Search by").selectOption("email");
    await page.getByLabel("Email").fill(fixture.customerEmail.replace("@", "+x@"));
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("status", { name: "Lookup result" })).toContainText("No exact match");
    await expect(page.getByLabel("Search by").locator("option", { hasText: "Stripe id" })).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});

test("an older order shows its missing terms as unknown, not today's", async ({ page }) => {
  const fixture = await createSupportFixture("support_viewer");
  try {
    await fixture.login(page);
    await page.goto(`/admin/support/orders/${fixture.legacyOrderId}`);
    const terms = page.getByRole("region", { name: "What was bought" });
    await expect(terms).toContainText("Some original terms were not recorded with this order");
    await expect(terms).toContainText("Refund policy at purchaseUnknown");
    await expect(page.getByRole("region", { name: "Where this order stands" })).toContainText("PaymentUnknown (no payment recorded)");
  } finally {
    await fixture.dispose();
  }
});

test("a support operator opens a case; notes stay off until a retention period is set", async ({ page }) => {
  const fixture = await createSupportFixture("support_operator");
  try {
    await fixture.login(page);
    await page.goto(`/admin/support/orders/${fixture.orderId}`);
    const cases = page.getByRole("region", { name: "Cases" });
    await cases.getByLabel("New case about").selectOption("missing_access");
    await cases.getByRole("button", { name: "Open case" }).click();
    await expect(cases.getByRole("status", { name: "Case status" })).toContainText("Saved. Case is open.");
    await expect(cases).toContainText("Missing access · Open");
    await expect(cases).toContainText("Notes are off until the owner sets how long they are kept.");
    await expect(cases.getByLabel("Add a note")).toHaveCount(0);

    await fixture.setNoteRetention(90);
    await page.reload();
    await cases.getByLabel("Add a note").fill("Customer cannot see the collection in the library");
    await cases.getByRole("button", { name: "Add note" }).click();
    await expect(cases.getByRole("status", { name: "Case status" })).toContainText("Saved.");
    await expect(page.getByRole("region", { name: "Activity" })).toContainText("Customer cannot see the collection in the library");
    await expect(page.getByRole("region", { name: "Activity" })).toContainText("Case opened");
    // The order's access is unchanged by any of this.
    await expect(page.getByRole("region", { name: "Where this order stands" })).toContainText("Access to the collectionHas access");
  } finally {
    await fixture.dispose();
  }
});

test("aal1, revocation and a closed account are handled on the next read", async ({ page }) => {
  const fixture = await createSupportFixture("support_viewer");
  try {
    await fixture.login(page, "aal1");
    await page.goto(`/admin/support/orders/${fixture.orderId}`);
    await expect(page.getByRole("heading", { name: "Verify your admin access" })).toBeVisible();
    await expect(page.getByText(fixture.supportReference)).toHaveCount(0);

    await page.context().clearCookies();
    await fixture.login(page, "aal2");
    await fixture.closeCustomer();
    await page.goto(`/admin/support/orders/${fixture.orderId}`);
    await expect(page.getByRole("region", { name: "Where this order stands" })).toContainText("AccountAccount closed");
    await expect(page.getByRole("link", { name: "Open the closed account" })).toBeVisible();

    await fixture.revoke();
    await page.reload();
    await expect(page.getByText(fixture.supportReference)).toHaveCount(0);
    await expect(page.getByRole("status").first()).toContainText("DENIED");
  } finally {
    await fixture.dispose();
  }
});

test("the order page fits a 320px screen and is never cached", async ({ page }) => {
  const fixture = await createSupportFixture("support_operator");
  try {
    await fixture.login(page);
    await page.setViewportSize({ width: 320, height: 800 });
    const response = await page.goto(`/admin/support/orders/${fixture.orderId}`);
    expect(response?.headers()["cache-control"] ?? "").toContain("no-store");
    await expect(page.getByRole("region", { name: "Where this order stands" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  } finally {
    await fixture.dispose();
  }
});
