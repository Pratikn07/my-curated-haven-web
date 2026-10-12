import test from "node:test";
import assert from "node:assert/strict";
import { classifyDispute, readProviderFacts, unknownFinancialFacts } from "../../src/lib/payments/reconciliation/provider-read.ts";
import { matrixBinding as fixtureBinding } from "../fixtures/eligibility-matrix.mjs";
import { paidFacts } from "../fixtures/support.mjs";

const fast = { maxPages: 20, budgetMs: 20_000, retries: 2, now: () => Date.now() };
const checkout = () => { const { refunds, disputes, ...base } = paidFacts(); void refunds; void disputes; return base; };
const refund = (id, amountMinor = 10, over = {}) => ({ id, paymentIntentId: "pi_support", chargeId: "ch_support", amountMinor,
  currency: "usd", status: "succeeded", occurredAt: "2026-10-02T10:00:00Z", ...over });
const reader = (over = {}) => ({ readCheckout: async () => checkout(), readRefundPage: async () => ({ items: [], next: null }),
  readDisputePage: async () => ({ items: [], next: null }), ...over });

test("a failed second refund page cannot count as complete", async () => {
  let pages = 0;
  const result = await readProviderFacts(fixtureBinding(), reader({
    readRefundPage: async () => { if (++pages === 2) throw new Error("provider unavailable"); return { items: [], next: "re_cursor" }; },
  }), fast);
  assert.equal(result.complete, false);
  assert.ok(result.blockers.includes("refunds_incomplete"));
});

test("a complete read returns the bound facts", async () => {
  const result = await readProviderFacts(fixtureBinding(), reader(), fast);
  assert.equal(result.complete, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.facts.capturedMinor, 1500);
});

test("101 refunds over two pages are read in full and in identity order", async () => {
  const all = Array.from({ length: 101 }, (_, i) => refund(`re_${String(i).padStart(3, "0")}`));
  const result = await readProviderFacts(fixtureBinding(), reader({
    readRefundPage: async (_b, cursor) => cursor === null ? { items: all.slice(0, 100).reverse(), next: "re_099" } : { items: all.slice(100), next: null },
  }), fast);
  assert.equal(result.complete, true);
  assert.equal(result.facts.refunds.length, 101);
  assert.equal(result.facts.refunds[0].id, "re_000");
});

test("a page cap, a repeated cursor, conflicting ids and foreign items are all incomplete or blocked", async () => {
  const capped = await readProviderFacts(fixtureBinding(), reader({ readRefundPage: async (_b, c) => ({ items: [], next: `${c ?? ""}x` }) }),
    { ...fast, maxPages: 3 });
  assert.ok(capped.blockers.includes("refunds_incomplete"));
  const loop = await readProviderFacts(fixtureBinding(), reader({ readRefundPage: async () => ({ items: [], next: "re_same" }) }), fast);
  assert.ok(loop.blockers.includes("refunds_incomplete"));
  const conflict = await readProviderFacts(fixtureBinding(), reader({
    readRefundPage: async () => ({ items: [refund("re_a", 10), refund("re_a", 20)], next: null }) }), fast);
  assert.ok(conflict.blockers.includes("refund_conflict"));
  const foreign = await readProviderFacts(fixtureBinding(), reader({
    readRefundPage: async () => ({ items: [refund("re_x", 10, { chargeId: "ch_other" })], next: null }) }), fast);
  assert.ok(foreign.blockers.includes("adjustment_binding_mismatch"));
  const unknownStatus = await readProviderFacts(fixtureBinding(), reader({
    readRefundPage: async () => ({ items: [refund("re_u", 10, { status: "reversed" })], next: null }) }), fast);
  assert.ok(unknownStatus.blockers.includes("refund_status_unknown"));
});

test("wrong account or mode, and inaccessible disputes, are never complete", async () => {
  const wrongAccount = await readProviderFacts(fixtureBinding(), reader({ readCheckout: async () => ({ ...checkout(), accountId: "acct_other" }) }), fast);
  assert.ok(wrongAccount.blockers.includes("account_mismatch"));
  const wrongMode = await readProviderFacts(fixtureBinding(), reader({ readCheckout: async () => ({ ...checkout(), mode: "live" }) }), fast);
  assert.ok(wrongMode.blockers.includes("mode_mismatch"));
  const noDisputes = await readProviderFacts(fixtureBinding(), reader({
    readDisputePage: async () => { throw Object.assign(new Error("forbidden"), { statusCode: 403 }); } }), fast);
  assert.ok(noDisputes.blockers.includes("disputes_incomplete"));
});

test("a failed checkout read is unknown, never captured zero or an empty verified list", async () => {
  const result = await readProviderFacts(fixtureBinding(), reader({ readCheckout: async () => { throw new Error("down"); } }), fast);
  assert.equal(result.complete, false);
  assert.deepEqual(result.blockers, ["checkout_unavailable"]);
  assert.deepEqual(result.facts, unknownFinancialFacts(fixtureBinding()));
  assert.equal(result.facts.capturedMinor, null);
  assert.equal(result.facts.paymentState, "unknown");
});

test("rate limits are retried a bounded number of times, then reported incomplete", async () => {
  let calls = 0;
  const limited = await readProviderFacts(fixtureBinding(), reader({
    readRefundPage: async () => { calls += 1; throw Object.assign(new Error("rate"), { statusCode: 429 }); } }), fast);
  assert.equal(calls, 3);
  assert.ok(limited.blockers.includes("refunds_incomplete"));
  let once = 0;
  const recovered = await readProviderFacts(fixtureBinding(), reader({
    readRefundPage: async () => { once += 1; if (once === 1) throw Object.assign(new Error("rate"), { statusCode: 429 }); return { items: [], next: null }; } }), fast);
  assert.equal(recovered.complete, true);
});

test("a call that outlives the time budget times out", async () => {
  const result = await readProviderFacts(fixtureBinding(), reader({
    readCheckout: () => new Promise(() => {}) }), { ...fast, budgetMs: 50 });
  assert.deepEqual(result.blockers, ["checkout_unavailable"]);
});

test("dispute statuses classify inquiries, formal disputes and unknowns", () => {
  assert.equal(classifyDispute("warning_needs_response"), "inquiry");
  assert.equal(classifyDispute("needs_response"), "formal");
  assert.equal(classifyDispute("lost"), "formal");
  assert.equal(classifyDispute("something_new"), "unknown");
});

test("a session that names another order is a binding blocker, not a missing payment", async () => {
  const { ProviderBindingError } = await import("../../src/lib/payments/reconciliation/provider-read.ts");
  const result = await readProviderFacts(fixtureBinding(), reader({
    readCheckout: async () => { throw new ProviderBindingError("session_order_mismatch"); } }), fast);
  assert.deepEqual(result.blockers, ["session_order_mismatch"]);
  assert.equal(result.facts.paymentState, "unknown");
});
