import AdminRecordFrame from "@/components/admin/AdminRecordFrame";
import AdminRecipeDecision from "@/components/admin/AdminRecipeDecision";
import { getAdminContext, loadAdminRecipe, loadAdminRecipeOperations } from "@/lib/admin/context";
import { loadAdminImpact } from "@/lib/admin/recipes";
import { loadRecipeCorrectionImpact } from "@/lib/admin/recipe-corrections";

export default async function AdminRecipePublishPage({ params }: { params: Promise<{ recipeId: string }> }) {
  const { recipeId } = await params;
  const context = await getAdminContext();
  if (!context.ok || context.value.assurance !== "aal2") return <p role="status">Verify your admin access.</p>;
  if (!context.value.operator.permissions.includes("recipe.publish")) return <p role="status">Publication access required.</p>;
  const [detail, impact, receipts, correctionImpact] = await Promise.all([
    loadAdminRecipe(recipeId), loadAdminImpact(recipeId), loadAdminRecipeOperations(recipeId),
    loadRecipeCorrectionImpact(recipeId),
  ]);
  if (!detail.ok) return <p role="status">Recipe publication unavailable. Try again.</p>;
  return <AdminRecordFrame
    title="Review exact effect"
    identifier={detail.value.active.catalog.title}
    liveState={`${detail.value.publication} · version ${detail.value.contentVersion ?? "none"}`}
    workingState={detail.value.working ? `${detail.value.working.state} · revision ${detail.value.working.version}` : "No working revision"}
    checkedAt={new Date(detail.value.checkedAt).toLocaleString("en-US", { timeZone: "UTC", timeZoneName: "short" })}
    actions={<p>Confirm the exact saved revision and its current reach before publishing.</p>}
  >
    <AdminRecipeDecision detail={detail.value} context={context.value} impact={impact} receipts={receipts}
      correctionImpact={correctionImpact} />
  </AdminRecordFrame>;
}
