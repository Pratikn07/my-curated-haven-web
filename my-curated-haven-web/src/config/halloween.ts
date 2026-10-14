/**
 * The Halloween landing page (/halloween): the words and pictures that are ours
 * to write. Recipe titles, times and allergens come from the Halloween
 * collection, whether a recipe is free comes from the free catalog, and the
 * price from commerce, all at load time (src/lib/data/load-halloween.ts).
 *
 * Every line here must be true. The story is Bhagyashree's, in her voice, and
 * it is a plan: the page goes out before Halloween, so Saturday 31 October is
 * told in the future tense. Only the skeleton scare has already happened.
 * Images live in public/images/campaigns/halloween/ and were made for this page
 * (docs/implementation/instagram-landing/HALLOWEEN.md lists their sources).
 */

const IMG = "/images/campaigns/halloween";

export interface HalloweenImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface HalloweenDish {
  /** Catalog slug; must be one of the Halloween collection's recipes. */
  slug: string;
  /** The Halloween name the page uses, in italic. */
  alias: string;
  /** When in the day it belongs, shown above the name. */
  when: string;
  /** Leave the catalog time out when it would mislead (most of the ghost bark's time is the freezer). */
  hideMinutes?: boolean;
  /** The one small step that makes it Halloween, under the slider. */
  how: string;
  /** Describes the recipe's own (Halloween) photo; the everyday photo's alt is in src/config/everyday-photos.ts. */
  photoAlt: string;
}

export interface HalloweenMoment {
  /** "10:00" (read with `period`), or a phrase such as "Last week" when it is not a clock time. */
  time: string;
  period?: "am" | "pm";
  place: string;
  heading: string;
  text: string;
  /** Also shown in the clock pill while this moment is on screen. */
  clock: string;
  image?: HalloweenImage;
}

export const HALLOWEEN_SLUG = "halloween";
export const HALLOWEEN_COLLECTION_SLUG = "halloween";
export const HALLOWEEN_PATH = "/halloween";

export const HALLOWEEN_HERO = {
  eyebrow: "Tiny Soho · Halloween 2026",
  /**
   * The headline. On load "scary" shivers, then a caret slips "not-" in front of it and it calms
   * into the italic: scary corrected to not-scary. Screen readers and the still page get the whole line.
   */
  title: { before: "Halloween, the", inserted: "not-", corrected: "scary", after: "way." },
  lede: "Three recipes for the big night, made for little hands.",
};

/** The link preview picture when the page is shared. */
export const HALLOWEEN_SHARE_IMAGE = {
  src: "/images/recipes/berry-ghost-yogurt-bark-1040.webp",
  alt: "Berry ghost yogurt bark: frozen yogurt with berries and chocolate-chip ghost faces",
};

/**
 * The three recipes, first on the page under the headline ("Make them Halloween"). Each card is a
 * before-and-after slider: the recipe's own photo, and the same shot with only the Halloween step
 * taken out (src/config/everyday-photos.ts). A dish without an everyday photo shows its photo alone.
 */
export const HALLOWEEN_MENU: readonly HalloweenDish[] = [
  {
    slug: "berry-ghost-yogurt-bark",
    alias: "Ghost bark",
    when: "Morning · make ahead",
    hideMinutes: true,
    how: "Before it goes in the freezer, press two mini chocolate chips onto each plain white patch. That's the ghosts.",
    photoAlt: "Berry yogurt bark with chocolate-chip ghost faces on the white patches",
  },
  {
    slug: "mummy-banana-pops",
    alias: "Mummy pops",
    when: "Afternoon · make ahead",
    hideMinutes: true,
    how: "After the first 30 minutes in the freezer, drizzle more yogurt back and forth for the wraps, then press on two chocolate chips for eyes.",
    photoAlt: "Yogurt-dipped banana pops with drizzled mummy wraps and chocolate-chip eyes",
  },
  {
    slug: "spider-cracker-bites",
    alias: "Spider bites",
    when: "Before the doorbells",
    how: "Press four short pretzel pieces into each side for legs, then two chocolate chips on top for eyes. Break the pretzels short and blunt.",
    photoAlt: "Cream cheese cracker sandwiches with pretzel legs and chocolate-chip eyes, like spiders",
  },
];

export const HALLOWEEN_STORY = {
  kicker: "Our plan for Saturday",
  heading: "How we're doing Halloween this year",
  lede: "Anaika is two, the skeleton next door is scary, and Saturday is coming. Here's our plan.",
};

export const HALLOWEEN_MORNING: readonly HalloweenMoment[] = [
  {
    time: "Last week",
    place: "the park",
    heading: "The skeleton next door",
    text: "On the way back from the park, Anaika saw the neighbour's skeleton and hid behind my legs. She's two. Halloween is already a lot for her, so this year we're doing it our way.",
    clock: "Last week",
    image: {
      src: `${IMG}/skeleton-next-door.webp`,
      alt: "Anaika peeks from behind Bhagyashree's legs at a goofy skeleton decoration in a lawn chair",
      width: 800,
      height: 640,
    },
  },
  {
    time: "10:30",
    period: "am",
    place: "home",
    heading: "We'll make our own ghosts",
    text: "Yogurt, berries and two chocolate eyes for every ghost, then into the freezer. Ghosts you're allowed to eat are much less scary.",
    clock: "Sat 31 Oct · 10:30 am",
    image: {
      src: `${IMG}/making-ghosts.webp`,
      alt: "Anaika dots chocolate eyes onto yogurt pops while Bhagyashree holds the plate",
      width: 800,
      height: 640,
    },
  },
];

export const HALLOWEEN_WALK: HalloweenMoment = {
  time: "6:15",
  period: "pm",
  place: "around the block",
  heading: "Three doorbells, then home",
  text: "Porch lights on all down the street, her hand in mine, three doorbells and then home. Any candy goes in the jar for Dad.",
  clock: "Sat 31 Oct · 6:15 pm",
};

export const HALLOWEEN_NIGHT: HalloweenMoment = {
  time: "7:30",
  period: "pm",
  place: "home",
  heading: "Goodnight, skeleton",
  text: "Bath, pyjamas, one frozen ghost from the freezer, and a wave to the neighbour's skeleton from the window seat. That's the plan. We'll tell you how it really went.",
  clock: "Sat 31 Oct · 7:30 pm",
  image: {
    src: `${IMG}/skeleton-said-hi.webp`,
    alt: "Anaika in pumpkin pyjamas waves through the window at the skeleton decoration, which waves back",
    width: 700,
    height: 770,
  },
};

/**
 * The rendered street at 6:15: five layers that slide at different speeds.
 * `houses` centres are each house's middle as a share of the houses image width.
 */
export const HALLOWEEN_STREET = {
  alt: "A cosy Halloween street at night. Bhagyashree, holding a lantern, walks hand in hand with Anaika in a pumpkin costume past three houses as their lights come on.",
  sky: { src: `${IMG}/street/sky.webp`, width: 1791, height: 760 },
  housesOff: { src: `${IMG}/street/houses-off.webp`, width: 1573, height: 560 },
  housesOn: { src: `${IMG}/street/houses-on.webp`, width: 1573, height: 560 },
  walkers: { src: `${IMG}/street/walkers.webp`, width: 204, height: 300 },
  fore: { src: `${IMG}/street/fore.webp`, width: 1822, height: 180 },
  houses: [0.197, 0.492, 0.797] as const,
};

/** True to the facts: hard candy, whole nuts and popcorn are choking risks under 4 (AAP), so they go in the jar. */
export const HALLOWEEN_REASONS: readonly { title: string; text: string }[] = [
  {
    title: "Most of the candy bag isn't for her yet.",
    text: "She gets the bucket, I get the sorting job. Hard candy, whole nuts and popcorn go in the jar for Dad. Tonight's treat is a ghost she decorated herself.",
  },
  {
    title: "Costumes eat the dinner hour.",
    text: "Spider bites take fifteen minutes, so she has a snack in her before the doorbell rings.",
  },
  {
    title: "The kitchen is the part she can do.",
    text: "A two-year-old can't knock on many doors, but she can wrap a mummy.",
  },
];

export const HALLOWEEN_BOOK = {
  eyebrow: "The Halloween collection",
  heading: "Twenty recipes for the week the costumes come out",
  cover: { src: "/images/collections/cover-halloween-1040.webp", width: 1040, height: 1412, alt: "The Halloween collection: a pumpkin-orange cloth cookbook with a gold-foil pumpkin" },
};

export const HALLOWEEN_CLOSING = {
  heading: "Made in our kitchen. Shared with yours.",
  signature: "Tiny Soho",
};
