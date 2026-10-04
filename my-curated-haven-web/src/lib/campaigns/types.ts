/**
 * Instagram campaign landing pages (/stories/<slug>).
 *
 * A campaign is one Instagram post or selection: the recipes it promised, the
 * pack and collection that go with it, and the kitchen story shared by every
 * campaign. Recipes themselves are never copied here; titles, photos, times and
 * diet labels come from the catalog, and the full recipe lives on its own page.
 *
 * Kept free of runtime imports so the shapes can be validated in unit tests and
 * filled from a database later without touching the page.
 */

/** Drafts render locally and on preview deployments only, never in production. */
export type CampaignStatus = "draft" | "published";

export type CampaignRoom = "kitchen";

/** Seasonal accent for the page. The palette and type stay My Curated Haven's. */
export type CampaignThemeKey = "kitchen" | "berry" | "harvest" | "halloween" | "festive";

/** Small drawn details that drift beside the photos. Decoration only. */
export type CampaignMotif = "none" | "berries" | "oats" | "leaves" | "stars";

export interface CampaignImage {
  /** Root-relative path or an allowed remote address (next.config.ts). */
  src: string;
  alt: string;
  /** Tiny base64 preview shown while the photo loads. */
  blurDataURL?: string;
  /** CSS object-position, for example "40% 30%". Defaults to the centre. */
  focus?: string;
}

export interface CampaignRecipeRef {
  /** Catalog slug of a free recipe. Recipes that are not free are left out at load time. */
  slug: string;
  /** A short line in our own voice shown on the card instead of the catalog summary. */
  note?: string;
}

/** Words for an offer. The name, recipe count, price and photos come live from the commerce database. */
export interface CampaignOfferCopy {
  /** recipe_collections.slug. Shown only while checkout is on and the offer is on sale. */
  collectionSlug: string;
  /** Small line above the heading, for example "More for this moment". */
  eyebrow: string;
  /** One sentence. Only true claims. */
  lead: string;
  /** What it contains, a few short lines. Only true claims. */
  includes: string[];
}

export interface CampaignPackCopy extends CampaignOfferCopy {
  /** The invitation, for example "Want more Halloween ideas?" The pack's name comes from the database. */
  heading: string;
}

/** The collection's heading is its real name from the database, so there is no heading here. */
export interface CampaignCollectionCopy extends CampaignOfferCopy {
  /** What future additions mean. Owner decision C08: one purchase includes recipes added later. */
  growsLine: string;
}

/** One moment of the kitchen story: a photo and the line that goes with it. */
export interface KitchenMoment {
  /** One word, read like a recipe step: Prep, Mix, Shape. */
  label: string;
  line: string;
  image: CampaignImage;
  /** Where the next photo opens from on large screens, as "x% y%" (usually the hands). */
  origin: string;
}

export interface KitchenStory {
  kicker: string;
  heading: string;
  /** Four or five moments of one continuous scene, in order. */
  moments: KitchenMoment[];
  note: {
    /** Short paragraphs in Bhagyashree's own voice. Every fact must be true. */
    paragraphs: string[];
    signature: string;
    /** Who else signs, for example "& Anaika". */
    with?: string;
  };
}

export interface Campaign {
  /** The address: /stories/<slug>. Lowercase letters, numbers and hyphens. */
  slug: string;
  status: CampaignStatus;
  room: CampaignRoom;
  theme: CampaignThemeKey;
  motif?: CampaignMotif;
  /** The post's promise. Wrap one phrase in *asterisks* to set it in italics. */
  title: string;
  /** One supporting sentence. */
  subtitle: string;
  /** The post's photo. Falls back to the first recipe's photo, then to the kitchen story. */
  hero?: CampaignImage;
  instagram?: {
    /** The post itself, for our records. */
    postUrl?: string;
    /** The comment keyword the DM tool answers with this page. */
    keyword?: string;
    postedOn: string;
  };
  /** The recipes the post promised, in the order to show them. One or more. */
  recipes: CampaignRecipeRef[];
  /** Overrides "Your recipes are here." */
  recipesHeading?: string;
  featuredPack?: CampaignPackCopy;
  featuredCollection?: CampaignCollectionCopy;
  /** Overrides the shared kitchen story. */
  story?: KitchenStory;
  /** Free recipes for "More from the kitchen". Without it, other free recipes are picked. */
  relatedRecipeSlugs?: string[];
  analytics?: {
    /** Groups several posts in PostHog, for example "halloween-2026". */
    series?: string;
  };
  /** Comment keyword that brings the collection link back to a parent's DMs. Set only once the DM tool answers it. */
  wayBackKeyword?: string;
}

export interface BrandLinks {
  /** Tiny Soho on Instagram. Leave unset until the handle is confirmed; the link is hidden without it. */
  instagram?: { handle: string; url: string };
}
