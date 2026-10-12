import Link from "next/link";
import type { Result } from "@/lib/admin/contracts";
import type { Mode, SupportQueuePage } from "@/lib/admin/support/contracts";
import { formatUtc } from "@/lib/admin/collections/labels";
import { ACCESS_CONSEQUENCE_LABELS, QUEUE_REASONS } from "@/lib/admin/support/labels";

/** Items needing attention, from local records. A failed read is unavailable, never "nothing needs attention". */
export default function SupportQueue({ mode, queue }: { mode: Mode; queue: Result<SupportQueuePage> }) {
  return (
    <section aria-labelledby="support-queue" className="admin-collection__section">
      <h2 id="support-queue">Needs attention</h2>
      <nav aria-label="Payment mode" className="admin-support__modes">
        <Link href="/admin/support?mode=live" aria-current={mode === "live" ? "page" : undefined}>Live</Link>
        <Link href="/admin/support?mode=test" aria-current={mode === "test" ? "page" : undefined}>Test</Link>
      </nav>
      {!queue.ok ? <p role="status">The attention list is unavailable ({queue.code}, reference {queue.reference}). This is not an empty list.</p>
        : queue.value.items.length === 0 ? <p>Nothing in {mode} mode needs attention.</p>
        : <ul className="admin-support__queue">
          {queue.value.items.map((item) => {
            const href = item.orderId ? `/admin/support/orders/${item.orderId}` : null;
            const label = QUEUE_REASONS[item.reasonCode] ?? item.reasonCode;
            return <li key={`${item.reasonCode}-${item.caseId ?? item.orderId}-${item.observedAt}`}>
              {href ? <Link href={href}>{label}</Link> : <span>{label}</span>}
              {item.supportReference ? <span> · {item.supportReference}</span> : <span> · Account case</span>}
              {item.deadlineAt ? <span> · respond in Stripe by {formatUtc(item.deadlineAt)}</span> : null}
              <span> · {ACCESS_CONSEQUENCE_LABELS[item.accessConsequence]}</span>
              <span> · observed {formatUtc(item.observedAt)}</span>
            </li>;
          })}
        </ul>}
      {queue.ok && queue.value.nextCursor
        ? <p><Link href={`/admin/support?mode=${mode}&after=${encodeURIComponent(queue.value.nextCursor)}`}>Next page</Link></p> : null}
    </section>
  );
}
