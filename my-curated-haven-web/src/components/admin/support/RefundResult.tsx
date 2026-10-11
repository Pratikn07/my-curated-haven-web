import type { RefundReceipt } from "@/lib/admin/support/refunds/contracts";
import { refundOutcomeMessage } from "@/lib/admin/support/refunds/messages";
import { formatMoney } from "@/lib/admin/support/labels";

const TITLES: Record<RefundReceipt["state"], string> = {
  reserved: "Approved, not sent",
  expired: "Not sent",
  dispatching: "Sending",
  outcome_unknown: "Outcome unknown",
  submitted: "Sent to Stripe",
  rejected: "Not refunded",
};

const STRIPE: Record<RefundReceipt["state"], string> = {
  reserved: "Not sent yet", expired: "Not sent", dispatching: "Sending", outcome_unknown: "Unknown", submitted: "", rejected: "Refused",
};
const PROVIDER_STATUS = { pending: "Pending", requires_action: "Needs action", succeeded: "Succeeded", failed: "Failed", canceled: "Canceled" } as const;
const ACCESS_UPDATE = { not_started: "Not started", pending: "Pending", applied: "Applied", unavailable: "Could not run" } as const;

/**
 * Where one refund operation stands. Stripe's answer and our own access update are reported separately, and an
 * unknown outcome never offers a second refund: the only follow-ups read the stored status or ask Stripe.
 */
export default function RefundResult({ receipt, busy, onCheck, onRecover }: {
  receipt: RefundReceipt; busy: boolean; onCheck: () => void; onRecover: () => void;
}) {
  const recoverable = receipt.state === "dispatching" || receipt.state === "outcome_unknown"
    || (receipt.state === "submitted" && receipt.reconciliation !== "applied");
  return (
    <div className="admin-support__repair" role="group" aria-label="Refund result"
      data-tone={receipt.state === "submitted" || receipt.state === "reserved" ? "ok" : receipt.state === "rejected" || receipt.state === "expired" ? "neutral" : "warning"}>
      <p role="status" aria-label="Refund outcome"><strong>{TITLES[receipt.state]}: {formatMoney(receipt.amountMinor, receipt.currency)}.</strong>
        {" "}{refundOutcomeMessage(receipt)}</p>
      <dl className="admin-collection__facts">
        <div><dt>Stripe</dt><dd>{receipt.state === "submitted" && receipt.providerStatus ? PROVIDER_STATUS[receipt.providerStatus]
          : receipt.state === "rejected" && receipt.reasonCode ? `${STRIPE.rejected} (${receipt.reasonCode})` : STRIPE[receipt.state]}</dd></div>
        <div><dt>Access update</dt><dd>{ACCESS_UPDATE[receipt.reconciliation]}</dd></div>
      </dl>
      <p className="admin-collection__note">Operation {receipt.operationId.slice(0, 8)}
        {receipt.providerRefundId ? ` · Stripe refund ${receipt.providerRefundId}` : ""}</p>
      <div className="admin-support__actions">
        <button type="button" onClick={onCheck} disabled={busy}>Check refund status</button>
        {recoverable ? <button type="button" onClick={onRecover} disabled={busy}>Ask Stripe what happened</button> : null}
      </div>
    </div>
  );
}
