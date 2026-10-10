import { expect, test, type Page } from "@playwright/test";
import { createSupportFixture, type SupportFixture } from "./support-admin-fixtures";

// Notices run against the local payment records (SUPPORT_PROVIDER_FIXTURE=local-ledger) and a local mail transport that
// writes each email to a file instead of sending it. The owner role is a singleton: one test at a time.
test.describe.configure({ mode: "serial" });
const POLICY = "e2e-notice";

async function openOrder(page: Page, fixture: SupportFixture) {
  await expect(async () => { await page.goto(`/admin/support/orders/${fixture.orderId}`); }).toPass();
}

async function checkAndPrepare(page: Page, fixture: SupportFixture, disputeId: string) {
  await openOrder(page, fixture);
  await page.getByRole("button", { name: "Check provider status" }).click();
  await expect(page.getByRole("status", { name: "Check status" })).toContainText("Checked.");
  await openOrder(page, fixture);
  const notice = page.getByRole("region", { name: "Dispute notice" });
  await notice.getByRole("button", { name: `Prepare notice for dispute ${disputeId}` }).click();
  await expect(notice.getByRole("group", { name: "Notice preview" })).toBeVisible();
  return notice;
}

test("the owner reviews the exact email, approves it and it is sent once", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, noticeSending: true });
  try {
    const disputeId = await fixture.openDispute();
    await fixture.login(page);
    const notice = await checkAndPrepare(page, fixture, disputeId);
    const preview = notice.getByRole("group", { name: "Notice preview" });
    await expect(preview).toContainText(`To${fixture.customerEmail.toLowerCase()}`);
    await expect(preview).toContainText(`SubjectAbout your order ${fixture.supportReference}`);
    await expect(preview).toContainText(`write to support@synthetic.test and quote ${fixture.supportReference}.`);
    await expect(preview).toContainText(`Dispute${disputeId} (needs response)`);
    await expect(preview).toContainText("Respond in Stripe by");
    const shown = await preview.locator(".admin-support__notice-text").innerText();

    await notice.getByRole("button", { name: "Approve and send notice" }).click();
    const outcome = notice.getByRole("status", { name: "Notice outcome" });
    await expect(outcome).toHaveText("Accepted. Email accepted by the provider. Delivery is not confirmed.");
    const sent = fixture.sentNotices();
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe(`About your order ${fixture.supportReference}`);
    expect(sent[0].text).toBe(shown);

    await openOrder(page, fixture);
    await expect(notice.getByRole("status", { name: "Notice outcome" })).toContainText("Delivery is not confirmed.");
    await expect(notice.getByRole("button", { name: "Approve and send notice" })).toHaveCount(0);
    // A second notice for the same dispute is blocked.
    await notice.getByRole("button", { name: `Prepare notice for dispute ${disputeId}` }).click();
    await expect(notice.getByRole("status", { name: "Why this notice is blocked" })).toContainText("already sent, or may have been");
    await expect(notice.getByRole("button", { name: "Approve and send notice" })).toHaveCount(0);
    expect(fixture.sentNotices()).toHaveLength(1);
  } finally {
    await fixture.dispose();
  }
});

test("a lost answer is reported as unknown and offers no second email", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, noticeSending: true });
  try {
    const disputeId = await fixture.openDispute();
    await fixture.login(page);
    const notice = await checkAndPrepare(page, fixture, disputeId);
    fixture.loseNextNoticeAnswer();
    await notice.getByRole("button", { name: "Approve and send notice" }).click();
    await expect(notice.getByRole("status", { name: "Notice outcome" })).toHaveText(
      "Outcome unknown. Email send outcome unknown. Check this operation before sending again.");
    await openOrder(page, fixture);
    await expect(notice).toContainText("Find out what happened to the notice below before preparing another.");
    await expect(notice.getByRole("button", { name: /Prepare notice|Approve and send/ })).toHaveCount(0);
    expect(fixture.sentNotices()).toHaveLength(1);
  } finally {
    await fixture.dispose();
  }
});

test("an email the provider refuses is reported as not sent", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, noticeSending: true });
  try {
    const disputeId = await fixture.openDispute();
    await fixture.login(page);
    const notice = await checkAndPrepare(page, fixture, disputeId);
    fixture.rejectNextNotice();
    await notice.getByRole("button", { name: "Approve and send notice" }).click();
    await expect(notice.getByRole("status", { name: "Notice outcome" })).toHaveText(
      "Not sent. The mail provider refused the email before accepting it. Nothing was sent.");
    expect(fixture.sentNotices()).toHaveLength(0);
  } finally {
    await fixture.dispose();
  }
});

test("with sending switched off the owner can review on a 320px screen, but not send", async ({ page }) => {
  const fixture = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, noticeSending: false });
  try {
    const disputeId = await fixture.openDispute();
    await fixture.login(page);
    await page.setViewportSize({ width: 320, height: 800 });
    const notice = await checkAndPrepare(page, fixture, disputeId);
    await expect(notice).toContainText("Sending dispute notices is switched off.");
    await expect(notice.getByRole("button", { name: "Approve and send notice" })).toBeDisabled();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(fixture.sentNotices()).toHaveLength(0);
  } finally {
    await fixture.dispose();
  }
});

test("an inquiry offers no notice, and support staff see no notice controls", async ({ page }) => {
  const owner = await createSupportFixture("owner", "repair", { verifier: true, policyVersion: POLICY, noticeSending: true });
  try {
    await owner.openDispute("warning_needs_response");
    await owner.login(page);
    await openOrder(page, owner);
    await page.getByRole("button", { name: "Check provider status" }).click();
    await expect(page.getByRole("status", { name: "Check status" })).toContainText("Checked.");
    await openOrder(page, owner);
    await expect(page.getByRole("region", { name: "Dispute notice" })).toContainText("Stripe shows no formal dispute open on this payment.");
  } finally {
    await owner.dispose();
  }
  const staff = await createSupportFixture("support_operator", "repair", { verifier: true, policyVersion: POLICY, noticeSending: true });
  try {
    await staff.openDispute();
    await staff.login(page);
    await openOrder(page, staff);
    await expect(page.getByRole("region", { name: "Repair" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Dispute notice" })).toHaveCount(0);
  } finally {
    await staff.dispose();
  }
});
