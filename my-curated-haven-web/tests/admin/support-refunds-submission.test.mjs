import test from "node:test";
import assert from "node:assert/strict";
import { coordinateRefund } from "../../src/lib/admin/support/refunds/coordinator.ts";
import { ORDER, refundCommand, refundReceipt } from "../fixtures/support.mjs";

test("lost provider response remains unknown and an ordinary retry only recovers status",async()=>{
  let stored=refundReceipt(),calls=0;
  const ports={reserve:async()=>stored,
    verify:async()=>({observationId:ORDER}),
    claim:async()=>({operationId:stored.operationId,fence:1,expiresAt:"2026-10-07T10:00:10Z"}),
    payload:async()=>({command:refundCommand()}),
    submit:async()=>{calls++;throw new Error("timeout after acceptance");},
    record:async(_claim,result)=>{assert.equal(result.kind,"unknown");
      stored=refundReceipt({state:"outcome_unknown",reasonCode:"PROVIDER_OUTCOME_UNKNOWN",
        firstDispatchedAt:"2026-10-07T10:00:00Z"});return stored;},
    read:async()=>stored};
  assert.equal((await coordinateRefund(refundCommand(),ports)).state,"outcome_unknown");
  assert.equal((await coordinateRefund(refundCommand(),ports)).state,"outcome_unknown");
  assert.equal(calls,1);
});

test("a known provider refund is recorded once; a repeat returns the stored receipt", async () => {
  let stored = refundReceipt();
  const steps = [];
  const fact = { id: "re_x", paymentIntentId: "pi_support", chargeId: "ch_support", amountMinor: 400, currency: "usd", status: "succeeded",
    occurredAt: "2026-10-07T10:00:01Z" };
  const ports = {
    reserve: async () => { steps.push("reserve"); return stored; },
    verify: async () => { steps.push("verify"); return { observationId: ORDER }; },
    claim: async () => { steps.push("claim"); return { operationId: stored.operationId, fence: 2, expiresAt: "2026-10-07T10:00:10Z" }; },
    payload: async () => { steps.push("payload"); return { command: refundCommand() }; },
    submit: async () => { steps.push("submit"); return { kind: "known", fact }; },
    record: async (_claim, result) => { steps.push(`record:${result.kind}`); stored = refundReceipt({ state: "submitted", providerRefundId: "re_x",
      providerStatus: "succeeded", reconciliation: "applied" }); return stored; },
    read: async () => { steps.push("read"); return stored; },
  };
  assert.equal((await coordinateRefund(refundCommand(), ports)).providerRefundId, "re_x");
  assert.equal((await coordinateRefund(refundCommand(), ports)).state, "submitted");
  assert.deepEqual(steps, ["reserve", "verify", "claim", "payload", "submit", "record:known", "reserve"]);
});

test("refusals before dispatch send nothing", async () => {
  let submitted = false;
  const ports = { reserve: async () => refundReceipt(), verify: async () => ({ observationId: ORDER }),
    claim: async () => { throw new Error("ADM_DISABLED"); }, payload: async () => ({ command: refundCommand() }),
    submit: async () => { submitted = true; return { kind: "unknown", code: "X" }; },
    record: async () => refundReceipt(), read: async () => refundReceipt() };
  await assert.rejects(coordinateRefund(refundCommand(), ports), /ADM_DISABLED/);
  assert.equal(submitted, false);
});

test("a request that could not be read never left: it is recorded as not sent, so it holds nothing back", async () => {
  const steps = [];
  const ports = { reserve: async () => refundReceipt(), verify: async () => ({ observationId: ORDER }),
    claim: async () => ({ operationId: refundReceipt().operationId, fence: 3, expiresAt: "2026-10-07T10:00:10Z" }),
    payload: async () => { steps.push("payload"); throw new Error("ADM_STALE"); },
    submit: async () => { steps.push("submit"); return { kind: "known" }; },
    record: async (_claim, result) => { steps.push(`record:${result.kind}:${result.code}`); return refundReceipt({ state: "rejected",
      reasonCode: result.code }); },
    read: async () => refundReceipt() };
  assert.equal((await coordinateRefund(refundCommand(), ports)).state, "rejected");
  assert.deepEqual(steps, ["payload", "record:not_executed:PAYLOAD_UNAVAILABLE"]);
});

