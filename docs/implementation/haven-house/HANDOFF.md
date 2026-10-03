# Haven house handoff

Updated 2026-10-03. Branch `feat/haven-house-homepage`. The full conversation that led here is in the owner's exported session zip, which is uploaded to the cloud session and must never be committed (this repository is public).

## Where things stand

The homepage is rebuilt around an interactive house, with My Curated Haven as the site brand. The house is now the **painted clay miniature** (`src/components/house/HouseScene.tsx`), layered over a sky, blending between day, evening and night by the visitor's clock, with lamp and window glow, gentle depth on scroll and touch, and fireflies at night. The placeholder SVG drawing is gone. The evening house is a graded stand-in until R2-01 arrives, and the skies are drawn in CSS until R2-03 to R2-05 arrive. The remaining Round 2 images are being generated; see [ART-SHOT-LIST.md](ART-SHOT-LIST.md).

Built in `my-curated-haven-web/`:

- `src/components/house/HavenHero.tsx`: opening screen with the headline "Good enough is exactly enough.", Browse recipes, and the house.
- `src/components/house/HouseScene.tsx` and `HouseDepth.tsx`: the painted scene and its depth effect. Layers: sky (day, evening, twilight, night with moon and stars), contact shadow, the three paintings, a screen-blended glow layer, and fireflies. Each painting is a CSS background declared under a `data-house-*` flag, so it only downloads once it shows.
- `src/lib/house-light.ts`: the light timetable, the before-first-paint script (sets `data-daypart`, `--hs-evening`, `--hs-night`, `--hs-lamps` and preloads the main painting) and the minute ticker. Unit tested in `tests/homepage/house-light.test.mjs`.
- `scripts/house-art/prepare_house_art.py`: aligns, cuts out and compresses the house art into `public/images/house/`.
- `src/components/house/HouseExplorer.tsx`: room list with text status, tap a room to zoom in and open its card, Back or Esc to return, `/#room-<id>` deep links, room-open analytics, and a clock check every minute. Tap areas and zoom points in `house-rooms.ts` are mapped to the painted house.
- `src/components/house/RoomSamples.tsx`: Nursery keepsake sample and Shelf "why we'd pick it" sample. Nothing is saved.
- `src/components/home/LibraryPreview.tsx` and `StorybookSample.tsx`: storybook sample with a typed name, four stories and four art styles.
- `src/components/home/HomeRecipes.tsx`, `HavenPromises.tsx`, `HomeFaq.tsx`: Kitchen recipes, promises and FAQ.
- `src/config/house-rooms.ts`: rooms, statuses and positions. Opening a room is a one-line status change.
- `src/styles/house.css`: the scene layers, light blending, glow, fireflies, zoom and reduced-motion rules. Page colours still switch by `data-daypart` (night 20:00–05:59, evening 17:00–19:59).
- Brand: header, footer, titles, metadata and the share image say My Curated Haven. Nibble & Nurture stays the company in the copyright, legal pages and recipe publisher data.
- Fraunces is the display face for homepage headings. The base heading rule in `globals.css` moved into `@layer base`, so heading line heights now follow their size utilities across the site.
- Removed: old Hero, pillar overview, Chat/Shop/Bloom previews and their tracker, brand story, final action.

## Verified (2026-10-03, cloud session)

- `npm run lint`, `npm run typecheck`, the homepage, data and phase 10 unit tests, and `npm run build` pass.
- Playwright, Chromium desktop and Pixel-sized mobile, against the local Supabase stack: all homepage, analytics, design-system and public-site specs pass, including new checks that each time of day downloads only its painting, fireflies show only at night, reduced motion keeps the scene still, and the pointer adds depth. WebKit was not available in the cloud container, so the iPhone project did not run.
- One real bug fixed: the analytics validator only accepted `hv-` content versions, so every room-open event from the house (`hh-2026-10-02`) was dropped.
- The full suite passed apart from three sign-in email tests, which need the local mail catcher (Mailpit) that was not started.
- First screen on a throttled phone (9 Mbps, 150 ms latency, 4x slower CPU): largest paint about 0.8s by day and 0.95s at night, and the painting is the largest element. The house art adds about 63 KB. The whole first load is about 604 KB compressed: 317 KB JavaScript and 166 KB fonts are the bulk.

## Next steps

1. When Round 2 images arrive: save the chosen R2-01 as `art/chosen/house-evening.webp` and rerun the pipeline; add the skies (R2-03 to R2-05) as sky layers in place of the CSS gradients, and the garden strip (R2-06) as a near layer in front of the house.
2. Room open: the camera glides in and the painted room close-up (R2-07 to R2-10) fades in, with the room card as real HTML on top. In the Kitchen the steam forms the recipe card. In the Library the closed book prop opens into the storybook sample.
3. Props: steam from the pot (R2-11), a breathing cat (R2-14), cut out with the same pipeline.
4. Fonts are the cheapest first-load saving: the design system says only Fraunces and Inter should load, with the Cormorant wordmark as an SVG.
5. Test on real phones from an Instagram DM link, iPhone and Android, before release.

## Open owner decisions

- Status labels for the Nursery and Shelf ("Later" is used now).
- A waitlist ("Tell me when the Library opens") needs a Supabase table, privacy text and an email provider.
- Photo promises for the Library must be true in code and the privacy policy before launch.
- Optional later: a Rive animator rebuilds the scene as a native Rive file.
