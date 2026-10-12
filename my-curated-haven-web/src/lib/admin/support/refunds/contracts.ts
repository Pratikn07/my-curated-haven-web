import type { Approval, Binding, Mode, RefundFact, RepairEffect } from "../contracts";

/**
 * Owner-approved refund contracts (Phase 3, Tasks 23–25). A refund is an exception the owner approves one exact
 * amount at a time; nothing here is a customer-facing refund promise. Amounts are integer minor units.
 */

export type RefundReason = "requested_by_customer" | "duplicate";
export type RefundExceptionCategory = "duplicate_charge" | "billing_error" | "unresolved_delivery" | "required_remedy";
export type RefundPrepareInput = {
  orderId: string;
  caseId: string | null;
  amount: { kind: "full_remaining" } | { kind: "partial"; amountMinor: number };
  providerReason: RefundReason;
  exceptionCategory: RefundExceptionCategory;
  internalReason: string;
};
export type RefundCapacity = { capturedMinor: number; successfulMinor: number; pendingMinor: number; reservedMinor: number;
  availableMinor: number; blockers: string[] };
/**
 * `reserved` is whether the intent still holds money back: false once Stripe refused it, and false once an intent that
 * was never sent has outlived its approval (SQL: private.support_refund_lapsed).
 */
export type RefundReservation = { operationId: string; providerRefundId: string | null; amountMinor: number; reserved: boolean };
export type RefundProposal = {
  id: string;
  orderId: string;
  ownerPrincipal: string;
  binding: Binding;
  paymentIntentId: string;
  chargeId: string;
  observationId: string;
  expectedOrderVersion: number;
  amountMinor: number;
  currency: string;
  providerReason: RefundReason;
  exceptionCategory: RefundExceptionCategory;
  internalReason: string;
  capacity: RefundCapacity;
  policyVersion: string;
  dependencyToken: string;
  effects: RepairEffect[];
  blockers: string[];
  digest: string;
  expiresAt: string;
};
export type RefundCommand = { operationId: string; proposalId: string; expectedDigest: string; caseId: string | null };
export type RefundApproval = Omit<Approval, "channel"> & { channel: "web" };
export type RefundIntentState = "reserved" | "dispatching" | "outcome_unknown" | "submitted" | "rejected";
/** "expired": reserved, never sent, and its approval ran out, so it can never be sent and holds nothing back. */
export type RefundReceiptState = RefundIntentState | "expired";
export type RefundReceipt = {
  operationId: string;
  proposalId: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  state: RefundReceiptState;
  providerRefundId: string | null;
  providerStatus: RefundFact["status"] | null;
  reconciliation: "not_started" | "pending" | "applied" | "unavailable";
  auditId: string;
  reasonCode: string | null;
  firstDispatchedAt: string | null;
  checkedAt: string;
};
export type RefundDispatchClaim = { operationId: string; fence: number; expiresAt: string };
/** Server-private: never serialised to an admin response. */
export type RefundIntent = {
  command: RefundCommand;
  approvalId: string;
  humanAuthoriser: string;
  accountId: string;
  mode: Mode;
  paymentIntentId: string;
  chargeId: string;
  amountMinor: number;
  currency: string;
  providerReason: RefundReason;
  exceptionCategory: RefundExceptionCategory;
  providerKey: string;
  requestDigest: string;
  state: RefundIntentState;
  reservedMinor: number;
  firstDispatchedAt: string | null;
  retryUntil: string | null;
  fence: number;
};
export type RefundSubmissionResult = { kind: "known"; fact: RefundFact } | { kind: "unknown"; code: string }
  | { kind: "not_executed"; code: string };
export type RefundListState = "awaiting_approval" | "approved" | "blocked" | "expired" | "started";
export type RefundListItem = { proposal: RefundProposal; state: RefundListState; approval: RefundApproval | null;
  receipt: RefundReceipt | null; preparedAt: string };
/** The owner's refunds for one order, newest first, and whether new refunds may be sent at all. */
export type RefundList = { submissionEnabled: boolean; items: RefundListItem[] };
