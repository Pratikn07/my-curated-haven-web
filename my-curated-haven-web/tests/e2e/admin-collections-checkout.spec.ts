import { expect, test } from "@playwright/test";
import { createCollectionsFixture, type CollectionsFixture } from "./collections-admin-fixtures";

test.describe.configure({ mode: "serial" });

// The fixture collection is sold through a test-mode offer. The fixture customer already owns it; the
// viewer account plays a new buyer.
let f: CollectionsFixture;
test.beforeAll(async () => {
  f = await createCollectionsFixture();
  await f.query(`UPDATE private.commercial_offers SET sale_enabled=true WHERE release_id IN
    (SELECT id FROM public.collection_releases WHERE collection_id=$1)`, [f.collectionId]);
});
test.afterAll(async () => { await f?.dispose(); });

test("a stale page is refreshed instead of charged, and the order freezes what the refreshed page showed", async ({ page }) => {
  await f.login(page, "viewer", "aal1");
  await page.goto(`/collections/${f.slug}`);
  const buy = page.getByRole("button", { name: /Buy Collection/ });
  await expect(buy).toBeVisible();
  const before = JSON.parse((await buy.getAttribute("data-checkout-expected")) ?? "null");
  expect(before).toMatchObject({ offerId: expect.any(String) });

  // The offer's terms change while the page is open.
  await f.query(`UPDATE private.commercial_offers SET terms_version='synthetic-terms-2' WHERE release_id IN
    (SELECT id FROM public.collection_releases WHERE collection_id=$1)`, [f.collectionId]);
  await buy.click();
  await page.waitForLoadState("load");
  await expect(page.getByRole("button", { name: /Buy Collection/ })).toBeVisible();
  const after = JSON.parse((await page.getByRole("button", { name: /Buy Collection/ }).getAttribute("data-checkout-expected")) ?? "null");
  expect(after.sourceDigest).not.toBe(before.sourceDigest);
  const none = await f.query(`SELECT count(*)::int n FROM private.purchase_orders po JOIN public.collection_releases r ON r.id=po.release_id
    WHERE r.collection_id=$1`, [f.collectionId]);
  expect(none.rows[0].n).toBe(0);

  await page.getByRole("button", { name: /Buy Collection/ }).click();
  await expect(page).toHaveURL(/\/checkout\/return\?session_id=cs_test_mock_/);
  const order = await f.query(`SELECT po.snapshot FROM private.purchase_orders po JOIN public.collection_releases r ON r.id=po.release_id
    WHERE r.collection_id=$1`, [f.collectionId]);
  expect(order.rows).toHaveLength(1);
  expect(order.rows[0].snapshot).toMatchObject({ terms_version: "synthetic-terms-2", manifest_hash: after.manifestHash,
    source_digest: after.sourceDigest, member_recipe_ids: [f.recipeIds[0]] });
});

test("an existing buyer is shown ownership, not a second purchase", async ({ page }) => {
  await f.login(page, "customer", "aal1");
  await page.goto(`/collections/${f.slug}`);
  await expect(page.getByRole("button", { name: /Buy Collection/ })).toHaveCount(0);
});

test("with no enabled offer the page says purchase is unavailable", async ({ page }) => {
  await f.query(`UPDATE private.commercial_offers SET sale_enabled=false WHERE release_id IN
    (SELECT id FROM public.collection_releases WHERE collection_id=$1)`, [f.collectionId]);
  await f.login(page, "reviewer", "aal1");
  await page.goto(`/collections/${f.slug}`);
  await expect(page.getByRole("button", { name: /Buy Collection/ })).toHaveCount(0);
});
