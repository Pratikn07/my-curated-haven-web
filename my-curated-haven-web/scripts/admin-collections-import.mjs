// Collection catalog import: dry-run report by default, private apply only with a reviewed report.
//
//   node scripts/admin-collections-import.mjs --db-url-env LOCAL_COLLECTIONS_DB_URL [--out report.json]
//   node scripts/admin-collections-import.mjs --db-url-env LOCAL_COLLECTIONS_DB_URL --apply-private \
//     --report report.json --authoriser <owner-uuid> --reason "Reviewed import report"
//
// The connection string is read from the named environment variable; there is no default target.
// Apply stores private identities, imported baselines and source records only. It never writes the
// public projection, switches a collection's source mode, enables sales or grants access.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

register("./ts-alias-hooks.mjs", import.meta.url);
const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = resolve(WEB, "..");
const TAGS_PATH = resolve(ROOT, "docs/implementation/recipe-collections/recipe-tags.json");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function parseArgs(argv) {
  const args = { apply: false };
  const values = new Set(["--db-url-env", "--out", "--report", "--authoriser", "--reason"]);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply-private") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (values.has(arg) && argv[i + 1] !== undefined) args[arg.slice(2)] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  if (!args["db-url-env"]) throw new Error("--db-url-env <ENV_NAME> is required; there is no default target");
  if (args.apply) {
    if (!args.report) throw new Error("--apply-private requires --report <reviewed-report.json>");
    if (!args.authoriser || !UUID.test(args.authoriser)) throw new Error("--apply-private requires --authoriser <owner uuid>");
    if (!args.reason || args.reason.trim().length < 8) throw new Error("--apply-private requires a --reason");
  }
  return args;
}

const sha256File = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

function sourceSha() {
  const head = execFileSync("git", ["-C", ROOT, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["-C", ROOT, "status", "--porcelain", "--",
    "my-curated-haven-web/src/config", "my-curated-haven-web/public/images/collections",
    "docs/implementation/recipe-collections/recipe-tags.json"], { encoding: "utf8" }).trim();
  return dirty ? `${head}-dirty` : head;
}

function sourceDigests(config) {
  const digests = {
    "src/config/collections.ts": sha256File(resolve(WEB, "src/config/collections.ts")),
    "src/config/recipe-snapshot.ts": sha256File(resolve(WEB, "src/config/recipe-snapshot.ts")),
    "docs/implementation/recipe-collections/recipe-tags.json": sha256File(TAGS_PATH),
  };
  for (const collection of config) {
    if (!collection.cover) continue;
    const key = `public${collection.cover.src}`;
    try { digests[key] = sha256File(resolve(WEB, key)); } catch { /* reported as COVER_UNVERIFIED */ }
  }
  return digests;
}

async function readInventory(client) {
  await client.query("BEGIN READ ONLY");
  try {
    const q = async (sql) => (await client.query(sql)).rows;
    const inventory = {
      collections: await q("SELECT id, slug FROM public.recipe_collections ORDER BY slug"),
      recipes: (await q(`SELECT c.id, c.slug, b.content_version,
          CASE WHEN b.recipe_id IS NOT NULL AND private.recipe_is_reviewed(c.id) THEN private.admin_active_hash(c.id) END review_digest
        FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id=c.id ORDER BY c.slug`))
        .map((r) => ({ id: r.id, slug: r.slug, contentVersion: r.content_version, reviewDigest: r.review_digest, tagsDigest: null })),
      releases: (await q(`SELECT r.id, r.collection_id, r.state, m.manifest_checksum,
          coalesce(array_agg(cr.recipe_id ORDER BY cr.position) FILTER (WHERE cr.recipe_id IS NOT NULL), '{}') members
        FROM public.collection_releases r LEFT JOIN public.collection_recipes cr ON cr.release_id=r.id
        LEFT JOIN private.release_manifests m ON m.release_id=r.id
        GROUP BY r.id, m.manifest_checksum ORDER BY r.id`))
        .map((r) => ({ id: r.id, collectionId: r.collection_id, state: r.state, members: r.members, manifestChecksum: r.manifest_checksum })),
      offers: (await q(`SELECT id, release_id, provider_mode, sale_enabled, provider_price_id, currency, base_minor_amount,
          terms_version, refund_policy_version, access_policy_version FROM private.commercial_offers ORDER BY id`))
        .map((o) => ({ id: o.id, releaseId: o.release_id, mode: o.provider_mode, saleEnabled: o.sale_enabled,
          termsDigest: createHash("sha256").update(JSON.stringify([o.provider_price_id, o.currency, o.base_minor_amount,
            o.terms_version, o.refund_policy_version, o.access_policy_version])).digest("hex") })),
      orders: (await q(`SELECT po.id, po.release_id, po.attempt_state,
          coalesce(o.provider_mode, po.snapshot->>'provider_mode')='live' live,
          EXISTS(SELECT 1 FROM private.provider_payments p WHERE p.order_id=po.id AND p.status='succeeded') purchased,
          po.snapshot ?& ARRAY['price_minor','provider_account_id','currency','provider_mode'] snapshot_complete
        FROM private.purchase_orders po LEFT JOIN private.commercial_offers o ON o.id=po.offer_id ORDER BY po.id`))
        .map((o) => ({ id: o.id, releaseId: o.release_id, live: o.live, state: o.attempt_state, purchased: o.purchased,
          snapshotComplete: o.snapshot_complete })),
      sources: (await q("SELECT DISTINCT release_id, source_kind FROM private.access_sources ORDER BY 1, 2"))
        .map((s) => ({ releaseId: s.release_id, sourceKind: s.source_kind })),
      policies: (await q("SELECT release_id, source_kind, policy FROM private.collection_access_policies ORDER BY 1, 2"))
        .map((p) => ({ originReleaseId: p.release_id, sourceKind: p.source_kind, policy: p.policy })),
    };
    return inventory;
  } finally {
    await client.query("ROLLBACK");
  }
}

async function buildReport(client) {
  const { mapCollectionImport, canonicalJson, sha256 } = await import("../src/lib/collections/catalog-import.ts");
  const { SHOWROOM_COLLECTIONS } = await import("../src/config/collections.ts");
  const tags = JSON.parse(readFileSync(TAGS_PATH, "utf8"));
  const report = mapCollectionImport({ sourceSha: sourceSha(), sourceDigests: sourceDigests(SHOWROOM_COLLECTIONS),
    config: SHOWROOM_COLLECTIONS, tags, inventory: await readInventory(client) });
  return { report, reportDigest: sha256(canonicalJson(report)) };
}

/** Deterministic operation id per collection and report, so re-applying the same report is a no-op. */
function operationId(sourceDigest, collectionId) {
  const h = createHash("sha256").update(`collection-import:${sourceDigest}:${collectionId}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

async function applyPrivate(client, { report }, args) {
  const outcomes = [];
  await client.query("BEGIN");
  try {
    const owner = await client.query(`SELECT 1 FROM private.admin_memberships WHERE user_id=$1 AND role='owner' AND active`,
      [args.authoriser]);
    if (owner.rowCount !== 1) throw new Error("--authoriser must be the active console owner");
    for (const candidate of report.candidates) {
      const id = candidate.collectionId;
      const slug = candidate.slug;
      if (report.blockedCollectionIds.includes(id)) { outcomes.push({ slug, result: "blocked" }); continue; }
      const op = operationId(report.sourceDigest, id);
      const digest = (await client.query("SELECT private.collection_digest($1::jsonb) d", [candidate])).rows[0].d;
      const source = (await client.query("SELECT import_digest FROM private.collection_sources WHERE collection_id=$1 FOR UPDATE", [id])).rows[0];
      if (source?.import_digest === digest) { outcomes.push({ slug, result: "unchanged" }); continue; }
      if (source?.import_digest) { outcomes.push({ slug, result: "skipped: imported earlier with different content; use a draft" }); continue; }

      await client.query(`INSERT INTO public.recipe_collections(id,slug,title,public_summary,listing_state)
        VALUES($1,$2,$3,$4,'unlisted') ON CONFLICT (id) DO NOTHING`, [id, slug, candidate.title, candidate.tagline]);
      await client.query(`INSERT INTO private.collection_sources(collection_id,source_mode,source_sha,import_digest,imported_at)
        VALUES($1,'legacy',$2,$3,now())
        ON CONFLICT (collection_id) DO UPDATE SET source_sha=EXCLUDED.source_sha,import_digest=EXCLUDED.import_digest,
          imported_at=EXCLUDED.imported_at,updated_at=now()`, [id, report.sourceSha ?? null, digest]);
      const existing = await client.query("SELECT 1 FROM private.collection_active_publications WHERE collection_id=$1", [id]);
      let publicationId = null;
      if (candidate.listingState === "listed" && existing.rowCount === 0) {
        // The current public page is the legacy baseline. Recorded as imported, never as a human approval.
        const release = await client.query(`SELECT r.id FROM public.collection_releases r
          WHERE r.collection_id=$1 AND r.state IN ('published','sealed') AND
            (SELECT coalesce(array_agg(recipe_id ORDER BY recipe_id),'{}') FROM public.collection_recipes WHERE release_id=r.id)
            = (SELECT coalesce(array_agg(x::uuid ORDER BY x::uuid),'{}') FROM unnest($2::text[]) x)
          ORDER BY r.version DESC LIMIT 1`, [id, candidate.members.map((m) => m.recipeId)]);
        publicationId = (await client.query(`INSERT INTO private.collection_publications(collection_id,release_id,snapshot,digest,
          imported,operation_id,executor_id) VALUES($1,$2,$3::jsonb,$4,true,$5,'catalog-import') RETURNING id`,
          [id, release.rows[0]?.id ?? null, candidate, digest, op])).rows[0].id;
        await client.query(`INSERT INTO private.collection_active_publications(collection_id,publication_id,series_key,series_volume)
          VALUES($1,$2,$3,$4)`, [id, publicationId, candidate.series?.key ?? null, candidate.series?.volume ?? null]);
      }
      await client.query(`INSERT INTO private.collection_audit(collection_id,action,publication_id,digest,after_ref,operation_id,
          human_authoriser,executor_id,executor_type,reason,result)
        VALUES($1,'collection.import',$2,$3,$4,$5,$6,'catalog-import','operator',$7,'success')`,
        [id, publicationId, digest, publicationId ?? digest, op, args.authoriser, args.reason]);
      await client.query(`INSERT INTO private.collection_operations(executor_id,operation_id,action,collection_id,request_hash,result,committed_at)
        VALUES('catalog-import',$1,'collection.import',$2,$3,$4::jsonb,now())`,
        [op, id, report.sourceDigest, { publicationId, digest }]);
      outcomes.push({ slug, result: publicationId ? "imported baseline" : "imported source record" });
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  return outcomes;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env[args["db-url-env"]];
  if (!url) throw new Error(`Environment variable ${args["db-url-env"]} is not set`);
  const target = new URL(url);
  console.error(`Target: ${target.hostname}:${target.port || 5432}${target.pathname} (${args.apply ? "apply-private" : "dry-run"})`);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const built = await buildReport(client);
    if (!args.apply) {
      const text = `${JSON.stringify(built, null, 2)}\n`;
      if (args.out) writeFileSync(args.out, text); else process.stdout.write(text);
      const { report } = built;
      console.error(`Candidates ${report.candidates.length}, blocked ${report.blockedCollectionIds.length}, ` +
        `discrepancies ${report.discrepancies.length}, report ${built.reportDigest}`);
      return;
    }
    const reviewed = JSON.parse(readFileSync(args.report, "utf8"));
    if (reviewed.reportDigest !== built.reportDigest || reviewed.report?.sourceDigest !== built.report.sourceDigest) {
      throw new Error("The reviewed report no longer matches the current source and database; run a new dry-run and review it");
    }
    const outcomes = await applyPrivate(client, built, args);
    for (const o of outcomes) console.error(`${o.slug}: ${o.result}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
