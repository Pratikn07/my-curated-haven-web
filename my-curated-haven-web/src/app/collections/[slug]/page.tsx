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
import { getShowroomCollection, listShowroomCollections, loadLiveOffer } from "@/lib/data/collections-showroom";
import { getFreeRecipeSlots, type RecipeCatalogItem } from "@/lib/data/recipes";
import type { CollectionOfferDto } from "@/lib/payments/types";
import { usableImageSrc } from "@/lib/recipes/format";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * One collection: its book and cloth, the price and purchase, the full
 * contents, free samples and questions. The words and cover come from the
 * showroom config; the price, purchase and ownership come from the commerce
 * database whenever it has an offer for this slug. A collection that exists
 * only in the database (no config entry) still renders, as a plain cloth book.
 */
function buildModel(slug: string, config: ShowroomCollection | null, offer: CollectionOfferDto | null): DetailModel | null {
  if (config) {
    return {
      slug,
      title: config.title,
      tagline: config.tagline,
      story: config.story,
      forWhen: config.forWhen,
      cloth: config.cloth,
      cover: config.cover,
      refresh: config.refresh,
      price: offer?.formattedPrice ?? config.placeholderPrice,
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

async function loadFreeSamples(): Promise<RecipeCatalogItem[]> {
  try {
    const slots = await getFreeRecipeSlots(await createClient());
    return slots.map(({ recipe }) => recipe);
  } catch (error) {
    console.error("[collections] free samples unavailable", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const config = getShowroomCollection(slug);
  const offer = await loadLiveOffer(slug, (await getCurrentUser())?.id);
  const model = buildModel(slug, config, offer);

  if (!model) {
    return { title: "Collection Not Found", robots: { index: false, follow: false } };
  }

  const title = `${model.title} | Toddler Recipe Collection | My Curated Haven`;
  const description = `${model.tagline ?? model.story} ${model.recipes.length} recipes. One-time purchase of ${model.price}. Includes printable recipe pages.`;
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
  const config = getShowroomCollection(slug);
  const user = await getCurrentUser();
  const [offer, freeSamples] = await Promise.all([loadLiveOffer(slug, user?.id), loadFreeSamples()]);
  const model = buildModel(slug, config, offer);
  if (!model) notFound();

  const shelf = listShowroomCollections();
  const position = shelf.findIndex((collection) => collection.slug === slug);
  const next = shelf.length > 1 ? shelf[(position + 1) % shelf.length] : position === -1 ? shelf[0] : null;

  return (
    <div className="cl" data-cloth={model.cloth}>
      <DetailHero model={model} />
      <Contents model={model} />
      <FreeSamples recipes={freeSamples} />
      <Questions />
      {next && next.slug !== slug ? <NextBook next={next} /> : <span data-dock-end />}
      <BuyDock model={model} />
      <CollectionsMotion />
    </div>
  );
}
