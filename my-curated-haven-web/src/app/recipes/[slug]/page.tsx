import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getRecipeBySlug,
  getPublishedCatalog,
  type RecipeIngredient,
  type RecipeCatalogItem,
} from "@/lib/data/recipes";
import RecipeCard from "@/components/recipe/RecipeCard";
import PrintButton from "@/components/recipe/PrintButton";
import Badge from "@/components/ui/Badge";
import { SITE_ORIGIN } from "@/config/site-navigation";

const getCachedRecipe = cache(async (slug: string) => {
  const supabase = await createClient();
  return getRecipeBySlug(supabase, slug);
});

const getCachedCatalog = cache(async () => {
  const supabase = await createClient();
  return getPublishedCatalog(supabase);
});

interface RecipeDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: RecipeDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCachedRecipe(slug);

  if (result.status !== "ok") {
    return {
      title: "Recipe Not Found | My Curated Haven",
      robots: { index: false, follow: false },
    };
  }

  const { catalog } = result.recipe;
  const title = `${catalog.title} | Toddler Recipe | My Curated Haven`;
  const description = catalog.publicSummary;
  const canonicalUrl = `${SITE_ORIGIN}/recipes/${catalog.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      images: catalog.previewImagePath
        ? [{ url: catalog.previewImagePath, alt: catalog.title }]
        : [],
    },
  };
}

function normalizeInstructions(rawInstructions: unknown): { step: number; text: string }[] {
  if (!Array.isArray(rawInstructions)) return [];
  return rawInstructions.map((item, index) => {
    if (typeof item === "string") {
      return { step: index + 1, text: item };
    }
    if (typeof item === "object" && item !== null && "text" in item) {
      const typed = item as { step?: unknown; text?: unknown };
      return {
        step: typeof typed.step === "number" ? typed.step : index + 1,
        text: String(typed.text),
      };
    }
    return { step: index + 1, text: String(item) };
  });
}

function formatIngredient(ingredient: RecipeIngredient | string): string {
  if (typeof ingredient === "string") return ingredient;
  const parts: string[] = [];
  if (ingredient.amount) parts.push(ingredient.amount);
  if (ingredient.unit) parts.push(ingredient.unit);
  if (ingredient.item) parts.push(ingredient.item);
  return parts.join(" ");
}

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { slug } = await params;
  const result = await getCachedRecipe(slug);

  if (result.status === "not_found" || result.status === "access_denied") {
    notFound();
  }

  if (result.status === "error") {
    throw new Error(result.message);
  }

  const { catalog, body } = result.recipe;
  const instructions = normalizeInstructions(body.instructions);
  const canonicalUrl = `${SITE_ORIGIN}/recipes/${catalog.slug}`;

  // Fetch sibling free recipes for discovery section
  let otherRecipes: RecipeCatalogItem[] = [];
  try {
    const allPublished = await getCachedCatalog();
    otherRecipes = allPublished.filter((r) => r.slug !== catalog.slug).slice(0, 2);
  } catch {
    // Non-critical if recommendation fails
  }

  // Schema.org structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: catalog.title,
    description: catalog.publicSummary,
    image: catalog.previewImagePath ? [catalog.previewImagePath] : [],
    recipeYield: body.yield,
    recipeIngredient: body.ingredients.map(formatIngredient),
    recipeInstructions: instructions.map((step) => ({
      "@type": "HowToStep",
      position: step.step,
      text: step.text,
    })),
    ...(catalog.totalMinutes
      ? { totalTime: `PT${catalog.totalMinutes}M` }
      : {}),
    author: {
      "@type": "Organization",
      name: "Tiny Soho",
    },
    publisher: {
      "@type": "Organization",
      name: "My Curated Haven",
      url: SITE_ORIGIN,
    },
    mainEntityOfPage: canonicalUrl,
  };

  return (
    <div className="recipe-print-root mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Schema.org Recipe Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="no-print mb-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <li>
            <Link href="/" className="hover:text-foreground hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/recipes" className="hover:text-foreground hover:underline">
              Recipes
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="break-words font-medium text-foreground">
            {catalog.title}
          </li>
        </ol>
      </nav>

      {/* Header and Hero Attribution */}
      <header className="mb-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-action">
          Recipes by Tiny Soho, inside My Curated Haven.
        </p>
        <h1 className="break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {catalog.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-text-muted">
          {catalog.publicSummary}
        </p>

        {/* Quick Recipe Info Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                Total Time
              </span>
              <span className="text-base font-semibold text-foreground">
                {catalog.totalMinutes ? `${catalog.totalMinutes} min` : "Not reviewed"}
              </span>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                Yield
              </span>
              <span className="text-base font-semibold text-foreground">
                {body.yield || "Toddler portions"}
              </span>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                Access
              </span>
              <span className="text-base font-semibold text-action">
                Free Toddler Recipe
              </span>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 pt-2 sm:ml-auto sm:w-auto sm:pt-0">
            <a
              href="#recipe-content"
              className="no-print inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-border-control bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2 sm:flex-initial"
            >
              Jump to recipe
            </a>
            <div className="flex-1 sm:flex-initial">
              <PrintButton />
            </div>
          </div>
        </div>

        {/* Dietary and Meal Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {catalog.mealLabels?.map((meal) => (
            <Badge key={meal} variant="primary">
              {meal}
            </Badge>
          ))}
          {catalog.dietLabels?.map((diet) => (
            <Badge key={diet} variant="outline">
              {diet}
            </Badge>
          ))}
        </div>
      </header>

      {/* Hero Image */}
      {catalog.previewImagePath ? (
        <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-muted">
          <Image
            src={catalog.previewImagePath}
            alt={catalog.title}
            fill
            sizes="(min-width: 1024px) 896px, 100vw"
            priority
            className="recipe-print-image object-cover"
          />
        </div>
      ) : null}

      {/* Main Recipe Content Anchor */}
      <div id="recipe-content" className="grid w-full min-w-0 gap-8 [overflow-wrap:anywhere]">
        {/* Ingredients Section */}
        <section aria-labelledby="ingredients-heading" className="w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-8">
          <h2 id="ingredients-heading" className="text-2xl font-bold text-foreground">
            Ingredients
          </h2>
          <ul className="mt-4 divide-y divide-border text-base text-foreground">
            {body.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-3 py-2.5">
                <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-action" aria-hidden="true" />
                <span className="leading-relaxed [overflow-wrap:anywhere]">{formatIngredient(ing)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Instructions Section */}
        <section aria-labelledby="instructions-heading" className="w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-8">
          <h2 id="instructions-heading" className="text-2xl font-bold text-foreground">
            Method & Instructions
          </h2>
          <ol className="mt-4 grid gap-4 text-base text-foreground">
            {instructions.map((step) => (
              <li key={step.step} className="flex min-w-0 gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-bold text-foreground">
                  {step.step}
                </span>
                <p className="min-w-0 flex-1 pt-0.5 leading-relaxed [overflow-wrap:anywhere]">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Allergens Information */}
        <section aria-labelledby="allergens-heading" className="w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-8">
          <h2 id="allergens-heading" className="text-xl font-bold text-foreground">
            Allergen Information
          </h2>
          <div className="mt-3 text-sm leading-relaxed text-text-muted">
            {body.allergenReviewState === "reviewed_listed" && body.allergens?.length ? (
              <div>
                <p className="font-semibold text-foreground">Contains reviewed allergens:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {body.allergens.map((allergen) => (
                    <Badge key={allergen} variant="collection">
                      {allergen}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : body.allergenReviewState === "reviewed_no_allergens" ? (
              <p className="font-medium text-action">
                Reviewed: Does not contain major common allergens (dairy, egg, nuts, soy, wheat). Always check your individual ingredients.
              </p>
            ) : (
              <p className="text-text-muted">
                Allergen information has not been formally reviewed for this recipe. Please check all ingredient packaging carefully.
              </p>
            )}
          </div>
        </section>

        {/* Storage Guidance and Notes */}
        {(body.storageNotes || body.reviewedNotes) && (
          <section aria-labelledby="storage-notes-heading" className="w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-8">
            <h2 id="storage-notes-heading" className="text-xl font-bold text-foreground">
              Storage & Preparation Notes
            </h2>
            <div className="mt-3 grid gap-4 text-sm leading-relaxed text-text-muted">
              {body.storageNotes && (
                <div>
                  <h3 className="font-semibold text-foreground">Storage Instructions:</h3>
                  <p className="mt-1 whitespace-pre-line break-words">{body.storageNotes}</p>
                </div>
              )}
              {body.reviewedNotes && (
                <div>
                  <h3 className="font-semibold text-foreground">Helpful Toddler Feeding Tips:</h3>
                  <p className="mt-1 whitespace-pre-line break-words">{body.reviewedNotes}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Print Footer Attribution (visible only in print) */}
        <div className="hidden border-t border-border pt-4 text-xs text-text-muted print:block">
          <p>Recipe from My Curated Haven — {canonicalUrl}</p>
          <p>Recipes by Tiny Soho, inside My Curated Haven.</p>
        </div>
      </div>

      {/* Sibling Free Recipes Discovery Section */}
      {otherRecipes.length > 0 && (
        <section aria-labelledby="other-recipes-heading" className="no-print mt-14 border-t border-border pt-10">
          <h2 id="other-recipes-heading" className="text-2xl font-bold text-foreground">
            More Free Toddler Recipes
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Explore more simple, reviewed recipes from Tiny Soho.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {otherRecipes.map((other) => (
              <RecipeCard key={other.id} recipe={other} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
