import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { Client } from "pg";
import { createCollectionsFixture, type CollectionsFixture } from "./collections-admin-fixtures";

// Races between independent database sessions with explicit barriers: the second session is released only
// once pg_stat_activity shows it waiting on a lock, never after a guessed delay. Synthetic JWT claims are set
// only on these isolated loopback test connections. No browser is involved, so one project runs it.
test.describe.configure({ mode: "serial" });

function databaseUrl(): string {
  const raw = process.env.ADMIN_TEST_DATABASE_URL;
  if (!raw || !["127.0.0.1", "localhost"].includes(new URL(raw).hostname)) {
    throw new Error("Concurrency fixtures require a configured loopback database");
  }
  return raw;
}

async function plain(): Promise<Client> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  return client;
}

/** A separate session acting as a staff member, as PostgREST would after verifying the JWT. */
async function session(userId: string): Promise<Client> {
  const client = await plain();
  await client.query("SELECT set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)",
    [userId, JSON.stringify({ sub: userId, aal: "aal2", role: "authenticated" })]);
  await client.query("SET ROLE authenticated");
  return client;
}

async function backendPid(client: Client): Promise<number> {
  return (await client.query("SELECT pg_backend_pid() p")).rows[0].p as number;
}

/** Barrier: resolve once `pid` waits on a lock; fail (with how the statement ended) if it never does. */
async function waitUntilBlocked(monitor: Client, pid: number, statement: Promise<unknown>): Promise<void> {
  let settled: unknown;
  void statement.then((value) => { settled = value ?? "finished"; }, (error) => { settled = error; });
  const deadline = Date.now() + 4000;
  for (;;) {
    const { rows } = await monitor.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1", [pid]);
    if (rows[0]?.wait_event_type === "Lock") return;
    if (settled !== undefined || Date.now() > deadline) {
      throw new Error(`session ${pid} never waited on a lock (${settled === undefined ? "still running" : String(settled)})`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/** Run a statement and report "committed" or the error message, never throwing. */
function outcome(promise: Promise<unknown>): Promise<string> {
  return promise.then(() => "committed", (error: Error) => error.message);
}

let f: CollectionsFixture;
const clients: Client[] = [];
async function open(userId?: string): Promise<Client> {
  const client = userId ? await session(userId) : await plain();
  clients.push(client);
  return client;
}

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "database sessions only; one project is enough");
  f = await createCollectionsFixture();
  await f.setCollectionStage("publication");
  await f.recordCampaigns();
  await f.query("UPDATE public.recipe_catalog SET publication_state='published' WHERE id = ANY($1)",
    [[f.recipeIds[0], f.extraRecipes.reviewed.id]]);
});

test.afterEach(async ({}, testInfo) => {
  if (testInfo.project.name !== "chromium-desktop") return;
  for (const client of clients.splice(0)) await client.end().catch(() => undefined);
  await f?.dispose();
});

async function nonImportedPublications(collectionId: string): Promise<number> {
  return (await f.query("SELECT count(*)::int n FROM private.collection_publications WHERE collection_id=$1 AND NOT imported",
    [collectionId])).rows[0].n as number;
}

test("two publishers cannot commit the same stale base twice", async () => {
  await f.prepareDraft({ tagline: "Race" });
  const commandA = await f.buildPublishCommand();
  const commandB = { ...commandA, operation_id: crypto.randomUUID() };
  const [a, b, monitor] = [await open(f.ownerId), await open(f.ownerId), await open()];
  const revisionsBefore = (await f.query("SELECT count(*)::int n FROM private.collection_revisions WHERE collection_id=$1",
    [f.collectionId])).rows[0].n;

  const bPid = await backendPid(b);
  await a.query("BEGIN");
  await a.query("SELECT public.admin_collection_publish($1::jsonb)", [commandA]);
  const loser = outcome(b.query("SELECT public.admin_collection_publish($1::jsonb)", [commandB]));
  await waitUntilBlocked(monitor, bPid, loser);
  await a.query("COMMIT");

  expect(await loser).toBe("ADM_CONFLICT");
  expect(await nonImportedPublications(f.collectionId)).toBe(1);
  const manifests = await f.query(`SELECT count(*)::int n FROM private.release_manifests m JOIN public.collection_releases r
    ON r.id=m.release_id WHERE r.collection_id=$1`, [f.collectionId]);
  expect(manifests.rows[0].n).toBe(1);
  const revisions = await f.query("SELECT count(*)::int n FROM private.collection_revisions WHERE collection_id=$1", [f.collectionId]);
  expect(revisions.rows[0].n).toBe(revisionsBefore);
  const losing = await f.query("SELECT count(*)::int n FROM private.collection_operations WHERE operation_id=$1",
    [commandB.operation_id]);
  expect(losing.rows[0].n).toBe(0);
});

test("two collections cannot both take the same series volume; the loser keeps its draft", async () => {
  const series = { key: "breakfast", volume: 77 };
  await f.prepareDraft({ series });
  const other = crypto.randomUUID();
  await f.rpcAs("owner", "admin_collection_create", { collection_id: other, operation_id: crypto.randomUUID(),
    reason: "Second series candidate", snapshot: { collectionId: other, slug: `synthetic-new-volume-${other.slice(0, 8)}`,
      title: "Synthetic second volume", tagline: "", story: "Synthetic story.", forWhen: "", refresh: "", shelf: "mornings",
      sortOrder: 2, stage: { min: null, max: null }, series: null, listingState: "unlisted", availability: "open",
      cloth: "sage", cover: null, members: [] } });
  await f.prepareDraft({ series }, other);
  const commandX = await f.buildPublishCommand();
  const commandY = await f.buildPublishCommand(other);
  const [a, b, monitor] = [await open(f.ownerId), await open(f.ownerId), await open()];

  const bPid = await backendPid(b);
  await a.query("BEGIN");
  await a.query("SELECT public.admin_collection_publish($1::jsonb)", [commandX]);
  const loser = outcome(b.query("SELECT public.admin_collection_publish($1::jsonb)", [commandY]));
  await waitUntilBlocked(monitor, bPid, loser);
  await a.query("COMMIT");

  expect(await loser).toBe("ADM_CONFLICT");
  expect(await nonImportedPublications(f.collectionId)).toBe(1);
  expect(await nonImportedPublications(other)).toBe(0);
  expect(await f.head(other)).toBeDefined();
});

test("checkout and publication serialise on the collection and every order keeps the promise it froze", async () => {
  await f.query(`UPDATE private.commercial_offers SET sale_enabled=true
    WHERE release_id IN (SELECT id FROM public.collection_releases WHERE collection_id=$1)`, [f.collectionId]);
  const sellable = async () => (await f.query("SELECT private.collection_sellable($1) - 'offer' - 'memberIds' e",
    [f.collectionId])).rows[0].e as Record<string, unknown>;
  const reserve = (client: Client, expected: Record<string, unknown>) => client.query(
    "SELECT private.reserve_collection_order($1,$2,$3::jsonb,$4) r", [f.ownerId, f.collectionId, expected, `race-${crypto.randomUUID()}`]);

  // Publication first: the waiting checkout sees the new release and is told to refresh.
  const before = await sellable();
  await f.prepareDraft({ tagline: "Adds a recipe" });
  const command = await f.buildPublishCommand();
  const [publisher, buyer, monitor] = [await open(f.ownerId), await open(), await open()];
  const [publisherPid, buyerPid] = [await backendPid(publisher), await backendPid(buyer)];
  await publisher.query("BEGIN");
  await publisher.query("SELECT public.admin_collection_publish($1::jsonb)", [command]);
  const waiting = buyer.query("SELECT private.reserve_collection_order($1,$2,$3::jsonb,$4) r",
    [f.ownerId, f.collectionId, before, `race-${crypto.randomUUID()}`]);
  await waitUntilBlocked(monitor, buyerPid, outcome(waiting));
  await publisher.query("COMMIT");
  expect((await waiting).rows[0].r.state).toBe("stale");

  // Checkout first: the waiting publication runs after the order commits, against the order's frozen release.
  const current = await sellable();
  const draft = await f.prepareDraft({ tagline: "Reorders the recipes" });
  await f.prepareDraft({ members: [...(draft.snapshot.members as unknown[])].reverse() });
  const reorder = await f.buildPublishCommand();
  await buyer.query("BEGIN");
  const reserved = (await reserve(buyer, current)).rows[0].r;
  expect(reserved.state).toBe("reserved");
  const publication = outcome(publisher.query("SELECT public.admin_collection_publish($1::jsonb)", [reorder]));
  await waitUntilBlocked(monitor, publisherPid, publication);
  await buyer.query("COMMIT");
  expect(["committed", "ADM_CONFLICT"]).toContain(await publication);

  const orders = await f.query(`SELECT po.release_id, po.snapshot->'member_recipe_ids' frozen,
      (SELECT jsonb_agg(cr.recipe_id ORDER BY cr.position) FROM public.collection_recipes cr WHERE cr.release_id=po.release_id) actual
    FROM private.purchase_orders po JOIN public.collection_releases r ON r.id=po.release_id WHERE r.collection_id=$1`,
  [f.collectionId]);
  expect(orders.rows).toHaveLength(1);
  expect(orders.rows[0].release_id).toBe(current.releaseId);
  expect(orders.rows[0].frozen).toEqual(orders.rows[0].actual);
});

test("a recipe correction and a collection publication that both touch the recipe never deadlock", async () => {
  const recipeId = f.recipeIds[0];
  const objectName = `synth-conc-${crypto.randomBytes(3).toString("hex")}.webp`;
  const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false } }).storage.from("recipe-previews");
  const upload = await storage.upload(objectName, Buffer.from("synthetic"), { contentType: "image/webp", upsert: true });
  if (upload.error) throw new Error(upload.error.message);
  try {
    await f.query("UPDATE public.recipe_catalog SET preview_image_path=$2 WHERE id=$1", [recipeId, `recipe-previews/${objectName}`]);
    await f.query(`UPDATE private.commercial_offers SET provider_mode='live', sale_enabled=true
      WHERE release_id IN (SELECT id FROM public.collection_releases WHERE collection_id=$1)`, [f.collectionId]);
    await f.prepareDraft({ tagline: "Uses the recipe" });
    const publish = await f.buildPublishCommand();

    // An exactly approved correction of the same recipe, prepared through the Phase 1 commands.
    const owner = await open(f.ownerId);
    await owner.query("SELECT public.admin_draft_start($1,$2)", [recipeId, crypto.randomUUID()]);
    type Head = { current_revision_id: string; working_version: number; base_content_version: number;
      base_active_hash: string; current_submission_id: string;
      cur: { digest: string; snapshot: { catalog: Record<string, unknown> } & Record<string, unknown> } };
    const head = async () => (await f.query(`SELECT d.id, d.current_revision_id, d.working_version, d.base_content_version,
        d.base_active_hash, d.current_submission_id, private.admin_revision_json(d.current_revision_id) cur
      FROM private.recipe_drafts d WHERE d.recipe_id=$1 AND d.workflow_schema=1
        AND d.lifecycle IN ('draft','submitted','approved','changes_requested','rejected')`, [recipeId])).rows[0] as Head;
    let h = await head();
    const base = { content_version: h.base_content_version, active_hash: h.base_active_hash };
    await owner.query("SELECT public.admin_draft_save($1::jsonb)", [{ operation_id: crypto.randomUUID(), recipe_id: recipeId,
      reason: "Correct the title", expected_version: h.working_version, expected_digest: h.cur.digest, base,
      snapshot: { ...h.cur.snapshot, catalog: { ...h.cur.snapshot.catalog, title: "Corrected under race" } }, reopen_reviewed: true }]);
    h = await head();
    const exact = { recipe_id: recipeId, revision_id: h.current_revision_id, expected_version: h.working_version,
      expected_digest: h.cur.digest };
    await owner.query("SELECT public.admin_revision_submit($1::jsonb)", [{ ...exact, operation_id: crypto.randomUUID(), reason: "Ready" }]);
    h = await head();
    await owner.query("SELECT public.admin_revision_review($1::jsonb)", [{ ...exact, operation_id: crypto.randomUUID(),
      reason: "Approved", submission_id: h.current_submission_id, decision: "approve", resolved_issue_ids: [] }]);
    const object = (await f.query("SELECT id, version FROM storage.objects WHERE bucket_id='recipe-previews' AND name=$1",
      [objectName])).rows[0];
    await f.query("SELECT private.admin_record_asset_check($1,$2,'recipe-previews',$3,$4,$5,true,now())",
      [h.current_revision_id, h.cur.digest, objectName, object.id, object.version]);
    const token = (await owner.query("SELECT public.admin_recipe_impact($1)->>'impactToken' t", [recipeId])).rows[0].t;
    const correction = { ...exact, operation_id: crypto.randomUUID(), reason: "Correct the title", base, impact_token: token,
      correction_kind: "same_recipe", acknowledge_global_impact: true };

    const [corrector, publisher, monitor] = [await open(f.ownerId), await open(f.ownerId), await open()];
    const publisherPid = await backendPid(publisher);
    await corrector.query("BEGIN");
    await corrector.query("SELECT public.admin_recipe_correct($1::jsonb)", [correction]);
    const waiting = outcome(publisher.query("SELECT public.admin_collection_publish($1::jsonb)", [publish]));
    await waitUntilBlocked(monitor, publisherPid, waiting);
    await corrector.query("COMMIT");

    const result = await waiting;
    expect(result).not.toMatch(/deadlock/i);
    expect(["ADM_CONFLICT", "ADM_BLOCKED"]).toContain(result);
    const corrected = await f.query("SELECT count(*)::int n FROM private.admin_audit WHERE action='recipe.correct' AND recipe_id=$1",
      [recipeId]);
    expect(corrected.rows[0].n).toBe(1);
    expect(await nonImportedPublications(f.collectionId)).toBe(0);
  } finally {
    await storage.remove([objectName]);
  }
});

test("a held collection lock makes publication give up after its bounded timeout", async () => {
  await f.prepareDraft({ tagline: "Held lock" });
  const command = await f.buildPublishCommand();
  const [holder, publisher] = [await open(), await open(f.ownerId)];
  await holder.query("BEGIN");
  await holder.query("SELECT 1 FROM public.recipe_collections WHERE id=$1 FOR UPDATE", [f.collectionId]);
  const started = Date.now();
  const error = await publisher.query("SELECT public.admin_collection_publish($1::jsonb)", [command])
    .then(() => null, (e: { code?: string }) => e);
  const waited = Date.now() - started;
  await holder.query("ROLLBACK");
  expect(error?.code).toBe("55P03");
  expect(waited).toBeGreaterThanOrEqual(4500);
  expect(waited).toBeLessThan(9000);
  expect(await nonImportedPublications(f.collectionId)).toBe(0);
});
