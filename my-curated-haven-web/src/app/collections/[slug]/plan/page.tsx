import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CheckoutButton from "@/components/commerce/CheckoutButton";
import type { CollectionRecipe, ShowroomCollection } from "@/lib/collections/types";
import {
  PlanDayHeadings,
  PlanDays,
  PlanHeader,
  PlanMenu,
  PlanMoreRecipes,
  PlanTiers,
} from "@/components/collections/MakeAheadPlan";
import MakeAheadPlanTracker from "@/components/collections/MakeAheadPlanTracker";
import MakeAheadShopping from "@/components/collections/MakeAheadShopping";
import { LockIcon } from "@/components/recipe/RecipeLock";
import { makeAheadPlanFor } from "@/config/halloween";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { bookName } from "@/lib/collections/book-name";
import { shoppingListText } from "@/lib/collections/make-ahead";
import { recipeCount, withCatalogAccess } from "@/lib/collections/visibility";
import { isRecipeAdmin } from "@/lib/data/access";
import { getPublishedCollection, loadLiveOffer, offerOrNull } from "@/lib/data/collections-showroom";
import { readMakeAheadPlan, type PlanRead } from "@/lib/data/make-ahead-plan";
import { getFreeRecipeCatalog, getPublishedCatalog, type RecipeCatalogItem } from "@/lib/data/recipes";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

interface PlanPageProps {
  params: Promise<{ slug: string }>;
}

const LOCKED: PlanRead = { status: "locked" };

/**
 * Who reads the whole plan is the database's decision: the plan is read with the visitor's own session, and RLS
 * on public.collection_extras returns it only to owners of the book, recipe admins and console staff (the people
 * who read its paid recipe bodies). The live offer adds the price, the buy button and, for buyers, the release
 * the plan open is counted against. Read fresh on every request.
 */
const loadView = cache(async (slug: string) => {
  const entry = makeAheadPlanFor(slug);
  if (!entry) return null;
  const user = await getCurrentUser();
  const supabase = user ? await createClient() : null;
  const [live, isAdmin, read] = await Promise.all([
    loadLiveOffer(slug, user?.id),
    supabase ? isRecipeAdmin(supabase).catch(() => false) : Promise.resolve(false),
    supabase ? readMakeAheadPlan(supabase, slug, entry.preview) : Promise.resolve(LOCKED),
  ]);
  const offer = offerOrNull(live);
  return { entry, user, live, offer, owned: offer?.ownershipState === "owned", isAdmin, read };
});

export async function generateMetadata({ params }: PlanPageProps): Promise<Metadata> {
  const { slug } = await params;
  const view = await loadView(slug);
  if (!view) return { title: "Page Not Found", robots: { index: false, follow: false } };

  const { entry, isAdmin } = view;
  const canonicalUrl = `${SITE_ORIGIN}${entry.path}`;
  return {
    title: entry.metadataTitle,
    description: entry.preview.lede,
    alternates: { canonical: canonicalUrl },
    // Same rule as recipe pages: an admin's view is never indexed; a locked view is indexed like a locked recipe.
    ...(isAdmin ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: entry.metadataTitle,
      description: entry.preview.lede,
      url: canonicalUrl,
      type: "article",
      images: [{ url: entry.shareImage.src, alt: entry.shareImage.alt }],
    },
  };
}

/** "Not sure yet? Try ..." from the same book, as on a locked recipe. A lookup failure leaves it out. */
async function loadBookFreeRecipe(bookSlugs: ReadonlySet<string>): Promise<RecipeCatalogItem | undefined> {
  try {
    return (await getFreeRecipeCatalog(createPublicClient())).find((recipe) => bookSlugs.has(recipe.slug));
  } catch {
    return undefined;
  }
}

/**
 * The photo grid under the plan (owner decision 2026-10-14: the book's prettiest Halloween recipes, not only the
 * party menu), in the plan entry's order and only for recipes still in the book. Each opens its page; a lookup
 * failure shows them without links.
 */
async function loadMoreRecipes(book: ShowroomCollection, slugs: readonly string[]): Promise<CollectionRecipe[]> {
  const rest = slugs.flatMap((slug) => book.recipes.filter((recipe) => recipe.slug === slug));
  try {
    const client = createPublicClient();
    const [published, free] = await Promise.all([getPublishedCatalog(client), getFreeRecipeCatalog(client)]);
    return withCatalogAccess(rest, new Set(published.map((recipe) => recipe.slug)), new Set(free.map((recipe) => recipe.slug)));
  } catch {
    return rest;
  }
}

export default async function MakeAheadPlanPage({ params }: PlanPageProps) {
  const { slug } = await params;
  const view = await loadView(slug);
  if (!view) notFound();
  const published = await getPublishedCollection(slug);
  if (!published) notFound();
  const book = published.collection;
  const { entry, user, live, offer, owned, isAdmin, read } = view;
  const more = await loadMoreRecipes(book, entry.moreRecipes);
  const moreSub = `More treats from ${bookName(book.title, "book")}.`;

  if (read.status === "ok") {
    const { plan } = read;
    return (
      <div className="mp-wrap">
        {owned && !isAdmin && offer ? <MakeAheadPlanTracker releaseId={offer.releaseId} /> : null}
        <PlanHeader plan={plan} bookSlug={book.slug} bookTitle={book.title} />
        <PlanMenu plan={plan} />
        <PlanDays plan={plan} />
        <MakeAheadShopping
          storageKey={`mch:make-ahead-shop:${slug}`}
          heading={plan.shopping.heading}
          sub={plan.shopping.sub}
          copyText={shoppingListText(plan)}
          aisles={plan.shopping.aisles}
        />
        <PlanTiers plan={plan} />
        <PlanMoreRecipes heading="More from your book" sub="Ready to open whenever you are." recipes={more} />
      </div>
    );
  }

  // Everyone else sees the preview from config, which needs none of the protected rows.
  const preview = entry.preview;
  const header = (
    <>
      <PlanHeader plan={preview} bookSlug={book.slug} bookTitle={book.title} />
      <PlanMenu plan={preview} />
      <PlanDayHeadings plan={preview} />
    </>
  );

  // A buyer whose plan didn't load: say so, and never offer to sell them the book again.
  if (owned) {
    return (
      <div className="mp-wrap">
        {header}
        <div className="mp-card" role="status">
          <p>
            {read.status === "unavailable"
              ? "We could not open your plan just now. Please refresh in a moment."
              : "Your plan is being added to your book. Please check back soon."}
          </p>
          <p className="mp-sub" style={{ margin: "0.75rem 0 0" }}>
            <Link href={`/collections/${book.slug}`} className="font-semibold text-action underline underline-offset-4">
              Open your collection
            </Link>
          </p>
        </div>
        <PlanMoreRecipes heading="More from your book" sub="Ready to open whenever you are." recipes={more} />
      </div>
    );
  }

  // The same way to buy that a locked recipe uses.
  const saleOffer = offer?.saleEnabled && offer.expected ? offer : null;
  const bookFreeRecipe = await loadBookFreeRecipe(new Set(book.recipes.map((recipe) => recipe.slug)));
  return (
    <div className="mp-wrap">
      {header}
      <div className="recipe-lock-card rounded-[var(--radius-card)] border border-action/30 bg-surface p-6 text-center shadow-sm sm:p-10">
        <div className="recipe-lock-badge mx-auto flex h-14 w-14 items-center justify-center rounded-full">
          <LockIcon className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-foreground">In {bookName(book.title, "book")}</h2>
        <p className="mx-auto mt-2 max-w-lg text-base leading-relaxed text-text-muted">
          {saleOffer
            ? `Get this plan and all ${recipeCount(book.recipes.length)}, each with steps, storage tips and a page you can print. One payment, yours to keep. All sales are final.`
            : !live.ok
              ? "We could not load checkout just now. Please refresh in a moment."
              : "This book opens soon. Until then, try one of our free recipes."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {saleOffer ? (
            <CheckoutButton
              collectionSlug={saleOffer.collectionSlug}
              formattedPrice={saleOffer.formattedPrice}
              ownershipState={saleOffer.ownershipState}
              expected={saleOffer.expected}
              signInHint={false}
              entryPoint="plan_page"
            />
          ) : null}
          <Link
            href={`/collections/${book.slug}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-foreground hover:bg-surface-muted"
          >
            See all {recipeCount(book.recipes.length)}
          </Link>
        </div>
        {bookFreeRecipe ? (
          <p className="mt-5 text-sm text-text-muted">
            Not sure yet? Try{" "}
            <Link
              href={`/recipes/${bookFreeRecipe.slug}`}
              className="font-semibold text-action underline underline-offset-4 hover:text-action-hover"
            >
              {bookFreeRecipe.title}
            </Link>{" "}
            from the same book, free.
          </p>
        ) : null}
        {!user ? (
          <p className="mt-3 text-sm text-text-muted">
            Bought it already?{" "}
            <Link
              href={`/sign-in?returnTo=${entry.path}`}
              className="font-semibold text-action underline underline-offset-4 hover:text-action-hover"
            >
              Sign in
            </Link>{" "}
            to open it.
          </p>
        ) : null}
      </div>
      <PlanMoreRecipes heading="More from the book" sub={moreSub} recipes={more} />
    </div>
  );
}
