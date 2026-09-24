# Homepage vision and feature previews

Status: detailed implementation plan. Homepage development, asset production, validation and release are pending.

This is a **separate effort**, outside Phases 1–12. The goal is to introduce the broader My Curated Haven vision while giving visitors a clear recipe starting point. Chat, Curated Shop and Bloom receive labelled sneak peeks. Their underlying features are not implemented through this effort.

## Approved direction

- Keep My Curated Haven and https://mycuratedhaven.com/ as the brand and domain.
- Introduce the four product areas near the top: Recipes, Parenting Chat, Curated Shop and Bloom.
- Keep recipes as the initial usable product and primary acquisition path.
- Explain “Recipes by Tiny Soho, inside My Curated Haven.”
- Preview future web experiences with images and short descriptions, without a launch-date promise.
- Preserve the cream, terracotta and sage visual direction.
- Implement additional parenting features gradually through separate decisions and delivery work.

The homepage describes the vision without implying a recipe purchase includes future chat, shopping or tracking tools. A preview link leads to more information on the homepage, not a nonfunctional product route.

## Package map

| Document | Purpose |
| --- | --- |
| [Scope and baseline](SCOPE-AND-BASELINE.md) | Source findings, scope boundaries, dependencies and decisions |
| [Implementation plan](IMPLEMENTATION-PLAN.md) | Eighteen tasks, dependencies, source targets and acceptance evidence |
| [Page structure](PAGE-STRUCTURE.md) | Section order, visitor journeys, navigation and recipe availability states |
| [Content and copy](CONTENT-AND-COPY.md) | Draft copy, status labels, claims register and purchase boundaries |
| [Preview assets](PREVIEW-ASSETS.md) | Native source references, synthetic content, image briefs and rights |
| [Design and mobile](DESIGN-AND-MOBILE.md) | Palette, layouts, accessibility and performance budgets |
| [Technical integration](TECHNICAL-INTEGRATION.md) | Components, recipe reads, configuration, caching, metadata and test updates |
| [Measurement](MEASUREMENT.md) | Consent-safe preview metrics, comprehension testing and optional follow-up |
| [Validation and acceptance](VALIDATION-AND-ACCEPTANCE.md) | Sixty-four acceptance scenarios and release gates |
| [Release and handoff](RELEASE-AND-HANDOFF.md) | PR sequence, deployment verification, rollback and maintenance |

## Delivery boundary

This plan does not add chat sessions, AI providers, product purchasing, affiliate tracking, expert bookings, child profiles, milestones, a planner, a waitlist or a subscription. Existing native functionality remains reference material for the sneak peeks.

The first version also excludes an “I'm interested” form or vote service. Interest measurement uses consenting preview interactions and a small comprehension study. A later explicit scope decision would be needed for a functional interest collector and its data lifecycle.

## Relationship to earlier phases

Use existing design, recipe, account, analytics and launch safeguards where relevant. No numbered phase is replaced or renumbered. This homepage effort does not depend on completion of Phase 12 research, and does not select Phase 12's next feature.

The preparation version of the homepage is allowed before recipes launch. The free-recipe version needs verified anonymous recipe access. The collection version needs approved commercial terms and existing commerce release gates. Preview-only content does not require those features to launch.

## Completion meaning

The implementation is complete when visitors understand the broader brand, distinguish available recipes from future previews, reach working destinations, and pass the documented mobile, content, privacy and release checks. Merging this plan completes documentation only.

Source baseline: web `de47ca0d828af3457170d2b201fdebebe68701a9`, native `5e5caa73f5a5d0705572739dd881a96abe9be23b`, reviewed 2026-09-24.
