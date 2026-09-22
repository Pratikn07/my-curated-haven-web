# Design tokens and theme specification

## Direction

A warm, readable editorial product with useful food photography. Keep My Curated Haven as the umbrella brand and Tiny Soho as the recipe attribution.

Use cream page backgrounds, white reading surfaces, restrained terracotta actions and sage accents. Avoid large translucent panels, gradient text for essential content, continuous floating decorations and oversized empty sections.

These are implementation recommendations. The brand direction is confirmed, while exact token choices and type hierarchy need review in real layouts.

## Colour roles

| Semantic role | Proposed value | Use |
| --- | --- | --- |
| canvas | #FDFCF8 | Main page background |
| surface | #FFFFFF | Cards, forms and reading areas |
| surface-muted | #F4F1DE | Secondary panels |
| text | #3D405B | Primary copy |
| text-muted | #666578 | Supporting copy |
| brand-terracotta | #E07A5F | Decorative brand accent |
| brand-sage | #8BA888 | Decorative brand accent |
| action | #A34F3B | Primary button fill and text links |
| action-hover | #8B402F | Hover/pressed candidate, verify actual pairing |
| action-foreground | #FFFFFF | Text on action fills |
| accent-strong | #526849 | Sage-related functional text and selected states |
| border-subtle | #DDD9D1 | Nonessential separators |
| border-control | #767386 | Visible input/control boundaries |
| focus | #3D405B | Focus ring, with a contrasting offset gap |
| danger | #B42318 | Error text and error icon |
| success | #526849 | Success text and icon |

A subtle divider is not sufficient to identify an input. Use border-control when the boundary conveys function. Pair status colours with text or icons.

Do not blindly replace every current primary token. Separate decoration from action roles and migrate components deliberately.

## Calculated solid-colour contrasts

Ratios were calculated from the listed sRGB colours using relative luminance. Rounded values are for display, not threshold decisions.

| Foreground | Background | Ratio | Decision |
| --- | --- | --- | --- |
| White | Existing terracotta #E07A5F | 2.95:1 | Do not use for normal button text |
| White | Existing sage #8BA888 | 2.61:1 | Do not use for normal button text |
| White | Action #A34F3B | 5.62:1 | Proposed primary button pairing |
| White | Accent strong #526849 | 6.11:1 | Proposed functional sage pairing |
| Ink #3D405B | Cream #FDFCF8 | 9.82:1 | Main copy |
| Muted text #666578 | Cream #FDFCF8 | 5.53:1 | Supporting copy |
| Action #A34F3B | Cream #FDFCF8 | 5.47:1 | Links |
| Danger #B42318 | White | 6.57:1 | Error copy |

WCAG AA requires 4.5:1 for normal text and 3:1 for qualifying large text. These calculations do not certify a whole component. Test hover, focus, disabled presentation, alpha blending, images and actual adjacent colours. Prefer opaque functional colours over foreground/60-style opacity.

Reference: [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Typography

Proposed baseline: Inter for body, controls and headings. Keep Cormorant Garamond for the wordmark. Review a restrained editorial heading treatment in a prototype before expanding serif use. Remove Outfit only after reviewing all consumers.

Use separate names for font-loader outputs and semantic theme aliases:

| Layer | Proposed variable |
| --- | --- |
| Inter loader | --font-inter-source |
| Cormorant loader | --font-cormorant-source |
| Body/UI alias | --font-body |
| Heading alias | --font-heading |
| Wordmark alias | --font-brand |

Map body and heading aliases to the Inter source. Map the brand alias to the Cormorant source. Include suitable system fallbacks. Avoid undefined references and self-referential aliases.

| Text role | Small screens | Larger screens | Line height |
| --- | --- | --- | --- |
| Body and inputs | 1rem | 1rem to 1.125rem for long reading | 1.5 to 1.65 |
| Metadata | 0.875rem minimum | 0.875rem | 1.4 |
| Card title | 1.125rem | 1.25rem | 1.3 |
| Page heading | 2rem | Up to 3rem | 1.15 to 1.2 |
| Section heading | 1.5rem | Up to 2rem | 1.25 |
| Wordmark | About 1.5rem, test full spelling | About 1.75rem | 1.15 |

Use rem units and bounded fluid sizing. No critical ingredient, instruction, error or purchase detail should use tiny metadata text. Keep long reading content near 65 characters per line. Avoid forced uppercase for long labels.

The brand link is not the page h1. Each page should have one clear primary heading.

## Spacing and layout primitives

Use a four-pixel base scale: 4, 8, 12, 16, 24, 32, 48 and 64.

| Role | Initial value |
| --- | --- |
| Small-screen page gutters | 16px |
| Medium-screen gutters | 24px |
| Wide-screen gutters | 32px |
| Card padding | 16px, increasing to 24px |
| Mobile section gap | 32px to 48px |
| Wide-screen section gap | 48px to 64px |
| Content maximum | 1152px |
| Reading column | About 65ch |
| Control height | At least 44px |
| Primary mobile action | Usually 48px minimum |

Use content-driven wrapping rather than fixed-height text boxes. Do not solve overflow by hiding the body scrollbar or clipping content.

## Shape and elevation

Use 12px control corners and 16px to 20px card corners. Reserve pill shapes for short status labels or selectable chips.

Use a light border for ordinary cards and one modest shadow for elevated overlays. Remove the default eight-pixel hover lift from generic reading cards. Keep focus and selected states independent of hover.

Proposed layer roles: page content, sticky header, overlay backdrop, dialog content and transient feedback. Use a small named z-index scale rather than scattered arbitrary values. Native top-layer dialogs need explicit integration testing.

## Motion

Default content is visible before JavaScript runs. Animate optional decoration, not the availability of core copy.

Use brief opacity or small position transitions for direct interactions. Under prefers-reduced-motion, remove entrance/float/scale animations and smooth scrolling. Ensure loading feedback still communicates progress without animation.

No swipe-only controls or auto-advancing recipe carousel.

## Tailwind integration

Keep CSS custom properties as the token source. Map tokens through Tailwind 4 theme variables. Preserve temporary aliases for legacy components while migrating consumers.

Create a proposed src/styles/tokens.css imported by globals.css. Keep base element rules in globals.css. Do not create a separate Tailwind 3 configuration pattern for this Tailwind 4 app.

Use distinct source and alias names to avoid font cycles. Check generated utilities and computed styles after the build. Reference: [Tailwind theme variables](https://tailwindcss.com/docs/theme).

## Token review outputs

Record accepted values, actual component screenshots, contrast results and unresolved adjustments. A colour swatch page alone is insufficient. Review a header, button, input, recipe card and a long reading surface together.
