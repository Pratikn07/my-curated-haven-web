# Component and interaction contracts

## General rules

Use semantic HTML and server-compatible presentation components by default. Add client state only where interaction needs it.

Keep design-system props about presentation and interaction. Authorization, recipe queries, purchase entitlements and account persistence belong to later feature layers.

Support long labels, absent images, browser zoom and narrow widths. Do not introduce a universal component with dozens of unrelated variants.

## Core component contracts

| Component | Purpose and minimum contract | Required states |
| --- | --- | --- |
| Container | Shared width and responsive gutters | Reading width and wide content width |
| Section | Semantic section with optional labelled heading | Content visible without animation |
| Card | Noninteractive surface with optional footer | Plain, highlighted, image missing |
| Button | Native button, default type=button, forwarded form/accessibility props | Default, hover, focus, pressed, disabled, busy |
| ButtonLink | Link styled as an action, real destination required | Default, hover, focus, current where relevant |
| Badge | Noninteractive status with text | Neutral, free, collection, informative |
| Field | Label, control ID, hint and error relationship | Empty, populated, invalid, disabled |
| StatePanel | Clear state title, explanation and supported recovery action | Loading, no results, failure, unavailable |
| RecipeCard | Image, title, verified metadata and one primary link | Free, collection preview, missing image |
| Filter control | Labelled checkbox/radio or explicit toggle button | Selected, unselected, disabled with reason |
| Dialog/sheet | Optional filter editor with a bounded local interaction | Open, closed, changes pending |

A Card is not automatically clickable. Put the primary recipe title inside a link. Avoid wrapping favourite buttons or other controls inside that link.

## Actions

Primary actions use the dark action colour and white text. Secondary actions use a contrasting outline or surface treatment. Destructive actions require a distinct label and context.

For a busy Button, prevent duplicate activation and preserve its width. Expose the busy state and provide readable progress text. Do not show a spinner without an accessible name.

A link has no native disabled behaviour. If a destination is not ready, omit the action or show explanatory noninteractive text. Do not use href="#" or silently cancel navigation.

Icon-only controls need a specific accessible name, such as “Close filters.” Visible text should remain the default for key tasks.

## Fields and validation

Associate each label with its input. Place help text before or beside errors using a stable described-by relationship. Set invalid state only when validation has a result.

Do not rely on placeholder text as the label. Do not use red alone to communicate failure. Preserve a user's entered value after an error.

The phase includes field design examples, not new public account or payment forms. Native browser semantics should carry keyboard and autocomplete behaviour where relevant.

## Mobile navigation

Use a disclosure for the initial short link list. The toggle exposes aria-expanded and aria-controls. Links remain ordinary links within a labelled navigation region.

Opening should not unexpectedly move focus. Escape closes the disclosure and returns focus to the toggle when appropriate. Choosing a destination closes it. At desktop breakpoint changes, clear stale mobile state.

Use a modal pattern only if the design changes to a full-screen overlay. Avoid focus trapping a simple disclosure. Do not hide the wordmark or Support destination to fit extra future tabs.

## Filter sheet prototype

Use a native dialog or a tested accessible primitive, with an accessible title and visible close action. For a modal sheet, focus enters the sheet, remains within it while open, and returns to the trigger after closing. Escape dismisses it. Background content must be noninteractive.

The sheet should accommodate the on-screen keyboard, safe-area insets and long content. Do not require dragging to close it.

Reference: [WAI dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). This reference supports focus and modal behaviour, not the product's filter rules.

## Filter state contract

- Keep applied selections separate from draft selections.
- Open with the applied values.
- Apply commits the draft and closes the sheet.
- Cancel, close or Escape discards unapplied changes.
- Clear all resets the draft inside the sheet. The change takes effect after Apply.
- On the result page, removing an applied chip updates results immediately.
- Show the applied count in the filter trigger and visible chips.
- Keep search, sort and filter state consistent. A later feature phase decides URL serialization.
- Announce updated result counts politely after committed changes.
- Distinguish no matching recipes from a failed request.

For the demo, filter local fixtures. Do not claim backend search, analytics or persisted preferences.

## Recipe-card display props

Proposed presentation model:

| Field | Contract |
| --- | --- |
| title | Required human-readable recipe name |
| href | Required only for a real linked destination, otherwise render a static example |
| image | Optional source, dimensions and appropriate alt text |
| totalMinutes | Known total duration or absent, never default unknown to zero |
| mealLabel | Verified content label or absent |
| dietaryLabels | Editorially verified labels only |
| accessLabel | Display label derived from the feature layer, not an access check |
| isSaved/onSave | Added when account behaviour exists, absent for initial static examples |

Do not show a dead favourite heart in public cards before account support exists. In a private prototype, mark the control as simulated.

## Access and request states for later recipe work

| State | Display rule |
| --- | --- |
| Free | Full published free content available through the later recipe route |
| Collection preview | Public title/image/approved summary only |
| Access pending | Stable loading area, no protected-body flash |
| Access granted | Render server-authorized content |
| Signed out | Explain account requirement when the real feature exists |
| Access denied | Explain available purchase or support path without fabricating entitlement |
| Request failed | Error with a supported retry or Support action |
| Content unavailable | Honest unavailable message |

A visual “locked” badge is not paywall security. Public payloads, static fixtures and client bundles must not contain real protected recipe bodies. Later backend/payment phases enforce the boundary.

## Loading and feedback

Reserve image and card space to reduce layout shifts. Keep skeletons decorative and provide one concise loading announcement. Avoid an announcement per placeholder.

Error messages should state the failed action and available next step. Do not turn failed requests into an empty-result success.

Use inline status for form or filter feedback. Add a toast system only when a real interaction needs temporary feedback beyond inline messaging.

## Fixture boundary

Keep synthetic examples in an isolated local review harness or protected review build. Production entry points must not import test fixtures. Do not add an unauthenticated design-gallery route or rely on a client-side environment check.

Use fictional titles and no medical/nutrition promises. These examples are visual contracts, not approved recipes.
