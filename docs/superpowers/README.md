# Admin console design and implementation plans

This index collects the five admin phases discussed with the owner. Each phase has a design specification and a detailed implementation plan.

The admin phases are a separate effort from the [website roadmap](../implementation/README.md). Their numbers do not refer to the website roadmap's Phase 1–12.

| Admin phase | Scope | Design | Implementation plan |
| --- | --- | --- | --- |
| 1 | Existing recipe inspection, private editing, review, publication and named admin access | [Phase 1 design](specs/2026-10-04-admin-recipe-workspace-design.md) | [Phase 1 plan](plans/2026-10-04-admin-recipe-workspace.md) |
| 2 | Collection drafts, preview, approval and publication; preserve purchases and deliver future additions | [Phase 2 design](specs/2026-10-06-admin-collections-phase-two-design.md) | [Phase 2 plan](plans/2026-10-07-admin-collections-phase-two.md) |
| 3 | Customer purchases, access support, exceptional owner-approved refunds and dispute handling | [Phase 3 design](specs/2026-10-07-admin-customer-support-phase-three-design.md) | [Phase 3 plan](plans/2026-10-07-admin-customer-support-phase-three.md) |
| 4 | Campaign preparation and publication, preserved recipe promises and separately authorised financial reporting | [Phase 4 design](specs/2026-10-07-admin-campaigns-phase-four-design.md) | [Phase 4 plan](plans/2026-10-07-admin-campaigns-phase-four.md) |
| 5 | Owner overview, attention and history (5A), then operational evidence, recovery and governance (5B) | [Phase 5 design](specs/2026-10-07-admin-operations-phase-five-design.md) | [Phase 5 plan](plans/2026-10-07-admin-operations-phase-five.md) |

## Delivery status

Publishing these documents makes the plans available for collaboration. It does not implement, activate or deploy the admin features, close their acceptance gates, or approve an individual publication, refund or customer message.

Phase 1 application work is tracked separately in [PR #99](https://github.com/Pratikn07/my-curated-haven-web/pull/99). Phases 2–5 are planning documents in this publication. Follow each plan's integration prerequisites, acceptance gates and release requirements before implementation or activation.

The documents retain their original dates, source baselines and review boundaries. Those snapshots are historical context rather than a fresh report of current production state. References to the Phase 1 operational runbook use a pinned source link because that runbook belongs to the separate implementation PR.

## Dependencies

Later phases do not block the delivery of every earlier phase. Each phase depends on specific earlier foundations and must satisfy its own release gates. For example, Phase 1 recipe corrections affecting purchased collections need Phase 2 purchase-preservation safeguards, and Phase 4 financial reporting needs the Phase 3 commerce contracts. Use the detailed dependency sections in the implementation plans when scheduling work.
