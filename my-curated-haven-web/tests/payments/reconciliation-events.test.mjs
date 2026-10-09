import test from "node:test";
import assert from "node:assert/strict";
import { eventKey, processVerifiedCommerceEvent, routingHints, VERIFIED_EVENT_TYPES } from "../../src/lib/payments/reconciliation/events.ts";

const INBOX = "00000000-0000-4000-8000-0000000000d1";
const ORDER = "00000000-0000-4000-8000-0000000000d2";
const claimed = (over = {}) => ({ state: "claimed", fence: 9, eventId: "evt_support", type: "refund.updated", mode: "test",
  orderId: ORDER, ...over });
const receipt = { operationId: INBOX, orderId: ORDER, state: "applied", effects: [], auditId: INBOX, committedAt: "2026-10-09T12:00:00.000Z" };

function deps(over = {}) {
  const finished = [];
  const calls = [];
  return {
    finished, calls,
    deps: {
      claim: async () => claimed(),
      finish: async (id, fence, outcome) => { finished.push({ id, fence, outcome }); },
      policyReady: async () => true,
      reconcile: async (orderId, eventId) => { calls.push(["reconcile", orderId, eventId]); return { ok: true, receipt }; },
      legacy: async () => { calls.push(["legacy"]); },
      ...over,
    },
  };
}

test("duplicate deliveries select the same inbox identity",()=>{
  const event={id:"evt_support",accountId:"acct_support_test",mode:"test",type:"refund.updated"};
  assert.equal(eventKey(event),eventKey({...event}));
  assert.notEqual(eventKey(event),eventKey({...event,mode:"live"}));
});

test("the supported events are exactly the payment, refund and dispute lifecycle", () => {
  assert.equal(VERIFIED_EVENT_TYPES.size, 12);
  for (const type of ["checkout.session.completed", "checkout.session.async_payment_failed", "refund.failed", "charge.refunded",
    "charge.dispute.funds_reinstated"]) assert.ok(VERIFIED_EVENT_TYPES.has(type), type);
  assert.equal(VERIFIED_EVENT_TYPES.has("customer.created"), false);
});

test("routing reads only identities from the event object", () => {
  assert.deepEqual(routingHints("checkout.session.completed", { id: "cs_test_1", client_reference_id: ORDER,
    payment_intent: { id: "pi_1", amount_received: 1 }, amount_total: 99 }),
  { sessionId: "cs_test_1", clientReferenceId: ORDER, paymentIntentId: "pi_1", chargeId: null });
  assert.deepEqual(routingHints("refund.updated", { id: "re_1", payment_intent: "pi_1", charge: "ch_1", amount: 1500 }),
    { sessionId: null, clientReferenceId: null, paymentIntentId: "pi_1", chargeId: "ch_1" });
  assert.deepEqual(routingHints("charge.refunded", { id: "ch_1", payment_intent: "pi_1" }),
    { sessionId: null, clientReferenceId: null, paymentIntentId: "pi_1", chargeId: "ch_1" });
  assert.deepEqual(routingHints("charge.dispute.created", { id: "du_1", charge: { id: "ch_1" }, payment_intent: null }),
    { sessionId: null, clientReferenceId: null, paymentIntentId: null, chargeId: "ch_1" });
  assert.deepEqual(routingHints("customer.created", { id: "cus_1" }),
    { sessionId: null, clientReferenceId: null, paymentIntentId: null, chargeId: null });
});

test("an old success after a refund is judged from a fresh check, never from the event body", async () => {
  const { deps: d, calls, finished } = deps({ claim: async () => claimed({ type: "checkout.session.completed" }),
    reconcile: async (orderId, eventId) => { calls.push(["reconcile", orderId, eventId]);
      return { ok: true, receipt: { ...receipt, effects: [{ sourceId: ORDER, beforeEligible: false, afterEligible: false,
        beforeEffective: "denied", afterEffective: "denied", recipeIds: [], notification: "none" }] } }; } });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, d), { state: "completed" });
  assert.deepEqual(calls, [["reconcile", ORDER, "evt_support"]]);
  assert.equal(finished[0].outcome.reconciliation.effects[0].afterEligible, false);
  assert.deepEqual([finished[0].id, finished[0].fence, finished[0].outcome.outcome], [INBOX, 9, "completed"]);
});

test("a completed event is not processed again", async () => {
  const { deps: d, calls, finished } = deps({ claim: async () => ({ state: "done", processingState: "completed" }) });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, d), { state: "completed" });
  assert.deepEqual([calls, finished], [[], []]);
});

test("unsupported events are ignored and an unknown order is retried", async () => {
  const unsupported = deps({ claim: async () => claimed({ type: "customer.created" }) });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, unsupported.deps), { state: "ignored" });
  assert.equal(unsupported.finished[0].outcome.code, "UNSUPPORTED_EVENT");
  const unknown = deps({ claim: async () => claimed({ orderId: null }) });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, unknown.deps), { state: "retry" });
  assert.deepEqual([unknown.finished[0].outcome.outcome, unknown.finished[0].outcome.code], ["retry", "ORDER_UNKNOWN"]);
});

test("without an approved policy the delivery uses the guarded older path; recovery sets it aside", async () => {
  const live = deps({ policyReady: async () => false });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, live.deps), { state: "completed" });
  assert.deepEqual(live.calls, [["legacy"]]);
  assert.equal(live.finished[0].outcome.code, "LEGACY");
  const recovery = deps({ policyReady: async () => false, legacy: null });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, recovery.deps), { state: "ignored" });
  assert.deepEqual([recovery.finished[0].outcome.outcome, recovery.finished[0].outcome.code], ["blocked", "POLICY_MISSING"]);
  const failing = deps({ policyReady: async () => false, legacy: async () => { throw new Error("db down"); } });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, failing.deps), { state: "retry" });
});

test("timeouts and races retry; evidence that needs a person is set aside", async () => {
  const timeout = deps({ reconcile: async () => ({ ok: false, code: "READ_FAILED", reasons: [] }) });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, timeout.deps), { state: "retry" });
  const blocked = deps({ reconcile: async () => ({ ok: false, code: "BLOCKED", reasons: ["refund_conflict"] }) });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, blocked.deps), { state: "ignored" });
  assert.deepEqual(blocked.finished[0].outcome, { outcome: "blocked", code: "RECONCILE_BLOCKED", orderId: ORDER,
    reconciliation: { reasons: ["refund_conflict"] } });
});

test("a claim held elsewhere retries; no registered verifier falls back; a lost claim records nothing", async () => {
  const busy = deps({ claim: async () => { throw new Error("ADM_CONFLICT"); } });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, busy.deps), { state: "retry" });
  const unregistered = deps({ claim: async () => { throw new Error("permission denied: ADM_DENIED"); } });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, unregistered.deps), { state: "unavailable" });
  assert.deepEqual(unregistered.calls, []);
  const lost = deps({ finish: async () => { throw new Error("ADM_STALE"); } });
  assert.deepEqual(await processVerifiedCommerceEvent(INBOX, lost.deps), { state: "retry" });
});
