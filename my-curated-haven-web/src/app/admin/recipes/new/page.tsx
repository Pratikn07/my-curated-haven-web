import Link from "next/link";
import RecipeEditor from "@/components/admin/RecipeEditor";
import type { AdminRecipeInput } from "@/lib/admin/recipe-input";
import { requireAdminPage } from "@/lib/admin/session";

const EMPTY_RECIPE: AdminRecipeInput = {
  title: "",
  slug: "",
  summary: "",
  imageUrl: "",
  totalMinutes: null,
  mealLabels: [],
  dietLabels: [],
  yieldText: "",
  ingredients: [],
  steps: [],
  tips: null,
  storageNotes: null,
  allergenReviewState: "unknown",
  allergens: [],
};

export default async function NewRecipePage() {
  await requireAdminPage("/admin/recipes/new");

  return (
    <div className="grid gap-6">
      <header>
        <Link href="/admin/recipes" className="text-sm font-semibold text-action underline underline-offset-4">
          All recipes
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">New recipe</h1>
        <p className="mt-1 text-text-muted">It stays a draft, hidden from parents, until you publish it.</p>
      </header>
      <RecipeEditor recipeId={null} version={null} initial={EMPTY_RECIPE} isLive={false} slugLocked={false} />
    </div>
  );
}
