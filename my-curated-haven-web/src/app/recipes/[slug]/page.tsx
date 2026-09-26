import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  getRecipeBySlug,
  getFreeRecipeCatalog,
  type RecipeIngredient,
  type RecipeCatalogItem,
} from "@/lib/data/recipes";
import { getSavedRecipeIds } from "@/lib/data/saved-recipes";
import { checkRecipeAccess } from "@/lib/data/access";
import RecipeCard from "@/components/recipe/RecipeCard";
import AllergenInformation from "@/components/recipe/AllergenInformation";
import PrintButton from "@/components/recipe/PrintButton";
import SaveRecipeButton from "@/components/recipe/SaveRecipeButton";
import RecipeOpenTracker from "@/components/recipe/RecipeOpenTracker";
import Badge from "@/components/ui/Badge";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { Lock } from "lucide-react";

const getCachedRecipe = cache(async (slug: string) => {
  const supabase = await createClient();
  return getRecipeBySlug(supabase, slug);
});

const getCachedFreeCatalog = cache(async () => {
  const supabase = await createClient();
  return getFreeRecipeCatalog(supabase);
});

interface RecipeDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: RecipeDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCachedRecipe(slug);

  if (result.status === "not_found" || result.status === "error") {
    return {
      title: "Recipe Not Found",
      robots: { index: false, follow: false },
    };
  }

  const catalog = result.status === "ok" ? result.recipe.catalog : result.catalog;
  const title = `${catalog.title} | Toddler Recipe | My Curated Haven`;
  const description = catalog.publicSummary;
  const canonicalUrl = `${SITE_ORIGIN}/recipes/${catalog.slug}`;

  return {
    // absolute: the full branded title is already built, so skip the layout template.
    title: { absolute: title },
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

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "error") {
    throw new Error(result.message);
  }

  const isAccessDenied = result.status === "access_denied";
  const catalog = isAccessDenied ? result.catalog : result.recipe.catalog;
  const body = isAccessDenied ? null : result.recipe.body;
  const instructions = body ? normalizeInstructions(body.instructions) : [];
  const canonicalUrl = `${SITE_ORIGIN}/recipes/${catalog.slug}`;

  // Fetch auth and saved recipe state
  const user = await getCurrentUser();
  const supabase = await createClient();
  const savedIds = user ? await getSavedRecipeIds(supabase, user.id) : new Set<string>();
  const isSaved = savedIds.has(catalog.id);
  let accessKind: "free" | "paid" = "paid";
  if (!isAccessDenied) {
    try {
      const access = await checkRecipeAccess(supabase, catalog.id);
      accessKind = access.type === "free" ? "free" : "paid";
    } catch {
      accessKind = "paid";
    }
  }

  // Fetch sibling free recipes for discovery section
  let otherRecipes: RecipeCatalogItem[] = [];
  try {
    const freeRecipes = await getCachedFreeCatalog();
    otherRecipes = freeRecipes.filter((r) => r.slug !== catalog.slug).slice(0, 2);
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
    ...(body
      ? {
          recipeYield: body.yield,
          recipeIngredient: body.ingredients.map(formatIngredient),
          recipeInstructions: instructions.map((step) => ({
            "@type": "HowToStep",
            position: step.step,
            text: step.text,
          })),
        }
      : {}),
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
                {body ? body.yield : "Toddler portions"}
              </span>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                Access
              </span>
              <span className={`text-base font-semibold ${isAccessDenied ? "text-text-muted" : "text-action"}`}>
                {isAccessDenied ? "Collection Recipe" : accessKind === "free" ? "Free Toddler Recipe" : "Your Collection Recipe"}
              </span>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 pt-2 sm:ml-auto sm:w-auto sm:pt-0">
            <div className="no-print flex-1 sm:flex-initial">
              <SaveRecipeButton
                recipeId={catalog.id}
                recipeSlug={catalog.slug}
                initialIsSaved={isSaved}
                isAuthenticated={Boolean(user)}
              />
            </div>
            {!isAccessDenied && (
              <>
                <a
                  href="#recipe-content"
                  className="no-print inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-border-control bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2 sm:flex-initial"
                >
                  Jump to recipe
                </a>
                <div className="flex-1 sm:flex-initial">
                  <PrintButton recipeId={catalog.id} accessKind={accessKind} />
                </div>
              </>
            )}
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
        {isAccessDenied ? (
          /* Gated / Locked Recipe Presentation */
          <div className="rounded-[var(--radius-card)] border border-action/30 bg-surface p-6 sm:p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-action/10">
              <Lock className="h-7 w-7 text-action" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-foreground">
              Collection Recipe
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-base text-text-muted leading-relaxed">
              This recipe is part of our curated toddler collection. Sign in with an entitled account or purchase the collection to unlock full ingredients, instructions, and printable views.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/collections/comfort-haven-collection"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-white shadow-sm hover:bg-action-hover"
              >
                View Collection & Unlock
              </Link>
              {!user && (
                <Link
                  href={`/sign-in?returnTo=/recipes/${catalog.slug}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-foreground hover:bg-surface-muted"
                >
                  Sign in to your account
                </Link>
              )}
            </div>
          </div>
        ) : body ? (
          <>
            <RecipeOpenTracker recipeId={catalog.id} accessKind={accessKind} />
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

            <AllergenInformation
              reviewState={body.allergenReviewState}
              allergens={body.allergens}
            />

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
          </>
        ) : null}
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
              <RecipeCard
                key={other.id}
                recipe={other}
                isSaved={savedIds.has(other.id)}
                isAuthenticated={Boolean(user)}
                showSaveButton={true}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
