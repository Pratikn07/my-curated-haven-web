# Phase 7 implementation evidence

Status: The PR #25 remediation was implemented on `codex/phase-7-remediation`, merged in PR #28, and deployed to production. The dedicated staging OTP and native password/Google compatibility check remains unverified because no staging project or test inbox was available. No shared Auth settings or email templates were changed.

---

## Source & Branch Details

- **Original implementation branch**: `phase-7-accounts-saved-recipes` (historical)
- **Remediation branch**: `codex/phase-7-remediation`
- **Remediation base commit**: `4dc37df27bbc95341bc7ad30bc2f94f8d23a1c54` (current GitHub `main` when remediation began)
- **Merged PR / production commit**: [#28](https://github.com/Pratikn07/my-curated-haven-web/pull/28) / `6d43d8f1cf75510d82fda00105998ff1875b954d`
- **Scope**:
  - Reused existing `public.saved_recipes` table and Supabase Auth authority.
  - Implemented owner-only Row Level Security (RLS) policies, explicit table grants for `authenticated`, revoking `anon`, and high-performance indexing (`idx_saved_recipes_user_created`).
  - Added passwordless email OTP authentication flow (`/sign-in`) with 6-digit code entry, resend, and Terms/Privacy disclosures.
  - Provided return-to-recipe redirect safety via `sanitizeReturnTo()`.
  - Added `SaveRecipeButton` outside card title links with full visual, accessible (`aria-pressed`), and screen-reader state feedback.
  - Built private `/account/saved-recipes` page showing newest bookmarks first, with safe fallback handling for unavailable recipes (no private leaks).
  - Built private `/account` page with verified email display, navigation to saved recipes, local-scope sign out, and support-assisted account closure instructions.
  - Upgraded Next.js middleware proxy (`src/proxy.ts`) to guard `/account` and `/account/*` routes, redirecting unauthenticated visitors to `/sign-in` and adding `Cache-Control: no-store, private`.
  - Upgraded header navigation (`Navbar.tsx`) with client-hydrated auth state for Account / Sign In without private SSR cache leaks.
  - Authored comprehensive pgTAP tests (25/25 passed) and Playwright E2E tests (114/114 passed).

---

## What Shipped in the Branch

### 1. Database & Security Foundation
- `supabase/migrations/20260923180000_phase7_saved_recipes_policies.sql`:
  - Index `idx_saved_recipes_user_created` on `public.saved_recipes(user_id, created_at DESC)`.
  - Explicit table privileges: `REVOKE ALL ON public.saved_recipes FROM anon;`, `GRANT SELECT, INSERT, DELETE ON public.saved_recipes TO authenticated;`, `GRANT ALL ON public.saved_recipes TO service_role;`.
  - RLS policies ensuring users can only SELECT, INSERT, and DELETE rows where `auth.uid() = user_id`.
- `supabase/tests/database/02_saved_recipes.test.sql`:
  - 10 pgTAP tests verifying anonymous rejection, owner reads, cross-user isolation, duplicate prevention, and deletion controls.
- `supabase/seed.sql`:
  - Added synthetic recipe foreign-key references to `public.recipes` for local testing.
  - Seeded Buyer A with both an available bookmark and an unavailable bookmark fixture.

### 2. Data Access & Auth Layer
- `src/lib/data/saved-recipes.ts`:
  - `getSavedRecipes()`: Reads user's bookmarks, joins with published `recipe_catalog` entries, and safely flags unavailable recipes.
  - `getSavedRecipeIds()`: Efficient ID set query for catalog card bookmark indicators.
  - `saveRecipe()`: Idempotent bookmark creation.
  - `removeSavedRecipe()`: Bookmark deletion scoped to authenticated owner.
- `src/lib/auth/redirects.ts`:
  - `sanitizeReturnTo()`: Whitelists local `/recipes/*` and `/account/*` routes while rejecting external schemes, protocol-relative URLs (`//evil.com`), backslashes (`/\evil.com`), control characters, and sign-in loops.
- `src/lib/supabase/server.ts`:
  - Added `getCurrentUser()` helper using verified `supabase.auth.getUser()`.
- `src/proxy.ts`:
  - Redirects unauthenticated requests targeting `/account` and `/account/*` to `/sign-in?returnTo=...`.
  - Sets `Cache-Control: no-store, private` on auth and account responses.
- `src/lib/actions/saved-recipes.ts`:
  - `toggleSaveRecipeAction()`: Server action handling bookmark mutations with path revalidation.

### 3. UI Components & App Pages
- `src/components/recipe/SaveRecipeButton.tsx`:
  - Accessible button with `aria-pressed`, loading indicators (`Saving...`, `Removing...`), confirmed states (`Save recipe`, `Saved`), and unauthenticated redirect to `/sign-in`.
- `src/components/auth/SignInForm.tsx`:
  - Accessible email input, one-time code input supporting paste and numeric entry, error alerts, resend code button, and Terms/Privacy disclosure links.
- `src/app/sign-in/page.tsx` & `src/app/sign-in/actions.ts`:
  - Passwordless sign-in route with server actions `requestOtpAction()` and `verifyOtpAction()`.
  - Configured with `robots: { index: false, follow: false }`.
- `src/app/account/page.tsx` & `src/app/account/actions.ts`:
  - Account overview displaying verified email, links to saved recipes, support-assisted account closure instructions, and local-scope sign out (`signOutAction()`).
  - Configured with `robots: { index: false, follow: false }`.
- `src/app/account/saved-recipes/page.tsx`:
  - Private saved recipes grid with count indicator, empty state leading to free recipes, and safe placeholder rendering for unavailable recipes with removal action.
  - Configured with `robots: { index: false, follow: false }`.
- `src/components/Navbar.tsx`:
  - Client-hydrated navigation rendering "Account" for authenticated sessions or "Sign In" for anonymous visitors without caching private tokens in SSR HTML.
- `src/components/recipe/RecipeCard.tsx` & `src/app/recipes/page.tsx` & `src/app/recipes/[slug]/page.tsx`:
  - Placed `SaveRecipeButton` outside card title links on listing and detail pages while keeping anonymous access 100% free and unhindered.

---

## Original Task Verification Matrix (P7-01 through P7-10)

Statuses and evidence in this matrix describe the initial implementation report. Current remediation and release status is in the PR #25 section below.

| Task ID | Description | Status | Evidence |
| --- | --- | --- | --- |
| **P7-01** | Inventory identity and saved data | Complete | Reused existing Supabase Auth project authority and `public.saved_recipes` relation. Preserved source IDs and native parenting app compatibility. |
| **P7-02** | Define UX and route contracts | Complete | Implemented `/sign-in`, `/account`, and `/account/saved-recipes`. Passwordless email OTP chosen as default flow. Terms & Privacy links clearly disclosed. |
| **P7-03** | Implement request-scoped auth & protected reads | Complete | Verified identity at server data boundary with `getCurrentUser()`. Upgraded `src/proxy.ts` with route protection and `Cache-Control: no-store, private`. |
| **P7-04** | Implement sign-in and transactional email | Complete | Passwordless OTP flow implemented with single 6-digit input, paste support, resend, and Mailpit testing integration. |
| **P7-05** | Establish saved-recipe persistence & policies | Complete | The Phase 7 migration was applied to the live project after the updated web deployment. Post-apply grants and owner-only policies are recorded below. |
| **P7-06** | Add reliable Save controls | Complete | `SaveRecipeButton` component placed outside title links. State transitions (`Save recipe` -> `Saving...` -> `Saved` -> `Removing...`) verified. Unauthenticated clicks redirect to `/sign-in`. |
| **P7-07** | Build private saved-recipes page | Complete | `/account/saved-recipes` displays owned bookmarks newest first. Unavailable recipes render neutral card with Remove button without leaking private content. Empty state tested. |
| **P7-08** | Add minimal account settings & lifecycle | Complete | `/account` displays verified email, link to saved recipes, support-assisted account closure instructions, and local-scope sign out (`supabase.auth.signOut({ scope: 'local' })`). |
| **P7-09** | Integrate navigation & privacy boundaries | Complete | `Navbar.tsx` updated with auth-aware Sign In / Account link. Account and sign-in routes marked `noindex` and excluded from `sitemap.ts`. Updated deferred-route regex in `public-site.spec.ts`. |
| **P7-10** | Verify security, failure paths & release | Released; staging Auth compatibility unverified | Local tests, GitHub CI, production deployment, migration, and live privilege/policy checks passed. A staging OTP and native password/Google compatibility check could not be run because no staging project or test inbox was available. See the remediation release evidence below. |

---

## Original Automated Verification Results (Historical)

The results below are from the initial Phase 7 implementation and do not verify the current remediation branch or live production state.

### 1. Database pgTAP Tests (`supabase test db`)
```
/Users/pratik.nandoskar/Documents/working/my-curated-haven-impl/supabase/tests/database/01_access_matrix.test.sql .. ok
/Users/pratik.nandoskar/Documents/working/my-curated-haven-impl/supabase/tests/database/02_saved_recipes.test.sql .. ok
All tests successful.
Files=2, Tests=25, 0 wallclock secs
Result: PASS
```

### 2. Database Type Drift (`supabase gen types`)
```
Connecting to db 5432
src/lib/types/database.ts: 0 drift detected
```

### 3. ESLint (`npm run lint`)
```
> my-curated-haven-web@0.1.0 lint
> eslint
Passed with 0 errors and 0 warnings.
```

### 4. TypeScript Typecheck (`npm run typecheck`)
```
> my-curated-haven-web@0.1.0 typecheck
> next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
```

### 5. Production Build (`npm run build`)
```
▲ Next.js 16.3.6 (Turbopack)
✓ Compiled successfully in 870ms
  Collecting page data using 9 workers in 890ms
✓ Generating static pages using 9 workers (19/19) in 447ms
Route (app)
├ ○ /
├ ○ /about
├ ƒ /account
├ ƒ /account/saved-recipes
├ ○ /privacy
├ ƒ /recipes
├ ƒ /recipes/[slug]
├ ƒ /sign-in
├ ƒ /sitemap.xml
├ ○ /support
└ ○ /terms
```

### 6. Playwright E2E Tests (`npm run test:e2e`)
```
Running 141 tests across chromium-desktop, chromium-mobile, webkit-mobile
  114 passed
  27 skipped
  0 failed
Total duration: 50.4s
```
Covering:
- Open redirect rejection, protocol-relative rejection, and loops fallback.
- Unauthenticated access redirects from `/account` and `/account/saved-recipes` to `/sign-in`.
- Unauthenticated Save button clicks redirecting to `/sign-in` with `returnTo`.
- 100% anonymous free recipe detail reading and printing preserved.
- OTP sign-in flow via local Mailpit delivery.
- Account overview displaying verified email, support link, and closure instructions.
- Saved recipes listing displaying active items and unavailable item fallback.
- Bookmarking a recipe on `/recipes`, verifying state on `/account/saved-recipes`, and removal persistence.
- Cross-user data isolation: Nonbuyer B sees isolated empty state and zero Buyer A rows.
- Sign out clearing local session and returning to `/recipes`.
- Zero horizontal overflow at 320px viewport across all account and auth pages.

---

## PR #25 Remediation Revalidation

The checks below cover the remediation in `REMEDIATION-PLAN.md`, implemented from `main` at `4dc37df27bbc95341bc7ad30bc2f94f8d23a1c54`, and released to the live Supabase project `ccrgvammglkvdlaojgzv` through PR #28 at `6d43d8f1cf75510d82fda00105998ff1875b954d`. This release evidence supersedes the earlier P7-05 migration status above.

### P7-R1 — saved-recipes migration

- Before applying the migration, `supabase migration list --linked` confirmed that `20260923180000_phase7_saved_recipes_policies.sql` was absent from live history. Later Phase 8/9 and hardening migrations were also pending.
- The pre-change privilege check showed `public.recipes` SELECT for `anon` and `authenticated`, with no INSERT/UPDATE/DELETE for either role. `public.saved_recipes` had SELECT for both roles and no INSERT/UPDATE/DELETE.
- A dry-run using the applied migration history plus only the Phase 7 migration listed exactly `20260923180000_phase7_saved_recipes_policies.sql`. The migration was then applied through that isolated path; no Phase 8 or later migration was applied.
- Post-apply checks confirmed `anon` has no `saved_recipes` privileges; `authenticated` has SELECT/INSERT/DELETE but no UPDATE; and `service_role` retains all privileges. RLS is enabled. The three table policies allow only `auth.uid() = user_id` for SELECT, INSERT, and DELETE.
- `public.recipes` privileges were unchanged: `anon` and `authenticated` retain SELECT and have no INSERT/UPDATE/DELETE privileges.
- The local database already contains the Phase 7 migration. `supabase test db --local supabase/tests/database/02_saved_recipes.test.sql` passed all 10 tests.

### P7-R2 — access-gated saves

- `saveRecipe()` now checks `checkRecipeAccess()` using the caller's Supabase client before inserting. It permits `free` and `entitled`; `denied`, `not_found`, and access-check failures return distinct typed error codes and do not call `upsert`.
- `removeSavedRecipe()` remains available without an access check, so owners can clear withdrawn or unavailable bookmarks.
- The six focused save-access tests cover denied, missing, unavailable, free, entitled, and removal outcomes. They passed after first failing against the previous implementation.

### P7-R3 — account-creation disclosure

- The email step now states that entering a new email address creates a My Curated Haven account. Terms and Privacy links appear in the same disclosure paragraph. `shouldCreateUser: true` remains unchanged; no SMTP, provider, or shared email-template settings were changed.
- Local Auth/Mailpit E2E verified a code request and sign-in for the synthetic `buyer-a@synthetic.test` account. The local `supabase/config.toml` values used by that fixture are `auth.rate_limit.email_sent = 300/hour`, `sign_in_sign_ups = 300/5 minutes`, `token_verifications = 300/5 minutes`, `auth.email.max_frequency = 1s`, and `auth.email.otp_expiry = 3600s`.
- No dedicated staging Supabase project or designated test inbox was available in the accessible project/environment lists. These local values are not staging or production settings. No real email was sent; native password and Google sign-in compatibility remains unverified, and no template conflict is claimed.

### P7-R4 — account-closure wording

- The account page now labels this as a closure request, keeps the registered-address requirement and `support@mycuratedhaven.com` mailto, and says that emailing support does not itself delete the account or saved recipes. `signOut({ scope: "local" })` is unchanged.

### Remediation verification

- Focused Playwright checks passed: 6 save-access tests, the sign-in and account-closure disclosure checks, and the authenticated free-recipe save/remove journey.
- `npm run lint`, `npm run typecheck`, `npm run build`, the focused Playwright checks, and the local saved-recipes pgTAP suite passed. GitHub `web-quality` and `backend-quality` also passed on PR #28.
- Vercel reported the Production deployment for merge SHA `6d43d8f1cf75510d82fda00105998ff1875b954d` as successful. The canonical `/sign-in` and `/recipes` routes returned HTTP 200; the live sign-in page contained the new account-creation disclosure.
- Staging OTP delivery and native password/Google compatibility remain unverified: no staging project or designated test inbox was available. Local Auth/Mailpit testing used a synthetic account; no real email was sent and no shared Auth setting or template was changed.
