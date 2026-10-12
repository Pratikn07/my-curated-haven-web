import { expect, type Locator, type Page } from "@playwright/test";
import type { SupportFixture } from "./support-admin-fixtures";

/**
 * Refund steps shared by the admin support specs. The order page refreshes itself (router.refresh) after every
 * command, and on WebKit that refresh races the next step: it can cut off the next page load, re-render the form
 * under a click, or drop the click. Each step here retries until its effect is visible, and only where a retry is
 * harmless.
 */

/** Opens the order page, retried because the previous command's refresh can cut the load off on WebKit. */
export async function openSupportOrder(page: Page, fixture: SupportFixture): Promise<void> {
  await expect(async () => {
    await page.goto(`/admin/support/orders/${fixture.orderId}`);
  }).toPass();
}

/**
 * Chooses "Part of it" and types the amount. The form appears from the Stripe check and is briefly disabled while the
 * page's own refresh runs, so on WebKit the first click on the radio can land on a disabled control and change
 * nothing ("Clicking the checkbox did not change its state"). Choosing it again is harmless, so it is retried until
 * the radio is checked and the amount field it reveals has appeared.
 */
export async function choosePartialRefund(refund: Locator, amount: string): Promise<void> {
  const part = refund.getByLabel("Part of it");
  await expect(async () => {
    await part.check({ timeout: 2_000 });
    await expect(part).toBeChecked({ timeout: 1_000 });
    await expect(refund.getByLabel("Amount in USD")).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await refund.getByLabel("Amount in USD").fill(amount);
}

/** Opens the order, checks Stripe and prepares a refund of `amount` (null for everything still refundable). */
export async function prepareRefund(page: Page, fixture: SupportFixture, amount: string | null,
  reason = "Charged twice by mistake"): Promise<Locator> {
  await openSupportOrder(page, fixture);
  const refund = page.getByRole("region", { name: "Refund", exact: true });
  await refund.getByRole("button", { name: "Check Stripe before a refund" }).click();
  if (amount !== null) await choosePartialRefund(refund, amount);
  await refund.getByLabel("Internal reason").fill(reason);
  // WebKit occasionally drops this click; retrying can only prepare another unsent proposal.
  const answered = refund.getByRole("group", { name: "Refund preview" })
    .or(refund.getByRole("status", { name: "Refund status" }).filter({ hasText: /\S/ }));
  await expect(async () => {
    await refund.getByRole("button", { name: "Prepare refund" }).click();
    await expect(answered).toBeVisible({ timeout: 5_000 });
  }).toPass();
  return refund;
}
