import test from "node:test";
import assert from "node:assert/strict";
import { applyObservation, decodeReconciliation, verifyAndReconcile } from "../../src/lib/payments/reconciliation/ledger.ts";

const OP = "00000000-0000-4000-8000-0000000000c1";
const ORDER = "00000000-0000-4000-8000-0000000000c2";
const AUDIT = "00000000-0000-4000-8000-0000000000c3";
const OBS = "00000000-0000-4000-8000-0000000000c4";
const JOB = "00000000-0000-4000-8000-0000000000c5";
const RECIPE = "00000000-0000-4000-8000-0000000000c6";
const effect = (over = {}) => ({ sourceId: ORDER, beforeEligible: true, afterEligible: false, beforeEffective: "active",
  afterEffective: "denied", recipeIds: [RECIPE], notification: "none", ...over });
const receipt = (over = {}) => ({ operationId: OP, orderId: ORDER, state: "applied", effects: [effect()], auditId: AUDIT,
  committedAt: "2026-10-09T12:00:00.000Z", ...over });

test("an applied receipt decodes exactly", () => {
  assert.deepEqual(decodeReconciliation(receipt()), { ok: true, receipt: receipt() });
  assert.deepEqual(decodeReconciliation(receipt({ state: "already_satisfied", effects: [] })).receipt.effects, []);
  assert.equal(decodeReconciliation(receipt({ effects: [effect({ beforeEligible: null, notification: "purchase_confirmation" })] }))
    .receipt.effects[0].beforeEligible, null);
});

test("a blocked outcome carries its reasons and is never a receipt", () => {
  assert.deepEqual(decodeReconciliation(receipt({ state: "blocked", effects: [], reasons: ["policy_missing"] })),
    { ok: false, code: "BLOCKED", reasons: ["policy_missing"] });
  assert.throws(() => decodeReconciliation(receipt({ state: "blocked", effects: [], reasons: [] })));
  assert.throws(() => decodeReconciliation(receipt({ state: "blocked", effects: [] })));
});

test("a malformed receipt is refused", () => {
  assert.throws(() => decodeReconciliation(null));
  assert.throws(() => decodeReconciliation(receipt({ state: "granted" })));
  assert.throws(() => decodeReconciliation(receipt({ humanApproval: "x" })));
  assert.throws(() => decodeReconciliation(receipt({ reasons: ["policy_missing"] })));
  assert.throws(() => decodeReconciliation(receipt({ effects: [effect({ afterEffective: "partial" })] })));
  assert.throws(() => decodeReconciliation(receipt({ effects: [effect({ recipeIds: ["not-a-uuid"] })] })));
  assert.throws(() => decodeReconciliation(receipt({ auditId: undefined })));
});

test("applying reports database refusals by code and never invents a receipt", async () => {
  const stale = await applyObservation(OBS, OP, null, { apply: async () => { throw new Error("ADM_STALE"); } });
  assert.deepEqual(stale, { ok: false, code: "ADM_STALE", reasons: [] });
  const odd = await applyObservation(OBS, OP, null, { apply: async () => ({ state: "applied" }) });
  assert.deepEqual(odd, { ok: false, code: "RECEIPT_INVALID", reasons: [] });
  const lost = await applyObservation(OBS, OP, null, { apply: async () => { throw new Error("connection reset"); } });
  assert.deepEqual(lost, { ok: false, code: "APPLY_FAILED", reasons: [] });
});

test("verify-and-reconcile requests, verifies, then applies the recorded observation with the event id", async () => {
  const calls = [];
  const outcome = await verifyAndReconcile({ orderId: ORDER, purpose: "webhook", operationId: OP, eventId: "evt_1" }, {
    request: async (order, purpose) => { calls.push(["request", order, purpose]); return JOB; },
    verify: async (job) => { calls.push(["verify", job]); return { ok: true, observationId: OBS }; },
    apply: async (obs, op, event) => { calls.push(["apply", obs, op, event]); return receipt(); },
  });
  assert.deepEqual(outcome, { ok: true, receipt: receipt() });
  assert.deepEqual(calls, [["request", ORDER, "webhook"], ["verify", JOB], ["apply", OBS, OP, "evt_1"]]);
});

test("a check that cannot run or verify applies nothing", async () => {
  let applied = false;
  const apply = async () => { applied = true; return receipt(); };
  const busy = await verifyAndReconcile({ orderId: ORDER, purpose: "recovery", operationId: OP, eventId: null }, {
    request: async () => { throw new Error("ADM_CONFLICT"); }, verify: async () => ({ ok: true, observationId: OBS }), apply });
  assert.deepEqual(busy, { ok: false, code: "ADM_CONFLICT", reasons: [] });
  const changed = await verifyAndReconcile({ orderId: ORDER, purpose: "recovery", operationId: OP, eventId: null }, {
    request: async () => JOB, verify: async () => ({ ok: false, code: "ORDER_CHANGED" }), apply });
  assert.deepEqual(changed, { ok: false, code: "ORDER_CHANGED", reasons: [] });
  assert.equal(applied, false);
});
