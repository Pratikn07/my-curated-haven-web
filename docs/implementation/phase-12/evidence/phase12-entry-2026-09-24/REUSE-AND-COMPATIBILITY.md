# Phase 12 source reuse and compatibility review

**Status:** source inventory only. No feature charter or database change is approved.

**Revisions:** web monorepo `8e58812be52a0a5d4ad5c1062c810bf43b399ed6`; standalone native `main` `5e5caa73f5a5d0705572739dd881a96abe9be23b`. The web repository pins its `parenting_app` gitlink to `b92605d473595d6057663d1ac824a11112eedb0d`; production deployment versions remain unknown. See [the baseline](BASELINE.md).

## Source map

| Capability | Web source | Native source | Phase 12 assessment |
| --- | --- | --- | --- |
| Recipe catalog and detail | `my-curated-haven-web/src/lib/data/recipes.ts`; `src/app/recipes/` | `src/services/recipeService.ts`; `src/lib/types/recipes.ts`; recipe screens | Reuse stable recipe references only after the ingestion/source-ID contract is verified. The web catalog and native `recipes` table are distinct source surfaces. |
| Recipe access | `my-curated-haven-web/src/lib/data/access.ts`; recipe body reads use the web caller's Supabase client | Native service and database policies in the separately versioned native repository | A new web workflow must use current web access checks and recheck access on read. Do not infer that a native entitlement or a recipe ID alone grants access. |
| Account and identity | `my-curated-haven-web/src/lib/supabase/server.ts`, `session.ts`, `src/proxy.ts` | Native auth store and Supabase client | Web server actions derive the actor through `auth.getUser()`. Cross-app UUID continuity and the deployed Supabase project are not established by these source files. |
| Saved recipes | `my-curated-haven-web/src/lib/data/saved-recipes.ts`; `src/lib/actions/saved-recipes.ts`; account page | `src/services/recipeService.ts`; `saved_recipes` migration and favorites screens | Existing saved-recipe behaviour is a useful comparison. The web action derives the current user; native service calls accept a `userId` argument. A web feature must use the web session boundary rather than porting a caller-supplied actor pattern. |
| Preferences and child context | No planner/child preference store identified in the web feature path | `src/shared/stores/recipeStore.ts`; `src/shared/stores/childStore.ts` persist to React Native `AsyncStorage` | Do not port local native state or child records into browser storage or planner persistence. The conditional planner can begin with account-owned recipe IDs only if selected. |
| Articles, tips, milestones, chat | No Phase 12 web implementation selected | `src/services/tips/DailyTipsService.ts`, `MilestonesService.ts`, `ChatService.ts`; articles and milestone migrations/functions | Defer these surfaces. Their source presence is not demand evidence, web access approval, or authorization to reuse private or child-linked data. |
| Analytics | `my-curated-haven-web/src/lib/analytics/events.ts`, `schema.ts`, consent and provider modules | Native analytics/runtime is a separate implementation | Web events are allowlisted and consent-aware. No planner event or live behavioural result was identified. Add measurement only after a feature and decision question are approved. |
| Database changes | Monorepo-root `supabase/migrations/` | Native repository's own `supabase/migrations/` | Two migration trees and the stale web gitlink make database ownership and deployment mapping unresolved. Do not create or apply a migration until P12-07 confirms one authority and compatible consumers. |

## Planner-specific findings

- No weekly-plan screen, service, table, or migration was found in the inspected web or standalone native main revisions.
- The current web account, recipe, and saved-recipe flows offer existing UI and access patterns if the planner is selected. This is implementation reuse, not evidence that users need a planner.
- The Phase 12 planner contract proposes storing recipe IDs and rechecking current access. It excludes child profiles, health records, meal advice, and copied recipe bodies. Preserve those boundaries if a later approved charter selects it.
- Existing source does not establish which Supabase project serves each app, whether both apps share auth UUIDs, or whether production has schema objects absent from the repository. Confirm these before P12-07/P12-10.

## Compatibility decision

**No shared schema change is ready.** First confirm the native source revision used by the app, the web/native project map, migration authority, and stable recipe-ID mapping. Any selected feature then needs explicit owner/access rules and regression evidence for the three free recipes, saved recipes, purchases, and account closure.
