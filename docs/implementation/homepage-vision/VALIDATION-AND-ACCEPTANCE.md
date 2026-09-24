# Validation and acceptance

All 64 scenarios start **not run**. This plan defines checks for the future homepage implementation. A documentation CI pass does not establish rendered design, live data or production correctness.

Use deterministic fixtures for preparation, free_ready, collection_ready, recipe error and missing image. Use anonymous and signed-in sessions to check public content consistency, plus the existing test buyer for unaffected account navigation. No real customer records or live payment testing.

## Copy and comprehension

| ID | Scenario | Expected result |
| --- | --- | --- |
| HV-C01 | Read hero and overview | Broader brand and recipe starting point are clear |
| HV-C02 | Read any future-feature card/detail alone | Planned-web status visible without FAQ or hover |
| HV-C03 | Render preparation state | No available-recipe, price or purchase claim |
| HV-C04 | Render free-ready state | Complete free access described only with verified prerequisites |
| HV-C05 | Read collection summary and preview area | Future features clearly excluded from recipe purchase |
| HV-C06 | Scan claims, counts and prices | No invented price, lifetime promise, expert/safety claim or testimonial |
| HV-C07 | Read founder story and FAQ | Approved facts, correct My Curated Haven/Tiny Soho relationship |
| HV-C08 | Compare hero, labels, FAQ and metadata | One consistent availability state and spelling |

## Recipe and offer integration

| ID | Scenario | Expected result |
| --- | --- | --- |
| HV-R01 | Verify selected free-ready deployment | Three approved free destinations work anonymously |
| HV-R02 | Missing Supabase configuration or failed query | Static homepage survives, recipe failure shown honestly |
| HV-R03 | Paid recipe exists outside free slots | No paid card/body leaks into homepage |
| HV-R04 | One free slot disappears | No fabricated replacement or stale count assertion, owner alerted |
| HV-R05 | Signed-in versus anonymous homepage | Same public recipe projection, no personal saves/child data |
| HV-R06 | Follow recipe card and print action | Correct recipe identity and existing complete print flow |
| HV-R07 | Invalid collection-ready reference | Reject configuration or suppress sale section safely |
| HV-R08 | Collection paused or terms changed | Home summary updated/withdrawn, existing account access preserved |

## Preview assets

| ID | Scenario | Expected result |
| --- | --- | --- |
| HV-A01 | Review image rights/provenance | Manifest identifies source, permission and approval |
| HV-A02 | Inspect files, pixels and metadata | No real family/chat/account identifiers or private URLs |
| HV-A03 | Compare native capture versus concept | Truthful screenshot/concept caption |
| HV-A04 | Inspect Chat preview | Illustrative routine example, no diagnostic/live-service claim |
| HV-A05 | Inspect Shop preview | Categories/products only, no expert booking or working retailer/cart action |
| HV-A06 | Inspect Bloom preview | Synthetic milestones/tips, no unfinished mood/photo logging claim |
| HV-A07 | Break preview image request | Heading, status and description still readable |
| HV-A08 | View phone crop and social asset | Preview label survives crop and text remains legible |

## Navigation and scope

| ID | Scenario | Expected result |
| --- | --- | --- |
| HV-N01 | Follow each overview card | Real recipe/preview destination, no dead control |
| HV-N02 | Use What's ahead from another route | Correct homepage hash destination |
| HV-N03 | Open mobile menu then choose anchor | Menu closes, target visible below sticky header |
| HV-N04 | Use direct hash, keyboard and browser back | Predictable focus/scroll and navigation |
| HV-N05 | Click collection CTA | Canonical collection page, no checkout session created by homepage |
| HV-N06 | Interact with sneak peeks | No chat input, product checkout, milestone write or fake interest success |
| HV-N07 | Visit deferred routes and inspect sitemap | Existing unavailable boundary preserved |
| HV-N08 | Returning buyer follows Account | Existing purchased-library path works |

## Mobile and accessibility

| ID | Scenario | Expected result |
| --- | --- | --- |
| HV-U01 | Render 320/390/768/1280 widths | No horizontal overflow or clipped text |
| HV-U02 | Large text, zoom and long strings | Status/action remains readable and reachable |
| HV-U03 | Keyboard traverse all controls | Visible focus, no nested interactive elements or trap |
| HV-U04 | Screen-reader review | Meaningful headings, landmarks, link labels and preview status |
| HV-U05 | Contrast and target-size checks | Approved functional tokens and project touch targets pass |
| HV-U06 | Reduced motion or delayed scripts | No hidden essential content or forced animation |
| HV-U07 | Real iPhone/Android and Instagram browser | Main journey works with recorded versions and evidence |
| HV-U08 | FAQ and consent controls | Operable, understandable and no promotional overlay blocking access |

## Privacy and performance

| ID | Scenario | Expected result |
| --- | --- | --- |
| HV-P01 | Inspect page requests and bundles | No native AI/chat/shop/Bloom service calls or imports |
| HV-P02 | Inspect HTML, payloads, scripts and images | No protected recipe body or private user state |
| HV-P03 | Compare users with different entitlements | No cross-user cache leakage |
| HV-P04 | Load without optional analytics | Full homepage/anchor functionality |
| HV-P05 | Inspect responsive assets | Correct dimensions, lazy below-fold images and bounded bytes |
| HV-P06 | Compare route JS and transfer | Approved budgets measured and met |
| HV-P07 | Measure phone-profile LCP/CLS | Targets/baseline recorded, no field-performance claim from lab only |
| HV-P08 | Load existing recipe pages after change | No unnecessary homepage preview payload or material regression |

## Measurement

| ID | Scenario | Expected result |
| --- | --- | --- |
| HV-M01 | Decline consent and click previews | No optional events, navigation still works |
| HV-M02 | Accept consent after prior interactions | No replay of pre-consent history |
| HV-M03 | Revoke consent | Later optional events stop |
| HV-M04 | Submit raw URL/private/unknown property | Schema rejects disallowed data |
| HV-M05 | Repeated section intersection | Once-per-page-view exposure rule and deduplication hold |
| HV-M06 | Provider fails or times out | No delayed/blocked recipe action |
| HV-M07 | Interpret low-volume preview attention | Curiosity only, counts/coverage and limits shown |
| HV-M08 | Review comprehension and release results | Actual answers/evidence, no invented conversion lift or demand |

## Deployment and operations

| ID | Scenario | Expected result |
| --- | --- | --- |
| HV-D01 | Compare repo, hosting project and official domain | Correct deployed SHA and content version recorded |
| HV-D02 | Build in each supported presentation state | Valid destinations and required configuration |
| HV-D03 | Build with malformed state/content | Clear validation failure or safe nontransactional fallback |
| HV-D04 | Inspect rendered metadata/social share | Accurate title, description, image and availability |
| HV-D05 | Inspect canonical/sitemap/schema | Official origin, no fake product availability or private routes |
| HV-D06 | Candidate changes after QA | Affected checks rerun before approval |
| HV-D07 | Rehearse rollback or asset withdrawal | Safe prior content, existing security/commerce fixes preserved |
| HV-D08 | Run post-deploy homepage smoke | Domain matches approved candidate, all actions and fallbacks checked |

## Release gates

| Gate | Requirement | Evidence |
| --- | --- | --- |
| HV-G01 | Scope, presentation state and truthful claims | Baseline, content register and decisions |
| HV-G02 | Assets reviewed and preview boundary clear | Asset manifest, provenance and privacy review |
| HV-G03 | Data/navigation/access regression safe | Recipe/offer/state tests and existing route tests |
| HV-G04 | Mobile, accessibility, performance and measurement verified | Automated results plus manual/device evidence |
| HV-G05 | Candidate understood and deployable | Comprehension review, release owner, domain mapping and rollback |

Preparation releases mark real free/paid sale cases blocked or not applicable with a reason, while passing preparation-state checks. They must not claim a complete recipe launch. Optional analytics implementation is either verified or explicitly omitted, never silently assumed available.

Maintain a case register with scenario ID, candidate, content/state version, environment/device, actor, date, status, expected result, actual result, evidence and owner. Statuses: not_run, passed, failed, blocked, not_applicable. A skipped critical case blocks the corresponding release state.

Run repository CI without weakening checks. Use focused tests for actual behavioural boundaries and manual review for screenshots/comprehension. Avoid tests asserting every CSS class or mirroring component implementation.
