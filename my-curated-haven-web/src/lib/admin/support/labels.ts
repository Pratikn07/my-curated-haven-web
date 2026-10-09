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

export function formatMoney(minor: number | null, currency: string | null): string {
  if (minor === null || currency === null) return "Unknown";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(minor / 100);
}
