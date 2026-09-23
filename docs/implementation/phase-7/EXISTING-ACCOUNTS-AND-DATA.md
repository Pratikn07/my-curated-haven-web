# Existing accounts, saved recipes and data ownership

## Reviewed baseline

Web repository: `Pratikn07/my-curated-haven-web`, commit `f646bea756f75d1c9e8b7dbf42dab682005db7ec`.

Parenting repository: `Pratikn07/parenting-app`, commit `5e5caa73f5a5d0705572739dd881a96abe9be23b`.

These findings describe repository source. Live account counts, provider configuration, database grants and deployed policies remain unverified.

## Existing work to reuse

| Native source | Finding | Web requirement |
| --- | --- | --- |
| `src/services/auth/SupabaseAuthService.ts` | Email/password, Google sign-in, profile lookup and sign-out | Preserve verified identity continuity, implement a web-specific session adapter |
| `src/lib/supabase.ts` | Native session storage | Use the Phase 4 web SSR client instead of copying native storage |
| `supabase/migrations/20251212000000_create_saved_recipes.sql` | user_id, recipe_id, created_at, unique user/recipe pair and owner policies | Inventory deployed relation and reuse with compatible additive changes |
| `src/services/recipeService.ts` | Save, remove, saved-ID and saved-recipe functions | Reuse domain intent and IDs, replace unsafe response/error contracts |
| `src/frontend/screens/recipes/recipesHome/hooks/useSavedRecipes.ts` | Optimistic save state and focus refresh | Handle explicit failure results and account changes |
| `src/frontend/screens/recipes/favorites/hooks/useFavoriteRecipes.ts` | Saved list, loading state and optimistic removal | Clear previous-user state and distinguish load errors from empty results |

The existing migration references `auth.users` and `recipes`, uses cascading foreign keys and enables RLS. A migration file does not prove deployment. Inspect current policies and grants before changing access.

## Source gaps requiring explicit treatment

The native save/remove service returns false on database errors, while calling hooks rely on catch blocks for rollback. A failed write therefore risks a misleading saved state. Web mutations need one typed success/error contract consumed consistently by the UI.

Saved-list reads return an empty array on query failure. Preserve a separate error result on the web.

The native saved-list query selects `recipes(*)`. Replace this with approved metadata projection. A private bookmark list is not authority to fetch every recipe body.

The native auth service expects a session immediately after signup. Confirmation-required signup often has no session yet. Use explicit pending-verification states.

Its synchronous isLoggedIn helper tests the promise returned by getSession. Do not copy this check. Identity decisions need awaited verification.

Native auth code logs callback URLs and sessions. Exclude tokens, codes, callback query strings and session objects from web logs. Native profile fallbacks invent parenting-stage and feeding-preference values. Recipe accounts must not inherit these fabricated attributes.

No native files change through this plan. Native fixes require their own scoped work and verification.

## Identity continuity

Use the verified Supabase auth UUID as the ownership key. Email is contact information, not a stable database key or purchase entitlement.

Before enabling web signup, verify:

1. Which project holds the native accounts and recipes.
2. Which providers existing users rely on.
3. Whether email confirmation, signup triggers and profile constraints work for a recipe-only account.
4. Whether provider redirects and email templates serve both native and web flows.
5. Which saved-recipe IDs map to published web records.
6. Whether previous native users have access arrangements requiring preservation.

Prefer one identity authority when suitable. If a separate project is necessary, document an authenticated migration and account mapping. Matching two email strings does not authorize merging users or copying private data. Do not export password hashes or create replacement identities silently.

Existing Google-only or other provider users need a verified supported sign-in path before continuity is claimed. Do not assume email OTP attaches to every existing identity. Test provider behaviour using synthetic accounts.

## Saved-recipe relation

Prefer the existing `saved_recipes` relation if schema and access checks pass. Minimum fields are the existing user UUID, recipe UUID and creation timestamp. The unique pair prevents duplicates. Preserve original saved timestamps when reconciling records.

The Phase 4 catalog/body model is proposed, not deployed evidence. If its catalog uses a different physical relation, preserve canonical IDs or a reviewed one-to-one mapping. Do not repoint a foreign key, drop the native table or bulk-delete favourites during frontend work.

Inventory duplicate rows, orphan references, policy coverage and index coverage before an additive migration. The existing unique user/recipe index supports owner lookups. Assess recipe-side and saved-order query indexes against actual queries before adding duplicates.

## Access rules

| Operation | Rule |
| --- | --- |
| Anonymous read/write | No saved-recipe access |
| Owner list | Only their bookmark rows, with safe recipe metadata |
| Insert | Verified caller owns user_id and recipe is eligible for this experience |
| Delete | Verified caller owns user_id, including unavailable bookmarks |
| Update ownership | Not exposed |
| Other-user access | Denied through UI, server routes and direct data API |
| Recipe body read | Independent Phase 4 free/entitlement check |
| Entitlement mutation | Never part of save or account operations |

Initially the web Save control appears on the three free published recipes. Preserve existing bookmarks for other native recipes. Show only metadata approved for the web, or a neutral unavailable item with removal. Do not tighten shared insertion policies to free-only if this would break native users. Establish a compatible server and RLS design after the native-access inventory. A shared policy change is a rollout gate.

Apply explicit grants alongside RLS. Use owner checks for reads/deletes and ownership checks for inserts. A browser-supplied user_id is never trusted without database enforcement. Ordinary users receive no entitlement-writing or role-changing privilege.

Use insert-on-conflict-do-nothing semantics for repeated saves, without adding an UPDATE policy merely to support generic upsert. Repeated removal also succeeds safely. Validate recipe existence and eligibility before treating a duplicate conflict as success. Do not reveal private record details in errors.

## Minimal personal data

Auth email and UUID suffice for the initial account experience. Display name is optional. Reuse a profile only after confirming its fields and policies. Avoid broad profile updates or select-all reads.

Do not request a child's name, birthday, photo, feeding stage or health information. Do not copy family profiles or Instagram analytics into recipe accounts. Keep marketing consent separate from authentication and off by default.

Map future purchases to the verified UUID through Phase 8. A saved row, email address, profile flag or client metadata value never proves payment.
