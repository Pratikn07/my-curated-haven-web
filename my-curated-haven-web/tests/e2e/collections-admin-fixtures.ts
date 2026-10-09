import crypto from "node:crypto";
import { Client } from "pg";
import { createAdminFixture, type AdminFixture, type Assurance } from "./admin-fixtures";

/**
 * Synthetic collection scenarios for admin browser specs, on the owned local stack only.
 * Built on the Phase 1 admin fixture (real Auth users with TOTP MFA). Cleans only the rows it
 * created; collection history tables are immutable, so cleanup disables their triggers briefly.
 */

export type CollectionRole = "owner" | "viewer" | "editor" | "reviewer" | "publisher" | "customer";
type Page = Parameters<AdminFixture["login"]>[0];

export interface CollectionsFixture {
  collectionId: string;
  slug: string;
  title: string;
  recipeIds: string[];
  recipeTitles: string[];
  /** Recipes not yet in the collection: one editorially reviewed, one not. */
  extraRecipes: { reviewed: { id: string; title: string }; unreviewed: { id: string; title: string } };
  ownerId: string;
  customerId: string;
  publishCommand: Record<string, unknown> | null;
  query(sql: string, args?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  login(page: Page, role: CollectionRole, aal?: Assurance): Promise<void>;
  setCollectionStage(stage: CollectionStage): Promise<void>;
  /** Run a collection RPC as that staff member (aal2 claims) in its own transaction; returns its JSON result. */
  rpcAs(role: Exclude<CollectionRole, "customer">, fn: string, command: Record<string, unknown>): Promise<Record<string, unknown>>;
  /** Record a campaign snapshot so evidence is known; restored on dispose. */
  recordCampaigns(): Promise<void>;
  /** The open draft head of this collection (or `target`), if any. */
  head(target?: string): Promise<DraftHead | undefined>;
  /** Save a fully checkable draft (current recipe references, fit confirmed) with `patch`, as the owner. */
  prepareDraft(patch: Record<string, unknown>, target?: string): Promise<DraftHead>;
  impactToken(revisionId: string, target?: string): Promise<string>;
  /** A complete owner publish command for the open draft of this collection (or `target`). */
  buildPublishCommand(target?: string): Promise<Record<string, unknown>>;
  /** Prepare and publish a draft through the RPC only, as a server that stopped before its refresh would leave it. */
  publishWithoutRefresh(note: string): Promise<Record<string, unknown>>;
  dispose(): Promise<void>;
}

export type DraftHead = { revision_id: string; version: number; digest: string; snapshot: Record<string, unknown>;
  base_publication_id: string | null; base_digest: string; submission_id: string | null };

const IMMUTABLE: [string, string][] = [
  ["private.collection_issue_resolutions", "collection_issue_resolutions_immutable"],
  ["private.collection_issues", "collection_issues_immutable"],
  ["private.collection_audit", "collection_audit_immutable"],
  ["private.collection_publications", "collection_publications_immutable"],
  ["private.collection_review_decisions", "collection_review_decisions_immutable"],
  ["private.collection_submissions", "collection_submissions_immutable"],
  ["private.collection_revisions", "collection_revisions_immutable"],
];

function databaseUrl(): string {
  const raw = process.env.ADMIN_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54342/postgres";
  const host = new URL(raw).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error("Collection fixtures refuse non-loopback databases.");
  return raw;
}

async function withPg<T>(fn: (pg: Client) => Promise<T>): Promise<T> {
  const pg = new Client({ connectionString: databaseUrl() });
  await pg.connect();
  try {
    await pg.query("SET SESSION lock_timeout = '15s'");
    return await fn(pg);
  } finally {
    await pg.end();
  }
}

/** Remove collections whose slug matches; used for this fixture's own rows and for interrupted runs. */
export async function deleteCollectionsBySlug(slugPattern: string): Promise<void> {
  await withPg((pg) => deleteCollections(pg, slugPattern));
}

async function deleteCollections(pg: Client, slugPattern: string): Promise<void> {
  const ids = (await pg.query("SELECT id FROM public.recipe_collections WHERE slug LIKE $1", [slugPattern])).rows.map((r) => r.id);
  if (ids.length === 0) return;
  for (const [table, trigger] of IMMUTABLE) await pg.query(`ALTER TABLE ${table} DISABLE TRIGGER ${trigger}`);
  await pg.query("ALTER TABLE public.collection_recipes DISABLE TRIGGER collection_recipes_published_guard");
  await pg.query("ALTER TABLE public.collection_recipes DISABLE TRIGGER trg_check_release_sealed");
  await pg.query("ALTER TABLE private.release_manifests DISABLE TRIGGER release_manifests_immutable");
  try {
    await pg.query("DELETE FROM private.collection_audit WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM private.collection_operations WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM private.collection_active_publications WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM public.collection_publication_projection WHERE collection_id = ANY($1)", [ids]);
    await pg.query("UPDATE private.collection_draft_heads SET submission_id=NULL WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM private.collection_draft_heads WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM private.collection_refresh_jobs WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM private.collection_publications WHERE collection_id = ANY($1)", [ids]);
    await pg.query(`DELETE FROM private.collection_issue_resolutions WHERE issue_id IN
      (SELECT id FROM private.collection_issues WHERE collection_id = ANY($1))`, [ids]);
    await pg.query("DELETE FROM private.collection_issues WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM private.collection_review_decisions WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM private.collection_submissions WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM private.collection_revisions WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM private.collection_sources WHERE collection_id = ANY($1)", [ids]);
    await pg.query(`DELETE FROM private.collection_access_policies WHERE release_id IN
      (SELECT id FROM public.collection_releases WHERE collection_id = ANY($1))`, [ids]);
    await pg.query(`DELETE FROM public.access_entitlements WHERE release_id IN
      (SELECT id FROM public.collection_releases WHERE collection_id = ANY($1))`, [ids]);
    const orders = `(SELECT po.id FROM private.purchase_orders po JOIN public.collection_releases r ON r.id=po.release_id
      WHERE r.collection_id = ANY($1))`;
    for (const table of ["analytics_exports", "commerce_outbox", "payment_disputes", "payment_refunds", "provider_payments"]) {
      await pg.query(`DELETE FROM private.${table} WHERE order_id IN ${orders}`, [ids]);
    }
    await pg.query(`DELETE FROM private.purchase_orders WHERE id IN ${orders}`, [ids]);
    await pg.query(`DELETE FROM private.release_manifests WHERE release_id IN
      (SELECT id FROM public.collection_releases WHERE collection_id = ANY($1))`, [ids]);
    await pg.query(`DELETE FROM private.commercial_offers WHERE release_id IN
      (SELECT id FROM public.collection_releases WHERE collection_id = ANY($1))`, [ids]);
    await pg.query(`DELETE FROM public.collection_recipes WHERE release_id IN
      (SELECT id FROM public.collection_releases WHERE collection_id = ANY($1))`, [ids]);
    await pg.query("DELETE FROM public.collection_releases WHERE collection_id = ANY($1)", [ids]);
    await pg.query("DELETE FROM public.recipe_collections WHERE id = ANY($1)", [ids]);
  } finally {
    for (const [table, trigger] of IMMUTABLE) await pg.query(`ALTER TABLE ${table} ENABLE TRIGGER ${trigger}`);
    await pg.query("ALTER TABLE public.collection_recipes ENABLE TRIGGER collection_recipes_published_guard");
    await pg.query("ALTER TABLE public.collection_recipes ENABLE TRIGGER trg_check_release_sealed");
    await pg.query("ALTER TABLE private.release_manifests ENABLE TRIGGER release_manifests_immutable");
  }
}

type CollectionStage = "disabled" | "inspection" | "editing" | "publication";

/** Set the collection workspace stage; returns the previous stage so callers can restore it. */
export async function setCollectionStage(stage: CollectionStage): Promise<CollectionStage> {
  return withPg(async (pg) => {
    const previous = (await pg.query("SELECT stage FROM private.collection_workspace_settings WHERE singleton")).rows[0].stage;
    await pg.query("UPDATE private.collection_workspace_settings SET stage=$1", [stage]);
    // Collection actions also need the console stage; raise it if needed, never lower it.
    await pg.query(`UPDATE private.admin_console_settings SET stage=$1 WHERE singleton AND
      array_position(ARRAY['disabled','inspection','editing','publication'], stage) <
      array_position(ARRAY['disabled','inspection','editing','publication'], $1::text)`, [stage]);
    return previous as CollectionStage;
  });
}

export async function createCollectionsFixture(options: {
  scenario?: "inspection" | "reviewed_update" | "buyer_successor" | "correction" | "checkout_pending";
} = {}): Promise<CollectionsFixture> {
  const scenario = options.scenario ?? "inspection";
  if (scenario !== "inspection") throw new Error(`Scenario ${scenario} arrives with its owning task.`);
  await withPg((pg) => deleteCollections(pg, "synthetic-collection-%"));
  const originalStage = await setCollectionStage("inspection");
  const originalCampaignRevision = (await withPg((pg) =>
    pg.query("SELECT campaign_revision FROM private.admin_console_settings WHERE singleton"))).rows[0].campaign_revision as string | null;

  const rand = crypto.randomBytes(3).toString("hex");
  const owner = await createAdminFixture(`coll-owner`, ["owner"]);
  const people: Partial<Record<CollectionRole, AdminFixture>> = { owner };
  let customer: AdminFixture | null = null;
  const collectionId = crypto.randomUUID();
  const releaseId = crypto.randomUUID();
  const publicationId = crypto.randomUUID();
  const slug = `synthetic-collection-${rand}`;
  const title = `Synthetic collection ${rand}`;
  const recipeTitle = (await owner.active()).catalog.title;
  const extraRecipes = {
    reviewed: { id: crypto.randomUUID(), title: `Synthetic extra ${rand}` },
    unreviewed: { id: crypto.randomUUID(), title: `Synthetic unreviewed ${rand}` },
  };
  let disposed = false;

  async function dispose(): Promise<void> {
    if (disposed) return;
    disposed = true;
    await withPg(async (pg) => {
      await deleteCollections(pg, slug);
      await deleteCollections(pg, "synthetic-new-%");
      await pg.query("DELETE FROM public.recipe_catalog WHERE slug LIKE $1", [`synthetic-colrecipe-${rand}-%`]);
    });
    await setCollectionStage(originalStage);
    await withPg((pg) => pg.query("UPDATE private.admin_console_settings SET campaign_revision=$1 WHERE singleton",
      [originalCampaignRevision]));
    for (const person of Object.values(people)) await person?.dispose();
  }

  try {
    customer = await createAdminFixture(`coll-customer`, []);
    people.customer = customer;
    await withPg(async (pg) => {
      for (const [kind, recipe] of Object.entries(extraRecipes)) {
        await pg.query(`INSERT INTO public.recipe_catalog(id,slug,title,public_summary,preview_image_path,total_minutes)
          VALUES($1,$2,$3,'Synthetic fixture','recipe-previews/fixture.webp',20)`, [recipe.id, `synthetic-colrecipe-${rand}-${kind}`, recipe.title]);
        await pg.query(`INSERT INTO public.recipe_bodies(recipe_id,ingredients,instructions,yield,allergen_review_state)
          VALUES($1,'[{"item":"Synthetic"}]','[{"step":1,"text":"Synthetic"}]','1 serving',$2)`,
          [recipe.id, kind === "reviewed" ? "reviewed_no_allergens" : "unknown"]);
      }
      await pg.query("INSERT INTO public.recipe_collections(id,slug,title,public_summary,listing_state) VALUES($1,$2,$3,'Synthetic','unlisted')",
        [collectionId, slug, title]);
      await pg.query("INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES($1,$2,1,'published')", [releaseId, collectionId]);
      await pg.query("INSERT INTO public.collection_recipes(release_id,recipe_id,position) VALUES($1,$2,1)", [releaseId, owner.recipeId]);
      await pg.query(`INSERT INTO private.commercial_offers(release_id,provider_account_id,provider_mode,provider_product_id,
          provider_price_id,currency,base_minor_amount,sale_enabled) VALUES($1,'acct_synthetic','test',$2,$3,'usd',1500,false)`,
        [releaseId, `prod_${rand}`, `price_${rand}`]);
      await pg.query("INSERT INTO public.access_entitlements(user_id,release_id,state) VALUES($1,$2,'active')", [customer!.userId, releaseId]);
      const snapshot = {
        collectionId, slug, title, tagline: "A synthetic tagline", story: "Synthetic story.", forWhen: "Synthetic tests",
        refresh: "Synthetic refresh", shelf: "mornings", sortOrder: 1, stage: { min: 6, max: 12 }, series: null,
        listingState: "listed", availability: "open", cloth: "sage", cover: null,
        members: [{ recipeId: owner.recipeId, recipeSlug: owner.recipeSlug, contentVersion: 1, reviewDigest: "a".repeat(64),
          tagsDigest: "b".repeat(64), placementNote: "Synthetic placement note", fit: "unverified" }],
      };
      await pg.query("INSERT INTO private.collection_sources(collection_id,source_mode) VALUES($1,'legacy')", [collectionId]);
      await pg.query(`INSERT INTO private.collection_publications(id,collection_id,release_id,snapshot,digest,imported,operation_id,executor_id)
        VALUES($1,$2,$3,$4::jsonb,private.collection_digest($4::jsonb),true,gen_random_uuid(),'catalog-import')`,
        [publicationId, collectionId, releaseId, snapshot]);
      await pg.query("INSERT INTO private.collection_active_publications(collection_id,publication_id) VALUES($1,$2)", [collectionId, publicationId]);
      await pg.query(`INSERT INTO private.collection_audit(collection_id,action,publication_id,operation_id,human_authoriser,
          executor_id,executor_type,reason,result) VALUES($1,'collection.import',$2,gen_random_uuid(),$3,'catalog-import','operator',
          'Synthetic import','success')`, [collectionId, publicationId, owner.userId]);
    });
  } catch (error) {
    await dispose();
    throw error;
  }

  async function rpcAs(role: Exclude<CollectionRole, "customer">, fn: string, command: Record<string, unknown>) {
    if (!/^admin_collection_[a-z_]+$/.test(fn)) throw new Error(`Not a collection RPC: ${fn}`);
    if (!people[role]) people[role] = await createAdminFixture(`coll-${role}`, [role]);
    const userId = people[role]!.userId;
    return withPg(async (pg) => {
      await pg.query("BEGIN");
      try {
        await pg.query("SELECT set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)",
          [userId, JSON.stringify({ sub: userId, aal: "aal2", role: "authenticated" })]);
        await pg.query("SET LOCAL ROLE authenticated");
        const { rows } = await pg.query(`SELECT public.${fn}($1::jsonb) AS result`, [command]);
        await pg.query("COMMIT");
        return rows[0].result as Record<string, unknown>;
      } catch (error) {
        await pg.query("ROLLBACK");
        throw error;
      }
    });
  }

  async function head(target: string = collectionId): Promise<DraftHead | undefined> {
    return (await withPg((pg) => pg.query(`SELECT h.revision_id, h.version, h.submission_id, r.digest, r.snapshot,
      r.base_publication_id, r.base_digest FROM private.collection_draft_heads h
      JOIN private.collection_revisions r ON r.id=h.revision_id WHERE h.collection_id=$1`, [target]))).rows[0] as DraftHead | undefined;
  }

  /** A member reference to a recipe's current reviewed version, confirmed as fitting. */
  async function member(recipeId: string) {
    const { rows } = await withPg((pg) => pg.query(`SELECT c.slug, b.content_version, private.admin_active_hash(c.id) hash
      FROM public.recipe_catalog c JOIN public.recipe_bodies b ON b.recipe_id=c.id WHERE c.id=$1`, [recipeId]));
    return { recipeId, recipeSlug: rows[0].slug, contentVersion: rows[0].content_version, reviewDigest: rows[0].hash,
      tagsDigest: "b".repeat(64), placementNote: "", fit: "accepted" };
  }

  async function prepareDraft(patch: Record<string, unknown>, target: string = collectionId): Promise<DraftHead> {
    let current = await head(target);
    if (!current) {
      await rpcAs("owner", "admin_collection_draft_start", { collection_id: target, operation_id: crypto.randomUUID(),
        reason: "Synthetic draft" });
      current = (await head(target))!;
    }
    const members = [await member(owner.recipeId), await member(extraRecipes.reviewed.id)];
    await rpcAs("owner", "admin_collection_draft_save", { collection_id: target, operation_id: crypto.randomUUID(),
      reason: "Synthetic draft", expected_version: current.version, expected_digest: current.digest,
      base: { publication_id: current.base_publication_id, digest: current.base_digest },
      snapshot: { ...current.snapshot, members, ...patch }, reopen_reviewed: true });
    return (await head(target))!;
  }

  async function impactToken(revisionId: string, target: string = collectionId): Promise<string> {
    return (await withPg((pg) => pg.query("SELECT private.collection_evaluate($1,$2)#>>'{value,token}' t",
      [target, revisionId]))).rows[0].t as string;
  }

  async function buildPublishCommand(target: string = collectionId): Promise<Record<string, unknown>> {
    const draft = (await head(target))!;
    const undecided = (await withPg((pg) => pg.query("SELECT private.collection_unmapped_access($1) u", [target])))
      .rows[0].u as { releaseId: string; sourceKind: string }[];
    return { collection_id: target, operation_id: crypto.randomUUID(), reason: "Synthetic publication",
      revision_id: draft.revision_id, expected_version: draft.version, expected_digest: draft.digest,
      impact_token: await impactToken(draft.revision_id, target),
      base: { publication_id: draft.base_publication_id, digest: draft.base_digest }, approve_now: true,
      access_decisions: undecided.map((u) => ({ release_id: u.releaseId, source_kind: u.sourceKind, policy: "additions-v1" })) };
  }

  return {
    collectionId, slug, title,
    recipeIds: [owner.recipeId],
    recipeTitles: [recipeTitle],
    extraRecipes,
    ownerId: owner.userId,
    customerId: customer.userId,
    publishCommand: null,
    query: (sql, args = []) => withPg((pg) => pg.query(sql, args)) as Promise<{ rows: Record<string, unknown>[] }>,
    async login(page, role, aal = "aal2") {
      if (!people[role]) people[role] = await createAdminFixture(`coll-${role}`, [role]);
      await people[role]!.login(page, aal);
    },
    async setCollectionStage(stage) {
      await setCollectionStage(stage);
    },
    rpcAs,
    async recordCampaigns() {
      await withPg(async (pg) => {
        await pg.query(`INSERT INTO private.admin_campaign_snapshots(deployment_revision,configuration,configuration_hash)
          VALUES('synthetic-collections-review','{"campaigns":[]}','synthetic') ON CONFLICT (deployment_revision) DO NOTHING`);
        await pg.query("UPDATE private.admin_console_settings SET campaign_revision='synthetic-collections-review' WHERE singleton");
      });
    },
    head,
    prepareDraft,
    impactToken,
    buildPublishCommand,
    async publishWithoutRefresh(note) {
      await prepareDraft({ tagline: note });
      return rpcAs("owner", "admin_collection_publish", { ...(await buildPublishCommand()), reason: note });
    },
    dispose,
  };
}
