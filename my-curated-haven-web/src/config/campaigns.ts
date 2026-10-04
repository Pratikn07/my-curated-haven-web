import type { Campaign, CampaignCollectionCopy, CampaignPackCopy } from "../lib/campaigns/types";

/**
 * One entry per Instagram post or selection, served at /stories/<slug>. The
 * page reads everything else (titles, photos, times, prices) from the catalog
 * and the commerce database, so adding a campaign never touches the page.
 * How to add one: docs/implementation/instagram-landing/CAMPAIGNS.md.
 *
 * Drafts render locally and on preview deployments only. Publish a campaign by
 * changing its status once the post and its words are final.
 */

const KITCHEN_COLLECTION: CampaignCollectionCopy = {
  collectionSlug: "comfort-haven-collection",
  eyebrow: "The larger collection",
  lead: "Every recipe in the collection today, each laid out like the free ones: ingredients, steps, allergens and how to store it.",
  includes: ["Every recipe in the collection today", "Printable recipe pages", "One-time purchase, no subscription"],
  // Owner decision C08: one purchase includes recipes added later.
  growsLine: "Plus every recipe we add to it later, at no extra cost.",
};

const LITTLE_HANDS_RECIPES: Campaign["recipes"] = [
  { slug: "sweet-potato-and-spinach-frittata-fingers", note: "Soft egg strips that keep well for busy mornings." },
  { slug: "soft-baked-blueberry-and-oat-bars", note: "Naturally sweet, from ripe banana and blueberries." },
  { slug: "salmon-and-pea-fish-cakes" },
];

export const CAMPAIGNS: readonly Campaign[] = [
  {
    // The first post. Its link already went out in DMs, so the address must keep working.
    slug: "frittata-fingers",
    status: "published",
    room: "kitchen",
    theme: "kitchen",
    motif: "leaves",
    title: "3 recipes *small hands can hold.*",
    subtitle: "A breakfast, a snack and a dinner, each one made to be picked up by tiny fingers.",
    instagram: { postedOn: "2026-10-03" },
    recipes: LITTLE_HANDS_RECIPES,
    featuredCollection: KITCHEN_COLLECTION,
  },
  {
    slug: "little-hands",
    status: "draft",
    room: "kitchen",
    theme: "berry",
    motif: "berries",
    title: "3 recipes *small hands can hold.*",
    subtitle: "A breakfast, a snack and a dinner, each one made to be picked up by tiny fingers.",
    instagram: { postedOn: "2026-10-04" },
    recipes: LITTLE_HANDS_RECIPES,
    featuredCollection: KITCHEN_COLLECTION,
    analytics: { series: "little-hands" },
  },
];

const LOCAL_PACK: CampaignPackCopy = {
  collectionSlug: "comfort-haven-collection",
  eyebrow: "More for this moment",
  heading: "Want more mornings like these?",
  lead: "A small pack of recipes picked for the same moment, laid out just like the free ones.",
  includes: ["Ingredients, steps, allergens and storage for each", "Printable recipe pages", "One-time purchase"],
};

/**
 * Campaigns on the seeded synthetic recipes, so local runs and CI render every
 * section: one recipe with the collection, and three recipes with a pack.
 * Never served on Vercel deployments.
 */
export const LOCAL_SAMPLE_CAMPAIGNS: readonly Campaign[] = [
  {
    slug: "local-sample-frittata",
    status: "published",
    room: "kitchen",
    theme: "kitchen",
    motif: "leaves",
    title: "A sample frittata *small hands can hold.*",
    subtitle: "Baked eggs with spinach and peppers, cut into strips for little fingers.",
    hero: {
      src: "/images/campaigns/kitchen-story/02-mix.webp",
      alt: "Anaika stirs oats and blueberries in a big bowl while Bhagyashree holds it steady.",
      focus: "48% 40%",
    },
    instagram: { postedOn: "2026-10-03", keyword: "FRITTATA" },
    recipes: [{ slug: "synth-free-veggie-frittata" }],
    recipesHeading: "Your recipe is here.",
    featuredCollection: KITCHEN_COLLECTION,
    wayBackKeyword: "COLLECTION",
  },
  {
    slug: "local-sample-breakfasts",
    status: "draft",
    room: "kitchen",
    theme: "berry",
    motif: "berries",
    title: "3 breakfasts *worth saving.*",
    subtitle: "Simple mornings start here.",
    instagram: { postedOn: "2026-10-04", keyword: "BREAKFAST" },
    recipes: [
      { slug: "synth-free-oat-bake", note: "Warm, soft and ready while the kettle boils." },
      { slug: "synth-free-veggie-frittata" },
      { slug: "synth-free-berry-smoothie" },
    ],
    featuredPack: LOCAL_PACK,
    analytics: { series: "sample-breakfasts" },
  },
];
