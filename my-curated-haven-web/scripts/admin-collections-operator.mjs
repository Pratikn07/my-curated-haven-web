// Restricted operator channel for collection publication and recipe corrections. Preview is the default.
//
//   node scripts/admin-collections-operator.mjs --db-url-env OPERATOR_DB_URL preview --collection <id> --out proposal.json
//   node scripts/admin-collections-operator.mjs --db-url-env OPERATOR_DB_URL preview-recipe --recipe <id> --out proposal.json
//   node scripts/admin-collections-operator.mjs --db-url-env OPERATOR_DB_URL attest --proposal proposal.json \
//     --human <uuid> --evidence-ref <chat or ticket reference> --proposed-at <ISO time the question was asked> \
//     --reason "<why>" [--evidence-excerpt "<the human's words, at most 500 characters>"] [--approve-now] \
//     [--decision <release-id>:<source-kind>:<additions-v1|original-only> ...]
//   node scripts/admin-collections-operator.mjs --db-url-env OPERATOR_DB_URL publish --authorisation <id> [--operation <uuid>]
//   node scripts/admin-collections-operator.mjs --db-url-env OPERATOR_DB_URL correct --authorisation <id> [--operation <uuid>]
//
// The connection string names a registered operator login (see ops/ADMIN-COLLECTIONS.md); there is no default
// target and no service-role key. The script never decides that a human approved: attest needs the human's
// id, the evidence reference and the time the exact question was asked, all supplied by the person running it.
// The database checks the operator, the human's current authority and the exact proposal, not the truth of
// the evidence.
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMMANDS = new Set(["preview", "preview-recipe", "attest", "publish", "correct"]);

function parseArgs(argv) {
  const args = { decisions: [], approveNow: false };
  const values = new Set(["--db-url-env", "--collection", "--recipe", "--out", "--proposal", "--human", "--evidence-ref",
    "--evidence-excerpt", "--proposed-at", "--reason", "--authorisation", "--operation"]);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (COMMANDS.has(arg) && !args.command) args.command = arg;
    else if (arg === "--approve-now") args.approveNow = true;
    else if (arg === "--decision" && argv[i + 1] !== undefined) args.decisions.push(argv[++i]);
    else if (values.has(arg) && argv[i + 1] !== undefined) args[arg.slice(2)] = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  if (!args["db-url-env"]) throw new Error("--db-url-env <ENV_NAME> is required; there is no default target");
  args.command ??= "preview";
  return args;
}

function requireUuid(value, flag) {
  if (!value || !UUID.test(value)) throw new Error(`${flag} <uuid> is required`);
  return value;
}

function write(text, out) {
  if (out) writeFileSync(out, text); else process.stdout.write(text);
}

async function preview(client, args) {
  const collection = requireUuid(args.collection, "--collection");
  const { rows } = await client.query("SELECT private.collection_operator_preview($1, NULL) p", [collection]);
  const proposal = { kind: "collection.publish", ...rows[0].p };
  write(`${JSON.stringify(proposal, null, 2)}\n`, args.out);
  const checks = proposal.evaluation?.value?.checks ?? [];
  const blocking = checks.filter((c) => c.severity === "blocker" && c.state !== "pass");
  console.error(blocking.length ? `Not ready: ${blocking.map((c) => c.explanation).join(" ")}` : "Ready for a decision.");
  if (proposal.undecidedAccess?.length) {
    console.error(`Buyer groups without an additions decision: ${proposal.undecidedAccess
      .map((u) => `${u.releaseId}:${u.sourceKind} (${u.buyers})`).join(", ")}`);
  }
  console.error(`Ask the human exactly: "Approve and publish this update to ${proposal.title}?"`);
}

async function previewRecipe(client, args) {
  const recipe = requireUuid(args.recipe, "--recipe");
  const { rows } = await client.query("SELECT private.recipe_operator_preview($1) p", [recipe]);
  const proposal = { kind: "recipe.correct", ...rows[0].p };
  write(`${JSON.stringify(proposal, null, 2)}\n`, args.out);
  console.error(`Reaches: ${proposal.collections.map((c) => c.title).join(", ") || "no collection"}.`);
  console.error(`Ask the human exactly: "Approve and publish this correction to ${proposal.title}?"`);
}

function decisions(proposal, flags) {
  const parsed = flags.map((flag) => {
    const [releaseId, sourceKind, policy] = flag.split(":");
    if (!UUID.test(releaseId ?? "") || !sourceKind || !["additions-v1", "original-only"].includes(policy)) {
      throw new Error(`--decision must be <release-id>:<source-kind>:<additions-v1|original-only>, got ${flag}`);
    }
    return { release_id: releaseId, source_kind: sourceKind, policy };
  });
  const missing = (proposal.undecidedAccess ?? []).filter((u) =>
    !parsed.some((d) => d.release_id === u.releaseId && d.source_kind === u.sourceKind));
  if (missing.length) {
    throw new Error(`The human must decide every buyer group: ${missing.map((u) => `${u.releaseId}:${u.sourceKind}`).join(", ")}`);
  }
  return parsed;
}

async function attest(client, args) {
  if (!args.proposal) throw new Error("--proposal <file from preview> is required: attest only what was shown");
  const proposal = JSON.parse(readFileSync(args.proposal, "utf8"));
  const human = requireUuid(args.human, "--human");
  if (!args["evidence-ref"]) throw new Error("--evidence-ref is required: where the human said yes");
  if (!args["proposed-at"] || Number.isNaN(Date.parse(args["proposed-at"]))) {
    throw new Error("--proposed-at <ISO time the question was asked> is required");
  }
  if (!args.reason || args.reason.trim().length === 0) throw new Error("--reason is required");
  if ((args["evidence-excerpt"] ?? "").length > 500) throw new Error("--evidence-excerpt is limited to 500 characters");
  const common = { human_id: human, reason: args.reason, evidence_ref: args["evidence-ref"],
    evidence_excerpt: args["evidence-excerpt"] ?? null, proposed_at: args["proposed-at"],
    revision_id: proposal.revisionId, expected_version: proposal.version, expected_digest: proposal.digest, base: proposal.base };
  const authorisation = proposal.kind === "recipe.correct"
    ? { ...common, target_kind: "recipe.correct", target_id: proposal.recipeId, impact_token: proposal.impactToken }
    : { ...common, target_kind: "collection.publish", target_id: proposal.collectionId,
      impact_token: proposal.evaluation?.value?.token, approve_now: args.approveNow,
      access_decisions: decisions(proposal, args.decisions) };
  const { rows } = await client.query("SELECT private.collection_operator_attest($1::jsonb) id", [authorisation]);
  console.log(rows[0].id);
  console.error("Attestation recorded. It can be executed once by this operator within 30 minutes.");
}

async function execute(client, args, procedure) {
  const authorisation = requireUuid(args.authorisation, "--authorisation");
  const operation = args.operation ? requireUuid(args.operation, "--operation") : randomUUID();
  const { rows } = await client.query(`SELECT private.${procedure}($1, $2) r`, [authorisation, operation]);
  console.log(JSON.stringify(rows[0].r, null, 2));
  console.error(`Committed. Re-running with --operation ${operation} returns this receipt. ` +
    "Public pages refresh from the admin workspace (Retry refresh) or on their next scheduled revalidation.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env[args["db-url-env"]];
  if (!url) throw new Error(`Environment variable ${args["db-url-env"]} is not set`);
  const target = new URL(url);
  console.error(`Target: ${target.hostname}:${target.port || 5432}${target.pathname} as ${decodeURIComponent(target.username)} (${args.command})`);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    if (args.command === "preview") await preview(client, args);
    else if (args.command === "preview-recipe") await previewRecipe(client, args);
    else if (args.command === "attest") await attest(client, args);
    else if (args.command === "publish") await execute(client, args, "collection_operator_publish");
    else await execute(client, args, "recipe_operator_correct");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
