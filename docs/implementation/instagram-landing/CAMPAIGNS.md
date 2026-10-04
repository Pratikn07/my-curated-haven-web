# Campaign pages

Updated 2026-10-04 (redesign: editorial motion, recipe dock, filmstrip). How the Instagram campaign pages at `/stories/<slug>` are built, and how to add one. The product decisions are in [PLAN.md](PLAN.md).

One campaign is one Instagram post or selection. It can promise one recipe or many. Every campaign uses the same page; only its content changes.

## The page, top to bottom

| # | Section | What it does | Shown when |
| --- | --- | --- | --- |
| 1 | Hero | The post's promise (rising word by word), its photo in an arch, neighbouring recipe photos on large screens, one button stating the free recipe count, and "Picked by Bhagyashree · Recipes by Tiny Soho" | Always |
| 2 | Your recipes | The promised recipes, in order, with what waits on each recipe page (ingredients, steps, allergens, print). Each card opens the recipe's permanent page. The layout follows the count (see below) | Always |
| 3 | Meet Bhagyashree & Anaika | Five moments of one kitchen scene, then Bhagyashree's note, read along as it scrolls | Always |
| 4 | Pack | "Want more …?", the pack's name, recipe count, a few of its recipes, one price, "See what's inside" | Checkout on, and the pack is on sale |
| 5 | Collection | The collection's name, count, sample recipes, what "added later" means, one price, "See the collection", and the free / pack / collection comparison | Checkout on, and the collection is on sale |
| 6 | More from the kitchen | Other free recipes, as the `/recipes` cards, on a shelf with previous/next buttons (and mouse drag), ending on a card to every free recipe | There are other free recipes |
| 7 | Good to know | Free? Account? Print? Allergens? Pack and collection questions only when those are shown | Always |
| 8 | Closing | "Made in our kitchen. Shared with yours.", Explore all recipes, Instagram, My Curated Haven, and the way back keyword | Always (Instagram once the handle is set) |

The full recipe (ingredients, steps, allergens, storage, print, save) is only ever on `/recipes/<slug>`. The campaign page never copies it.

Once the promised recipes have scrolled past, a small dock at the bottom of the screen keeps them one tap away: "Open recipe" for one recipe, "Jump to them" for several. It steps aside while the hero, the recipes, an offer, the closing or the footer is on screen, so it never covers what it points to or sits next to a price. It needs the script and never shows without it.

Never on these pages: pop-ups, email gates, countdowns, crossed-out prices, scarcity, refund talk, sign-in, or the parenting app.

## Recipe layout by count

`planRecipeLayout` in `src/lib/campaigns/validate.ts` decides, so no count leaves a lonely card:

| Recipes | Phones | Large screens |
| --- | --- | --- |
| 1 | One tall card | One wide card, photo beside the words |
| 2 | Two tall cards | Side by side |
| 3 | Three tall cards | One large on the left, two stacked on the right |
| 4 to 12 | Short rows (photo, title, time) | Rows of 3 or 4, last row centred: 4 → 4, 5 → 3+2, 7 → 4+3, 9 → 3×3 |

The database allows three free recipes today (`free_recipe_slots.slot` is 1 to 3), and a campaign shows only free recipes. A campaign promising five needs more free slots first; see "Open decisions" in PLAN.md.

## The kitchen story

The supplied photos of Bhagyashree and Anaika are one scene in five moments: Prep, Mix, Shape, Top, Taste. They live in `public/images/campaigns/kitchen-story/`, cropped to one 6:5 frame so the camera never seems to jump. The words and photos are in `src/config/kitchen-story.ts`; a campaign can bring its own story instead.

- **Phones, reduced motion, and before any script runs:** the moments are prints stacked by CSS (`position: sticky`). Each new moment slides over the last as the parent scrolls. Where the browser supports scroll-driven animations, each photo settles slightly as its print arrives.
- **Large screens (1024 × 620 or more) with motion allowed:** `CampaignMotion` loads GSAP and ScrollTrigger (`motion/story.ts`), then pins the stage under the header. Scrolling opens each next moment through a circle that grows from where the hands are, while the moment before leans back a little. A large counter rolls from 01 to 05, the line beside it changes with each moment, and a progress line fills over a filmstrip of the five moments. Each frame of the filmstrip is a button that scrolls to its moment. The last moment rests briefly, then the stage lets go and Bhagyashree's note follows.
- Scroll position drives everything; nothing plays on its own. `gsap.matchMedia` undoes the pin if the screen shrinks or motion is turned off. Phones never download GSAP: it is imported only once the large-screen query matches.
- Bhagyashree's note: each word darkens from a lighter ink (still 5:1 on the card) as the parent reads down, using a CSS view timeline. Elsewhere it is simply ink.

## Motion rules

One easing curve (`--cp-ease`). Three layers, each optional:

1. **CSS, always:** the first screen's load moment (the headline rises word by word from behind a mask, the italic phrase gets a marker stroke, the photo settles, all under 1.6 seconds), hover states, and scroll-driven effects where the browser supports them (reading progress line, photo drift in recipe cards, the dark collection panel opening to full width, the shelf's progress line).
2. **`CampaignMotion` on every screen:** sections rise into place as they arrive (`data-reveal`), the recipe dock, the cooking time counting up, and a mouse drag on the related shelf.
3. **Mouse only:** buttons lean toward the pointer and fill from where it enters, recipe cards tilt, a round "Open" or "Drag" label follows the pointer over things it can open or drag, the hero's letters thicken under the pointer (Fraunces is variable, so only its weight changes), drawn ingredients lean with it, and on large screens a WebGL lens follows it across the hero photo (`motion/ripple.ts`; if WebGL fails the photo simply stays).

Text a parent reads is never faded in: reveals move it from behind a mask or a little below its place. The one exception is the moment lines inside the pinned story, which stay in the page for screen readers. Anything already on screen when the script starts stays exactly where it is. Ambient loops are quiet: the drawn ingredients and the closing ring take 9 seconds or more per cycle, and the two small dots pulse every 3 seconds. With reduced motion nothing moves and nothing waits on an animation; without the script the page is complete and still. Both are covered by browser tests.

## Adding a campaign

1. Add an entry to `CAMPAIGNS` in `my-curated-haven-web/src/config/campaigns.ts`:

   ```ts
   {
     slug: "halloween-treats",            // the address: /stories/halloween-treats
     status: "draft",                     // drafts show locally and on previews, never in production
     room: "kitchen",
     theme: "halloween",                  // kitchen, berry, harvest, halloween or festive
     motif: "stars",                      // berries, oats, leaves, stars or none
     title: "3 Halloween treats *made for tiny hands.*",  // *asterisks* set the italic phrase
     subtitle: "Simple enough for a busy week, fun enough for the day itself.",
     hero: { src: "/images/campaigns/halloween-treats/hero.webp", alt: "…" },  // optional
     instagram: { postedOn: "2026-10-20", keyword: "TREATS" },
     recipes: [
       { slug: "pumpkin-oat-bites", note: "Our first try at a Halloween snack." },  // note is optional
       { slug: "…" },
     ],
     featuredPack: { collectionSlug: "halloween-treat-pack", eyebrow: "More for this moment", heading: "Want more Halloween ideas?", lead: "…", includes: ["…"] },
     featuredCollection: { collectionSlug: "treats-collection", eyebrow: "The larger collection", lead: "Every treat we have now.", growsLine: "Plus new treats added to this collection later.", includes: ["…"] },
     analytics: { series: "halloween-2026" },
   }
   ```

2. Run `npm run test:data:unit`. It fails if the campaign is invalid (bad slug, duplicate recipe, unclosed italics, a relative image path, and so on).
3. Open the preview deployment at `/stories/<slug>` and check it on a phone from an Instagram DM.
4. When the post goes live, set `status: "published"` and add its links to [INSTAGRAM-LINKS.md](../../INSTAGRAM-LINKS.md).

Recipe titles, photos, times and diet labels come from the catalog. The pack's and collection's names, recipe counts, prices and photos come from the commerce database. Only true claims go in the words; "added later" is backed by owner decision C08 and is only said about collections.

A promised recipe that isn't free (or isn't published) is left out of the page with a warning in the logs. A campaign with none left returns 404. An invalid campaign is never served.

## Data model

```text
Campaign
  slug, status (draft | published), room, theme, motif
  title, subtitle, hero?           ← the post's promise and photo
  instagram { postUrl?, keyword?, postedOn }
  recipes[] { slug, note? }        ← ordered, 1 to 12, free recipes only
  recipesHeading?
  featuredPack? { collectionSlug, eyebrow, heading, lead, includes[] }
  featuredCollection? { collectionSlug, eyebrow, lead, growsLine, includes[] }
  story? { kicker, heading, moments[] { label, line, image, origin }, note }   ← defaults to the kitchen story
  relatedRecipeSlugs?              ← otherwise other free recipes are picked
  analytics? { series? }
  wayBackKeyword?
```

| File | Role |
| --- | --- |
| `src/lib/campaigns/types.ts` | The shapes above, with no runtime imports |
| `src/lib/campaigns/validate.ts` | `validateCampaign`, title parsing, `planRecipeLayout` |
| `src/config/campaigns.ts` | The campaigns, plus two local samples on seeded recipes for CI |
| `src/config/kitchen-story.ts` | Bhagyashree and Anaika's story, and the brand's Instagram link |
| `src/lib/data/campaigns.ts` | `CampaignSource`: where campaigns come from, and which are served where |
| `src/lib/data/load-campaign.ts` | Everything one page needs, read as an anonymous visitor so the page can be cached |
| `src/components/campaign/` | One component per section, plus `CampaignDock` (the recipe dock), `CampaignTracker` (analytics) and `CampaignMotion` with `motion/` (reveals, dock, pointer details, WebGL lens, and the pinned story with GSAP) |
| `src/styles/campaign.css` | Tokens, themes, layouts and motion for these pages |

### When an admin arrives

The page reads campaigns only through `CampaignSource` (`list`, `get`). An admin backed by the database implements the same two methods, and the page and loader stay as they are. A possible schema, not applied:

```sql
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  theme text not null default 'kitchen',
  motif text not null default 'none',
  title text not null,
  subtitle text not null,
  hero jsonb,                       -- { src, alt, focus? }
  instagram jsonb not null,         -- { postUrl?, keyword?, postedOn }
  featured_pack jsonb,              -- copy only; price and count stay in commerce
  featured_collection jsonb,
  story jsonb,                      -- null means the shared kitchen story
  analytics_series text,
  way_back_keyword text,
  updated_at timestamptz not null default now()
);

create table public.campaign_recipes (
  campaign_id uuid references public.campaigns(id) on delete cascade,
  recipe_id uuid references public.recipe_catalog(id) on delete cascade,
  position smallint not null check (position between 1 and 12),
  note text,
  primary key (campaign_id, recipe_id),
  unique (campaign_id, position)
);
-- Visitors read published rows only; writes go through an admin role.
```

`validateCampaign` runs on whatever the source returns, so a bad row is refused the same way a bad config entry is.

## Analytics

All values are fixed lists or patterns, checked in `src/lib/analytics/sanitize.ts`.

| Event | Properties | When |
| --- | --- | --- |
| `story_view` | `story_slug`, `room`, `recipe_count`, `offer_state` (none, pack, collection, both), `story_series` | The page is shown |
| `story_action_clicked` | `story_slug`, `story_action`, `story_placement`, and for recipe taps `recipe_id` and `recipe_position` | A marked link is tapped |
| `story_section_viewed` | `story_slug`, `story_section` (recipes, story, story_end, pack, collection, related, questions, closing) | A section is first reached |

Actions: `recipe_jump` (hero button), `campaign_recipe` (a promised recipe opened), `more_recipe`, `pack` and `collection` (purchase intent), `instagram` (back to Instagram), `recipes_index`, `home`. The older `full_recipe` and `about` stay valid for past events.

The visit still remembers its first campaign page (`entry_story` in PostHog), so a recipe opened or a purchase later in the visit is tied back to the post. `comment_dm` and the other Instagram campaign codes still come from the link's UTM tags.
