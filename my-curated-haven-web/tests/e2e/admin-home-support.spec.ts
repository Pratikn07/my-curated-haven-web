import { expect, test } from "@playwright/test";
import { createSupportFixture, type SupportFixture } from "./support-admin-fixtures";

// The Customer support lane on Home. Home exists while collections are switched on, so each test turns them on and
// restores the previous stage. The owner role is a singleton, so these run apart from admin-home.spec.ts's owner.
test.describe.configure({ mode: "serial" });
const POLICY = "e2e-home-support";

async function withHome<T>(fixture: SupportFixture, run: () => Promise<T>): Promise<T> {
  const before = (await fixture.query("SELECT stage FROM private.collection_workspace_settings WHERE singleton")).rows[0].stage;
  await fixture.query("UPDATE private.collection_workspace_settings SET stage = 'publication' WHERE singleton");
  try {
    return await run();
  } finally {
    await fixture.query("UPDATE private.collection_workspace_settings SET stage = $1 WHERE singleton", [before]);
  }
}

test("the owner's Home puts a dispute deadline first and lists their own support outcomes", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, refundSending: true });
  try {
    await withHome(fixture, async () => {
      // Due within the hour, so it is the soonest deadline even beside disputes other specs left on the shared stack.
      await fixture.openDispute("needs_response", 1);
      await fixture.login(page);
      await page.goto("/admin");
      const support = page.getByRole("region", { name: "Customer support" });
      const items = support.getByRole("list", { name: "Support items needing a decision" });
      const first = items.getByRole("listitem").first();
      await expect(first).toContainText(fixture.supportReference);
      await expect(first).toContainText("Dispute open; respond in Stripe by");
      await expect(first).toContainText("Test · Access at risk");
      await expect(support).toContainText("You have no recent support outcomes.");

      await page.setViewportSize({ width: 320, height: 800 });
      await page.reload();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  } finally {
    await fixture.dispose();
  }
});

test("a refund the owner sent appears in their Home outcomes with no amount or email", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, refundSending: true });
  try {
    await withHome(fixture, async () => {
      await fixture.login(page);
      await page.goto(`/admin/support/orders/${fixture.orderId}`);
      const refund = page.getByRole("region", { name: "Refund", exact: true });
      await refund.getByRole("button", { name: "Check Stripe before a refund" }).click();
      await refund.getByLabel("Part of it").check();
      await refund.getByLabel("Amount in USD").fill("1.00");
      await refund.getByLabel("Internal reason").fill("Home outcome check");
      await refund.getByRole("button", { name: "Prepare refund" }).click();
      await refund.getByRole("button", { name: "Approve and submit refund of $1.00" }).click();
      await expect(refund.getByRole("status", { name: "Refund outcome" })).toContainText("Sent to Stripe");
      await page.goto("/admin");
      const outcomes = page.getByRole("list", { name: "Your recent support outcomes" });
      await expect(outcomes.getByRole("listitem").first()).toContainText(`${fixture.supportReference}Refund: Sent to Stripe`);
      const html = await page.content();
      expect(html).not.toContain(fixture.customerEmail);
      expect(html).not.toContain("$1.00");
      expect(html).not.toContain(fixture.paymentIntentId);
    });
  } finally {
    await fixture.dispose();
  }
});

test("a recipe editor's Home carries no support lane, rows or references", async ({ page }) => {
  const fixture = await createSupportFixture("recipe_editor", "repair");
  try {
    await withHome(fixture, async () => {
      await fixture.openDispute();
      await fixture.login(page);
      await page.goto("/admin");
      await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Customer support" })).toHaveCount(0);
      const html = await page.content();
      expect(html).not.toContain(fixture.supportReference);
      expect(html).not.toContain("Customer support");
    });
  } finally {
    await fixture.dispose();
  }
});
