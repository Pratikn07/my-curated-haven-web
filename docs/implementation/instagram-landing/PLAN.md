# Instagram landing pages

Updated 2026-10-04. First built 2026-10-03 (single-recipe pages); redesigned 2026-10-04 as campaign pages that promise one or many recipes. How the pages are built and how to add one: [CAMPAIGNS.md](CAMPAIGNS.md).

A parent comments a keyword on a post, gets a DM with a link, and lands on a page made for that post at `/stories/<slug>`. The page shows the recipes the post promised first, then who is behind them (Bhagyashree and Anaika), then the pack and the collection that go with the post. Most traffic is expected from DMs, so the page is designed for someone who saw a Reel or feed post, not a Story.

Prototypes (private to the owner): the three looks compared, https://claude.ai/artifact/8UTFLxVN6hpLCEdfDcv6XR, and the chosen DM page, https://claude.ai/artifact/VHdbQ3dpjcsswDx61PAsS7.

## Decisions

| Decision | Choice |
| --- | --- |
| Look | An editorial campaign page: warm paper, espresso type, the post's photo in an arch, and a seasonal accent per campaign (2026-10-04). Replaces look C, the clay recipe card |
| Where links go | Story link stickers and DMs go to the post's page. The bio link is still the homepage for now |
| Recipes per page | One campaign promises one or many recipes (2026-10-04). The page shows each as a card that opens the recipe's permanent page; ingredients, steps, allergens, printing and saving live only there. Only free recipes are shown |
| About | Bhagyashree and Anaika cooking together, five photos told as one scroll-driven scene, then Bhagyashree's note (draft 1) |
| Refunds | None, and the landing page doesn't mention them. The collection page and checkout must say so plainly |
| Future recipes (C08) | One purchase includes recipes added later. The page says so |
| Price changes | The price is not planned to rise, so the page says nothing about it |
| What we sell at launch | One-time purchases only: a small themed pack that matches the post (for example 8 Halloween treats for about $6.99) and the growing collection (for example every treat, about $19.99). All-access comes later. Both are `recipe_collections` with their own offer, so the page reads them the same way; "added later" is only said of the collection |
| All-access | Later, once there is a large reviewed library, a steady schedule of new recipes and repeat buyers. Lead with a yearly price. Money already spent on packs comes off it |
| Halloween 2026 | A free hook (posts, one free recipe page, a way back through DMs). The first paid pack launches with a tested checkout |

## The page, top to bottom

1. **Right place.** The post's promise and photo, how many free recipes are waiting, one button down to them, "Picked by Bhagyashree · Recipes by Tiny Soho".
2. **Your recipes.** The promised recipes in the post's order. Each card opens the recipe page. The layout follows the count, from one wide card to rows of four.
3. **Meet Bhagyashree & Anaika.** Five moments of one kitchen scene (Prep, Mix, Shape, Top, Taste), pinned and moved by scroll on large screens and stacked like prints on phones, then Bhagyashree's note.
4. **More for this moment.** The themed pack, only while checkout is on and it is on sale.
5. **The larger collection.** Only while on sale: its name, size, a few recipes, what "added later" means, and a free / pack / collection comparison.
6. **More from the kitchen.** Other free recipes.
7. **Good to know.** Free? Account? Print? Allergens? Pack and collection questions only when they're shown.
8. **Closing.** "Made in our kitchen. Shared with yours.", Explore all recipes, Instagram (once the handle is set), My Curated Haven, and the way back keyword once the DM tool answers it.

Commerce only appears after the free recipes and the story. Never on these pages: pop-ups, email gates, countdowns, crossed-out "value" prices, scarcity, refund talk, sign-in, or any mention of the parenting app.

## Why it's shaped this way

- Commenting a keyword is a small public "yes", so parents arrive expecting exactly what was promised. In one study of home cooks, 73% skipped straight past the story to the ingredients ([Allspice Labs](https://www.allspicelabs.com/data/study/)).
- Mobile bounce rises about 32% as load time goes from 1 to 3 seconds ([Think with Google](https://thinkwithgoogle.com/data/page-load-time-statistics)), and Instagram's in-app browser is slower to pay in. So pages are cached, the house painting is never downloaded here, and most parents are expected to buy on a later visit.
- A useful, unexpected extra makes reciprocity work. The free recipe also previews the product: the offer can honestly say every recipe is laid out the same way.
- Parents who recognise sales tactics resist them ([Friestad & Wright](https://ideas.repec.org/a/oup/jconrs/v21y1994i1p1-31.html)). One offer, a real price next to its button, and no pressure.
- Meal decisions take parents about 37 minutes a day and sit mostly with mums ([Talker Research, 2026](https://talkerresearch.com/wp-content/uploads/2026/06/TR-BobEvansFarms-TheBackToSchoolBurn-Questions-2026.pdf)). Bhagyashree's note opens on that moment.

## What's built

In `my-curated-haven-web/` (details in [CAMPAIGNS.md](CAMPAIGNS.md)):

- `src/config/campaigns.ts`: one entry per post. `frittata-fingers` (published, the first post's address) and `little-hands` (draft, three recipes). Two local samples on the seeded recipes let local runs and CI render every section; they are never served on Vercel.
- `src/config/kitchen-story.ts` and `public/images/campaigns/kitchen-story/`: Bhagyashree and Anaika's five moments and the note.
- `src/lib/campaigns/`: the campaign shapes, validation and the layout plan. `src/lib/data/campaigns.ts` is the one place campaigns are read from, so an admin can replace the config later.
- `src/lib/data/load-campaign.ts`: reads the promised recipes from the free catalog as an anonymous visitor, so RLS decides what is shown. Offers appear only when checkout is on and they are on sale.
- `src/app/stories/[slug]/page.tsx`: built on its first visit and served from the cache for an hour after that. Not listed by search engines. A one-recipe page names the recipe page as canonical.
- `src/components/campaign/` and `src/styles/campaign.css`: the sections, the analytics tracker, and the pinned story (GSAP, large screens only).
- Analytics: `story_view`, `story_action_clicked` and the new `story_section_viewed`, all with fixed values, plus `entry_story` for the visit.
- `src/lib/house-light.ts`: the homepage painting is preloaded on the homepage only.

## Adding a page

Add an entry to `CAMPAIGNS` in `src/config/campaigns.ts` as a draft, check it on the preview, then publish it. Step by step in [CAMPAIGNS.md](CAMPAIGNS.md#adding-a-campaign). Then add the post's links to [INSTAGRAM-LINKS.md](../../INSTAGRAM-LINKS.md).

## Before the first post

- Confirm the facts in Bhagyashree's note and the byline, and how Tiny Soho is credited.
- Replace the five kitchen story frames with the original photos (1600px wide or more); they were cut from a 1536 × 1024 collage.
- Set Tiny Soho's Instagram handle in `src/config/kitchen-story.ts` (`BRAND_LINKS.instagram`). The closing link stays hidden until then.
- The real post's photo and words for `frittata-fingers`, and the post and words for `little-hands` before publishing it.
- Parent messages (with permission) can go above the price once the offer is live.
- Set up the comment-keyword DM tool, then turn on the way back for each story.
- Test from a real Instagram DM on one iPhone and one Android phone.

## Open decisions

- **More than three free recipes.** `free_recipe_slots` allows three, and a campaign only shows free recipes, so a "5 breakfasts" post can't be fully free today. Options: widen the slots, or let a campaign mark some recipes "in the pack" instead of free.
- **Packs as products.** A pack is a small `recipe_collections` row with its own offer. None exist yet; the first one (for example the Halloween Treat Pack) needs its recipes, release and price.

## Later

- Packs and all-access need new commerce pieces. Today's checkout sells one collection, and it asks parents to sign in before paying, which fails inside Instagram's browser. Paying first and making the account after is the planned fix.
- A `/instagram` page for the bio link: the newest posts as tiles, each opening its landing page.
- Library landing pages, with the storybook sample as the main action.
