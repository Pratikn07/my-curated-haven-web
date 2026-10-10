import type { CaseCategory, CaseState, OrderSupportDto } from "./contracts";

/** Plain-language labels for support states. Unknown and unavailable never read as "none" or "no". */

export const ATTEMPT_LABELS: Record<OrderSupportDto["attemptState"], string> = {
  creating: "Starting checkout", creation_unknown: "Checkout start not confirmed", open: "Checkout open",
  processing: "Payment processing", review: "Held for review", closed: "Checkout closed",
};

export const PAYMENT_LABELS: Record<OrderSupportDto["paymentState"], string> = {
  unpaid: "Not paid", processing: "Processing", paid: "Paid", failed: "Failed",
  unknown: "Unknown (no payment recorded)",
};

export const ACCOUNT_LABELS: Record<OrderSupportDto["accountState"], string> = {
  active: "Active", unconfirmed: "Email not confirmed", closed: "Account closed", disabled: "Account disabled",
  unavailable: "Unavailable",
};

export const ACCESS_LABELS = { active: "Has access", denied: "No access", unavailable: "Unavailable" } as const;

export const CASE_STATE_LABELS: Record<CaseState, string> = {
  open: "Open", investigating: "Investigating", waiting_on_customer: "Waiting on customer",
  waiting_on_provider: "Waiting on Stripe", resolved: "Resolved",
};

export const CASE_CATEGORY_LABELS: Record<CaseCategory, string> = {
  missing_access: "Missing access", unresolved_payment: "Unresolved payment", account_mismatch: "Account mismatch",
  refund_followup: "Refund follow-up", dispute_followup: "Dispute follow-up", duplicate_purchase: "Duplicate purchase",
  content_availability: "Recipe availability",
};

export const SOURCE_LABELS = { stripe_purchase: "Purchase", native_legacy: "App purchase", support_grant: "Support grant",
  promotional: "Promotion" } as const;

export const QUEUE_REASONS: Record<string, string> = {
  ORDER_REVIEW: "Order held for review", REFUND_PENDING: "Refund pending", REFUND_FAILED: "Refund failed",
  DISPUTE_INQUIRY: "Dispute inquiry", DISPUTE_OPEN: "Dispute open", CASE_OPEN: "Case open",
  CASE_INVESTIGATING: "Case being investigated", CASE_WAITING_ON_CUSTOMER: "Case waiting on customer",
  CASE_WAITING_ON_PROVIDER: "Case waiting on Stripe",
};

/** Why a provider check is incomplete, in plain words. An unlisted code is shown as-is. */
export const BLOCKER_LABELS: Record<string, string> = {
  checkout_unavailable: "Stripe could not be reached",
  provider_unavailable: "Stripe is not set up on this server",
  session_missing: "The order has no checkout session",
  session_order_mismatch: "The checkout session belongs to another order",
  account_mismatch: "The Stripe account differs from the order's",
  mode_mismatch: "Test or live mode differs from the order's",
  session_mismatch: "The checkout session differs from the order's",
  payment_incomplete: "Payment details are incomplete",
  refunds_incomplete: "Not every refund could be read",
  disputes_incomplete: "Not every dispute could be read",
  refund_conflict: "Stripe returned conflicting refund records",
  dispute_conflict: "Stripe returned conflicting dispute records",
  adjustment_binding_mismatch: "A refund or dispute belongs to another payment",
  currency_mismatch: "A refund or dispute is in another currency",
  refund_status_unknown: "A refund has an unrecognised status",
  dispute_status_unknown: "A dispute has an unrecognised status",
};

export const REPAIR_KIND_LABELS = {
  reconcile_order: "Reconcile the purchase with Stripe",
  rebuild_projection: "Rebuild the customer's access",
} as const;

export const PROPOSAL_STATE_LABELS = {
  awaiting_approval: "Waiting for the owner's approval",
  approved: "Approved",
  blocked: "Blocked",
  expired: "Expired",
} as const;

/** Why a repair cannot go ahead, in plain words. An unlisted code is shown as-is. */
export const REPAIR_BLOCKER_LABELS: Record<string, string> = {
  no_change: "Nothing to repair: access is already what the evidence supports",
  policy_missing: "No approved access policy covers this order's terms",
  dispute_open: "A formal dispute is open; access cannot be restored until it is resolved",
  evidence_incomplete: "The Stripe check was incomplete",
  observation_incomplete: "The Stripe check was incomplete",
  payment_conflict: "Stripe's payment is recorded against something else",
  refund_conflict: "A refund is recorded against something else",
  dispute_conflict: "A dispute is recorded against something else",
  payment_incomplete: "Stripe reported refunds or disputes without a payment",
  account_mismatch: "The Stripe account differs from the order's",
  mode_mismatch: "Test or live mode differs from the order's",
  session_mismatch: "The checkout session differs from the order's",
  amount_mismatch: "The amount paid differs from the order's price",
  currency_mismatch: "The currency differs from the order's",
  binding_incomplete: "The order did not record its price",
  payment_unknown: "Stripe's payment state is unknown",
  dispute_unknown: "A dispute has an unrecognised status",
  amount_invalid: "A refund or dispute amount is invalid",
};

/** Minor units in the currency's own decimals: 1400 USD is $14.00, 500 JPY is ¥500. */
export function formatMoney(minor: number | null, currency: string | null): string {
  if (minor === null || currency === null) return "Unknown";
  const format = new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() });
  return format.format(minor / 10 ** (format.resolvedOptions().maximumFractionDigits ?? 2));
}

export const REFUND_REASON_LABELS = {
  requested_by_customer: "Requested by the customer",
  duplicate: "Duplicate charge",
} as const;

export const REFUND_EXCEPTION_LABELS = {
  duplicate_charge: "Duplicate charge",
  billing_error: "Billing error",
  unresolved_delivery: "Purchase could not be delivered",
  required_remedy: "Remedy required by law or by Stripe",
} as const;

export const REFUND_STATE_LABELS = {
  awaiting_approval: "Waiting for the owner's approval",
  approved: "Approved, not sent",
  blocked: "Blocked",
  expired: "Expired",
  started: "Sent for refund",
} as const;

/** Why a refund cannot go ahead. Codes shared with repairs fall back to the repair wording. */
export const REFUND_BLOCKER_LABELS: Record<string, string> = {
  refund_in_flight: "Another refund of this payment is pending at Stripe or reserved here",
  dispute_open: "A formal dispute is open on this payment",
  nothing_to_refund: "Nothing is left to refund",
  payment_not_refundable: "Stripe does not show a captured payment that can be refunded",
  access_unknown: "The refund's effect on access could not be worked out",
  binding_mismatch: "The Stripe check belongs to another payment",
};
