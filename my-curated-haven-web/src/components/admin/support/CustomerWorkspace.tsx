import Link from "next/link";
import type { CustomerSupportDto, SupportRead } from "@/lib/admin/support/contracts";
import { formatUtc } from "@/lib/admin/collections/labels";
import { CASE_STATE_LABELS } from "@/lib/admin/support/labels";

/** A customer's orders and cases. A closed account shows its orders without an email. */
export default function CustomerWorkspace({ read }: { read: SupportRead<CustomerSupportDto> }) {
  const customer = read.value;
  return (
    <article className="admin-record">
      <header className="admin-record__header">
        <p className="admin-record__eyebrow">Customer support</p>
        <h1>{customer.email ?? "Closed account"}</h1>
        <dl className="admin-record__states">
          <div><dt>Email</dt><dd>{customer.email === null ? "None (account closed)" : customer.confirmed ? "Confirmed" : "Not confirmed"}</dd></div>
          <div><dt>Account</dt><dd>{customer.available ? "Available" : "Not available"}</dd></div>
        </dl>
        <p className="admin-record__checked">Checked at {formatUtc(read.checkedAt)}</p>
      </header>
      <section aria-labelledby="customer-orders" className="admin-collection__section">
        <h2 id="customer-orders">Orders</h2>
        {customer.orders.length === 0 ? <p>No orders.</p>
          : <ul className="admin-support__orders">
            {customer.orders.map((order) => <li key={order.orderId}>
              <Link href={`/admin/support/orders/${order.orderId}`}>{order.supportReference}</Link>
              <span> · {order.mode === "live" ? "Live" : "Test"}</span>
            </li>)}
          </ul>}
        {customer.nextCursor ? <p><Link href={`?after=${encodeURIComponent(customer.nextCursor)}`}>Older orders</Link></p> : null}
      </section>
      <section aria-labelledby="customer-cases" className="admin-collection__section">
        <h2 id="customer-cases">Cases</h2>
        {customer.cases.length === 0 ? <p>No cases.</p>
          : <ul>{customer.cases.map((c) => <li key={c.id}>{CASE_STATE_LABELS[c.state]}
            {c.orderId ? <> · <Link href={`/admin/support/orders/${c.orderId}`}>open the order</Link></> : " · about the account"}</li>)}</ul>}
      </section>
      <p><Link href="/admin/support">Back to support</Link></p>
    </article>
  );
}
