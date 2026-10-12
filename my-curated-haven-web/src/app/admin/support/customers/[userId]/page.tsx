import { loadSupportCustomer } from "@/lib/admin/support/repository";
import CustomerWorkspace from "@/components/admin/support/CustomerWorkspace";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CURSOR = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z\|[0-9a-f-]{36}$/;

export default async function SupportCustomerPage({ params, searchParams }: {
  params: Promise<{ userId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await params;
  const { after } = await searchParams;
  if (!UUID.test(userId)) return <p role="status">That is not an account id.</p>;
  const read = await loadSupportCustomer(userId, typeof after === "string" && CURSOR.test(after) ? after : null);
  if (!read.ok) return <p role="status">This customer is unavailable ({read.code}, reference {read.reference}).</p>;
  return <CustomerWorkspace read={read.value} />;
}
