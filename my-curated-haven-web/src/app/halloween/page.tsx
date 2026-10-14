import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampaignTracker from "@/components/campaign/CampaignTracker";
import { ClockPill, HalloweenDock } from "@/components/halloween/HalloweenClient";
import HalloweenMotion from "@/components/halloween/HalloweenMotion";
import {
  HalloweenBook,
  HalloweenBookCard,
  HalloweenClosing,
  HalloweenHero,
  HalloweenPlanStrip,
  HalloweenReasons,
  HalloweenRecipes,
  HalloweenSky,
  HalloweenStory,
} from "@/components/halloween/HalloweenSections";
import { HALLOWEEN_PATH, HALLOWEEN_PLAN_STRIP, HALLOWEEN_SHARE_IMAGE, HALLOWEEN_SLUG } from "@/config/halloween";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { loadHalloweenPage } from "@/lib/data/load-halloween";

/**
 * The Halloween landing page, where Instagram posts send parents. Under the
 * headline come the three recipes as before-and-after sliders (each marked Free
 * or In the book), then the book, the make-ahead plan that comes with it, and a buy bar on phones once the book scrolls away; the plan for the day (with the rendered street),
 * the reasons and the full book section follow for anyone who keeps scrolling. No account features, so it is built once and served from the cache,
 * which keeps the first screen fast inside Instagram's in-app browser.
 */
export const revalidate = 3600;

const TITLE = "Not-Scary Halloween Recipes for Toddlers";
const DESCRIPTION =
  "Ghost bark, mummy pops and spider bites: Halloween food little hands can hold, and our plan for a Halloween that isn't scary.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_ORIGIN}${HALLOWEEN_PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_ORIGIN}${HALLOWEEN_PATH}`,
    type: "website",
    images: [{ url: HALLOWEEN_SHARE_IMAGE.src, alt: HALLOWEEN_SHARE_IMAGE.alt }],
  },
};

export default async function HalloweenPage() {
  const data = await loadHalloweenPage();
  if (!data || data.menu.length === 0) notFound();

  return (
    <div className="hw">
      <HalloweenSky />
      <CampaignTracker
        slug={HALLOWEEN_SLUG}
        room="kitchen"
        recipeCount={data.freeCount}
        offerState={data.book.onSale ? "collection" : "none"}
        series="halloween-2026"
      />
      <ClockPill initial="Sat 31 Oct · Halloween" />
      <div className="hw-column">
        <HalloweenHero />
        <HalloweenRecipes menu={data.menu} />
        <HalloweenBookCard book={data.book} menu={data.menu} />
        <HalloweenPlanStrip />
        <HalloweenStory />
        <HalloweenReasons />
        <HalloweenBook book={data.book} freeCount={data.freeCount} />
        <HalloweenClosing />
      </div>
      <HalloweenDock
        title={data.book.title}
        price={data.book.price}
        count={data.book.recipes.length}
        extra={HALLOWEEN_PLAN_STRIP.dock}
        href={data.book.onSale ? `${data.book.href}#buy` : data.book.href}
        onSale={data.book.onSale}
      />
      <HalloweenMotion />
    </div>
  );
}
