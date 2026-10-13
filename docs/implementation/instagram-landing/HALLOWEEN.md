# Halloween landing page

Built 2026-10-11. The page Halloween posts on Instagram send parents to: `https://mycuratedhaven.com/halloween`. Links with the right tags are in [INSTAGRAM-LINKS.md](../../INSTAGRAM-LINKS.md).

Mock the owner approved (private): https://claude.ai/artifact/T58b3YQzcSAeh4KrfckQ4V.

## The page, top to bottom

| # | Section | What it does |
| --- | --- | --- |
| 1 | Menu (first screen) | The pumpkin (tap three times to carve it), "Halloween, the not-scary way", and the Halloween menu: Ghost bark, Mummy pops, Spider bites (Ghost pops, Mummy scrolls and Pumpkin pillows until 2026-10-12). Each row opens the recipe's own page when it is free, otherwise the Halloween collection |
| 2 | Make them Halloween | Hidden since 2026-10-12: its photos were of the old ghost pops and mummy scrolls, which left the book. With entries in `HALLOWEEN_TRICKS` it shows the dressed-up recipes, each a before-and-after slider (everyday on the left of the line, Halloween on the right; drag, tap or arrow keys; it nudges once on arrival), and the one small step that makes it Halloween |
| 3 | Our plan for Saturday | Bhagyashree's plan, told before Halloween: the skeleton scare (last week), making ghosts (10:30), the walk (6:15, the rendered street), goodnight to the skeleton (7:30) |
| 4 | Why we cook for Halloween | Three reasons. Hard candy, whole nuts and popcorn are choking risks under 4 (AAP) |
| 5 | The Halloween collection | The cover opens to the contents (free recipes marked), the price and "See the Halloween collection" |
| 6 | Closing | Back to the menu, all recipes |

A sticky time pill under the site header follows the story (Last week, 10:30 am, 6:15 pm, 7:30 pm). Behind the page a sky turns from morning to night; the moon rises with the walk.

The full recipes are never copied here. The story is told as a plan because the page goes out before 31 October; after Halloween, update it to what happened (the closing line promises "We'll tell you how it really went").

## Free or in the book

`src/lib/data/load-halloween.ts` asks the free catalog which of the three menu recipes are free. A free recipe links to `/recipes/<slug>` and is counted in "3 free recipes"; any other links to `/collections/halloween` and says "in the book". So no tap ever lands on a page that would not open.

On 2026-10-11 none of the three were free on production (their recipe pages returned 404; the free slots held the frittata campaign's three recipes). The owner is deciding which recipes to make free; the page needs no change either way.

## Motion

GSAP (with ScrollTrigger) loads after the first screen, on phones too, when the browser is idle or on the first scroll. It drives the sky, the pinned street, the book and the cards settling. The headline, the pumpkin, the photo swap and the ghost are CSS.

Reduced motion, Data Saver and no script all get the still page: every layer of the street in place with every light on, and the night sections with their own dark background. `.hw[data-motion="on"]` is the switch.

The street (`HALLOWEEN_STREET` in `src/config/halloween.ts`) is five image layers, about 220 KB together, sliding at different speeds: sky 0.2x, houses 1x, front pumpkins 1.6x, with the walkers held in place. The lit houses are the same image as the dark ones (one shared mask), clipped to one house each and faded in as the walkers reach it.

## Files

| File | Role |
| --- | --- |
| `src/app/halloween/page.tsx` | The route. Cached for an hour, listed in the sitemap |
| `src/config/halloween.ts` | All words and images that are ours: menu, tricks, story, street, reasons |
| `src/lib/data/load-halloween.ts` | Menu links (free or in the book), book contents, price |
| `src/components/halloween/` | Sections (server), the client islands (pumpkin, photo swap, ghost, time pill) and the motion |
| `src/styles/halloween.css` | Everything under `.hw`, still by default |
| `public/images/campaigns/halloween/` | The page's images |
| `tests/e2e/halloween.spec.ts` | First screen, links that open, no sideways scroll, reduced motion, no script, analytics |

## Images

| Image | Source |
| --- | --- |
| Street layers (`street/`) | Higgsfield (Nano Banana Pro) on 2026-10-11, walkers from the Anaika and Bhagyashree reference elements; cut out and aligned locally |
| Ghost pops, mummy scrolls, skeleton next door, making ghosts, goodnight window | Made by the owner in ChatGPT from the prompts in `~/Downloads/halloween-2026/PROMPTS.md`, cropped to 5:4 (window 4:4.4) and compressed to WebP |
| Ghost pops before (`ghost-pops-before.webp`) | Higgsfield edit of the owner's ghost pops photo with only the eyes removed (2026-10-12), so the slider lines up |
| Everyday scrolls (`everyday-pizza-scrolls.webp`) | The recipe's own catalog photo, a different shot, so the slider halves do not line up yet; the owner is making a matching before photo |

## Analytics

The page reuses the campaign tracker: `story_view` with `story_slug: "halloween"` and `story_series: "halloween-2026"`, `story_action_clicked` for menu, trick, collection and all-recipes taps (`campaign_recipe` for a free recipe, `collection` otherwise), and `story_section_viewed` for recipes, story, story_end, collection and closing.

## Selling the book (from 2026-10-13)

Owner decisions on 2026-10-12, recorded here because they override the staged launch plan in `docs/implementation/phase-11/STAGED-ROLLOUT.md` and the Phase 10 NO-GO for this one collection:

| Decision | Choice |
| --- | --- |
| Price | $6.99 USD, one-time, tax-inclusive, no Stripe Tax, no discount codes |
| Who can buy | Everyone, as soon as it is ready (not invite-only) |
| Sign-in | Pay first (RC-16, owner decision 2026-10-13): no account is needed to pay. After paying, the parent confirms the email they paid with by a 6-digit code, which creates or opens their account and unlocks the book. Any later sign-in with that email also claims it |
| Refunds | All sales final (the collection page already says so); refunds by hand in Stripe only |
| Recipes | All 20 published after the owner's review (one human `approve` row each in `private.recipe_reviews`) |

Stripe (live, account `acct_1UMM1WPLtGCDwKKM`): product `prod_VQq99fuWxOZV9a` "Halloween collection", price `price_1UPySwPLtGCDwKKMMHANn13V` ($6.99, one-time, inclusive). Created with the Stripe CLI on 2026-10-12.

Going on sale is a database change in one transaction: release 1 of `halloween` (state `published`) with the 20 recipes in book order, its `release_manifests` row, the `additions-v1` access policy (so buyers receive later additions), the `v1/v1` commerce access policy, and the offer with `sale_enabled = true`. `CHECKOUT_ENABLED=true` must be set in Vercel production first. To stop sales, set the offer's `sale_enabled = false`; the environment variable alone leaves a Buy button that fails.

On the page: a book card sits under the menu (screen 2.6 of 11 on a 390×664 phone, was screen 9) and, on phones, a buy bar follows once it scrolls away. Both go to `/collections/halloween#buy` while on sale.
