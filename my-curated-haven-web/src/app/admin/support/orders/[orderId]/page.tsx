import { getAdminContext } from "@/lib/admin/context";
import { loadSupportCases, loadSupportOrder, loadSupportProposals } from "@/lib/admin/support/repository";
import { loadSupportRefunds } from "@/lib/admin/support/refunds/repository";
import { loadLatestObservation } from "@/lib/admin/support/diagnosis";
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
  // Provider checks need the inspect permission and the diagnosis stage; the database checks both again.
  const canInspect = context.ok && context.value.operator.permissions.includes("support.provider.inspect")
    && (context.value.supportStage === "diagnosis" || context.value.supportStage === "repair");
  const diagnosis = canInspect ? await loadLatestObservation(orderId) : null;
  // Repairs need the repair stage and a repair permission; each command checks both again.
  const permissions = context.ok ? context.value.operator.permissions : [];
  const can = { prepare: permissions.includes("support.repair.prepare"), approve: permissions.includes("support.repair.approve"),
    execute: permissions.includes("support.repair.execute") };
  const repairOn = context.ok && context.value.supportStage === "repair" && (can.prepare || can.approve || can.execute);
  const repair = repairOn ? { proposals: await loadSupportProposals(orderId), can } : null;
  // Refunds are the owner's alone, prepared from a provider check and sent only at the repair stage.
  const refundOn = canInspect && context.value.operator.roles.includes("owner") && permissions.includes("support.refund.prepare");
  const refund = refundOn ? { list: await loadSupportRefunds(orderId), canSend: context.value.supportStage === "repair"
    && permissions.includes("support.refund.approve") && permissions.includes("support.refund.execute") } : null;
  return <OrderWorkspace read={read.value} cases={cases} canWriteCases={canWriteCases} diagnosis={diagnosis} repair={repair}
    refund={refund} />;
}
