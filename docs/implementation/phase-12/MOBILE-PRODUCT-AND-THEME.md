# Mobile product and theme

## Keep the current visual foundation

Keep My Curated Haven as the parent brand and Tiny Soho as the recipe voice. Use the existing `src/styles/tokens.css` and `src/components/ui/` primitives. Expansion adds a workflow, not another theme or a new brand identity.

| Role | Existing token/value | Direction |
| --- | --- | --- |
| Page canvas | `--canvas`, `#fdfcf8` | Keep warm cream backgrounds |
| Main text | `--text`, `#3d405b` | Keep readable ink text |
| Decorative terracotta | `--brand-terracotta`, `#e07a5f` | Use as a restrained accent |
| Primary action | `--action`, `#a34f3b` | Use the darker functional token for buttons |
| Decorative sage | `--brand-sage`, `#8ba888` | Use for supporting accents |
| Strong sage | `--accent-strong`, `#526849` | Use for suitable functional states after contrast checks |
| Body/heading | Inter token | Keep legibility and consistent metrics |
| Brand | Cormorant Garamond token | Keep for brand treatment, avoid small control labels |

Verify rendered contrast for each actual state. A palette choice alone does not prove accessibility. Do not introduce pastel text on a cream background to make the pilot look different.

## Information architecture

Recipes remain the public entry point. Keep existing Home, Recipes, About and Support navigation. Add a pilot link inside Account only for eligible participants. No child-profile onboarding before recipe reading, print, purchase or planning.

| Route | Proposed behaviour |
| --- | --- |
| `/recipes` and recipe detail | Preserve existing public free content and access rules |
| `/account` | Existing account actions plus a small pilot entry for eligible users |
| `/account/meal-plan` | Conditional planner route, verified account and server eligibility |
| `/account/meal-plan/print` | Proposed owner-only print surface, current content access rechecked |
| `/features`, `/resources`, `/careers`, `/contact` | Preserve source and existing unavailable response unless one route receives an approved release contract |
| `/design-review` | Synthetic prototype only, keep production exclusion |

Pilot routes must enforce the same boundary in page loaders, actions, API handlers and any direct database interface. Exclude private routes from sitemap and indexing. Do not expose private titles through metadata, prefetch payloads, link previews or server-component responses.

If a reviewed resources branch wins, release only the approved route and content. Review the existing proxy, route checks, sitemap and metadata together. Do not make the legacy careers/contact pages public as a side effect.

## Planner mobile layout proposal

Use one column on narrow screens. Show the week range, previous/next week controls and seven day cards. Each day displays an add action or the selected recipe with open, replace and remove actions. Keep print and delete-week actions available without covering content.

Use a dialog or sheet for recipe selection with a visible heading, close control, accessible search field and explicit recipe choices. List only currently accessible recipes. Restore focus to the triggering day after selection or dismissal. No drag gesture is required. Keep keyboard and screen-reader ordering aligned with the date order.

Do not show a nutrition score, completed-child badge or “balanced week” label. The planner organises chosen recipes. The interface does not assess diet or feeding adequacy.

## Required interaction states

| State | User-facing behaviour |
| --- | --- |
| First visit | Explain the single task and show an empty week. No tutorial wall |
| Loading | Stable placeholder structure and nonblocking explanation |
| Empty picker | Explain no accessible matches, clear search, link to existing recipes |
| Mutation pending | Prevent duplicate action, retain visible selection, announce saving |
| Saved | Confirm only after server commit |
| Failed save | Keep unsaved intent in current component state and offer retry. Do not show success |
| Version conflict | Explain another session changed the week, offer reload and deliberate reapply |
| Unavailable recipe | Show a neutral unavailable entry with replace/remove, no protected body |
| Session expired | Prompt sign-in with a safe return path, clear private cached content |
| Pilot paused | Explain the temporary state and available read/export/delete actions |
| Pilot ended | Show the approved end date and data-access window, preserve original recipe links |

## Accessibility and device verification

Target 320, 390, 768 and 1280 CSS-pixel widths. Check 200% zoom, long titles, text resizing, landscape, on-screen keyboard, VoiceOver and keyboard-only input. Require visible focus, labelled controls, logical headings and no horizontal page overflow. Use existing 44-pixel control sizing as the project target.

Test Safari on iPhone, Chrome on Android, and Instagram's in-app browser manually for the selected workflow. CI browser engines do not fully reproduce Instagram. Record device/browser/version, test actor, candidate SHA and actual result. Use an external-browser escape only where a real limitation is observed.

Print review uses A4 and US Letter. Hide navigation and controls, keep day labels and recipe titles readable, prevent clipped text and avoid full background fills. State print requested separately from print completed in analytics. Do not render child details or account email on the printout.

## Performance

Keep existing recipe routes free from planner bundles and data requests unless the user enters the planner. Prefer existing components and server reads over new heavy calendar dependencies. Fetch a bounded week and paginated accessible recipe list. Avoid seven independent full recipe-body queries on initial render.

Measure against a recorded baseline on the same build mode, device and network profile. Proposed pilot budgets: no more than 20% regression in existing recipe-route lab timings and no more than 25 KB added compressed JS to the recipe entry route. Record absolute values too. Product and engineering approve final budgets before implementation. A pass in a warm desktop browser does not establish phone performance.
