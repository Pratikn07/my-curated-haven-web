# Phase 3: mobile-first design system

[All implementation plans](../README.md)

Status: implemented and deployed (PR #7, 2026-09-22). The 2026-09-25 audit fixed the font, contrast, focus and reflow defects; see [IMPLEMENTATION-EVIDENCE.md](IMPLEMENTATION-EVIDENCE.md#audit-2026-09-25).

## Outcome

Give My Curated Haven one coherent visual system and responsive shell. Make the first recipe experience easy to browse and read on a phone while retaining the broader parenting brand.

Keep the cream, terracotta and sage direction. Refine functional colours, typography, spacing, images and interaction states. Preserve the official brand and domain. Use “Recipes by Tiny Soho, inside My Curated Haven.”

## Read in order

1. [Detailed implementation plan](IMPLEMENTATION-PLAN.md)
2. [Design tokens and theme specification](DESIGN-TOKENS.md)
3. [Component and interaction contracts](COMPONENT-SPECIFICATION.md)
4. [Responsive layouts and recipe patterns](LAYOUT-SPECIFICATION.md)
5. [Accessibility, performance and acceptance](VALIDATION.md)
6. [Implementation handoff](IMPLEMENTATION-HANDOFF.md)

## Source baseline

Reviewed main commit: 39493d5f14573b948c56df856c5ecc5aa14a839d.

The app already uses Next.js, Tailwind CSS 4 and Framer Motion. Application code lives under my-curated-haven-web/. Phase 1 and Phase 2 plans are merged. Their application and infrastructure tasks are not established as complete by those merges.

Observed source findings:

| Area | Finding |
| --- | --- |
| Palette | Cream #FDFCF8, ink #3D405B, terracotta #E07A5F, sage #8BA888 |
| Fonts | Three families loaded: Outfit, Inter and Cormorant Garamond |
| Font variables | Inter writes --font-body while the theme maps --font-body to --font-inter. Logo theme mapping references the same variable name |
| Navigation | Brand uses an h1, menus are duplicated, a link contains a button |
| Card | Client component with Framer Motion and an eight-pixel hover lift |
| Section | Client component starting at opacity zero, revealed on viewport entry |
| Global CSS | Smooth scrolling and animation have no reduced-motion override in the reviewed file |
| Overflow | Body hides horizontal overflow, which risks masking layout defects |
| Reusable UI | Badge, Card and Section exist, but no reviewed common Button or Field component |

These are source findings. Computed font behaviour, keyboard interactions and rendered contrast still require browser checks.

## Scope

Implement theme tokens, core UI primitives, responsive shell, readable current public pages, and isolated recipe design examples with synthetic fixtures.

Specify future recipe browsing, detail, filtering, purchase-state and print patterns. Their public data, access, checkout and export behaviour belongs to later phases.

## Dependencies

- [Phase 1 scope](../phase-1/PRODUCT-SCOPE.md) controls brand, public routes and claims.
- [Phase 2 setup](../phase-2/README.md) supplies verification and protected previews.
- Tokens and local prototypes start independently.
- Public shell integration depends on the Phase 1 route/content contract.
- Release depends on implemented Phase 2 safeguards, not their documentation alone.

## Completion

The implemented shell and primitives pass the documented checks. Private recipe examples demonstrate the design states without exposing unbuilt public offerings. Design decisions and remaining product dependencies are recorded for later phases.
