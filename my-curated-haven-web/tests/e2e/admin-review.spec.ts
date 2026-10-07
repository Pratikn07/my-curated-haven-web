import { expect, test } from "@playwright/test";
import { createAdminFixture } from "./admin-fixtures";

test.describe.configure({ mode: "serial" });
test.setTimeout(120000);

test("editor submits, reviewer approves, viewer observes", async ({ browser }) => {
  const owner = await createAdminFixture("review-owner", ["owner"], "editing");
  const reviewer = await createAdminFixture("review-reviewer", ["reviewer"], "editing");
  const viewer = await createAdminFixture("review-viewer", ["viewer"], "editing");
  const ownerPage = await browser.newPage();
  const reviewerPage = await browser.newPage();
  const viewerPage = await browser.newPage();
  try {
    await owner.login(ownerPage, "aal2");
    await ownerPage.goto(`/admin/recipes/${owner.recipeId}/edit`);
    await ownerPage.getByLabel("Title", { exact: true }).fill("Review candidate title");
    await ownerPage.getByLabel("Reason").fill("Ready for review");
    await ownerPage.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(ownerPage.getByRole("status").filter({ hasText: "Saved at" })).toBeVisible();
    await ownerPage.goto(`/admin/recipes/${owner.recipeId}`);
    await ownerPage.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(ownerPage.getByRole("status").filter({ hasText: "Awaiting review" })).toBeVisible();

    await reviewer.login(reviewerPage, "aal2");
    await reviewerPage.goto(`/admin/recipes/${owner.recipeId}`);
    await reviewerPage.getByLabel("Issue code").fill("image-suitability");
    await reviewerPage.getByLabel("Field (optional)").fill("image");
    await reviewerPage.getByLabel("Explanation").fill("Depicts the finished dish");
    await reviewerPage.getByRole("button", { name: "Record issue", exact: true }).click();
    await expect(reviewerPage.getByRole("status").filter({ hasText: "Issue recorded." })).toBeVisible();
    await reviewerPage.getByLabel("Resolve image suitability issue").check();
    await reviewerPage.getByLabel("Review reason").fill("Checked instructions, allergens and the selected image");
    await reviewerPage.getByRole("button", { name: "Approve this revision", exact: true }).click();
    await expect(
      reviewerPage.getByText("This revision is approved and ready to publish.", { exact: true })
    ).toBeVisible();

    await viewer.login(viewerPage, "aal2");
    await viewerPage.goto(`/admin/recipes/${owner.recipeId}`);
    await expect(viewerPage.getByRole("button", { name: "Submit for review", exact: true })).toHaveCount(0);
    await expect(viewerPage.getByRole("button", { name: "Approve this revision", exact: true })).toHaveCount(0);
    await expect(viewerPage.getByText("Review decisions require the reviewer permission.")).toBeVisible();

    await ownerPage.reload();
    await expect(ownerPage.getByText(/approved/, { exact: false }).first()).toBeVisible();
  } finally {
    await viewerPage.close().catch(() => {});
    await reviewerPage.close().catch(() => {});
    await ownerPage.close().catch(() => {});
    await viewer.dispose();
    await reviewer.dispose();
    await owner.dispose();
  }
});

test("metadata edit after approval asks for acknowledgement", async ({ page }) => {
  const owner = await createAdminFixture("review-reopen", ["owner"], "editing");
  try {
    await owner.login(page, "aal2");
    await page.goto(`/admin/recipes/${owner.recipeId}/edit`);
    await page.getByLabel("Title", { exact: true }).fill("Reopen candidate");
    await page.getByLabel("Reason").fill("Baseline");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved at" })).toBeVisible();
    await page.goto(`/admin/recipes/${owner.recipeId}`);
    await page.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Awaiting review" })).toBeVisible();
    await page.getByLabel("Review reason").fill("Self review");
    await page.getByRole("button", { name: "Approve this revision", exact: true }).click();
    await expect(
      page.getByText("This revision is approved and ready to publish.", { exact: true })
    ).toBeVisible();
    await page.goto(`/admin/recipes/${owner.recipeId}/edit`);
    await page.getByLabel("Image alt text").fill("Reopened alt");
    await expect(page.getByText("Reopen reviewed content")).toBeVisible();
  } finally {
    await owner.dispose();
  }
});
