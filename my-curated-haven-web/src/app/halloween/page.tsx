import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampaignTracker from "@/components/campaign/CampaignTracker";
import { ClockPill } from "@/components/halloween/HalloweenClient";
import HalloweenMotion from "@/components/halloween/HalloweenMotion";
import {
  HalloweenBook,
  HalloweenClosing,
  HalloweenHero,
  HalloweenReasons,
  HalloweenSky,
  HalloweenStory,
  HalloweenTricks,
} from "@/components/halloween/HalloweenSections";
import { HALLOWEEN_PATH, HALLOWEEN_SLUG, HALLOWEEN_TRICKS } from "@/config/halloween";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { loadHalloweenPage } from "@/lib/data/load-halloween";

/**
 * The Halloween landing page, where Instagram posts send parents. The first
 * screen is the menu of three recipes; the plan for the day (with the rendered
 * street), the reasons and the Halloween collection follow for anyone who keeps
 * scrolling. No account features, so it is built once and served from the cache,
 * which keeps the first screen fast inside Instagram's in-app browser.
 */
export const revalidate = 3600;

const TITLE = "Not-Scary Halloween Recipes for Toddlers";
const DESCRIPTION =
  "Ghost pops, mummy scrolls and pumpkin pillows: Halloween food little hands can hold, and our plan for a Halloween that isn't scary.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_ORIGIN}${HALLOWEEN_PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_ORIGIN}${HALLOWEEN_PATH}`,
    type: "website",
    images: [{ url: HALLOWEEN_TRICKS[0].dressed.src, alt: HALLOWEEN_TRICKS[0].dressed.alt }],
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
        <HalloweenHero menu={data.menu} freeCount={data.freeCount} />
        <HalloweenTricks tricks={data.tricks} />
        <HalloweenStory />
        <HalloweenReasons />
        <HalloweenBook book={data.book} freeCount={data.freeCount} />
        <HalloweenClosing />
      </div>
      <HalloweenMotion />
    </div>
  );
}
