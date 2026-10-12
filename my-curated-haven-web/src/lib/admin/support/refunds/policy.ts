import type { FinancialFacts } from "../../../payments/reconciliation/contracts";
import type { RefundCapacity, RefundPrepareInput, RefundReservation } from "./contracts";

/**
 * What can still be refunded on one payment, from complete bound provider facts and the local reservations not yet
 * visible at the provider (SQL twin: private.support_refund_capacity). A refund known both locally and at the provider
 * is counted once, by its provider id. Anything in flight blocks a new refund. No runtime imports.
 */
export function refundCapacity(facts: FinancialFacts, reservations: RefundReservation[]): RefundCapacity {
  if (facts.paymentState !== "paid" || facts.capturedMinor === null || facts.chargeId === null || facts.currency === null) {
    return { capturedMinor: 0, successfulMinor: 0, pendingMinor: 0, reservedMinor: 0, availableMinor: 0, blockers: ["payment_not_refundable"] };
  }
  const seen = new Set<string>();
  let successfulMinor = 0;
  let pendingMinor = 0;
  for (const refund of facts.refunds) {
    if (seen.has(refund.id)) continue;
    seen.add(refund.id);
    if (refund.status === "succeeded") successfulMinor += refund.amountMinor;
    else if (refund.status === "pending" || refund.status === "requires_action") pendingMinor += refund.amountMinor;
  }
  const reservedMinor = reservations.filter((r) => r.reserved && (r.providerRefundId === null || !seen.has(r.providerRefundId)))
    .reduce((sum, r) => sum + r.amountMinor, 0);
  const availableMinor = Math.max(0, facts.capturedMinor - successfulMinor - pendingMinor - reservedMinor);
  const blockers = new Set<string>();
  if (pendingMinor > 0 || reservedMinor > 0) blockers.add("refund_in_flight");
  if (facts.disputes.some((d) => d.classification === "formal" && ["needs_response", "under_review"].includes(d.status))) blockers.add("dispute_open");
  if (availableMinor === 0 && blockers.size === 0) blockers.add("nothing_to_refund");
  return { capturedMinor: facts.capturedMinor, successfulMinor, pendingMinor, reservedMinor, availableMinor, blockers: [...blockers].sort() };
}

/** The exact amount to refund: everything still available, or a whole number of minor units within it. */
export function decideRefundAmount(capacity: RefundCapacity, selection: RefundPrepareInput["amount"]): number {
  if (selection.kind === "full_remaining") {
    if (capacity.availableMinor < 1) throw new Error("Nothing is available to refund");
    return capacity.availableMinor;
  }
  const amount = selection.amountMinor;
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > capacity.availableMinor) throw new Error("Refund amount out of range");
  return amount;
}

/**
 * Whether a server-controlled resend of the same refund request is allowed: authorised, gate on, the same request,
 * within 23 hours of the first dispatch and before the approval expires.
 */
export function refundRetryAllowed(input: { nowMs: number; firstDispatchMs: number; approvalExpiresMs: number; authorised: boolean;
  gateEnabled: boolean; sameRequest: boolean }): boolean {
  const elapsed = input.nowMs - input.firstDispatchMs;
  return input.authorised && input.gateEnabled && input.sameRequest && elapsed >= 0 && elapsed < 23 * 3600_000
    && input.nowMs < input.approvalExpiresMs;
}
