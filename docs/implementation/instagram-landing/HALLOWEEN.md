# Halloween landing page

Built 2026-10-11. The page Halloween posts on Instagram send parents to: `https://mycuratedhaven.com/halloween`. Links with the right tags are in [INSTAGRAM-LINKS.md](../../INSTAGRAM-LINKS.md).

Mock the owner approved (private): https://claude.ai/artifact/T58b3YQzcSAeh4KrfckQ4V.

## The page, top to bottom

| # | Section | What it does |
| --- | --- | --- |
| 1 | Menu (first screen) | The pumpkin (tap three times to carve it), "Halloween, the not-scary way", and the Halloween menu: Ghost bark, Mummy pops, Spider bites (Ghost pops, Mummy scrolls and Pumpkin pillows until 2026-10-12). Each row opens the recipe's own page when it is free, otherwise the Halloween collection |
| 2 | Make them Halloween | Ghost bark, Mummy pops and Spider bites (back on 2026-10-13 after the recipe swap hid it for a day), each a before-and-after slider (everyday on the left of the line, Halloween on the right; drag, tap or arrow keys; it nudges once on arrival), and the one small step that makes it Halloween |
| 3 | Our plan for Saturday | Bhagyashree's plan, told before Halloween: the skeleton scare (last week), making ghosts (10:30), the walk (6:15, the rendered street), goodnight to the skeleton (7:30) |
| 4 | Why we cook for Halloween | Three reasons. Hard candy, whole nuts and popcorn are choking risks under 4 (AAP) |
| 5 | The Halloween collection | The cover opens to the contents (free recipes marked), the price and "See the Halloween collection" |
| 6 | Closing | Back to the menu, all recipes |

A sticky time pill under the site header follows the story (Last week, 10:30 am, 6:15 pm, 7:30 pm). Behind the page a sky turns from morning to night; the moon rises with the walk.

The full recipes are never copied here. The story is told as a plan because the page goes out before 31 October; after Halloween, update it to what happened (the closing line promises "We'll tell you how it really went").

## Free or in the book

`src/lib/data/load-halloween.ts` asks the free catalog which of the three menu recipes are free. A free recipe links to `/recipes/<slug>` and is counted in "3 free recipes"; any other links to `/collections/halloween` and says "in the book". So no tap ever lands on a page that would not open.

On 2026-10-11 none of the three were free on production (their recipe pages returned 404; the free slots held the frittata campaign's three recipes). On 2026-10-13 the owner chose the free recipes: Berry Ghost Yogurt Bark and Spider Cracker Bites from the menu, and Apple Pie Halloween Pockets, tagged dairy-free and soy-free (contains egg and wheat), so a family avoiding dairy also has one to cook: all three menu dishes contain milk. Jack-o'-Lantern Mango Stars was considered and dropped: its dark chocolate chips mean it is not tagged dairy-free. Mummy Banana Pops stays in the book, so the menu reads "2 free · 1 in the book". The three test recipes stopped being free and `/stories/frittata-fingers` was hidden.

On the collection page every published recipe opens its own page: the free ones are marked "Free" with an arrow, the rest have a lock and open the recipe's locked page, which names the book, its price and the buy button.

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
| Everyday photos (`public/images/recipes/everyday/<slug>-1040.webp`, listed in `src/config/everyday-photos.ts`) | ChatGPT Images edits of each recipe's own photo with only the Halloween step removed (eyes, faces, webs, legs, stems, the pumpkin shape, the broom fringe), 2026-10-13, so the slider lines up. 15 of the 20 recipes; the banana pumpkin mini donuts, mini pumpkin cheesecake bites, candy corn parfaits, gummy worms and protein fruit gummies have no Halloween step to remove. They feed the three sliders here and the slider at the top of each recipe's own page (`/recipes/<slug>`), which prints as the Halloween photo alone. Originals in `docs/art/generated/` |
| Menu thumbnails (`thumb-*.webp`) | 320px square crops of the recipe photos (2026-10-13; were 160px), shown at 96px |

## Analytics

The page reuses the campaign tracker: `story_view` with `story_slug: "halloween"` and `story_series: "halloween-2026"`, `story_action_clicked` for menu, trick, collection and all-recipes taps (`campaign_recipe` for a free recipe, `collection` otherwise), and `story_section_viewed` for recipes, story, story_end, collection and closing.

## Selling the book (from 2026-10-13)

Owner decisions on 2026-10-12, recorded here because they override the staged launch plan in `docs/implementation/phase-11/STAGED-ROLLOUT.md` and the Phase 10 NO-GO for this one collection:

| Decision | Choice |
| --- | --- |
| Price | $5.99 USD from 2026-10-13 (was $6.99), one-time, tax-inclusive, no Stripe Tax, no discount codes |
| Who can buy | Everyone, as soon as it is ready (not invite-only) |
| Sign-in | Pay first (RC-16, owner decision 2026-10-13): no account is needed to pay. After paying, the parent confirms the email they paid with by a 6-digit code, which creates or opens their account and unlocks the book. Any later sign-in with that email also claims it |
| Refunds | All sales final (the collection page already says so); refunds by hand in Stripe only |
| Recipes | All 20 published after the owner's review (one human `approve` row each in `private.recipe_reviews`) |

Stripe (live, account `acct_1UMM1WPLtGCDwKKM`): product `prod_VQq99fuWxOZV9a` "Halloween collection", price `price_1UPySwPLtGCDwKKMMHANn13V` ($6.99, one-time, inclusive). Created with the Stripe CLI on 2026-10-12.

On 2026-10-13 the owner lowered the price to $5.99. Stripe prices can't be edited, so a new live price `price_1UQCuFPLtGCDwKKMGWWetOft` ($5.99, one-time, inclusive) was created on the same product. In the database, one transaction turned the $6.99 offer off (`ba2c8824-…`, kept for its orders) and added the $5.99 offer (`12a71fa8-…`, sale enabled), then checked that `collection_sellable` returns $5.99. Checkout attempts already open at $6.99 keep their frozen price if their buyer taps Buy again, until the Stripe session expires (24 hours) or is expired by hand. Change a price the same way: never edit an offer row.

Going on sale is a database change in one transaction: release 1 of `halloween` (state `published`) with the 20 recipes in book order, its `release_manifests` row, the `additions-v1` access policy (so buyers receive later additions), the `v1/v1` commerce access policy, and the offer with `sale_enabled = true`. `CHECKOUT_ENABLED=true` must be set in Vercel production first. To stop sales, set the offer's `sale_enabled = false`; the environment variable alone leaves a Buy button that fails.

On the page: a book card sits under the menu (screen 2.6 of 11 on a 390×664 phone, was screen 9) and, on phones, a buy bar follows once it scrolls away. Both go to `/collections/halloween#buy` while on sale.
