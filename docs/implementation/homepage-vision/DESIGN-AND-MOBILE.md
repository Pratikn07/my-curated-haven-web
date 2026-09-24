# Design and mobile specification

## Preserve the brand system

Use `src/styles/tokens.css`, `src/components/ui/` and the current layout primitives. The homepage expands the story without replacing the design system. Keep Inter for readable body/UI text and the existing brand font for the logo and restrained brand treatment.

| Role | Existing token | Use |
| --- | --- | --- |
| Page background | `--canvas`, `#fdfcf8` | Main page |
| Card background | `--surface`, `#ffffff` | Recipe and preview cards |
| Supporting section | `--surface-muted`, `#f4f1de` | Alternating background, used sparingly |
| Main text | `--text`, `#3d405b` | Headings and readable body |
| Primary action | `--action`, `#a34f3b` | Working recipe actions |
| Terracotta accent | `--brand-terracotta`, `#e07a5f` | Decorative accents, not small low-contrast text |
| Sage | `--brand-sage`, `#8ba888` | Decorative growth cues |
| Strong sage | `--accent-strong`, `#526849` | Functional states after contrast review |

Use one status treatment for all future features. A muted badge with a clear text label should look distinct from an “Available” state without relying on colour alone. Do not dim all preview content so heavily that reading becomes difficult.

## Responsive composition

| Width | Hero | Four pillars | Recipe cards | Feature details |
| --- | --- | --- | --- | --- |
| 320–479 px | Text first, short image below, visible primary action | One column with compact rows | One column | Image and copy stacked |
| 480–767 px | Text first, bounded image height | Two columns only if labels remain readable | One or two columns based on card width | Stacked |
| 768–1023 px | Balanced text/image layout | Two columns | Up to three if readable | Two columns where content fits |
| 1024+ px | Two columns inside existing max-width container | Four columns | Three columns | Alternating image/copy placement, same DOM reading order |

Use content-driven breakpoints within these test ranges. Avoid forcing a four-card strip into a phone carousel. Visitors should see the product range through ordinary scrolling. Do not place the first recipe action below a full-height decorative image.

The hero should contain one headline, a short paragraph and two actions at most. Treat the recipe action as primary. Preview cards use quieter links. Avoid repeated full-width high-emphasis buttons for unavailable features.

## Layout rules

Keep copy widths near the existing reading container. Use roughly two or three lines for overview descriptions. Preview detail sections need one heading, a short paragraph and no more than three concise supporting points. Break long explanations into the FAQ, not image captions.

Use the existing spacing/radius scale. Images should have reserved dimensions and intentional crop positions. Align section headings and cards on the same container grid. Alternate surfaces sparingly so the page reads as one product rather than separate mini-sites.

Do not use floating chat bubbles, artificial typing, blinking online indicators, simulated disabled text fields, confetti or automatic slide changes. These patterns suggest live functionality or create distraction from recipes.

## Interaction and semantics

Use normal links for navigation and buttons only for actual actions such as menu/disclosure toggling. No nested buttons in anchors. Cards should have one clear focusable destination with an accessible name such as “Preview Bloom.” Decorative images should not add duplicate focus stops.

Anchors need sticky-header offsets. Verify direct hash entry, browser back, mobile menu closing and keyboard focus. If using smooth scroll, respect reduced-motion preferences and preserve usable browser defaults.

FAQ content should use accessible native details/summary or simple visible text. All availability information must remain available without opening a disclosure. Do not hide the “not available yet” statement inside an FAQ only.

## Accessibility acceptance

Test 320 px width, 200% zoom, long translated-length sample strings even though initial copy is English, high text size, keyboard-only use, VoiceOver or another real screen reader, and reduced motion. Verify focus visibility, heading hierarchy, landmark names, image descriptions and target sizes.

Use the existing 44 px minimum control target as the project design target. Check actual rendered contrast for body text, muted text, status badges and buttons. Automated scans supplement manual reading and keyboard checks.

Preview labels must stay visible when images fail, CSS is slow or optional scripts are blocked. No essential content starts at opacity zero waiting for animation. Screen readers should understand which areas are usable and which are previews without reading every section.

## Performance budgets

Proposed budgets to confirm in HV-D10: hero responsive image at most 250 KB at the tested phone size, each below-fold preview at most 150 KB, initial mobile transfer at most 1 MB excluding existing unrelated analytics/provider traffic reported separately, and no more than 25 KB added compressed route JS over the measured baseline. These are project targets, not claims of current performance.

Prioritise the actual LCP asset only. Lazy-load below-fold preview images. Avoid a new carousel/video library, loading all image variants or importing native components. Use current image optimisation and responsive sizes. Page meaning should render on the server.

Record LCP/CLS and navigation timings on a repeatable phone/network profile. Proposed targets: lab LCP no greater than 2.5 seconds and CLS no greater than 0.1 on the agreed profile, with absolute values and baseline comparison. Field performance needs real traffic and must not be claimed from a lab run. Investigate a greater than 20% regression in existing recipe-route timing on the same test setup.

If assets exceed budgets, simplify the composition before relaxing the target. Remove decorative imagery before removing preview labels or useful text.

## Reference basis

Implementation should check current [Next.js image guidance](https://nextjs.org/docs/app/getting-started/images) for image behaviour and [W3C guidance for complex images](https://www.w3.org/WAI/tutorials/images/complex/) for text alternatives. The layout and numeric budgets above are project proposals, not provider requirements.
