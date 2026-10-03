# Haven house art shot list

Status, 2026-10-03: Round 1 and Round 2 are done. All chosen images are in `art/chosen/` and the house, evening and night versions, skies, garden strip and room close-ups are in use on the homepage. The pot, book and cat props are saved for the next steps.

The homepage house is built from images that code layers and animates: depth between layers, light that follows the visitor's clock, window and lamp glow, and small cut-out props (pot steam, a breathing cat, a book that opens). The images themselves do not move.

## Chosen house

- **Style:** handmade clay miniature (R1-B), option 3.
- **Day:** [art/chosen/house-day.webp](art/chosen/house-day.webp), 1122 × 1402.
- **Night:** [art/chosen/house-night.webp](art/chosen/house-night.webp), 1198 × 1313. Edited from the day image. The layout matches, but the canvas size differs, so day and night must be aligned on fixed points (chimney, roof peak, base corners) before blending. If small objects have drifted, rerun the edit.
- **Why this one:** it looks like a real handmade miniature, the most premium of the three styles. Its pendant lamps, floor lamp and windows glow convincingly at night. The kitchen floor is clear (no table), which leaves room for the steam-to-recipe-card moment. Its palette (lilac gingham, sage, terracotta, cream) matches the site, and it sits on a plain background with a neat mossy base, which makes it easy to cut out.
- **Runner-up:** paper-cut option 3 (`round-1/C-paper-3.webp`), which is calmer and reads best at small sizes, with less wow.
- **All 12 Round 1 options** are in `art/round-1/`: gouache (A), clay (B) and paper-cut (C).

## Preparing images for the site

`my-curated-haven-web/scripts/house-art/prepare_house_art.py` turns the chosen images into the web layers in `my-curated-haven-web/public/images/house/`. It aligns night (and evening, when present) onto the day house, cuts the house out with one shared outline, extracts the lamp glow from the night house, and writes AVIF and WebP at 640, 960 and 1120px. See the script's header for setup.

- The night edit came back at 1198 × 1313 and slightly squashed. The script registers it on the day house to a median error under 1px.
- The evening edit (R2-01, 1080 × 1350) is aligned the same way, to a median error of about 0.5px.
- Skies are cropped to the frame's 4:5 shape. The night moon fell outside that crop, so the script lifts it out, shrinks it and places it left of the roof.
- The garden strip is daylight only; the script relights it for evening and night by matching the colours of the house's own mossy base in each lighting.
- Room close-ups are cropped to 4:5 with a per-room offset (`ROOM_CROP_LEFT`) so the key furniture stays in view.

Chosen files: `house-day`, `house-night`, `house-evening`, `sky-day`, `sky-evening`, `sky-night`, `garden-strip`, `room-kitchen`, `room-library`, `room-nursery`, `room-shelf`, `prop-pot`, `prop-book-open`, `prop-book-closed`, `prop-cat` (all `.webp`).

## Rules for every image

- Attach `art/chosen/house-day.webp` to every prompt as an edit source or style reference.
- For edits, use the tool's **edit** mode and ask it to keep the same 4:5 size. Every object must stay in the same place, or the day-to-night blend wobbles.
- Use the highest resolution available and PNG. The day image is about 1122 × 1402; an upscaled version is wanted for large screens.
- No text in images, no children's faces, a plain light background where possible.
- Generate four of each and name files by prompt, for example `R2-07-3.png`.

## Round 2

| # | Image | Use | Status |
| --- | --- | --- | --- |
| R2-01 | House at golden evening (edit) | Blends between day and night by the visitor's clock | Done, in use |
| R2-02 | House at night (edit) | Same | Done, in use |
| R2-03 to R2-05 | Day, evening and night skies | Behind the house, drift for depth | Done, in use |
| R2-06 | Front garden strip | In front of the house, moves more for depth | Done, in use |
| R2-07 to R2-10 | Kitchen, Library, Nursery and Shelf close-ups | Shown when a room is opened | Done, in use |
| R2-11 to R2-14 | Pot, open book, closed book, sleeping cat | Cut-out props that animate | Done, not yet used |

**R2-01, evening** (use edit mode on the day image)
```text
Edit this image. Keep the exact same house, composition, camera, crop, furniture and positions, and keep the same 4:5 image size. Change only the light to golden-hour evening: low warm orange light from the left, long soft shadows, the three kitchen pendant lamps and the library floor lamp just switched on, the cat still asleep. Keep the background plain and light.
```

**R2-02, night** (done; prompt kept for reruns)
```text
Edit this image. Keep the exact same house, composition, camera, crop, furniture and positions, and keep the same 4:5 image size. Change only the light to night: the three pendant lamps, the floor lamp and the nursery lamp glowing warmly, soft golden light from every window, deep blue shadows on the outside walls, roof and grass, the cat still asleep. Keep the background plain.
```

**R2-03, day sky**
```text
A soft studio backdrop for a handmade clay miniature diorama, seen straight on: a calm morning sky, pale peach near the bottom fading to soft blue at the top, a few small cotton-wool clouds, and low moss-and-felt rolling hills along the bottom third with one or two tiny round trees. The middle is open and empty. Soft studio light, matte textures. No house, no buildings, no people, no text. Landscape 3:2.
```

**R2-04, evening sky**
```text
A soft studio backdrop for a handmade clay miniature diorama, seen straight on: a calm golden-hour sky in warm apricot and rose, a small low orange sun near the right horizon, cotton-wool clouds with pink edges, and low moss hills in warm olive light along the bottom third with one or two tiny round trees. The middle is open and empty. Soft studio light, matte textures. No house, no buildings, no people, no text. Landscape 3:2.
```

**R2-05, night sky**
```text
A soft studio backdrop for a handmade clay miniature diorama, seen straight on: a calm night sky in deep indigo fading to soft plum near the bottom, a small pale crescent moon in the upper right, tiny scattered stars, and low dark blue-green moss hills along the bottom third with one or two tiny round trees. The middle is open and empty. Soft light, matte textures. No house, no buildings, no people, no text. Landscape 3:2.
```

**R2-06, front garden strip**
```text
A wide strip of miniature front garden for a handmade clay diorama, seen straight on at ground level: a mossy grass edge, clusters of tiny lavender and white daisies, a few small round stepping stones, and a little woven basket of lavender at one end. Plain light cream background above. Soft studio light, gentle depth of field. No house, no people, no text. Wide 3:1.
```

**R2-07, Kitchen close-up**
```text
A close, eye-level photo inside the kitchen of the miniature house in the reference image, same handmade clay style and same furniture: a wooden high chair with a lilac gingham cushion, a window with a lilac gingham valance and a small ginger cat asleep on the sill, wooden shelves with plates and hanging mugs, a farmhouse sink with a green gingham skirt, sage cabinets with brass knobs, a cream stove with a lilac gingham towel and a green enamel pot on top, a cream hood, three green pendant lamps glowing softly, green rubber boots and a basket of lavender beside the arched sage-green front door, and a woven rug on terracotta tiles. Warm soft light, gentle depth of field. No people, no text. Landscape 4:3.
```

**R2-08, Library close-up**
```text
A close, eye-level photo inside the attic library of the miniature house in the reference image, same handmade clay style and same furniture: sloped wooden beams under the terracotta roof, a tall bookshelf of colorful books with a small globe and a toy bunny, a sage green armchair with a lavender cushion and a lilac gingham throw, a little wooden side table with a tiny cup, a floor lamp with a scalloped shade glowing warmly, a framed lavender print, a small arched wooden door, a potted plant, and a round woven rug. Warm soft light, gentle depth of field. No people, no text, no readable titles on the books. Landscape 4:3.
```

**R2-09, Nursery close-up**
```text
A close, eye-level photo inside the nursery of the miniature house in the reference image, same handmade clay style and same furniture: soft lilac walls, an arched window with a small plant, a hanging mobile of a moon, stars and a cloud, a framed bunny picture, a wooden crib with a lilac floral blanket and a toy bunny inside, a cream bedside cabinet with a jug of white flowers, a basket of teddy bears, and a round lilac braided rug. Gentle soft light, gentle depth of field. Calm and quiet. No people, no babies, no text. Landscape 4:3.
```

**R2-10, Shelf close-up**
```text
A close, eye-level photo inside the pantry room of the miniature house in the reference image, same handmade clay style and same furniture: wooden shelves with glass jars of preserves and grains, woven baskets, neatly folded sage, cream and lilac blankets, small potted plants and trailing ivy, a window with lilac floral curtains, a basket of lavender, a small wooden stool, and an oval woven rug. Soft afternoon light, gentle depth of field. No people, no text, no brand labels. Landscape 4:3.
```

**R2-11, pot**
```text
A single miniature green enamel cooking pot with a lid and small brass handles, in the handmade clay style of the reference image, photographed front-on in soft studio light on a plain light cream background. Nothing else in the image, no text. Square 1:1.
```

**R2-12, open storybook** (the child's name is written onto the pages in code)
```text
A miniature open hardcover picture book lying flat, photographed from directly above, with both pages completely blank cream paper, no text and no pictures, a soft lilac cloth cover with a little gold star on the corner, in the handmade clay miniature style of the reference image. Plain light cream background, even soft light. Landscape 3:2.
```

**R2-13, closed storybook**
```text
A miniature hardcover storybook standing upright, seen from the front, with a soft lilac cloth cover, a little gold star and no title or text, in the handmade clay miniature style of the reference image, on a plain light cream background in soft studio light. Square 1:1.
```

**R2-14, sleeping cat**
```text
A small ginger cat curled up asleep, seen from the side, in the handmade clay miniature style of the reference image, photographed in soft studio light on a plain light cream background. Nothing else in the image, no text. Square 1:1.
```
