import AdminInspection from "@/components/admin/AdminInspection";
import { getAdminContext, loadAdminRecipe } from "@/lib/admin/context";

export default async function AdminRecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ recipeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { recipeId } = await params;
  const query = await searchParams;
  const base = typeof query.returnTo === "string" ? query.returnTo : "/admin/recipes";
  const separator = base.includes("?") ? "&" : "?";
  const returnTo = `${base}${separator}selected=${encodeURIComponent(recipeId)}`;
  const [context, detail] = await Promise.all([getAdminContext(), loadAdminRecipe(recipeId)]);
  if (!context.ok || !detail.ok) {
    return <p role="status">Recipe unavailable. Try again.</p>;
  }
  return <AdminInspection detail={detail.value} context={context.value} returnTo={returnTo} />;
}
