# Phase 3 implementation evidence

Status: design system implemented on a branch. Not deployed. This is not a public recipe launch.

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
