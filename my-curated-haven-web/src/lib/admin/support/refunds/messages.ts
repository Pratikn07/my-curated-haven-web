import type { RefundReceipt } from "./contracts";

/** One sentence per refund state; an unknown money outcome never invites another refund. No runtime imports. */
export function refundOutcomeMessage(receipt: RefundReceipt): string {
  switch (receipt.state) {
    case "reserved":
      return "Refund approved and reserved. Nothing has been sent to Stripe yet.";
    case "expired":
      return "The approval ran out before this refund was sent. Nothing was sent to Stripe and the amount is no longer reserved.";
    case "dispatching":
      return "Refund is being sent to Stripe. Check this operation's status before taking further action.";
    case "outcome_unknown":
      return "Refund outcome unknown. Check this operation's status before taking further action.";
    case "rejected":
      return `Stripe did not make this refund (${receipt.reasonCode ?? "rejected"}). No money moved and the amount is no longer reserved.`;
    case "submitted": {
      const stripe = receipt.providerStatus === "succeeded" ? "Stripe reports the refund succeeded."
        : receipt.providerStatus === "failed" || receipt.providerStatus === "canceled" ? `Stripe reports the refund ${receipt.providerStatus}.`
        : "Stripe has the refund and reports it pending.";
      const local = receipt.reconciliation === "applied" ? "Access has been updated."
        : receipt.reconciliation === "unavailable" ? "Local access reconciliation could not run; support will follow up."
        : "Local access reconciliation is pending.";
      return `${stripe} ${local}`;
    }
  }
}

/**
 * An amount typed in the currency's normal units ("4.00") as whole minor units (400), using the currency's own number
 * of decimals (none for JPY). Anything else, including extra decimals, signs or separators, is null.
 */
export function parseMinorAmount(text: string, currency: string): number | null {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency: currency.toUpperCase() }).resolvedOptions().maximumFractionDigits ?? 2;
  const match = text.trim().match(digits === 0 ? /^(\d{1,9})$/ : new RegExp(`^(\\d{1,9})(?:\\.(\\d{1,${digits}}))?$`));
  if (!match) return null;
  const minor = Number(match[1]) * 10 ** digits + Number((match[2] ?? "").padEnd(digits, "0") || 0);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}
