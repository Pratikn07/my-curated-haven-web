import { expect, test } from "@playwright/test";
import crypto from "node:crypto";
import { createCollectionsFixture, deleteCollectionsBySlug, type CollectionsFixture } from "./collections-admin-fixtures";

// Needs a build with COLLECTIONS_SOURCE_BACKEND=registry; the default legacy build never reads collections
// from the database.
test.describe.configure({ mode: "serial" });
test.skip(process.env.COLLECTIONS_SOURCE_BACKEND !== "registry", "storefront registry mode only");

let f: CollectionsFixture;
test.beforeAll(async () => {
  await deleteCollectionsBySlug("halloween");
  f = await createCollectionsFixture();
  await f.setCollectionStage("publication");
  await f.recordCampaigns();
  await f.query("UPDATE public.recipe_catalog SET publication_state='published' WHERE id = ANY($1)",
    [[f.recipeIds[0], f.extraRecipes.reviewed.id]]);
});
test.afterAll(async () => {
  await deleteCollectionsBySlug("halloween");
  await f?.dispose();
});

/** A member reference to a recipe's current reviewed version, confirmed as fitting. */
async function member(recipeId: string) {
  const { rows } = await f.query(`SELECT c.slug, b.content_version, private.admin_active_hash(c.id) hash
    FROM public.recipe_catalog c JOIN public.recipe_bodies b ON b.recipe_id=c.id WHERE c.id=$1`, [recipeId]);
  return { recipeId, recipeSlug: rows[0].slug, contentVersion: rows[0].content_version, reviewDigest: rows[0].hash,
    tagsDigest: "b".repeat(64), placementNote: "", fit: "accepted" };
}

/** Save the open draft with `patch`, then approve and publish it as the owner, deciding any buyer groups. */
async function publish(collectionId: string, patch: Record<string, unknown>) {
  const head = async () => (await f.query(`SELECT h.revision_id, h.version, r.digest, r.snapshot, r.base_publication_id, r.base_digest
    FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id WHERE h.collection_id=$1`,
  [collectionId])).rows[0];
  let current = await head();
  if (!current) {
    await f.rpcAs("owner", "admin_collection_draft_start", { collection_id: collectionId, operation_id: crypto.randomUUID(),
      reason: "Storefront test" });
    current = await head();
  }
  await f.rpcAs("owner", "admin_collection_draft_save", { collection_id: collectionId, operation_id: crypto.randomUUID(),
    reason: "Storefront test", expected_version: current.version, expected_digest: current.digest,
    base: { publication_id: current.base_publication_id, digest: current.base_digest },
    snapshot: { ...(current.snapshot as Record<string, unknown>), ...patch }, reopen_reviewed: true });
  current = await head();
  const token = (await f.query("SELECT private.collection_evaluate($1,$2)#>>'{value,token}' t", [collectionId, current.revision_id])).rows[0].t;
  const undecided = (await f.query("SELECT private.collection_unmapped_access($1) u", [collectionId])).rows[0].u as
    { releaseId: string; sourceKind: string }[];
  return f.rpcAs("owner", "admin_collection_publish", { collection_id: collectionId, operation_id: crypto.randomUUID(),
    reason: "Storefront test", revision_id: current.revision_id, expected_version: current.version, expected_digest: current.digest,
    impact_token: token, base: { publication_id: current.base_publication_id, digest: current.base_digest }, approve_now: true,
    access_decisions: undecided.map((u) => ({ release_id: u.releaseId, source_kind: u.sourceKind, policy: "additions-v1" })) });
}

test("published database contents replace the imported contents of a collection", async ({ page }) => {
  const receipt = await publish(f.collectionId, { title: "Published database title",
    members: [await member(f.recipeIds[0]), await member(f.extraRecipes.reviewed.id)] });
  expect(receipt.noChange).toBe(false);
  await page.goto(`/collections/${f.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: "Published database title" })).toBeVisible();
  const contents = page.locator(".cl-contents");
  await expect(contents.getByText(f.extraRecipes.reviewed.title)).toBeVisible();
  await expect(contents.getByText(f.recipeTitles[0])).toBeVisible();
  await expect(contents).toContainText("2 recipes");
});

test("a configured collection switched to the database is served only from its publication", async ({ page }) => {
  const collectionId = crypto.randomUUID();
  await f.rpcAs("owner", "admin_collection_create", { collection_id: collectionId, operation_id: crypto.randomUUID(),
    reason: "Storefront override", snapshot: { collectionId, slug: "halloween", title: "Synthetic Halloween override",
      tagline: "From the database", story: "Database story.", forWhen: "", refresh: "", shelf: "seasons-and-parties",
      sortOrder: 1, stage: { min: null, max: null }, series: null, listingState: "listed", availability: "open",
      cloth: "rust", cover: null, members: [] } });
  await publish(collectionId, { members: [await member(f.extraRecipes.reviewed.id)] });
  await page.goto("/collections/halloween");
  await expect(page.getByRole("heading", { level: 1, name: "Synthetic Halloween override" })).toBeVisible();
  const contents = page.locator(".cl-contents");
  await expect(contents).toContainText("1 recipe");
  await expect(contents.getByText(f.extraRecipes.reviewed.title)).toBeVisible();
});

test("an untouched configured collection still renders from its configuration", async ({ page }) => {
  await page.goto("/collections/first-tastes");
  await expect(page.getByRole("heading", { level: 1, name: "First Tastes" })).toBeVisible();
  await expect(page.locator(".cl-contents")).toContainText("8 recipes");
});
