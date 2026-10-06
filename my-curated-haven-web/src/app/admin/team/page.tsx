import AdminTeam from "@/components/admin/AdminTeam";
import { getAdminContext } from "@/lib/admin/context";
import { redirect } from "next/navigation";

export default async function AdminTeamPage() {
  const context = await getAdminContext();
  if (!context.ok) redirect("/sign-in?returnTo=%2Fadmin%2Fteam");
  if (!context.value.operator.permissions.includes("team.manage")) {
    return <p role="status">Team management requires the owner role.</p>;
  }
  return <AdminTeam />;
}
