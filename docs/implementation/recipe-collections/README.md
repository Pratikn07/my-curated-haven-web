# Recipe collections

Status: plan documented 2026-10-04. Owner decisions pending. No application or database changes have been made under this effort.

This is a **separate effort**, outside Phases 1–12. It turns the recipe area into a place to shop themed collections, sample free recipes and use what you bought. Task IDs use the `RC-` prefix. The detailed tasks are in [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md).

The agreed list of 20 collections, their fields and the recipe tag vocabulary for the admin panel are in [COLLECTIONS.md](COLLECTIONS.md) (importable as [collections.seed.json](collections.seed.json)). Tags and collection placement for all 70 catalog recipes, reviewed one at a time: [RECIPE-TAGS.md](RECIPE-TAGS.md) ([recipe-tags.json](recipe-tags.json)); re-check with `python3 check_recipe_tags.py`. How books open on the website, and the page-turn reader we prototyped and parked: [BOOK-MOTION.md](BOOK-MOTION.md).

## What we sell

Themed recipe collections, such as Halloween (festive), Meal Prep or Protein Packs. Collections are refreshed over time. We sell collections, not individual recipes.

The direction agreed in the 2026-10-04 planning chat: **start with themed purchases plus an included customer library, and introduce a subscription only when we can reliably deliver ongoing value.**

## Site structure

| Navigation label | Address | What people see | Exists today? |
| --- | --- | --- | --- |
| **Collections** | `/collections` | Every listed collection: cover, theme, recipe count, price | No. New page |
| (from a collection card) | `/collections/[slug]` | One collection: its story, contents preview, price, purchase | Yes. Shows one offer and 404s when there is no offer |
| **Free Recipes** | `/recipes` | The 7–10 complete public recipes | Yes. Shows 3 free recipes; admins see all 70 since PR #85 |
| (from a recipe card) | `/recipes/[slug]` | The permanent page for reading, saving and printing a recipe, with access checked | Yes |
| **My Library** | `/account/collections` | Purchased collections and the included customer library | Yes, titled "My Recipe Collections". Rename the label; keep the address |

Visitors never need to type `/collections/halloween`. They reach it by clicking the Halloween card on `/collections`, or from an Instagram post. `/recipes/free` was considered and dropped because no navigation would lead to it.

Pages link to each other:
- `/collections` has a visible "Try our free recipes" link.
- Free recipe pages link to the collections they belong to.
- Instagram campaign pages at `/stories/<slug>` keep their own layout and link to the matching collection ([Instagram landing plan](../instagram-landing/PLAN.md)).

## Who sees what (proposed)

| Who | What they can access |
| --- | --- |
| Everyone | All collection previews (covers, titles, summaries, recipe lists) and 7–10 complete sample recipes |
| Someone who buys a collection | That collection, its future additions, and the included customer library |
| Subscriber (later) | The customer library and every collection while subscribed |
| Admin (`public.user_roles`, PR #85) | Every recipe in every publication state |

Buying Halloween unlocks Halloween plus the customer library. It does not unlock Meal Prep or Protein. If one purchase unlocks nearly everything, nobody has a reason to buy a second collection or subscribe.

Don't call the included library "free". A recipe you must buy something to read is not free. A working name is "Everyday Recipe Library": "Buy any collection and unlock our Everyday Recipe Library."

## Phases

| Phase | Outcome | Public release? |
| --- | --- | --- |
| 1. Define collections and benefits | Owner decisions recorded: first collections, recipe membership, public samples, customer library, refresh promise, names | No |
| 2. Access foundation | The database and app enforce free samples, purchased collections, customer library and admin access separately | No (invisible) |
| 3. Collection experience | `/collections`, redesigned `/collections/[slug]`, `/recipes` as Free Recipes, navigation | **First public milestone**, together with Phase 2 |
| 4. Purchases and library | Buying a collection unlocks it and the customer library, end to end | **First commercial milestone** |
| 5. Collection updates | A repeatable way to add reviewed recipes to a collection and give existing buyers access | Yes, per update |
| 6. Subscription | All-access offer, once ongoing value is proven | Later |

Each phase ships only when its acceptance checks pass. See [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md).

## Conflicts with earlier decisions

These conflicts need an owner decision before Phase 2 starts:

1. **Free recipe count.** PR #84 (merged 2026-10-04 15:09 PT) set the site to show three free recipes, and `free_recipe_slots.slot` is limited by `CHECK (slot IN (1, 2, 3))` (`supabase/migrations/20260923042735_phase4_schema.sql:64`). Showing 7–10 needs a migration and replaces that decision. The [Instagram landing plan](../instagram-landing/PLAN.md#open-decisions) already lists "more than three free recipes" as open.
2. **Subscription shape.** This plan says "monthly subscription". The Instagram landing plan says all-access comes later, leads with a **yearly** price, and credits money already spent on packs. Pick one.
3. **Packs vs. collections.** The Instagram landing plan sells two one-time products: a small themed pack (for example 8 Halloween treats, about $6.99) and the larger growing collection (about $19.99). Only the collection is described as getting additions later. Decide whether "collection" in this plan means both products or only the larger one.
4. **Customer library.** No earlier plan includes a bonus library with every purchase. This is new and needs approval.

The root [implementation index](../README.md) says not to infer a collection count, price, refund policy or future-addition entitlement from plans. The prices above are examples from the Instagram plan, not approved prices.

## Baseline (2026-10-04)

- Production catalog: 70 recipes; 3 published (all in free slots), 67 drafts. Measured in the 2026-10-04 Codex session. Recheck before Phase 1 sign-off.
- `/recipes` calls `getFreeRecipeCatalog()` for visitors and `getPublishedCatalog()` for admins (`my-curated-haven-web/src/app/recipes/page.tsx`).
- Recipe bodies are readable only when the recipe is published **and** either in a free slot or covered by an active entitlement (policy 7.6 in `phase4_schema.sql`; later hardening migrations may refine it). Publishing a paid recipe exposes its title, summary and preview image, not its ingredients or method.
- Entitlements attach to one `collection_releases` row (`access_entitlements.release_id`). A buyer of release 1 does not automatically get release 2.
- Checkout asks parents to sign in before paying, which fails inside Instagram's in-app browser. Paying first and creating the account afterwards is the planned fix (Instagram landing plan, "Later").
- No refunds. The collection page and checkout must say so plainly (Instagram landing plan).

## Delivery boundary

This effort does not change the homepage house, the Instagram campaign pages' layout, Phase 12's feature selection, or the recipe review process. Recipes enter a collection only after they pass the existing review gate (`private.recipe_is_reviewed`).
