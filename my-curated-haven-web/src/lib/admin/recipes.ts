import "server-only";
import type { LibraryQuery } from "./contracts";
import { loadAdminHistory, loadAdminLibrary, loadAdminRecipe } from "./context";

export { loadAdminHistory, loadAdminLibrary, loadAdminRecipe };

export async function loadAdminRecipePage(recipeId: string, query: LibraryQuery | null) {
  const detail = await loadAdminRecipe(recipeId);
  if (!detail.ok) return { detail, library: null };
  if (!query) return { detail, library: null };
  const library = await loadAdminLibrary(query);
  return { detail, library };
}
