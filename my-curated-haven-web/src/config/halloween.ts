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
  /** Leave the catalog time out when it would mislead (most of the ghost pops' time is the freezer). */
  hideMinutes?: boolean;
  thumb: HalloweenImage;
}

export interface HalloweenTrick {
  slug: string;
  alias: string;
  /** The one small step that makes it Halloween. */
  how: string;
  dressed: HalloweenImage;
  everyday: HalloweenImage;
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
  /** The headline before and after the emphasised words. */
  title: { before: "Halloween, the", emphasis: "not-scary", after: "way." },
  lede: "Three recipes for the big night, made for little hands.",
  byline: "Picked by Bhagyashree · Recipes by Tiny Soho",
};

export const HALLOWEEN_MENU: readonly HalloweenDish[] = [
  {
    slug: "mini-berry-yogurt-pops",
    alias: "Ghost pops",
    when: "Morning · make ahead",
    hideMinutes: true,
    thumb: { src: `${IMG}/thumb-ghost-pops.webp`, alt: "", width: 160, height: 160 },
  },
  {
    slug: "spinach-and-cheese-pizza-scrolls",
    alias: "Mummy scrolls",
    when: "Lunch",
    thumb: { src: `${IMG}/thumb-mummy-scrolls.webp`, alt: "", width: 160, height: 160 },
  },
  {
    slug: "pumpkin-and-ricotta-gnocchi-pillows",
    alias: "Pumpkin pillows",
    when: "Dinner",
    thumb: { src: `${IMG}/thumb-pumpkin-pillows.webp`, alt: "", width: 160, height: 160 },
  },
];

export const HALLOWEEN_TRICKS: readonly HalloweenTrick[] = [
  {
    slug: "mini-berry-yogurt-pops",
    alias: "Ghost pops",
    how: "Once they're frozen, add two dots of melted chocolate for eyes. Ghosts she's allowed to eat.",
    dressed: {
      src: `${IMG}/ghost-pops.webp`,
      alt: "Pink berry yogurt pops with chocolate-dot eyes, like little ghosts",
      width: 800,
      height: 640,
    },
    everyday: {
      src: `${IMG}/ghost-pops-before.webp`,
      alt: "The same berry yogurt pops without eyes",
      width: 800,
      height: 640,
    },
  },
  {
    slug: "spinach-and-cheese-pizza-scrolls",
    alias: "Mummy scrolls",
    how: "Lay thin cheese strips across before baking, then add two olive eyes. They freeze, so make a double batch for the party.",
    dressed: {
      src: `${IMG}/mummy-scrolls.webp`,
      alt: "Pizza scrolls wrapped in cheese strips like mummies, with olive eyes",
      width: 800,
      height: 640,
    },
    everyday: {
      src: `${IMG}/everyday-pizza-scrolls.webp`,
      alt: "The same spinach and cheese pizza scrolls without the mummy wrap",
      width: 800,
      height: 640,
    },
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
    text: "Yogurt and berries into the moulds and into the freezer, then two chocolate eyes each once they've set. Ghosts you're allowed to eat are much less scary.",
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
  text: "Bath, pyjamas, one ghost pop from the freezer, and a wave to the neighbour's skeleton from the window seat. That's the plan. We'll tell you how it really went.",
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
    text: "She gets the bucket, I get the sorting job. Hard candy, whole nuts and popcorn go in the jar for Dad. Tonight's treat is the ghost pop she decorated herself.",
  },
  {
    title: "Costumes eat the dinner hour.",
    text: "Something made that morning means she eats a real meal before the doorbell rings.",
  },
  {
    title: "The kitchen is the part she can do.",
    text: "A two-year-old can't knock on many doors, but she can wrap a mummy.",
  },
];

export const HALLOWEEN_BOOK = {
  eyebrow: "The Halloween collection",
  heading: "Eight recipes for the week the costumes come out",
  cover: { src: "/images/collections/cover-halloween-1040.webp", width: 1040, height: 1412, alt: "The Halloween collection: a pumpkin-orange cloth cookbook with a gold-foil pumpkin" },
};

export const HALLOWEEN_CLOSING = {
  heading: "Made in our kitchen. Shared with yours.",
  signature: "Tiny Soho",
};
