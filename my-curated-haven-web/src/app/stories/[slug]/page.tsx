import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampaignClosing from "@/components/campaign/CampaignClosing";
import CampaignDock from "@/components/campaign/CampaignDock";
import CampaignHero from "@/components/campaign/CampaignHero";
import CampaignMotion from "@/components/campaign/CampaignMotion";
import { CampaignCollection, CampaignPack, OfferLadder } from "@/components/campaign/CampaignOffers";
import CampaignQuestions from "@/components/campaign/CampaignQuestions";
import CampaignRecipes from "@/components/campaign/CampaignRecipes";
import CampaignRelated from "@/components/campaign/CampaignRelated";
import CampaignTracker from "@/components/campaign/CampaignTracker";
import KitchenStory from "@/components/campaign/KitchenStory";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { plainCampaignTitle } from "@/lib/campaigns/validate";
import { loadCampaignPage } from "@/lib/data/load-campaign";

/**
 * Instagram campaign pages: the recipes a post promised, the people behind
 * them, and then (only then) the pack and collection that go with it. They
 * hold no account features, so each page is built on its first visit and served
 * from the cache to everyone after that, which keeps the first screen fast
 * inside Instagram's in-app browser.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  // Built on first request, not at deploy time, so a deploy never depends on the database.
  return [];
}

const getCampaignPage = cache(loadCampaignPage);

interface CampaignPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CampaignPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCampaignPage(slug);
  if (result.status !== "ok") {
    return { title: "Page not found", robots: { index: false, follow: false } };
  }

  const { campaign, recipes, hero } = result.data;
  const title = plainCampaignTitle(campaign.title);
  const url = `${SITE_ORIGIN}/stories/${campaign.slug}`;
  // A one-recipe page repeats that recipe, so the recipe page is the copy search engines should list.
  const canonical = recipes.length === 1 ? `${SITE_ORIGIN}/recipes/${recipes[0].slug}` : url;
  return {
    title,
    description: campaign.subtitle,
    alternates: { canonical },
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description: campaign.subtitle,
      url,
      type: "article",
      images: [{ url: hero.src, alt: hero.alt }],
    },
  };
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { slug } = await params;
  const result = await getCampaignPage(slug);
  if (result.status !== "ok") notFound();

  const data = result.data;
  const { campaign, recipes, story, pack, collection, related, offerState } = data;
  const showPack = Boolean(pack && campaign.featuredPack);
  const showCollection = Boolean(collection && campaign.featuredCollection);
  // The comparison sits with the last offer on the page.
  const ladder =
    showPack || showCollection ? (
      <OfferLadder freeCount={recipes.length} pack={showPack ? pack : null} collection={showCollection ? collection : null} />
    ) : null;
  // Chapter numbers for the kickers, counted over the sections this page actually shows.
  const chapters = [
    "recipes",
    "story",
    ...(showPack ? ["pack"] : []),
    ...(showCollection ? ["collection"] : []),
    ...(related.length > 0 ? ["related"] : []),
    "questions",
  ];
  const chapter = (key: string) => String(chapters.indexOf(key) + 1).padStart(2, "0");

  return (
    <div className="campaign" data-theme={campaign.theme} data-campaign={campaign.slug}>
      <span className="cp-progress" aria-hidden="true" />
      <CampaignTracker
        slug={campaign.slug}
        room={campaign.room}
        recipeCount={recipes.length}
        offerState={offerState}
        series={campaign.analytics?.series}
      />
      <CampaignHero data={data} />
      <CampaignRecipes data={data} index={chapter("recipes")} />
      <KitchenStory story={story} motif={campaign.motif} index={chapter("story")} />
      {showPack ? (
        <CampaignPack copy={campaign.featuredPack!} offer={pack!} ladder={showCollection ? null : ladder} index={chapter("pack")} />
      ) : null}
      {showCollection ? (
        <CampaignCollection copy={campaign.featuredCollection!} offer={collection!} ladder={ladder} index={chapter("collection")} />
      ) : null}
      <CampaignRelated recipes={related} index={chapter("related")} />
      <CampaignQuestions data={data} index={chapter("questions")} />
      <CampaignClosing data={data} />
      <CampaignDock data={data} />
      <CampaignMotion />
    </div>
  );
}
