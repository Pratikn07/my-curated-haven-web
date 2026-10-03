# Haven house handoff

Updated 2026-10-02. Branch `feat/haven-house-homepage`. The full conversation that led here is in the owner's exported session zip, which is uploaded to the cloud session and must never be committed (this repository is public).

## Where things stand

The homepage is rebuilt around an interactive house, with My Curated Haven as the site brand. The house is still a **placeholder drawing in code** (`src/components/house/HouseScene.tsx`). The owner wants a premium, living scene instead. The art is chosen: a handmade clay miniature house, with day and night versions in `art/chosen/`. The remaining Round 2 images are being generated; see [ART-SHOT-LIST.md](ART-SHOT-LIST.md).

Built in `my-curated-haven-web/`:

- `src/components/house/HavenHero.tsx`: opening screen with the headline "Good enough is exactly enough.", Browse recipes, and the house.
- `src/components/house/HouseExplorer.tsx`: room list with text status, tap a room to zoom in and open its card, Back or Esc to return, `/#room-<id>` deep links, room-open analytics, and a clock check every minute.
- `src/components/house/RoomSamples.tsx`: Nursery keepsake sample and Shelf "why we'd pick it" sample. Nothing is saved.
- `src/components/home/LibraryPreview.tsx` and `StorybookSample.tsx`: storybook sample with a typed name, four stories and four art styles.
- `src/components/home/HomeRecipes.tsx`, `HavenPromises.tsx`, `HomeFaq.tsx`: Kitchen recipes, promises and FAQ.
- `src/config/house-rooms.ts`: rooms, statuses and positions. Opening a room is a one-line status change.
- `src/styles/house.css`: day, evening and night tokens, motion, zoom. `data-daypart` is set before first paint by the inline script in `src/app/layout.tsx` (night 20:00–05:59, evening 17:00–19:59).
- Brand: header, footer, titles, metadata and the share image say My Curated Haven. Nibble & Nurture stays the company in the copyright, legal pages and recipe publisher data.
- Fraunces is the display face for homepage headings. The base heading rule in `globals.css` moved into `@layer base`, so heading line heights now follow their size utilities across the site.
- Removed: old Hero, pillar overview, Chat/Shop/Bloom previews and their tracker, brand story, final action.

## Verified

`npm run lint`, `npm run typecheck`, the homepage, data and phase 10 unit tests, and `npm run build` pass. The Playwright specs are rewritten (`homepage-vision.spec.ts`, `analytics.spec.ts`, `analytics-contract.spec.ts`, `design-system.spec.ts`, `public-site.spec.ts`) but **have not been run**. Recipe pages need the local Supabase stack.

## Next steps

1. Run the rewritten Playwright specs and fix any failures.
2. Now: cut out `art/chosen/house-day.webp` and `house-night.webp` and align them. The night canvas is a different size (1198 × 1313 against 1122 × 1402), so register them on the chimney, roof peak and base corners. Then start the layered scene with these two. When the rest of Round 2 arrives, add the evening house, skies, garden strip, room close-ups and props. Make window and lamp glow masks, and compress for phones (AVIF/WebP, phone sizes first).
3. Replace `HouseScene` with a layered painted scene: skies behind, house in the middle, garden strip in front, with depth on scroll and touch. Blend day, evening and night by the clock. Glow overlays, fireflies at night, steam from the pot prop, a breathing cat prop. Keep the SVG house only as a fallback if useful.
4. Room open: the camera glides in and the painted room close-up fades in, with the room card as real HTML on top. In the Kitchen the steam forms the recipe card. In the Library the closed book prop opens into the storybook sample with the name drawn on the open-book prop.
5. Map the room hotspots and `area`/`zoom` values in `house-rooms.ts` to the painted house.
6. Keep to the mobile rules in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md): first screen usable in about 2s inside Instagram's in-app browser, interactive layers after first paint, text never inside images, reduced motion keeps the scene still.

## Open owner decisions

- Status labels for the Nursery and Shelf ("Later" is used now).
- A waitlist ("Tell me when the Library opens") needs a Supabase table, privacy text and an email provider.
- Photo promises for the Library must be true in code and the privacy policy before launch.
- Optional later: a Rive animator rebuilds the scene as a native Rive file.
