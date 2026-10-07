import AdminRecipeEditor from "@/components/admin/AdminRecipeEditor";
import { getAdminContext, loadAdminRecipe } from "@/lib/admin/context";
import { startAdminDraft } from "@/lib/admin/recipes";
import { randomUUID } from "node:crypto";

export default async function AdminRecipeEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ recipeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { recipeId } = await params;
  const query = await searchParams;
  const returnTo = typeof query.returnTo === "string" ? query.returnTo : "/admin/recipes";
  const [context, detail] = await Promise.all([getAdminContext(), loadAdminRecipe(recipeId)]);
  if (!context.ok || !detail.ok) {
    return <p role="status">Editor unavailable. Try again.</p>;
  }
  const started = await startAdminDraft(recipeId, randomUUID());
  if (!started.ok) {
    return <p role="status">Draft unavailable ({started.code}). Try again.</p>;
  }
  return (
    <AdminRecipeEditor
      initial={started.value}
      active={detail.value.active}
      base={started.value.base}
      returnTo={returnTo}
    />
  );
}
