import { isHostedDeploy } from "@/lib/supabase/env";

/**
 * Instagram landing pages at /stories/<slug>. Each entry is one post: the first
 * screen repeats the post's photo and words, and the recipe itself comes from
 * the catalog, so ingredients, steps, time and allergens are never copied here.
 * Plan and decisions: docs/implementation/instagram-landing/PLAN.md.
 */

export type StoryRoom = "kitchen";

export interface StoryAbout {
  name: string;
  /** Short paragraphs in the person's own voice. Every fact must be true. */
  paragraphs: string[];
  /** The photo of the person (and child). Optional until it is supplied. */
  photo?: { src: string; alt: string };
}

export interface StoryOffer {
  /** Collection the offer leads to. Shown only while checkout is on and the offer is on sale. */
  collectionSlug: string;
  heading: string;
  /** Only true claims: owner decision C08 confirmed that one purchase includes recipes added later. */
  growsLine: string;
}

export interface StoryConfig {
  slug: string;
  room: StoryRoom;
  /** Catalog slug of a free recipe. Paid recipes cannot be landing pages. */
  recipeSlug: string;
  /** The post's own words, repeated on the first screen. */
  headline: string;
  /** The post's photo. Falls back to the recipe's catalog photo. */
  cover?: { src: string; alt: string };
  /** Who it's for, in a few words. */
  audience: string;
  pickedBy?: string;
  about?: StoryAbout;
  offer?: StoryOffer;
  /** Comment keyword that brings the collection link back to a parent's DMs. Set only once the DM tool answers it. */
  wayBackKeyword?: string;
  publishedOn: string;
}

const BHAGYASHREE: StoryAbout = {
  name: "Bhagyashree",
  paragraphs: [
    "It’s 5pm, Anaika is pulling at my leg, and I’m standing at the fridge asking yesterday’s question again: what will actually get eaten tonight?",
    "I got tired of recipes written for adults, and blogs where the ingredients sit under ten paragraphs. So I started writing down the meals that worked in our kitchen: cut for small hands, allergens listed, nothing fancy.",
    "These are those recipes. Good enough is exactly enough.",
  ],
};

const COLLECTION_OFFER: StoryOffer = {
  collectionSlug: "comfort-haven-collection",
  heading: "This one’s free. There are more like it in the collection.",
  growsLine: "Every recipe we add later is yours too.",
};

export const STORIES: readonly StoryConfig[] = [
  {
    slug: "frittata-fingers",
    room: "kitchen",
    recipeSlug: "sweet-potato-and-spinach-frittata-fingers",
    headline: "Frittata fingers small hands can hold.",
    audience: "For toddlers",
    pickedBy: "Bhagyashree",
    about: BHAGYASHREE,
    offer: COLLECTION_OFFER,
    publishedOn: "2026-10-03",
  },
];

/**
 * A story on the seeded synthetic recipe, so local runs and CI can render every
 * block. Never served on Vercel deployments.
 */
export const LOCAL_SAMPLE_STORIES: readonly StoryConfig[] = [
  {
    slug: "local-sample-frittata",
    room: "kitchen",
    recipeSlug: "synth-free-veggie-frittata",
    headline: "A sample frittata small hands can hold.",
    audience: "For toddlers",
    pickedBy: "Bhagyashree",
    about: BHAGYASHREE,
    offer: COLLECTION_OFFER,
    wayBackKeyword: "COLLECTION",
    publishedOn: "2026-10-03",
  },
];

export const STORY_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function listStories(): readonly StoryConfig[] {
  return isHostedDeploy() ? STORIES : [...STORIES, ...LOCAL_SAMPLE_STORIES];
}

export function getStory(slug: string): StoryConfig | null {
  if (!STORY_SLUG_PATTERN.test(slug)) return null;
  return listStories().find((story) => story.slug === slug) ?? null;
}

export const STORY_ROOM_LABEL: Record<StoryRoom, string> = {
  kitchen: "The Kitchen",
};
