import { expect, test, type Page } from "@playwright/test";
import crypto from "node:crypto";
import { createCollectionsFixture, type CollectionsFixture } from "./collections-admin-fixtures";

test.describe.configure({ mode: "serial" });

// A buyer of the original release, a successor release that adds one recipe, and the buyer-facing pages.
let f: CollectionsFixture;
let originalSlug = "";
let additionSlug = "";
const successorReleaseId = crypto.randomUUID();
const successorPublicationId = crypto.randomUUID();

test.beforeAll(async () => {
  f = await createCollectionsFixture();
  const original = f.recipeIds[0];
  const addition = f.extraRecipes.reviewed.id;
  await f.query("UPDATE public.recipe_catalog SET publication_state='published' WHERE id = ANY($1)", [[original, addition]]);
  originalSlug = (await f.query("SELECT slug FROM public.recipe_catalog WHERE id=$1", [original])).rows[0].slug as string;
  additionSlug = (await f.query("SELECT slug FROM public.recipe_catalog WHERE id=$1", [addition])).rows[0].slug as string;
  await f.query(`INSERT INTO private.access_sources(user_id,release_id,source_kind,source_id)
    SELECT $1, release_id, 'native_legacy', 'syn-access-' || $2 FROM public.access_entitlements WHERE user_id=$1`,
  [f.customerId, f.slug]);
  await f.query("INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES($1,$2,2,'published')",
    [successorReleaseId, f.collectionId]);
  await f.query("INSERT INTO public.collection_recipes(release_id,recipe_id,position) VALUES($1,$2,1),($1,$3,2)",
    [successorReleaseId, original, addition]);
  await f.query(`INSERT INTO private.collection_publications(id,collection_id,release_id,snapshot,digest,imported,operation_id,executor_id)
    SELECT $1, p.collection_id, $2, p.snapshot, p.digest, true, gen_random_uuid(), 'synthetic-successor'
    FROM private.collection_publications p JOIN private.collection_active_publications a ON a.publication_id=p.id
    WHERE a.collection_id=$3`, [successorPublicationId, successorReleaseId, f.collectionId]);
  await f.query("UPDATE private.collection_active_publications SET publication_id=$1 WHERE collection_id=$2",
    [successorPublicationId, f.collectionId]);
});
test.afterAll(async () => { await f?.dispose(); });

async function expectReadable(page: Page, slug: string) {
  await page.goto(`/recipes/${slug}`);
  await expect(page.getByText("Your Collection Recipe", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
}

async function expectLocked(page: Page, slug: string) {
  await page.goto(`/recipes/${slug}`);
  await expect(page.getByRole("heading", { name: "Collection Recipe", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ingredients" })).toHaveCount(0);
}

test("without an approved policy a buyer keeps the original recipes only", async ({ page }) => {
  await f.login(page, "customer", "aal1");
  await expectReadable(page, originalSlug);
  await expectLocked(page, additionSlug);
});

test("with an approved additions policy the buyer reads the added recipe, with no new purchase", async ({ page }) => {
  const before = await f.query(`SELECT (SELECT count(*) FROM public.access_entitlements WHERE user_id=$1)::int e,
    (SELECT count(*) FROM private.purchase_orders WHERE user_id=$1)::int o`, [f.customerId]);
  await f.query(`INSERT INTO private.collection_access_policies(release_id,source_kind,policy,approved_by,approval_reason)
    SELECT release_id,'native_legacy','additions-v1',$2,'Synthetic policy' FROM public.access_entitlements WHERE user_id=$1`,
  [f.customerId, f.ownerId]);
  await f.login(page, "customer", "aal1");
  await expectReadable(page, additionSlug);
  await expectReadable(page, originalSlug);

  await page.goto("/account/collections");
  const entry = page.getByRole("heading", { name: f.title });
  await expect(entry).toHaveCount(1);
  await expect(page.getByRole("link", { name: f.extraRecipes.reviewed.title })).toBeVisible();
  await expect(page.getByRole("link", { name: f.recipeTitles[0] })).toBeVisible();

  const after = await f.query(`SELECT (SELECT count(*) FROM public.access_entitlements WHERE user_id=$1)::int e,
    (SELECT count(*) FROM private.purchase_orders WHERE user_id=$1)::int o`, [f.customerId]);
  expect(after.rows[0]).toEqual(before.rows[0]);
});

test("visitors and other signed-in people stay locked out of the addition", async ({ page }) => {
  await expectLocked(page, additionSlug);
  await f.login(page, "viewer", "aal1");
  await expectLocked(page, additionSlug);
});
