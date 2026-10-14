import { EVERYDAY_PHOTOS, type EverydayPhoto } from "@/config/everyday-photos";
import { HALLOWEEN_COLLECTION_SLUG, HALLOWEEN_MENU, type HalloweenDish } from "@/config/halloween";
import type { CollectionRecipe } from "@/lib/collections/types";
import { getPublishedCollection, loadLiveOffer } from "@/lib/data/collections-showroom";
import { getFreeRecipeCatalog, type RecipeCatalogItem } from "@/lib/data/recipes";
import { createPublicClient } from "@/lib/supabase/public";

/** Where a recipe's link goes: its own page when it is free, otherwise the book that has it. */
export interface HalloweenLink {
  href: string;
  free: boolean;
  /** Catalog id, only for free recipes (analytics). */
  recipeId?: string;
}

export interface HalloweenMenuItem extends HalloweenDish, HalloweenLink {
  /** 1-based, in menu order. */
  position: number;
  title: string;
  minutes: number | null;
  allergens: readonly string[];
  freezes: string | null;
  /** The recipe's own photo (the Halloween half of the slider): a site path or Storage URL. */
  image: string;
  /** The same shot without the Halloween step, or null to show the photo alone. */
  everyday: EverydayPhoto | null;
}

export interface HalloweenBookData {
  href: string;
  title: string;
  /** In book order. `image` is a site path or Storage URL; `href` is the recipe when free, else the book. */
  recipes: { slug: string; title: string; image: string; free: boolean; href: string }[];
  /** The live price while the offer is on sale, otherwise the collection's placeholder. */
  price: string;
  onSale: boolean;
  /** What "new recipes join" means for this book, from the collection. */
  refresh: string;
}

export interface HalloweenPageData {
  menu: HalloweenMenuItem[];
  freeCount: number;
  book: HalloweenBookData;
}

/**
 * Everything /halloween needs, read as an anonymous visitor so the page can be
 * cached for everyone. Fails closed: a recipe is only called free, and only
 * linked to its own page, when the free catalog says so; otherwise its link
 * goes to the Halloween collection, so no tap ever lands on a page that would
 * not open. The price is live only while commerce has the offer on sale.
 */
export async function loadHalloweenPage(): Promise<HalloweenPageData | null> {
  const published = await getPublishedCollection(HALLOWEEN_COLLECTION_SLUG);
  if (!published) return null;
  const collection = published.collection;
  const bookHref = `/collections/${collection.slug}`;

  const free = new Map((await loadFreeRecipes()).map((recipe) => [recipe.slug, recipe]));
  const inBook = new Map(collection.recipes.map((recipe) => [recipe.slug, recipe]));

  const linkFor = (slug: string): HalloweenLink => {
    const recipe = free.get(slug);
    return recipe ? { href: `/recipes/${slug}`, free: true, recipeId: recipe.id } : { href: bookHref, free: false };
  };

  const menu: HalloweenMenuItem[] = [];
  for (const dish of HALLOWEEN_MENU) {
    const recipe: CollectionRecipe | undefined = inBook.get(dish.slug);
    if (!recipe) {
      console.warn("[halloween] A menu recipe is not in the Halloween collection", { recipe: dish.slug });
      continue;
    }
    menu.push({
      ...dish,
      ...linkFor(dish.slug),
      position: menu.length + 1,
      title: recipe.title,
      minutes: recipe.minutes,
      allergens: recipe.allergens,
      freezes: recipe.freezes,
      image: recipe.image,
      everyday: EVERYDAY_PHOTOS[dish.slug] ?? null,
    });
  }

  const live = await loadLiveOffer(collection.slug);
  const offer = live.ok ? live.offer : null;
  // On sale only when checkout would take the order: an enabled offer that collection_sellable also
  // picks (`expected`). Otherwise this page could say "Get it" while the collection page refuses.
  const onSale = Boolean(offer?.saleEnabled && offer.expected);

  return {
    menu,
    freeCount: menu.filter((item) => item.free).length,
    book: {
      href: bookHref,
      title: collection.title,
      recipes: collection.recipes.map((recipe) => ({
        slug: recipe.slug,
        title: recipe.title,
        image: recipe.image,
        ...linkFor(recipe.slug),
      })),
      price: onSale && offer ? offer.formattedPrice : collection.placeholderPrice,
      onSale,
      refresh: collection.refresh,
    },
  };
}

/**
 * The free catalog. At request time a failed lookup is an error, not "none free", so a cached page keeps
 * its last good copy. During a build it is "none free" instead (every link then goes to the collection,
 * which is safe), so a database blip never fails a deploy; the hourly refresh fills in the real answer.
 */
async function loadFreeRecipes(): Promise<RecipeCatalogItem[]> {
  try {
    return await getFreeRecipeCatalog(createPublicClient());
  } catch (error) {
    if (process.env.NEXT_PHASE !== "phase-production-build") throw error;
    console.warn("[halloween] Free recipes unavailable during the build; linking every dish to the collection", error instanceof Error ? error.message : error);
    return [];
  }
}
