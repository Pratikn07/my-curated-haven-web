// Record the deployed campaign promises so the console can check recipe and collection changes against them.
//
//   node scripts/admin-record-campaigns.mjs --db-url-env PROD_DB_URL --revision <deployed git sha>
//   node scripts/admin-record-campaigns.mjs --db-url-env PROD_DB_URL --revision <deployed git sha> --apply \
//     --authoriser <owner-uuid> --reason "Record campaigns for the deployed revision"
//
// The connection string is read from the named environment variable; there is no default target. The dry run
// prints the snapshot, its hash and whether each promised recipe exists. Apply stores the snapshot for that
// revision (an existing one must be identical), points the console at it and writes one audit row, in one
// transaction. Run it again after every deploy that changes src/config/campaigns.ts.
import { createHash, randomUUID } from "node:crypto";
import { register } from "node:module";
import pg from "pg";

register("./ts-alias-hooks.mjs", import.meta.url);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA = /^[0-9a-f]{7,40}$/;

function parseArgs(argv) {
  const args = { apply: false };
  const values = new Set(["--db-url-env", "--revision", "--authoriser", "--reason"]);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (values.has(arg) && argv[i + 1] !== undefined) args[arg.slice(2)] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  if (!args["db-url-env"]) throw new Error("--db-url-env <ENV_NAME> is required; there is no default target");
  if (!args.revision || !SHA.test(args.revision)) throw new Error("--revision <deployed git sha> is required");
  if (args.apply) {
    if (!args.authoriser || !UUID.test(args.authoriser)) throw new Error("--apply requires --authoriser <owner uuid>");
    if (!args.reason || args.reason.trim().length < 8) throw new Error("--apply requires a --reason");
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env[args["db-url-env"]];
  if (!url) throw new Error(`Environment variable ${args["db-url-env"]} is not set`);
  const target = new URL(url);
  console.error(`Target: ${target.hostname}:${target.port || 5432}${target.pathname} (${args.apply ? "apply" : "dry-run"})`);

  const { CAMPAIGNS } = await import("../src/config/campaigns.ts");
  const { buildCampaignSnapshot, canonicalSnapshot } = await import("../src/lib/admin/campaign-snapshot.ts");
  const snapshot = buildCampaignSnapshot(CAMPAIGNS);
  const text = canonicalSnapshot(snapshot);
  const hash = createHash("sha256").update(text, "utf8").digest("hex");
  const slugs = [...new Set(snapshot.campaigns.flatMap((c) => c.recipeSlugs))];

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const known = new Set((await client.query("SELECT slug FROM public.recipe_catalog WHERE slug = ANY($1::text[])", [slugs]))
      .rows.map((r) => r.slug));
    const current = (await client.query("SELECT campaign_revision FROM private.admin_console_settings WHERE singleton")).rows[0];
    for (const c of snapshot.campaigns) {
      console.error(`  ${c.slug} (${c.status}): ${c.recipeSlugs.map((s) => known.has(s) ? s : `${s} [NOT IN CATALOG]`).join(", ")}`);
    }
    console.error(`Revision ${args.revision}, hash ${hash}; console currently records ${current?.campaign_revision ?? "nothing"}`);
    const missing = slugs.filter((s) => !known.has(s));
    if (missing.length) throw new Error(`Promised recipes missing from the catalog: ${missing.join(", ")}`);
    if (!args.apply) return;

    await client.query("BEGIN");
    try {
      const owner = await client.query(`SELECT 1 FROM private.admin_memberships
        WHERE user_id=$1 AND role='owner' AND active AND revoked_at IS NULL`, [args.authoriser]);
      if (owner.rowCount !== 1) throw new Error("The authoriser is not the active console owner");
      const before = (await client.query("SELECT campaign_revision FROM private.admin_console_settings WHERE singleton FOR UPDATE")).rows[0];
      await client.query(`INSERT INTO private.admin_campaign_snapshots(deployment_revision,configuration,configuration_hash)
        VALUES($1,$2::jsonb,$3) ON CONFLICT (deployment_revision) DO NOTHING`, [args.revision, text, hash]);
      const stored = (await client.query("SELECT configuration_hash FROM private.admin_campaign_snapshots WHERE deployment_revision=$1",
        [args.revision])).rows[0];
      if (stored.configuration_hash !== hash) {
        throw new Error(`Revision ${args.revision} already has a different campaign snapshot; check which revision is deployed`);
      }
      await client.query(`UPDATE private.admin_console_settings SET campaign_revision=$1, updated_at=now(), updated_by=$2, reason=$3
        WHERE singleton`, [args.revision, args.authoriser, args.reason]);
      await client.query(`INSERT INTO private.admin_audit(actor_id,action,digest,before_ref,after_ref,request_id,reason,result)
        VALUES($1,'campaign.snapshot',$2,$3,$4,$5,$6,'success')`,
      [args.authoriser, hash, before?.campaign_revision ?? null, args.revision, randomUUID(), args.reason]);
      await client.query("COMMIT");
      console.error(`Recorded ${snapshot.campaigns.length} campaigns for revision ${args.revision}`);
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
