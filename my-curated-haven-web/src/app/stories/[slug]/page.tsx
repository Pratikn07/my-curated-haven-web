import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StoryAbout,
  StoryCard,
  StoryMoreFromKitchen,
  StoryOffer,
  StoryQuestions,
  StoryRecipe,
  StorySaveCard,
  StoryWayBack,
  recipeActionLabel,
} from "@/components/stories/StoryBlocks";
import { StoryStickyAction, StoryTracker } from "@/components/stories/StoryClient";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { loadStoryPage } from "@/lib/data/load-story";
import { usableImageSrc } from "@/lib/recipes/format";

/**
 * Instagram landing pages. They hold no account features, so each page is
 * built on its first visit and served from the cache to everyone after that,
 * which keeps the first screen fast inside Instagram's in-app browser.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  // Built on first request, not at deploy time, so a deploy never depends on the database.
  return [];
}

const getStoryPage = cache(loadStoryPage);

interface StoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getStoryPage(slug);
  if (result.status !== "ok") {
    return { title: "Page not found", robots: { index: false, follow: false } };
  }

  const { story, recipe } = result.data;
  const image = story.cover?.src ?? usableImageSrc(recipe.catalog.previewImagePath);
  return {
    title: story.headline,
    description: recipe.catalog.publicSummary,
    // The recipe page is the one copy search engines should list.
    alternates: { canonical: `${SITE_ORIGIN}/recipes/${recipe.catalog.slug}` },
    robots: { index: false, follow: true },
    openGraph: {
      title: story.headline,
      description: recipe.catalog.publicSummary,
      url: `${SITE_ORIGIN}/stories/${story.slug}`,
      type: "article",
      images: image ? [{ url: image, alt: recipe.catalog.title }] : [],
    },
  };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params;
  const result = await getStoryPage(slug);
  if (result.status !== "ok") notFound();

  const { story, recipe, moreRecipes, offer } = result.data;

  return (
    <div className="story" data-story={story.slug}>
      <StoryTracker slug={story.slug} room={story.room} />
      <StoryCard story={story} recipe={recipe} />
      <div className="story-after">
        <StoryRecipe recipe={recipe} />
        <StorySaveCard recipe={recipe} />
        <StoryAbout story={story} />
        {offer ? <StoryOffer story={story} offer={offer} /> : <StoryMoreFromKitchen recipes={moreRecipes} />}
        <StoryQuestions story={story} offer={offer} />
        <StoryWayBack story={story} offer={offer} />
      </div>
      <StoryStickyAction label={recipeActionLabel(recipe)} />
    </div>
  );
}
