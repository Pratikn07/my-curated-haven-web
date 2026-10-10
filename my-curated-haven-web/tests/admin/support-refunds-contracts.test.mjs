import test from "node:test";
import assert from "node:assert/strict";
import { decodeRefundApproval, decodeRefundProposal, decodeRefundReceipt } from "../../src/lib/admin/support/decode.ts";
import { binding, DIGEST, effect, OBSERVATION, ORDER, PROPOSAL, USER, refundReceipt } from "../fixtures/support.mjs";

const proposal = (over = {}) => ({ id: PROPOSAL, orderId: ORDER, ownerPrincipal: USER, binding: binding(), paymentIntentId: "pi_support",
  chargeId: "ch_support", observationId: OBSERVATION, expectedOrderVersion: 3, amountMinor: 1400, currency: "usd",
  providerReason: "requested_by_customer", exceptionCategory: "billing_error", internalReason: "Charged twice",
  capacity: { capturedMinor: 1500, successfulMinor: 100, pendingMinor: 0, reservedMinor: 0, availableMinor: 1400, blockers: [] },
  policyVersion: "synthetic-v1", dependencyToken: DIGEST, effects: [{ ...effect(), afterEligible: false, afterEffective: "denied" }],
  blockers: [], digest: DIGEST, expiresAt: "2026-10-07T10:05:00.000Z", ...over });
const receipt = (over = {}) => ({ ...refundReceipt(over), auditId: "f3000000-0000-4000-8000-000000000062" });

test("a refund proposal, approval and receipt decode exactly", () => {
  assert.deepEqual(decodeRefundProposal(proposal()), proposal());
  const approval = { id: PROPOSAL, proposalId: PROPOSAL, digest: DIGEST, humanAuthoriser: USER, approvedAt: "2026-10-07T10:00:00.000Z",
    expiresAt: "2026-10-07T10:05:00.000Z", channel: "web" };
  assert.deepEqual(decodeRefundApproval(approval), approval);
  assert.deepEqual(decodeRefundReceipt(receipt()), receipt());
  assert.equal(decodeRefundReceipt(receipt({ state: "submitted", providerRefundId: "re_x", providerStatus: "succeeded", reconciliation: "applied" })).state, "submitted");
});

test("refund records that could mislead are refused", () => {
  assert.throws(() => decodeRefundProposal(proposal({ amountMinor: 14.5 })));
  assert.throws(() => decodeRefundProposal(proposal({ providerReason: "fraudulent" })));
  assert.throws(() => decodeRefundProposal(proposal({ providerKey: "rk_live_x" })));
  assert.throws(() => decodeRefundApproval({ id: PROPOSAL, proposalId: PROPOSAL, digest: DIGEST, humanAuthoriser: USER,
    approvedAt: "2026-10-07T10:00:00.000Z", expiresAt: "2026-10-07T10:05:00.000Z", channel: "operator" }));
  assert.throws(() => decodeRefundReceipt(receipt({ state: "refunded" })));
  assert.throws(() => decodeRefundReceipt({ ...receipt(), idempotencyKey: "mch-support-refund-x" }));
});
