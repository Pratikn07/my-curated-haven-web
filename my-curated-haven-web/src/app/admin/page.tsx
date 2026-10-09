import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/context";
import { loadAdminHome } from "@/lib/admin/home/repository";
import { homeActive } from "@/lib/admin/navigation";
import AdminHome from "@/components/admin/AdminHome";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const context = await getAdminContext();
  // Home needs both publishing domains switched on; until then /admin keeps opening Recipes.
  if (!context.ok || !homeActive(context.value.collectionStage)) redirect("/admin/recipes");
  return <AdminHome home={await loadAdminHome(context.value)} />;
}
