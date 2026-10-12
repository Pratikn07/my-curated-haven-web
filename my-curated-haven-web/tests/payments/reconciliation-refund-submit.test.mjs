import test from "node:test";
import assert from "node:assert/strict";
import { boundRefundFact, recoveredRefund, refundErrorResult } from "../../src/lib/payments/refund-outcomes.ts";

const OP = "f3000000-0000-4000-8000-000000000060";
const intent = { chargeId: "ch_support", paymentIntentId: "pi_support", amountMinor: 400, currency: "usd", command: { operationId: OP } };
const refund = (over = {}) => ({ id: "re_x", amount: 400, currency: "usd", status: "succeeded", created: 1_790_000_000, charge: "ch_support",
  payment_intent: "pi_support", metadata: { support_refund_operation: OP }, ...over });

test("only a documented validation rejection proves no refund was made", () => {
  assert.deepEqual(refundErrorResult({ type: "StripeInvalidRequestError", code: "charge_already_refunded", statusCode: 400 }),
    { kind: "not_executed", code: "CHARGE_ALREADY_REFUNDED" });
  for (const error of [new Error("ETIMEDOUT"), { type: "StripeConnectionError" }, { type: "StripeAPIError", statusCode: 500 },
    { type: "StripeIdempotencyError", statusCode: 400, code: "idempotency_key_in_use" },
    { type: "StripeInvalidRequestError", code: "charge_already_refunded", statusCode: 409 },
    { type: "StripeInvalidRequestError", code: "something_new", statusCode: 400 }, null]) {
    assert.deepEqual(refundErrorResult(error), { kind: "unknown", code: "PROVIDER_OUTCOME_UNKNOWN" }, JSON.stringify(error));
  }
});

test("a returned refund counts only when it is exactly this operation's refund", () => {
  assert.equal(boundRefundFact(intent, refund())?.id, "re_x");
  assert.equal(boundRefundFact(intent, refund({ charge: { id: "ch_support" }, payment_intent: { id: "pi_support" } }))?.id, "re_x");
  for (const over of [{ amount: 401 }, { currency: "eur" }, { charge: "ch_other" }, { payment_intent: "pi_other" },
    { metadata: { support_refund_operation: "other" } }, { metadata: null }, { status: "unknown_status" }]) {
    assert.equal(boundRefundFact(intent, refund(over)), null, JSON.stringify(over));
  }
});

test("recovery finds this operation's refund among the charge's refunds, or nothing", () => {
  assert.equal(recoveredRefund(intent, [refund({ id: "re_other", metadata: {} }), refund()])?.id, "re_x");
  assert.equal(recoveredRefund(intent, [refund({ id: "re_other", metadata: {} })]), null);
  assert.equal(recoveredRefund(intent, [refund(), refund({ id: "re_twin" })]), null, "two matches are ambiguous, not proof");
});
