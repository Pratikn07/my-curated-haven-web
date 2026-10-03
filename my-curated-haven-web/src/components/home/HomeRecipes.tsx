import Link from "next/link";
import Container from "@/components/layout/Container";
import RecipeCard from "@/components/recipe/RecipeCard";
import TrackedHomepageLink from "@/components/home/TrackedHomepageLink";
import { HOMEPAGE_RECIPE_STATE } from "@/config/homepage-content";
import type { HomepageRecipes } from "@/lib/data/load-homepage-recipes";

export default function HomeRecipes({ data }: { data: HomepageRecipes }) {
  return (
    <section id="recipes" aria-labelledby="recipes-title" className="bg-[var(--room-kitchen-wash)] py-14 sm:py-20">
      <Container>
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-6">
          <div>
            <p className="text-sm font-semibold tracking-wide text-action uppercase">The Kitchen · Recipes by Tiny Soho</p>
            <h2 id="recipes-title" className="mt-3 max-w-xl font-display text-[2rem] leading-[1.1] font-normal sm:text-[2.6rem]">
              Pick one. Keep it simple.
            </h2>
          </div>
          <p className="max-w-[65ch] text-lg text-text-muted">
            {data.status === "preparation"
              ? "Toddler recipes are the first room we are opening. They will be easy to find and read, with the details families need in one place."
              : "Free toddler recipes to start with. Each one has ingredients, clear steps and how to store leftovers, and you can read or print it without an account."}
          </p>
        </div>

        {data.status === "preparation" ? (
          <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8">
            <h3 className="text-xl font-semibold">The recipes are being prepared</h3>
            <p className="mt-2 max-w-[65ch] text-text-muted">
              We&apos;re preparing three complete free recipes. When ready, each will include ingredients, clear steps and storage guidance.
            </p>
          </div>
        ) : data.status === "unavailable" ? (
          <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8" role="status">
            <h3 className="text-xl font-semibold">Recipes are temporarily unavailable</h3>
            <p className="mt-2 text-text-muted">
              We couldn&apos;t load the current free recipe list. Please try the recipe index again in a little while.
            </p>
            <Link href="/recipes" className="mt-4 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4">
              Try the recipe index
            </Link>
          </div>
        ) : data.recipes.length > 0 ? (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} showSaveButton={false} />
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <p className="font-display text-lg text-text-muted italic">
                If half ends up on the floor, the other half still counts.
              </p>
              <TrackedHomepageLink
                href="/recipes"
                tracking={{
                  type: "cta",
                  destination: "recipes_index",
                  placement: "final",
                  presentationState: HOMEPAGE_RECIPE_STATE.mode,
                }}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action px-5 py-3 font-semibold text-action-foreground hover:bg-action-hover"
              >
                See all recipes
              </TrackedHomepageLink>
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8" role="status">
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
