export const HOMEPAGE_CONTENT_VERSION = "hv-2026-09-24" as const;

export type HomepageFeatureKey = "chat" | "shop" | "bloom";
export type HomepagePlacement = "hero" | "overview" | "preview" | "footer" | "final";
export type HomepageDestination =
  | "recipes_index"
  | "recipe_detail"
  | "collection_detail"
  | "previews"
  | "about"
  | "support";

export type HomepageRecipePresentationState =
  | { mode: "preparation" }
  | { mode: "free_ready"; approvedRecipeSlugs: readonly string[] }
  | {
      mode: "collection_ready";
      approvedRecipeSlugs: readonly string[];
      collection: {
        slug: string;
        href: string;
        releaseVersion: string;
        ownerApproved: true;
        summary: string;
      };
    };

export const DEFAULT_HOMEPAGE_RECIPE_STATE: HomepageRecipePresentationState = {
  mode: "preparation",
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_APPROVED_RECIPE_SLUGS = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function safeText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength &&
    !/[\u0000-\u001f\u007f-\u009f]/.test(value) &&
    !/https?:\/\//i.test(value) &&
    !/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(value)
  );
}

function approvedSlugs(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_APPROVED_RECIPE_SLUGS &&
    value.every((slug) => typeof slug === "string" && SLUG_PATTERN.test(slug)) &&
    new Set(value).size === value.length
  );
}

/** Resolve authored readiness data safely; malformed readiness always returns to preparation. */
export function resolveHomepageRecipeState(
  value: unknown = DEFAULT_HOMEPAGE_RECIPE_STATE,
): HomepageRecipePresentationState {
  if (!isRecord(value) || typeof value.mode !== "string") {
    return DEFAULT_HOMEPAGE_RECIPE_STATE;
  }

  if (value.mode === "preparation" && hasOnlyKeys(value, ["mode"])) {
    return DEFAULT_HOMEPAGE_RECIPE_STATE;
  }

  if (
    value.mode === "free_ready" &&
    hasOnlyKeys(value, ["mode", "approvedRecipeSlugs"]) &&
    approvedSlugs(value.approvedRecipeSlugs)
  ) {
    return { mode: "free_ready", approvedRecipeSlugs: [...value.approvedRecipeSlugs] };
  }

  if (
    value.mode !== "collection_ready" ||
    !hasOnlyKeys(value, ["mode", "approvedRecipeSlugs", "collection"]) ||
    !approvedSlugs(value.approvedRecipeSlugs) ||
    !isRecord(value.collection) ||
    !hasOnlyKeys(value.collection, ["slug", "href", "releaseVersion", "ownerApproved", "summary"])
  ) {
    return DEFAULT_HOMEPAGE_RECIPE_STATE;
  }

  const collection = value.collection;
  if (
    typeof collection.slug !== "string" ||
    !SLUG_PATTERN.test(collection.slug) ||
    collection.href !== `/collections/${collection.slug}` ||
    !safeText(collection.releaseVersion, 64) ||
    collection.ownerApproved !== true ||
    !safeText(collection.summary, 240)
  ) {
    return DEFAULT_HOMEPAGE_RECIPE_STATE;
  }

  return {
    mode: "collection_ready",
    approvedRecipeSlugs: [...value.approvedRecipeSlugs],
    collection: {
      slug: collection.slug,
      href: collection.href,
      releaseVersion: collection.releaseVersion,
      ownerApproved: true,
      summary: collection.summary,
    },
  };
}

export interface HomepageRecipeSlot<T> {
  slot: number;
  recipe: T & { slug: string };
}

/** Keep only explicitly approved assigned recipes, in slot order, with a hard maximum of three. */
export function projectHomepageRecipes<T extends { slug: string }>(
  state: HomepageRecipePresentationState,
  slots: readonly HomepageRecipeSlot<T>[],
): HomepageRecipeSlot<T>[] {
  if (state.mode === "preparation") return [];
  const approved = new Set(state.approvedRecipeSlugs);
  const seen = new Set<string>();
  return [...slots]
    .filter(({ slot, recipe }) => Number.isInteger(slot) && slot > 0 && approved.has(recipe.slug))
    .sort((left, right) => left.slot - right.slot)
    .filter(({ recipe }) => {
      if (seen.has(recipe.slug)) return false;
      seen.add(recipe.slug);
      return true;
    })
    .slice(0, MAX_APPROVED_RECIPE_SLUGS);
}

export const HOMEPAGE_RECIPE_STATE = resolveHomepageRecipeState();

export const HOME_PILLARS = [
  { key: "recipes", label: "Recipes", href: "#recipes", description: "The first place to start." },
  { key: "chat", label: "Parenting Chat", href: "#parenting-chat-preview", description: "A look at thoughtful everyday support." },
  { key: "shop", label: "Curated Shop", href: "#curated-shop-preview", description: "A look at considered family finds." },
  { key: "bloom", label: "Bloom", href: "#bloom-preview", description: "A look at small moments and milestones." },
] as const;

export const HOME_FEATURE_PREVIEWS = [
  {
    key: "chat",
    id: "parenting-chat-preview",
    label: "Parenting Chat",
    heading: "Everyday questions deserve thoughtful support.",
    summary: "A glimpse of the kind of parenting conversation My Curated Haven is exploring.",
    caption: "Illustrative preview based on our parenting app. The final web experience will differ.",
  },
  {
    key: "shop",
    id: "curated-shop-preview",
    label: "Curated Shop",
    heading: "Parenting products, thoughtfully gathered.",
    summary: "A glimpse of a considered place for everyday family categories and ideas.",
    caption: "Illustrative preview based on our parenting app. The final web experience will differ.",
  },
  {
    key: "bloom",
    id: "bloom-preview",
    label: "Bloom",
    heading: "A place for the little milestones.",
    summary: "A glimpse of a gentle way to notice the small moments in family life.",
    caption: "Illustrative preview based on our parenting app. The final web experience will differ.",
  },
] as const;
