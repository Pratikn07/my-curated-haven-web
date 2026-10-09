import AdminTeam from "@/components/admin/AdminTeam";
import { getAdminContext } from "@/lib/admin/context";
import { redirect } from "next/navigation";
import { listStaff } from "@/lib/admin/actions";

export default async function AdminTeamPage() {
  const context = await getAdminContext();
  if (!context.ok) redirect("/sign-in?returnTo=%2Fadmin%2Fteam");
  if (!context.value.operator.permissions.includes("team.manage")) {
    return <p role="status">Team management requires the owner role.</p>;
  }
  const staff = await listStaff();
  if (!staff.ok) return <p role="status">Team list unavailable. Try again.</p>;
  return <AdminTeam initialStaff={staff.value} />;
}
