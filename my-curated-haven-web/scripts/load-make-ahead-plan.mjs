// Load a book's make-ahead plan into public.collection_extras. Dry run by default.
//
//   node scripts/load-make-ahead-plan.mjs --file /outside/the/repo/halloween-plan.json --db-url-env LOCAL_DB_URL
//   node scripts/load-make-ahead-plan.mjs --file ... --db-url-env LOCAL_DB_URL --apply
//   node scripts/load-make-ahead-plan.mjs --file ... --db-url-env PROD_DB_URL --apply --confirm-host db.example.supabase.co
//
// The plan is paid content and this repository is public, so the file must live outside the repository and the
// script never prints its words: only counts, a content digest and where it would write. The connection string
// is read from the named environment variable; there is no default target. Writing to a database that is not on
// this machine also needs --confirm-host with that database's exact host name. Options: --collection <slug>
// (default halloween).
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { register } from "node:module";
import { dirname, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

register("./ts-alias-hooks.mjs", import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function parseArgs(argv) {
  const args = { apply: false, collection: "halloween" };
  const values = new Set(["--file", "--db-url-env", "--collection", "--confirm-host"]);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (values.has(arg) && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) args[arg.slice(2)] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  if (!args.file) throw new Error("--file <plan.json> is required (a file outside the repository)");
  if (!args["db-url-env"]) throw new Error("--db-url-env <ENV_NAME> is required; there is no default target");
  return args;
}

/** The plan file, resolved through links, refused when it sits inside this (public) repository. */
export function planFileOutsideRepo(file, root = ROOT) {
  const path = realpathSync(resolve(file));
  const repo = realpathSync(root);
  const inside = relative(repo, path);
  if (!inside.startsWith("..") && !isAbsolute(inside)) {
    throw new Error("The plan file is inside the repository. Keep paid content outside it, never committed.");
  }
  if (!path.endsWith(".json")) throw new Error("The plan file must be a .json file");
  return path;
}

/** Where a connection string points, and whether writing there needs --confirm-host. */
export function databaseTarget(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("The database URL is not a valid URL");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw new Error("The database URL must be postgres://");
  const host = url.hostname.toLowerCase();
  return { host, local: LOOPBACK.has(host), label: `${host}:${url.port || "5432"}${url.pathname || "/postgres"}` };
}

export function assertWriteAllowed(target, args) {
  if (!args.apply || target.local) return;
  if (!args["confirm-host"]) throw new Error(`Refusing to write to ${target.host} without --confirm-host ${target.host}`);
  if (args["confirm-host"].toLowerCase() !== target.host) {
    throw new Error(`--confirm-host does not match the database host (${target.host})`);
  }
}

/** Key order doesn't matter: the database stores jsonb with its own order. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export const digest = (value) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex").slice(0, 16);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { makeAheadPlanFor } = await import("../src/config/halloween.ts");
  const { parseMakeAheadPlanContent } = await import("../src/lib/collections/make-ahead.ts");

  const entry = makeAheadPlanFor(args.collection);
  if (!entry) throw new Error(`No make-ahead plan is configured for ${args.collection}`);
  const file = planFileOutsideRepo(args.file);
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error("The plan file is not valid JSON");
  }
  const parsed = parseMakeAheadPlanContent(raw, entry.preview);
  if (!parsed.ok) {
    console.error(`The plan does not fit the ${args.collection} preview:`);
    for (const error of parsed.errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }
  const { content } = parsed;
  const items = content.shopping.aisles.reduce((sum, aisle) => sum + aisle.items.length, 0);
  const tasks = content.days.reduce((sum, day) => sum + day.tasks.length, 0);
  console.log(`Plan for ${args.collection}: ${content.menu.length} dishes, ${content.days.length} days, ${tasks} tasks, ` +
    `${content.shopping.aisles.length} aisles, ${items} shopping items, ${content.tiers.items.length} tiers; digest ${digest(raw)}`);

  const url = process.env[args["db-url-env"]];
  if (!url) throw new Error(`${args["db-url-env"]} is not set`);
  const target = databaseTarget(url);
  assertWriteAllowed(target, args);
  console.log(`Target: ${target.label} (${target.local ? "this machine" : "remote"})`);

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(args.apply ? "BEGIN" : "BEGIN READ ONLY");
    const collection = (await client.query("SELECT id FROM public.recipe_collections WHERE slug=$1", [args.collection])).rows[0];
    if (!collection) throw new Error(`The database has no ${args.collection} collection`);
    const current = (await client.query(
      "SELECT content, updated_at FROM public.collection_extras WHERE collection_id=$1 AND kind='make_ahead_plan'", [collection.id])).rows[0];
    console.log(current
      ? `Current plan: digest ${digest(current.content)}, updated ${new Date(current.updated_at).toISOString()}`
      : "Current plan: none");
    if (current && digest(current.content) === digest(raw)) {
      console.log("No change.");
      await client.query("ROLLBACK");
      return;
    }
    if (!args.apply) {
      await client.query("ROLLBACK");
      console.log("Dry run: nothing written. Add --apply to write it.");
      return;
    }
    await client.query(`INSERT INTO public.collection_extras(collection_id, kind, content) VALUES($1, 'make_ahead_plan', $2)
      ON CONFLICT (collection_id, kind) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`, [collection.id, raw]);
    await client.query("COMMIT");
    console.log(`Applied: the ${args.collection} plan is now digest ${digest(raw)}.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
