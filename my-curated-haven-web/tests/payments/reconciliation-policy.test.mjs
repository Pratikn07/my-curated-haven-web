import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluatePurchase, validateBinding } from "../../src/lib/payments/reconciliation/policy.ts";
import { ELIGIBILITY_CASES, matrixBinding } from "../fixtures/eligibility-matrix.mjs";
import { approvedPolicy, paidFacts } from "../fixtures/support.mjs";
import { renderMatrix } from "../../scripts/support-eligibility-matrix.mjs";

for (const item of ELIGIBILITY_CASES) {
  test(`eligibility: ${item.name}`, () => {
    const { now, ...input } = item.input;
    assert.deepEqual(evaluatePurchase({ ...input, nowMs: Date.parse(now) }), item.expected);
  });
}

test("a failed former full refund cannot clear an independent hold", () => {
  const facts = paidFacts();
  facts.refunds = [{ id: "re_full", paymentIntentId: "pi_support", chargeId: "ch_support", amountMinor: 1500,
    currency: "usd", status: "failed", occurredAt: "2026-10-02T10:00:00Z" }];
  const result = evaluatePurchase({ facts, binding: matrixBinding(), policy: approvedPolicy(),
    accountActive: true, manualHold: true, nowMs: Date.parse("2026-10-07T10:00:00Z") });
  assert.equal(result.state, "ineligible");
  assert.ok(result.reasons.includes("manual_hold"));
});

test("binding problems are listed together and stable in order", () => {
  assert.deepEqual(validateBinding({ ...matrixBinding(), accountId: "acct_x", mode: "live", refundPolicyVersion: null },
    { ...paidFacts(), capturedMinor: 1600, currency: "eur" }),
    ["account_mismatch", "amount_mismatch", "currency_mismatch", "mode_mismatch", "policy_version_unknown"]);
  assert.deepEqual(validateBinding(matrixBinding(), paidFacts()), []);
});

test("the SQL fixture is generated from these same cases", () => {
  assert.equal(readFileSync(new URL("../../../supabase/test-fixtures/support-eligibility-matrix.sql", import.meta.url), "utf8"),
    renderMatrix());
});
