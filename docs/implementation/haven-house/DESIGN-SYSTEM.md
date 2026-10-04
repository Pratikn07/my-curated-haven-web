# Haven house design system

Status: proposed on 2026-10-02 for the homepage redesign. Not yet approved or implemented.

Prototype: https://claude.ai/artifact/AUwUJwTELHLonY7c6hpDBi (private to the owner until shared).

This document updates the [Phase 3 design tokens](../phase-3/DESIGN-TOKENS.md). It replaces that document's Direction, Typography, Shape and Motion guidance. The Phase 3 colour contrast rules, spacing scale, control sizes, layer roles and Tailwind integration stay in force unless this document says otherwise.

## Direction

My Curated Haven is a calm parenting magazine you can walk around in. The homepage opens on an illustrated house. Each room holds one part of the product: the Kitchen (recipes) is open, and the other rooms let parents try a small sample of what is coming.

Brand idea: **good enough is exactly enough.** The site gives permission before it sells anything, and never shows parents a standard to live up to.

Working rule for every screen: **useful first, delightful second, never in the way.**

## What carries over from Phase 3

- Content is visible before JavaScript runs.
- Text colour pairs meet WCAG AA (4.5:1 for normal text).
- Controls are at least 44px tall, and primary mobile actions about 48px.
- The four-pixel spacing scale, the 65-character reading column and the 1152px content maximum.
- No swipe-only controls and no auto-advancing recipe carousel.
- CSS custom properties in `src/styles/tokens.css` remain the token source, mapped through Tailwind 4 theme variables.

## Mobile first: the Instagram path

Most visitors arrive from Instagram on a phone, inside Instagram's in-app browser. Design and test for that first; desktop is the adaptation.

- **Phone composition first.** The house illustration is drawn in portrait for a 390px-wide screen. Desktop gets a wider crop with more garden and sky.
- **Something useful on the first screen.** What the site is, the headline, the tap hint and the house with every room tag, including the open Kitchen's, fit above the fold on a 390 × 664px viewport (an iPhone screen minus Instagram's bars). "Browse recipes" waits directly under the house.
- **Readable labels.** Room labels and statuses are HTML laid over the illustration, at least 14px, never text inside the scaled-down drawing.
- **Big tap targets.** Each room's tap area is at least 44 × 44px at 360px width. Main actions sit in thumb reach.
- **Viewport units.** Use `svh`/`dvh`, not `100vh`, because Instagram's own top and bottom bars change the visible height. Respect safe-area insets.
- **Nothing blocks the first screen.** No pop-ups, no full-screen consent or signup prompts, no interstitials.
- **No sign-in on the path to value.** Google blocks its sign-in inside embedded in-app browsers like Instagram's, so the Google button in `SignInForm.tsx` fails there. Email codes force a switch to the mail app and back. Recipes, room samples and the waitlist must all work without an account.
- **Check device-only features in Instagram's browser.** `window.print()` in `PrintButton.tsx` may do nothing there. Offer a fallback such as "Open in your browser to print" or saving the recipe.
- **Fonts.** Inter and Fraunces load as web fonts, Latin subset and preloaded. The Cormorant wordmark loads only its own letters ("My Curated Haven", about 2 KB per style, in `src/app/fonts/`), so it stays real text. Handwritten notes use an SVG or are dropped on phones.
- **Images.** Served through `next/image` as AVIF or WebP, sized for phone widths. The first-screen image is preloaded.
- **Scripts.** The interactive layer (Rive or dotLottie runtime) loads only after the first screen is usable, and never on the critical path.

Targets, measured on real Instagram traffic:

| Measure | Target |
| --- | --- |
| Largest Contentful Paint (75th percentile, phones) | Under 2.5s, aiming for under 2.0s |
| Interaction to Next Paint | Under 200ms |
| Cumulative Layout Shift | Under 0.1 |
| First-screen weight before the interactive layer | Under about 300 KB |
| Bounce rate per Instagram post (from UTM tags) | Tracked in PostHog for every post |

Before each release, open the page by sending its link in an Instagram DM and tapping it, on one iPhone and one Android phone. Desktop emulation does not reproduce the in-app browser.

## Time of day

The page takes on the light of the visitor's own clock. Light is atmosphere only. It never signals whether a room is open.

| Period | Device time | Look |
| --- | --- | --- |
| Day | 06:00 to 16:59 | Soft peach sky, sun, white clouds |
| Evening | 17:00 to 19:59 | Golden sky, low orange sun, pink clouds, fairy lights half on |
| Night | 20:00 to 05:59 | Indigo sky, moon, stars, lamps and fairy lights on |

- Page colours switch at the period boundaries above. The house scene does not switch: its day, evening and night paintings blend gradually along a timetable (golden from 17:00, twilight around 19:00 to 20:00, full night from 20:45, dawn from 05:30, full day from 08:30), and the lamps come on as it gets dark. The timetable lives in `src/lib/house-light.ts`.
- A small inline script from `src/lib/house-light.ts`, run in `src/app/layout.tsx`, sets `data-daypart` and the scene's light before first paint, so a night visitor never sees a flash of day colours. It also preloads the painting that shows most.
- A client effect rechecks every minute, so an open page follows the light.
- Each painting downloads only when it shows. A daytime visitor never downloads the night house, and at full night the day house is skipped.
- The period follows the clock, not the operating system's dark mode setting.
- Without JavaScript the page renders in Day.

## Colour

The Phase 3 base roles keep their names. Each period redefines the same roles. Values below come from the prototype.

| Role | Day | Evening | Night |
| --- | --- | --- | --- |
| canvas | #FBF8F2 | #F9EFE1 | #1C1923 |
| surface | #FFFDF9 | #FFFAF1 | #2A2533 |
| text | #3A3C55 | #3A3C55 | #F1E8DA |
| text-muted | #64627A | #64627A | #C0B6C6 |
| action | #A34F3B | #A34F3B | #F2A98F |
| action-foreground | #FFFAF5 | #FFFAF5 | #2A1612 |
| glow | #F6C98A | #F4AE62 | #F3B765 |
| sky top / bottom | #F8E4D3 / #FBF4EA | #F2A979 / #F9DCBC | #1A1C3A / #3B2F50 |

Room colours identify a room's section and illustration. They are never used for body text on their own.

| Room | Wash (day) | Accent (day) | Accent (night) |
| --- | --- | --- | --- |
| Kitchen | #F8E6DC | #A34F3B | #F2A98F |
| Library | #EEE9F6 | #6A5B92 | #C6B9EA |
| Nursery | #FBE9DE | #E07A5F | #E58C72 |
| Shelf | #E7EEE2 | #526849 | #AAC4A1 |

### Calculated contrasts

Ratios use relative luminance from the listed sRGB values. They do not certify a whole component.

| Pair | Ratio |
| --- | --- |
| Day text on day canvas | 10.12:1 |
| Day muted text on day canvas | 5.55:1 |
| Day button text on action | 5.41:1 |
| Evening text on evening canvas | 9.43:1 |
| Evening muted text on evening canvas | 5.17:1 |
| Evening action link on evening canvas | 4.94:1 |
| Night text on night canvas | 14.26:1 |
| Night muted text on night canvas | 8.86:1 |
| Night button text on night action | 8.88:1 |
| Night action link on night canvas | 8.94:1 |
| Library accent on Library wash (day) | 5.00:1 |
| Library accent on Library wash (night) | 7.93:1 |

## Typography

| Role | Face | Notes |
| --- | --- | --- |
| Headings and display | Fraunces | Light (300) for the hero, regular for section headings. Italic for single emphasised words |
| Body, controls, metadata | Inter | Unchanged from Phase 3 |
| Wordmark | Cormorant Garamond | Unchanged. "Haven" set in italic terracotta |
| Handwritten notes | Caveat | At most one note per screen. Never for essential information |

- Hero heading: `clamp(2.6rem, 8vw, 6.4rem)`, line height about 1.
- Section heading: `clamp(2rem, 4.4vw, 3.1rem)`.
- `tests/e2e/design-system.spec.ts` currently asserts Inter on the page h1. That assertion changes with this decision.

## Shape and elevation

- Phase 3 corners stay: 12px controls, 16px to 20px cards. The house illustration and the storybook may use their own shapes.
- Reading cards keep no hover lift. Photo cards in the hero collage may lift up to 4px on hover.
- One shadow token for elevated surfaces, as in Phase 3.

## Motion

Motion should feel like a slow breath, never like a notification.

| Kind | Rule |
| --- | --- |
| Ambient decoration | Allowed. Loops of 6 seconds or longer, ease-in-out, no bounce. At most one ambient motion per screen region. Only decoration moves, never text a parent needs |
| Load moments | One-off, under 1.6 seconds, starting from a visible resting state (position only, never from opacity 0) |
| Room zoom | 600ms to 900ms ease-out camera move, no spring or bounce |
| Storybook style changes | Only in the Library sample. Pauses as soon as the parent picks a style |
| Reduced motion | No ambient loops or load moments. Room zoom becomes an instant switch. Everything still looks finished |

## The house

- **Tap is the only required gesture.** No pinch, swipe, drag or press-and-hold to reach anything.
- **Every room has a tag pinned to it on the house,** for example "Kitchen · Open now". Tags sit on the beam or floor below each room so they never cover the furniture, and they are the room links (the accessible list of rooms). The open room's tag is filled terracotta; the others are quiet. Status is always written, never shown by colour or lighting alone. A slim row of room names under the house is a second way in.
- **Rooms answer a touch.** A finger on a room (or a pointer over it) warms its light and lifts its tag. On a first visit only, the rooms light up one after another, top of the house first, in under two seconds; never with reduced motion, and tags never start hidden.
- **Every room is a real link** that works without JavaScript and from the keyboard.
- **Opening a room steps inside it, without moving the page.** The room view covers the screen on phones (the painted close-up on top, what the room holds in a sheet below) and is a centred panel on large screens. The page behind stays exactly where it was. "Back to the house", Escape and the phone's back gesture all step out; the back gesture never leaves the site. "Other rooms" moves between rooms without stepping out. Without JavaScript the room cards are listed under the house instead.
- **Nothing is lifted off the ground.** The front garden only sways sideways with the depth effect; moving it vertically would show a gap under it.
- **A direct "Browse recipes" button sits right under the house,** after the room names (owner's choice: the house comes first).
- **One small surprise per room,** such as steam that turns into tonight's recipe card. It is a bonus, never the only route to anything.
- **Coming-soon rooms offer a sample to try,** marked "Sample", with a way to hear when the room opens.
- **The hint "Tap a room to step inside"** sits directly above the house with a door icon (not a hand or emoji: a flipped hand looked odd and emoji vary by phone). The open room's tag carries a cream halo that ripples a few times, then rests; no ripple with reduced motion.

| Room | Status | Sample |
| --- | --- | --- |
| Kitchen · Recipes | Open now | The real recipes |
| Library · Storybooks | Coming soon | Type a name, pick a story and style, watch a sample page change |
| Nursery · Milestones | Owner decision: Later or no tag | Stamp a sample "first word" keepsake card. Nothing is saved |
| Shelf · Family finds | Owner decision: Later or no tag | Flip a sample card to see why it was picked |

## Build approach

Checked against the state of web tooling on 2026-10-02. Each layer has a fallback, so the house never depends on one tool loading.

| Layer | Tool | Why |
| --- | --- | --- |
| Base house | Server-rendered SVG in React | Complete before JavaScript runs, accessible labels and links, works in every browser. Also the fallback for every layer above it |
| Living illustration | Rive canvas over the SVG, loaded after first paint | Rive now has scripting (Luau) and data binding for lists and images, so live recipes and their photos can be bound into the drawn Kitchen. Day, evening and night become a state machine input |
| Alternative to Rive | dotLottie with state machines | Lottie Creator now supports state machines, theming and data binding, and Figma prototypes export to interactive dotLottie. Choose it if the illustrator works in Figma or After Effects rather than Rive |
| Room zoom and page changes | Browser View Transitions API | Same-document view transitions work in Chrome, Edge, Safari 18+ and Firefox 144+. The Kitchen window can grow into the recipe page's header photo |
| UI pieces (cards, sample panels) | Motion (the renamed framer-motion), already installed | One animation library is enough. GSAP is now free but would duplicate it |
| Scroll effects | CSS scroll-driven animations as an enhancement only | Not yet default in stable Firefox, so nothing may depend on them |
| 3D | Not used on the homepage | WebGPU now works across major browsers including iOS 26, but a 3D house or Gaussian splat scene costs far more to load inside Instagram's browser and is harder to make accessible |

## Imagery

- The house is commissioned illustration in one consistent style, with day, evening and night versions. The prototype's drawn shapes are placeholders.
- Real photographs of real dishes are preferred to AI-generated images.
- No "perfect parent" scenes: spotless rooms, styled outfits, flawless light. Real kitchens and real mess are welcome.
- Samples never use a real child's photograph. The storybook sample uses a drawn child.

## Copy voice

- Neutral warmth that suits any time of day, for example "A little room to pause."
- Do not assume a routine ("Nap time?") or promise what we cannot know ("Rest is coming").
- Do not judge. Lines like "If they only eat the peas, that counts." are the house style.
- State facts plainly. No urgency, no "expert-vetted" or other claims the site cannot support.

## Calm rules

- No pop-ups, countdowns, stock warnings or autoplay sound.
- Sound, if added, is off until the parent turns it on.
- One main action per screen.

## Performance budget

- House illustration on the first screen: about 60 KB or less.
- No video on the first screen. Room videos load only when a room is opened.
- Target: the first screen is usable within about 2 seconds on a mid-range phone inside Instagram's in-app browser.

## Open decisions

1. Headline (decided): "Come in. The kitchen's open." under "Free toddler recipes by Tiny Soho". "Good enough is exactly enough." stays as the brand sign-off. Revisit "Free" if paid collections launch.
2. Status labels for the Nursery and Shelf.
3. Whether to commission an illustrator, and when.
4. Approval of Fraunces for headings.
