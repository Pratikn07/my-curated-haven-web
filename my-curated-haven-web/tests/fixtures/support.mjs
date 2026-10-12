// Synthetic Phase 3 support fixtures for Node tests. Valid UUIDs, test mode only; nothing names a real customer,
// account or provider object.
export const ORDER = "f3000000-0000-4000-8000-000000000001";
export const USER = "f3000000-0000-4000-8000-000000000002";
export const COLLECTION = "f3000000-0000-4000-8000-000000000003";
export const RELEASE = "f3000000-0000-4000-8000-000000000004";
export const PROPOSAL = "f3000000-0000-4000-8000-000000000005";
export const OBSERVATION = "f3000000-0000-4000-8000-000000000006";
export const OPERATION = "f3000000-0000-4000-8000-000000000007";
export const AUDIT = "f3000000-0000-4000-8000-000000000008";
export const RECIPE = "f3000000-0000-4000-8000-000000000009";
export const DIGEST = "a".repeat(64);
export const AT = "2026-10-01T10:00:00.000Z";

export function paidFacts() {
  return { accountId: "acct_support_test", mode: "test", sessionId: "cs_test_support",
    paymentIntentId: "pi_support", chargeId: "ch_support", capturedMinor: 1500, currency: "usd",
    paymentState: "paid", paidAt: "2026-10-01T10:00:00Z", refunds: [], disputes: [] };
}

export function approvedPolicy() {
  return { id: "support-fixture-policy", approved: true, version: "fixture-v1",
    pendingRefund: "retain", partialRefund: "retain", fullRefund: "ineligible", inquiry: "retain",
    formalOpen: "hold", formalLost: "ineligible", duration: "indefinite", fixedSeconds: null };
}

export function binding() {
  return { orderId: ORDER, userId: USER, ownerPrincipal: USER, collectionId: COLLECTION, releaseId: RELEASE,
    sessionId: "cs_test_support", accountId: "acct_support_test", mode: "test", expectedCapturedMinor: 1500,
    currency: "usd", manifestHash: DIGEST, refundPolicyVersion: "v1", accessPolicyVersion: "v1", version: 3 };
}

export function effect() {
  return { sourceId: ORDER, beforeEligible: null, afterEligible: true, beforeEffective: "denied",
    afterEffective: "active", recipeIds: [RECIPE], notification: "none" };
}

export function proposal() {
  return { id: PROPOSAL, orderId: ORDER, userId: USER, ownerPrincipal: USER, binding: binding(),
    kind: "reconcile_order", observationId: OBSERVATION, materialDigest: DIGEST, expectedOrderVersion: 3,
    dependencyToken: "dep-1", policyVersion: "fixture-v1", effects: [effect()], blockers: [], digest: DIGEST,
    expiresAt: "2026-10-01T10:30:00.000Z", reason: "Paid but not fulfilled" };
}

export function receipt() {
  return { operationId: OPERATION, orderId: ORDER, state: "applied", effects: [effect()], auditId: AUDIT,
    committedAt: AT, proposalId: PROPOSAL, verification: "pending" };
}

export function refundCommand(){return {operationId:"f3000000-0000-4000-8000-000000000060",
  proposalId:"f3000000-0000-4000-8000-000000000061",expectedDigest:"fixture-refund-digest",caseId:null};}
export function refundReceipt(overrides={}){const command=refundCommand();return {
  operationId:command.operationId,proposalId:command.proposalId,orderId:ORDER,
  amountMinor:400,currency:"usd",state:"reserved",providerRefundId:null,providerStatus:null,
  reconciliation:"not_started",auditId:"f3000000-0000-4000-8000-000000000062",
  reasonCode:null,firstDispatchedAt:null,checkedAt:"2026-10-07T10:00:00Z",...overrides};}
