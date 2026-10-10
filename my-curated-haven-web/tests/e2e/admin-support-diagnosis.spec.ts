import { expect, test } from "@playwright/test";
import { createSupportFixture } from "./support-admin-fixtures";

// The provider check reads the local payment records (SUPPORT_PROVIDER_FIXTURE=local-ledger), never Stripe.
test.describe.configure({ mode: "serial" });

test("a support operator checks an order with Stripe and the answer is recorded", async ({ page }) => {
  const fixture = await createSupportFixture("support_operator", "diagnosis", { verifier: true });
  try {
    await fixture.login(page);
    await page.goto(`/admin/support/orders/${fixture.orderId}`);
    const check = page.getByRole("region", { name: "Stripe check" });
    await expect(check).toContainText("No check recorded yet.");
    await check.getByRole("button", { name: "Check provider status" }).click();
    await expect(check.getByRole("status", { name: "Check status" })).toContainText("Checked. Stripe's answer is recorded below.");
    await expect(check).toContainText("Complete answer, checked");
    await expect(check).toContainText("Stripe paymentPaid: $15.00");
    await expect(check).toContainText("Stripe refunds$1.00 succeeded");
    await expect(check).toContainText("Stripe disputesNone");
    const recorded = await fixture.query(`SELECT o.complete, o.api_version, j.state FROM private.commerce_provider_observations o
      JOIN private.commerce_verification_jobs j ON j.id = o.job_id WHERE o.order_id = $1`, [fixture.orderId]);
    expect(recorded.rows).toEqual([{ complete: true, api_version: "local-ledger", state: "complete" }]);

    // The answer survives a reload, and the check changed nothing about access.
    await page.reload();
    await expect(check).toContainText("Stripe paymentPaid: $15.00");
    await expect(page.getByRole("region", { name: "Where this order stands" })).toContainText("Access to the collectionHas access");
  } finally {
    await fixture.dispose();
  }
});

test("a check without a registered verifier records nothing", async ({ page }) => {
  const fixture = await createSupportFixture("support_operator", "diagnosis", { verifier: true });
  try {
    await fixture.revokeVerifier();
    await fixture.login(page);
    await page.goto(`/admin/support/orders/${fixture.orderId}`);
    const check = page.getByRole("region", { name: "Stripe check" });
    await check.getByRole("button", { name: "Check provider status" }).click();
    await expect(check.getByRole("status", { name: "Check status" })).toContainText("The check did not finish (UNAVAILABLE");
    await expect(check).toContainText("No check recorded yet.");
    const recorded = await fixture.query("SELECT 1 FROM private.commerce_provider_observations WHERE order_id = $1", [fixture.orderId]);
    expect(recorded.rows).toEqual([]);
  } finally {
    await fixture.dispose();
  }
});

test("viewers, and everyone before the diagnosis stage, see no Stripe check", async ({ page }) => {
  const viewer = await createSupportFixture("support_viewer", "diagnosis");
  try {
    await viewer.login(page);
    await page.goto(`/admin/support/orders/${viewer.orderId}`);
    await expect(page.getByRole("region", { name: "Where this order stands" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Stripe check" })).toHaveCount(0);
  } finally {
    await viewer.dispose();
  }
  await page.context().clearCookies();
  const operator = await createSupportFixture("support_operator", "inspection");
  try {
    await operator.login(page);
    await page.goto(`/admin/support/orders/${operator.orderId}`);
    await expect(page.getByRole("region", { name: "Where this order stands" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Stripe check" })).toHaveCount(0);
  } finally {
    await operator.dispose();
  }
});
