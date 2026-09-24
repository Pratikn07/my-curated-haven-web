import Link from "next/link";
import { HOMEPAGE_RECIPE_STATE, projectHomepageRecipes } from "@/config/homepage-content";
import { getFreeRecipeSlots, type FreeSlotItem } from "@/lib/data/recipes";
import { createClient } from "@/lib/supabase/server";
import Container from "@/components/layout/Container";
import RecipeCard from "@/components/recipe/RecipeCard";

export default async function HomeRecipes() {
  const state = HOMEPAGE_RECIPE_STATE;
  let recipes: FreeSlotItem["recipe"][] = [];
  let unavailable = false;

  if (state.mode !== "preparation") {
    try {
      const supabase = await createClient();
      const slots = await getFreeRecipeSlots(supabase);
      recipes = projectHomepageRecipes(state, slots).map(({ recipe }) => recipe);
    } catch {
      unavailable = true;
    }
  }

  return (
    <section id="recipes" aria-labelledby="recipes-title" className="py-14 sm:py-20">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="font-semibold text-action">Recipes by Tiny Soho, inside My Curated Haven.</p>
            <h2 id="recipes-title" className="mt-3 max-w-xl text-3xl font-semibold sm:text-4xl">
              A simple place to start.
            </h2>
          </div>
          <p className="max-w-[65ch] text-lg text-text-muted">
            Toddler recipes are the first part of the website we are preparing. They will be easy to find and read, with the details families need in one place.
          </p>
        </div>

        {state.mode === "preparation" ? (
          <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface-muted p-6 sm:p-8">
            <h3 className="text-xl font-semibold">The recipe collection is in preparation</h3>
            <p className="mt-2 max-w-[65ch] text-text-muted">
              We&apos;re preparing three complete free recipes for this website. When ready, each will include ingredients, clear steps and storage guidance.
            </p>
            <p className="mt-4 text-sm font-semibold text-accent-strong">Nothing on this site is for sale today.</p>
          </div>
        ) : unavailable ? (
          <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface-muted p-6 sm:p-8" role="status">
            <h3 className="text-xl font-semibold">Recipes are temporarily unavailable</h3>
            <p className="mt-2 text-text-muted">
              We couldn&apos;t load the current free recipe list. Please try the recipe index again in a little while.
            </p>
            <Link href="/recipes" className="mt-4 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4">
              Try the recipe index
            </Link>
          </div>
        ) : recipes.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe, index) => (
              <RecipeCard key={recipe.id} recipe={recipe} priority={index === 0} showSaveButton={false} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface-muted p-6 sm:p-8" role="status">
            <h3 className="text-xl font-semibold">The free recipe list is being confirmed</h3>
            <p className="mt-2 text-text-muted">
              No approved free recipes are available to show here yet. The recipe index has the current public listing.
            </p>
            <Link href="/recipes" className="mt-4 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4">
              Visit Recipes
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
