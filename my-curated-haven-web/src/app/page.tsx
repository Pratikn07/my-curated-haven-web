import type { Metadata } from "next";
import Hero from "@/components/Hero";
import BrandStory from "@/components/home/BrandStory";
import CollectionSummary from "@/components/home/CollectionSummary";
import FinalHomepageAction from "@/components/home/FinalHomepageAction";
import HomeFaq from "@/components/home/HomeFaq";
import HomeRecipes from "@/components/home/HomeRecipes";
import HomepagePreviewTracker from "@/components/home/HomepagePreviewTracker";
import PillarOverview from "@/components/home/PillarOverview";
import { WhatsAhead } from "@/components/home/FeaturePreview";
import { HOMEPAGE_RECIPE_STATE } from "@/config/homepage-content";
import { SITE_ORIGIN } from "@/config/site-navigation";

const pageTitle = "My Curated Haven | Recipes and a glimpse of what's ahead";
const pageDescription =
  "A parenting companion starting with toddler recipes by Tiny Soho. Parenting Chat, Curated Shop and Bloom are planned for the web.";
const socialImageAlt =
  "My Curated Haven is starting with recipes by Tiny Soho, with clearly labelled previews of what may be ahead.";

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

export default function Home() {
  return (
    <>
      <Hero />
      <PillarOverview />
      <HomeRecipes />
      <CollectionSummary state={HOMEPAGE_RECIPE_STATE} />
      <WhatsAhead />
      <HomepagePreviewTracker />
      <BrandStory />
      <HomeFaq state={HOMEPAGE_RECIPE_STATE} />
      <FinalHomepageAction />
    </>
  );
}
