---
version: 1
slug: "my-curated-haven-web-src-app-collections"
primary_target: "my-curated-haven-web/src/app/collections"
related_targets: ["my-curated-haven-web/src/app/collections/[slug]"]
---

Scope: /collections (showroom) and /collections/[slug] (collection page). Mode: Persuade.

Audience and job: parents of toddlers, mostly on phones inside Instagram's in-app browser, deciding whether a themed recipe collection (Halloween, Meal Prep, Protein Packs) is worth buying after trying a free recipe.

Direction (approved 2026-10-04): "Cloth-bound chapters". Inherits the campaign world (warm paper, espresso ink, Fraunces display, Inter facts). Each collection is a cloth cookbook with a gold-foil engraving (generated covers, titles set in HTML). Scrolling into a chapter floods the page with that book's cloth (ember #7a3312, forest #22382b, plum #3e2238; DB-only collections fall back to terracotta). Refuses the product-card grid.

Approved comps: .impeccable/mocks/comp-a-fanned-stack.png (first viewport) + .impeccable/mocks/comp-c-chapter-first.png (chapter grammar).

Memorable moments: the fanned hand of books dealt on load; the cloth flood between chapters; on desktop with motion allowed, each cover swings open on its spine (GSAP) to show the book's real contents page; the contents index photo that follows the pointer.

Constraints: phone-first, no pop-ups or pressure tactics, text never faded in, reduced motion rests everything in place, GSAP desktop-only, no 3D/WebGL. Drafts render everywhere but production (src/config/collections.ts).

Open decisions: real prices (placeholders $6.99 / $12.99 / $12.99), refresh promises, membership (plan RC-01..RC-05), whether drafts' recipes get published, live offers in commerce DB.
