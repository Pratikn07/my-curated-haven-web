import { expect, test, type Page } from "@playwright/test";
import { createSupportFixture, type SupportFixture } from "./support-admin-fixtures";

// Refunds run against the local payment records (SUPPORT_PROVIDER_FIXTURE=local-ledger): the local writer records the
// refund as Stripe would. The order was paid $15.00 with $1.00 already refunded, so $14.00 is still refundable. The
// owner role is a singleton: one test at a time.
test.describe.configure({ mode: "serial" });
const POLICY = "e2e-refund";

// The page refreshes itself after each command; on WebKit that refresh can cut off the next page load, so it is retried.
async function openOrder(page: Page, fixture: SupportFixture) {
  await expect(async () => { await page.goto(`/admin/support/orders/${fixture.orderId}`); }).toPass();
}

async function prepare(page: Page, fixture: SupportFixture, amount: string | null, reason = "Charged twice by mistake") {
  await openOrder(page, fixture);
  const refund = page.getByRole("region", { name: "Refund", exact: true });
  await refund.getByRole("button", { name: "Check Stripe before a refund" }).click();
  if (amount !== null) {
    await refund.getByLabel("Part of it").check();
    await refund.getByLabel("Amount in USD").fill(amount);
  }
  await refund.getByLabel("Internal reason").fill(reason);
  await refund.getByRole("button", { name: "Prepare refund" }).click();
  return refund;
}

test("the owner refunds part of a payment, and the receipt survives a reload", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, refundSending: true });
  try {
    await fixture.login(page);
    const refund = await prepare(page, fixture, "4.00");
    const preview = refund.getByRole("group", { name: "Refund preview" });
    await expect(preview).toContainText("Refund $4.00");
    await expect(preview).toContainText("Paid$15.00");
    await expect(preview).toContainText("Already refunded$1.00");
    await expect(preview).toContainText("Still refundable$14.00");
    await expect(preview).toContainText(`Order${fixture.supportReference}`);
    await expect(preview).toContainText(`Test · acct_synthetic · ${fixture.paymentIntentId}`);
    await expect(preview).toContainText("Customer access to the collectionHas access → Has access");
    await expect(preview).toContainText("We send no refund email.");

    await refund.getByRole("button", { name: "Approve and submit refund of $4.00" }).click();
    const outcome = refund.getByRole("status", { name: "Refund outcome" });
    await expect(outcome).toContainText("Sent to Stripe: $4.00. Stripe reports the refund succeeded. Access has been updated.");
    expect(await fixture.providerRefundCount()).toBe(1);

    await page.reload();
    await expect(refund.getByRole("status", { name: "Refund outcome" })).toContainText("Sent to Stripe: $4.00.");
    await expect(refund.getByRole("button", { name: /Approve|Send approved/ })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Where this order stands" })).toContainText("Access to the collectionHas access");
    expect(await fixture.providerRefundCount()).toBe(1);
  } finally {
    await fixture.dispose();
  }
});

test("an unknown outcome offers no second refund, and asking Stripe settles it", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, refundSending: true });
  try {
    await fixture.login(page);
    const refund = await prepare(page, fixture, null);
    await expect(refund.getByRole("group", { name: "Refund preview" })).toContainText("Customer access to the collectionHas access → No access");
    fixture.loseNextRefundAnswer();
    await refund.getByRole("button", { name: "Approve and submit refund of $14.00" }).click();
    const outcome = refund.getByRole("status", { name: "Refund outcome" });
    await expect(outcome).toContainText("Outcome unknown: $14.00. Refund outcome unknown. Check this operation's status before taking further action.");
    await expect(refund.getByRole("button", { name: /Approve|Send approved|Prepare|Check Stripe before/ })).toHaveCount(0);

    await page.reload();
    await expect(refund).toContainText("Find out what happened to the refund below before preparing another.");
    await refund.getByRole("button", { name: "Ask Stripe what happened" }).click();
    await expect(refund.getByRole("status", { name: "Refund outcome" })).toContainText("Sent to Stripe: $14.00. Stripe reports the refund succeeded.");
    expect(await fixture.providerRefundCount()).toBe(1);
  } finally {
    await fixture.dispose();
  }
});

test("a refund Stripe refuses moves no money and holds nothing back", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, refundSending: true });
  try {
    await fixture.login(page);
    const refund = await prepare(page, fixture, "2.50");
    fixture.rejectNextRefund();
    await refund.getByRole("button", { name: "Approve and submit refund of $2.50" }).click();
    await expect(refund.getByRole("status", { name: "Refund outcome" })).toContainText(
      "Not refunded: $2.50. Stripe did not make this refund (AMOUNT_TOO_LARGE). No money moved and the amount is no longer reserved.");
    expect(await fixture.providerRefundCount()).toBe(0);
    await page.reload();
    await refund.getByRole("button", { name: "Check Stripe before a refund" }).click();
    await refund.getByLabel("Internal reason").fill("Second attempt");
    await refund.getByRole("button", { name: "Prepare refund" }).click();
    await expect(refund.getByRole("group", { name: "Refund preview" })).toContainText("Still refundable$14.00");
  } finally {
    await fixture.dispose();
  }
});

test("more than is still refundable is refused before anything is prepared", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, refundSending: true });
  try {
    await fixture.login(page);
    const refund = await prepare(page, fixture, "14.01");
    await expect(refund.getByRole("status", { name: "Refund status" })).toHaveText("That amount or reason was not accepted. Nothing was sent.");
    await expect(refund.getByRole("group", { name: "Refund preview" })).toHaveCount(0);
    await refund.getByLabel("Amount in USD").fill("4.005");
    await refund.getByRole("button", { name: "Prepare refund" }).click();
    await expect(refund.getByRole("status", { name: "Refund status" })).toHaveText("Enter the amount in USD, for example 4.00.");
  } finally {
    await fixture.dispose();
  }
});

test("with sending switched off the owner can prepare and review on a 320px screen, but not send", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, refundSending: false });
  try {
    await fixture.login(page);
    await page.setViewportSize({ width: 320, height: 800 });
    const refund = await prepare(page, fixture, "1.00");
    await expect(refund).toContainText("Sending refunds is switched off.");
    await expect(refund.getByRole("group", { name: "Refund preview" })).toContainText("Refund $1.00");
    await expect(refund.getByRole("button", { name: "Approve and submit refund of $1.00" })).toBeDisabled();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await fixture.providerRefundCount()).toBe(0);
  } finally {
    await fixture.dispose();
  }
});

test("support staff see no refund controls", async ({ page }) => {
  const fixture = await createSupportFixture("support_operator", "repair", { verifier: true, policyVersion: POLICY, refundSending: true });
  try {
    await fixture.login(page);
    await openOrder(page, fixture);
    await expect(page.getByRole("region", { name: "Repair" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Refund", exact: true })).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});
