import type { Metadata } from "next";
import HavenHero from "@/components/house/HavenHero";
import CollectionSummary from "@/components/home/CollectionSummary";
import HavenPromises from "@/components/home/HavenPromises";
import HomeFaq from "@/components/home/HomeFaq";
import HomeRecipes from "@/components/home/HomeRecipes";
import LibraryPreview from "@/components/home/LibraryPreview";
import { HOMEPAGE_RECIPE_STATE } from "@/config/homepage-content";
import { SITE_ORIGIN } from "@/config/site-navigation";
import { loadHomepageRecipes } from "@/lib/data/load-homepage-recipes";

const pageTitle = "My Curated Haven | A calm corner for parents of little ones";
const pageDescription =
  "Free toddler recipes by Tiny Soho you can read or print without an account, with storybooks and more rooms on the way.";
const socialImageAlt = "My Curated Haven: good enough is exactly enough. Free toddler recipes by Tiny Soho.";

export const metadata: Metadata = {
  title: { absolute: pageTitle },
  description: pageDescription,
  alternates: { canonical: `${SITE_ORIGIN}/` },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_ORIGIN}/`,
    siteName: "My Curated Haven",
    title: pageTitle,
    description: pageDescription,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: socialImageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [{ url: "/opengraph-image", alt: socialImageAlt }],
  },
};

export default async function Home() {
  const recipes = await loadHomepageRecipes();
  const kitchenRecipes =
    recipes.status === "ready"
      ? recipes.recipes.map(({ slug, title, totalMinutes }) => ({ slug, title, totalMinutes }))
      : [];

  return (
    <>
      <HavenHero kitchenRecipes={kitchenRecipes} />
      <HomeRecipes data={recipes} />
      <CollectionSummary state={HOMEPAGE_RECIPE_STATE} />
      <LibraryPreview />
      <HavenPromises />
      <HomeFaq state={HOMEPAGE_RECIPE_STATE} />
    </>
  );
}
