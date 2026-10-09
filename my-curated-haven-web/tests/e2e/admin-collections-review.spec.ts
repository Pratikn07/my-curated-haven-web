import { expect, test, type Page } from "@playwright/test";
import { createCollectionsFixture, type CollectionsFixture } from "./collections-admin-fixtures";

test.describe.configure({ mode: "serial" });

let f: CollectionsFixture;
let campaignRevision: string | null = null;
test.beforeAll(async () => {
  f = await createCollectionsFixture();
  await f.setCollectionStage("editing");
  campaignRevision = (await f.query("SELECT campaign_revision FROM private.admin_console_settings WHERE singleton")).rows[0]
    .campaign_revision as string | null;
  await f.query("UPDATE private.admin_console_settings SET campaign_revision=NULL WHERE singleton");
});
test.afterAll(async () => {
  await f?.query("UPDATE private.admin_console_settings SET campaign_revision=$1 WHERE singleton", [campaignRevision]);
  await f?.dispose();
});

test("preview counts an addition, keeps purchased recipes and promises nothing it cannot confirm", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}`);
  await page.getByRole("button", { name: "Prepare update" }).click();
  await page.getByLabel("Search recipes to add").fill(f.extraRecipes.reviewed.title);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: `Add ${f.extraRecipes.reviewed.title}` }).click();
  await page.getByLabel("Collection title").fill("Proposed title");
  await page.getByLabel("Reason for this change").fill("Add a recipe");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toContainText("Draft saved");
  await page.getByRole("link", { name: "Preview & changes" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Preview & changes" })).toBeVisible();
  const changes = page.getByRole("region", { name: "What changes" });
  await expect(changes).toContainText(`Published: 1 recipe. Draft: 2 recipes. Adds ${f.extraRecipes.reviewed.title}.`);
  await expect(changes).toContainText(`Published: ${f.title}`);
  await expect(changes).toContainText("Draft: Proposed title");
  const buyers = page.getByRole("region", { name: "Buyers" });
  await expect(buyers).toContainText("1 person has access today.");
  await expect(buyers).toContainText("No purchased recipe is removed.");
  await expect(buyers).toContainText("This preview does not promise it.");
  const readiness = page.getByRole("region", { name: "Readiness" });
  await expect(readiness).toContainText("Not ready for review yet.");
  await expect(readiness.getByRole("heading", { name: "Not yet known" })).toBeVisible();
  await expect(readiness).toContainText("Campaign promises for this deployment are not recorded");
  await expect(readiness).toContainText("Confirm that 2 recipes belong here.");

  const pagePreview = page.getByRole("region", { name: "Proposed collection page" });
  await expect(pagePreview).toContainText("Private draft. Visitors cannot see this page");
  await expect(pagePreview.getByRole("heading", { name: "Proposed title" })).toBeVisible();
  await expect(pagePreview.getByText(f.extraRecipes.reviewed.title)).toBeVisible();
  await expect(pagePreview.getByRole("button", { name: /buy|checkout/i })).toHaveCount(0);
  await expect(page.locator(".cl[inert]")).toHaveCount(1);

  const projection = await f.query("SELECT count(*)::int n FROM public.collection_publication_projection WHERE collection_id=$1", [f.collectionId]);
  expect(projection.rows[0].n).toBe(0);
});

test("a recipe changed after it was added is flagged and its reference can be refreshed", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await f.query("UPDATE public.recipe_bodies SET content_version=content_version+1 WHERE recipe_id=$1", [f.extraRecipes.reviewed.id]);
  await page.goto(`/admin/collections/${f.collectionId}/preview`);
  await expect(page.getByRole("region", { name: "Readiness" })).toContainText(`${f.extraRecipes.reviewed.title} changed after it was added`);

  await page.goto(`/admin/collections/${f.collectionId}/edit`);
  await page.getByRole("button", { name: "Use current recipe versions" }).click();
  await expect(page.getByText("Recipe references updated. Save the draft to keep them.")).toBeVisible();
  await page.getByLabel("Reason for this change").fill("Refresh references");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toContainText("Draft saved");
  await page.getByRole("link", { name: "Preview & changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Preview & changes" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Readiness" })).not.toContainText(`${f.extraRecipes.reviewed.title} changed after it was added`);
});

test("a never-published empty collection previews as new, with no count warning", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.goto("/admin/collections/new");
  const title = `Synthetic new preview ${Date.now()}`;
  await page.getByLabel("Collection title").fill(title);
  await page.getByRole("button", { name: "Create private collection" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Edit private draft: ${title}` })).toBeVisible();
  await page.getByRole("link", { name: "Preview & changes" }).click();
  const changes = page.getByRole("region", { name: "What changes" });
  await expect(changes).toContainText("Published: 0 recipes. Draft: 0 recipes. No recipes added.");
  await expect(changes).toContainText("This collection has never been published");
  await expect(page.getByRole("region", { name: "Readiness" })).not.toContainText(/minimum|too few|at least/i);
});

test("the preview fits a 320px screen", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`/admin/collections/${f.collectionId}/preview`);
  await expect(page.getByRole("heading", { level: 1, name: "Preview & changes" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("a collection without a draft has no preview", async ({ page }) => {
  await f.login(page, "viewer", "aal2");
  await page.goto(`/admin/collections/00000000-0000-4000-8000-000000000000/preview`);
  await expect(page.getByText("This collection is unavailable (NOT_FOUND")).toBeVisible();
});

// ---- Review (Task 9) ----

async function recordCampaigns() {
  await f.query(`INSERT INTO private.admin_campaign_snapshots(deployment_revision,configuration,configuration_hash)
    VALUES('synthetic-collections-review','{"campaigns":[]}','synthetic') ON CONFLICT (deployment_revision) DO NOTHING`);
  await f.query("UPDATE private.admin_console_settings SET campaign_revision='synthetic-collections-review' WHERE singleton");
}

/** Make the open draft fully checkable: current recipe references and every recipe confirmed as fitting. */
async function makeReady(page: Page, note: string) {
  await page.goto(`/admin/collections/${f.collectionId}/edit`);
  await expect(page.getByRole("status", { name: "Save status" })).not.toHaveText("Preparing editor");
  const refresh = page.getByRole("button", { name: "Use current recipe versions" });
  if (await refresh.isVisible()) {
    await refresh.click();
    await expect(page.getByText("Recipe references updated.")).toBeVisible();
  }
  for (const select of await page.getByLabel("Belongs here?").all()) await select.selectOption("accepted");
  await page.getByLabel("Tagline").fill(note);
  await page.getByLabel("Reason for this change").fill(note);
  const reopen = page.getByRole("checkbox", { name: /Reopen this/ });
  if (await reopen.isVisible()) await reopen.check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toContainText("Draft saved");
  await page.getByRole("link", { name: "Preview & changes" }).click();
  await expect(page.getByRole("region", { name: "Readiness" })).toContainText("Ready for review.");
}

async function submit(page: Page, note: string) {
  const review = page.getByRole("region", { name: "Review" });
  await review.getByLabel("Note for the reviewer").fill(note);
  await review.getByRole("button", { name: "Submit for review" }).click();
  await expect(review.getByRole("status", { name: "Review status" })).toHaveText("Submitted for review.");
  await expect(review).toContainText("Submitted by");
}

test("separated roles: an editor submits, a publisher cannot decide, a reviewer resolves an issue and approves", async ({ page }) => {
  await recordCampaigns();
  await f.login(page, "editor", "aal2");
  await makeReady(page, "Editor update");
  await submit(page, "Ready for a look");

  await page.context().clearCookies();
  await f.login(page, "publisher", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}/preview`);
  const review = page.getByRole("region", { name: "Review" });
  await expect(review).toContainText("Waiting for a reviewer.");
  await expect(review.getByRole("button", { name: "Approve this revision" })).toHaveCount(0);

  await page.context().clearCookies();
  await f.login(page, "reviewer", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}/preview`);
  await review.getByLabel("What needs to change").fill("The tagline repeats the title.");
  await review.getByRole("button", { name: "Record issue" }).click();
  await expect(review.getByRole("status", { name: "Review status" })).toHaveText("Issue recorded.");
  await expect(review.getByRole("heading", { name: "Open issues" })).toBeVisible();
  await review.getByLabel("Reason for your decision").fill("Looks right once the tagline is fine");
  await expect(review.getByRole("button", { name: "Approve this revision" })).toBeDisabled();
  await expect(review).toContainText("Resolve the blocking issues above to approve.");
  await review.getByRole("checkbox", { name: /Resolved: The tagline repeats the title/ }).check();
  await review.getByRole("button", { name: "Approve this revision" }).click();
  await expect(review.getByRole("status", { name: "Review status" })).toHaveText("Approved. This exact revision can now be published.");
  await expect(review).toContainText(/Approved revision \d+ by syn-coll-reviewe-/);
  const head = await f.query("SELECT state FROM private.collection_draft_heads WHERE collection_id=$1", [f.collectionId]);
  expect(head.rows[0].state).toBe("approved");
  const projection = await f.query("SELECT count(*)::int n FROM public.collection_publication_projection WHERE collection_id=$1", [f.collectionId]);
  expect(projection.rows[0].n).toBe(0);
});

test("editing approved content needs a reopen and sends it back for review, keeping the old decision", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}/edit`);
  await expect(page.getByRole("status", { name: "Save status" })).not.toHaveText("Preparing editor");
  await page.getByLabel("Tagline").fill("A change after approval");
  await page.getByLabel("Reason for this change").fill("Late change");
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: /Reopen this approved draft/ }).check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toContainText("Draft saved");
  await page.getByRole("link", { name: "Preview & changes" }).click();
  const review = page.getByRole("region", { name: "Review" });
  await expect(review.getByRole("button", { name: "Submit for review" })).toBeVisible();
  await expect(review.getByRole("heading", { name: "Decisions" })).toBeVisible();
  await expect(review).toContainText("Approved revision");
});

test("the owner may review their own submission", async ({ page }) => {
  await recordCampaigns();
  await f.login(page, "owner", "aal2");
  await makeReady(page, "Owner update");
  await submit(page, "Self review");
  const review = page.getByRole("region", { name: "Review" });
  await review.getByLabel("Reason for your decision").fill("Checked the preview");
  await review.getByRole("button", { name: "Approve this revision" }).click();
  await expect(review.getByRole("status", { name: "Review status" })).toHaveText("Approved. This exact revision can now be published.");
});

test("unknown campaign evidence keeps submission disabled", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await f.query("UPDATE private.admin_console_settings SET campaign_revision=NULL WHERE singleton");
  await page.goto(`/admin/collections/${f.collectionId}/edit`);
  await expect(page.getByRole("status", { name: "Save status" })).not.toHaveText("Preparing editor");
  await page.getByLabel("Tagline").fill("Unknown evidence");
  await page.getByLabel("Reason for this change").fill("Edit");
  const reopen = page.getByRole("checkbox", { name: /Reopen this/ });
  if (await reopen.isVisible()) await reopen.check();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toContainText("Draft saved");
  await page.getByRole("link", { name: "Preview & changes" }).click();
  const review = page.getByRole("region", { name: "Review" });
  await review.getByLabel("Note for the reviewer").fill("Try");
  await expect(review.getByRole("button", { name: "Submit for review" })).toBeDisabled();
  await expect(review).toContainText("Fix the items under Readiness before submitting.");
});
