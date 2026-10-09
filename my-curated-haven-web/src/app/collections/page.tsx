import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Bookcase from "@/components/collections/Bookcase";
import { SERIES, SHELVES } from "@/config/collections";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { featuredSlug, toBookcaseEntry } from "@/lib/collections/bookcase";
import type { SeriesKey } from "@/lib/collections/types";
import { listPublishedCollections, loadLiveOffer, offerOrNull } from "@/lib/data/collections-showroom";

/**
 * The bookcase: every collection as a cloth book on its shelf, found by the
 * age a parent is cooking for and by filter chips (concepts approved
 * 2026-10-06). Books marked open have their own page; the rest stand
 * greyed out as "coming soon". The first showroom stays at /collections/test.
 * Nothing depends on who is signed in, so the page is built once an hour.
 */
export const revalidate = 3600;

const DESCRIPTION =
  "Little cookbooks of baby and toddler recipes by Tiny Soho, for every stage from first tastes to lunchboxes. Pay once, keep it, and get the recipes added later.";

export const metadata: Metadata = {
  title: "Collections",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_ORIGIN}/collections` },
  openGraph: {
    title: "Collections | My Curated Haven",
    description: DESCRIPTION,
    url: `${SITE_ORIGIN}/collections`,
    type: "website",
    images: [{ url: "/images/collections/cover-first-tastes-1040.webp", alt: "A sage-green cloth cookbook, First Tastes" }],
  },
};

export default async function CollectionsPage() {
  const collections = (await listPublishedCollections()).map((published) => published.collection);
  if (collections.length === 0) notFound();

  const offers = await Promise.all(
    collections.map(async (collection) => (collection.availability === "open" ? offerOrNull(await loadLiveOffer(collection.slug)) : null))
  );
  const entries = collections.map((collection, index) =>
    toBookcaseEntry(collection, offers[index]?.formattedPrice ?? collection.placeholderPrice)
  );
  // Shelves with books to open come first, so the page does not open on a row of "coming soon".
  const openOn = (key: string) => entries.filter((entry) => entry.shelf === key && entry.open).length;
  const shelves = [...SHELVES].sort((a, b) => openOn(b.key) - openOn(a.key));
  const series = (Object.keys(SERIES) as SeriesKey[]).map((key) => ({
    key,
    title: SERIES[key].title,
    lede: SERIES[key].lede,
    volumes: collections
      .filter((collection) => collection.series?.key === key)
      .sort((a, b) => (a.series?.volume ?? 0) - (b.series?.volume ?? 0))
      .map((collection) => collection.title),
  }));

  return (
    <div className="cl bk">
      <header className="bk-head">
        <h1 className="bk-title">Collections</h1>
        <p className="bk-lede">Little cookbooks for every stage.</p>
      </header>
      <Bookcase entries={entries} shelves={shelves} series={series} featured={featuredSlug(new Date())} />
      <section className="bk-note" aria-labelledby="bk-note-title">
        <h2 id="bk-note-title">How the books work</h2>
        <p>
          Each book is a one-time purchase: pay once, keep it, and get the recipes added later. Books are opening soon; until then,
          you can cook from our <Link href="/recipes">free recipes</Link>.
        </p>
      </section>
    </div>
  );
}
