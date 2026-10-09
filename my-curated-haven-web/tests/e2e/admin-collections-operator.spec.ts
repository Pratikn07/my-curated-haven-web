import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCollectionsFixture, type CollectionsFixture } from "./collections-admin-fixtures";

// The restricted operator channel through real database logins and the CLI. No browser is involved, so one
// project runs it.
test.describe.configure({ mode: "serial" });

let f: CollectionsFixture;
const suffix = crypto.randomBytes(3).toString("hex");
const operator = `op_e2e_${suffix}`;
const stranger = `op_e2e_stranger_${suffix}`;
const password = crypto.randomBytes(12).toString("hex");
const work = mkdtempSync(join(tmpdir(), "mch-operator-"));

function loginUrl(role: string): string {
  const url = new URL(process.env.ADMIN_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54342/postgres");
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") throw new Error("Operator spec refuses non-loopback databases.");
  url.username = role;
  url.password = password;
  return url.toString();
}

/** Run the operator CLI as a database login; returns stdout, stderr and whether it succeeded. */
function cli(role: string, args: string[]) {
  const run = spawnSync("node", ["scripts/admin-collections-operator.mjs", "--db-url-env", "OPERATOR_DB_URL", ...args],
    { env: { ...process.env, OPERATOR_DB_URL: loginUrl(role) }, encoding: "utf8" });
  return { ok: run.status === 0, stdout: run.stdout, stderr: run.stderr };
}

test.beforeAll(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "database channel; one project is enough");
  f = await createCollectionsFixture();
  await f.setCollectionStage("publication");
  await f.recordCampaigns();
  await f.query("UPDATE public.recipe_catalog SET publication_state='published' WHERE id = ANY($1)",
    [[f.recipeIds[0], f.extraRecipes.reviewed.id]]);
  await f.prepareDraft({ tagline: "Prepared for the operator" });
  for (const role of [operator, stranger]) {
    await f.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}'`);
    await f.query(`GRANT mch_collection_operator TO ${role}`);
  }
  await f.query("SELECT private.collection_operator_register($1,'E2E agent',$2)", [operator, f.ownerId]);
});

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "chromium-desktop" || !f) return;
  await f.query("ALTER TABLE private.collection_operator_authorisations DISABLE TRIGGER collection_operator_authorisations_guard");
  try {
    await f.query("DELETE FROM private.collection_operator_authorisations WHERE attested_by=$1", [operator]);
  } finally {
    await f.query("ALTER TABLE private.collection_operator_authorisations ENABLE TRIGGER collection_operator_authorisations_guard");
  }
  await f.query("DELETE FROM private.collection_operator_principals WHERE principal=$1", [operator]);
  for (const role of [operator, stranger]) await f.query(`DROP ROLE IF EXISTS ${role}`);
  await f.dispose();
});

test("an unregistered login in the operator group is refused", () => {
  const result = cli(stranger, ["preview", "--collection", f.collectionId]);
  expect(result.ok).toBe(false);
  expect(result.stderr).toContain("ADM_DENIED");
});

test("an operator previews, records the owner's attested approval and publishes under its own login", async () => {
  const proposal = join(work, "proposal.json");
  const preview = cli(operator, ["preview", "--collection", f.collectionId, "--out", proposal]);
  expect(preview.ok).toBe(true);
  expect(preview.stderr).toContain(`as ${operator} (preview)`);
  expect(preview.stderr).toContain(`Ask the human exactly: "Approve and publish this update to ${f.title}?"`);

  const missingEvidence = cli(operator, ["attest", "--proposal", proposal, "--human", f.ownerId,
    "--proposed-at", new Date().toISOString(), "--reason", "Owner approved", "--approve-now"]);
  expect(missingEvidence.ok).toBe(false);
  expect(missingEvidence.stderr).toContain("--evidence-ref is required");

  const attested = cli(operator, ["attest", "--proposal", proposal, "--human", f.ownerId, "--evidence-ref", "chat:e2e-1",
    "--evidence-excerpt", "Yes, publish it", "--proposed-at", new Date().toISOString(), "--reason", "Owner approved in chat",
    "--approve-now"]);
  expect(attested.ok).toBe(true);
  const authorisation = attested.stdout.trim();
  expect(authorisation).toMatch(/^[0-9a-f-]{36}$/);

  const operation = crypto.randomUUID();
  const published = cli(operator, ["publish", "--authorisation", authorisation, "--operation", operation]);
  expect(published.ok).toBe(true);
  expect(JSON.parse(published.stdout)).toMatchObject({ operationId: operation, noChange: false });
  const again = cli(operator, ["publish", "--authorisation", authorisation, "--operation", operation]);
  expect(JSON.parse(again.stdout)).toEqual(JSON.parse(published.stdout));

  const { rows } = await f.query(`SELECT a.human_authoriser, a.executor_id, a.executor_type, d.attestation_id
    FROM private.collection_audit a JOIN private.collection_review_decisions d ON d.operation_id=a.operation_id
    WHERE a.action='collection.publish' AND a.operation_id=$1`, [operation]);
  expect(rows[0]).toMatchObject({ human_authoriser: f.ownerId, executor_id: `operator:${operator}`, executor_type: "operator",
    attestation_id: authorisation });
  const job = await f.query("SELECT state FROM private.collection_refresh_jobs WHERE operation_id=$1", [operation]);
  expect(job.rows[0].state).toBe("pending");
});
