# Conditional planner specification

## Activation condition

Implement this specification only if D12-03 selects the planner and the feature charter passes gate X-G02. This document supplies implementation detail so selection produces a reviewable scope. No customer demand or planner approval is claimed.

The adult user's job: choose recipes for the next week, return to those choices and print a simple list. The first version holds one selected recipe per day. Users choose manually from recipes they currently have permission to read.

## Included and excluded behaviour

Include create/read a weekly plan, assign/replace/remove a recipe for a day, open the recipe, browse another week, delete a week and print/export a permitted weekly list. Preserve selections across signed-in devices.

Exclude automatic generation, grocery aggregation, nutrition totals, serving conversion, child profiles, free-text notes, photos, household sharing, notifications, calendar integration, offline writes and AI. More than one meal per day is a later decision. Do not label this first slice a complete dietary meal plan.

## Proposed data model

Final names depend on the schema inventory. Do not create parallel tables if equivalent validated structures already exist.

| Entity | Fields and constraints | Purpose |
| --- | --- | --- |
| `meal_plans` | UUID `id`, verified `user_id`, date `week_start`, integer `version`, creation/update timestamps. Unique `(user_id, week_start)` | One plan per owner and ISO Monday week |
| `meal_plan_entries` | UUID `id`, `plan_id`, date `day`, `recipe_id`, timestamps. Unique `(plan_id, day)` | One recipe reference per date |
| Pilot eligibility | `feature_key`, `user_id`, state, starts/ends, policy version | Server-controlled enrolment, separate from purchase entitlements |
| Mutation receipt, if needed | owner, request UUID, operation, payload hash, result/version, expiry | Safe retries after uncertain network outcomes |

`recipe_id` references the stable catalog identity. Do not copy recipe ingredients or instructions. Foreign keys preserve plan-entry consistency. A database constraint or atomic mutation validates each entry's day falls within the parent's seven-day range. The owner is immutable. Derive entry ownership through the parent, with an index on `plan_id` and the owner/week uniqueness index.

Week dates are calendar dates, not midnight UTC timestamps. Compute the visible week from the user's current browser timezone, send an ISO date and validate Monday server-side. Persist no exact location. Changing device timezone does not rewrite an existing plan's week. Test Sunday/Monday boundaries, year transitions, leap day and daylight-saving changes.

Pilot limits proposed for approval: 12 stored weeks per account, 7 entries per week, picker page size 20 capped at 50, 30 write requests per minute per account and an overall request-body size limit. Return a clear quota response before changing data. Final thresholds belong in the charter and tests. Limits are not a new paid tier.

## Read contract

`loadWeek(weekStart)` verifies actor, current feature mode and eligibility. Return either an empty permitted week, a versioned plan, unauthenticated, unavailable-feature or a retryable error. Do not turn database failure into an empty week.

Entry projection returns day, entry ID and either an accessible recipe summary or `unavailable`. Resolve full content only when opening an authorised recipe. For unavailable entries, return no body, image URL or hidden catalog metadata beyond the approved neutral placeholder. A currently public title is not needed for the placeholder contract.

The picker uses existing free/entitled access logic and a bounded projection. Public `/recipes` remains limited to the three free slots. Do not broaden public listing to populate a private picker. Search is explicit and parameterised, with allowlisted filters and bounded results. Do not port the native raw-search fallback.

## Mutation contract

Proposed server operations: `createWeek`, `setDayRecipe`, `removeDayRecipe`, `deleteWeek`. Inputs contain week/plan reference, day, recipe reference where needed, expected version and request UUID. Reject unknown fields, malformed IDs, out-of-range dates and owner claims. Derive actor on the server.

For each write:

1. Verify account status, feature mode and current eligibility. Deny before privileged work.
2. Load the plan under the caller's authority and lock or compare its version atomically.
3. Validate the date and, for assignment, current recipe read permission.
4. Apply one mutation and increment the parent version within the same transaction.
5. Return the committed projection. Invalidate only that owner's relevant view.

Permission and mutation should share a transaction where practical. Always recheck recipe access on subsequent reads, so revocation concurrent with a write never exposes content. Direct table/RPC writes must enforce the same ownership and reference rules, or be revoked in favour of the guarded mutation interface. A server action check alone does not secure exposed tables.

## Concurrency and retry behaviour

Two devices reading version 4 must not silently overwrite each other. The first valid write produces version 5. The second receives a conflict without altering the plan. Reload current state and let the user deliberately reapply the intended change. Do not automatically merge recipe choices for the same day.

Duplicate creates converge on the unique owner/week row. Repeated assignment of the same recipe to the same day is semantically idempotent. For exact retry confirmation, persist request UUID and payload hash in the transaction. Same request/same payload returns the prior outcome, while same request/different payload returns conflict. Scope receipts to the owner and expire under the approved retention limit. After timeout, read the week before issuing a fresh mutation.

Delete/removal retries return a consistent removed outcome without exposing whether another owner's ID exists. User A attempting to mutate B's plan receives the same not-found/denied shape as an inaccessible ID. Never reveal ownership details in errors.

## Access changes

Refund, expiry, editorial withdrawal and account suspension are distinct causes. All resolve through the current access contract. A previous planner selection does not grant access. A valid independent entitlement still permits the recipe after one purchase source is refunded.

Allow the owner to remove unavailable entries during normal or read-only retirement operation. Do not require buying again to clean a plan. Feature retirement does not revoke recipe purchases. Technical emergency mode is allowed to disable affected reads temporarily while support handles recovery.

## Print and export

Generate an owner-private weekly list containing dates and currently accessible recipe titles/links. Exclude ingredients/instructions in the first pilot export. A neutral unavailable marker replaces lost-access selections. Recheck authority when generating the export, not only when the page first loaded.

Use the existing recipe print page for complete recipes under its own access check. Printable weekly lists are not transferable entitlement tokens. Never generate public static files with private plan contents. Clear any client blob URLs after use and avoid persistence in service-worker caches.

## Proposed code targets

| Area | Target |
| --- | --- |
| Route | `src/app/account/meal-plan/page.tsx`, loading/error states and optional private print route |
| UI | `src/components/planning/WeekPlan.tsx`, `DayRecipePicker.tsx`, `PlanEntry.tsx` |
| Data | `src/lib/data/meal-plans.ts`, typed result union and bounded projection |
| Actions | `src/lib/actions/meal-plans.ts`, verified actor and validated inputs |
| Eligibility | `src/lib/features/eligibility.ts`, server-only policy evaluation |
| Existing integrations | Account page, safe auth return paths, recipe access, UI primitives and analytics allowlists |
| DB | A generated additive migration under root `supabase/migrations/`, RLS/constraint tests and generated types |
| Tests | Focused planner integration, concurrency, access and mobile E2E files |

These paths are proposals. Match actual repository conventions at implementation. No dependency installation is expected for the first slice. If a new dependency becomes necessary, document the need, licence, bundle impact and pinned lockfile change.

## Vertical-slice delivery

First prove one synthetic user reads an empty week, assigns one free recipe, reloads, prints and deletes. Add paid-access loss, two-user isolation, two-device conflict and pilot-off behaviour before real content. Then verify three-free-recipe and purchased-library regressions. A seven-card mockup without these behaviours is a prototype, not a completed feature.
