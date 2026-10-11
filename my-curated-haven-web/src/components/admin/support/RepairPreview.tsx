import type { ProposalListItem, RepairEffect } from "@/lib/admin/support/contracts";
import { formatUtc } from "@/lib/admin/collections/labels";
import { PROPOSAL_STATE_LABELS, REPAIR_BLOCKER_LABELS, REPAIR_KIND_LABELS } from "@/lib/admin/support/labels";

const ELIGIBILITY = (value: boolean | null) => (value === null ? "No purchase source" : value ? "Eligible" : "Not eligible");
const ACCESS = { active: "Has access", denied: "No access" } as const;

function change(effect: RepairEffect): string {
  if (effect.beforeEffective === effect.afterEffective) return "No change in access";
  return effect.afterEffective === "active" ? "Restores access" : "Removes access";
}

/**
 * Exactly what a prepared repair would do, as the database worked it out: the order and evidence it is bound to,
 * the purchase source and the customer's access before and after, any email, and why it may be blocked. Removal is
 * shown as plainly as restoration.
 */
export default function RepairPreview({ item, supportReference }: { item: ProposalListItem; supportReference: string }) {
  const p = item.proposal;
  return (
    <div className="admin-support__repair" aria-label="Repair preview" role="group">
      <p><strong>{REPAIR_KIND_LABELS[p.kind]}</strong> · {PROPOSAL_STATE_LABELS[item.state]}
        {item.approval ? ` by the owner at ${formatUtc(item.approval.approvedAt)}` : ""}</p>
      <dl className="admin-collection__facts">
        <div><dt>Order</dt><dd>{supportReference}</dd></div>
        <div><dt>Stripe evidence</dt><dd>{p.binding.mode === "live" ? "Live" : "Test"} · {p.binding.accountId} · fingerprint {p.materialDigest.slice(0, 12)}</dd></div>
        <div><dt>Access policy</dt><dd>{p.policyVersion === "none" ? "None approved" : p.policyVersion}</dd></div>
        <div><dt>Reason</dt><dd>{p.reason || "Removed after the retention period"}</dd></div>
        <div><dt>Prepared</dt><dd>{formatUtc(item.preparedAt)}; expires {formatUtc(p.expiresAt)}</dd></div>
      </dl>
      {p.effects.map((effect) => (
        <dl key={effect.sourceId} className="admin-collection__facts admin-support__effect"
          data-change={effect.beforeEffective === effect.afterEffective ? "none" : effect.afterEffective === "active" ? "restore" : "remove"}>
          <div><dt>Effect</dt><dd>{change(effect)}</dd></div>
          <div><dt>Purchase source</dt><dd>{ELIGIBILITY(effect.beforeEligible)} → {ELIGIBILITY(effect.afterEligible)}</dd></div>
          <div><dt>Customer access</dt><dd>{ACCESS[effect.beforeEffective]} → {ACCESS[effect.afterEffective]}</dd></div>
          <div><dt>Recipes covered</dt><dd>{effect.recipeIds.length}</dd></div>
          <div><dt>Email</dt><dd>{effect.notification === "purchase_confirmation" ? "Purchase confirmation" : "None"}</dd></div>
        </dl>
      ))}
      {p.blockers.length > 0 ? (
        <div role="status" aria-label="Why this repair is blocked">
          <p>This repair cannot be approved:</p>
          <ul>{p.blockers.map((b) => <li key={b}>{REPAIR_BLOCKER_LABELS[b] ?? b}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}
