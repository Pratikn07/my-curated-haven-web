import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { createCollectionsFixture, type CollectionsFixture } from "./collections-admin-fixtures";

test.describe.configure({ mode: "serial" });

let f: CollectionsFixture;
let recipeId: string;
let slug: string;
const objectName = `synth-corr-${crypto.randomBytes(3).toString("hex")}.webp`;
const storage = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  { auth: { persistSession: false } }).storage.from("recipe-previews");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test.beforeAll(async () => {
  f = await createCollectionsFixture();
  await f.setCollectionStage("publication");
  await f.recordCampaigns();
  recipeId = f.recipeIds[0];
  slug = (await f.query("SELECT slug FROM public.recipe_catalog WHERE id=$1", [recipeId])).rows[0].slug as string;
  // A published recipe in a collection with a live offer on sale: people can buy it.
  const upload = await storage().upload(objectName, PNG, { contentType: "image/webp", upsert: true });
  if (upload.error) throw new Error(`Image upload failed: ${upload.error.message}`);
  await f.query("UPDATE public.recipe_catalog SET preview_image_path=$2, publication_state='published' WHERE id=$1",
    [recipeId, `recipe-previews/${objectName}`]);
  await f.query(`UPDATE private.commercial_offers SET provider_mode='live', sale_enabled=true
    WHERE release_id IN (SELECT id FROM public.collection_releases WHERE collection_id=$1)`, [f.collectionId]);
});
test.afterAll(async () => {
  await storage().remove([objectName]);
  await f?.dispose();
});

/** Edit the title through the recipe editor, then submit and approve it as the owner. */
async function approveTitle(page: Page, title: string) {
  await page.goto(`/admin/recipes/${recipeId}/edit`);
  await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Editor ready" })).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Reason").fill("Correct the title");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved at" })).toBeVisible();
  await page.getByRole("button", { name: "Check availability" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Available, checked at" })).toBeVisible();
  await page.goto(`/admin/recipes/${recipeId}`);
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Awaiting review" })).toBeVisible();
  await page.getByLabel("Review reason").fill("Checked the correction");
  await page.getByRole("button", { name: "Approve this revision", exact: true }).click();
  await expect(page.getByText("This revision is approved and ready to publish.", { exact: true })).toBeVisible();
}

test("a purchased recipe publishes only as an acknowledged correction, and its buyer sees it", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await approveTitle(page, "Corrected synthetic title");
  await page.goto(`/admin/recipes/${recipeId}/publish`);
  const notice = page.getByRole("region", { name: "Correction to a purchased recipe" });
  await expect(notice).toContainText("existing buyers and every other reader will see the corrected version");
  await expect(notice.getByRole("list", { name: "Collections this correction reaches" })).toContainText(`${f.title}: release 1 (published)`);
  const publish = page.getByRole("button", { name: "Publish correction" });
  await expect(publish).toBeDisabled();
  await page.getByLabel("I understand this corrects the recipe for everyone who can open it, including existing buyers").check();
  await publish.click();
  await page.getByLabel("Reason", { exact: true }).fill("Fix the title buyers see");
  await page.getByRole("button", { name: "Confirm correction" }).click();
  // The page re-renders once the refresh revalidates it; either the success message or the committed receipt shows.
  await expect(page.getByRole("status").filter({ hasText: "Correction published." })
    .or(page.getByRole("heading", { name: "Committed receipt" }))).toBeVisible();

  const { rows } = await f.query(`SELECT c.title,
      (SELECT count(*)::int FROM private.admin_audit WHERE action='recipe.correct' AND recipe_id=c.id) corrections,
      (SELECT count(*)::int FROM private.recipe_active_archives WHERE kind='correction' AND recipe_id=c.id) archives,
      (SELECT count(*)::int FROM public.collection_recipes WHERE recipe_id=c.id) memberships,
      (SELECT bool_and(sale_enabled) FROM private.commercial_offers o JOIN public.collection_releases r ON r.id=o.release_id
        WHERE r.collection_id=$2) on_sale
    FROM public.recipe_catalog c WHERE c.id=$1`, [recipeId, f.collectionId]);
  expect(rows[0]).toMatchObject({ title: "Corrected synthetic title", corrections: 1, archives: 1, memberships: 1, on_sale: true });

  await page.context().clearCookies();
  await f.login(page, "customer", "aal1");
  await page.goto(`/recipes/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: "Corrected synthetic title" })).toBeVisible();
});

test("a campaign promise keeps the correction blocked", async ({ page }) => {
  // A revision unique to this fixture: recorded campaign snapshots are kept, so a reused name would hold an old slug.
  const revision = `synthetic-correction-${slug}`;
  await f.query(`INSERT INTO private.admin_campaign_snapshots(deployment_revision,configuration,configuration_hash)
    VALUES($1,$2,'synthetic') ON CONFLICT (deployment_revision) DO NOTHING`,
  [revision, JSON.stringify({ campaigns: [{ slug: "synthetic-correction", recipeSlugs: [slug] }] })]);
  await f.query("UPDATE private.admin_console_settings SET campaign_revision=$1 WHERE singleton", [revision]);
  try {
    await f.login(page, "owner", "aal2");
    await approveTitle(page, "Second corrected title");
    await page.goto(`/admin/recipes/${recipeId}/publish`);
    const notice = page.getByRole("region", { name: "Correction to a purchased recipe" });
    await expect(notice).toContainText("A campaign promises this recipe. A correction stays blocked");
    await page.getByLabel("I understand this corrects the recipe for everyone who can open it, including existing buyers").check();
    await expect(page.getByRole("button", { name: "Publish correction" })).toBeDisabled();
  } finally {
    await f.recordCampaigns();
  }
});

test("the correction notice fits a 320px screen", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`/admin/recipes/${recipeId}/publish`);
  await expect(page.getByRole("region", { name: "Correction to a purchased recipe" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
