# Performance, SEO and content evidence

Status: lab measurements recorded (2026-09-26 audit); budgets not yet accepted by the owner, editorial gate open.

## Lab results, 2026-09-26

Lighthouse 12, mobile preset (simulated slow 4G, 4x CPU), production `d3a7560`, headless Chrome for Testing on an Apple Silicon Mac. Single runs vary by up to about 2 s of LCP; Home was run twice.

| Page | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS | Transfer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 78 / 92 | 100 | 100 | 100 | 5.1 s / 2.7 s | 200 ms | 0 | 730 KB |
| `/recipes` | 89 | 98 | 100 | 100 | 3.2 s | 220 ms | 0 | 695 KB |
| `/recipes/soft-baked-blueberry-and-oat-bars` | 91 | 100 | 100 | 100 | 3.2 s | 180 ms | 0 | 696 KB |
| `/sign-in` | 81 | 100 | 100 | 63 (`noindex`, intended) | 4.4 s | 90 ms | 0 | 495 KB |

- Home LCP element is the hero photo; 1.7 s of "load delay" while a below-the-fold recipe card image was also preloaded. Fixed (D10-02); re-measure after deploy.
- With PostHog blocked, Home transferred 612 KB and TBT was 130 ms, so PostHog costs about 120 KB and 70 ms.
- `/recipes` accessibility 98 was heading order (D10-03, fixed).
- These are lab numbers, not field Core Web Vitals. Field data comes from PostHog web vitals after launch.

Proposed budgets for owner acceptance: LCP under 2.5 s on the median of 3 mobile lab runs for Home, `/recipes` and a recipe page; CLS under 0.1; accessibility 100.

## Earlier status

Automated source tests exercise selected canonical URL, sitemap, public metadata, recipe structured-data, mobile viewport and paid-preview boundaries. No approved lab budgets, hardware/network/cache protocol, cold/warm measurements, payload audit or field Core Web Vitals were recorded for a named release candidate. No source-level SEO check is represented here as a performance result.

The approved content manifest and its recipe-by-recipe editorial review are missing. See [CONTENT-REVIEW.csv](CONTENT-REVIEW.csv). Complete QA-P01–QA-P10 after the candidate, accepted budgets, launch manifest and accountable reviewers are established.
