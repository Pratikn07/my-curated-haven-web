#!/usr/bin/env node
// Phase 3 upgrade rehearsal on the owned loopback test stack only (Task 21).
//
//   node scripts/admin-support-migration-rehearsal.mjs --workdir .superpowers/sdd/2026-10-09-admin-support/local [--output <ignored-json>]
//
// 1. Rebuild the database at the last pre-Phase-3 migration and add legacy data: an order whose snapshot lacks the
//    newer terms, a refund recorded against another order's payment (a binding conflict), and an admin without any
//    support role.
// 2. Run the runbook's read-only discrepancy check, then apply Phase 3: the binding conflict must stop the upgrade
//    rather than be relinked or deleted silently.
// 3. Apply the reviewed correction and finish the upgrade; check that legacy terms stay unknown, that existing admins
//    gain no support access, that automated judgement stays blocked without an approved policy, and that the owner's
//    stage switch refuses diagnosis and repair until their requirements exist while turning support down works.
// 4. Rebuild the database at the current schema. The rehearsal never touches another stack.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { loopbackTarget } from "./admin-support-concurrency-plan.mjs";

const PRE_PHASE_THREE = "20261008001300";
const argv = process.argv.slice(2);
const workdir = argv[argv.indexOf("--workdir") + 1];
const output = argv.includes("--output") ? argv[argv.indexOf("--output") + 1] : null;
if (!argv.includes("--workdir") || !workdir) throw new Error("--workdir is required");
const root = resolve(process.cwd(), "..");
const target = loopbackTarget(readFileSync(resolve(root, workdir, "supabase/config.toml"), "utf8"));
const steps = [];
const step = (name, passed, detail = null) => {
  steps.push({ name, passed: Boolean(passed), ...(detail === null ? {} : { detail }) });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail === null ? "" : ` (${typeof detail === "string" ? detail : JSON.stringify(detail)})`}`);
};

function supabase(args) {
  const run = spawnSync("supabase", [...args, "--workdir", workdir], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { ok: run.status === 0, text: `${run.stdout}\n${run.stderr}` };
}
async function withDb(fn) {
  const client = new pg.Client({ connectionString: target.url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
const reloadSchema = () => withDb((c) => c.query("NOTIFY pgrst, 'reload schema'"));
// Containers can report "not ready" after a successful replay; the database itself is what matters here.
const migrationsAt = () => withDb(async (c) => (await c.query("SELECT max(version) v, count(*)::int n FROM supabase_migrations.schema_migrations")).rows[0]);

const ids = { owner: randomUUID(), editor: randomUUID(), buyer: randomUUID(), collection: randomUUID(), release: randomUUID(),
  recipe: randomUUID(), offer: randomUUID(), legacy: randomUUID(), orderX: randomUUID(), orderY: randomUUID(), paymentX: randomUUID(),
  paymentY: randomUUID() };

let exitCode = 0;
try {
  // 1. The integrated pre-Phase-3 schema with legacy data.
  supabase(["db", "reset", "--local", "--version", PRE_PHASE_THREE]);
  const before = await migrationsAt();
  step("database rebuilt at the last pre-Phase-3 migration", before.v === PRE_PHASE_THREE, before);
  await withDb(async (c) => {
    await c.query(`INSERT INTO auth.users(id, email, role, aud, email_confirmed_at) VALUES
      ($1, 'rehearsal-owner@synthetic.test', 'authenticated', 'authenticated', now()),
      ($2, 'rehearsal-editor@synthetic.test', 'authenticated', 'authenticated', now()),
      ($3, 'rehearsal-buyer@synthetic.test', 'authenticated', 'authenticated', now())`, [ids.owner, ids.editor, ids.buyer]);
    await c.query(`INSERT INTO private.admin_memberships(user_id, role, granted_by, reason) VALUES
      ($1, 'owner', $1, 'rehearsal'), ($2, 'editor', $1, 'rehearsal')`, [ids.owner, ids.editor]);
    await c.query(`INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path, total_minutes, publication_state)
      VALUES ($1, 'rehearsal-recipe', 'Rehearsal recipe', 'Synthetic', 'recipe-previews/r.webp', 10, 'published')`, [ids.recipe]);
    await c.query("INSERT INTO public.recipe_bodies(recipe_id, yield, allergen_review_state, allergens) VALUES ($1, '2', 'reviewed_no_allergens', '{}')", [ids.recipe]);
    await c.query("INSERT INTO public.recipe_collections(id, slug, title, public_summary, listing_state) VALUES ($1, 'rehearsal', 'Rehearsal', 'Synthetic', 'unlisted')", [ids.collection]);
    await c.query("INSERT INTO public.collection_releases(id, collection_id, version, state) VALUES ($1, $2, 1, 'published')", [ids.release, ids.collection]);
    await c.query("INSERT INTO public.collection_recipes(release_id, recipe_id, position) VALUES ($1, $2, 1)", [ids.release, ids.recipe]);
    await c.query(`INSERT INTO private.commercial_offers(id, release_id, provider_account_id, provider_mode, provider_product_id, provider_price_id,
      currency, base_minor_amount, sale_enabled, manifest_hash) VALUES ($1, $2, 'acct_rehearsal', 'test', 'prod_r', 'price_r', 'usd', 1500, false, $3)`,
    [ids.offer, ids.release, "b".repeat(64)]);
    // Legacy snapshots: no refund or access policy version, no manifest.
    const legacySnapshot = { offer_id: ids.offer, release_id: ids.release, price_minor: 1500, currency: "usd", provider_account_id: "acct_rehearsal",
      provider_mode: "test", terms_version: "v1" };
    for (const [id, n] of [[ids.legacy, 1], [ids.orderX, 2], [ids.orderY, 3]]) {
      await c.query(`INSERT INTO private.purchase_orders(id, support_reference, owner_principal, user_id, offer_id, release_id, snapshot,
        attempt_state, session_id, idempotency_key, version) VALUES ($1, $2, $3, $3, $4, $5, $6::jsonb, 'closed', $7, $8, 1)`,
      [id, `MCH-RH${n}`, ids.buyer, ids.offer, ids.release, legacySnapshot, `cs_test_rehearsal_${n}`, `rehearsal-${n}`]);
    }
    await c.query(`INSERT INTO private.provider_payments(id, order_id, provider_account_id, provider_mode, payment_intent_id, charge_id, status,
      captured_amount, currency, paid_at) VALUES ($1, $2, 'acct_rehearsal', 'test', 'pi_rehearsal_x', 'ch_rehearsal_x', 'succeeded', 1500, 'usd', now()),
      ($3, $4, 'acct_rehearsal', 'test', 'pi_rehearsal_y', 'ch_rehearsal_y', 'succeeded', 1500, 'usd', now())`,
    [ids.paymentX, ids.orderX, ids.paymentY, ids.orderY]);
    // The binding conflict: a refund on order Y that points at order X's payment.
    await c.query(`INSERT INTO private.payment_refunds(provider_refund_id, order_id, payment_id, amount, currency, status, occurred_at)
      VALUES ('re_rehearsal_conflict', $1, $2, 100, 'usd', 'succeeded', now())`, [ids.orderY, ids.paymentX]);
  });
  step("legacy orders, a binding conflict and a support-role-free admin are in place", true);

  // 2. Read-only discrepancy check, then the upgrade must stop.
  const discrepancies = await withDb(async (c) => (await c.query(`SELECT 'refund' AS kind, r.provider_refund_id AS provider_id
    FROM private.payment_refunds r JOIN private.provider_payments p ON p.id = r.payment_id WHERE r.order_id <> p.order_id
    UNION ALL SELECT 'dispute', d.provider_dispute_id FROM private.payment_disputes d JOIN private.provider_payments p ON p.id = d.payment_id
    WHERE d.order_id <> p.order_id`)).rows);
  step("the read-only check reports the conflict", discrepancies.length === 1 && discrepancies[0].provider_id === "re_rehearsal_conflict", discrepancies);
  const blocked = supabase(["migration", "up", "--local"]);
  const stopped = await migrationsAt();
  step("the upgrade stops at the shared writer migration instead of relinking", !blocked.ok
    && /payment_refunds_payment_order_fk/.test(blocked.text) && stopped.v === "20261009010500", { stoppedAt: stopped.v });
  const untouched = await withDb(async (c) => (await c.query("SELECT order_id, payment_id FROM private.payment_refunds WHERE provider_refund_id = 're_rehearsal_conflict'")).rows[0]);
  step("the conflicting refund is left exactly as it was", untouched.order_id === ids.orderY && untouched.payment_id === ids.paymentX);

  // 3. The reviewed correction (the refund belongs to order X), then the rest of the upgrade.
  await withDb((c) => c.query("UPDATE private.payment_refunds SET order_id = $1 WHERE provider_refund_id = 're_rehearsal_conflict'", [ids.orderX]));
  const finished = supabase(["migration", "up", "--local"]);
  const after = await migrationsAt();
  step("after the reviewed correction the upgrade completes", finished.ok && after.v >= "20261009011300", { at: after.v, count: after.n });
  await reloadSchema();
  await withDb(async (c) => {
    const roles = (await c.query("SELECT array_agg(role ORDER BY role) r FROM private.admin_memberships WHERE user_id = $1 AND active", [ids.editor])).rows[0].r;
    step("an existing admin gains no support role", JSON.stringify(roles) === JSON.stringify(["editor"]), roles);
    const binding = (await c.query("SELECT private.commerce_order_binding($1) b", [ids.legacy])).rows[0].b;
    step("legacy terms stay unknown rather than filled from today's offer", binding.refundPolicyVersion === null
      && binding.accessPolicyVersion === null && binding.manifestHash !== "b".repeat(64), { refund: binding.refundPolicyVersion, access: binding.accessPolicyVersion });
    const policy = (await c.query("SELECT private.commerce_policy_for(NULL, NULL) p")).rows[0].p;
    step("automated judgement of legacy orders stays blocked without an approved policy", policy === null);
    const stage = (await c.query("SELECT stage, note_retention_days, observation_retention_days FROM private.support_workspace_settings")).rows[0];
    step("support starts switched off with no retention set", stage.stage === "disabled" && stage.note_retention_days === null
      && stage.observation_retention_days === null, stage);
    const asOwner = async (sql) => {
      await c.query("BEGIN");
      try {
        await c.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ids.owner, aal: "aal2", role: "authenticated" })]);
        await c.query("SET LOCAL ROLE authenticated");
        const r = (await c.query(sql)).rows[0]?.r;
        await c.query("COMMIT");
        return { ok: true, r };
      } catch (error) {
        await c.query("ROLLBACK");
        return { ok: false, code: error.message.match(/ADM_[A-Z_]+/)?.[0] ?? error.message };
      }
    };
    const sending = (await c.query("SELECT refund_submission_enabled FROM private.support_workspace_settings")).rows[0].refund_submission_enabled;
    step("refund sending starts switched off", sending === false);
    const grants = (await c.query(`SELECT r.rolname, array_agg(p.proname::text ORDER BY p.proname) fns FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace CROSS JOIN pg_roles r
      WHERE p.proname LIKE '%refund%' AND r.rolname IN ('anon', 'authenticated', 'mch_support_operator', 'mch_commerce_verifier')
        AND has_function_privilege(r.oid, p.oid, 'EXECUTE') AND (n.nspname = 'private' OR r.rolname <> 'authenticated')
      GROUP BY r.rolname`)).rows;
    const byRole = Object.fromEntries(grants.map((g) => [g.rolname, g.fns]));
    step("only the verifier login runs private refund steps, and only reading requests and recording answers",
      !byRole.anon && !byRole.authenticated && !byRole.mch_support_operator && JSON.stringify(byRole.mch_commerce_verifier) === JSON.stringify(
        ["support_refund_dispatch_payload", "support_refund_expire_claim", "support_refund_reconciled", "support_refund_recovery_target",
          "support_refund_result_record"]), byRole);
    const refundOff = await asOwner(`SELECT public.admin_support_refund_check_begin('${ids.orderX}', gen_random_uuid()) AS r`);
    step("an owner refund is refused while support is off", !refundOff.ok && refundOff.code === "ADM_DISABLED", refundOff.code ?? "allowed");
    const repair = await asOwner("SELECT public.admin_support_set_stage('repair', 'Rehearsal', gen_random_uuid()) AS r");
    const diagnosis = await asOwner("SELECT public.admin_support_set_stage('diagnosis', 'Rehearsal', gen_random_uuid()) AS r");
    step("diagnosis and repair cannot be switched on before their requirements", !repair.ok && repair.code === "ADM_BLOCKED"
      && !diagnosis.ok && diagnosis.code === "ADM_BLOCKED", [repair.code, diagnosis.code]);
    const inspection = await asOwner("SELECT public.admin_support_set_stage('inspection', 'Rehearsal', gen_random_uuid()) AS r");
    const off = await asOwner("SELECT public.admin_support_set_stage('disabled', 'Rehearsal', gen_random_uuid()) AS r");
    step("inspection can be switched on and support switched off again", inspection.ok && off.ok);
    const commerce = (await c.query("SELECT count(*)::int n FROM pg_proc WHERE proname IN ('record_payment_and_grant_access','record_refund_and_recompute_access')")).rows[0].n;
    step("the existing payment procedures remain for ordinary commerce", commerce === 2);
  });
} catch (error) {
  step("rehearsal ran", false, error.message);
} finally {
  // 4. Back to the current schema, clean.
  supabase(["db", "reset", "--local"]);
  const current = await migrationsAt().catch(() => null);
  step("the owned database is rebuilt at the current schema", current !== null && current.v >= "20261009011300", current);
  await reloadSchema().catch(() => {});
  if (steps.some((s) => !s.passed)) exitCode = 1;
  console.log(`${steps.filter((s) => s.passed).length}/${steps.length} rehearsal checks passed`);
  if (output) writeFileSync(output, JSON.stringify({ target: target.projectId, steps }, null, 2));
  process.exitCode = exitCode;
}
