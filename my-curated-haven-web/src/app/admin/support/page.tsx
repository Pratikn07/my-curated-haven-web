import { getAdminContext } from "@/lib/admin/context";
import { loadSupportQueue } from "@/lib/admin/support/repository";
import { supportActive } from "@/lib/admin/navigation";
import SupportSearch from "@/components/admin/support/SupportSearch";
import SupportQueue from "@/components/admin/support/SupportQueue";

export const dynamic = "force-dynamic";

const CURSOR = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z\|[A-Z_]{1,40}:[0-9a-f-]{36}$/;

export default async function AdminSupportPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const context = await getAdminContext();
  if (!context.ok) return <p role="status">Support is unavailable ({context.code}, reference {context.reference}).</p>;
  if (!supportActive(context.value.operator, context.value.supportStage)) {
    return <p role="status">Support is not available to you (DENIED or switched off).</p>;
  }
  const mode = params.mode === "test" ? "test" : "live";
  const after = typeof params.after === "string" && CURSOR.test(params.after) ? params.after : null;
  const queue = await loadSupportQueue(mode, after);
  return (
    <div className="admin-support">
      <header className="admin-library__header">
        <h1>Support</h1>
        <p>Look up a customer or order exactly, and see what needs attention. Reading here never changes anything.</p>
      </header>
      <SupportSearch canInspectProvider={context.value.operator.permissions.includes("support.provider.inspect")} />
      <SupportQueue mode={mode} queue={queue} />
    </div>
  );
}
