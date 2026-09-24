# Performance, SEO and content

## Performance measurement

Use a production build on stable protected staging. Record device/CPU, network profile, region, viewport, browser version, consent state, login state and cold/warm cache. Run five repeatable lab samples per representative route and report the median plus worst sample. Investigate outliers, do not delete them without explanation.

Representative routes: homepage, catalog with filters, image-rich free recipe, collection offer, sign-in, pending return and owned paid detail. Measure optional analytics both off and on if enabled. Separate application latency from hosted Checkout latency.

| Measure | Proposed launch target | Evidence and limit |
| --- | --- | --- |
| Lab LCP | At most 2.5 seconds on the agreed mobile profile | Median and worst sample recorded, not a claim about real-user percentile |
| Lab CLS | At most 0.1 through loading and primary interactions | Include image/font/consent UI transitions |
| Filter/save action feedback | Visible local acknowledgement within 200ms under the chosen profile | Instrument interaction and final server completion separately |
| Critical app route server response | Warm p95 at most 1 second across 30 sequential staging requests | Proposed small-sample guardrail, not capacity certification |
| Application error rate | No unexplained 5xx during the scripted launch journeys | Record provider outages separately and test graceful recovery |
| Payload budget | Establish route baseline, then review any increase above 10% before sign-off | Record JS, images and total transfer. Relative budget does not excuse an already slow baseline |

These are proposed engineering gates for owner acceptance in P10-01. Reconcile with existing Phase 2/3 budgets and use the stricter approved rule where they overlap. Do not change a target after a poor result without documenting the decision and customer impact.

Field Core Web Vitals targets are LCP at most 2.5 seconds, INP at most 200ms and CLS at most 0.1 at the 75th percentile. Prelaunch has no representative field cohort. Use lab evidence now and hand field measurement to Phase 11. A Lighthouse score or one fast desktop run does not prove field performance.

For load rehearsal, agree expected initial campaign traffic and a capped staging test budget. Exercise public reads plus a small synthetic authenticated workload against the actual query path. Do not load-test Stripe or production through this plan. Record saturation and error behaviour, and set launch traffic conservatively when capacity remains uncertain.

## Performance, SEO and content cases

| ID | Action | Required result |
| --- | --- | --- |
| QA-P01 | Measure representative mobile routes cold/warm with five samples | Accepted LCP/CLS budgets and reported raw samples, no hidden outlier removal |
| QA-P02 | Inspect hero images, fonts, app bundles and third-party requests | Appropriately sized images, stable dimensions, no unnecessary blocking script or duplicated large dependency |
| QA-P03 | Exercise filter, save and owned recipe reads under slow network plus bounded staging load | Responsive feedback, bounded server requests, useful timeout states and measured latency |
| QA-P04 | Crawl public links, status codes, canonical tags and redirect variants | Official HTTPS origin, no loop/broken primary path, true 404 for unavailable content, no accidental production-wide noindex |
| QA-P05 | Fetch sitemap, robots and public response metadata as anonymous | Only approved public routes/recipes. No auth, account, owned-library, callback or deferred route indexing |
| QA-P06 | Inspect free recipe JSON-LD and social previews, compare with visible body | Accurate reviewed content, correct URLs/images, no invented rating/nutrition, no malformed or injectable JSON |
| QA-P07 | Fetch paid detail/offer anonymously and after owner cache warmup, inspect HTML/RSC/JSON-LD/OG | Approved previews only. No full ingredients/method through public structured data or shared caches |
| QA-P08 | Audit every free and paid manifest member against reviewed source | Correct UUID/revision, quantities, yield, method, allergens, storage, image rights and no placeholder/default passed off as reviewed fact |
| QA-P09 | Compare collection page, Checkout, receipt, terms, refund/support and future-additions copy | One consistent approved offer. Exact membership/count and one-time price match server configuration |
| QA-P10 | Check withdrawn recipe and material content update after cache warmup | Public discovery and access follow the approved withdrawal policy. No stale unsafe content, no silent rewrite of purchased membership |

## Editorial release checklist

Create one review row per launch recipe with source UUID, web slug, content revision, reviewer, review date, findings and approval. The Phase 5 audit is the starting point, not automatic final approval for every item.

Review units and amounts, sequence of steps, total time arithmetic, plausible yield, ingredient-method consistency, storage/reheating wording and suitability wording for the intended toddler audience. An empty allergen array does not prove “allergen-free”. Source defaults such as a fallback yield need explicit verification. Dietary filters must agree with the full ingredients and approved substitution notes.

This QA plan does not supply new medical or food-safety advice. Escalate unsupported safety claims or uncertain instructions for qualified editorial review before publication. Mark the recipe blocked until resolved rather than inventing values to complete a field.

Verify image use rights and absence of personal child information. Confirm the three-free-recipe count from database and public surface. Ensure draft synthetic fixtures, internal review notes and source-only metadata never enter a public page.

## SEO boundary

Robots and noindex are indexing controls, not access controls. Paid bodies require server/database enforcement even when crawlers are discouraged. Protected staging should remain protected and nonindexable. Production public pages should remain crawlable, while account and private routes use appropriate private/noindex responses.

Do not expose paid full-recipe structured data simply because the requesting customer is entitled. Keep metadata safely public or explicitly private and uncached, and test both browser and crawler paths against the approved Phase 8 design.

Reference: [Web Vitals](https://web.dev/articles/vitals). Field performance monitoring and search appearance checks continue after launch in Phase 11.
