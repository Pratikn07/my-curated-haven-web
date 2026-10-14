# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Parents feeding toddlers. Most arrive on a phone, inside Instagram's in-app browser, after tapping a link from a post, story or DM. They are short on time (meal decisions take parents about 37 minutes a day) and wary of sales tactics.

## Product Purpose

My Curated Haven (mycuratedhaven.com) is a calm, editorial space for parents. Recipes by Tiny Soho are the first open part: free toddler recipes, plus themed recipe collections bought once. Success is a parent cooking a free recipe, trusting the quality, and buying a collection that fits a moment in family life.

## Positioning

Recipes picked and cooked by Bhagyashree with her daughter Anaika, written for toddlers, each laid out the same way: ingredients, steps, storage, allergens, printable. Collections are small, themed cookbooks (Halloween, Meal Prep, Protein Packs) that grow over time, not a recipe search engine.

## Operating Context

- Entry: Instagram comment keyword, then a DM link to `/stories/<slug>`, or the bio link to the homepage.
- Every published recipe at `/recipes`, the free ones first and labelled; each recipe has one permanent page at `/recipes/[slug]` for reading, saving and printing, or, when it is locked, the collection it is in and the way to buy.
- Collections at `/collections` and `/collections/[slug]`; purchases at `/account/collections`.
- One-time purchase checkout (Stripe). No refunds. Checkout currently needs sign-in first; pay-first is planned.

## Capabilities and Constraints

- Next.js 16 App Router, Tailwind 4, Supabase (Postgres + RLS), Vercel.
- Catalog: 48 of 90 recipes are published (the 20 Halloween recipes, the 3 launch test recipes and 25 free samples published 2026-10-14); the rest are drafts. 28 recipes are free: the owner's three Halloween ones (Berry Ghost Yogurt Bark, Spider Cracker Bites, Apple Pie Halloween Pockets, chosen 2026-10-13) and, since 2026-10-14, three per collection where the overlaps allow it (`docs/implementation/recipe-collections/AUDIT-2026-10-14.md`). Recipe bodies are readable only when published and either free or covered by a purchase.
- Collections, prices and membership are not yet approved (plan task RC-02). Draft collections render only outside production; prices on drafts are placeholders.
- How many recipes are free is the owner's choice (no fixed number since 2026-10-13); each collection page shows only its own free recipes. Open: packs vs. collections, customer library, subscription shape. See `docs/implementation/recipe-collections/`.

## Brand Commitments

- Masterbrand My Curated Haven; recipe brand Tiny Soho ("Recipes by Tiny Soho, inside My Curated Haven").
- Brand idea: good enough is exactly enough. Useful first, delightful second, never in the way.
- Voice: neutral warmth, no judgement, facts stated plainly, no urgency, no "expert-vetted" claims.
- Never link to or promote the parenting app. Bloom (AI companion) is parked.
- Calm rules: no pop-ups, countdowns, scarcity, crossed-out prices, autoplay sound.
- Real photographs of real dishes preferred; no "perfect parent" scenes; never a real child's photo in samples. For collection cover art the owner approved generated imagery (2026-10-04).

## Evidence on Hand

- 70 recipe photographs in Supabase Storage (`recipe-images` public bucket); inventory in `../recipe-review/`.
- Five kitchen-story photos of Bhagyashree and Anaika: `my-curated-haven-web/public/images/campaigns/kitchen-story/`.
- No testimonials, reviews, sales figures or nutrition data (no protein grams). Do not invent them.

## Product Principles

1. The free recipe is the proof: show the quality before asking for money.
2. One honest offer, a real price next to its button, no pressure.
3. Phones and Instagram's browser first; desktop is the adaptation.
4. Every recipe has one permanent home; other pages point to it.
5. Content is complete before JavaScript; motion is a bonus.

## Accessibility & Inclusion

WCAG AA contrast, 44px minimum tap targets, keyboard-reachable links, `prefers-reduced-motion` honoured, no swipe-only controls, text never faded in.
