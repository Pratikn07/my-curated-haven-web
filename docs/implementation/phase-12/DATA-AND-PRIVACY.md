# Data, identity and privacy

## Minimum data for the first extension

The recommended planner stores an adult account owner, week dates and selected recipe IDs. No child profile, exact age, birth date, health history, photo, free-text note or AI conversation is necessary. A general recipe preference must not silently become a medical or allergy profile.

| Data class | Handling in this phase |
| --- | --- |
| Published recipe content | Reuse reviewed catalog and protected-body contracts |
| Recipe entitlement | Read current server-authoritative rights, do not duplicate as a client boolean |
| Adult identity | Verified auth UUID, no body-supplied owner authority |
| Planner selections | Owner-private records with bounded retention and export/delete controls |
| Research contacts/notes | Restricted system, separate from repo and analytics |
| Child/health records | Excluded from the initial pilot |
| Instagram data | Separate automation project, aggregate campaign reference only |
| Payment records | Existing commerce ledger and retention policy, separate from optional research data |

## Schema decision workflow

Inspect current schema definitions, deployed migration history and consumers before proposing a table. The native and web repositories contain overlapping histories. Never replay native migrations into the selected hosted product project without reconciling the actual schema.

If planner persistence has no existing suitable home, use the proposed model in [the planner specification](CONDITIONAL-PLANNER-SPEC.md). Validate in disposable local Supabase first. Create migration files through the installed CLI's documented command after reading `--help`. Keep migrations additive, explicitly grant only required operations, regenerate types and run access tests. Shared deployment requires D12-06 and a reviewed migration diff.

Existing data must not be reset to make a test pass. Never change the legacy recipe policy to make planner reads easier. Include estimates for lock time, row volume, indexes and rollback compatibility before a production migration. No new DB project or paid provider service is authorised by this plan merge.

## Ownership rules

Derive the actor from verified authentication on every server operation. Apply ownership to the selected plan and every entry. An entry ID, plan ID, recipe ID, valid JWT or hidden URL alone does not establish permission. Reject requests attempting to set or transfer `user_id`.

If using exposed tables, combine table grants with RLS for each supported operation. Updates need read permission plus old-row and new-row ownership checks. For child rows, evaluate ownership through the parent relationship. Use a single atomic transaction for parent version checks and entry writes. Avoid privileged database access for ordinary reads.

Views and RPC functions need separate review. Prefer invoker behaviour. A function with elevated privileges requires a narrow purpose, verified actor, safe search path, explicit execution grants, input limits and tests proving cross-user denial. Revoke default public execution where inappropriate. Keep administrative control tables outside exposed schemas.

Store feature eligibility server-side. Do not trust `user_metadata`, local storage, a public environment variable or a cookie supplied by the browser for access. If grants or eligibility change, sensitive reads evaluate current state rather than waiting for a stale JWT claim to refresh.

## Content entitlement checks

A planner entry is a reference, not a permanent recipe licence. Resolve content access at read and print time. A saved or planned recipe whose entitlement expires, is refunded or is withdrawn becomes an unavailable placeholder without ingredients or instructions. Owners retain the ability to remove the reference. Other independently valid grants still count.

Never copy full protected bodies into planner tables, event payloads, HTML data attributes, browser persistence or public caches. Ordinary owner responses use private/no-store behaviour. Keep private plans out of sitemap, metadata previews and unauthenticated Open Graph responses.

## Data lifecycle

Before pilot enrolment, publish a clear purpose and end policy. Proposed pilot lifecycle: keep planner data during the 28-day pilot, provide a 30-day owner-only export/delete period after retirement, then remove planner rows unless the feature continues under an approved policy. Confirm dates in D12-13. This is a proposed product policy, not a legal retention conclusion.

Users should delete a week independently of account closure. Deleting a plan removes its entries atomically. Export returns only the requester's permitted records and redacts content no longer accessible. Exports must not recreate protected recipes or reveal another household's data.

Account closure remains a verified support request until an end-to-end deletion service is implemented. Extend the runbook to include planner rows, eligibility records, support and research records, optional analytics linkage and any storage objects. Distinguish recipe access ending, personal-data deletion and commerce records retained under the approved policy. Explain timing before execution.

Revoking refresh sessions does not instantly erase existing access tokens. If immediate access termination is required, enforce a current server-side account/feature status on sensitive endpoints and verify behaviour with an existing token. Apply equivalent direct Data API policy restrictions where endpoints are exposed. Do not promise instant closure while tokens still read records.

Backups retain historical data until expiry. Record the recovery retention and deletion-replay procedure. A restore must reapply deletion tombstones before opening access, without placing private identifiers in public Git history. No claim of instant erasure from every backup.

## Child-data expansion gate

If research later selects child profiles or milestones, stop the planner blueprint and write a feature-specific addendum. Required fields include purpose per attribute, minimum age granularity, parent/guardian ownership, multi-child relationships, access removal, export, deletion, retention, support visibility and review of applicable privacy requirements. Do not infer household membership from an email domain or shared device.

Adult-operated positioning does not remove the need to review child-data handling. Keep child records out of analytics and AI providers by default. Any family invitation flow requires verified invitation ownership, expiry, revoke and cross-household isolation. This phase approves none of those flows.

## Provider references

The design separates grants from row policies and keeps privileged keys outside clients, following [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api) and [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security). Review deletion and token behaviour against [user management](https://supabase.com/docs/guides/auth/managing-user-data) before implementation. These references supplement, rather than replace, tests against the chosen project and installed versions.
