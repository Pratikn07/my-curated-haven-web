# Scope and baseline

## Customer problem

A recipe-only preparation page does not explain the wider My Curated Haven product. Visitors arriving through Tiny Soho should find immediate recipe value and understand the longer-term direction. A broad feature page without availability labels creates a different problem: visitors expect tools they cannot yet use on the website.

This effort combines a broader brand introduction with one clear usable starting point. The preview areas explain Chat, Curated Shop and Bloom without implementing them or promising bundled access.

## Verified source findings

Reviewed web main `de47ca0d828af3457170d2b201fdebebe68701a9` and native main `5e5caa73f5a5d0705572739dd881a96abe9be23b`. These are source findings, not production runtime verification.

| ID | Finding | Required response |
| --- | --- | --- |
| HV-B01 | Web `src/app/page.tsx` says recipes, accounts and checkout are unavailable | Replace the blanket message with a state-specific presentation after checking deployment readiness |
| HV-B02 | `src/components/Hero.tsx` uses recipe preparation copy and a support CTA | Broaden the headline and add a recipe-focused primary action where verified |
| HV-B03 | Home/root metadata repeats preparation copy | Update title, description and social preview together |
| HV-B04 | Existing navigation has Home, Recipes, About, Support and account/sign-in | Preserve working destinations and add a homepage preview anchor, not product routes |
| HV-B05 | Deferred feature/resource/career/contact pages remain blocked in `src/proxy.ts` | Keep those blocks and source preservation |
| HV-B06 | `getFreeRecipeCatalog` reads assigned free slots | Reuse the public free-slot projection, never all published recipes |
| HV-B07 | Recipe cards support hiding save controls | Homepage cards need no personal saves query or account requirement |
| HV-B08 | Public-site tests assume a recipe H1 and no purchase links | Update tests to the new approved state contract without deleting route/security protections |
| HV-B09 | Web theme already has accessible action tokens and UI primitives | Reuse the theme, no rebrand or framework migration |
| HV-B10 | Native tabs are Chat, Recipes, Shop and Bloom. Onboarded entry routes to Chat | Explain all four pillars and give Chat meaningful preview space |
| HV-B11 | Native Shop opens affiliate links and supports product search/saves | Present Curated Shop, not expert appointments or an onsite retail checkout |
| HV-B12 | Bloom combines daily tips and milestones, while note/photo/mood controls show placeholder alerts | Preview milestone/tip concepts only. Do not advertise completed journaling features |
| HV-B13 | Native chat source includes family context, history, images and product cards | Reference the product idea without asserting every capability is release-ready |
| HV-B14 | Earlier web retrieval showed older native-download marketing | Verify live domain versus deployment SHA before release. Do not assume a Git merge updated the domain |
| HV-B15 | PR #29 records the targeted Phase 7 saved-recipes migration and production route smoke, while native sign-in compatibility remains unverified | Use the latest evidence rather than older pending-migration wording. Recheck the actual release candidate |
| HV-B16 | PR #31 adds signature/mock/capture guards and Checkout URL reuse. Its Phase 8 evidence still blocks sale pending commercial and production readiness | Preserve the merged fixes. Do not infer sale approval from their source presence or local test results |

Web source paths are relative to `my-curated-haven-web/`. Native paths and commit references are listed in [preview assets](PREVIEW-ASSETS.md). No production database inspection, private-user export or native runtime verification was performed for this plan.

## Included work

Homepage composition, approved copy, four-pillar overview, three feature previews, recipe/collection handoff, founder/brand story, concise FAQs, navigation anchor, metadata/social image, synthetic assets, limited existing analytics integration, mobile/accessibility checks and deployment evidence.

Related About/footer copy changes are allowed only to align brand wording and availability. Preserve existing recipe detail, account, checkout and support contracts. A blocked dependency produces a truthful preparation or free-only homepage, rather than expanding this effort into backend remediation.

## Explicit exclusions

No live assistant, chat API, typing box, AI usage quota, product catalog migration, retail cart, affiliate redirect, expert booking, child onboarding, tracking data, planner, marketplace seller onboarding, newsletter automation or subscription implementation. No modification to parenting-app source or either repository gitlink. No fake waitlist success message. No optional tracking before consent.

Previewing a native feature is separate from migrating the feature. The preview must make sense without a logged-in account, child record, product DB or AI provider.

## Dependency map

| Dependency | What this effort needs | What this effort does not claim |
| --- | --- | --- |
| Phase 3 design | Existing tokens, primitives and mobile patterns | Every new layout already passes accessibility |
| Phases 5/6 recipes | Approved free slots, images, public summaries and working detail/print | All source catalog rows are launch-ready |
| Phase 8 commerce | Approved release/offer and guarded collection page for sale messaging | Homepage configuration enables safe checkout |
| Phase 9 analytics | Consent, allowlists and failure isolation | Every visitor is measurable |
| Phases 10/11 release | Current candidate checks and existing operational ownership | A documentation merge authorises launch |
| Phase 12 expansion | Optional future consumer of aggregated interest signals | Preview popularity selects a feature or validates demand |

## Decision register

All unresolved decisions start pending. Use proposed defaults below for the draft and confirm the concrete copy/design in implementation review.

| ID | Decision | Proposed default | Blocks |
| --- | --- | --- | --- |
| HV-D01 | Homepage release state | Preparation until existing recipe readiness is verified | Public release copy |
| HV-D02 | Brand headline | “A little more support for everyday parenting.” | Final copy |
| HV-D03 | Preview wording | “Planned for the web” plus local availability explanation | Preview publication |
| HV-D04 | Page order | Hero, four pillars, recipes, collection if eligible, three previews, story, FAQ, final CTA | Layout |
| HV-D05 | Preview format | Static synthetic product illustrations based on native screens | Assets |
| HV-D06 | Navigation | Keep current links, add “What's ahead” pointing to `/#whats-ahead` | Header/footer change |
| HV-D07 | Founder story and image permissions | Only owner-approved facts and licensed imagery | Story publication |
| HV-D08 | Purchase wording | Existing approved offer only, no future-feature bundle | Collection section |
| HV-D09 | Tracking | Existing consent pipeline, bounded preview events, no new form | Measurement |
| HV-D10 | Performance budgets | Targets in design document, measured on the same test profile | Release |
| HV-D11 | Content/release owner | Named owner and backup | Ongoing correctness |
| HV-D12 | Launch approval | Candidate-specific public review and working-domain check | Deployment promotion |

No user credentials are needed to write this plan or produce static preview assets. Any later deployment secrets belong in approved secret stores, never in the repo or screenshots.
