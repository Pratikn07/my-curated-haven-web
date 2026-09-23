# Commercial decisions and launch promises

## Confirmed scope

| Area | Confirmed decision |
| --- | --- |
| Brand and domain | My Curated Haven, https://mycuratedhaven.com/ |
| Attribution | Recipes by Tiny Soho, inside My Curated Haven. |
| Audience and promise | Parents feeding toddlers, simple toddler recipes for busy families |
| Free access | Exactly three complete recipes, no account or payment needed to read or print |
| Paid product | One clearly defined recipe collection |
| Billing | One-time purchase |
| Experience | Mobile-first web recipes and printable recipe pages |
| Content source | Existing parenting catalog, with preserved recipe identity and reviewed content |
| Purchase exclusions | Unlimited AI, milestone tracking and future parenting tools |

Agreement to one-time billing does not establish lifetime hosting or unlimited future content. Do not use those phrases until the owner approves the underlying promise.

## Decision register

Record each final answer with owner, approval date, policy version and affected release. Keep the register in repository documentation. Secrets and customer records do not belong here.

| ID | Decision needed | Recommended starting point | Live-release gate |
| --- | --- | --- | --- |
| C01 | Exact recipe UUIDs and count | One reviewed manifest built from the current catalog | Required before sale copy, price activation and checkout |
| C02 | Inclusion of the three free recipes | If included, distinguish total recipes from additional paid recipes | Required before displaying collection value |
| C03 | Price and currency | One fixed positive price in one currency | Required before live Stripe Price mapping |
| C04 | Seller identity, supported customer locations and tax treatment | Verify business settings and how totals display before launch | Required before live charges |
| C05 | Refund eligibility, window and request route | Plain terms with a monitored support channel | Required before purchase |
| C06 | Partial-refund access | Retain access unless the approved policy states otherwise | Required before enabling support refunds |
| C07 | Access during pending refunds and disputes | See proposed state rules in refunds/support | Required before live fulfilment |
| C08 | Future recipe additions | Sell the named release without promising later collections | Required before purchase terms |
| C09 | Hosted access duration and service closure handling | Explicit duration/conditions, no unsupported lifetime claim | Required before checkout |
| C10 | Product support address and response process | One monitored support destination | Required before receipts and launch |
| C11 | Existing native purchase/subscription rights | Inventory and preserve valid rights through an explicit mapping | Required before asking existing customers to pay |
| C12 | Content corrections and safety withdrawal | Preserve membership, allow reviewed corrections and documented withdrawal resolution | Required before publishing paid recipes |
| C13 | Permitted personal printing/use | Explain printable pages and account use without promising technical copy prevention | Required before terms |
| C14 | Receipt sender and business descriptor | Recognisable My Curated Haven identity, Tiny Soho attribution where useful | Required before customer charges |

Tax treatment, customer rights and seller obligations are business launch decisions. This engineering plan supplies the configuration gates and records, not a determination of legal obligations. Do not activate a global sales footprint through an unreviewed default.

## Proposed engineering defaults

- Require the existing verified Phase 7 account immediately before payment. Keep all free reading anonymous.
- Use Stripe-hosted Checkout with quantity fixed at one and `mode=payment`.
- Start with cards and eligible wallets under reviewed payment-method settings. Do not promise a particular wallet on every device or in every country.
- Disable promotions, adjustable quantity, automatic currency conversion and delayed payment methods for the first launch unless separately approved and tested.
- Still handle delayed success/failure events defensively. A dashboard change must not create an unhandled payment state.
- Manage initial refunds through restricted Stripe Dashboard operations and a support case. A public self-service refund API is unnecessary for launch.
- Continue to provide all valid existing collection access while new checkout is disabled.

These are recommendations for the implementation, not previously confirmed user decisions. Revisions need a recorded decision and updated tests, not a second parallel checkout design.

## Customer-visible product facts

Before purchase, show the collection title, approved contents/count, three free samples, one-time price/currency, treatment of tax, included print access, account requirement, access duration, future-content policy, exclusions, refund summary and support link.

The app's product page and Stripe configuration must agree. Use a versioned product configuration for public copy and the private price mapping. Store the terms/refund version accepted for each attempt. An old open Checkout Session continues to reference its original commercial snapshot, even after a later price is published.

Do not substitute the 70-row source inventory for C01. Do not infer 67 paid recipes by subtracting the free samples. Include only reviewed members of the approved release.

## Working before decisions close

Use clearly labelled synthetic fixtures, a sandbox Stripe product and checkout disabled outside protected test environments. Unresolved decisions block live activation, not contract design, migrations, access tests or screen development.

The final go/no-go record must link every C01–C14 answer. An implementer should not fill missing commercial decisions with sample values merely to make a deployment succeed.
