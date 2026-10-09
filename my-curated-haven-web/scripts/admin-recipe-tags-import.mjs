// Recipe tag import: dry-run report by default, private apply only with a reviewed report.
//
//   node scripts/admin-recipe-tags-import.mjs --db-url-env LOCAL_COLLECTIONS_DB_URL [--out tags-report.json]
//   node scripts/admin-recipe-tags-import.mjs --db-url-env LOCAL_COLLECTIONS_DB_URL --apply-private \
//     --report tags-report.json --authoriser <owner-uuid> --reason "Reviewed tag import report"
//
// The connection string is read from the named environment variable; there is no default target.
// Apply records tags for each recipe's current content version that has none, with import provenance and
// the named owner as authoriser. It never changes recipe content, publication state, collections or access.
// Importing changes a recipe's active hash, so open recipe drafts and collection drafts that include it must
// rebase or refresh their references; the report names them.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

register("./ts-alias-hooks.mjs", import.meta.url);
const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TAGS_PATH = resolve(WEB, "..", "docs/implementation/recipe-collections/recipe-tags.json");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

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

async function readDatabase(client, slugs) {
  await client.query("BEGIN READ ONLY");
  try {
    const vocabulary = (await client.query(`SELECT c.category, c.multiple,
        coalesce((SELECT array_agg(v.value ORDER BY v.position) FROM private.recipe_tag_values v WHERE v.category=c.category),'{}') vals
      FROM private.recipe_tag_categories c ORDER BY c.position`)).rows
      .map((r) => ({ category: r.category, multiple: r.multiple, values: r.vals }));
    const database = (await client.query(`SELECT c.id, c.slug, b.content_version, private.recipe_current_tags(c.id) tags,
        EXISTS (SELECT 1 FROM private.recipe_drafts d WHERE d.recipe_id=c.id AND d.workflow_schema=1
          AND d.lifecycle IN ('draft','submitted','approved','changes_requested','rejected')) open_draft,
        (SELECT count(*)::int FROM private.collection_draft_heads h JOIN private.collection_revisions r ON r.id=h.revision_id
          WHERE r.snapshot->'members' @> jsonb_build_array(jsonb_build_object('recipeId',c.id::text))) collection_drafts
      FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id=c.id
      WHERE c.slug = ANY($1::text[]) ORDER BY c.slug`, [slugs])).rows
      .map((r) => ({ slug: r.slug, recipeId: r.id, contentVersion: r.content_version, currentTags: r.tags,
        openRecipeDraft: r.open_draft, collectionDrafts: r.collection_drafts }));
    return { vocabulary, database };
  } finally {
    await client.query("ROLLBACK");
  }
}

async function buildReport(client) {
  const { buildTagImportReport, canonicalTags, parseTagSource } = await import("../src/lib/admin/recipe-tags.ts");
  const source = parseTagSource(JSON.parse(readFileSync(TAGS_PATH, "utf8")), sha256);
  const { vocabulary, database } = await readDatabase(client, source.recipes.map((r) => r.slug));
  const report = buildTagImportReport({ source, database, vocabulary });
  return { report, reportDigest: sha256(canonicalTags(report)) };
}

/** Deterministic operation id per report, so re-applying the same report is a no-op. */
function operationId(reportDigest) {
  const h = sha256(`recipe-tag-import:${reportDigest}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
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
    const { counts } = built.report;
    if (!args.apply) {
      const text = `${JSON.stringify(built, null, 2)}\n`;
      if (args.out) writeFileSync(args.out, text); else process.stdout.write(text);
      console.error(`Import ${counts.import}, unchanged ${counts.unchanged}, different ${counts.different}, ` +
        `missing recipe ${counts.missing_recipe}, missing body ${counts.missing_body}, invalid ${counts.invalid}; ` +
        `report ${built.reportDigest}`);
      return;
    }
    const reviewed = JSON.parse(readFileSync(args.report, "utf8"));
    if (reviewed.reportDigest !== built.reportDigest) {
      throw new Error("The reviewed report no longer matches the current source and database; run a new dry-run and review it");
    }
    await client.query("BEGIN");
    try {
      const outcome = (await client.query("SELECT private.recipe_tags_import($1::jsonb) r", [{
        authoriser: args.authoriser, operationId: operationId(built.reportDigest), reason: args.reason,
        recipes: built.report.importable }])).rows[0].r;
      await client.query("COMMIT");
      console.error(`Imported ${outcome.imported.length}, unchanged ${outcome.unchanged.length}, skipped ${outcome.skipped.length}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
