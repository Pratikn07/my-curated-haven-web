import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCover } from "@/components/collections/Book";
import SeriesMarker from "@/components/collections/SeriesMarker";
import { SERIES } from "@/config/collections";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { STAGE_OPTIONS, fitsStage, stageLabel } from "@/lib/collections/bookcase";
import type { SeriesKey } from "@/lib/collections/types";
import { listShowroomCollections, loadLiveOffer } from "@/lib/data/collections-showroom";

interface SeriesPageProps {
  params: Promise<{ series: string }>;
}

/**
 * A series: numbered volumes of one theme that follow a child from baby to
 * big kid (Breakfast, Meal Prep). Each volume opens to its own page when it has
 * enough recipes; the bundle price is a PLACEHOLDER until offers exist.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return (Object.keys(SERIES) as SeriesKey[]).map((series) => ({ series }));
}

function isSeriesKey(value: string): value is SeriesKey {
  return Object.hasOwn(SERIES, value);
}

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const { series } = await params;
  if (!isSeriesKey(series)) return { title: "Series Not Found", robots: { index: false, follow: false } };
  const info = SERIES[series];
  return {
    title: info.title,
    description: `${info.heading}. ${info.lede}`,
    alternates: { canonical: `${SITE_ORIGIN}/collections/series/${series}` },
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { series } = await params;
  if (!isSeriesKey(series)) notFound();
  const info = SERIES[series];
  const volumes = listShowroomCollections()
    .filter((collection) => collection.series?.key === series)
    .sort((a, b) => (a.series?.volume ?? 0) - (b.series?.volume ?? 0));
  if (volumes.length === 0) notFound();

  const offers = await Promise.all(volumes.map((v) => (v.availability === "open" ? loadLiveOffer(v.slug) : Promise.resolve(null))));
  // Which age band each volume answers to, for the "Your child is here" marker.
  const stops = volumes.map((volume) => STAGE_OPTIONS.find((option) => option.key !== "all" && fitsStage(volume.stage, option.key))?.key ?? null);
  const allOpen = volumes.every((volume) => volume.availability === "open");

  return (
    <div className="cl bk bk-seriespage">
      <nav className="bk-crumbs" aria-label="Breadcrumb">
        <Link href="/collections">Collections</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{info.title}</span>
      </nav>
      <header className="bk-head">
        <h1 className="bk-title bk-title-series">{info.heading}</h1>
        <p className="bk-lede">{info.lede}</p>
      </header>

      <ol className="bk-volumes" id="volumes">
        {volumes.map((volume, index) => {
          const open = volume.availability === "open";
          const price = offers[index]?.formattedPrice ?? volume.placeholderPrice;
          const body = (
            <>
              <span className="bk-volume-cover">
                <BookCover book={volume} sizes="(min-width: 768px) 13rem, 30vw" />
              </span>
              <span className="bk-volume-label">Vol. {volume.series?.volume}</span>
              <span className="bk-volume-title">{volume.title}</span>
              <span className="bk-volume-meta">{stageLabel(volume.stage)}</span>
              <span className="bk-volume-meta">{open ? price : "Coming soon"}</span>
            </>
          );
          return (
            <li key={volume.slug} className="bk-volume" data-volume={volume.series?.volume} data-soon={open ? undefined : ""}>
              {open ? (
                <Link className="bk-volume-link" href={`/collections/${volume.slug}`}>
                  {body}
                </Link>
              ) : (
                <div className="bk-volume-link" role="group" aria-label={`Vol. ${volume.series?.volume}, ${volume.title}, coming soon`}>
                  <span aria-hidden="true">{body}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <SeriesMarker stops={stops} />

      <section className="bk-bundle" aria-labelledby="bk-bundle-title">
        <h2 id="bk-bundle-title" className="bk-bundle-title">
          {info.bundlePrice ? `Get all ${volumes.length} · ${info.bundlePrice}` : `${volumes.length} volumes, one at a time`}
        </h2>
        <p className="bk-bundle-note">
          {allOpen
            ? "Each volume is a one-time purchase. Opening soon."
            : "Some volumes are still being written. The set opens when all of them are ready."}
        </p>
        <a className="bk-bundle-cta" href="#volumes">
          Choose a volume <span aria-hidden="true">→</span>
        </a>
      </section>
    </div>
  );
}
