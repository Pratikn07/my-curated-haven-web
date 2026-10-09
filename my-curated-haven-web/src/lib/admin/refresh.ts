import "server-only";
import { revalidatePath } from "next/cache";
import type { MutationReceipt, RefreshReceipt, Result } from "./contracts";
import { getAdminContext } from "./context";
import { loadAdminRecipe, loadAdminRecipeOperations } from "./context";
import { recipeCollectionPaths } from "./recipe-corrections";
import { settleCommittedRefresh } from "./refresh-result";

function reference(): string {
  return `admin-refresh-${Math.random().toString(36).slice(2, 10)}`;
}

export async function refreshAdminRecipe(
  receipt: MutationReceipt,
  options?: { slug?: string; campaignSlugs?: string[] }
): Promise<RefreshReceipt> {
  return settleCommittedRefresh(receipt.operationId, async () => {
    revalidatePath("/recipes");
    revalidatePath("/admin/recipes");
    revalidatePath(`/admin/recipes/${receipt.recipeId}`);
    if (options?.slug) revalidatePath(`/recipes/${options.slug}`);
    for (const slug of options?.campaignSlugs ?? []) {
      revalidatePath(`/stories/${slug}`);
    }
    // Collection pages show recipe facts (title, time, image), so they refresh with the recipe. Without the
    // commerce database to say which ones, every collection page refreshes.
    const collectionPaths = await recipeCollectionPaths(receipt.recipeId);
    if (collectionPaths === null) revalidatePath("/collections", "layout");
    else for (const path of collectionPaths) revalidatePath(path);
  });
}

export async function retryAdminRefresh(
  operationId: string,
  recipeId: string
): Promise<Result<RefreshReceipt>> {
  const context = await getAdminContext();
  if (!context.ok) return context;
  if (context.value.assurance !== "aal2") {
    return { ok: false, code: "MFA_REQUIRED", reference: reference() };
  }
  const receipts = await loadAdminRecipeOperations(recipeId);
  if (!receipts.ok) return receipts;
  if (!receipts.value.some((receipt) => receipt.operationId === operationId)) {
    return { ok: false, code: "DENIED", reference: reference() };
  }
  const detail = await loadAdminRecipe(recipeId);
  if (!detail.ok) return detail;
  // Retry revalidates displays only; it never calls a mutation RPC again.
  return {
    ok: true,
    value: await refreshAdminRecipe(
      {
        operationId,
        recipeId,
        revisionId: null,
        version: 0,
        digest: "",
        noChange: false,
        committedAt: "",
        publication: detail.value.publication,
      },
      { slug: detail.value.active.slug }
    ),
  };
}
