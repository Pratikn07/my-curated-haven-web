# Haven house handoff

Updated 2026-10-03. Branch `feat/haven-house-homepage`. The full conversation that led here is in the owner's exported session zip, which is uploaded to the cloud session and must never be committed (this repository is public).

## Where things stand

The homepage is rebuilt around an interactive house, with My Curated Haven as the site brand. The house is the **painted clay miniature** (`src/components/house/HouseScene.tsx`): a painted sky behind, the house in the middle and a front garden strip in front, all blending between day, evening and night by the visitor's clock, with lamp and window glow, gentle depth on scroll and touch, and fireflies at night. Opening a room glides the camera in and its painted close-up settles over the frame; in the Kitchen the cat on the windowsill breathes. Steam rises from the painted pot on the house and from the pot in the Kitchen card. The Library card's closed storybook swings open on the way to the sample, which is laid out on the open book. All Round 2 art is in `art/chosen/`; `prop-cat` is held back (see the shot list). See [ART-SHOT-LIST.md](ART-SHOT-LIST.md).

Built in `my-curated-haven-web/`:

- `src/components/house/HavenHero.tsx`: opening screen with the headline "Good enough is exactly enough.", Browse recipes, and the house.
- `src/components/house/HouseScene.tsx` and `HouseDepth.tsx`: the painted scene and its depth effect. Layers: painted skies (with a drawn twilight blend for dawn and dusk), contact shadow, the three house paintings, a screen-blended glow layer, the front garden strip and fireflies. Room close-ups live in `HouseExplorer.tsx`. Each painting is a CSS background declared under a `data-house-*` flag, so it only downloads once it shows.
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

1. Fonts are the cheapest first-load saving: the design system says only Fraunces and Inter should load, with the Cormorant wordmark as an SVG.
2. The open-book image (about 7–18 KB) loads with the page even though the Library is further down; it could wait until the visitor scrolls near it.
3. Test on real phones from an Instagram DM link, iPhone and Android, before release.

## Open owner decisions

- Status labels for the Nursery and Shelf ("Later" is used now).
- A waitlist ("Tell me when the Library opens") needs a Supabase table, privacy text and an email provider.
- Photo promises for the Library must be true in code and the privacy policy before launch.
- Optional later: a Rive animator rebuilds the scene as a native Rive file.
