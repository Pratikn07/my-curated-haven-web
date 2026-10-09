import { expect, test } from "@playwright/test";
import crypto from "node:crypto";
import { createCollectionsFixture, type CollectionsFixture } from "./collections-admin-fixtures";

test.describe.configure({ mode: "serial" });

let f: CollectionsFixture;
test.beforeAll(async () => {
  f = await createCollectionsFixture();
  await f.setCollectionStage("publication");
  await f.recordCampaigns();
  await f.query("UPDATE public.recipe_catalog SET publication_state='published' WHERE id = ANY($1)",
    [[f.recipeIds[0], f.extraRecipes.reviewed.id]]);
});
test.afterAll(async () => { await f?.dispose(); });

test("while collections are switched off, /admin keeps opening Recipes and there is no Home", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await f.setCollectionStage("disabled");
  try {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/recipes(?:\?|$)/);
    await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Home" })).toHaveCount(0);
  } finally {
    await f.setCollectionStage("publication");
  }
});

test("the owner sees both publishing lanes, their own drafts and a committed result with refresh pending", async ({ page }) => {
  const receipt = await f.publishWithoutRefresh("Home result");
  // A new draft submitted for review needs a decision and is work the owner can continue.
  const draft = await f.prepareDraft({ tagline: "Waiting for review" });
  await f.rpcAs("owner", "admin_collection_submit", { collection_id: f.collectionId, operation_id: crypto.randomUUID(),
    reason: "Ready", revision_id: draft.revision_id, expected_version: draft.version, expected_digest: draft.digest,
    impact_token: await f.impactToken(draft.revision_id) });

  await f.login(page, "owner", "aal2");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");

  const recipes = page.getByRole("region", { name: "Recipes" });
  await expect(recipes).toContainText(/Need attention: \d+ · Awaiting review: \d+ · Ready to publish: \d+/);
  const collections = page.getByRole("region", { name: "Collections" });
  await expect(collections).toContainText(/Need a decision: \d+/);
  const row = collections.getByRole("listitem").filter({ hasText: f.title });
  await expect(row).toContainText("Submitted for review");
  await expect(row.getByRole("link", { name: `Open ${f.title}` })).toHaveAttribute("href", `/admin/collections/${f.collectionId}`);

  const work = page.getByRole("region", { name: "Continue work" }).getByRole("listitem").filter({ hasText: f.title });
  await expect(work).toContainText(`Collection · Submitted for review · revision ${draft.version} · saved by you`);

  const results = page.getByRole("region", { name: "Recent results" });
  const result = results.getByRole("listitem").filter({ hasText: f.title });
  await expect(result).toContainText("Collection published: Committed; refresh pending");
  await expect(page.getByText("Customer support")).toHaveCount(0);

  // Opening a result goes through the protected workspace, which shows the same receipt and its retry.
  await result.getByRole("link", { name: `Open ${f.title}` }).first().click();
  const receipts = page.getByRole("region", { name: "Publications" });
  await expect(receipts.getByRole("listitem").filter({ hasText: receipt.publicationId as string })).toContainText("Refresh pending");
});

test("a failing collection source shows Unavailable while recipes stay useful", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await f.query("REVOKE EXECUTE ON FUNCTION public.admin_collection_library(jsonb) FROM authenticated");
  try {
    await page.goto("/admin");
    const collections = page.getByRole("region", { name: "Collections" });
    await expect(collections.getByRole("status")).toContainText("Collections needing a decision are unavailable");
    await expect(collections).toContainText("This is unknown, not zero.");
    await expect(collections).not.toContainText("Need a decision: 0");
    await expect(page.getByRole("region", { name: "Recipes" })).toContainText(/Need attention: \d+/);
  } finally {
    await f.query("GRANT EXECUTE ON FUNCTION public.admin_collection_library(jsonb) TO authenticated");
  }
});

test("a viewer has no drafts to continue and only their own results", async ({ page }) => {
  await f.login(page, "viewer", "aal2");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Continue work" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Recent results" })).toContainText("You have no recent publication results.");
});

test("an aal1 session sees the verification gate and no Home data", async ({ page }) => {
  await f.login(page, "owner", "aal1");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toHaveCount(0);
  await expect(page.getByText("Recent results")).toHaveCount(0);
  await expect(page.getByText(f.title)).toHaveCount(0);
});

test("Home fits a 320px screen and its links are reachable in reading order", async ({ page }) => {
  await f.login(page, "owner", "aal2");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const links = await page.locator("#admin-main a").evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().top));
  expect(links).toEqual([...links].sort((a, b) => a - b));
});
