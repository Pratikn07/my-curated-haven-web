import test from "node:test";
import assert from "node:assert/strict";
import { coordinateRefund } from "../../src/lib/admin/support/refunds/coordinator.ts";
import { refundRetryAllowed } from "../../src/lib/admin/support/refunds/policy.ts";
import { recoveredRefund } from "../../src/lib/payments/refund-outcomes.ts";
import { ORDER, refundCommand, refundReceipt } from "../fixtures/support.mjs";

test("retry requires live approval and never crosses the provider-key safety window",()=>{
  const first=Date.parse("2026-10-07T10:00:00Z");
  const input={firstDispatchMs:first,nowMs:first+1000,approvalExpiresMs:first+300000,
    authorised:true,gateEnabled:true,sameRequest:true};
  assert.equal(refundRetryAllowed(input),true);
  assert.equal(refundRetryAllowed({...input,nowMs:first+300000}),false);
  assert.equal(refundRetryAllowed({...input,authorised:false}),false);
  assert.equal(refundRetryAllowed({...input,gateEnabled:false}),false);
  assert.equal(refundRetryAllowed({...input,sameRequest:false}),false);
  assert.equal(refundRetryAllowed({...input,nowMs:first+23*60*60*1000,
    approvalExpiresMs:first+24*60*60*1000}),false);
});

/**
 * A small model of one refund: the database's intent state machine (reserved → dispatching → submitted/unknown/
 * rejected, one claim, a ten-second claim) and a provider that honours idempotency keys only for 24 hours, as Stripe
 * prunes them. A crash at a named step throws after that step's side effects, as a process dying there would.
 */
class Crash extends Error {}
const HOUR = 3600_000;
function world() {
  const command = refundCommand();
  const intent = { state: null, fence: 0, claimUntil: 0, providerRefundId: null };
  const provider = { refunds: [], keys: new Map(), sends: 0 };
  let now = Date.parse("2026-10-07T10:00:00Z");
  let crashAt = null;
  const crash = (step) => { if (crashAt === step) { crashAt = null; throw new Crash(step); } };
  const receipt = () => refundReceipt({ state: intent.state, providerRefundId: intent.providerRefundId,
    providerStatus: intent.providerRefundId ? "succeeded" : null });
  const fact = (r) => ({ id: r.id, paymentIntentId: "pi_support", chargeId: "ch_support", amountMinor: r.amount, currency: "usd",
    status: "succeeded", occurredAt: new Date(now).toISOString() });
  const ports = {
    reserve: async () => { crash("before-intent"); intent.state ??= "reserved"; crash("after-reservation"); return receipt(); },
    verify: async () => ({ observationId: ORDER }),
    claim: async () => {
      if (intent.state !== "reserved") throw new Error("ADM_CONFLICT");
      Object.assign(intent, { state: "dispatching", fence: intent.fence + 1, claimUntil: now + 10_000 });
      crash("after-dispatching");
      return { operationId: command.operationId, fence: intent.fence, expiresAt: new Date(intent.claimUntil).toISOString() };
    },
    submit: async () => {
      const key = `mch-support-refund-${command.operationId}`;
      const kept = provider.keys.get(key);
      let refund = kept && now - kept.at < 24 * HOUR ? kept.refund : null;
      if (!refund) {
        provider.sends += 1;
        refund = { id: `re_${provider.sends}`, amount: 400, currency: "usd", status: "succeeded", charge: "ch_support", created: now / 1000,
          payment_intent: "pi_support", metadata: { support_refund_operation: command.operationId } };
        provider.refunds.push(refund);
        provider.keys.set(key, { refund, at: now });
      }
      crash("after-acceptance");
      return { kind: "known", fact: fact(refund) };
    },
    record: async (claim, result) => {
      crash("before-record");
      if (result.kind === "known") Object.assign(intent, { state: "submitted", providerRefundId: result.fact.id });
      else if (claim.fence === intent.fence && intent.state === "dispatching") intent.state = result.kind === "unknown" ? "outcome_unknown" : "rejected";
      return receipt();
    },
    read: async () => receipt(),
  };
  // Read-only recovery: an expired claim becomes unknown; Stripe's list is matched to this exact operation.
  async function recover() {
    if (intent.state === "dispatching" && intent.claimUntil <= now) intent.state = "outcome_unknown";
    if (intent.state !== "outcome_unknown") return receipt();
    const found = recoveredRefund({ chargeId: "ch_support", paymentIntentId: "pi_support", amountMinor: 400, currency: "usd", command },
      provider.refunds);
    if (found) Object.assign(intent, { state: "submitted", providerRefundId: found.id });
    return receipt();
  }
  return {
    command, intent, provider, ports, recover,
    crashAt: (step) => { crashAt = step; },
    advance: (ms) => { now += ms; },
    submit: () => coordinateRefund(command, ports),
  };
}

test("a crash before the durable intent or after reservation sends nothing, and the same operation then sends once", async () => {
  for (const step of ["before-intent", "after-reservation"]) {
    const w = world();
    w.crashAt(step);
    await assert.rejects(w.submit(), Crash);
    assert.equal(w.provider.sends, 0, step);
    assert.equal((await w.submit()).state, "submitted", step);
    assert.equal((await w.submit()).state, "submitted", step);
    assert.equal(w.provider.sends, 1, step);
  }
});

test("a crash after the dispatch is written never sends; the refund stays unknown and is never retried with a new key", async () => {
  const w = world();
  w.crashAt("after-dispatching");
  await assert.rejects(w.submit(), Crash);
  assert.equal((await w.submit()).state, "dispatching");
  w.advance(11_000);
  assert.equal((await w.recover()).state, "outcome_unknown");
  w.advance(25 * HOUR);
  assert.equal((await w.submit()).state, "outcome_unknown");
  assert.equal((await w.recover()).state, "outcome_unknown");
  assert.equal(w.provider.sends, 0);
});

test("a crash after Stripe accepted, or before the answer was stored, is recovered by reading, never by resending", async () => {
  for (const step of ["after-acceptance", "before-record"]) {
    const w = world();
    w.crashAt(step);
    const first = await w.submit().catch((error) => error);
    // A send whose answer was lost is recorded as unknown; a crash before recording leaves it dispatching.
    assert.ok(first instanceof Crash ? step === "before-record" : first.state === "outcome_unknown", step);
    w.advance(11_000);
    assert.equal((await w.submit()).state, step === "before-record" ? "dispatching" : "outcome_unknown", step);
    const recovered = await w.recover();
    assert.equal(recovered.state, "submitted", step);
    assert.equal(recovered.providerRefundId, "re_1", step);
    // Even after Stripe has forgotten the idempotency key, nothing is sent again.
    w.advance(25 * HOUR);
    assert.equal((await w.submit()).state, "submitted", step);
    assert.equal(w.provider.sends, 1, step);
  }
});

test("recovery matches only this operation's refund for the exact charge, amount and currency", () => {
  const command = refundCommand();
  const intent = { chargeId: "ch_support", paymentIntentId: "pi_support", amountMinor: 400, currency: "usd", command };
  const refund = (over = {}) => ({ id: "re_1", amount: 400, currency: "usd", status: "succeeded", charge: "ch_support", created: 1791000000,
    payment_intent: "pi_support", metadata: { support_refund_operation: command.operationId }, ...over });
  assert.equal(recoveredRefund(intent, [refund()])?.id, "re_1");
  assert.equal(recoveredRefund(intent, [refund({ amount: 399 })]), null);
  assert.equal(recoveredRefund(intent, [refund({ metadata: { support_refund_operation: "other" } })]), null);
  assert.equal(recoveredRefund(intent, [refund(), refund({ id: "re_2" })]), null, "two matches are ambiguous, not chosen");
});
