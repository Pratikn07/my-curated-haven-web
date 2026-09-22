# Phase 1 implementation evidence

Status: code complete and checked on a local production server. Not deployed to https://mycuratedhaven.com/.

## Source

- Branch: `phase-1-site-foundation-k7m2`
- Base: `4dabbaa0d97a0c4fc6c465cd145e750d56c2d01b` (main after the Phase 1–3 documentation merges)
- Reviewed app baseline in the plan: `eb5d5b7c27fbda31586fdfcc96c6b1fbc2921caf`
- Main moved forward from that baseline by documentation commits only. The application files at `4dabbaa` match that baseline.
- Runtime used for checks: Node `v24.5.0`
- Framework: Next.js `16.0.7` from the committed lockfile
- Gitlinks left unchanged: `parenting_app`, `SuperClaude_Framework`

## Hosting, recorded without changing it

- Live responses from https://mycuratedhaven.com/ send `server: Vercel`.
- GitHub production deployment at the time of this work: `4dabbaa`, created `2026-09-22T20:32:42Z`.
- That deployment is the rollback target. Restoring it returns the previous public site, including the deferred pages.
- Pull requests on this repository already create Vercel preview deployments. Preview access protection was not verified. Treat preview URLs as public.
- This branch does not put the old Features, Resources, Careers, or Contact bodies on the preview. Those routes return 404.

## Baseline commands, before edits

Run from a clean export of `4dabbaa`, directory `my-curated-haven-web`:

| Command | Result |
| --- | --- |
| `npm ci` | Exit 0. Reported 14 existing npm audit findings. Not changed. |
| `npm run lint` | Exit 1. 60 pre-existing `react/no-unescaped-entities` errors and 9 unused-import warnings. |
| `npx tsc --noEmit` | Exit 0 |
| `npm run build` | Exit 0. Deferred routes were static 200 pages. |

Live routes `/`, `/features`, `/resources`, `/careers`, `/contact`, and `/support` returned HTTP 200 on the production domain before this branch.

The App Store URL in the old header, `https://apps.apple.com/us/app/my-curated-haven/id6755850584`, returned HTTP 404. Apple's lookup API returned `resultCount: 0`. Those links are removed from public navigation.

## What the branch changes

- Public header links are Home, About, and Support. Footer links are About, Support, Privacy, and Terms.
- Homepage copy is the toddler-recipe promise and states that nothing is for sale yet.
- About explains My Curated Haven and Tiny Soho without expert, AI, or privacy-superlative claims.
- Support offers `support@mycuratedhaven.com` by email link and copy. It does not offer live chat, a ticket form, a response-time promise, or subscription instructions.
- `/features`, `/resources`, `/careers`, and `/contact` return HTTP 404 with Home and Support links. Middleware sends that HTML immediately and sets `Cache-Control: no-store` so a later restoration is not stuck behind a long-lived 404.
- The old page bodies are in `my-curated-haven-web/src/legacy/pages/` and are not imported by a route.
- Sitemap and robots use `https://mycuratedhaven.com`. The sitemap lists only `/`, `/about`, `/support`, `/privacy`, and `/terms`.
- Privacy and Terms stay public. A dated note says they still describe the earlier app and that this website does not sell anything yet. The old legal text is otherwise unchanged. Refund terms were not invented.

## Route preservation

| Original | Preserved source | Public response |
| --- | --- | --- |
| `src/app/features/page.tsx` | `src/legacy/pages/FeaturesPage.tsx` | 404 |
| `src/app/resources/page.tsx` | `src/legacy/pages/ResourcesPage.tsx` | 404 |
| `src/app/careers/page.tsx` | `src/legacy/pages/CareersPage.tsx` | 404 |
| `src/app/contact/page.tsx` | `src/legacy/pages/ContactPage.tsx` | 404 |

## Claims on the public surface

| ID | Resolution in this branch |
| --- | --- |
| C01 | Root metadata now describes toddler recipes, not an AI companion. |
| C02, C03 | Hero no longer claims expert guidance, milestones, or 24/7 AI. |
| C04, C05 | Features and How it works are not mounted. Source kept. |
| C06 | App Store links removed after the listing returned 404. |
| C07, C08 | CTA and testimonials stay unmounted. |
| C09 | About no longer says the product meets the strictest data-protection standards. |
| C10, C11 | Support no longer describes a premium subscription, App Store cancellation, expert content, or encryption. |
| C12 | Public contact is the email link. Live chat is not offered. The old contact form remains in legacy source. |
| C13 | Privacy and Terms kept, with a factual scope note. Full policy rewrite still needs owner review. |
| C14 | No price, refund, or future-addition promise. |
| C15 | Footer year is the render year. |
| C16 | Resources and careers bodies are outside the public response. |

## Checks on this branch

Local production server: `next start --hostname 127.0.0.1 --port 3456` after `npm run build`.

| Check | Result |
| --- | --- |
| `npm run lint` | Exit 0 |
| `npx tsc --noEmit` | Exit 0 |
| `npm run build` | Exit 0 |
| `node scripts/check-public-routes.mjs` | Passed. Public routes 200. Deferred routes, query strings, and trailing slashes 404. Banned phrases absent from HTML and loaded homepage scripts. Sitemap limited to the five public URLs. |
| `node scripts/check-layout.mjs` | Passed in headless Chrome at 320, 375, 390, 768, and 1280 CSS pixels. No horizontal overflow. Mobile menu opened and closed with Escape. |

Screenshots from that run:

- [home-390.png](evidence/home-390.png)
- [home-1280.png](evidence/home-1280.png)
- [support-390.png](evidence/support-390.png)
- [unavailable-390.png](evidence/unavailable-390.png)

## Acceptance items still open

- A16 preview: local production-mode review is done. The Vercel preview exists only after this branch is pushed. It is not access-protected evidence.
- Phase 2 CI is not installed. The Phase 2 specification asks for `.github/workflows/web-ci.yml`, job `web-quality`, and Playwright. This branch adds local scripts instead of that workflow, so the two do not collide.
- Support mailbox delivery was not tested. No test email was sent. The address is the one already published on the site.
- Price, paid recipe count, refund terms, and future additions remain undecided and are not stated as offers.
- Production deployment was not requested and was not done.

## Release

Do not merge this branch to `main` until the wording is accepted. A merge to `main` deploys to production on the current Vercel setup. Rollback is the production deployment of `4dabbaa`.
