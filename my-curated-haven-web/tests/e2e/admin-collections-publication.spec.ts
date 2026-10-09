import { expect, test, type Page } from "@playwright/test";
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
  // The buyer bought release 1 before this console existed: a group with no additions decision yet.
  await f.query(`INSERT INTO private.access_sources(user_id,release_id,source_kind,source_id)
    SELECT $1::uuid, id, 'native_legacy', 'synthetic-legacy-' || $1::text FROM public.collection_releases WHERE collection_id=$2 AND version=1`,
  [f.customerId, f.collectionId]);
});
test.afterAll(async () => { await f?.dispose(); });

type Head = { revision_id: string; version: number; digest: string; snapshot: Record<string, unknown>;
  base_publication_id: string | null; base_digest: string; submission_id: string | null };

async function head(): Promise<Head | undefined> {
  return (await f.query(`SELECT h.revision_id, h.version, h.submission_id, r.digest, r.snapshot, r.base_publication_id, r.base_digest
    FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id WHERE h.collection_id=$1`,
  [f.collectionId])).rows[0] as Head | undefined;
}

/** A member reference to a recipe's current reviewed version, confirmed as fitting. */
async function member(recipeId: string) {
  const { rows } = await f.query(`SELECT c.slug, b.content_version, private.admin_active_hash(c.id) hash
    FROM public.recipe_catalog c JOIN public.recipe_bodies b ON b.recipe_id=c.id WHERE c.id=$1`, [recipeId]);
  return { recipeId, recipeSlug: rows[0].slug, contentVersion: rows[0].content_version, reviewDigest: rows[0].hash,
    tagsDigest: "b".repeat(64), placementNote: "", fit: "accepted" };
}

/** A fully checkable private draft with `patch` applied, saved as the owner. */
async function prepareDraft(patch: Record<string, unknown>): Promise<Head> {
  let current = await head();
  if (!current) {
    await f.rpcAs("owner", "admin_collection_draft_start", { collection_id: f.collectionId, operation_id: crypto.randomUUID(),
      reason: "Publication test" });
    current = (await head())!;
  }
  const members = [await member(f.recipeIds[0]), await member(f.extraRecipes.reviewed.id)];
  await f.rpcAs("owner", "admin_collection_draft_save", { collection_id: f.collectionId, operation_id: crypto.randomUUID(),
    reason: "Publication test", expected_version: current.version, expected_digest: current.digest,
    base: { publication_id: current.base_publication_id, digest: current.base_digest },
    snapshot: { ...current.snapshot, members, ...patch }, reopen_reviewed: true });
  return (await head())!;
}

async function impactToken(revisionId: string): Promise<string> {
  return (await f.query("SELECT private.collection_evaluate($1,$2)#>>'{value,token}' t", [f.collectionId, revisionId])).rows[0].t as string;
}

function exact(draft: Head, token: string) {
  return { collection_id: f.collectionId, revision_id: draft.revision_id, expected_version: draft.version,
    expected_digest: draft.digest, impact_token: token };
}

/** Publish the open draft directly through the RPC, as a server that crashed before its refresh would leave it. */
async function publishWithoutRefresh(note: string): Promise<Record<string, unknown>> {
  const draft = await prepareDraft({ tagline: note });
  const undecided = (await f.query("SELECT private.collection_unmapped_access($1) u", [f.collectionId])).rows[0].u as
    { releaseId: string; sourceKind: string }[];
  return f.rpcAs("owner", "admin_collection_publish", { ...exact(draft, await impactToken(draft.revision_id)),
    operation_id: crypto.randomUUID(), reason: note, base: { publication_id: draft.base_publication_id, digest: draft.base_digest },
    approve_now: true, access_decisions: undecided.map((u) => ({ release_id: u.releaseId, source_kind: u.sourceKind,
      policy: "additions-v1" })) });
}

async function publications(): Promise<number> {
  return (await f.query("SELECT count(*)::int n FROM private.collection_publications WHERE collection_id=$1 AND NOT imported",
    [f.collectionId])).rows[0].n as number;
}

async function openPublish(page: Page) {
  await page.goto(`/admin/collections/${f.collectionId}`);
  await page.getByRole("link", { name: "Review and publish" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Review collection effect" })).toBeVisible();
}

test("the owner sees the exact effect, decides buyer additions and approves and publishes in one step", async ({ page }) => {
  const draft = await prepareDraft({ tagline: "Owner one-step" });
  await f.login(page, "owner", "aal2");
  await openPublish(page);
  await expect(page.getByText(`${draft.snapshot.title as string} · revision ${draft.version}`)).toBeVisible();
  await expect(page.getByRole("region", { name: "Exact version" })).toContainText("Not approved yet.");
  await expect(page.getByRole("region", { name: "Recipes and page" })).toContainText(`Adds ${f.extraRecipes.reviewed.title}.`);
  const buyers = page.getByRole("region", { name: "Buyers" });
  await expect(buyers).toContainText("1 person has access today.");
  await expect(buyers).toContainText("No purchased recipe is removed.");
  const group = buyers.getByRole("group", { name: /release 1: 1 person/ });
  await expect(group).toBeVisible();
  await expect(page.getByRole("region", { name: "Sales and checkout" }))
    .toContainText("creates a new release and seals the current one for its buyers");

  const decision = page.getByRole("region", { name: "Your decision" });
  await expect(decision).toContainText(`approval of exactly revision ${draft.version} and its publication, in one step`);
  const publish = decision.getByRole("button", { name: "Approve and publish" });
  await decision.getByLabel("Reason for publishing").fill("Add the new recipe");
  await expect(publish).toBeDisabled();
  await expect(decision).toContainText("Choose what each buyer group receives.");
  await group.getByRole("radio", { name: "Give additions" }).check();

  const before = await publications();
  await publish.dblclick();
  await expect(page.getByRole("status", { name: "Publication status" })).toHaveText(`Published revision ${draft.version}.`);
  const receipts = page.getByRole("region", { name: "Publications" });
  await expect(receipts.getByRole("listitem").first()).toContainText("Updated");
  await expect(page.getByRole("button", { name: "Approve and publish" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Buyers" })).toHaveCount(0);
  expect(await publications()).toBe(before + 1);

  const { rows } = await f.query(`SELECT j.state, j.attempts, s.source_mode, pr.title
    FROM private.collection_refresh_jobs j JOIN private.collection_sources s ON s.collection_id=j.collection_id
    JOIN public.collection_publication_projection pr ON pr.publication_id=j.publication_id WHERE j.collection_id=$1`, [f.collectionId]);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ state: "complete", attempts: 1, source_mode: "database" });
  const policy = await f.query(`SELECT p.policy FROM private.collection_access_policies p JOIN public.collection_releases r
    ON r.id=p.release_id WHERE r.collection_id=$1 AND r.version=1`, [f.collectionId]);
  expect(policy.rows.map((r) => r.policy)).toContain("additions-v1");
});

test("a committed publication whose refresh never ran shows Refresh pending and retries without publishing again", async ({ page }) => {
  const receipt = await publishWithoutRefresh("Crashed before refresh");
  const before = await publications();
  await f.login(page, "owner", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}`);
  const receipts = page.getByRole("region", { name: "Publications" });
  const latest = receipts.getByRole("listitem").filter({ hasText: receipt.publicationId as string });
  await expect(latest.getByText("Refresh pending", { exact: true })).toBeVisible();
  await expect(latest).toContainText("The publication is committed.");
  await latest.getByRole("button", { name: "Retry refresh" }).click();
  await expect(receipts.getByRole("status", { name: "Refresh status" })).toHaveText("Public pages updated.");
  await expect(latest.getByText("Updated", { exact: true })).toBeVisible();
  expect(await publications()).toBe(before);
  const job = await f.query("SELECT state, attempts FROM private.collection_refresh_jobs WHERE operation_id=$1", [receipt.operationId]);
  expect(job.rows[0]).toMatchObject({ state: "complete", attempts: 1 });
});

test("a retry is refused once publication is switched off, and the refresh stays pending", async ({ page }) => {
  const receipt = await publishWithoutRefresh("Stage revoked before retry");
  await f.login(page, "owner", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}`);
  const latest = page.getByRole("region", { name: "Publications" }).getByRole("listitem")
    .filter({ hasText: receipt.publicationId as string });
  await expect(latest.getByRole("button", { name: "Retry refresh" })).toBeVisible();
  await f.setCollectionStage("editing");
  try {
    await latest.getByRole("button", { name: "Retry refresh" }).click();
    await expect(page.getByRole("status", { name: "Refresh status" })).toContainText("cannot be refreshed from here");
    const job = await f.query("SELECT state, attempts FROM private.collection_refresh_jobs WHERE operation_id=$1", [receipt.operationId]);
    expect(job.rows[0]).toMatchObject({ state: "pending", attempts: 0 });
  } finally {
    await f.setCollectionStage("publication");
  }
});

test("separated roles: a reviewer approves and cannot publish, a publisher publishes the approved revision", async ({ page }) => {
  const draft = await prepareDraft({ tagline: "Separated roles" });
  const token = await impactToken(draft.revision_id);
  await f.rpcAs("editor", "admin_collection_submit", { ...exact(draft, token), operation_id: crypto.randomUUID(),
    reason: "Ready for review" });
  const submitted = (await head())!;
  await f.rpcAs("reviewer", "admin_collection_review", { ...exact(submitted, token), operation_id: crypto.randomUUID(),
    reason: "Checked the effect", submission_id: submitted.submission_id, decision: "approve", resolved_issue_ids: [] });

  await f.login(page, "reviewer", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}/publish`);
  await expect(page.getByRole("region", { name: "Your decision" }))
    .toContainText("Publishing needs collection publish permission in the publication stage.");
  await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);

  await page.context().clearCookies();
  await f.login(page, "publisher", "aal2");
  await openPublish(page);
  await expect(page.getByRole("region", { name: "Exact version" })).toContainText(/Approved by syn-coll-reviewe-\S+ at .*Reason: Checked the effect/);
  const decision = page.getByRole("region", { name: "Your decision" });
  await expect(decision.getByRole("button", { name: "Approve and publish" })).toHaveCount(0);
  await decision.getByLabel("Reason for publishing").fill("Publish the approved update");
  await decision.getByRole("button", { name: "Publish approved revision" }).click();
  await expect(page.getByRole("status", { name: "Publication status" })).toHaveText(`Published revision ${draft.version}.`);
  const audit = await f.query(`SELECT a.reason FROM private.collection_audit a WHERE a.collection_id=$1 AND a.action='collection.publish'
    ORDER BY a.at DESC LIMIT 1`, [f.collectionId]);
  expect(audit.rows[0].reason).toBe("Publish the approved update");
});

test("publishing a revision identical to what is live reports no change and creates no publication", async ({ page }) => {
  expect(await head()).toBeUndefined();
  await f.rpcAs("owner", "admin_collection_draft_start", { collection_id: f.collectionId, operation_id: crypto.randomUUID(),
    reason: "Unchanged draft" });
  const before = await publications();
  await f.login(page, "owner", "aal2");
  await openPublish(page);
  await expect(page.getByRole("region", { name: "Recipes and page" })).toContainText("No page details change.");
  await expect(page.getByRole("region", { name: "Sales and checkout" })).toContainText("the current release and its offer stay as they are");
  const decision = page.getByRole("region", { name: "Your decision" });
  await decision.getByLabel("Reason for publishing").fill("Confirm nothing changed");
  await decision.getByRole("button", { name: "Approve and publish" }).click();
  await expect(page.getByRole("status", { name: "Publication status" }))
    .toHaveText("Nothing changed. This revision matches what is already published.");
  expect(await publications()).toBe(before);
  expect(await head()).toBeUndefined();
});

test("a page left open while the draft changes publishes nothing and points back to the evidence", async ({ page }) => {
  await prepareDraft({ tagline: "Stale page" });
  await f.login(page, "owner", "aal2");
  await openPublish(page);
  const decision = page.getByRole("region", { name: "Your decision" });
  // Every buyer group was decided by the first publication, so only the reason is needed now.
  await expect(page.getByRole("region", { name: "Buyers" })).toContainText("already has a recorded decision");
  await decision.getByLabel("Reason for publishing").fill("Publish what I saw");
  await prepareDraft({ tagline: "Someone else changed it" });
  const before = await publications();
  await decision.getByRole("button", { name: "Approve and publish" }).click();
  const status = page.getByRole("status", { name: "Publication status" });
  await expect(status).toContainText("Nothing was published.");
  await expect(status).toBeFocused();
  await expect(page.getByRole("link", { name: "Back to Preview & changes" })).toBeVisible();
  expect(await publications()).toBe(before);
});

test("the publish page fits a 320px screen", async ({ page }) => {
  await prepareDraft({ tagline: "Narrow screen" });
  await f.login(page, "owner", "aal2");
  await page.setViewportSize({ width: 320, height: 720 });
  await openPublish(page);
  await expect(page.getByRole("region", { name: "Publications" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("history copies an earlier publication into a new draft that keeps today's purchased recipes", async ({ page }) => {
  const open = await head();
  if (open) {
    await f.rpcAs("owner", "admin_collection_draft_control", { collection_id: f.collectionId, operation_id: crypto.randomUUID(),
      reason: "Clear for copy", action: "discard", expected_digest: open.digest, reference_id: null });
  }
  await f.login(page, "owner", "aal2");
  await page.goto(`/admin/collections/${f.collectionId}`);
  const history = page.getByRole("region", { name: "History" });
  const copies = history.getByRole("button", { name: "Copy into new draft" });
  await expect(copies.first()).toBeVisible();
  await copies.last().click();
  await expect(page.getByRole("heading", { level: 1, name: /^Edit private draft: / })).toBeVisible();
  const draft = (await head())!;
  const members = (draft.snapshot.members as { recipeId: string }[]).map((m) => m.recipeId);
  const protectedIds = (await f.query("SELECT recipe_id FROM private.collection_protected_members($1)", [f.collectionId]))
    .rows.map((r) => r.recipe_id as string);
  expect(protectedIds.length).toBeGreaterThan(0);
  for (const id of protectedIds) expect(members).toContain(id);
});
