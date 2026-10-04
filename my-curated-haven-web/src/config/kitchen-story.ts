import type { BrandLinks, KitchenStory } from "../lib/campaigns/types";

/**
 * Bhagyashree and Anaika making blueberry oat bites: five moments of one scene,
 * same kitchen, same light. Every campaign page tells it unless a campaign
 * brings its own. Photos are cropped to one 6:5 frame so the sequence reads as
 * a single camera moving through the moment.
 *
 * The supplied file was a 1536 × 1024 collage, so the frames are 460 to 690px
 * wide. Replace them with the original photos (1600px wide or more) when they
 * arrive; the paths can stay the same.
 */
const FRAMES = "/images/campaigns/kitchen-story";

export const KITCHEN_STORY: KitchenStory = {
  kicker: "The people behind Tiny Soho",
  heading: "Meet Bhagyashree *&* Anaika",
  moments: [
    {
      label: "Prep",
      line: "It started in our kitchen.",
      origin: "40% 82%",
      image: {
        src: `${FRAMES}/01-prep.webp`,
        alt: "Bhagyashree slices a banana on a wooden board while Anaika reaches for a piece.",
        blurDataURL:
          "data:image/webp;base64,UklGRn4AAABXRUJQVlA4IHIAAABQAgCdASoMAAoAAgA0JbACdLoAAw8Z3+ZTsbAA/go9+l+Ld8laXSqESGQT/tHeQt10LkAT61k4rP8dAOlLrRpRUc2DqE4mdpgpNlM9bvEwLRJgbVkRvnJ5rt08fr8B53jY1IqQ8fbd9MKnh5Ze4Fm8AAA=",
      },
    },
    {
      label: "Mix",
      line: "One recipe, one tiny helper, and a lot of experimenting.",
      origin: "44% 74%",
      image: {
        src: `${FRAMES}/02-mix.webp`,
        alt: "Anaika stirs oats and blueberries in a big bowl while Bhagyashree holds it steady.",
        blurDataURL:
          "data:image/webp;base64,UklGRoAAAABXRUJQVlA4IHQAAAAwAgCdASoMAAoAAgA0JZgCdLoAEJcTgJgcAAD+3agw8d9V8/Zj/8UGFB/3qU8Q/45CkKAmD0UgnKVOh3UZLbq8X0fl4Jx/ZpdVs/Yeb3uX6YvV1IRYAYKYbGagW4yNqO0aEX1+CZotEql93O7RJO9mckAAAA==",
      },
    },
    {
      label: "Shape",
      line: "We started sharing what worked for us.",
      origin: "52% 84%",
      image: {
        src: `${FRAMES}/03-shape.webp`,
        alt: "Bhagyashree and Anaika set rows of oat bites on a baking tray.",
        blurDataURL:
          "data:image/webp;base64,UklGRnYAAABXRUJQVlA4IGoAAABwAgCdASoMAAoAAgA0JaACdLoAEJAZfPBsA5tgAP6tce50vbP7uPqrsIXHfXWPlwdrPepz5oBIsmns67hHkZpMJtgi9ELIwQa2dJRItThmK/8xL8+ymJEHz1sXD0V4DP9M5SAODSdFfMAA",
      },
    },
    {
      label: "Top",
      line: "Now we share the ideas we wish we had earlier.",
      origin: "36% 80%",
      image: {
        src: `${FRAMES}/04-top.webp`,
        alt: "Anaika presses a blueberry onto an oat bite while Bhagyashree holds the bowl of berries.",
        blurDataURL:
          "data:image/webp;base64,UklGRngAAABXRUJQVlA4IGwAAACQAgCdASoMAAoAAgA0JbACdLoAEJOTmy0Jjjf4gAD+6a+E742Fzq93b0GQuq9iN1kyprFiIsDlnJhPzdTJh/v5KuRTXrRKx8JSwxZ+N+WsT0/Vt0YKOkYR4gSr9fAU5Ayc/uwvQllsR3lIAAA=",
      },
    },
    {
      label: "Taste",
      line: "Good enough is exactly enough.",
      origin: "50% 42%",
      image: {
        src: `${FRAMES}/05-taste.webp`,
        alt: "Bhagyashree and Anaika each take a bite of the finished blueberry oat bites.",
        blurDataURL:
          "data:image/webp;base64,UklGRnYAAABXRUJQVlA4IGoAAABQAgCdASoMAAoAAgA0JagCdLoAAnWek7IOvAAA/D3nY7Qs5ztP877hazfGeH2/l25UicMkMfsqbuXlw2CYvGv/iBvU9Y0KlodMZkvhZvqzolTFyOTq+Eov9Fh8D9Ym2L/bnoH/oJmecgAA",
      },
    },
  ],
  note: {
    // Draft 1 of Bhagyashree's note, carried over from the first landing pages. Confirm every fact before launch.
    paragraphs: [
      "It’s 5pm, Anaika is pulling at my leg, and I’m standing at the fridge asking yesterday’s question again: what will actually get eaten tonight?",
      "I got tired of recipes written for adults, and blogs where the ingredients sit under ten paragraphs. So I started writing down the meals that worked in our kitchen: cut for small hands, allergens listed, nothing fancy.",
      "These are those recipes. Good enough is exactly enough.",
    ],
    signature: "Bhagyashree",
    with: "& Anaika",
  },
};

export const BRAND_LINKS: BrandLinks = {
  // Set once the Tiny Soho handle is confirmed, for example
  // { handle: "@tinysoho", url: "https://www.instagram.com/tinysoho/" }. The closing link stays hidden until then.
  instagram: undefined,
};
