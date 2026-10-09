import { expect, test, type Page } from "@playwright/test";
import { createCollectionsFixture, type CollectionsFixture } from "./collections-admin-fixtures";

test.describe.configure({ mode: "serial" });

let f: CollectionsFixture;
test.beforeAll(async () => {
  f = await createCollectionsFixture();
  await f.setCollectionStage("editing");
});
test.afterAll(async () => { await f?.dispose(); });

async function headRevision(): Promise<Record<string, unknown> | null> {
  const { rows } = await f.query(`SELECT r.version, r.snapshot, h.state FROM private.collection_draft_heads h
    JOIN private.collection_revisions r ON r.id=h.revision_id WHERE h.collection_id=$1`, [f.collectionId]);
  return rows[0] ?? null;
}

async function openEditor(page: Page) {
  await page.goto(`/admin/collections/${f.collectionId}`);
  const prepare = page.getByRole("button", { name: "Prepare update" });
  const edit = page.getByRole("link", { name: "Edit private draft" });
  await expect(prepare.or(edit)).toBeVisible();
  if (await prepare.isVisible()) await prepare.click();
  else await edit.click();
  await expect(page.getByRole("status", { name: "Save status" })).not.toHaveText("Preparing editor");
}

test("saving metadata and recipe additions leaves the public collection unchanged", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await openEditor(page);
  await page.getByLabel("Collection title").fill("Private title");
  await page.getByLabel("Search recipes to add").fill(f.extraRecipes.reviewed.title);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: `Add ${f.extraRecipes.reviewed.title}` }).click();
  await expect(page.getByRole("list", { name: "Draft recipes" }).getByText(f.extraRecipes.reviewed.title)).toBeVisible();
  await page.getByLabel("Reason for this change").fill("Add a recipe");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toContainText("Draft saved");

  const published = await f.query("SELECT title FROM public.recipe_collections WHERE id=$1", [f.collectionId]);
  expect(published.rows[0].title).toBe(f.title);
  const projection = await f.query("SELECT count(*)::int n FROM public.collection_publication_projection WHERE collection_id=$1", [f.collectionId]);
  expect(projection.rows[0].n).toBe(0);
  const head = await headRevision();
  expect((head?.snapshot as { title: string }).title).toBe("Private title");
  expect((head?.snapshot as { members: unknown[] }).members).toHaveLength(2);

  await page.getByRole("link", { name: "Back to collection" }).click();
  await expect(page.getByText("Private draft · revision", { exact: false })).toBeVisible();
  await expect(page.getByText("Published: 1 recipe. Private draft: 2 recipes, 1 added, 0 removed.")).toBeVisible();
});

test("a purchased recipe cannot be removed but can be reordered with the keyboard", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await openEditor(page);
  const purchased = f.recipeTitles[0];
  await expect(page.getByRole("button", { name: `Remove ${purchased}` })).toBeDisabled();
  await expect(page.getByText("Bought in an earlier release. Buyers keep it")).toBeVisible();
  await expect(page.getByRole("button", { name: `Remove ${f.extraRecipes.reviewed.title}` })).toBeEnabled();

  await page.getByRole("button", { name: `Move ${f.extraRecipes.reviewed.title} up` }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("list", { name: "Draft recipes" }).locator("li").first()).toContainText(f.extraRecipes.reviewed.title);
  await page.getByLabel("Reason for this change").fill("Reorder");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toContainText("Draft saved");
  const head = await headRevision();
  expect((head?.snapshot as { members: { recipeId: string }[] }).members.map((m) => m.recipeId))
    .toEqual([f.extraRecipes.reviewed.id, f.recipeIds[0]]);
});

test("an unreviewed recipe can sit in a draft but is flagged as blocking publication", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await openEditor(page);
  await page.getByLabel("Search recipes to add").fill(f.extraRecipes.unreviewed.title);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const result = page.getByRole("list", { name: "Recipe search results" }).getByRole("listitem").filter({ hasText: f.extraRecipes.unreviewed.title });
  await expect(result).toContainText("Not reviewed · blocks publication");
  await result.getByRole("button", { name: `Add ${f.extraRecipes.unreviewed.title}` }).click();
  await page.getByLabel("Reason for this change").fill("Try an unreviewed recipe");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toContainText("Draft saved");
  expect((await headRevision())?.snapshot as { members: unknown[] }).toMatchObject({ members: { length: 3 } });
});

test("no-change saves are explicit and leaving with unsaved edits asks first", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await openEditor(page);
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await page.getByLabel("Tagline").fill("Unsaved tagline");
  await expect(page.getByRole("status", { name: "Save status" })).toHaveText("Unsaved changes");
  await page.getByRole("link", { name: "Back to collection" }).click();
  await expect(page.getByRole("dialog", { name: "Unsaved collection changes" })).toBeVisible();
  await page.getByRole("button", { name: "Stay and keep editing" }).click();
  await expect(page.getByLabel("Tagline")).toHaveValue("Unsaved tagline");
});

test("a save after someone else's save keeps the edits and offers a comparison", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await openEditor(page);
  await page.getByLabel("Tagline").fill("My tagline");
  await page.getByLabel("Reason for this change").fill("Mine");
  // Another editor saves first.
  await f.query(`WITH h AS (SELECT h.revision_id, r.snapshot, r.base_publication_id, r.base_digest, r.saved_by
      FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id WHERE h.collection_id=$1),
    nr AS (INSERT INTO private.collection_revisions(collection_id,version,snapshot,digest,base_publication_id,base_digest,
      saved_by,executor_id,executor_type,operation_id,reason)
      SELECT $1,(SELECT max(version)+1 FROM private.collection_revisions WHERE collection_id=$1),
        jsonb_set(snapshot,'{story}','"Their story"'),private.collection_digest(jsonb_set(snapshot,'{story}','"Their story"')),
        base_publication_id,base_digest,saved_by,saved_by::text,'human',gen_random_uuid(),'Other editor' FROM h RETURNING id, version)
    UPDATE private.collection_draft_heads SET revision_id=nr.id, version=nr.version FROM nr WHERE collection_id=$1`, [f.collectionId]);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Save status" })).toContainText("Someone else changed this collection first");
  await expect(page.getByLabel("Tagline")).toHaveValue("My tagline");
  const compare = page.getByRole("region", { name: "Your edits compared with the latest draft" });
  await expect(compare).toContainText("Tagline differs");
  await expect(compare).toContainText("Story differs");
  await compare.getByRole("button", { name: "Load the latest draft" }).click();
  await expect(page.getByLabel("Story")).toHaveValue("Their story");
});

test("a new collection starts private, unlisted and empty", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.goto("/admin/collections");
  await page.getByRole("link", { name: "New collection" }).click();
  const title = `Synthetic new ${Date.now()}`;
  await page.getByLabel("Collection title").fill(title);
  await page.getByRole("button", { name: "Create private collection" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Edit private draft: ${title}` })).toBeVisible();
  await expect(page.getByText("0 recipes. Order here is the order on the collection page. There is no minimum or maximum.")).toBeVisible();
  const { rows } = await f.query("SELECT listing_state FROM public.recipe_collections WHERE title=$1", [title]);
  expect(rows[0].listing_state).toBe("unlisted");
});

test("the editor fits a 320px screen", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.setViewportSize({ width: 320, height: 720 });
  await openEditor(page);
  await expect(page.getByRole("list", { name: "Draft recipes" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("viewers see the workspace without editing controls", async ({ page }) => {
  await f.login(page, "viewer", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}`);
  await expect(page.getByRole("button", { name: "Prepare update" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit private draft" })).toHaveCount(0);
  await expect(page.getByText("Preparing changes needs collection edit permission.")).toBeVisible();
  await page.goto(`/admin/collections/${f.collectionId}/edit`);
  await expect(page.getByText("Editing collections needs edit permission")).toBeVisible();
});
