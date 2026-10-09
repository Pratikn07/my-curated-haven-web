// Collection concurrency and scale checks against the owned loopback database only.
//
//   node scripts/admin-collections-concurrency.mjs --scenario <publish-race|checkout-race|correction-race|volume-race|lock-timeout|scale> \
//     [--output <ignored-json>]
//
// Race scenarios run the matching case of tests/e2e/admin-collections-concurrency.spec.ts (independent pg
// sessions, explicit lock barriers) and fail unless its invariant assertions pass. The scale scenario builds
// synthetic collections at 0, 3, 25 and 200 members and 1, 10 and 100 releases inside one transaction that is
// rolled back, then records execution time, buffers and sequential scans of growing tables for the main
// reads. These are fixture scales for finding missing indexes, not product limits or latency targets.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RACES = {
  "publish-race": "two publishers cannot commit the same stale base twice",
  "volume-race": "two collections cannot both take the same series volume",
  "checkout-race": "checkout and publication serialise on the collection",
  "correction-race": "a recipe correction and a collection publication that both touch the recipe never deadlock",
  "lock-timeout": "a held collection lock makes publication give up after its bounded timeout",
};
const MEMBERS = [0, 3, 25, 200];
const RELEASES = [1, 10, 100];
const GROWING = ["collection_recipes", "collection_releases", "access_entitlements", "access_sources",
  "collection_publications", "collection_revisions", "purchase_orders", "commercial_offers", "release_manifests"];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === "--scenario" || argv[i] === "--output") && argv[i + 1] !== undefined) args[argv[i].slice(2)] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
  }
  if (!args.scenario || !(args.scenario in RACES || args.scenario === "scale")) {
    throw new Error(`--scenario must be one of ${[...Object.keys(RACES), "scale"].join(", ")}`);
  }
  return args;
}

function databaseUrl() {
  const raw = process.env.ADMIN_TEST_DATABASE_URL;
  if (!raw || !["127.0.0.1", "localhost"].includes(new URL(raw).hostname)) {
    throw new Error("ADMIN_TEST_DATABASE_URL must name a loopback database");
  }
  return raw;
}

function race(scenario) {
  const run = spawnSync("npx", ["playwright", "test", "tests/e2e/admin-collections-concurrency.spec.ts",
    "--project=chromium-desktop", "--workers=1", "--reporter=json", "--grep", RACES[scenario]],
  { cwd: WEB, encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024 });
  const report = JSON.parse(run.stdout);
  const tests = report.suites.flatMap(function collect(suite) {
    return [...(suite.specs ?? []).flatMap((spec) => spec.tests.map((t) => ({ title: spec.title, status: t.results.at(-1)?.status,
      durationMs: t.results.at(-1)?.duration }))), ...(suite.suites ?? []).flatMap(collect)];
  });
  const ran = tests.filter((t) => t.status !== "skipped");
  return { scenario, passed: ran.length === 1 && ran[0].status === "passed", tests: ran };
}

/** Synthetic collections and one buyer per scale; everything stays inside the caller's transaction. */
async function buildScale(client) {
  const user = (await client.query(`INSERT INTO auth.users(id,email,role,aud,email_confirmed_at)
    VALUES (gen_random_uuid(),'scale-buyer@synthetic.test','authenticated','authenticated',now()) RETURNING id`)).rows[0].id;
  const recipes = (await client.query(`INSERT INTO public.recipe_catalog(slug,title,public_summary,preview_image_path,publication_state)
    SELECT 'scale-recipe-'||n,'Scale recipe '||n,'Synthetic','recipe-previews/x.webp','draft' FROM generate_series(1,200) n RETURNING id`))
    .rows.map((r) => r.id);
  await client.query(`INSERT INTO public.recipe_bodies(recipe_id,ingredients,instructions,yield,allergen_review_state)
    SELECT unnest($1::uuid[]),'[]','[]','1','reviewed_no_allergens'`, [recipes]);
  await client.query(`INSERT INTO private.recipe_reviews(recipe_id,content_version,reviewer_kind,reviewer,verdict,open_blockers)
    SELECT unnest($1::uuid[]),1,'human','scale','approve',0`, [recipes]);
  await client.query("UPDATE public.recipe_catalog SET publication_state='published' WHERE id = ANY($1)", [recipes]);
  const collections = [];
  for (const members of MEMBERS) {
    for (const releases of RELEASES) {
      const id = (await client.query(`INSERT INTO public.recipe_collections(slug,title,public_summary,listing_state)
        VALUES ($1,$2,'Synthetic','listed') RETURNING id`, [`scale-${members}-${releases}`, `Scale ${members}x${releases}`])).rows[0].id;
      const releaseIds = (await client.query(`INSERT INTO public.collection_releases(collection_id,version,state)
        SELECT $1, v, 'published' FROM generate_series(1,$2::int) v RETURNING id`, [id, releases])).rows.map((r) => r.id);
      if (members > 0) {
        await client.query(`INSERT INTO public.collection_recipes(release_id,recipe_id,position)
          SELECT r, ($2::uuid[])[m], m FROM unnest($1::uuid[]) r, generate_series(1,$3::int) m`,
        [releaseIds, recipes.slice(0, members), members]);
      }
      const latest = releaseIds.at(-1);
      await client.query("INSERT INTO public.access_entitlements(user_id,release_id,state) VALUES ($1,$2,'active')", [user, latest]);
      await client.query(`INSERT INTO private.access_sources(user_id,release_id,source_kind,source_id)
        VALUES ($1,$2,'native_legacy',$3)`, [user, latest, `scale-${latest}`]);
      collections.push({ id, members, releases, sampleRecipe: recipes[Math.max(0, members - 1)] });
    }
  }
  return { user, collections };
}

async function measure(client, label, sql, params, tables) {
  const before = await client.query("SELECT relname, seq_scan FROM pg_stat_xact_user_tables WHERE relname = ANY($1)", [tables]);
  const plan = (await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`, params)).rows[0]["QUERY PLAN"][0];
  const after = await client.query("SELECT relname, seq_scan FROM pg_stat_xact_user_tables WHERE relname = ANY($1)", [tables]);
  const seqScans = Object.fromEntries(after.rows.map((r) => [r.relname,
    Number(r.seq_scan) - Number(before.rows.find((b) => b.relname === r.relname)?.seq_scan ?? 0)]).filter(([, n]) => n > 0));
  return { read: label, executionMs: Math.round(plan["Execution Time"] * 100) / 100,
    sharedHitBlocks: plan.Plan["Shared Hit Blocks"], sharedReadBlocks: plan.Plan["Shared Read Blocks"], seqScans };
}

async function scale() {
  const client = new pg.Client({ connectionString: databaseUrl() });
  await client.connect();
  const results = [];
  try {
    await client.query("BEGIN");
    const { user, collections } = await buildScale(client);
    await client.query("ANALYZE public.collection_recipes, public.collection_releases, public.access_entitlements, private.access_sources");
    const claims = async (subject) => client.query(
      "SELECT set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)",
      [subject, JSON.stringify({ sub: subject, aal: "aal1", role: "authenticated" })]);
    results.push({ scale: "all", ...(await measure(client, "buyer library (all 12 collections)",
      "SELECT private.user_collection_library($1)", [user], GROWING)) });
    for (const c of collections) {
      await claims(user);
      results.push({ scale: `${c.members}x${c.releases}`, ...(await measure(client, "collection access",
        "SELECT private.collection_has_access($1,$2)", [user, c.id], GROWING)) });
      if (c.members > 0) {
        results.push({ scale: `${c.members}x${c.releases}`, ...(await measure(client, "recipe effective access",
          "SELECT public.recipe_effective_access($1)", [c.sampleRecipe], GROWING)) });
      }
      results.push({ scale: `${c.members}x${c.releases}`, ...(await measure(client, "checkout sellable",
        "SELECT private.collection_sellable($1)", [c.id], GROWING)) });
      results.push({ scale: `${c.members}x${c.releases}`, ...(await measure(client, "protected members",
        "SELECT count(*) FROM private.collection_protected_members($1)", [c.id], GROWING)) });
      results.push({ scale: `${c.members}x${c.releases}`, ...(await measure(client, "collection impact",
        "SELECT private.collection_impact($1)", [c.id], GROWING)) });
    }
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    await client.end();
  }
  // A read that loops per member or per release shows as many scans of the same table; batched reads stay at a few.
  const perRowLoops = results.filter((r) => Object.values(r.seqScans).some((n) => n > 5));
  const membershipScans = results.filter((r) => r.scale.endsWith("x100") && (r.seqScans.collection_recipes ?? 0) > 0);
  return { scenario: "scale", passed: perRowLoops.length === 0 && membershipScans.length === 0, results, perRowLoops,
    membershipScans };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  databaseUrl();
  const summary = args.scenario === "scale" ? await scale() : race(args.scenario);
  const text = `${JSON.stringify(summary, null, 2)}\n`;
  if (args.output) writeFileSync(args.output, text); else process.stdout.write(text);
  console.error(`${args.scenario}: ${summary.passed ? "passed" : "FAILED"}`);
  if (!summary.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
