# Instagram landing pages

Updated 2026-10-03. Branch `claude/eager-ramanujan-20fua6`, built on `feat/haven-house-homepage`.

A parent comments a keyword on a post, gets a DM with a link, and lands on a page made for that post at `/stories/<slug>`. The page hands over the recipe they asked for first, then shows who is behind it, then makes one honest offer for the collection. Most traffic is expected from DMs, so the page is designed for someone who saw a Reel or feed post, not a Story.

Prototypes (private to the owner): the three looks compared, https://claude.ai/artifact/8UTFLxVN6hpLCEdfDcv6XR, and the chosen DM page, https://claude.ai/artifact/VHdbQ3dpjcsswDx61PAsS7.

## Decisions

| Decision | Choice |
| --- | --- |
| Look | C, the clay recipe card resting on the post's photo |
| Where links go | Story link stickers and DMs go to the post's page. The bio link is still the homepage for now |
| Recipe posts | The full recipe sits on the landing page, with a link to the recipe page for printing and saving. Only free recipes can be landing pages |
| About | Bhagyashree's note in her own voice (draft 1), naming Anaika. A photo of Bhagyashree and Anaika will follow |
| Refunds | None, and the landing page doesn't mention them. The collection page and checkout must say so plainly |
| Future recipes (C08) | One purchase includes recipes added later. The page says so |
| Price changes | The price is not planned to rise, so the page says nothing about it |
| What we sell at launch | One-time purchases only: a small themed pack that matches the post (for example 8 Halloween treats for about $6.99) and the growing collection (for example every treat, about $19.99). All-access comes later |
| All-access | Later, once there is a large reviewed library, a steady schedule of new recipes and repeat buyers. Lead with a yearly price. Money already spent on packs comes off it |
| Halloween 2026 | A free hook (posts, one free recipe page, a way back through DMs). The first paid pack launches with a tested checkout |

## The page, top to bottom

1. **Right place.** The post's photo and words, who it's for, time, yield, diet labels, allergens, "Picked by Bhagyashree · recipe by Tiny Soho", and "Get the recipe · 40 min".
2. **The recipe**, inside the card: ingredients, steps, storage, and "Open the full recipe page to print or save it".
3. **Keep the shopping list.** A card made to be screenshotted, and how to print from inside Instagram.
4. **Who's behind this kitchen.** Bhagyashree's note.
5. **One offer**, only while checkout is on and the collection is on sale: a few of the collection's recipes, "every recipe we add later is yours too", and the price next to "See what's inside". While checkout is off, this place shows two more free recipes from the Kitchen instead.
6. **Questions.** Free? Allergies? What's in the collection? New recipes?
7. **The way back.** "Not today? Comment COLLECTION on any of our posts", only once the DM tool answers that keyword.

The sticky button only ever leads to the recipe. It appears when the card's button is off screen and disappears once the recipe is reached, so it never follows the reader down to the offer.

Never on these pages: pop-ups, email gates, countdowns, crossed-out "value" prices, refund talk, sign-in, or any mention of the parenting app.

## Why it's shaped this way

- Commenting a keyword is a small public "yes", so parents arrive expecting exactly what was promised. In one study of home cooks, 73% skipped straight past the story to the ingredients ([Allspice Labs](https://www.allspicelabs.com/data/study/)).
- Mobile bounce rises about 32% as load time goes from 1 to 3 seconds ([Think with Google](https://thinkwithgoogle.com/data/page-load-time-statistics)), and Instagram's in-app browser is slower to pay in. So pages are cached, the house painting is never downloaded here, and most parents are expected to buy on a later visit.
- A useful, unexpected extra makes reciprocity work. The free recipe also previews the product: the offer can honestly say every recipe is laid out the same way.
- Parents who recognise sales tactics resist them ([Friestad & Wright](https://ideas.repec.org/a/oup/jconrs/v21y1994i1p1-31.html)). One offer, a real price next to its button, and no pressure.
- Meal decisions take parents about 37 minutes a day and sit mostly with mums ([Talker Research, 2026](https://talkerresearch.com/wp-content/uploads/2026/06/TR-BobEvansFarms-TheBackToSchoolBurn-Questions-2026.pdf)). Bhagyashree's note opens on that moment.

## What's built

In `my-curated-haven-web/`:

- `src/config/stories.ts`: one entry per post. The first is `frittata-fingers` for Sweet Potato & Spinach Frittata Fingers. A local sample story on the seeded recipe lets local runs and CI render every block; it is never served on Vercel.
- `src/app/stories/[slug]/page.tsx`: built on its first visit and served from the cache for an hour after that. Not listed by search engines; its canonical address is the recipe page.
- `src/lib/data/load-story.ts`: reads the recipe as an anonymous visitor (`src/lib/supabase/public.ts`), so RLS decides what is shown. A story whose recipe isn't free returns 404. The offer appears only when checkout is on and the collection is on sale.
- `src/components/stories/`: the card and blocks, the view tracker and the sticky button. `src/styles/stories.css` holds the clay card.
- Analytics: route key `story`, events `story_view` and `story_action_clicked` with fixed values, the `comment_dm` campaign, and the landing page remembered for the visit (`entry_story` in PostHog) so later recipe opens and purchases can be tied to the post.
- `src/lib/house-light.ts`: the homepage painting is preloaded on the homepage only.

## Adding a page

Add an entry to `STORIES` in `src/config/stories.ts`: the address, the recipe's slug, the post's words, the post's photo (or leave it to use the recipe's photo), who it's for, and the room. Everything else comes from the recipe. Then add the post's links to [INSTAGRAM-LINKS.md](../../INSTAGRAM-LINKS.md).

## Before the first post

- Confirm the facts in Bhagyashree's note and the byline, and how Tiny Soho is credited.
- Add the photo of Bhagyashree and Anaika (`about.photo` in the story entry).
- The real post's photo and words for `frittata-fingers`.
- Parent messages (with permission) can go above the price once the offer is live.
- Set up the comment-keyword DM tool, then turn on the way back for each story.
- Test from a real Instagram DM on one iPhone and one Android phone.

## Later

- Packs and all-access need new commerce pieces. Today's checkout sells one collection, and it asks parents to sign in before paying, which fails inside Instagram's browser. Paying first and making the account after is the planned fix.
- A `/instagram` page for the bio link: the newest posts as tiles, each opening its landing page.
- Library landing pages, with the storybook sample as the main action.
