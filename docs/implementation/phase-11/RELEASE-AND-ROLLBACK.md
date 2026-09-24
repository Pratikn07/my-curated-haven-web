# Release and rollback

## Release identity and change control

Freeze source SHA, build/deployment ID, migration head, content manifest, policy versions, provider settings and rollout mode in one release record. Any material change creates a new candidate or an explicit revision with an impact/retest assessment.

Keep a narrow launch change window. Avoid dependency upgrades, mass ingestion, broad theme changes and unrelated parenting features while diagnosing early behaviour. Document urgent fixes, reviewer, deployed version and rollback choice.

## Ordered production procedure

1. Confirm executed Phase 10 G01–G12, Phase 11 readiness results and staffing. Stop if evidence is stale.
2. Record current production artifact and a tested safe rollback target. Verify operator access before starting.
3. Set new checkout disabled through the implemented server control and verify rejection from multiple serving instances. Preserve existing owners and processing.
4. Confirm backup/recovery point and pending-migration diff. Apply only reviewed compatible migrations through the approved migration workflow.
5. Verify role grants, direct access boundaries, source UUID continuity and current native behaviour. Do not replace production data with local fixtures.
6. Publish approved targeted content/offer changes with a before/after manifest and audit record. Keep sale eligibility off.
7. Deploy the production-target artifact with verified variables. Confirm provider callbacks and background jobs point to the correct environment.
8. Promote the exact artifact through the chosen hosting workflow. Check official domain, TLS, canonical URLs and deployment version.
9. Run read-only production smoke: three full free recipes, collection preview, sign-in page, support, private-access rejection and disabled checkout. Use only authorised account actions for private-path checks.
10. Observe dependency/job health for the L1 window. Record go/no-go before inviting any paid cohort.

Do not paste destructive commands into the execution packet without verified project targeting and a reviewed recovery procedure. Discover current CLI syntax through installed help when implementing automation.

## Compatibility table

Populate this table before promotion, using actual version identifiers.

| Component | New version | Safe rollback version | Compatibility evidence |
| --- | --- | --- | --- |
| Web app | Pending | Pending | Reads current schema, respects existing sources and security boundaries |
| Database | Pending migration head | Forward-compatible state retained | Old app supports additive changes, no destructive ledger rollback |
| Commerce worker | Pending | Pending | Accepts queued event versions and preserves idempotency/fencing |
| Content | Approved manifest | Prior revision only where policy permits | Paid membership/history remains intact |
| Configuration | Recorded flags/secrets refs | Explicit compatible set | No stale key/mode/origin, checkout stays stopped if uncertain |

An older build predating payment signature fixes, legacy access hardening or simulation isolation is not a safe rollback target. If no safe previous artifact exists, keep affected sales disabled and use a forward fix.

## Stop procedure

- Release lead or designated incident operator sets new-sale mode disabled and logs time/reason.
- Verify the server rejects new direct checkout requests, not only the UI.
- Identify open hosted Sessions and the policy for allowing completion or expiring eligible unpaid Sessions.
- Continue durable webhook receipt, fulfilment, refunds/disputes, reconciliation and valid owners' reads wherever safe.
- Pause scheduled external promotion through the authorised channel owner. Posted links might continue bringing traffic.
- Show truthful availability/support messaging. Never suggest a paid customer should pay again to fix access.

Stopping checkout does not cancel a Session already hosted by Stripe, undo a charge or revoke a legitimate purchase. Record pending attempts and reconcile after recovery.

## Application rollback

Confirm the incident is application-related, choose the tested compatible artifact, preserve the stopped-sale state, and perform rollback through the host's supported process. Verify official-domain traffic, environment values, jobs and auth/payment callbacks immediately afterward.

Vercel rollback restores an earlier deployment with its earlier build configuration and job definitions. Changed project environment variables are not automatically incorporated into the old build. Check current flag effectiveness and secrets compatibility. Verify domain auto-assignment behaviour before the next deployment.

Application rollback does not rewind Supabase, Stripe, sent mail or downloaded recipes. Never drop financial rows or reopen public paid-content reads as an application recovery shortcut.

## Backup and restore

Record actual database backup/PITR entitlement, retention, last valid recovery point, restore operator and cost. Database backups do not include Storage API objects, so inventory image/private-file recovery separately. Include auth identities, restricted-role credentials/configuration, manifests, grants and job settings in the recovery plan.

Rehearse restore in an isolated target. Disable outbound mail, exports and live jobs before reconnecting anything. Verify schema, roles, source IDs, storage references and privacy deletion/tombstone state. Reapply required deletion/suppression actions so restored optional data is not exported again.

Reconcile genuine provider facts after the snapshot with overlap, pagination and deduplication. Recover missing confirmed purchases and refunds, then project rights across native/support/purchase sources. Check saved-recipe and editorial changes separately because Stripe cannot reconstruct them.

Use the Phase 10 proposed 60-minute staging recovery target until owners approve evidence-based production RTO/RPO. State actual measured loss windows by data class. Do not claim zero loss because payment reconciliation exists.

Production restore needs a specific incident recovery decision, affected-data assessment and authorised operator. This plan's merge does not authorise restore, deletion or key rotation.

References: [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback), [Supabase backups](https://supabase.com/docs/guides/platform/backups). Recheck hosting-plan capabilities before relying on a particular rollback or recovery option.
