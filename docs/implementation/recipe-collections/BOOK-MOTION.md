# Book motion: what we built, what we parked

Status: decided with the owner on 2026-10-06. **Option A is built and live.** **Option B (page-turn reader) is parked**: it was prototyped and liked, and we will revisit it once real visitors show us their phones and behaviour. The review checklist is under "Revisit B when".

**In short:** tapping a book on `/collections` lifts it, opens the cover to a contents page, and lands on the collection page in under a second (A). Turning recipe pages with a swipe and a curl (B) was prototyped on Freezer Dinners. We held it back because many first-time visitors may not know to swipe, and we had no data yet on their phones.

Example: a parent taps *First Tastes*. The book rises to the middle of the screen, the cover swings open on its spine, and the first page reads "Contents · First Tastes · 1 Silky Carrot Apple Starter Purée…". The First Tastes page loads underneath and the open book fades away.

## Options we looked at

| | What it is | Extra download | Decision |
|---|---|---|---|
| **A. Open the book** | Tap → book lifts → cover opens to contents → collection page | None (browser animation API) | **Built** 2026-10-06 |
| **B. Page-turn reader** | Swipe or drag a corner to turn recipe pages with a curl; one page on a phone, a spread on wider screens | ~10 KB compressed (StPageFlip 2.0.7, 44 KB uncompressed) | **Parked**, prototyped |
| **C. Real 3D book** | Three.js model you can spin and flip | ~168 KB compressed for Three.js alone, plus a model | **Rejected**: heavy on mid-range phones and in-app browsers, not readable by screen readers |

Sizes were measured from the CDN on 2026-10-06. For scale, GSAP (already on the site, loaded only when needed) is about 28 KB, and one recipe photo on a collection page is about 40–80 KB after the site resizes it.

## A: how it works (built)

- Code: `my-curated-haven-web/src/components/collections/motion/openBook.ts`, wired into the book tiles and the featured card in `Bookcase.tsx`. Styles are under "Opening a book" in `src/styles/collections.css`.
- Timing: about 380 ms to lift, 620 ms to open, then a short fade once the new page has drawn. The collection page starts loading when a finger touches the book, and navigation starts as the cover opens, so the animation does not add waiting time.
- Only transform and opacity move. A modified click, reduced motion, or a browser without the animation API gets the plain link. Timers remove the overlay even if the tab goes into the background mid-animation.
- Tests: `tests/e2e/collections.spec.ts` ("tapping a book opens it…", "with reduced motion a book link goes straight to its page").

## B: what we tried (parked)

- Prototype (private, owner's Claude artifacts): https://claude.ai/artifact/Cm7hKkVy5o7Urz1AL4Kegu. It shows the Freezer Dinners cover, title page, contents and 8 recipe pages with real photos, turned by swipe, corner drag or arrows. It uses StPageFlip from `cdn.jsdelivr.net/npm/page-flip@2.0.7`.
- Comparable live demos: https://nodlik.github.io/StPageFlip/ and http://www.turnjs.com/.
- Owner feedback: liked the inner page turn. Concerns were whether first-time visitors would know to swipe, and the load on their phones.

**Guidance B would need, so new visitors find the swipe:**
1. On first open, the page corner curls up a little by itself once.
2. A "Swipe to turn" hint shows until the first turn, then goes away.
3. Arrows and a "Page 3 of 12" counter stay visible for anyone who does not swipe.
4. The contents page is tappable: each recipe jumps straight to its page.

**Where B fits best:** inside a book a parent has bought, for reading the recipes they own. On the public collection page, where a parent is choosing, the full list (A) is faster to scan.

## Revisit B when

Look at PostHog (Web analytics and Web vitals; page speed is captured since 2026-10-06 via `capture_performance: { web_vitals: true }` in `src/lib/analytics/posthog.ts`):

1. **Phones:** device, OS version and browser mix on `/collections` pages. Note the Instagram in-app browser share (user agent contains "Instagram").
2. **Speed:** LCP and INP on `/collections/*` by device. B is affordable if LCP stays under about 2.5 s and INP under about 200 ms for most visits.
3. **Behaviour:** a few session recordings of `/collections/<slug>`. Do parents scroll the whole recipe list, or stop early? Do they tap recipes?
4. **Purchases:** once checkout opens, B belongs inside owned books first.

If those look healthy, build B with the four guidance points above, starting inside purchased books.
