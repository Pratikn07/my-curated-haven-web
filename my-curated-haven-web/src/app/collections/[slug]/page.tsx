import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getCollectionOfferDetails } from "@/lib/payments/repository";
import { getFreeRecipeSlots } from "@/lib/data/recipes";
import CheckoutButton from "@/components/commerce/CheckoutButton";
import Badge from "@/components/ui/Badge";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { Clock, Printer, Sparkles, Check } from "lucide-react";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * The offer lives in the commerce database, which isn't deployed until launch.
 * Treat an unavailable database as "no offer" so the page 404s instead of crashing (R8-05).
 */
async function loadOffer(slug: string, userId?: string | null) {
  try {
    return await getCollectionOfferDetails(slug, userId);
  } catch (error) {
    console.error("[collections] offer unavailable", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const user = await getCurrentUser();
  const offer = await loadOffer(slug, user?.id);

  if (!offer) {
    return {
      title: "Collection Not Found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${offer.collectionTitle} | Toddler Recipe Collection | My Curated Haven`;
  const description = `${offer.collectionSummary} One-time purchase of ${offer.formattedPrice}. Includes printable recipe pages.`;
  const canonicalUrl = `${SITE_ORIGIN}/collections/${offer.collectionSlug}`;

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
      type: "website",
    },
  };
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const offer = await loadOffer(slug, user?.id);

  if (!offer) {
    notFound();
  }

  const supabase = await createClient();
  const freeSlots = await getFreeRecipeSlots(supabase);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 [overflow-wrap:anywhere]">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-6">
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
          <li aria-current="page" className="font-medium text-foreground">
            {offer.collectionTitle}
          </li>
        </ol>
      </nav>

      {/* Header and Commercial Hero */}
      <header className="mb-10 text-center sm:text-left">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-action">
          Recipes by Tiny Soho, inside My Curated Haven
        </p>
        <h1 className="break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {offer.collectionTitle}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-text-muted">
          {offer.collectionSummary}
        </p>
      </header>

      {/* Purchase Card & Offer Presentation */}
      <div className="mb-12 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-8 shadow-sm">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-foreground">
                {offer.formattedPrice}
              </span>
              <span className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                One-time purchase
              </span>
            </div>

            <p className="mt-2 text-sm text-text-muted">
              Pay once. No recurring fees or subscriptions.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-foreground">
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-action" aria-hidden="true" />
                <span>Full access to all {offer.recipes.length} curated toddler recipes</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Printer className="h-4 w-4 shrink-0 text-action" aria-hidden="true" />
                <span>Includes printable recipe pages for all members</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 shrink-0 text-action" aria-hidden="true" />
                <span>Allergen notes, storage guidance, and tips</span>
              </li>
            </ul>
          </div>

          <div className="flex min-w-0 flex-col justify-center rounded-2xl bg-surface-muted p-4 sm:p-6 border border-border">
            <h2 className="text-lg font-bold text-foreground">Unlock Collection</h2>
            <p className="mt-1 text-sm text-text-muted">
              {offer.ownershipState === "owned"
                ? "You already own this collection. Browse all recipes below."
                : "Sign in or buy now to unlock complete ingredients and step-by-step instructions."}
            </p>

            <div className="mt-6">
              <CheckoutButton
                collectionSlug={offer.collectionSlug}
                formattedPrice={offer.formattedPrice}
                ownershipState={offer.ownershipState}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Free Sample Recipes Spotlight */}
      {freeSlots.length > 0 && (
        <section aria-labelledby="free-samples-heading" className="mb-12">
          <div className="rounded-2xl border border-action/20 bg-action/5 p-4 sm:p-6">
            <h2 id="free-samples-heading" className="text-xl font-bold text-foreground">
              Try Free Sample Recipes
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              These complete toddler recipes from Tiny Soho are 100% free to read and print right now without an account or payment:
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {freeSlots.map(({ recipe }) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.slug}`}
                  className="group flex min-w-0 w-full flex-col gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-action/40 hover:shadow-sm"
                >
                  <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                    {recipe.previewImagePath ? (
                      <Image
                        src={recipe.previewImagePath}
                        alt={recipe.title}
                        fill
                        sizes="(min-width: 640px) 280px, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-action">
                      Free Sample
                    </span>
                    <h3 className="truncate text-base font-semibold text-foreground group-hover:text-action">
                      {recipe.title}
                    </h3>
                    {recipe.totalMinutes ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
                        <Clock className="h-3 w-3" /> {recipe.totalMinutes} min
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Collection Recipe Manifest */}
      <section id="collection-recipes" aria-labelledby="recipes-heading" className="mb-16">
        <h2 id="recipes-heading" className="text-2xl font-bold text-foreground">
          Recipes in This Collection ({offer.recipes.length})
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          All recipes are specifically reviewed for toddler nutrition, self-feeding, and busy weeknights.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offer.recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:shadow-md"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
                {recipe.previewImagePath ? (
                  <Image
                    src={recipe.previewImagePath}
                    alt={recipe.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute top-3 left-3">
                  {recipe.isFree ? (
                    <Badge variant="primary">Free Sample</Badge>
                  ) : offer.ownershipState === "owned" ? (
                    <Badge variant="collection">Purchased</Badge>
                  ) : (
                    <Badge variant="outline">Collection Recipe</Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold text-foreground">{recipe.title}</h3>
                {recipe.totalMinutes ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{recipe.totalMinutes} minutes total</span>
                  </p>
                ) : null}

                <div className="mt-auto pt-4">
                  <Link
                    href={`/recipes/${recipe.slug}`}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border-control bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2"
                  >
                    {recipe.isFree || offer.ownershipState === "owned"
                      ? "View Recipe & Print"
                      : "Preview Recipe"}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Commercial Policy Footer */}
      <footer className="rounded-xl border border-border bg-surface-muted p-4 sm:p-6 text-xs leading-relaxed text-text-muted">
        <h3 className="font-bold text-foreground">Commercial & Access Policy</h3>
        <p className="mt-1">
          Purchasing this collection gives your My Curated Haven account reading and printing access to this release.
          How long access lasts and the refund terms will be stated here before this collection goes on sale.
          If you have questions, email <a href="mailto:support@mycuratedhaven.com" className="underline hover:text-foreground">support@mycuratedhaven.com</a>.
        </p>
      </footer>
    </div>
  );
}
