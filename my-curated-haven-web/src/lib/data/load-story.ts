import { getStory, type StoryConfig } from "@/config/stories";
import {
  getFreeRecipeCatalog,
  getRecipeBySlug,
  type RecipeCatalogItem,
  type RecipeWithBody,
} from "@/lib/data/recipes";
import { getStripeConfig } from "@/lib/payments/config";
import { getCollectionOfferDetails } from "@/lib/payments/repository";
import type { CollectionRecipeSummary } from "@/lib/payments/types";
import { createPublicClient } from "@/lib/supabase/public";

export interface StoryOfferData {
  collectionSlug: string;
  collectionTitle: string;
  formattedPrice: string;
  recipeCount: number;
  /** A few of the collection's paid recipes, shown as what's waiting inside. */
  preview: CollectionRecipeSummary[];
}

export interface StoryPageData {
  story: StoryConfig;
  recipe: RecipeWithBody;
  moreRecipes: RecipeCatalogItem[];
  offer: StoryOfferData | null;
}

export type StoryLoadResult = { status: "ok"; data: StoryPageData } | { status: "not_found" };

/**
 * Everything one landing page needs, read as an anonymous visitor so the page
 * can be cached for everyone. Fails closed: a story whose recipe isn't free
 * returns not_found, and the offer is left out unless it can really be bought.
 */
export async function loadStoryPage(slug: string): Promise<StoryLoadResult> {
  const story = getStory(slug);
  if (!story) return { status: "not_found" };

  const client = createPublicClient();
  const result = await getRecipeBySlug(client, story.recipeSlug);
  if (result.status === "error") {
    throw new Error(`Story recipe unavailable: ${result.message}`);
  }
  if (result.status !== "ok") {
    console.warn("[stories] Story recipe is not readable by visitors", {
      story: story.slug,
      category: result.status,
    });
    return { status: "not_found" };
  }

  let moreRecipes: RecipeCatalogItem[] = [];
  try {
    const free = await getFreeRecipeCatalog(client);
    moreRecipes = free.filter((recipe) => recipe.slug !== story.recipeSlug).slice(0, 2);
  } catch {
    // The next step is optional; the recipe is the point of the page.
  }

  return {
    status: "ok",
    data: { story, recipe: result.recipe, moreRecipes, offer: await loadOffer(story) },
  };
}

async function loadOffer(story: StoryConfig): Promise<StoryOfferData | null> {
  if (!story.offer || !getStripeConfig().checkoutEnabled) return null;
  try {
    const offer = await getCollectionOfferDetails(story.offer.collectionSlug);
    if (!offer || !offer.saleEnabled) return null;
    return {
      collectionSlug: offer.collectionSlug,
      collectionTitle: offer.collectionTitle,
      formattedPrice: offer.formattedPrice,
      recipeCount: offer.recipes.length,
      preview: offer.recipes.filter((recipe) => !recipe.isFree).slice(0, 4),
    };
  } catch (error) {
    // The commerce database is not deployed everywhere; no offer is the safe answer (R8-05).
    console.error("[stories] offer unavailable", error instanceof Error ? error.message : error);
    return null;
  }
}
