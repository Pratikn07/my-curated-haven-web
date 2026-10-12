import type { RefundFact } from "./reconciliation/contracts";
import type { RefundIntent, RefundSubmissionResult } from "../admin/support/refunds/contracts";

/**
 * How a refund request's answer is read. Only a documented validation rejection proves Stripe made no refund; a
 * timeout, lost response, server error, conflict or anything uncertain is unknown and keeps the money reserved. A
 * returned or recovered refund counts only when it is exactly this operation's refund. No runtime imports.
 */

const NOT_EXECUTED_CODES = new Set(["charge_already_refunded", "amount_too_large", "charge_disputed", "parameter_invalid_integer",
  "parameter_missing", "parameter_unknown", "resource_missing"]);

export function refundErrorResult(error: unknown): RefundSubmissionResult {
  const e = (error ?? {}) as { type?: unknown; code?: unknown; statusCode?: unknown };
  const status = typeof e.statusCode === "number" ? e.statusCode : null;
  if (e.type === "StripeInvalidRequestError" && typeof e.code === "string" && NOT_EXECUTED_CODES.has(e.code)
    && status !== null && status >= 400 && status < 500 && status !== 409) {
    return { kind: "not_executed", code: e.code.toUpperCase() };
  }
  return { kind: "unknown", code: "PROVIDER_OUTCOME_UNKNOWN" };
}

type ProviderRefund = { id: string; amount: number; currency: string; status: string | null; created: number;
  charge: string | { id: string } | null; payment_intent: string | { id: string } | null; metadata?: Record<string, string> | null };

const idOf = (v: string | { id: string } | null) => (typeof v === "string" ? v : v?.id ?? null);

/** The provider refund as a bound fact, or null when it is not exactly this intent's refund. */
export function boundRefundFact(intent: Pick<RefundIntent, "chargeId" | "paymentIntentId" | "amountMinor" | "currency" | "command">,
  refund: ProviderRefund): RefundFact | null {
  if (idOf(refund.charge) !== intent.chargeId || idOf(refund.payment_intent) !== intent.paymentIntentId
    || refund.amount !== intent.amountMinor || refund.currency !== intent.currency
    || refund.metadata?.support_refund_operation !== intent.command.operationId) return null;
  const status = ["pending", "requires_action", "succeeded", "failed", "canceled"].includes(refund.status ?? "")
    ? (refund.status as RefundFact["status"]) : null;
  if (status === null) return null;
  return { id: refund.id, paymentIntentId: intent.paymentIntentId, chargeId: intent.chargeId, amountMinor: refund.amount,
    currency: refund.currency, status, occurredAt: new Date(refund.created * 1000).toISOString() };
}

/** Among a charge's refunds, the one this operation created; null when it is not (yet) visible. */
export function recoveredRefund(intent: Parameters<typeof boundRefundFact>[0], refunds: ProviderRefund[]): RefundFact | null {
  const matches = refunds.map((r) => boundRefundFact(intent, r)).filter((f): f is RefundFact => f !== null);
  return matches.length === 1 ? matches[0] : null;
}
