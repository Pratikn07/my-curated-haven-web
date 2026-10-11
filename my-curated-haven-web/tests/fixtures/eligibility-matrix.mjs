// Eligibility cases shared by the TypeScript evaluator (tests/payments/reconciliation-policy.test.mjs) and its SQL
// twin (supabase/tests/database/73_admin_support_policy.test.sql, through the fixture rendered by
// scripts/support-eligibility-matrix.mjs). Expected results are written out by hand, never computed.
import { paidFacts, approvedPolicy } from "./support.mjs";

export function matrixBinding() {
  return { orderId: "f3000000-0000-4000-8000-000000000001", userId: "f3000000-0000-4000-8000-000000000002",
    ownerPrincipal: "f3000000-0000-4000-8000-000000000002", collectionId: "f3000000-0000-4000-8000-000000000010",
    releaseId: "f3000000-0000-4000-8000-000000000011", sessionId: "cs_test_support", accountId: "acct_support_test",
    mode: "test", expectedCapturedMinor: 1500, currency: "usd", manifestHash: "fixture-manifest",
    refundPolicyVersion: "fixture-refund-v1", accessPolicyVersion: "fixture-access-v1", version: 1 };
}

const NOW = "2026-10-07T10:00:00.000Z";
const PAID = "2026-10-01T10:00:00.000Z";
const refund = (id, amountMinor, status, currency = "usd") => ({ id, paymentIntentId: "pi_support", chargeId: "ch_support",
  amountMinor, currency, status, occurredAt: "2026-10-02T10:00:00Z" });
const dispute = (id, status, classification) => ({ id, paymentIntentId: "pi_support", chargeId: "ch_support", amountMinor: 1500,
  currency: "usd", status, classification, deadline: null });

function c(name, patch, expected) {
  const facts = { ...paidFacts(), ...(patch.facts ?? {}) };
  return { name, input: { facts, binding: { ...matrixBinding(), ...(patch.binding ?? {}) },
    policy: patch.policy === undefined ? approvedPolicy() : patch.policy,
    accountActive: patch.accountActive ?? true, manualHold: patch.manualHold ?? false, now: patch.now ?? NOW }, expected };
}

const eligible = { state: "eligible", reasons: [], validFrom: PAID, expiresAt: null };

export const ELIGIBILITY_CASES = [
  c("paid with no adjustment", {}, eligible),
  c("pending refund keeps access", { facts: { refunds: [refund("re_p", 100, "pending")] } }, eligible),
  c("successful partial refund keeps access", { facts: { refunds: [refund("re_a", 500, "succeeded")] } }, eligible),
  c("successful full refund removes this source",
    { facts: { refunds: [refund("re_f", 1500, "succeeded")] } }, { ...eligible, state: "ineligible", reasons: ["fully_refunded"] }),
  c("partial refunds adding up to the total remove it",
    { facts: { refunds: [refund("re_1", 700, "succeeded"), refund("re_2", 800, "succeeded")] } },
    { ...eligible, state: "ineligible", reasons: ["fully_refunded"] }),
  c("a failed full refund does not remove it", { facts: { refunds: [refund("re_f", 1500, "failed")] } }, eligible),
  c("an exact duplicate refund is counted once",
    { facts: { refunds: [refund("re_a", 500, "succeeded"), refund("re_a", 500, "succeeded")] } }, eligible),
  c("an inquiry keeps access", { facts: { disputes: [dispute("du_1", "warning_needs_response", "inquiry")] } }, eligible),
  c("an open formal dispute holds the source",
    { facts: { disputes: [dispute("dp_1", "needs_response", "formal")] } }, { ...eligible, state: "ineligible", reasons: ["dispute_hold"] }),
  c("a policy that retains access during review notes the open dispute",
    { facts: { disputes: [dispute("dp_1", "under_review", "formal")] }, policy: { ...approvedPolicy(), formalOpen: "retain" } },
    { ...eligible, reasons: ["dispute_open"] }),
  c("a won dispute keeps access", { facts: { disputes: [dispute("dp_1", "won", "formal")] } }, eligible),
  c("a dispute closed by refunding the charge leaves the refund to decide",
    { facts: { disputes: [dispute("dp_1", "charge_refunded", "formal")] } }, eligible),
  c("a prevented dispute keeps access", { facts: { disputes: [dispute("dp_1", "prevented", "formal")] } }, eligible),
  c("a lost dispute removes this source",
    { facts: { disputes: [dispute("dp_1", "lost", "formal")] } }, { ...eligible, state: "ineligible", reasons: ["dispute_lost"] }),
  c("no approved policy blocks", { policy: null }, { ...eligible, state: "blocked", reasons: ["policy_missing"] }),
  c("an unapproved policy blocks", { policy: { ...approvedPolicy(), approved: false } },
    { ...eligible, state: "blocked", reasons: ["policy_missing"] }),
  c("an unpaid checkout is never eligible", { facts: { paymentState: "unpaid", paidAt: null, capturedMinor: null } },
    { state: "ineligible", reasons: ["not_paid"], validFrom: null, expiresAt: null }),
  c("a processing payment is never eligible", { facts: { paymentState: "processing", paidAt: null, capturedMinor: null } },
    { state: "ineligible", reasons: ["not_paid"], validFrom: null, expiresAt: null }),
  c("an unknown payment blocks", { facts: { paymentState: "unknown", paidAt: null, capturedMinor: null } },
    { state: "blocked", reasons: ["payment_unknown"], validFrom: null, expiresAt: null }),
  c("an inactive account is excluded", { accountActive: false }, { ...eligible, state: "ineligible", reasons: ["account_inactive"] }),
  c("a failed former full refund cannot clear an independent hold",
    { facts: { refunds: [refund("re_full", 1500, "failed")] }, manualHold: true },
    { ...eligible, state: "ineligible", reasons: ["manual_hold"] }),
  c("an unclassified dispute blocks", { facts: { disputes: [dispute("dp_x", "needs_response", "unknown")] } },
    { ...eligible, state: "blocked", reasons: ["dispute_unknown"] }),
  c("a refund in another currency blocks", { facts: { refunds: [refund("re_e", 100, "succeeded", "eur")] } },
    { ...eligible, state: "blocked", reasons: ["currency_mismatch"] }),
  c("conflicting records for one refund block",
    { facts: { refunds: [refund("re_a", 500, "succeeded"), refund("re_a", 600, "succeeded")] } },
    { ...eligible, state: "blocked", reasons: ["refund_conflict"] }),
  c("a non-positive or fractional amount blocks",
    { facts: { refunds: [refund("re_z", 0, "succeeded"), refund("re_h", 10.5, "succeeded")] } },
    { ...eligible, state: "blocked", reasons: ["amount_invalid"] }),
  c("a fixed term still running ends at its exact boundary",
    { policy: { ...approvedPolicy(), duration: "fixed", fixedSeconds: 2592000 } },
    { ...eligible, expiresAt: "2026-10-31T10:00:00.000Z" }),
  c("a fixed term that has ended is expired",
    { policy: { ...approvedPolicy(), duration: "fixed", fixedSeconds: 86400 } },
    { ...eligible, state: "ineligible", reasons: ["expired"], expiresAt: "2026-10-02T10:00:00.000Z" }),
  c("a zero-decimal currency is compared in its own units",
    { facts: { currency: "jpy", capturedMinor: 1500, refunds: [refund("re_j", 1500, "succeeded", "jpy")] },
      binding: { currency: "jpy" } }, { ...eligible, state: "ineligible", reasons: ["fully_refunded"] }),
  c("evidence from another account blocks", { binding: { accountId: "acct_other" } },
    { ...eligible, state: "blocked", reasons: ["account_mismatch"] }),
  c("an order that never recorded its price blocks", { binding: { expectedCapturedMinor: null } },
    { ...eligible, state: "blocked", reasons: ["binding_incomplete"] }),
];
