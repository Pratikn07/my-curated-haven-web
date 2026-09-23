# Existing parenting recipes: reuse and content handoff

## Mandatory direction

**Reuse the parenting-app recipe catalog by default.**

Next.js changes the presentation layer. It does not inherently require replacement recipes or a new Supabase project. First inspect the existing project, schema, access rules and assets. Prefer an adapter and additive access changes where they safely meet the web requirements.

A separate database or migration needs a recorded reason, such as incompatible ownership or access requirements, plus an ID mapping, reconciliation plan and rollback path. It must not be chosen merely for convenience.

## What source inspection established

The parenting repository contains a recipe service and recipe types at `src/services/recipeService.ts` and `src/lib/types/recipes.ts`. The reviewed source baseline is `5e5caa73` in `Pratikn07/parenting-app`.

The recipe type includes IDs, titles, descriptions, image URLs, age ranges, feeding types, dietary tags, kitchen styles, meal types, time, difficulty, servings, ingredients with amount strings, ordered instructions, tips, allergens and storage text.

This is evidence that recipe functionality exists in source. It does not establish current production row counts, completeness, content rights or live row-level security. Those facts require verification against the correct recipe project. The previously connected Instagram analytics project is not proof of access to the parenting recipe database.

Some existing transformations collapse unknown information into empty arrays or empty results. Do not inherit those semantics blindly. A missing allergen review and a reviewed empty allergen list are different states. A failed query and a genuinely empty catalog are different states.

## Required Phase 5 handoff

For each of the three free recipes, capture:

- Stable source ID, web slug and source revision or content checksum.
- Original title and approved public title, with the reason for any change.
- Ingredient list with every original amount and unit.
- Ordered instructions, including timings and temperatures present in the source.
- Reviewed yield and time fields, or explicit unknown values.
- Reviewed meal and dietary labels, with provenance.
- Allergen review status and approved public wording.
- Image source, usage permission, public delivery location and alt text.
- Any approved storage or preparation notes.
- Editorial approver and approval timestamp.
- Publication status and assigned free slot.

Keep private editorial records out of public metadata. Do not include child profiles, family data or Instagram audience information in a recipe content export.

Missing essential quantities or instructions block publication. Optional information should be omitted or clearly marked as unreviewed according to the agreed copy. Do not generate substitutes for missing safety information.

## Field mapping rules

| Existing concept | Web treatment | Guardrail |
| --- | --- | --- |
| Recipe ID | Retain canonical source identity | A new slug does not create a new recipe |
| Ingredient item and amount | Preserve text and ordering | Do not coerce fractions or units into lossy numbers |
| Instructions | Preserve ordered steps | Compare source and rendered output before approval |
| Time minutes | Map only after confirming its meaning | Do not relabel prep time as total time |
| Meal types | Normalize approved values | Unknown tags stay unclassified |
| Dietary tags | Publish reviewed labels only | Tags do not prove absence of cross-contact |
| Age range and feeding types | Retain privately unless approved for this experience | Do not imply a clinical suitability guarantee |
| Allergen array | Carry review status alongside values | Missing information is not an allergen-free claim |
| Rating and calories | Omit unless supported and approved | No default five-star rating or estimated nutrition |
| Image URL | Resolve to an approved delivery source | Do not publish private bucket URLs or arbitrary remote hosts |
| Storage and tips | Reuse reviewed text | Do not invent storage durations |
| Updated timestamp | Track approved public revision | A page render is not a content update |

No personalized age recommendation engine is needed in Phase 6.

## Public contracts

A card contract should contain only the fields necessary to browse: stable ID, slug, title, short approved summary, approved image and alt text, reviewed meal/diet labels, reviewed total time or null, publication timestamp and free-access label.

A free detail contract adds approved yield, ingredients, instructions, approved tips, allergen-review output and storage guidance. It never includes draft notes, moderation history or private author records.

Use separate types and query projections for cards and bodies. Client-side filtering must not depend on downloading every full recipe. Restrict serialization into React props, metadata and structured data to the same authorized public fields.

The Phase 4 plan proposes catalog/body separation and three free slots. Bind to the final verified implementation rather than hardcoding an unimplemented schema. A published recipe's paid/free state is authoritative server-side data, not a hardcoded client array.

## Reconciliation and change handling

Compare the selected source records and web output field by field. Record intentional edits. Test that rerunning any import or synchronization updates the existing mapping instead of creating duplicates.

Document the owner of ongoing editorial updates. Avoid two independently editable authoritative copies. If a snapshot is used for launch, name the source revision and the process for publishing subsequent approved changes.

Changing the free set requires an explicit editorial/access change, cache invalidation and verification that exactly three remain available. Do not automatically replace a withdrawn recipe with an unreviewed record to satisfy the count. If safe replacement is unavailable, pause the recipe launch and remove misleading copy until the approved set is restored.

Paid-preview cards are optional future work. They require a separately approved public metadata projection and truthful unavailable/purchase states. The Phase 6 default is the three complete free recipes.
