import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  getRecipeBySlug,
  getFreeRecipeCatalog,
  type RecipeCatalogItem,
} from "@/lib/data/recipes";
import { formatIngredient, formatMinutes, normalizeInstructions, tagLabel, usableImageSrc } from "@/lib/recipes/format";
import { methodHowTo, methodIngredientLines, methodTime } from "@/lib/recipes/method";
import { allergenLine, getAllergenDisplay } from "@/lib/recipes/allergen-display";
import RecipeMethodLayout from "@/components/recipe/RecipeMethodLayout";
import { getSavedRecipeIds } from "@/lib/data/saved-recipes";
import { checkRecipeAccess, isRecipeAdmin } from "@/lib/data/access";
import RecipeCard from "@/components/recipe/RecipeCard";
import AllergenInformation from "@/components/recipe/AllergenInformation";
import { RecipeIngredients, RecipeMethod, RecipeStorageNotes } from "@/components/recipe/RecipeSections";
import PrintButton from "@/components/recipe/PrintButton";
import SaveRecipeButton from "@/components/recipe/SaveRecipeButton";
import RecipeOpenTracker from "@/components/recipe/RecipeOpenTracker";
import Badge from "@/components/ui/Badge";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { listOpenPublishedCollections } from "@/lib/collections/publication";
import type { CollectionRecipe, ShowroomCollection } from "@/lib/collections/types";
import { bookName } from "@/lib/collections/book-name";
import { chocolateNote } from "@/config/allergen-notes";
import { recipeCount } from "@/lib/collections/visibility";
import { loadLiveOffer, offerOrNull } from "@/lib/data/collections-showroom";
import type { CollectionOfferDto } from "@/lib/payments/types";
import CheckoutButton from "@/components/commerce/CheckoutButton";
import { HALLOWEEN_COLLECTION_SLUG } from "@/config/halloween";
import { EVERYDAY_PHOTOS } from "@/config/everyday-photos";
import { BeforeAfter } from "@/components/halloween/HalloweenClient";
import { LockIcon, RecipeFog, RecipeRevealStage } from "@/components/recipe/RecipeLock";
import ClearOpenedParam from "@/components/recipe/ClearOpenedParam";

const getCachedRecipe = cache(async (slug: string) => {
  const supabase = await createClient();
  return getRecipeBySlug(supabase, slug);
});

const getCachedAdminStatus = cache(async () => isRecipeAdmin(await createClient()));

const getCachedFreeCatalog = cache(async () => {
  const supabase = await createClient();
  return getFreeRecipeCatalog(supabase);
});

/** "Get Witch's Broomsticks and 19 more recipes, each with ...": the recipe they tapped, then the rest of the book. */
function lockedOffer(title: string, bookSize: number): string {
  const others = bookSize - 1;
  const what = "steps, storage tips and a page you can print.";
  if (others < 1) return `Get ${title}, with ${what}`;
  return `Get ${title} and ${others} more recipe${others === 1 ? "" : "s"}, each with ${what}`;
}

interface RecipeDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  const imageSrc = usableImageSrc(catalog.previewImagePath);

  return {
    // absolute: the full branded title is already built, so skip the layout template.
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    ...(await getCachedAdminStatus() ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      images: imageSrc
        ? [{ url: imageSrc, alt: catalog.imageAlt ?? catalog.title }]
        : [],
    },
  };
}

export default async function RecipeDetailPage({ params, searchParams }: RecipeDetailPageProps) {
  const { slug } = await params;
  const { opened } = await searchParams;
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
  // The method layout, only for a recipe the visitor can open and that has valid method content.
  const method = body?.method ?? null;
  const time = method ? methodTime(method) : null;
  const canonicalUrl = `${SITE_ORIGIN}/recipes/${catalog.slug}`;
  const imageSrc = usableImageSrc(catalog.previewImagePath);
  const everyday = EVERYDAY_PHOTOS[catalog.slug];

  // Fetch auth and saved recipe state
  const isAdmin = await getCachedAdminStatus();
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

  // A buyer arriving from "You're in" (?opened=1) sees the recipe open once. Only for bought recipes, never
  // free ones or admins; for anyone without access the parameter changes nothing.
  const playReveal = opened === "1" && !isAccessDenied && !isAdmin && accessKind === "paid";

  // A locked recipe names the open book it is in and, while that book is on sale, carries its buy button,
  // so a parent arriving from the book list, a search or a shared link can buy without going back.
  let book: { collection: ShowroomCollection; entry: CollectionRecipe; offer: CollectionOfferDto | null } | null = null;
  if (isAccessDenied || playReveal) {
    try {
      const found = (await listOpenPublishedCollections()).find((c) => c.collection.recipes.some((r) => r.slug === catalog.slug));
      const entry = found?.collection.recipes.find((r) => r.slug === catalog.slug);
      if (found && entry) {
        const offer = isAccessDenied ? offerOrNull(await loadLiveOffer(found.collection.slug, user?.id)) : null;
        book = { collection: found.collection, entry, offer };
      }
    } catch {
      // Non-critical: the notice still links to the free recipes
    }
  }
  // The seasonal touch: a ghost in the fog, for Halloween recipes only.
  const ghost = book?.collection.slug === HALLOWEEN_COLLECTION_SLUG;
  // On sale only when checkout would take the order (the same rule as /halloween).
  const saleOffer = book?.offer?.saleEnabled && book.offer.expected ? book.offer : null;

  // Fetch sibling free recipes for discovery section
  let otherRecipes: RecipeCatalogItem[] = [];
  let bookFreeRecipe: RecipeCatalogItem | undefined;
  try {
    const freeRecipes = await getCachedFreeCatalog();
    otherRecipes = freeRecipes.filter((r) => r.slug !== catalog.slug).slice(0, 2);
    bookFreeRecipe = book
      ? freeRecipes.find((r) => r.slug !== catalog.slug && book.collection.recipes.some((member) => member.slug === r.slug))
      : undefined;
  } catch {
    // Non-critical if recommendation fails
  }

  // Schema.org structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: catalog.title,
    description: catalog.publicSummary,
    image: imageSrc ? [imageSrc] : [],
    ...(method
      ? {
          // The structured data describes what the page shows: the method's steps, ingredients and times.
          recipeYield: method.makes,
          recipeIngredient: methodIngredientLines(method),
          recipeInstructions: methodHowTo(method),
          prepTime: `PT${method.handsOnMinutes}M`,
          totalTime: `PT${method.totalMinutes}M`,
        }
      : body
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
    ...(!method && catalog.totalMinutes
      ? { totalTime: `PT${catalog.totalMinutes}M` }
      : {}),
    author: {
      "@type": "Organization",
      name: "Tiny Soho",
    },
    publisher: {
      "@type": "Organization",
      name: "Nibble & Nurture",
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
          Recipes by Tiny Soho, from Nibble &amp; Nurture.
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
            {method && time ? (
              <>
                <InfoStat label="Hands-on" value={time.handsOn} />
                <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
                <InfoStat label="Makes" value={method.makes} />
              </>
            ) : (
              <>
                <InfoStat label="Total Time" value={catalog.totalMinutes ? formatMinutes(catalog.totalMinutes) : "Not reviewed"} />
                <div className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
                <InfoStat label="Yield" value={body ? body.yield : "Toddler portions"} />
              </>
            )}
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 pt-2 sm:ml-auto sm:w-auto sm:pt-0">
            {!isAccessDenied && (
              <>
                <div className="no-print flex-1 sm:flex-initial">
                  <SaveRecipeButton
                    recipeId={catalog.id}
                    recipeSlug={catalog.slug}
                    initialIsSaved={isSaved}
                    isAuthenticated={Boolean(user)}
                  />
                </div>
                <a
                  href="#recipe-content"
                  className="no-print inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-border-control bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2 sm:flex-initial"
                >
                  Jump to recipe
                </a>
                <div className="flex-1 sm:flex-initial">
                  <PrintButton recipeId={isAdmin ? undefined : catalog.id} accessKind={accessKind} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dietary and Meal Badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {catalog.mealLabels?.map((meal) => (
            <Badge key={meal} variant="primary">
              {tagLabel(meal)}
            </Badge>
          ))}
          {catalog.dietLabels?.map((diet) => (
            <Badge key={diet} variant="outline">
              {tagLabel(diet)}
            </Badge>
          ))}
        </div>
      </header>

      {/* Hero Image */}
      {imageSrc ? (
        <div className="recipe-print-figure relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-muted">
          {everyday ? (
            /* A Halloween recipe with an everyday photo: drag to see what the Halloween step adds. */
            <BeforeAfter
              className="hw-compare-fill"
              after={<Image src={imageSrc} alt={catalog.imageAlt ?? catalog.title} fill sizes="(min-width: 1024px) 896px, 100vw" priority />}
              before={<Image src={everyday.src} alt={everyday.alt} fill sizes="(min-width: 1024px) 896px, 100vw" />}
            />
          ) : (
            <Image
              src={imageSrc}
              alt={catalog.imageAlt ?? catalog.title}
              fill
              sizes="(min-width: 1024px) 896px, 100vw"
              priority
              className="recipe-print-image object-cover"
            />
          )}
        </div>
      ) : null}
      {/* preview_image_description is the brief the photo was made from (staff only), never page copy. */}

      {/* Main Recipe Content Anchor */}
      <div
        id="recipe-content"
        className="grid w-full min-w-0 gap-8 [overflow-wrap:anywhere]"
        data-reveal={playReveal && body ? "" : undefined}
      >
        {isAccessDenied ? (
          /* Gated / Locked Recipe Presentation: the fog teaser, with the buy card over its lower half */
          <div className="recipe-locked">
            <RecipeFog ghost={ghost} />
            <div className="recipe-lock-card rounded-[var(--radius-card)] border border-action/30 bg-surface p-6 sm:p-10 text-center shadow-sm">
              <div className="recipe-lock-badge mx-auto flex h-14 w-14 items-center justify-center rounded-full">
                <LockIcon className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-foreground">
                {book ? `In ${bookName(book.collection.title, "book")}` : "Not on sale yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-base text-text-muted leading-relaxed">
                {saleOffer && book
                  ? `${lockedOffer(catalog.title, book.collection.recipes.length)} One payment, yours to keep. All sales are final.`
                  : book
                    ? "This book opens soon. Until then, try one of our free recipes."
                    : "This recipe will be part of one of our recipe books. Until then, try a free one."}
              </p>
              {book && (book.entry.allergens.length > 0 || chocolateNote(catalog.slug, book.entry.allergens)) ? (
                <p className="mx-auto mt-3 max-w-lg text-sm text-text-muted">
                  {[
                    book.entry.allergens.length > 0 ? `Contains ${book.entry.allergens.join(", ")}.` : null,
                    chocolateNote(catalog.slug, book.entry.allergens) ? `${chocolateNote(catalog.slug, book.entry.allergens)}; check the label.` : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {saleOffer ? (
                  <CheckoutButton
                    collectionSlug={saleOffer.collectionSlug}
                    formattedPrice={saleOffer.formattedPrice}
                    ownershipState={saleOffer.ownershipState}
                    expected={saleOffer.expected}
                    surface="lock_card"
                    signInHint={false}
                    fromRecipeSlug={catalog.slug}
                  />
                ) : null}
                <Link
                  href={book ? `/collections/${book.collection.slug}` : "/recipes"}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-foreground hover:bg-surface-muted"
                >
                  {book ? `See all ${recipeCount(book.collection.recipes.length)}` : "Browse the free recipes"}
                </Link>
              </div>
              {bookFreeRecipe ? (
                <p className="mt-5 text-sm text-text-muted">
                  Not sure yet? Try{" "}
                  <Link href={`/recipes/${bookFreeRecipe.slug}`} className="font-semibold text-action underline underline-offset-4 hover:text-action-hover">
                    {bookFreeRecipe.title}
                  </Link>{" "}
                  from the same book, free.
                </p>
              ) : null}
              {!user && (
                <p className="mt-3 text-sm text-text-muted">
                  Bought it already?{" "}
                  <Link href={`/sign-in?returnTo=/recipes/${catalog.slug}`} className="font-semibold text-action underline underline-offset-4 hover:text-action-hover">
                    Sign in
                  </Link>{" "}
                  to open it.
                </p>
              )}
            </div>
          </div>
        ) : body ? (
          <>
            {playReveal ? (
              <>
                <RecipeRevealStage title={catalog.title} ghost={ghost} />
                <ClearOpenedParam />
              </>
            ) : null}
            {!isAdmin && <RecipeOpenTracker recipeId={catalog.id} accessKind={accessKind} />}
            {method ? (
              /* Age switch, safety box (with the allergens), ingredients, method, "We made it!", tips and storage. */
              <RecipeMethodLayout
                method={method}
                allergenLine={allergenLine(getAllergenDisplay(body.allergenReviewState, body.allergens))}
              />
            ) : (
              <>
                <RecipeIngredients ingredients={body.ingredients} />
                <RecipeMethod instructions={body.instructions} />
                <AllergenInformation
                  reviewState={body.allergenReviewState}
                  allergens={body.allergens}
                />
                <RecipeStorageNotes storageNotes={body.storageNotes} reviewedNotes={body.reviewedNotes} />
              </>
            )}

            {/* Print Footer Attribution (visible only in print) */}
            <div className="hidden border-t border-border pt-4 text-xs text-text-muted print:block">
              <p>Recipe from Nibble &amp; Nurture — {canonicalUrl}</p>
              <p>Recipes by Tiny Soho, from Nibble &amp; Nurture.</p>
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

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">{label}</span>
      <span className="text-base font-semibold text-foreground">{value}</span>
    </div>
  );
}
