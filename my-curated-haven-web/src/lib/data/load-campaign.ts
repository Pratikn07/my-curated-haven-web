import { KITCHEN_STORY } from "@/config/kitchen-story";
import type { Campaign, CampaignImage, KitchenStory } from "@/lib/campaigns/types";
import { getCampaign } from "@/lib/data/campaigns";
import { getFreeRecipeCatalog, type RecipeCatalogItem } from "@/lib/data/recipes";
import { getStripeConfig } from "@/lib/payments/config";
import { getCollectionOfferDetails } from "@/lib/payments/repository";
import type { CollectionRecipeSummary } from "@/lib/payments/types";
import { usableImageSrc } from "@/lib/recipes/format";
import { createPublicClient } from "@/lib/supabase/public";

export interface CampaignRecipe extends RecipeCatalogItem {
  /** 1-based, in the order the post promised them. */
  position: number;
  note?: string;
}

export interface CampaignOfferData {
  collectionSlug: string;
  title: string;
  summary: string;
  formattedPrice: string;
  recipeCount: number;
  /** A few of the offer's recipes, paid ones first, shown as what's waiting inside. */
  preview: CollectionRecipeSummary[];
}

/** Which paid options the page showed, for analytics. */
export type CampaignOfferState = "none" | "pack" | "collection" | "both";

export interface CampaignPageData {
  campaign: Campaign;
  recipes: CampaignRecipe[];
  hero: CampaignImage;
  story: KitchenStory;
  pack: CampaignOfferData | null;
  collection: CampaignOfferData | null;
  offerState: CampaignOfferState;
  related: RecipeCatalogItem[];
}

export type CampaignLoadResult = { status: "ok"; data: CampaignPageData } | { status: "not_found" };

const RELATED_LIMIT = 6;

/**
 * Everything one campaign page needs, read as an anonymous visitor so the page
 * can be cached for everyone. Fails closed: a promised recipe that isn't free is
 * left out, a campaign with none left is not found, and an offer appears only
 * when it can really be bought.
 */
export async function loadCampaignPage(slug: string): Promise<CampaignLoadResult> {
  const campaign = await getCampaign(slug);
  if (!campaign) return { status: "not_found" };

  // Only free recipes: the page promises them without an account. A failed lookup is an error, not "none".
  const free = await getFreeRecipeCatalog(createPublicClient());
  const bySlug = new Map(free.map((recipe) => [recipe.slug, recipe]));

  const recipes: CampaignRecipe[] = [];
  for (const ref of campaign.recipes) {
    const recipe = bySlug.get(ref.slug);
    if (!recipe) {
      console.warn("[campaigns] A promised recipe is not free or not published", { campaign: slug, recipe: ref.slug });
      continue;
    }
    recipes.push({ ...recipe, position: recipes.length + 1, note: ref.note });
  }
  if (recipes.length === 0) return { status: "not_found" };

  const story = campaign.story ?? KITCHEN_STORY;
  const { pack, collection } = await loadOffers(campaign);

  return {
    status: "ok",
    data: {
      campaign,
      recipes,
      hero: pickHero(campaign, recipes, story),
      story,
      pack,
      collection,
      offerState: pack && collection ? "both" : pack ? "pack" : collection ? "collection" : "none",
      related: pickRelated(campaign, free, recipes),
    },
  };
}

function pickHero(campaign: Campaign, recipes: CampaignRecipe[], story: KitchenStory): CampaignImage {
  if (campaign.hero) return campaign.hero;
  const withPhoto = recipes.find((recipe) => usableImageSrc(recipe.previewImagePath));
  if (withPhoto) return { src: usableImageSrc(withPhoto.previewImagePath)!, alt: withPhoto.title };
  // Last resort: the kitchen itself, so the first screen is never an empty frame.
  return story.moments[story.moments.length - 1].image;
}

function pickRelated(campaign: Campaign, free: RecipeCatalogItem[], promised: CampaignRecipe[]): RecipeCatalogItem[] {
  const shown = new Set(promised.map((recipe) => recipe.slug));
  const candidates = free.filter((recipe) => !shown.has(recipe.slug));
  if (!campaign.relatedRecipeSlugs) return candidates.slice(0, RELATED_LIMIT);
  const bySlug = new Map(candidates.map((recipe) => [recipe.slug, recipe]));
  return campaign.relatedRecipeSlugs
    .map((slug) => bySlug.get(slug))
    .filter((recipe): recipe is RecipeCatalogItem => Boolean(recipe))
    .slice(0, RELATED_LIMIT);
}

async function loadOffers(campaign: Campaign): Promise<{ pack: CampaignOfferData | null; collection: CampaignOfferData | null }> {
  if (!getStripeConfig().checkoutEnabled) return { pack: null, collection: null };
  const [pack, collection] = await Promise.all([
    campaign.featuredPack ? loadOffer(campaign.featuredPack.collectionSlug, 4) : null,
    campaign.featuredCollection ? loadOffer(campaign.featuredCollection.collectionSlug, 6) : null,
  ]);
  // One product should never be offered twice on the same page.
  if (pack && collection && pack.collectionSlug === collection.collectionSlug) return { pack: null, collection };
  return { pack, collection };
}

async function loadOffer(collectionSlug: string, previewCount: number): Promise<CampaignOfferData | null> {
  try {
    const offer = await getCollectionOfferDetails(collectionSlug);
    if (!offer || !offer.saleEnabled) return null;
    const paidFirst = [...offer.recipes.filter((recipe) => !recipe.isFree), ...offer.recipes.filter((recipe) => recipe.isFree)];
    return {
      collectionSlug: offer.collectionSlug,
      title: offer.collectionTitle,
      summary: offer.collectionSummary,
      formattedPrice: offer.formattedPrice,
      recipeCount: offer.recipes.length,
      preview: paidFirst.slice(0, previewCount),
    };
  } catch (error) {
    // The commerce database is not deployed everywhere; no offer is the safe answer (R8-05).
    console.error("[campaigns] offer unavailable", error instanceof Error ? error.message : error);
    return null;
  }
}
