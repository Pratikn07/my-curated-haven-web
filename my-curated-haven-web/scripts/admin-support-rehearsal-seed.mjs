#!/usr/bin/env node
// Synthetic scenarios for the owner's Phase 3 walkthrough, on the owned loopback test stack only (Task 22).
//
//   node scripts/admin-support-rehearsal-seed.mjs --workdir .superpowers/sdd/2026-10-09-admin-support/local --owner-email <email>
//
// The owner first signs in once to the local app with that email (the code arrives in the owned stack's local mail)
// and sets up a second factor. This script then makes that account the owner, switches support on in the local
// database, and creates four synthetic customers and orders with @synthetic.test emails. It prints only support
// references and what each scenario is for. Nothing here can reach another stack; `supabase db reset` removes it all.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import { loopbackTarget } from "./admin-support-concurrency-plan.mjs";

function parseArgs(argv) {
  const args = { workdir: null, ownerEmail: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--workdir" && argv[i + 1]) args.workdir = argv[++i];
    else if (argv[i] === "--owner-email" && argv[i + 1]) args.ownerEmail = argv[++i].trim().toLowerCase();
    else throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
  }
  if (!args.workdir || !args.ownerEmail) throw new Error("--workdir and --owner-email are required");
  return args;
}

const args = parseArgs(process.argv.slice(2));
const target = loopbackTarget(readFileSync(resolve(process.cwd(), "..", args.workdir, "supabase/config.toml"), "utf8"));
const POLICY = "rehearsal-v1";
const client = new pg.Client({ connectionString: target.url });
await client.connect();
const q = (sql, params = []) => client.query(sql, params).then((r) => r.rows);

try {
  await client.query("BEGIN");
  const owner = (await q("SELECT id FROM auth.users WHERE lower(email) = $1", [args.ownerEmail]))[0];
  if (!owner) throw new Error("Sign in to the local app once with that email first, then run this again.");
  const other = (await q("SELECT user_id FROM private.admin_memberships WHERE role = 'owner' AND active AND user_id <> $1", [owner.id]))[0];
  if (other) throw new Error("Another account is already the local owner. Reset the owned stack, or use that account.");
  await q(`INSERT INTO private.admin_memberships(user_id, role, granted_by, reason) SELECT $1, 'owner', $1, 'Phase 3 owner rehearsal'
    WHERE NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = $1 AND role = 'owner' AND active)`, [owner.id]);
  await q("UPDATE private.admin_console_settings SET stage = 'publication' WHERE singleton");
  await q("UPDATE private.collection_workspace_settings SET stage = 'publication' WHERE singleton");
  await q(`UPDATE private.support_workspace_settings SET stage = 'repair', note_retention_days = 90, observation_retention_days = 90,
    refund_submission_enabled = true, dispute_notice_enabled = true, notice_retention_days = 90, notice_support_email = 'support@synthetic.test'
    WHERE singleton`);
  await q(`INSERT INTO private.commerce_verifier_principals(principal, label, registered_by) VALUES (current_user, 'Rehearsal verifier', $1)
    ON CONFLICT (principal) DO UPDATE SET revoked_at = NULL`, [owner.id]);
  await q(`INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
    VALUES ($1, $1, $2::jsonb, $3, 'Synthetic rehearsal policy') ON CONFLICT DO NOTHING`, [POLICY, { id: POLICY, approved: true, version: POLICY,
    pendingRefund: "retain", partialRefund: "retain", fullRefund: "ineligible", inquiry: "retain", formalOpen: "hold", formalLost: "ineligible",
    duration: "indefinite", fixedSeconds: null }, owner.id]);

  // One synthetic collection with two recipes, sold in test mode for $15.00.
  const tag = randomUUID().slice(0, 6);
  const collection = randomUUID();
  const release = randomUUID();
  const offer = randomUUID();
  const recipes = [randomUUID(), randomUUID()];
  for (const [i, id] of recipes.entries()) {
    await q(`INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path, total_minutes, publication_state)
      VALUES ($1, $2, $3, 'Synthetic', 'recipe-previews/rehearsal.webp', 10, 'published')`, [id, `rehearsal-${tag}-${i}`, `Rehearsal recipe ${i + 1}`]);
    await q("INSERT INTO public.recipe_bodies(recipe_id, yield, allergen_review_state, allergens) VALUES ($1, '2 portions', 'reviewed_no_allergens', '{}')", [id]);
  }
  await q("INSERT INTO public.recipe_collections(id, slug, title, public_summary, listing_state) VALUES ($1, $2, 'Rehearsal recipes', 'Synthetic', 'unlisted')",
    [collection, `rehearsal-${tag}`]);
  await q("INSERT INTO public.collection_releases(id, collection_id, version, state) VALUES ($1, $2, 1, 'published')", [release, collection]);
  for (const [i, id] of recipes.entries()) {
    await q("INSERT INTO public.collection_recipes(release_id, recipe_id, position) VALUES ($1, $2, $3)", [release, id, i + 1]);
  }
  await q(`INSERT INTO private.commercial_offers(id, release_id, provider_account_id, provider_mode, provider_product_id, provider_price_id,
    currency, base_minor_amount, sale_enabled, manifest_hash) VALUES ($1, $2, 'acct_rehearsal', 'test', $3, $4, 'usd', 1500, false, $5)`,
    [offer, release, `prod_rehearsal_${tag}`, `price_rehearsal_${tag}`, "b".repeat(64)]);
  for (const kind of ["stripe_purchase", "support_grant"]) {
    await q(`INSERT INTO private.collection_access_policies(release_id, source_kind, policy, approved_by, approval_reason)
      VALUES ($1, $2, 'additions-v1', $3, 'Synthetic rehearsal') ON CONFLICT DO NOTHING`, [release, kind, owner.id]);
  }

  const scenarios = [
    { label: "locked", what: "Paid, but the customer cannot open the collection: check provider status, prepare and apply a repair", access: false },
    { label: "refund", what: "Paid with access: prepare a partial refund, then a full refund; try a double click and switching sending off", access: true },
    { label: "grant", what: "Paid, and the customer also has a support grant: a full refund keeps their access through the grant", access: true,
      grant: true },
    { label: "dispute", what: "Formal dispute open with a deadline in 7 days: see the hold, then prepare, approve and send the notice", access: true,
      dispute: true },
  ];
  const out = [];
  for (const [n, s] of scenarios.entries()) {
    const user = randomUUID();
    await q("INSERT INTO auth.users(id, email, role, aud, email_confirmed_at) VALUES ($1, $2, 'authenticated', 'authenticated', now())",
      [user, `rehearsal-${tag}-${s.label}@synthetic.test`]);
    const order = randomUUID();
    const reference = `MCH-R${tag.slice(0, 4).toUpperCase()}${n + 1}`;
    const snapshot = { offer_id: offer, release_id: release, price_id: `price_rehearsal_${tag}`, price_minor: 1500, currency: "usd",
      provider_account_id: "acct_rehearsal", provider_mode: "test", terms_version: "v1", collection_id: collection,
      refund_policy_version: POLICY, access_policy_version: POLICY, member_recipe_ids: recipes, manifest_hash: "b".repeat(64) };
    await q(`INSERT INTO private.purchase_orders(id, support_reference, owner_principal, user_id, offer_id, release_id, snapshot, attempt_state,
      session_id, idempotency_key, version) VALUES ($1, $2, $3, $3, $4, $5, $6::jsonb, 'closed', $7, $8, 1)`,
      [order, reference, user, offer, release, snapshot, `cs_test_rehearsal_${tag}_${n}`, `rehearsal-${tag}-${n}`]);
    const payment = randomUUID();
    await q(`INSERT INTO private.provider_payments(id, order_id, provider_account_id, provider_mode, payment_intent_id, charge_id, status,
      captured_amount, currency, paid_at, verified_at) VALUES ($1, $2, 'acct_rehearsal', 'test', $3, $4, 'succeeded', 1500, 'usd', now(), now())`,
      [payment, order, `pi_rehearsal_${tag}_${n}`, `ch_rehearsal_${tag}_${n}`]);
    if (s.access) {
      await q(`INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
        VALUES ($1, $2, 'stripe_purchase', $3, true, now() - interval '1 minute')`, [user, release, order]);
    }
    if (s.grant) {
      await q(`INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
        VALUES ($1, $2, 'support_grant', $3, true, now() - interval '1 minute')`, [user, release, `rehearsal-grant-${tag}`]);
    }
    await q("SELECT private.project_user_entitlement($1, $2)", [user, release]);
    if (s.dispute) {
      await q(`INSERT INTO private.payment_disputes(provider_dispute_id, order_id, payment_id, amount, currency, status, access_effect, response_deadline)
        VALUES ($1, $2, $3, 1500, 'usd', 'needs_response', 'held', date_trunc('second', now()) + interval '7 days')`,
        [`du_rehearsal_${tag}`, order, payment]);
    }
    out.push({ reference, scenario: s.what });
  }
  await client.query("COMMIT");
  await q("NOTIFY pgrst, 'reload schema'");
  console.log(`Owner set and support switched on in ${target.projectId}. Synthetic orders (test mode):`);
  for (const o of out) console.log(`  ${o.reference}  ${o.scenario}`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
