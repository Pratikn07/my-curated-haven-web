# Phase 3 implementation evidence

Status: deployed (PR #7, merged 2026-09-22). The record below describes the branch before release. **Correction (2026-09-25 audit):** the line "Inter for body and headings. Cormorant Garamond for the wordmark only" was never true in the browser. Every page rendered the system font until the audit fix. See [the audit](#audit-2026-09-25).

## Source

- Branch: `phase-3-mobile-design-m8k4`
- Base: `95cf6cd` on `main`
- Public site remains My Curated Haven at https://mycuratedhaven.com/
- Attribution: Recipes by Tiny Soho, inside My Curated Haven

## What shipped in the branch

- Semantic tokens in `src/styles/tokens.css`. Action buttons use `#A34F3B` with white text. Decorative terracotta stays off button text.
- Inter for body and headings. Cormorant Garamond for the wordmark only. Outfit is no longer loaded.
- Shared button, link, field, badge, card, section, and state panels. Cards and sections no longer depend on animation.
- Mobile disclosure navigation, skip link, and one `main` landmark. The brand is a link, not the page heading.
- Public pages use that shell and keep the current truthful copy.
- Recipe layouts live at `/design-review` as fictional fixtures. Production (`VERCEL_ENV=production`) returns 404 for that path. It is not in the sitemap or the public navigation.

## Checks

Local production server, Node 24.5.0.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run test:e2e` | 66 tests discovered. 61 passed. 5 skipped because they belong to the other viewport. |
| axe on `/`, `/about`, `/support` | No serious or critical violations |
| 320px overflow | None on Home, About, or Support |
| Reduced motion | Homepage heading and attribution stay visible |
| Filter Apply and Cancel | Covered in the design-review tests |
| Fixture exclusion | Public HTML does not contain `Sample oat fingers` or `Design review fixture` |
| Print media | Navigation hides and the sample ingredient list stays visible |

Screenshots:

- [home-390.png](evidence/home-390.png)
- [home-320-menu.png](evidence/home-320-menu.png)
- [home-1280.png](evidence/home-1280.png)
- [design-review-390.png](evidence/design-review-390.png)

## Not done

- No real iPhone Safari session. WebKit coverage is Playwright’s mobile WebKit.
- No screen-reader pass.
- No lab LCP number. The public shell dropped the Outfit font request and the animated card/section client code.
- Price, refund terms, and the paid recipe list are still undecided and are not shown as an offer.
- Merging to `main` deploys to production. Rollback target before that merge is source `95cf6cd`.

## Audit 2026-09-25

Live browser audit of `main` at `4b8c3c2`: 8 pages at 320, 390 and 1280px, with axe (WCAG 2.2 AA tags), keyboard, reduced motion, 200% text, print (A4, Letter) and a throttled lab run. Full findings: [the audit backlog](../../audit/AUDIT-BACKLOG.md#phase-3-mobile-first-design-system).

### Fixed

| Item | Cause | Fix | Regression test |
| --- | --- | --- | --- |
| R3-01 fonts never rendered (D04) | `next/font` variables were on `<body>`, but `tokens.css` reads them on `:root`, so `--font-body` computed empty | Font variable classes moved to `<html>` in `src/app/layout.tsx` | `brand fonts are the computed fonts`. With the old layout it fails with the exact system-font string production served |
| R3-02 contrast on `/privacy`, `/terms` (D03) | "Last updated" used `text-foreground/60` (3.27:1) | `text-text-muted` (5.53:1) | The axe scan now covers `/`, `/recipes`, a recipe page, `/about`, `/support`, `/privacy`, `/terms`, `/sign-in` |
| R3-03 skip link not first (D08) | The consent banner rendered before the skip link | Skip link moved ahead of `AnalyticsProvider` in `SiteShell.tsx` | `the skip link is the first focus stop` |
| R3-04 dialog focus (D09) | `ConsentPreferencesModal` handled only Escape | Focus moves in on open, Tab and Shift+Tab stay inside, Escape closes, focus returns to the opener | `cookie preferences dialog manages focus` |
| R3-05 reflow at 200% text (D06) | Grid columns in the hero and feature previews couldn't shrink, and one word at 80px was wider than the screen | `min-w-0` on the grid items, `flex-wrap` on preview captions, `overflow-wrap: anywhere` on headings | `public pages reflow at 200% text size` |

The two keyboard tests skip WebKit: Safari's Tab key skips links and buttons unless the user turns on full keyboard access. That is a browser setting, not a site defect.

Also aligned: the consent dialog no longer claims "90-day retention", which the code doesn't enforce. It now matches the Privacy Policy.

### Follow-ups found after the first deploy

- **Stale CSS from the Vercel build cache (M3-01)**: the first deploy restored a cached build and served the old stylesheet, so the reflow rule never shipped. Production now sets `VERCEL_FORCE_NO_BUILD_CACHE=1`, and a clean rebuild served the new stylesheet with the rule.
- **Layout shift from font swap (M3-02)**: with the real fonts loading, the in-flow consent banner rewrapped and pushed the page (CLS 0.233 on a slow first visit). The banner is now a fixed bottom bar and the page reserves its height. Test: `consent banner floats at the bottom without hiding the footer`.

### Verified, no change needed

Token contrast, server-component primitives, no page overflow at 320, 390 and 1280px, reduced motion, print of every ingredient and step on A4 and Letter (3 pages each), lab LCP 1.08 to 1.62 s with CLS 0, `/design-review` returning 404 in production.

### After deploy (2026-09-25, `8d7dc36`)

Re-ran the live audit on production: no overflow at 320, 390 or 1280px or at 200% text; axe found no violations on 8 pages; Inter and Cormorant Garamond load; CLS 0.062 on a slow first visit at 390px and 0 to 0.041 otherwise; the skip link is the first focus stop; the dialog traps focus and returns it.

Before and after screenshots (consent dismissed): [audit-2026-09-25/](evidence/audit-2026-09-25/). Compare `before-home-390.png` with `after-home-390.png`: the wordmark renders in Cormorant Garamond and the text in Inter.

### Still open

- R3-06: screen-reader (VoiceOver) pass and a real iPhone Safari check need a person.
- R3-07: owner approval of the design direction, now that the real fonts render.
