# Phase 1 route and preservation inventory

Source baseline: eb5d5b7c27fbda31586fdfcc96c6b1fbc2921caf.
All source paths below are relative to the nested application directory.

This is a source inventory and proposed implementation contract. Runtime responses still need verification.

## Current routes

| URL | Current source | Phase 1 target | Navigation | Preservation |
| --- | --- | --- | --- | --- |
| / | src/app/page.tsx | Public 200, truthful recipe transition | Header and brand link | Preserve existing sections and baseline |
| /about | src/app/about/page.tsx | Public 200, reviewed brand story | Header and footer | Retain page |
| /support | src/app/support/page.tsx | Public 200, working support | Header and footer | Preserve needed native support guidance |
| /privacy | src/app/privacy/page.tsx | Public 200 | Footer | Retain URL and review factual accuracy |
| /terms | src/app/terms/page.tsx | Public 200 | Footer | Retain URL and review factual accuracy |
| /features | src/app/features/page.tsx | Unavailable/404 by recommendation | None | src/legacy/pages/FeaturesPage.tsx |
| /resources | src/app/resources/page.tsx | Unavailable/404 by recommendation | None | src/legacy/pages/ResourcesPage.tsx |
| /careers | src/app/careers/page.tsx | Unavailable/404 by recommendation | None | src/legacy/pages/CareersPage.tsx |
| /contact | src/app/contact/page.tsx | Unavailable/404 after Support contains the useful contact details | None | src/legacy/pages/ContactPage.tsx |

Careers exists in source even though the reviewed shared header and footer do not currently link to Careers. Audit body links too.

Contact fallback: if verified inbound traffic or a required external integration depends on /contact, use a documented redirect to /support while preserving Contact source. Test the final destination. Do not silently change all deferred pages into homepage redirects.

## Future routes, not Phase 1 additions

| Proposed URL | Purpose | Enable only after |
| --- | --- | --- |
| /recipes | Browse recipes, including three free recipes | Reviewed content and working recipe UX |
| /recipes/[slug] | Recipe details | Free/paid access boundary and content ready |
| /collections/[slug] | Defined paid collection | Manifest, price and terms finalized |
| /account | Purchased access and account management | Auth and entitlement implementation |

These paths are planning placeholders. Later phases should finalize names before linking publicly. Phase 1 must not create empty pages to satisfy navigation.

## Component link audit

| Component or route | Verified source finding | Required review |
| --- | --- | --- |
| Navbar.tsx | Desktop/mobile links include Features, Resources, Contact | Match public route list in both menus |
| Footer.tsx | Features, Resources, Contact and native download links | Remove deferred links and review acquisition CTA |
| Hero.tsx | Native download CTA, AI and milestone overlays | Replace public message |
| src/app/page.tsx | Mounts Hero, Features and HowItWorks | Review each rendered section |
| Support | Links to /contact and mailto support | Consolidate contact destination |
| CTASection.tsx | Native download, popularity and free-download claims | Dormant component review before reuse |
| Testimonials.tsx | Personal quotes with five-star ratings | Require provenance before public use |
| Root metadata | AI parenting companion description | Align with current recipe scope |

CTASection and Testimonials are not imported by the reviewed homepage. Their presence in source does not prove they are visible on the live site.

## Preservation requirements

Record each moved file with original path, new path and baseline SHA. Keep images and shared components until reference review proves a move is safe. Public files are not private storage. Preserve original material in source without promising secrecy for content already published or committed to a public repository.

Do not change the repository-root parenting_app or SuperClaude_Framework gitlink entries.

## Implementation evidence to fill in

- Implementation branch and SHA: pending.
- Live deployment provider and baseline deployment: pending.
- Final route exceptions: pending.
- Deferred file mapping verified: pending.
- Support email delivery verified: pending.
- HTTP and navigation checks: pending.
- Preview screenshots: pending.
