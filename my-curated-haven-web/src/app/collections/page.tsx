import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CollectionsMotion from "@/components/collections/CollectionsMotion";
import {
  Chapter,
  FreeRecipes,
  HowItWorks,
  ShelfRail,
  ShowroomClose,
  ShowroomHero,
  type ShowroomEntry,
} from "@/components/collections/Showroom";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { listShowroomCollections, loadLiveOffer } from "@/lib/data/collections-showroom";
import { getFreeRecipeCatalog, type RecipeCatalogItem } from "@/lib/data/recipes";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * The collections showroom: a fanned hand of cloth cookbooks, then one chapter
 * per collection whose cloth floods the page, how buying works, and the free
 * recipes to try first. Nothing here depends on who is signed in, so the page
 * is built once and served from the cache.
 */
export const revalidate = 3600;

const DESCRIPTION =
  "Little cookbooks of toddler recipes by Tiny Soho: Halloween, Meal Prep and Protein Packs. Pay once, keep it, and get the recipes added later.";

export const metadata: Metadata = {
  title: "Collections",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_ORIGIN}/collections` },
  openGraph: {
    title: "Collections | My Curated Haven",
    description: DESCRIPTION,
    url: `${SITE_ORIGIN}/collections`,
    type: "website",
    images: [{ url: "/images/collections/cover-halloween-1040.webp", alt: "Three cloth cookbooks: Halloween, Meal Prep and Protein Packs" }],
  },
};

async function loadFreeRecipes(): Promise<RecipeCatalogItem[]> {
  try {
    return await getFreeRecipeCatalog(createPublicClient());
  } catch (error) {
    console.error("[collections] free recipes unavailable", error instanceof Error ? error.message : error);
    return [];
  }
}

export default async function CollectionsPage() {
  const collections = listShowroomCollections();
  if (collections.length === 0) notFound();

  const [offers, freeRecipes] = await Promise.all([
    Promise.all(collections.map((collection) => loadLiveOffer(collection.slug))),
    loadFreeRecipes(),
  ]);
  const entries: ShowroomEntry[] = collections.map((collection, index) => ({
    collection,
    price: offers[index]?.formattedPrice ?? collection.placeholderPrice,
  }));

  return (
    <div className="cl">
      <ShowroomHero entries={entries} />
      <div className="cl-chapters" data-cloth={entries[0].collection.cloth}>
        <span className="cl-cloth" aria-hidden="true">
          {/* One layer per book: on scroll, each spreads over the last like dye (scenes.ts). */}
          {entries.map(({ collection }) => (
            <span key={collection.slug} className="cl-ink" data-cloth={collection.cloth} data-ink={collection.slug} />
          ))}
        </span>
        <ShelfRail entries={entries} />
        {entries.map((entry, index) => (
          <Chapter key={entry.collection.slug} entry={entry} index={index} />
        ))}
      </div>
      <HowItWorks />
      <FreeRecipes recipes={freeRecipes} />
      <ShowroomClose />
      <CollectionsMotion />
    </div>
  );
}
