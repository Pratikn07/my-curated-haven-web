import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getSavedRecipes } from "@/lib/data/saved-recipes";
import RecipeCard from "@/components/recipe/RecipeCard";
import SaveRecipeButton from "@/components/recipe/SaveRecipeButton";
import { Bookmark, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Saved Recipes",
  description: "View and manage your private bookmarked recipes.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SavedRecipesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?returnTo=/account/saved-recipes");
  }

  const supabase = await createClient();
  const result = await getSavedRecipes(supabase, user.id);

  if (result.status !== "ok") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Saved Recipes Unavailable
          </h1>
          <p className="mt-2 text-text-muted">
            We encountered a problem loading your saved recipes. Please try again.
          </p>
          <div className="mt-6">
            <Link
              href="/account/saved-recipes"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover transition-colors"
            >
              Retry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { items } = result;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to Account / Header */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          href="/account"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Account</span>
        </Link>
      </nav>

      <header className="border-b border-border pb-6 mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Saved Recipes
          </h1>
          <p className="mt-1 text-base text-text-muted">
            Your private toddler recipe bookmarks, accessible across all devices.
          </p>
        </div>
        <span className="text-sm font-medium text-text-muted">
          {items.length} {items.length === 1 ? "recipe" : "recipes"} saved
        </span>
      </header>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center sm:p-12">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-action/10 text-action">
            <Bookmark className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No saved recipes yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Explore our wholesome toddler recipes and bookmark your family&apos;s
            favorites for easy cooking anytime.
          </p>
          <div className="mt-6">
            <Link
              href="/recipes"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover transition-colors"
            >
              Browse Free Recipes
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) =>
            item.isAvailable && item.catalog ? (
              <div key={item.id} className="relative flex flex-col">
                <RecipeCard recipe={item.catalog} />
                <div className="mt-2 flex justify-end">
                  <SaveRecipeButton
                    recipeId={item.recipeId}
                    recipeSlug={item.catalog.slug}
                    initialIsSaved={true}
                    isAuthenticated={true}
                  />
                </div>
              </div>
            ) : (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-[var(--radius-card)] border border-dashed border-border bg-surface p-6"
              >
                <div>
                  <span className="inline-block rounded-md bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text-muted">
                    Unavailable
                  </span>
                  <h3 className="mt-3 text-base font-bold text-foreground">
                    Recipe no longer available
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    This recipe was updated or withdrawn from the public catalog.
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <SaveRecipeButton
                    recipeId={item.recipeId}
                    recipeSlug="unavailable"
                    initialIsSaved={true}
                    isAuthenticated={true}
                  />
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
