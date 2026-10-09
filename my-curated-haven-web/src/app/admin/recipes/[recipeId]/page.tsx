import AdminInspection from "@/components/admin/AdminInspection";
import { getAdminContext, loadAdminRecipe } from "@/lib/admin/context";
import { safeAdminReturn } from "@/lib/admin/query";
import { loadAdminImpact } from "@/lib/admin/recipes";

export default async function AdminRecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ recipeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { recipeId } = await params;
  const query = await searchParams;
  const base = safeAdminReturn(typeof query.returnTo === "string" ? query.returnTo : null);
  const url = new URL(base, "https://admin.local");
  url.searchParams.set("selected", recipeId);
  const returnTo = `${url.pathname}${url.search}`;
  const [context, detail] = await Promise.all([getAdminContext(), loadAdminRecipe(recipeId)]);
  if (!context.ok || !detail.ok) {
    return <p role="status">Recipe unavailable. Try again.</p>;
  }
  const impact = detail.value.publication === "published" && context.value.operator.permissions.includes("recipe.withdraw")
    ? await loadAdminImpact(recipeId) : null;
  return <AdminInspection detail={detail.value} context={context.value} returnTo={returnTo}
    withdrawImpactToken={impact?.ok ? impact.value.impactToken : null} />;
}
