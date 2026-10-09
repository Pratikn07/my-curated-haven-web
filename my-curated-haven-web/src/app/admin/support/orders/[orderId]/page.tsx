import { getAdminContext } from "@/lib/admin/context";
import { loadSupportCases, loadSupportOrder } from "@/lib/admin/support/repository";
import OrderWorkspace from "@/components/admin/support/OrderWorkspace";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function SupportOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!UUID.test(orderId)) return <p role="status">That is not an order id.</p>;
  const [context, read, cases] = await Promise.all([getAdminContext(), loadSupportOrder(orderId), loadSupportCases(orderId, null)]);
  if (!read.ok) {
    return <p role="status">This order is unavailable ({read.code}, reference {read.reference}).</p>;
  }
  const canWriteCases = context.ok && context.value.operator.permissions.includes("support.case.write");
  return <OrderWorkspace read={read.value} cases={cases} canWriteCases={canWriteCases} />;
}
