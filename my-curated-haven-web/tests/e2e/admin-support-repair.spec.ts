import { expect, test, type Page } from "@playwright/test";
import { createSupportFixture, type SupportFixture } from "./support-admin-fixtures";

// Repairs read the local payment records (SUPPORT_PROVIDER_FIXTURE=local-ledger). Each order is frozen under a synthetic
// approved policy, so the shared stack never approves `v1`. The owner role is a singleton: one test at a time.
test.describe.configure({ mode: "serial" });
const POLICY = "e2e-repair";

async function checkAndPrepare(page: Page, fixture: SupportFixture, reason = "Paid but the collection is missing") {
  await page.goto(`/admin/support/orders/${fixture.orderId}`);
  await page.getByRole("button", { name: "Check provider status" }).click();
  await expect(page.getByRole("status", { name: "Check status" })).toContainText("Checked.");
  await page.reload();
  const repair = page.getByRole("region", { name: "Repair" });
  await repair.getByLabel("Reason", { exact: true }).fill(reason);
  await repair.getByRole("button", { name: "Prepare repair" }).click();
  await expect(repair.getByRole("group", { name: "Repair preview" })).toBeVisible();
  return repair;
}

test("retry recovers the receipt without another repair", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY });
  try {
    await fixture.breakAccess();
    await fixture.login(page);
    const repair = await checkAndPrepare(page, fixture);
    const preview = repair.getByRole("group", { name: "Repair preview" });
    await expect(preview).toContainText("Restores access");
    await expect(preview).toContainText("Purchase sourceNo purchase source → Eligible");
    await expect(preview).toContainText("Customer accessNo access → Has access");
    await expect(preview).toContainText("EmailNone");
    await expect(preview).toContainText(`Order${fixture.supportReference}`);

    fixture.loseNextCommitResponse();
    await repair.getByRole("button", { name: "Approve and apply repair" }).click();
    const outcome = repair.getByRole("status", { name: "Repair outcome" });
    await expect(outcome).toContainText("Result not known yet");
    await expect(repair.getByRole("button", { name: /apply/i })).toHaveCount(0);
    await repair.getByRole("button", { name: "Check operation result" }).click();
    await expect(outcome).toContainText("Applied");
    const operationId = await fixture.lastOperationId();
    expect(operationId).not.toBeNull();
    expect(await fixture.receiptCount(operationId!)).toBe(1);
    expect(await fixture.operationCount()).toBe(1);
    await expect(page.getByRole("region", { name: "Where this order stands" })).toContainText("Access to the collectionHas access");
  } finally {
    await fixture.dispose();
  }
});

test("a failed access check leaves the repair applied, and confirming later verifies it", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY });
  try {
    await fixture.breakAccess();
    await fixture.login(page);
    const repair = await checkAndPrepare(page, fixture);
    fixture.failNextPostcheck();
    await repair.getByRole("button", { name: "Approve and apply repair" }).click();
    const outcome = repair.getByRole("status", { name: "Repair outcome" });
    await expect(outcome).toContainText("Applied; access check unavailable");
    await repair.getByRole("button", { name: "Confirm customer access" }).click();
    await expect(outcome).toContainText("Applied and confirmed");
    // After a reload the page restores the same operation from the server and offers no second apply.
    await page.reload();
    await expect(repair.getByRole("status", { name: "Repair outcome" })).toContainText("Applied and confirmed");
    await expect(repair.getByRole("button", { name: /apply/i })).toHaveCount(0);
    expect(await fixture.operationCount()).toBe(1);
  } finally {
    await fixture.dispose();
  }
});

test("newer evidence makes a prepared repair stale, and a repair with nothing to do is blocked", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY });
  try {
    await fixture.login(page);
    // Access is intact: reconciling would change nothing.
    let repair = await checkAndPrepare(page, fixture, "Customer reports missing access");
    await expect(repair.getByRole("status", { name: "Why this repair is blocked" })).toContainText("Nothing to repair");
    await expect(repair.getByRole("button", { name: /Approve/ })).toHaveCount(0);

    await fixture.breakAccess();
    repair = await checkAndPrepare(page, fixture);
    // A new check after preparing supersedes the evidence the proposal was built on.
    await page.getByRole("button", { name: "Check provider status" }).click();
    await expect(page.getByRole("status", { name: "Check status" })).toContainText("Checked.");
    await repair.getByRole("button", { name: "Approve and apply repair" }).click();
    await expect(repair.getByRole("status", { name: "Repair status" })).toContainText("Something changed since this repair was prepared");
    expect(await fixture.operationCount()).toBe(0);
  } finally {
    await fixture.dispose();
  }
});

test("a support operator prepares a repair but cannot approve it", async ({ page }) => {
  const fixture = await createSupportFixture("support_operator", "repair", { verifier: true, policyVersion: POLICY });
  try {
    await fixture.breakAccess();
    await fixture.login(page);
    const repair = await checkAndPrepare(page, fixture);
    await expect(repair.getByRole("group", { name: "Repair preview" })).toContainText("Waiting for the owner's approval");
    await expect(repair).toContainText("Waiting for the owner’s approval.");
    await expect(repair.getByRole("button", { name: /Approve/ })).toHaveCount(0);
  } finally {
    await fixture.dispose();
  }
});

test("the repair workflow works with the keyboard on a 320px screen", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY });
  try {
    await fixture.breakAccess();
    await fixture.login(page);
    await page.setViewportSize({ width: 320, height: 800 });
    const repair = await checkAndPrepare(page, fixture);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const apply = repair.getByRole("button", { name: "Approve and apply repair" });
    await apply.focus();
    await page.keyboard.press("Enter");
    await expect(repair.getByRole("status", { name: "Repair outcome" })).toContainText("Applied");
  } finally {
    await fixture.dispose();
  }
});
