# Phase 12: evidence-led parenting expansion

Status: detailed plan only. Research, feature selection, implementation and pilot release are pending. No expansion feature, customer demand result or production approval is established by merging this package.

## Outcome

Use evidence from the recipe launch to choose the next useful step for My Curated Haven. Preserve the mobile-first recipe experience, existing purchases and parenting-app source. Build one small extension only after the problem, scope, data access and operating cost pass review.

The recommended first comparison is recipe improvements versus a simple weekly recipe planner versus reviewed feeding resources. The planner is a conditional implementation blueprint, not a selected feature. Holding expansion and improving the existing product is a valid completed decision.

Do not turn this phase into a full native-app port. Child profiles, milestones, AI chat, community and family sharing each need their own evidence and release contract before public development proceeds.

## Read in order

| Document | Purpose |
| --- | --- |
| [Implementation plan](IMPLEMENTATION-PLAN.md) | Twenty tasks, dependencies, owners, source targets and completion evidence |
| [Baseline and decisions](BASELINE-AND-DECISIONS.md) | Current repository findings, prerequisite gaps and decisions requiring an owner |
| [Research and evidence](RESEARCH-AND-EVIDENCE.md) | Launch review, interviews, recruitment boundaries and problem validation |
| [Feature selection](FEATURE-SELECTION.md) | Options, scoring, decision gates and scope control |
| [Native reuse and compatibility](NATIVE-REUSE-AND-COMPATIBILITY.md) | Existing source inventory, reuse rules and cross-app checks |
| [Data and privacy](DATA-AND-PRIVACY.md) | Identity, ownership, migrations, child-data boundaries and deletion |
| [Mobile product and theme](MOBILE-PRODUCT-AND-THEME.md) | Routes, navigation, palette, interaction states and accessibility |
| [Conditional planner specification](CONDITIONAL-PLANNER-SPEC.md) | Concrete vertical slice, data contract, operations and failure handling |
| [Access and commercial policy](ACCESS-AND-COMMERCIAL-POLICY.md) | Original recipe rights, pilot access and future offers |
| [Measurement and experiments](MEASUREMENT-AND-EXPERIMENTS.md) | Metric denominators, consent, decision thresholds and experiment validity |
| [Rollout and operations](ROLLOUT-AND-OPERATIONS.md) | Feature gates, cohort exposure, monitoring, rollback and retirement |
| [Validation and acceptance](VALIDATION-AND-ACCEPTANCE.md) | Eighty acceptance scenarios and gate evidence |
| [Implementation handoff](IMPLEMENTATION-HANDOFF.md) | PR sequence, evidence templates, estimates and final decision record |

## Product invariants

- Brand: My Curated Haven. Domain: https://mycuratedhaven.com/.
- Wording: “Recipes by Tiny Soho, inside My Curated Haven.”
- Audience: parents feeding toddlers. Promise: simple toddler recipes for busy families.
- Exactly three complete free recipes remain readable and printable without an account.
- The initial paid collection uses a one-time purchase. Existing offer terms govern existing buyers.
- Reuse reviewed parenting recipes and preserve source UUIDs. Do not rebuild the catalog to add a feature.
- Instagram automation stays in its separate Supabase project.
- Cream, terracotta and sage remain the design direction. Expansion does not require another rebrand.
- A recipe purchase does not promise unlimited AI, milestones or every future parenting tool.

## Completion paths

**Decision path:** finish research and selection, then record hold, recipe optimisation or further discovery. Record owners, next review and required evidence. Mark unselected build tasks not applicable with a reason, never passed.

**Pilot path:** approve one feature, implement its smallest useful version, verify access and compatibility, run the authorised pilot, then record continue, revise or retire. Pilot success does not approve a full parenting platform.

Source baselines: web `6d43d8f1cf75510d82fda00105998ff1875b954d`, native `5e5caa73f5a5d0705572739dd881a96abe9be23b`, reviewed 2026-09-24. Refresh both before execution.
