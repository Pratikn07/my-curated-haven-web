import Link from "next/link";
import type { Result } from "@/lib/admin/contracts";
import type { OrderCasesPage, OrderSupportDto, SupportRead } from "@/lib/admin/support/contracts";
import AdminRecordFrame from "@/components/admin/AdminRecordFrame";
import { formatUtc } from "@/lib/admin/collections/labels";
import { ACCESS_LABELS, ACCOUNT_LABELS, ATTEMPT_LABELS, PAYMENT_LABELS, formatMoney } from "@/lib/admin/support/labels";
import AccessExplanation from "./AccessExplanation";
import SupportCases from "./SupportCases";
import SupportTimeline from "./SupportTimeline";

/**
 * One order as support sees it. The seven states are separate on purpose: a paid order can still lack access, and
 * an unavailable fact is shown as unavailable, never as "none" or "no".
 */
export default function OrderWorkspace({ read, cases, canWriteCases }: {
  read: SupportRead<OrderSupportDto>; cases: Result<OrderCasesPage>; canWriteCases: boolean;
}) {
  const order = read.value;
  const refunds = order.refunds.length === 0 ? "None recorded"
    : order.refunds.map((r) => `${formatMoney(r.amountMinor, r.currency)} ${r.status.replace("_", " ")}`).join(", ");
  const disputes = order.disputes.length === 0 ? "None recorded"
    : order.disputes.map((d) => `${d.classification === "inquiry" ? "Inquiry" : d.classification === "formal" ? "Dispute" : "Unclassified"} (${d.status.replaceAll("_", " ")})`).join(", ");
  const sources = order.access === null ? "Unavailable" : order.access.sources.length === 0 ? "None recorded"
    : order.access.sources.map((s) => (s.eligible ? "Eligible" : "Not eligible")).join(", ");
  const axes = [
    { label: "Checkout", value: ATTEMPT_LABELS[order.attemptState] },
    { label: "Payment", value: order.paymentState === "paid"
      ? `${PAYMENT_LABELS.paid}: ${formatMoney(order.capturedMinor, order.currency)}` : PAYMENT_LABELS[order.paymentState] },
    { label: "Refunds", value: refunds },
    { label: "Disputes", value: disputes },
    { label: "Purchase sources", value: sources },
    { label: "Access to the collection", value: order.access ? ACCESS_LABELS[order.access.effective] : ACCESS_LABELS.unavailable },
    { label: "Account", value: ACCOUNT_LABELS[order.accountState] },
  ];
  const historical = order.historical;
  return (
    <AdminRecordFrame eyebrow="Customer support" title={`Order ${order.supportReference}`}
      identifier={order.currentTitle ? `${order.currentTitle} (today's title)` : undefined}
      liveState={PAYMENT_LABELS[order.paymentState]} workingState={order.access ? ACCESS_LABELS[order.access.effective] : "Unavailable"}
      checkedAt={formatUtc(read.checkedAt)}
      actions={<>
        <p>Read only. Repairs arrive once diagnosis is switched on.</p>
        {order.userId ? <Link href={`/admin/support/customers/${order.userId}`}>Open the customer</Link>
          : <Link href={`/admin/support/customers/${order.ownerPrincipal}`}>Open the closed account</Link>}
        <Link href="/admin/support">Back to support</Link>
      </>}>
      <section aria-labelledby="support-states" className="admin-collection__section">
        <h2 id="support-states">Where this order stands</h2>
        <dl className="admin-collection__facts admin-support__axes">
          {axes.map((axis) => <div key={axis.label}><dt>{axis.label}</dt><dd>{axis.value}</dd></div>)}
        </dl>
        <p className="admin-collection__note">Stripe last confirmed: {order.providerVerifiedAt ? formatUtc(order.providerVerifiedAt) : "never"}.
          {" "}Read from our records at {formatUtc(read.checkedAt)}.</p>
      </section>
      <section aria-labelledby="support-terms" className="admin-collection__section">
        <h2 id="support-terms">What was bought</h2>
        {!read.complete ? <p role="status">Some original terms were not recorded with this order; they are shown as unknown, not filled in from today&rsquo;s offer.</p> : null}
        <dl className="admin-collection__facts">
          <div><dt>Price at purchase</dt><dd>{formatMoney(historical.expectedCapturedMinor, historical.currency)}</dd></div>
          <div><dt>Refund policy at purchase</dt><dd>{historical.refundPolicyVersion ?? "Unknown"}</dd></div>
          <div><dt>Access policy at purchase</dt><dd>{historical.accessPolicyVersion ?? "Unknown"}</dd></div>
          <div><dt>Title at purchase</dt><dd>{order.historicalTitle ?? "Not recorded"}</dd></div>
          <div><dt>Recipe list</dt><dd>{historical.manifestHash ? `Recorded (${historical.manifestHash.slice(0, 8)})` : "Unknown"}</dd></div>
        </dl>
      </section>
      <AccessExplanation access={order.access} />
      <SupportCases orderId={order.orderId} cases={cases} canWrite={canWriteCases} />
      {/* Keyed by the newest event, so a refresh after a case change shows the new activity. */}
      <SupportTimeline key={order.history.events[0]?.id ?? "empty"} orderId={order.orderId} initial={order.history} />
    </AdminRecordFrame>
  );
}
