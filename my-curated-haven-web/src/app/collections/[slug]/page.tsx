import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BuyDock,
  Contents,
  DetailHero,
  FreeSamples,
  NextBook,
  Questions,
  type DetailModel,
} from "@/components/collections/CollectionDetail";
import CollectionsMotion from "@/components/collections/CollectionsMotion";
import { SITE_ORIGIN } from "@/config/site-navigation";
import type { ShowroomCollection } from "@/lib/collections/types";
import {
  getPublishedCollection,
  isWithheldCollection,
  listOpenPublishedCollections,
  loadLiveOffer,
  offerOrNull,
} from "@/lib/data/collections-showroom";
import { getFreeRecipeCatalog, getPublishedCatalog, type RecipeCatalogItem } from "@/lib/data/recipes";
import type { CollectionOfferDto } from "@/lib/payments/types";
import { usableImageSrc } from "@/lib/recipes/format";
import { withCatalogAccess } from "@/lib/collections/visibility";
import { createPublicClient } from "@/lib/supabase/public";
import { getCurrentUser } from "@/lib/supabase/server";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * One collection: its book and cloth, the price and purchase, the full
 * contents, free samples and questions. The words, cover and recipes come from
 * the collection's published record (configured or database, see
 * src/lib/collections/publication.ts); the price, purchase and ownership come
 * from the commerce database whenever it has an offer for this slug. A collection that exists
 * only in the database (no config entry) still renders, as a plain cloth book.
 */
function buildModel(slug: string, config: ShowroomCollection | null, offer: CollectionOfferDto | null,
  commerceUnavailable = false): DetailModel | null {
  if (config) {
    return {
      commerceUnavailable,
      slug,
      title: config.title,
      tagline: config.tagline,
      story: config.story,
      forWhen: config.forWhen,
      cloth: config.cloth,
      cover: config.cover,
      refresh: config.refresh,
      price: offer?.formattedPrice ?? null,
      offer,
      recipes: config.recipes,
    };
  }
  if (!offer) return null;
  return {
    slug,
    title: offer.collectionTitle,
    tagline: null,
    story: offer.collectionSummary,
    forWhen: null,
    cloth: "terracotta",
    cover: null,
    refresh: null,
    price: offer.formattedPrice,
    offer,
    recipes: offer.recipes.map((recipe) => ({
      slug: recipe.slug,
      title: recipe.title,
      minutes: recipe.totalMinutes,
      image: usableImageSrc(recipe.previewImagePath) ?? "",
      allergens: [],
      freezes: null,
      href: `/recipes/${recipe.slug}`,
    })),
  };
}

/**
 * What a visitor can open: the published recipes (each has a page) and the free ones (the whole recipe,
 * no purchase). Read as a visitor, so an admin session never links to drafts. Either lookup failing
 * leaves its part out: rows without a page stay plain text, and no row is called free.
 */
async function loadCatalogAccess(): Promise<{ published: ReadonlySet<string>; free: RecipeCatalogItem[] }> {
  const client = createPublicClient();
  const [published, free] = await Promise.all([
    getPublishedCatalog(client)
      .then((items) => new Set(items.map((item) => item.slug)))
      .catch((error) => {
        console.error("[collections] published recipes unavailable", error instanceof Error ? error.message : error);
        return new Set<string>();
      }),
    getFreeRecipeCatalog(client).catch((error) => {
      console.error("[collections] free recipes unavailable", error instanceof Error ? error.message : error);
      return [];
    }),
  ]);
  return { published, free };
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const published = await getPublishedCollection(slug);
  const live = await loadLiveOffer(slug, (await getCurrentUser())?.id);
  const model = buildModel(slug, published?.collection ?? null, offerOrNull(live), !live.ok);

  if (!model || (!published && (await isWithheldCollection(slug)))) {
    return { title: "Collection Not Found", robots: { index: false, follow: false } };
  }

  const title = `${model.title} | Baby & Toddler Recipe Collection | My Curated Haven`;
  const buying = model.price ? `One-time purchase of ${model.price}.` : "Opening soon.";
  const description = `${model.tagline ?? model.story} ${model.recipes.length} recipes. ${buying} Includes printable recipe pages.`;
  const canonicalUrl = `${SITE_ORIGIN}/collections/${slug}`;

  return {
    // absolute: the full branded title is already built, so skip the layout template.
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      ...(model.cover ? { images: [{ url: model.cover.src, alt: model.cover.alt }] } : {}),
    },
  };
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const [published, live, access] = await Promise.all([getPublishedCollection(slug), loadLiveOffer(slug, user?.id), loadCatalogAccess()]);
  const built = buildModel(slug, published?.collection ?? null, offerOrNull(live), !live.ok);
  // A retired or coming-soon database collection is not rebuilt from its offer.
  if (!built || (!published && (await isWithheldCollection(slug)))) notFound();

  // Every published recipe opens its own page (free, or locked with the way to buy); this book's free ones say so.
  const freeSlugs = new Set(access.free.map((recipe) => recipe.slug));
  const model: DetailModel = { ...built, recipes: withCatalogAccess(built.recipes, access.published, freeSlugs) };
  const ownFree = access.free.filter((recipe) => model.recipes.some((member) => member.slug === recipe.slug));

  const shelf = (await listOpenPublishedCollections()).map((entry) => entry.collection);
  const position = shelf.findIndex((collection) => collection.slug === slug);
  const next = shelf.length > 1 ? shelf[(position + 1) % shelf.length] : position === -1 ? shelf[0] : null;

  return (
    <div className="cl" data-cloth={model.cloth}>
      <DetailHero model={model} />
      <Contents model={model} />
      <FreeSamples recipes={ownFree} />
      <Questions />
      {next && next.slug !== slug ? <NextBook next={next} /> : <span data-dock-end />}
      <BuyDock model={model} />
      <CollectionsMotion />
    </div>
  );
}
