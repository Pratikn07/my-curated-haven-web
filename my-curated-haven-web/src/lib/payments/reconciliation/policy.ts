import type { Binding, DisputeFact, Eligibility, EligibilityPolicy, FinancialFacts, RefundFact } from "./contracts";

/**
 * Whether one purchase source gives access, from verified facts and the order's approved policy. The database
 * twin is private.commerce_evaluate; both are checked against tests/fixtures/eligibility-matrix.json.
 *
 * - blocked: the facts or terms cannot be judged (missing policy, unbound or unknown facts, conflicting records).
 * - ineligible: the facts are clear and exclude access (not paid, fully refunded, dispute hold or loss, account
 *   inactive, manual hold, expired).
 * - eligible: paid and nothing excludes it. "dispute_open" is listed when a formal dispute is open under a policy that
 *   keeps access during review; manual restoration is still refused while it is open.
 */

/**
 * Problems that stop a provider observation from being trusted for this order: a different account, mode,
 * checkout, amount or currency, or an order that never recorded the terms needed to judge it. Empty means bound.
 */
export function validateBinding(binding: Binding, facts: FinancialFacts): string[] {
  const issues = new Set<string>();
  if (binding.accountId !== facts.accountId) issues.add("account_mismatch");
  if (binding.mode !== facts.mode) issues.add("mode_mismatch");
  if (binding.sessionId !== null && facts.sessionId !== null && binding.sessionId !== facts.sessionId) issues.add("session_mismatch");
  if (binding.expectedCapturedMinor === null || binding.currency === null) issues.add("binding_incomplete");
  if (binding.refundPolicyVersion === null || binding.accessPolicyVersion === null) issues.add("policy_version_unknown");
  if (facts.capturedMinor !== null && binding.expectedCapturedMinor !== null && facts.capturedMinor !== binding.expectedCapturedMinor) {
    issues.add("amount_mismatch");
  }
  if (facts.currency !== null && binding.currency !== null && facts.currency !== binding.currency) issues.add("currency_mismatch");
  return [...issues].sort();
}

const OPEN_FORMAL = new Set(["needs_response", "under_review"]);
// Formal disputes closed without a loss: won, closed because the charge was refunded (the refund decides), or prevented.
const WON = new Set(["won", "charge_refunded", "prevented"]);
const LOST = new Set(["lost"]);

function validAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/** Collapse exact repeats; any repeated id with different content is a conflict. */
function unique<T extends RefundFact | DisputeFact>(items: T[]): { items: T[]; conflict: boolean } {
  const seen = new Map<string, string>();
  const out: T[] = [];
  let conflict = false;
  for (const item of items) {
    const key = JSON.stringify(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : 1)));
    const previous = seen.get(item.id);
    if (previous === undefined) { seen.set(item.id, key); out.push(item); } else if (previous !== key) conflict = true;
  }
  return { items: out, conflict };
}

export function evaluatePurchase(input: {
  facts: FinancialFacts;
  binding: Binding;
  policy: EligibilityPolicy | null;
  accountActive: boolean;
  manualHold: boolean;
  nowMs: number;
}): Eligibility {
  const { facts, binding, policy, accountActive, manualHold, nowMs } = input;
  const blockers = new Set<string>(validateBinding(binding, facts).filter((issue) => issue !== "policy_version_unknown"));
  const exclusions = new Set<string>();
  const notes = new Set<string>();

  if (policy === null || !policy.approved) blockers.add("policy_missing");
  if (facts.paymentState === "unknown") blockers.add("payment_unknown");

  const refunds = unique(facts.refunds);
  const disputes = unique(facts.disputes);
  if (refunds.conflict) blockers.add("refund_conflict");
  if (disputes.conflict) blockers.add("dispute_conflict");
  for (const r of refunds.items) {
    if (!validAmount(r.amountMinor)) blockers.add("amount_invalid");
    if (facts.currency !== null && r.currency !== facts.currency) blockers.add("currency_mismatch");
  }
  for (const d of disputes.items) {
    if (!validAmount(d.amountMinor)) blockers.add("amount_invalid");
    if (facts.currency !== null && d.currency !== facts.currency) blockers.add("currency_mismatch");
    if (d.classification === "unknown") blockers.add("dispute_unknown");
  }

  const paid = facts.paymentState === "paid";
  if (facts.paymentState === "unpaid" || facts.paymentState === "processing" || facts.paymentState === "failed") {
    exclusions.add("not_paid");
  }
  if (paid && facts.capturedMinor !== null) {
    const refunded = refunds.items.filter((r) => r.status === "succeeded" && validAmount(r.amountMinor))
      .reduce((sum, r) => sum + r.amountMinor, 0);
    if (refunded >= facts.capturedMinor) exclusions.add("fully_refunded");
  }
  for (const d of disputes.items.filter((x) => x.classification === "formal")) {
    if (LOST.has(d.status)) exclusions.add("dispute_lost");
    else if (OPEN_FORMAL.has(d.status)) {
      if (policy?.formalOpen === "hold") exclusions.add("dispute_hold"); else notes.add("dispute_open");
    } else if (!WON.has(d.status)) blockers.add("dispute_unknown");
  }
  if (!accountActive) exclusions.add("account_inactive");
  if (manualHold) exclusions.add("manual_hold");

  const paidAtMs = paid && facts.paidAt !== null ? Date.parse(facts.paidAt) : null;
  let expiresAt: string | null = null;
  if (paidAtMs !== null && policy?.duration === "fixed") {
    if (policy.fixedSeconds === null || !Number.isSafeInteger(policy.fixedSeconds) || policy.fixedSeconds <= 0) {
      blockers.add("policy_missing");
    } else {
      const end = paidAtMs + policy.fixedSeconds * 1000;
      expiresAt = new Date(end).toISOString();
      if (nowMs >= end) exclusions.add("expired");
    }
  }

  const state = blockers.size > 0 ? "blocked" : exclusions.size > 0 ? "ineligible" : "eligible";
  const reasons = [...blockers, ...exclusions, ...(state === "eligible" ? notes : [])].sort();
  return { state, reasons, validFrom: paidAtMs === null ? null : new Date(paidAtMs).toISOString(), expiresAt };
}
