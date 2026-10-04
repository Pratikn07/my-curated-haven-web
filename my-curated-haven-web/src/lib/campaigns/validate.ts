import type { Campaign, CampaignImage, CampaignOfferCopy, KitchenStory } from "./types";

export const CAMPAIGN_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SERIES_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
const KEYWORD_PATTERN = /^[A-Z0-9]{2,20}$/;
const ORIGIN_PATTERN = /^\d{1,3}% \d{1,3}%$/;
const THEMES = new Set(["kitchen", "berry", "harvest", "halloween", "festive"]);
const MOTIFS = new Set(["none", "berries", "oats", "leaves", "stars"]);

export const MAX_CAMPAIGN_RECIPES = 12;

function usableSrc(src: string): boolean {
  return src.startsWith("/") || /^https:\/\//.test(src);
}

function checkImage(errors: string[], where: string, image: CampaignImage | undefined) {
  if (!image) return;
  if (!usableSrc(image.src)) errors.push(`${where}: image src must be root-relative or https`);
  if (!image.alt.trim()) errors.push(`${where}: image needs alt text`);
}

function checkOffer(errors: string[], where: string, offer: CampaignOfferCopy | undefined) {
  if (!offer) return;
  if (!CAMPAIGN_SLUG_PATTERN.test(offer.collectionSlug)) errors.push(`${where}: collectionSlug is not a slug`);
  if (!offer.lead.trim()) errors.push(`${where}: lead is empty`);
}

function checkStory(errors: string[], story: KitchenStory | undefined) {
  if (!story) return;
  if (story.moments.length < 1 || story.moments.length > 6) errors.push("story: needs 1 to 6 moments");
  story.moments.forEach((moment, index) => {
    checkImage(errors, `story moment ${index + 1}`, moment.image);
    if (!ORIGIN_PATTERN.test(moment.origin)) errors.push(`story moment ${index + 1}: origin must look like "40% 60%"`);
    if (!moment.line.trim()) errors.push(`story moment ${index + 1}: line is empty`);
  });
  if (story.note.paragraphs.length === 0) errors.push("story: note needs a paragraph");
}

/**
 * Problems that would make a campaign page wrong or broken. An empty list means
 * the campaign can be served. Shared by the static config and any future admin.
 */
export function validateCampaign(campaign: Campaign): string[] {
  const errors: string[] = [];
  if (!CAMPAIGN_SLUG_PATTERN.test(campaign.slug)) errors.push("slug must be lowercase letters, numbers and hyphens");
  if (!THEMES.has(campaign.theme)) errors.push(`unknown theme "${campaign.theme}"`);
  if (campaign.motif && !MOTIFS.has(campaign.motif)) errors.push(`unknown motif "${campaign.motif}"`);
  if (!campaign.title.trim() || campaign.title.length > 90) errors.push("title must be 1 to 90 characters");
  if ((campaign.title.match(/\*/g) ?? []).length % 2 !== 0) errors.push("title has an unclosed *emphasis*");
  if (!campaign.subtitle.trim()) errors.push("subtitle is empty");

  if (campaign.recipes.length < 1 || campaign.recipes.length > MAX_CAMPAIGN_RECIPES) {
    errors.push(`needs 1 to ${MAX_CAMPAIGN_RECIPES} recipes`);
  }
  const slugs = campaign.recipes.map((recipe) => recipe.slug);
  if (new Set(slugs).size !== slugs.length) errors.push("a recipe is listed twice");
  for (const slug of slugs) {
    if (!CAMPAIGN_SLUG_PATTERN.test(slug)) errors.push(`recipe "${slug}" is not a slug`);
  }

  checkImage(errors, "hero", campaign.hero);
  checkOffer(errors, "featuredPack", campaign.featuredPack);
  if (campaign.featuredPack && !campaign.featuredPack.heading.trim()) errors.push("featuredPack: heading is empty");
  checkOffer(errors, "featuredCollection", campaign.featuredCollection);
  if (campaign.featuredCollection && !campaign.featuredCollection.growsLine.trim()) {
    errors.push("featuredCollection: growsLine is empty");
  }
  checkStory(errors, campaign.story);

  if (campaign.analytics?.series && !SERIES_PATTERN.test(campaign.analytics.series)) {
    errors.push("analytics.series must be a short slug");
  }
  for (const keyword of [campaign.wayBackKeyword, campaign.instagram?.keyword]) {
    if (keyword && !KEYWORD_PATTERN.test(keyword)) errors.push(`keyword "${keyword}" must be capital letters or numbers`);
  }
  return errors;
}

export type TitlePart = { text: string; emphasis: boolean };

/** "3 Breakfasts *Worth Saving*" → plain and emphasised parts. No HTML is ever read from config. */
export function parseCampaignTitle(title: string): TitlePart[] {
  return title
    .split("*")
    .map((text, index) => ({ text, emphasis: index % 2 === 1 }))
    .filter((part) => part.text.length > 0);
}

export function plainCampaignTitle(title: string): string {
  return title.replaceAll("*", "").replace(/\s+/g, " ").trim();
}

export type RecipeLayout = "single" | "pair" | "trio" | "grid";

export interface RecipeLayoutPlan {
  layout: RecipeLayout;
  /** Columns on large screens. */
  columns: number;
  /** Phones show short rows instead of tall cards once the list gets long. */
  compactOnPhones: boolean;
}

/**
 * How the promised recipes are laid out, from how many there are, so a post
 * with one recipe and a post with seven both read as designed, never as a
 * half-empty grid.
 */
export function planRecipeLayout(count: number): RecipeLayoutPlan {
  if (count <= 1) return { layout: "single", columns: 1, compactOnPhones: false };
  if (count === 2) return { layout: "pair", columns: 2, compactOnPhones: false };
  if (count === 3) return { layout: "trio", columns: 3, compactOnPhones: false };
  // Avoid a lonely last card: 4 → one row, 5 → 3+2, 6 → 3+3, 7 → 4+3, 8 → 4+4, 9 → 3×3. Tablets show two per row.
  const columns = count % 3 === 0 || count === 5 ? 3 : 4;
  return { layout: "grid", columns, compactOnPhones: true };
}

/** "1 free recipe", "5 free recipes". */
export function recipeCountLabel(count: number, adjective = ""): string {
  const word = count === 1 ? "recipe" : "recipes";
  return [String(count), adjective, word].filter(Boolean).join(" ");
}
