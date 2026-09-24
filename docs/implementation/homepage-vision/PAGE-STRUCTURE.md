# Page structure and visitor journeys

## Primary story

The first screen names My Curated Haven as a parenting brand. A compact overview immediately introduces Recipes, Parenting Chat, Curated Shop and Bloom. The page then gives more space to the product visitors are able to use, followed by substantial labelled sneak peeks.

The four cards communicate breadth. They do not carry equal transaction weight. Recipe actions lead to available content. Preview actions move to informational sections on the same page.

## Section contract

| ID / anchor | Contents | Action | Boundary |
| --- | --- | --- | --- |
| HV-S01 / top | Brand headline, short availability-aware subcopy, family/food hero image | Primary recipe action, secondary “See what's ahead” | One H1. No app-download or chat-start button |
| HV-S02 / `explore-haven` | Four cards with icon, one sentence and status | Recipes to `#recipes`, others to respective preview anchors | Every future card has a visible status |
| HV-S03 / `recipes` | Tiny Soho attribution, three approved free recipe cards, short read/print explanation | Recipe detail links and “Explore free recipes” | No signup requirement, paid rows or fake recipe data |
| HV-S04 / `recipe-collection` | Approved collection summary when ready | “View the recipe collection” to the real collection page | No direct Stripe URL, invented price or future-feature entitlement |
| HV-S05 / `whats-ahead` | Shared preview introduction and availability explanation | Ordinary internal anchors | No dated countdown or promise of delivery order |
| HV-S06 / `parenting-chat-preview` | A static example conversation and two or three benefits | “Back to recipes” optional | No form, send action, fake typing or runtime assistant |
| HV-S07 / `curated-shop-preview` | Static product-category examples and short explanation | “Back to recipes” optional | No retailer/cart action or expert-booking claim |
| HV-S08 / `bloom-preview` | Synthetic milestone/tip view and brief explanation | “Back to recipes” optional | No real child details, medical score or placeholder logging features |
| HV-S09 / `our-story` | Owner-approved connection between My Curated Haven and Tiny Soho | `/about` | No invented founder quote or credentials |
| HV-S10 / `questions` | Four concise availability/purchase questions | Existing support link | Accessible native disclosure or always-visible text |
| HV-S11 / final CTA | Repeat one appropriate next step | Working recipe link, or preparation-state anchor | No competing email wall |

The footer preserves legal, support and consent-preference access. Do not move consent controls into a promotional modal.

## Recipe availability states

These are homepage presentation states, not permissions or payment controls. Real recipe and commerce enforcement remain authoritative.

| State | Hero and recipe area | Collection area | Preview areas |
| --- | --- | --- | --- |
| Preparation | “Recipes are being prepared.” Primary action “See the recipe plan” to `#recipes`. Explain the planned three free recipes without fake linked cards | Omit the sale section. No price or purchase language | Show all three static sneak peeks with future-web labels |
| Free recipes ready | Primary “Explore free recipes” to `/recipes`. Display three verified free slots | Omit unless approved collection information is ready. A short preparation note is allowed without a CTA | Same static sneak peeks |
| Collection ready | Preserve free recipe primary action and real free cards | Show approved one-time collection summary linking to the real collection page | Same static sneak peeks, excluded from purchase |
| Runtime recipe error | Keep the brand and previews visible. Recipe section says temporary unavailability and offers retry/link to recipe index | Suppress stale transactional assurances if readiness cannot be verified | Remain readable without recipe data |

Runtime error is a condition on the selected presentation state, not a newly approved release. Do not switch the business state based on one slow query. Never replace failed recipe data with fictional samples.

Preparation claims “three free recipes planned.” Free-ready claims “three free recipes” only after three approved entries and destinations are verified. If one slot disappears after launch, show the currently verified entries under a neutral “Free recipes” heading with an availability message, and alert the content owner. Do not manufacture a third card or expose a paid row.

## Navigation

Keep Recipes as a direct top-level link once the current navigation contract permits the route. Add “What's ahead” as `/#whats-ahead`, so the link works from About or a recipe page too. Do not add `/chat`, `/shop` or `/bloom` routes for this effort.

Preview cards use labels such as “Preview Parenting Chat.” Clicking scrolls to a real section with matching heading, not a disabled control or modal saying unavailable. Use anchor offsets below the sticky header. On mobile, choosing an anchor closes the menu, leaves the destination visible and preserves predictable keyboard focus.

The page must remain understandable through ordinary scroll, with no carousel or forced tab interaction. All four pillar descriptions appear in the DOM. Their meaning does not depend on hover.

## Visitor journeys

**Instagram recipe visitor:** opens the linked recipe directly, reads or prints, then taps the brand to learn about My Curated Haven. Recipe campaigns should not be redirected to the homepage automatically.

**Homepage newcomer:** understands the parenting brand, sees recipes are the starting point, notices upcoming areas and chooses a free recipe without creating an account.

**Chat-curious visitor:** selects the Chat preview, sees a sample labelled as future web functionality, learns the intended purpose and returns to recipes. No expectation of receiving an answer is created.

**Returning buyer:** existing Account navigation still opens purchased collections. The homepage does not query their children, purchase details or saved recipe list to personalise previews.

**Preparation-stage visitor:** sees a clear vision and honest recipe readiness. The page offers information rather than directing them into unavailable checkout or a fabricated waitlist.

## Product understanding checks

In a short moderated review, ask visitors: What is My Curated Haven? What works on the website now? What is only a preview? What would a recipe purchase include? Where would you go for a free recipe?

Proposed release floor: at least four of five representative adult testers answer all availability and purchase-boundary questions correctly without coaching. Any repeated belief that preview chat is live or bundled triggers copy/layout revision, even if aggregate task completion looks good. This small review checks comprehension, not market demand.
