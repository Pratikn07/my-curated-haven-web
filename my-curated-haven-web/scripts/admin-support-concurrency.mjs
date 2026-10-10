#!/usr/bin/env node
// Support reconciliation races and failures against the owned loopback test stack only (Phase 3, Task 20).
//
//   node scripts/admin-support-concurrency.mjs --workdir .superpowers/sdd/2026-10-09-admin-support/local [--scenario <name> ...]
//     [--output <ignored-json>]
//
// Each scenario uses independent pg sessions released together from an advisory-lock barrier, or a test-only failpoint
// trigger that exists only for the run. Staff act through their signed-in database context (JWT claims), the verifier
// through this login. Synthetic rows are created per run and removed afterwards; nothing here can reach another stack.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import { loopbackTarget, SCENARIOS, selectScenarios } from "./admin-support-concurrency-plan.mjs";

function parseArgs(argv) {
  const args = { scenarios: [], workdir: null, output: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--workdir" && argv[i + 1]) args.workdir = argv[++i];
    else if (argv[i] === "--scenario" && argv[i + 1]) args.scenarios.push(argv[++i]);
    else if (argv[i] === "--output" && argv[i + 1]) args.output = argv[++i];
    else throw new Error(`Unknown or incomplete argument: ${argv[i]}`);
  }
  if (!args.workdir) throw new Error("--workdir is required");
  return args;
}

const args = parseArgs(process.argv.slice(2));
const target = loopbackTarget(readFileSync(resolve(process.cwd(), "..", args.workdir, "supabase/config.toml"), "utf8"),
  { ci: process.env.CI === "true" });
const RUN = randomUUID().slice(0, 8);
const POLICY_VERSION = `race-${RUN}`;
const made = { users: [], orders: [], ops: [], collection: null, releases: [], recipes: [], offer: null, ownerCreated: null,
  verifierAdded: false, previousSettings: null };
const clients = [];

async function connect() {
  const client = new pg.Client({ connectionString: target.url });
  await client.connect();
  await client.query("SET statement_timeout = '30s'; SET lock_timeout = '15s'");
  clients.push(client);
  return client;
}
const admin = await connect();
const q = (sql, params = []) => admin.query(sql, params).then((r) => r.rows);

// Run one statement as a signed-in staff member (aal2), optionally with a test failpoint armed, in its own transaction.
async function asUser(client, userId, sql, params = [], failpoint = null) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)",
      [JSON.stringify({ sub: userId, aal: "aal2", role: "authenticated" }), userId]);
    if (failpoint) await client.query("SELECT set_config('mch.failpoint', $1, true)", [failpoint]);
    await client.query("SET LOCAL ROLE authenticated");
    const { rows } = await client.query(sql, params);
    await client.query("COMMIT");
    return rows[0]?.r;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}
async function asVerifier(client, sql, params = [], failpoint = null) {
  await client.query("BEGIN");
  try {
    if (failpoint) await client.query("SELECT set_config('mch.failpoint', $1, true)", [failpoint]);
    const { rows } = await client.query(sql, params);
    await client.query("COMMIT");
    return rows[0]?.r;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}
const code = (error) => error?.message?.match(/ADM_[A-Z_]+|MCH_FAILPOINT/)?.[0] ?? error?.message ?? String(error);

// Release several sessions together: each waits on a shared advisory lock the coordinator holds, then all proceed.
async function race(work) {
  const key = Math.floor(Math.random() * 2 ** 31);
  await admin.query("SELECT pg_advisory_lock($1)", [key]);
  const sessions = await Promise.all(work.map(() => connect()));
  const runs = work.map(async (fn, i) => {
    await sessions[i].query("SELECT pg_advisory_lock_shared($1)", [key]);
    try {
      return { ok: true, value: await fn(sessions[i]) };
    } catch (error) {
      return { ok: false, code: code(error) };
    } finally {
      await sessions[i].query("SELECT pg_advisory_unlock_shared($1)", [key]).catch(() => {});
    }
  });
  await new Promise((r) => setTimeout(r, 250));
  await admin.query("SELECT pg_advisory_unlock($1)", [key]);
  return Promise.all(runs);
}

// ---- Synthetic world ---------------------------------------------------------------------------------------------
let OWNER;
async function setup() {
  made.previousSettings = (await q("SELECT stage, note_retention_days, observation_retention_days FROM private.support_workspace_settings WHERE singleton"))[0];
  await q("UPDATE private.support_workspace_settings SET stage = 'repair', note_retention_days = coalesce(note_retention_days, 90), observation_retention_days = coalesce(observation_retention_days, 90) WHERE singleton");
  const owner = (await q("SELECT user_id FROM private.admin_memberships WHERE role = 'owner' AND active LIMIT 1"))[0];
  if (owner) {
    OWNER = owner.user_id;
  } else {
    OWNER = randomUUID();
    await q("INSERT INTO auth.users(id, email, role, aud, email_confirmed_at) VALUES ($1, $2, 'authenticated', 'authenticated', now())",
      [OWNER, `race-owner-${RUN}@synthetic.test`]);
    await q("INSERT INTO private.admin_memberships(user_id, role, granted_by, reason) VALUES ($1, 'owner', $1, 'race harness')", [OWNER]);
    made.ownerCreated = OWNER;
  }
  if (!(await q("SELECT 1 FROM private.commerce_verifier_principals WHERE principal = current_user AND revoked_at IS NULL")).length) {
    await q("INSERT INTO private.commerce_verifier_principals(principal, label, registered_by) VALUES (current_user, 'race harness', $1) ON CONFLICT (principal) DO UPDATE SET revoked_at = NULL", [OWNER]);
    made.verifierAdded = true;
  }
  await q(`INSERT INTO private.commerce_access_policies(refund_policy_version, access_policy_version, policy, approved_by, evidence)
    VALUES ($1, $1, $2::jsonb, $3, 'race harness')`, [POLICY_VERSION, { id: POLICY_VERSION, approved: true, version: POLICY_VERSION,
    pendingRefund: "retain", partialRefund: "retain", fullRefund: "ineligible", inquiry: "retain", formalOpen: "hold",
    formalLost: "ineligible", duration: "indefinite", fixedSeconds: null }, OWNER]);
  made.collection = randomUUID();
  const release = randomUUID();
  made.releases.push(release);
  made.recipes = [randomUUID(), randomUUID()];
  for (const [i, id] of made.recipes.entries()) {
    await q(`INSERT INTO public.recipe_catalog(id, slug, title, public_summary, preview_image_path, total_minutes, publication_state)
      VALUES ($1, $2, $3, 'Synthetic', 'recipe-previews/race.webp', 10, 'published')`, [id, `race-${RUN}-${i}`, `Race ${RUN} ${i}`]);
    await q("INSERT INTO public.recipe_bodies(recipe_id, yield, allergen_review_state, allergens) VALUES ($1, '2 portions', 'reviewed_no_allergens', '{}')", [id]);
  }
  await q("INSERT INTO public.recipe_collections(id, slug, title, public_summary, listing_state) VALUES ($1, $2, $3, 'Synthetic', 'unlisted')",
    [made.collection, `race-${RUN}`, `Race ${RUN}`]);
  await q("INSERT INTO public.collection_releases(id, collection_id, version, state) VALUES ($1, $2, 1, 'published')", [release, made.collection]);
  await q("INSERT INTO public.collection_recipes(release_id, recipe_id, position) VALUES ($1, $2, 1)", [release, made.recipes[0]]);
  made.offer = randomUUID();
  await q(`INSERT INTO private.commercial_offers(id, release_id, provider_account_id, provider_mode, provider_product_id, provider_price_id,
    currency, base_minor_amount, sale_enabled, manifest_hash) VALUES ($1, $2, 'acct_race', 'test', $3, $4, 'usd', 1500, false, $5)`,
    [made.offer, release, `prod_race_${RUN}`, `price_race_${RUN}`, "b".repeat(64)]);
}

async function newCustomer(label) {
  const id = randomUUID();
  await q("INSERT INTO auth.users(id, email, role, aud, email_confirmed_at) VALUES ($1, $2, 'authenticated', 'authenticated', now())",
    [id, `race-${RUN}-${label}@synthetic.test`]);
  made.users.push(id);
  return id;
}

async function newOrder(user, { paid = true, source = false, state = "closed" } = {}) {
  const id = randomUUID();
  const n = made.orders.length + 1;
  const release = made.releases[0];
  const snapshot = { offer_id: made.offer, release_id: release, price_minor: 1500, currency: "usd", provider_account_id: "acct_race",
    provider_mode: "test", terms_version: "v1", collection_id: made.collection, refund_policy_version: POLICY_VERSION,
    access_policy_version: POLICY_VERSION, manifest_hash: "b".repeat(64) };
  await q(`INSERT INTO private.purchase_orders(id, support_reference, owner_principal, user_id, offer_id, release_id, snapshot, attempt_state,
    session_id, idempotency_key, version) VALUES ($1, $2, $3, $3, $4, $5, $6::jsonb, $7, $8, $9, 1)`,
  [id, `MCH-R${RUN.slice(0, 3).toUpperCase()}${n}`.slice(0, 10), user, made.offer, release, snapshot, state, `cs_test_race_${RUN}_${n}`, `race-${RUN}-${n}`]);
  made.orders.push(id);
  const order = { id, user, n, session: `cs_test_race_${RUN}_${n}`, pi: `pi_race_${RUN}_${n}`, ch: `ch_race_${RUN}_${n}` };
  if (paid) {
    await q(`INSERT INTO private.provider_payments(order_id, provider_account_id, provider_mode, payment_intent_id, charge_id, status,
      captured_amount, currency, paid_at) VALUES ($1, 'acct_race', 'test', $2, $3, 'succeeded', 1500, 'usd', '2026-10-01T10:00:00Z')`, [id, order.pi, order.ch]);
  }
  if (source) {
    await q(`INSERT INTO private.access_sources(user_id, release_id, source_kind, source_id, is_eligible, valid_from)
      VALUES ($1, $2, 'stripe_purchase', $3, true, now() - interval '1 minute')`, [user, release, id]);
    await q("SELECT private.project_user_entitlement($1, $2)", [user, release]);
  }
  return order;
}

function facts(order, { refunded = 0, refundStatus = "succeeded", state = "paid" } = {}) {
  return { accountId: "acct_race", mode: "test", sessionId: order.session, paymentIntentId: order.pi, chargeId: order.ch,
    capturedMinor: 1500, currency: "usd", paymentState: state, paidAt: state === "paid" ? "2026-10-01T10:00:00Z" : null,
    refunds: refunded ? [{ id: `re_race_${RUN}_${order.n}`, paymentIntentId: order.pi, chargeId: order.ch, amountMinor: refunded,
      currency: "usd", status: refundStatus, occurredAt: "2026-10-02T10:00:00Z" }] : [], disputes: [] };
}

async function record(client, job, f, failpoint = null) {
  const claim = await asVerifier(client, "SELECT private.commerce_verification_claim($1) AS r", [job]);
  const recorded = await asVerifier(client, "SELECT private.commerce_observation_record($1, $2, $3::jsonb, true, '[]', 'race') AS r",
    [job, claim.fence, JSON.stringify(f)], failpoint);
  return recorded.observationId;
}
async function webhook(client, order, f, failpoint = null) {
  const job = await asVerifier(client, "SELECT private.commerce_verification_request($1, 'webhook') AS r", [order.id]);
  const obs = await record(client, job, f);
  return asVerifier(client, "SELECT private.commerce_reconcile_system($1, $2, NULL) AS r", [obs, randomUUID()], failpoint);
}
async function resetBudget() {
  await q("DELETE FROM private.support_rate_buckets WHERE actor_id = $1", [OWNER]);
}
async function approvedRepair(order, kind = "reconcile_order") {
  await resetBudget();
  const diagnose = randomUUID();
  made.ops.push(diagnose);
  const job = (await asUser(admin, OWNER, "SELECT public.admin_support_diagnose_begin($1, $2) AS r", [order.id, diagnose])).jobId;
  const obs = await record(admin, job, facts(order));
  const prepareOp = randomUUID();
  made.ops.push(prepareOp);
  const proposal = await asUser(admin, OWNER, "SELECT public.admin_support_prepare($1, $2, $3, 'Race harness', $4) AS r",
    [order.id, obs, kind, prepareOp]);
  if (proposal.blockers.length) throw new Error(`proposal blocked: ${proposal.blockers.join(",")}`);
  const approveOp = randomUUID();
  made.ops.push(approveOp);
  await asUser(admin, OWNER, "SELECT public.admin_support_approve($1, $2, $3) AS r", [proposal.id, proposal.digest, approveOp]);
  return proposal;
}
function command(proposal, operationId = randomUUID()) {
  made.ops.push(operationId);
  return { operationId, proposalId: proposal.id, expectedDigest: proposal.digest, caseId: null };
}
const begin = (client, c) => asUser(client, OWNER, "SELECT public.admin_support_execute_begin($1::jsonb) AS r", [JSON.stringify(c)]);
const execute = (client, op, obs, failpoint = null) =>
  asUser(client, OWNER, "SELECT public.admin_support_execute($1, $2) AS r", [op, obs], failpoint);

// Invariant reads (the plan's harness methods).
const receiptCount = async (operationId) => Number((await q("SELECT count(*) n FROM private.commerce_reconcile_receipts WHERE operation_id = $1", [operationId]))[0].n)
  + Number((await q("SELECT count(*) n FROM private.support_operations WHERE operation_id = $1 AND state = 'committed' AND receipt->>'state' = 'already_satisfied'", [operationId]))[0].n);
const purchaseSourceEligible = async (order) => (await q("SELECT is_eligible FROM private.access_sources WHERE source_kind = 'stripe_purchase' AND source_id = $1", [order.id]))[0]?.is_eligible ?? null;
const collectionAccess = async (user) => (await q("SELECT private.collection_has_access($1, $2) AS a", [user, made.collection]))[0].a;
const transferredOrderCount = async (oldPrincipal, newUser) => Number((await q("SELECT count(*) n FROM private.purchase_orders WHERE owner_principal = $1 AND user_id = $2", [oldPrincipal, newUser]))[0].n);
const outboxCount = async (key) => Number((await q("SELECT count(*) n FROM private.commerce_outbox WHERE idempotency_key = $1", [key]))[0].n);

function check(results, name, condition, detail) {
  results.push({ check: name, passed: Boolean(condition), ...(condition ? {} : { detail }) });
}

// ---- Scenarios ---------------------------------------------------------------------------------------------------
const run = {
  async "repair-vs-refund"(checks) {
    const user = await newCustomer("rr");
    const order = await newOrder(user);
    const proposal = await approvedRepair(order);
    const c = command(proposal);
    const begun = await begin(admin, c);
    const obs = await record(admin, begun.jobId, facts(order));
    const [repair, refund] = await race([(s) => execute(s, c.operationId, obs), (s) => webhook(s, order, facts(order, { refunded: 1500 }))]);
    check(checks, "the refund always lands", refund.ok, refund.code);
    check(checks, "the repair either applied or stopped as stale", repair.ok || repair.code === "ADM_STALE", repair.code);
    check(checks, "the refunded purchase ends ineligible", (await purchaseSourceEligible(order)) === false);
    check(checks, "the customer ends without access", (await collectionAccess(user)) === false);
    check(checks, "at most one repair receipt", (await receiptCount(c.operationId)) <= 1);
    check(checks, "one refund confirmation", (await outboxCount(`refund-confirmed-re_race_${RUN}_${order.n}`)) === 1);
  },
  async "double-execution"(checks) {
    const order = await newOrder(await newCustomer("de"));
    const proposal = await approvedRepair(order);
    const [a, b] = [command(proposal), command(proposal)];
    const results = await race([(s) => begin(s, a), (s) => begin(s, b)]);
    const started = results.filter((r) => r.ok);
    check(checks, "exactly one operation starts", started.length === 1, results.map((r) => r.code ?? "ok"));
    check(checks, "the other is a conflict", results.some((r) => !r.ok && r.code === "ADM_CONFLICT"), results.map((r) => r.code ?? "ok"));
    check(checks, "one operation row for the proposal",
      Number((await q("SELECT count(*) n FROM private.support_operations WHERE proposal_id = $1", [proposal.id]))[0].n) === 1);
  },
  async "same-operation-retry"(checks) {
    const order = await newOrder(await newCustomer("so"));
    const proposal = await approvedRepair(order);
    const c = command(proposal);
    const begun = await begin(admin, c);
    const obs = await record(admin, begun.jobId, facts(order));
    const results = await race([(s) => execute(s, c.operationId, obs), (s) => execute(s, c.operationId, obs)]);
    check(checks, "both commits answer", results.every((r) => r.ok), results.map((r) => r.code ?? "ok"));
    check(checks, "with the same receipt", results.every((r) => r.ok) && JSON.stringify({ ...results[0].value, verification: null })
      === JSON.stringify({ ...results[1].value, verification: null }));
    check(checks, "one receipt", (await receiptCount(c.operationId)) === 1);
    check(checks, "the purchase is eligible", (await purchaseSourceEligible(order)) === true);
  },
  async "refund-a-vs-purchase-b"(checks) {
    const user = await newCustomer("ab");
    const a = await newOrder(user, { source: true });
    const b = await newOrder(user, { paid: false, state: "processing" });
    const [refund, purchase] = await race([(s) => webhook(s, a, facts(a, { refunded: 1500 })), (s) => webhook(s, b, facts(b))]);
    check(checks, "both settle", refund.ok && purchase.ok, [refund.code, purchase.code]);
    check(checks, "A is no longer eligible", (await purchaseSourceEligible(a)) === false);
    check(checks, "B is eligible", (await purchaseSourceEligible(b)) === true);
    check(checks, "the customer keeps the collection through B", (await collectionAccess(user)) === true);
    check(checks, "one refund confirmation and one purchase confirmation",
      (await outboxCount(`refund-confirmed-re_race_${RUN}_${a.n}`)) === 1 && (await outboxCount(`order-paid-${b.id}`)) === 1);
  },
  async "close-recreate-after-approval"(checks) {
    const user = await newCustomer("cr");
    const order = await newOrder(user);
    const proposal = await approvedRepair(order);
    const email = (await q("SELECT email FROM auth.users WHERE id = $1", [user]))[0].email;
    await q("DELETE FROM auth.users WHERE id = $1", [user]);
    const again = randomUUID();
    await q("INSERT INTO auth.users(id, email, role, aud, email_confirmed_at) VALUES ($1, $2, 'authenticated', 'authenticated', now())", [again, email]);
    made.users.push(again);
    let result;
    try {
      await begin(admin, command(proposal));
      result = "started";
    } catch (error) {
      result = code(error);
    }
    check(checks, "the approved repair cannot start", result === "ADM_STALE", result);
    check(checks, "no order moves to the new account", (await transferredOrderCount(user, again)) === 0);
    check(checks, "the new account has no access", (await collectionAccess(again)) === false);
  },
  async "publication-during-commit"(checks) {
    const user = await newCustomer("pc");
    const order = await newOrder(user);
    const proposal = await approvedRepair(order);
    const c = command(proposal);
    const begun = await begin(admin, c);
    const obs = await record(admin, begun.jobId, facts(order));
    const release2 = randomUUID();
    made.releases.push(release2);
    const publish = async (s) => {
      await s.query("BEGIN");
      try {
        await s.query("SELECT 1 FROM public.recipe_collections WHERE id = $1 FOR UPDATE", [made.collection]);
        await s.query("INSERT INTO public.collection_releases(id, collection_id, version, state) VALUES ($1, $2, 2, 'published')", [release2, made.collection]);
        await s.query("INSERT INTO public.collection_recipes(release_id, recipe_id, position) VALUES ($1, $2, 1), ($1, $3, 2)", [release2, ...made.recipes]);
        const publication = randomUUID();
        await s.query(`INSERT INTO private.collection_publications(id, collection_id, release_id, snapshot, digest, imported, operation_id, executor_id)
          VALUES ($1, $2, $3, '{}', $4, true, gen_random_uuid(), 'race harness')`, [publication, made.collection, release2, "d".repeat(64)]);
        await s.query(`INSERT INTO private.collection_active_publications(collection_id, publication_id) VALUES ($1, $2)
          ON CONFLICT (collection_id) DO UPDATE SET publication_id = EXCLUDED.publication_id`, [made.collection, publication]);
        await s.query("COMMIT");
      } catch (error) {
        await s.query("ROLLBACK");
        throw error;
      }
    };
    const [repair, published] = await race([(s) => execute(s, c.operationId, obs), publish]);
    check(checks, "the publication lands", published.ok, published.code);
    check(checks, "the repair either applied or stopped as stale", repair.ok || repair.code === "ADM_STALE", repair.code);
    if (repair.ok) {
      check(checks, "an applied repair did exactly what was approved", JSON.stringify(repair.value.effects) === JSON.stringify(proposal.effects));
      check(checks, "and the customer has access", (await collectionAccess(user)) === true);
    } else {
      check(checks, "a stopped repair changed nothing", (await purchaseSourceEligible(order)) === null && (await receiptCount(c.operationId)) === 0);
    }
  },
  async "audit-write-failure"(checks) {
    const order = await newOrder(await newCustomer("af"));
    const proposal = await approvedRepair(order);
    const c = command(proposal);
    const begun = await begin(admin, c);
    const obs = await record(admin, begun.jobId, facts(order));
    let failed;
    try {
      await execute(admin, c.operationId, obs, "audit_write");
      failed = "no failure";
    } catch (error) {
      failed = code(error);
    }
    check(checks, "the injected audit failure stops the commit", failed === "MCH_FAILPOINT", failed);
    check(checks, "nothing was committed", (await purchaseSourceEligible(order)) === null && (await receiptCount(c.operationId)) === 0);
    const retried = await execute(admin, c.operationId, obs);
    check(checks, "the retry applies once", retried.state === "applied" && (await receiptCount(c.operationId)) === 1);
  },
  async "projection-write-failure"(checks) {
    const order = await newOrder(await newCustomer("pf"));
    const proposal = await approvedRepair(order);
    const c = command(proposal);
    const begun = await begin(admin, c);
    const obs = await record(admin, begun.jobId, facts(order));
    let failed;
    try {
      await execute(admin, c.operationId, obs, "projection_write");
      failed = "no failure";
    } catch (error) {
      failed = code(error);
    }
    check(checks, "the injected projection failure stops the commit", failed === "MCH_FAILPOINT", failed);
    check(checks, "no source, receipt or access was left behind", (await purchaseSourceEligible(order)) === null
      && (await receiptCount(c.operationId)) === 0 && (await collectionAccess(order.user)) === false);
  },
  async "source-write-failure"(checks) {
    const order = await newOrder(await newCustomer("sf"), { source: true });
    let failed;
    try {
      await webhook(admin, order, facts(order, { refunded: 1500 }), "source_write");
      failed = "no failure";
    } catch (error) {
      failed = code(error);
    }
    check(checks, "the injected source failure stops the reconciliation", failed === "MCH_FAILPOINT", failed);
    check(checks, "no refund was recorded and the purchase is unchanged",
      Number((await q("SELECT count(*) n FROM private.payment_refunds WHERE order_id = $1", [order.id]))[0].n) === 0
      && (await purchaseSourceEligible(order)) === true);
    await webhook(admin, order, facts(order, { refunded: 1500 }));
    check(checks, "a later delivery applies it", (await purchaseSourceEligible(order)) === false);
  },
  async "postcheck-write-failure"(checks) {
    const order = await newOrder(await newCustomer("qf"));
    const proposal = await approvedRepair(order);
    const c = command(proposal);
    const begun = await begin(admin, c);
    const receipt = await execute(admin, c.operationId, await record(admin, begun.jobId, facts(order)));
    let failed;
    try {
      await asUser(admin, OWNER, "SELECT public.admin_support_postcheck($1) AS r", [c.operationId], "postcheck_write");
      failed = "no failure";
    } catch (error) {
      failed = code(error);
    }
    check(checks, "the injected post-check failure is reported", failed === "MCH_FAILPOINT", failed);
    const status = await asUser(admin, OWNER, "SELECT public.admin_support_operation($1) AS r", [c.operationId]);
    check(checks, "the committed receipt is intact and still pending verification",
      status.state === "applied" && status.verification === "pending" && status.auditId === receipt.auditId);
  },
  async "stale-fence"(checks) {
    const order = await newOrder(await newCustomer("sx"), { source: true });
    const job = await asVerifier(admin, "SELECT private.commerce_verification_request($1, 'webhook') AS r", [order.id]);
    const first = await asVerifier(admin, "SELECT private.commerce_verification_claim($1) AS r", [job]);
    await q("UPDATE private.commerce_verification_jobs SET lease_until = now() - interval '1 second' WHERE id = $1", [job]);
    const second = await asVerifier(admin, "SELECT private.commerce_verification_claim($1) AS r", [job]);
    const [old, current] = await race([
      (s) => asVerifier(s, "SELECT private.commerce_observation_record($1, $2, $3::jsonb, true, '[]', 'race') AS r",
        [job, first.fence, JSON.stringify(facts(order, { refunded: 1500 }))]),
      (s) => asVerifier(s, "SELECT private.commerce_observation_record($1, $2, $3::jsonb, true, '[]', 'race') AS r",
        [job, second.fence, JSON.stringify(facts(order))])]);
    check(checks, "the expired claim cannot record", !old.ok && old.code === "ADM_STALE", old.code ?? "recorded");
    check(checks, "the current claim records", current.ok, current.code);
    check(checks, "only the current claim's facts exist",
      Number((await q("SELECT count(*) n FROM private.commerce_provider_observations WHERE job_id = $1", [job]))[0].n) === 1);
  },
  async "old-success-after-refund"(checks) {
    const order = await newOrder(await newCustomer("os"), { source: true });
    const jobOld = await asVerifier(admin, "SELECT private.commerce_verification_request($1, 'webhook') AS r", [order.id]);
    const older = await record(admin, jobOld, facts(order));
    const jobNew = await asVerifier(admin, "SELECT private.commerce_verification_request($1, 'webhook') AS r", [order.id]);
    const newer = await record(admin, jobNew, facts(order, { refunded: 1500 }));
    const [applyNew, applyOld] = await race([
      (s) => asVerifier(s, "SELECT private.commerce_reconcile_system($1, $2, NULL) AS r", [newer, randomUUID()]),
      (s) => asVerifier(s, "SELECT private.commerce_reconcile_system($1, $2, NULL) AS r", [older, randomUUID()])]);
    check(checks, "the newer refund applies", applyNew.ok, applyNew.code);
    check(checks, "the older success is refused as stale", !applyOld.ok && applyOld.code === "ADM_STALE", applyOld.code ?? "applied");
    check(checks, "the purchase ends ineligible", (await purchaseSourceEligible(order)) === false);
  },
};

// ---- Failpoints and cleanup --------------------------------------------------------------------------------------
async function installFailpoints() {
  await q(`CREATE OR REPLACE FUNCTION private.mch_race_failpoint() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
    BEGIN
     IF current_setting('mch.failpoint', true) = TG_ARGV[0] THEN RAISE EXCEPTION 'MCH_FAILPOINT %', TG_ARGV[0]; END IF;
     RETURN coalesce(NEW, OLD);
    END $$`);
  for (const [table, name] of [["private.access_events", "audit_write"], ["public.access_entitlements", "projection_write"],
    ["private.access_sources", "source_write"], ["private.support_postchecks", "postcheck_write"]]) {
    await q(`CREATE TRIGGER mch_race_failpoint_${name} BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION private.mch_race_failpoint('${name}')`);
  }
}
async function removeFailpoints() {
  for (const [table, name] of [["private.access_events", "audit_write"], ["public.access_entitlements", "projection_write"],
    ["private.access_sources", "source_write"], ["private.support_postchecks", "postcheck_write"]]) {
    await q(`DROP TRIGGER IF EXISTS mch_race_failpoint_${name} ON ${table}`);
  }
  await q("DROP FUNCTION IF EXISTS private.mch_race_failpoint()");
}
async function cleanup() {
  const orders = made.orders;
  const users = made.users;
  await admin.query("BEGIN");
  try {
    // Owned test stack only: triggers (including immutability guards) are paused so synthetic history can be removed.
    await admin.query("SET LOCAL session_replication_role = replica");
    const del = (sql, params) => admin.query(sql, params);
    await del(`DELETE FROM private.support_postchecks WHERE operation_id IN (SELECT o.operation_id FROM private.support_operations o
      JOIN private.support_proposals p ON p.id = o.proposal_id WHERE p.order_id = ANY($1))`, [orders]);
    await del(`DELETE FROM private.support_cases WHERE order_id = ANY($1)`, [orders]);
    await del(`DELETE FROM private.support_operations WHERE proposal_id IN (SELECT id FROM private.support_proposals WHERE order_id = ANY($1))`, [orders]);
    await del(`DELETE FROM private.support_approvals WHERE proposal_id IN (SELECT id FROM private.support_proposals WHERE order_id = ANY($1))`, [orders]);
    await del("DELETE FROM private.support_proposals WHERE order_id = ANY($1)", [orders]);
    await del("DELETE FROM private.commerce_reconcile_receipts WHERE order_id = ANY($1)", [orders]);
    await del("DELETE FROM private.commerce_provider_observations WHERE order_id = ANY($1)", [orders]);
    await del("DELETE FROM private.commerce_verification_jobs WHERE order_id = ANY($1)", [orders]);
    await del("DELETE FROM private.commerce_adjustment_history WHERE order_id = ANY($1)", [orders]);
    await del("DELETE FROM private.commerce_outbox WHERE order_id = ANY($1)", [orders]);
    await del("DELETE FROM private.payment_events WHERE order_id = ANY($1)", [orders]);
    await del("DELETE FROM private.payment_refunds WHERE order_id = ANY($1)", [orders]);
    await del("DELETE FROM private.payment_disputes WHERE order_id = ANY($1)", [orders]);
    await del("DELETE FROM private.provider_payments WHERE order_id = ANY($1)", [orders]);
    await del("DELETE FROM private.access_events WHERE metadata->>'orderId' = ANY($1::text[]) OR actor_id = ANY($2)", [orders, users]);
    await del("DELETE FROM private.access_sources WHERE user_id = ANY($1) OR source_id = ANY($2::text[])", [users, orders]);
    await del("DELETE FROM public.access_entitlements WHERE user_id = ANY($1)", [users]);
    await del("DELETE FROM private.purchase_orders WHERE id = ANY($1)", [orders]);
    await del("DELETE FROM private.commercial_offers WHERE id = $1", [made.offer]);
    await del("DELETE FROM private.collection_active_publications WHERE collection_id = $1", [made.collection]);
    await del("DELETE FROM private.collection_publications WHERE collection_id = $1", [made.collection]);
    await del("DELETE FROM public.collection_recipes WHERE release_id = ANY($1)", [made.releases]);
    await del("DELETE FROM public.collection_releases WHERE id = ANY($1)", [made.releases]);
    await del("DELETE FROM public.recipe_collections WHERE id = $1", [made.collection]);
    await del("DELETE FROM public.recipe_bodies WHERE recipe_id = ANY($1)", [made.recipes]);
    await del("DELETE FROM public.recipe_catalog WHERE id = ANY($1)", [made.recipes]);
    await del("DELETE FROM private.commerce_access_policies WHERE refund_policy_version = $1", [POLICY_VERSION]);
    await del("DELETE FROM private.admin_operations WHERE operation_id = ANY($1)", [made.ops]);
    await del("DELETE FROM private.support_rate_buckets WHERE actor_id = $1", [OWNER]);
    if (made.verifierAdded) await del("DELETE FROM private.commerce_verifier_principals WHERE principal = current_user", []);
    if (made.ownerCreated) {
      await del("DELETE FROM private.admin_memberships WHERE user_id = $1", [made.ownerCreated]);
      users.push(made.ownerCreated);
    }
    await del("DELETE FROM auth.users WHERE id = ANY($1)", [users]);
    if (made.previousSettings) {
      await del("UPDATE private.support_workspace_settings SET stage = $1, note_retention_days = $2, observation_retention_days = $3 WHERE singleton",
        [made.previousSettings.stage, made.previousSettings.note_retention_days, made.previousSettings.observation_retention_days]);
    }
    await admin.query("COMMIT");
  } catch (error) {
    await admin.query("ROLLBACK");
    throw error;
  }
}

const report = { target: target.projectId, run: RUN, sha: execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(), scenarios: [] };
let exitCode = 0;
try {
  await setup();
  await installFailpoints();
  for (const name of selectScenarios(args.scenarios)) {
    const checks = [];
    try {
      await run[name](checks);
    } catch (error) {
      checks.push({ check: "scenario ran", passed: false, detail: code(error) });
    }
    const passed = checks.length > 0 && checks.every((c) => c.passed);
    if (!passed) exitCode = 1;
    report.scenarios.push({ name, description: SCENARIOS[name], passed, checks });
    console.log(`${passed ? "PASS" : "FAIL"} ${name}${passed ? "" : `: ${JSON.stringify(checks.filter((c) => !c.passed))}`}`);
  }
} finally {
  await removeFailpoints().catch((error) => console.error(`failpoint removal: ${error.message}`));
  await cleanup().catch((error) => { console.error(`cleanup: ${error.message}`); exitCode = 1; });
  await Promise.all(clients.map((c) => c.end().catch(() => {})));
}
const passedCount = report.scenarios.filter((s) => s.passed).length;
console.log(`${passedCount}/${report.scenarios.length} scenarios passed (run ${RUN}, ${report.sha})`);
if (args.output) writeFileSync(args.output, JSON.stringify(report, null, 2));
process.exitCode = exitCode;
