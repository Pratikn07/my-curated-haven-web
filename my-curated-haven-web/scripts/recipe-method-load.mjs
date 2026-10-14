// Load reviewed method content (<dir>/<slug>.json) into recipe_bodies.method. The reviewed files are not in git;
// --dir names their folder (default: docs/implementation/recipe-method/recipes/ in the working copy).
//
//   node scripts/recipe-method-load.mjs --db-url-env LOCAL_DB_URL mummy-banana-pops spider-cracker-bites
//   node scripts/recipe-method-load.mjs --db-url-env LOCAL_DB_URL --all
//   node scripts/recipe-method-load.mjs --db-url-env LOCAL_DB_URL --apply mummy-banana-pops
//   node scripts/recipe-method-load.mjs --db-url-env PROD_DB_URL --apply --confirm-host <db host> mummy-banana-pops
//
// A dry run by default: it reads the database in a read-only transaction and prints what would change. The
// connection string comes from the named environment variable; there is no default target. --apply writes,
// and a target that is not this machine also needs --confirm-host with the database's host name.
//
// For each recipe it drops `review`, validates the rest against RecipeMethod (src/lib/recipes/method.ts) and
// writes it to recipe_bodies.method. If totalMinutes differs from recipe_catalog.total_minutes, it updates that
// too. It never changes ingredients, instructions, allergens, publication, collections or access. Apply stops
// before writing anything if a recipe is invalid, missing from the database, or names a step photo that is not
// in public/images/recipes/steps/. Writing a method changes the recipe's active hash in the admin console, so
// an open recipe draft for it must rebase; the report names those.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DIR = resolve(WEB, "..", "docs/implementation/recipe-method/recipes");
const STEPS_DIR = resolve(WEB, "public/images/recipes/steps");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function parseArgs(argv) {
  const args = { apply: false, all: false, dir: DEFAULT_DIR, slugs: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.apply = false;
    else if (arg === "--all") args.all = true;
    else if (arg === "--db-url-env" && argv[i + 1]) args.dbUrlEnv = argv[++i];
    else if (arg === "--confirm-host" && argv[i + 1]) args.confirmHost = argv[++i];
    else if (arg === "--dir" && argv[i + 1]) args.dir = resolve(argv[++i]);
    else if (SLUG.test(arg)) args.slugs.push(arg);
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  if (!args.dbUrlEnv) throw new Error("--db-url-env <ENV_NAME> is required; there is no default target");
  if (args.all && args.slugs.length) throw new Error("Pass slugs or --all, not both");
  if (args.all) args.slugs = readdirSync(args.dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).filter((s) => SLUG.test(s)).sort();
  if (!args.slugs.length) throw new Error("Name at least one recipe slug, or pass --all");
  return args;
}

/** Key order does not matter in jsonb, so compare with keys sorted. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function readSource(dir, slug, validate, problem) {
  const path = resolve(dir, `${slug}.json`);
  if (!existsSync(path)) return { slug, error: `no file at ${path}` };
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { slug, error: `not valid JSON (${error.message})` };
  }
  if (raw && typeof raw === "object") delete raw.review;
  if (raw?.slug !== undefined && raw.slug !== slug) return { slug, error: `the file's slug is "${raw.slug}"` };
  const bad = problem(raw);
  if (bad) return { slug, error: `invalid method at ${bad}` };
  const method = validate(raw);
  const photos = method.sections.flatMap((s) => s.steps).filter((s) => s.photo).map((s) => s.photo.file);
  const missingPhotos = photos.flatMap((file) => [192, 720].map((size) => `${file}-${size}.webp`))
    .filter((name) => !existsSync(resolve(STEPS_DIR, name)));
  return { slug, method, missingPhotos };
}

async function readDatabase(client, slugs) {
  await client.query("BEGIN READ ONLY");
  try {
    const { rows } = await client.query(
      `SELECT c.id, c.slug, c.total_minutes, c.publication_state, b.recipe_id IS NOT NULL AS has_body, b.method,
         b.allergens, b.allergen_review_state,
         EXISTS (SELECT 1 FROM private.recipe_drafts d WHERE d.recipe_id = c.id AND d.workflow_schema = 1
           AND d.lifecycle IN ('draft','submitted','approved','changes_requested','rejected')) AS open_draft
       FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
       WHERE c.slug = ANY($1::text[])`,
      [slugs]
    );
    return new Map(rows.map((r) => [r.slug, r]));
  } finally {
    await client.query("ROLLBACK");
  }
}

function plan(source, row) {
  if (source.error) return { slug: source.slug, status: "invalid", notes: [source.error] };
  if (!row) return { slug: source.slug, status: "missing recipe", notes: ["no recipe_catalog row with this slug"] };
  if (!row.has_body) return { slug: source.slug, status: "missing body", notes: ["the recipe has no recipe_bodies row"] };
  const notes = [];
  const methodChange = row.method === null ? "new" : canonical(row.method) === canonical(source.method) ? "unchanged" : "changed";
  const minutesChange = row.total_minutes === source.method.totalMinutes ? null : { from: row.total_minutes, to: source.method.totalMinutes };
  if (minutesChange) notes.push(`total_minutes ${minutesChange.from ?? "empty"} -> ${minutesChange.to}`);
  const stored = [...(row.allergens ?? [])].map((a) => a.replace(/_/g, " ")).sort().join(", ");
  const listed = [...source.method.contains].sort().join(", ");
  if (stored !== listed) {
    notes.push(`"contains" says [${listed}] but the page shows the reviewed allergens [${stored}] ` +
      `(${row.allergen_review_state}); fix the allergens in the admin console if the method is right`);
  }
  if (source.missingPhotos.length) notes.push(`missing step photos: ${source.missingPhotos.join(", ")}`);
  if (row.open_draft && methodChange !== "unchanged") notes.push("an open admin draft for this recipe will need to rebase");
  if (row.publication_state !== "published") notes.push(`the recipe is ${row.publication_state}`);
  const status = methodChange === "unchanged" && !minutesChange ? "unchanged" : methodChange === "unchanged" ? "minutes only" : methodChange;
  return { slug: source.slug, status, notes, recipeId: row.id, method: source.method, minutesChange, methodChange,
    blocked: source.missingPhotos.length > 0 };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env[args.dbUrlEnv];
  if (!url) throw new Error(`Environment variable ${args.dbUrlEnv} is not set`);
  const target = new URL(url);
  const local = LOOPBACK.has(target.hostname);
  if (args.apply && !local && args.confirmHost !== target.hostname) {
    throw new Error(`Applying to ${target.hostname} needs --confirm-host ${target.hostname}`);
  }
  console.log(`Target: ${target.hostname}:${target.port || 5432}${target.pathname} (${args.apply ? "apply" : "dry run"})`);

  const { methodProblem, validateRecipeMethod } = await import("../src/lib/recipes/method.ts");
  const sources = args.slugs.map((slug) => readSource(args.dir, slug, validateRecipeMethod, methodProblem));

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const rows = await readDatabase(client, args.slugs);
    const plans = sources.map((source) => plan(source, rows.get(source.slug)));
    for (const p of plans) {
      console.log(`${p.slug}: ${p.status}`);
      for (const note of p.notes) console.log(`  - ${note}`);
    }
    const counts = plans.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {});
    console.log(`Summary: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}`);

    if (!args.apply) {
      console.log("Dry run: nothing was written. Add --apply to write.");
      return;
    }
    const refused = plans.filter((p) => !p.recipeId || p.blocked);
    if (refused.length) {
      throw new Error(`Nothing written. Fix these first: ${refused.map((p) => `${p.slug} (${p.status}${p.blocked ? ", missing photos" : ""})`).join("; ")}`);
    }
    await client.query("BEGIN");
    try {
      let methods = 0;
      let minutes = 0;
      for (const p of plans) {
        if (p.methodChange !== "unchanged") {
          await client.query("UPDATE public.recipe_bodies SET method = $2::jsonb, updated_at = now() WHERE recipe_id = $1",
            [p.recipeId, JSON.stringify(p.method)]);
          methods++;
        }
        if (p.minutesChange) {
          await client.query("UPDATE public.recipe_catalog SET total_minutes = $2, updated_at = now() WHERE id = $1",
            [p.recipeId, p.minutesChange.to]);
          minutes++;
        }
      }
      await client.query("COMMIT");
      console.log(`Applied: ${methods} method${methods === 1 ? "" : "s"}, ${minutes} total time${minutes === 1 ? "" : "s"}.`);
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
