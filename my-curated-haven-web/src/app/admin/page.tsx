import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/context";
import { loadAdminHome } from "@/lib/admin/home/repository";
import { adminLanding } from "@/lib/admin/navigation";
import AdminHome from "@/components/admin/AdminHome";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const context = await getAdminContext();
  // Home needs both publishing domains switched on; until then /admin opens Recipes, or Support for support-only staff.
  if (!context.ok) redirect("/admin/recipes");
  const landing = adminLanding(context.value.operator, context.value.collectionStage, context.value.supportStage);
  if (landing !== "/admin") redirect(landing);
  return <AdminHome home={await loadAdminHome(context.value)} />;
}
