# Native reuse and compatibility

## Inventory at the reviewed commit

Native repository: `Pratikn07/parenting-app`, commit `5e5caa73f5a5d0705572739dd881a96abe9be23b`. Source presence is not a deployed feature audit. Native runtime and iOS tests were not run for this documentation task.

| Capability | Native source | Reuse decision |
| --- | --- | --- |
| Recipe queries and mapping | `src/services/recipeService.ts`, `src/lib/types/recipes.ts` | Preserve source IDs and reviewed domain concepts. Use the existing web access layer for reads |
| Recipe filters and detail | `src/frontend/components/recipes/`, `src/frontend/screens/recipes/recipeDetail/` | Reuse useful behaviour and content patterns. Rebuild UI with web primitives |
| Saved recipes | `src/frontend/screens/recipes/recipesHome/hooks/useSavedRecipes.ts`, `supabase/migrations/20251212000000_create_saved_recipes.sql` | Keep existing records and verified ownership. Do not introduce a second favourites table |
| Recipe preferences | `src/shared/stores/recipeStore.ts`, `supabase/migrations/20251210000000_create_recipe_user_preferences.sql` | Inventory current meaning and ownership before adapting. Do not infer health suitability from tags |
| Child selection | `src/shared/stores/childStore.ts`, `src/frontend/screens/settings/hooks/useChildProfile.ts` | Defer. Private persistent state requires a web-specific lifecycle |
| Milestones | `src/services/milestones/MilestonesService.ts`, `src/frontend/components/milestones/` | Defer behind a separate child-data and content contract |
| Daily tips | `src/services/tips/DailyTipsService.ts`, `supabase/functions/generate-tip/index.ts` | Distinguish generic reviewed resources from personal generated tips before reuse |
| Articles | `supabase/migrations/20251201000000_create_articles_system.sql` | Candidate structure for reviewed resources, not automatic publication rights |
| AI chat | `supabase/functions/chat/index.ts`, `src/services/chat/ChatService.ts` | Do not port until identity binding, evaluation, privacy and cost controls pass |
| Weekly planning | No implementation found in the scoped source/migration search | New module proposed only if selection and schema inventory confirm a gap |

## Reuse layers

Reuse recipe identity and editorial content first. Reuse pure formatters only after checking inputs and tests. Adapt business rules through explicit web contracts. Keep React Native components, Expo routing and AsyncStorage out of the Next.js runtime. Avoid importing a whole native state store for one helper.

For each reused unit record source commit, path/symbol, behaviour retained, behaviour changed, tests, owner and future sync strategy. Prefer a small deliberate copy of a stable pure helper over a shared package unless both apps need sustained coordinated changes. A shared package is an architectural decision, not a default goal.

## Known source traps

Native recipe detail reads `recipes.select('*')`. The web product uses catalog/access contracts and protected recipe content. Copying the native query would bypass the intended web boundary if legacy grants permit access. Test direct API access, not only rendered pages.

Native recipe mapping uses fallbacks for allergens, age, time and servings. Preserve unknown values rather than converting absent review into a safety claim. Never turn an empty allergen array into “allergy safe.” Keep the explicit Phase 5/6 review state.

Native child state persists children and active IDs through AsyncStorage. Browser account switching must not inherit another account's cached family records. The recommended first pilot needs no child store.

The inspected chat handler constructs a service-role client and consumes body `userId` for user context and sessions. Header presence alone does not bind those IDs to the authenticated caller. This is a source finding, not a claim of a successful live attack. Any future chat release must derive the actor from verified auth and validate every child/session relationship server-side.

## Shared identity and database checks

Produce a compatibility matrix with native version, web release, project reference, auth UUID source, migration head, supported sign-in methods and content/access endpoints. Do not infer account equivalence from matching email strings across projects. Separate projects require a verified account-linking or migration design, with conflict and recovery handling, before shared records are exposed.

Where both apps share one project, choose one migration authority and additive schema changes. Preserve native password and Google sign-in while validating web email-code flows. Do not replace shared mail templates without checking every consumer. Test old supported native clients against the new schema.

Where projects differ, avoid ad hoc cross-project joins, browser-held service keys or copying auth rows. Reuse content through the approved ingestion process with source IDs. Private record migration needs an explicit scope, actor verification, dry run, reconciliation and rollback plan. No migration of child histories is implied here.

## Compatibility test matrix

| Existing capability | Verification after a selected feature change |
| --- | --- |
| Native sign-in | Existing supported methods still create the same verified identity |
| Native recipes | Existing authorised reads still work under approved rights |
| Native saves | Create/remove still works and web does not rewrite bookmark ownership |
| Web free recipes | All three complete recipes remain anonymously readable and printable |
| Web purchased recipes | Existing grants still work without pilot enrolment |
| Full refund | Revokes only the relevant purchase source, preserves independent rights |
| Account switching | Private saved/planning state clears and refetches for the new actor |
| Older native version | New columns/defaults do not break requests or required fields |

Use synthetic users and records in isolated environments. Record unsupported client versions explicitly. A clean schema replay does not establish native compatibility. If an app cannot be exercised in the available environment, mark the check blocked and keep shared release gated.

Keep repository gitlinks unchanged. Native edits, if later required, belong to a separate reviewed PR following the native repository's AGENTS.md and build/verification instructions.
