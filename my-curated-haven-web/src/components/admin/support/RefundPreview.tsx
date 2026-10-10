import type { RefundListItem } from "@/lib/admin/support/refunds/contracts";
import { formatUtc } from "@/lib/admin/collections/labels";
import {
  REFUND_BLOCKER_LABELS, REFUND_EXCEPTION_LABELS, REFUND_REASON_LABELS, REFUND_STATE_LABELS, REPAIR_BLOCKER_LABELS, formatMoney,
} from "@/lib/admin/support/labels";

const ELIGIBILITY = (value: boolean | null) => (value === null ? "No purchase source" : value ? "Eligible" : "Not eligible");
const ACCESS = { active: "Has access", denied: "No access" } as const;

/**
 * Exactly the refund the database prepared: the fixed amount and currency, the payment's balance, the Stripe account
 * and mode, the policy and what the refund would do to access, and why it may be blocked. Losing access is shown as
 * plainly as keeping it.
 */
export default function RefundPreview({ item, supportReference }: { item: RefundListItem; supportReference: string }) {
  const p = item.proposal;
  const money = (minor: number) => formatMoney(minor, p.currency);
  return (
    <div className="admin-support__repair" aria-label="Refund preview" role="group">
      <p><strong>Refund {money(p.amountMinor)}</strong> · {REFUND_STATE_LABELS[item.state]}
        {item.approval ? ` (approved at ${formatUtc(item.approval.approvedAt)})` : ""}</p>
      <dl className="admin-collection__facts">
        <div><dt>Order</dt><dd>{supportReference}</dd></div>
        <div><dt>Stripe payment</dt><dd>{p.binding.mode === "live" ? "Live" : "Test"} · {p.binding.accountId} · {p.paymentIntentId}</dd></div>
        <div><dt>Refund amount</dt><dd>{money(p.amountMinor)} ({p.currency.toUpperCase()})</dd></div>
        <div><dt>Paid</dt><dd>{money(p.capacity.capturedMinor)}</dd></div>
        <div><dt>Already refunded</dt><dd>{money(p.capacity.successfulMinor)}</dd></div>
        <div><dt>Pending at Stripe</dt><dd>{money(p.capacity.pendingMinor)}</dd></div>
        <div><dt>Reserved here</dt><dd>{money(p.capacity.reservedMinor)}</dd></div>
        <div><dt>Still refundable</dt><dd>{money(p.capacity.availableMinor)}</dd></div>
        <div><dt>Reason sent to Stripe</dt><dd>{REFUND_REASON_LABELS[p.providerReason]}</dd></div>
        <div><dt>Why this is an exception</dt><dd>{REFUND_EXCEPTION_LABELS[p.exceptionCategory]}</dd></div>
        <div><dt>Internal reason</dt><dd>{p.internalReason}</dd></div>
        <div><dt>Access policy</dt><dd>{p.policyVersion === "none" ? "None approved" : p.policyVersion}</dd></div>
        <div><dt>Prepared</dt><dd>{formatUtc(item.preparedAt)}; expires {formatUtc(p.expiresAt)}</dd></div>
      </dl>
      {p.effects.map((effect) => (
        <dl key={effect.sourceId} className="admin-collection__facts admin-support__effect"
          data-change={effect.beforeEffective === effect.afterEffective ? "none" : effect.afterEffective === "active" ? "restore" : "remove"}>
          <div><dt>This purchase</dt><dd>{ELIGIBILITY(effect.beforeEligible)} → {ELIGIBILITY(effect.afterEligible)}</dd></div>
          <div><dt>Customer access to the collection</dt><dd>{ACCESS[effect.beforeEffective]} → {ACCESS[effect.afterEffective]}
            {effect.afterEffective === "active" && effect.afterEligible === false ? " (through another purchase or grant)" : ""}</dd></div>
          <div><dt>Recipes covered</dt><dd>{effect.recipeIds.length}</dd></div>
        </dl>
      ))}
      <p className="admin-collection__note">We send no refund email. Stripe may email the customer a refund receipt, depending on the
        account&rsquo;s Stripe email settings.</p>
      {p.blockers.length > 0 ? (
        <div role="status" aria-label="Why this refund is blocked">
          <p>This refund cannot be approved:</p>
          <ul>{p.blockers.map((b) => <li key={b}>{REFUND_BLOCKER_LABELS[b] ?? REPAIR_BLOCKER_LABELS[b] ?? b}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}
