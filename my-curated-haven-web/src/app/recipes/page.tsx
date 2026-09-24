import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getFreeRecipeCatalog, type RecipeCatalogItem } from "@/lib/data/recipes";
import { getSavedRecipeIds } from "@/lib/data/saved-recipes";
import RecipeCard from "@/components/recipe/RecipeCard";
import RecipeFilters from "@/components/recipe/RecipeFilters";
import RecipeCatalogTracker from "@/components/recipe/RecipeCatalogTracker";
import { parseFilterParams } from "@/lib/recipes/filters";
import { SITE_ORIGIN } from "@/config/site-navigation";

interface RecipesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: RecipesPageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const hasParams = Object.keys(resolvedParams).length > 0;

  return {
    title: "Toddler Recipes | My Curated Haven",
    description:
      "Simple, nourishing toddler recipes tested for tiny hands and busy families. Recipes by Tiny Soho, inside My Curated Haven.",
    alternates: {
      canonical: `${SITE_ORIGIN}/recipes`,
    },
    robots: hasParams
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}

function filterRecipes(
  recipes: RecipeCatalogItem[],
  params: ReturnType<typeof parseFilterParams>
): RecipeCatalogItem[] {
  return recipes.filter((recipe) => {
    // 1. Search query (matches title or public summary)
    if (params.q) {
      const query = params.q.toLowerCase();
      const titleMatch = recipe.title.toLowerCase().includes(query);
      const summaryMatch = recipe.publicSummary.toLowerCase().includes(query);
      if (!titleMatch && !summaryMatch) {
        return false;
      }
    }

    // 2. Meal types (OR matching among selected meal types)
    if (params.meals.length > 0) {
      const recipeMeals = (recipe.mealLabels || []).map((m) => m.toLowerCase());
      const hasAnyMeal = params.meals.some((m) =>
        recipeMeals.includes(m.toLowerCase())
      );
      if (!hasAnyMeal) {
        return false;
      }
    }

    // 3. Dietary requirements (AND matching: recipe must meet all selected diets)
    if (params.diets.length > 0) {
      const recipeDiets = (recipe.dietLabels || []).map((d) => d.toLowerCase());
      const hasAllDiets = params.diets.every((d) =>
        recipeDiets.includes(d.toLowerCase())
      );
      if (!hasAllDiets) {
        return false;
      }
    }

    // 4. Maximum cooking time (unknown total time never qualifies for a quick-time filter)
    if (params.maxTime !== null) {
      if (recipe.totalMinutes === null || recipe.totalMinutes > params.maxTime) {
        return false;
      }
    }

    return true;
  });
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const resolvedParams = await searchParams;

  // Convert raw search params into URLSearchParams object for parsing
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (Array.isArray(value)) {
      value.forEach((v) => urlSearchParams.append(key, v));
    } else if (typeof value === "string") {
      urlSearchParams.append(key, value);
    }
  }

  const filterState = parseFilterParams(urlSearchParams);

  let catalog: RecipeCatalogItem[] = [];
  let fetchError: string | null = null;

  let user = null;
  let savedIds = new Set<string>();

  try {
    const supabase = await createClient();
    catalog = await getFreeRecipeCatalog(supabase);
    user = await getCurrentUser();
    if (user) {
      savedIds = await getSavedRecipeIds(supabase, user.id);
    }
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Unknown error loading recipes";
  }

  const filteredRecipes = filterRecipes(catalog, filterState);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header & Attribution */}
      <header className="mb-8 border-b border-border pb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-action">
          Recipes by Tiny Soho, inside My Curated Haven.
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Simple Toddler Recipes
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-text-muted">
          Tested, wholesome toddler recipes crafted for busy families. Every free recipe
          comes complete with verified ingredients, step-by-step instructions, and storage
          guidance — no sign-up or paywall required.
        </p>
      </header>

      {/* Service Error State */}
      {fetchError ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Recipes Temporarily Unavailable
          </h2>
          <p className="mt-2 text-text-muted">
            We are having trouble loading recipes right now. Please refresh or try again in a few moments.
          </p>
          <div className="mt-4">
            <Link
              href="/recipes"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover"
            >
              Retry
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-8">
          {/* Client-side filter controls with search params sync */}
          <RecipeCatalogTracker totalCount={filteredRecipes.length} />
          <Suspense fallback={<div className="h-14 animate-pulse rounded-xl bg-surface-muted" />}>
            <RecipeFilters totalCount={filteredRecipes.length} />
          </Suspense>

          {/* Recipe Grid or No Matches State */}
          {filteredRecipes.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRecipes.map((recipe, index) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  priority={index === 0}
                  isSaved={savedIds.has(recipe.id)}
                  isAuthenticated={Boolean(user)}
                  showSaveButton={true}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
              <h2 className="text-xl font-bold text-foreground">
                No matching recipes found
              </h2>
              <p className="mt-2 text-text-muted">
                No recipes match your current search and filter selections. Try relaxing your filters or searching for something else.
              </p>
              <div className="mt-4">
                <Link
                  href="/recipes"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-control bg-surface px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-muted"
                >
                  Clear all filters
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
