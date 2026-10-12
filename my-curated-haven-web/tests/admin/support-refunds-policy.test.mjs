import test from "node:test";
import assert from "node:assert/strict";
import { decideRefundAmount, refundCapacity, refundRetryAllowed } from "../../src/lib/admin/support/refunds/policy.ts";
import { paidFacts } from "../fixtures/support.mjs";

test("known provider refunds and local reservations are not counted twice",()=>{
  const facts=paidFacts();
  const base={paymentIntentId:"pi_support",chargeId:"ch_support",currency:"usd",
    occurredAt:"2026-10-07T10:00:00Z"};
  facts.refunds=[{...base,id:"re_done",amountMinor:300,status:"succeeded"},
    {...base,id:"re_pending",amountMinor:100,status:"pending"}];
  const capacity=refundCapacity(facts,[
    {operationId:"unknown",providerRefundId:null,amountMinor:200,reserved:true},
    {operationId:"known",providerRefundId:"re_pending",amountMinor:100,reserved:true}]);
  assert.equal(capacity.availableMinor,900);
  assert.equal(capacity.reservedMinor,200);
  assert.ok(capacity.blockers.includes("refund_in_flight"));
});

test("full remaining is fixed and unsafe amounts are rejected",()=>{
  const capacity=refundCapacity(paidFacts(),[]);
  assert.equal(decideRefundAmount(capacity,{kind:"full_remaining"}),1500);
  for(const amountMinor of [0,-1,0.5,1501,Number.MAX_SAFE_INTEGER+1]){
    assert.throws(()=>decideRefundAmount(capacity,{kind:"partial",amountMinor}));
  }
});

test("failed and canceled refunds release capacity; a released reservation counts nothing", () => {
  const facts = paidFacts();
  const base = { paymentIntentId: "pi_support", chargeId: "ch_support", currency: "usd", occurredAt: "2026-10-07T10:00:00Z" };
  facts.refunds = [{ ...base, id: "re_failed", amountMinor: 500, status: "failed" }, { ...base, id: "re_canceled", amountMinor: 200, status: "canceled" }];
  const capacity = refundCapacity(facts, [{ operationId: "x", providerRefundId: "re_failed", amountMinor: 500, reserved: true },
    { operationId: "y", providerRefundId: null, amountMinor: 300, reserved: false }]);
  assert.deepEqual([capacity.availableMinor, capacity.reservedMinor, capacity.blockers], [1500, 0, []]);
});

test("incomplete or unpaid facts never look like a known balance", () => {
  assert.deepEqual(refundCapacity({ ...paidFacts(), paymentState: "unknown" }, []).blockers, ["payment_not_refundable"]);
  assert.equal(refundCapacity({ ...paidFacts(), chargeId: null }, []).availableMinor, 0);
  const disputed = { ...paidFacts(), disputes: [{ id: "du", paymentIntentId: "pi_support", chargeId: "ch_support", amountMinor: 1500,
    currency: "usd", status: "needs_response", classification: "formal", deadline: null }] };
  assert.ok(refundCapacity(disputed, []).blockers.includes("dispute_open"));
  const refunded = { ...paidFacts(), refunds: [{ id: "re_all", paymentIntentId: "pi_support", chargeId: "ch_support", amountMinor: 1500,
    currency: "usd", status: "succeeded", occurredAt: "2026-10-07T10:00:00Z" }] };
  assert.deepEqual(refundCapacity(refunded, []).blockers, ["nothing_to_refund"]);
  assert.throws(() => decideRefundAmount(refundCapacity(refunded, []), { kind: "full_remaining" }));
});

test("a resend is allowed only for the same authorised request within 23 hours and before approval expiry", () => {
  const ok = { nowMs: 1_000_000, firstDispatchMs: 900_000, approvalExpiresMs: 1_200_000, authorised: true, gateEnabled: true, sameRequest: true };
  assert.equal(refundRetryAllowed(ok), true);
  for (const change of [{ authorised: false }, { gateEnabled: false }, { sameRequest: false }, { nowMs: 1_300_000 },
    { firstDispatchMs: 1_100_000 }, { nowMs: 900_000 + 23 * 3600_000, approvalExpiresMs: Number.MAX_SAFE_INTEGER }]) {
    assert.equal(refundRetryAllowed({ ...ok, ...change }), false, JSON.stringify(change));
  }
});
