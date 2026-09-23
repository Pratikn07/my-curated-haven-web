# Account and saved-recipe experience

## Mobile entry points

Keep public recipes primary. Show a labelled Save action on eligible recipe cards and detail pages. Use a button separate from the card's navigation link. Expose saved state through text and aria-pressed, not colour alone.

Signed-out visitors who press Save see a brief explanation: sign in to keep recipes together across devices. Provide a return-to-recipe path without signup. Do not interrupt scrolling or printing with an account modal.

After sign-in, return to the selected recipe and require a fresh Save confirmation. Store only a short-lived recipe reference as intent. Revalidate the recipe and user before writing. Discard stale intent on cancellation, account switch or sign-out.

## Save and remove state model

| State | Display and behaviour |
| --- | --- |
| Signed out | Save leads to optional sign-in |
| Unsaved | Save action available |
| Saving | Visible progress, duplicate action disabled |
| Saved | Saved state confirmed by server |
| Removing | Visible progress, prevent overlapping operation |
| Failed | Previous confirmed state plus Retry |
| Session expired | No false success, sign-in recovery |
| Recipe unavailable | Explain unavailability without protected content |

Prefer pessimistic confirmation initially. With only three public recipes, a reliable result matters more than an instant heart animation.

Use a typed mutation result such as success with saved state, unauthenticated, unavailable, throttled or unexpected failure. Never return false and expect a catch block to interpret failure.

Serialize actions per recipe. If optimistic UI is later introduced, roll back only the affected operation and reconcile against the server. Do not restore an obsolete whole-list snapshot over newer successful saves.

## Saved list

Route: /account/saved-recipes. Require verified identity at the data boundary. Read only the caller's references and approved card metadata.

Default order: created_at descending, then stable recipe ID. Display accurate visible counts. If unavailable entries appear as neutral placeholders, include them consistently in the shown count. Avoid unexplained count mismatches.

A private bookmark for an unpublished or inaccessible native recipe should show a neutral unavailable label and Remove. Do not leak the recipe title, image or former body from persisted client state. Published paid-preview metadata is allowed only if the separate public metadata contract approves those fields.

Saving a recipe does not preserve its contents forever. If a free recipe later becomes paid, the bookmark remains but future body reads follow current authorization. If content is withdrawn, the saved list reflects unavailability. Do not create offline full-body snapshots.

An empty list invites the user to browse the three free recipes. A failed read shows Retry. Do not treat data-service errors as no saved recipes.

## Account page

Route: /account.

Display:

- Verified email, shown only to the signed-in account.
- Link to Saved recipes.
- Sign out.
- Support.
- Account-closure request instructions.

Optional display name adds little value initially. If implemented, constrain length and permitted fields, escape output and preserve existing profile values. Do not require parenting onboarding or write invented profile defaults.

Do not add purchase-history placeholders or a misleading Premium badge. Phase 8 will add purchase records and access states after checkout exists.

## Session and device behaviour

Persist bookmarks server-side, keyed by UUID and canonical recipe ID. Browser storage is not the bookmark authority.

On sign-in or account switch, invalidate private state and fetch the active user's data. On sign-out, remove private cached data and pending actions. Ignore requests started under an earlier identity.

Reload or refetch on returning to the saved page and on relevant focus events. Real-time cross-device synchronization is not required for the first release. State the behaviour plainly: changes appear after refresh or return to the page.

Check browser Back, multiple tabs and device changes. Never briefly show the prior account's saved list while loading the next account.

## Account closure

Before launch, document support-assisted account closure with a verified operator and a working support channel. No automatic message is sent by this documentation work.

The request must distinguish removing web saved data from closing the shared My Curated Haven identity. Explain any effect on the parenting app. Fresh authentication and a verified request are required before destructive processing.

Operator runbook requirements:

1. Confirm authenticated ownership and requested scope.
2. Inventory shared profiles, saved rows, storage ownership and dependencies.
3. Record the agreed action and minimal audit reference.
4. Perform only the scoped deletion or closure with a restricted server/admin path.
5. Clean up private caches and applicable active sessions.
6. Verify the closed identity cannot recreate private data with an unexpired token.
7. Confirm completion without emailing private record contents.

Deleting an auth row or revoking refresh tokens does not alone prove immediate access-token invalidation. Verify actual enforcement through current-user checks and database rules tied to live account existence/status. Prevent profile recreation from stale claims. Do not add a client-writable account-status field.

Shared account deletion must not silently remove parenting records when the user requested only web saved-data removal. If a safe scope is unresolved, keep the request support-assisted and explain the limitation.

Phase 8 must revisit closure before accepting money, including transaction records, refunds and retained financial data. No retention duration is invented here.

Reference: [Supabase user management and deletion behaviour](https://supabase.com/docs/guides/auth/managing-user-data).

## Accessibility and copy

Use the Phase 3 theme and touch-target rules. Keep forms short. Provide visible labels, field-linked errors, predictable focus and polite success/error announcements.

OTP entry should support paste and autofill in one labelled control. Avoid six separate inputs unless tested for keyboard, screen-reader and paste behaviour.

Use plain labels: Sign in, Continue, Send a new code, Save recipe, Saved recipes, Remove and Sign out. Avoid billing terms before the payment phase.
