# Migration and rollout plan

## Target safety

Before any shared database command, record project reference, environment, migration owner and intended operation. Compare them with the session's authorization.

This plan does not authorize creating a paid project, changing insta-automation, copying production data or resetting a remote database.

Use a disposable local stack for schema iteration. Production and staging must never be the implicit default of a reset/test script.

## Baseline reconciliation

1. Read the selected project's migration history and schema metadata.
2. Compare native migrations with live table names, constraints, policies and functions.
3. Document discrepancies instead of editing already-applied migration files.
4. Choose a migration authority across the web and native repositories.
5. For a new project, establish a clean minimum recipe baseline.
6. For an existing project, introduce additive objects or compatible extensions.
7. Keep old application clients working until a separate retirement decision.

The native base migration's parent_id/user_id mismatch is enough reason to require a clean replay test. It is not proof of the current live schema.

Do not run the whole native migration directory against a new web project without reconciliation.

## Local iteration workflow

Discover commands with the installed Supabase CLI help. Record CLI and local database versions.

Iterate schema changes through local SQL, then run the advisors and access tests. Capture the reviewed result into a migration using the supported diff/pull workflow. When manually creating a migration file, use the CLI migration-new command rather than inventing a timestamp.

Review generated SQL before commit. Include grants, policies, indexes, trigger/function permissions and storage configuration as appropriate. A schema diff alone does not prove those settings are complete.

Reset only the disposable local instance and replay migrations from zero. Then test upgrade from the supported synthetic baseline. Inspect schema drift after replay and regenerate types.

Reference: [Supabase database migrations](https://supabase.com/docs/guides/local-development/database-migrations).

## Migration ordering

Recommended dependency order:

1. Private schema and restricted role/object defaults scoped to the new objects.
2. Catalog, body and collection identity relations.
3. Release membership and free-slot relations.
4. Entitlement and private audit relations.
5. Constraints and indexes.
6. RLS policies, deliberate grants and function execution restrictions.
7. Storage buckets/policies and content-to-object mapping.
8. Synthetic local seeds and generated types.

Publish no usable data before its grants and policies are in place. Keep changes transactional where supported. Operations requiring separate transactions need explicit review and sequencing.

Do not broadly revoke privileges across a shared public schema without understanding native consumers. Scope changes to new objects, then address inherited risks through reviewed follow-up work.

## Content migration

Phase 4 validates the transport/schema with synthetic records. Phase 5 imports real recipe content.

For that later import:

- Define native-to-web field and ID mappings.
- Preserve quantity text, units and ordered instructions.
- Keep unknown time/allergen data unknown.
- Preserve source provenance privately.
- Validate images, slugs and references.
- Quarantine invalid rows rather than silently defaulting values.
- Produce counts and a rejection report without personal data.
- Publish reviewed content transactionally.

Do not import chat histories, children, Instagram contacts or native subscription records with recipe content.

## Staging rehearsal

After the target is verified and staging writes are authorized:

1. Confirm environment and schema history.
2. Apply the reviewed migration set.
3. Run actual API tests with synthetic user tokens.
4. Verify public and private storage paths.
5. Verify SSR session refresh and existing proxy restrictions.
6. Run security/performance advisors and assess results.
7. Confirm the intended exposed schemas and function grants.
8. Record migration IDs, source SHA and test results.
9. Remove synthetic remote fixtures through the controlled cleanup path when no longer needed.

A service-role SELECT which succeeds is not an access test. Test the real anonymous and authenticated caller paths.

## Production prerequisites

- Verified product project and migration authority.
- Successful local replay and staging rehearsal.
- Current backup with a known restoration procedure.
- Separate storage-object recovery plan.
- Application compatibility and rollback plan.
- No unresolved shared-backend authorization issue affecting web users.
- Current session authorization for the specific deployment.
- No customer purchase grants until Phase 8's trusted payment path exists.

Remote readiness should not be declared from successful local tests alone.

## Database and storage recovery

Record database backup/PITR availability for the actual account and plan. Verify restoration in an isolated environment or through a documented provider-supported rehearsal.

Database backups and storage objects have separate recovery needs. Preserve an asset manifest and verify object backup/recovery rather than assuming SQL restoration restores all files.

Do not put database dumps, credentials or customer data into the public repository or public CI artifacts.

## Application and schema rollback

Prefer additive changes so the prior app release continues to work.

If an app deployment fails, restore the prior compatible app while retaining safe additive schema objects. If a policy exposes data, close the affected access path through a reviewed restrictive fix first.

Do not reopen a broad public policy as a convenience rollback. Do not reverse a migration by dropping data-bearing tables without a reviewed recovery plan.

Destructive contraction, old-column removal and native-client retirement happen only after compatibility evidence and explicit implementation scope.

## Operational checks

Record database/API failures, denied-access patterns and grant-write audit outcomes with safe request identifiers. Avoid full response logging.

Use current monitoring endpoints. The reviewed changelog reports the Management API logs.all endpoint migration, so old native scripts need inspection before reuse.

Rate-limit future auth, mutation and signed-link delivery endpoints according to their risk. Do not add an unrelated AI or analytics service to complete this phase.

## Rollout evidence template

- Target project and environment:
- Migration authority:
- Source baseline and final SHA:
- CLI/database versions:
- Baseline drift:
- Migration identifiers:
- Local replay:
- Synthetic upgrade:
- Policy/API/storage tests:
- Advisor findings:
- Backup and storage recovery:
- Staging deployment:
- Production authorization and deployment, if any:
- Rollback reference:
- Remaining blockers and owners:

## Production migration state and rules

Recorded by the 2026-09-25 audit. Production (`ccrgvammglkvdlaojgzv`) history:

| Version | Applied |
| --- | --- |
| `20260923042735_phase4_schema` | Yes (PR #11) |
| `20260923053000_phase5_recipe_ingestion` | Yes |
| `20260923180000_phase7_saved_recipes_policies` | Yes (Phase 7 remediation) |
| `20260923200000_phase8_commerce_schema` | **No** |
| `20260924000000_phase9_analytics_security` | **No** |
| `20260924010000_phase9_measurement` | **No** |
| `20260924120000_phase4_access_hardening` | Yes (2026-09-25 audit) |
| `20260924174355_phase8_remediation_guards` | **No** |
| `20260925100000_phase5_allergen_review_guard` | Yes (2026-09-25 audit) |
| `20260926020339_phase4_audit_storage_and_rpc_hardening` | Yes (2026-09-25 audit) |
| `20260926031344_phase4_audit_pin_function_search_path` | Yes (2026-09-25 audit) |
| `20260926052700_phase5_audit_reset_allergen_review_and_fix_drafts` | Yes (2026-09-25 audit) |
| `20260926052702_phase5_audit_publish_requires_review` | Yes (2026-09-25 audit) |
| `20260926144356_phase5_ai_review_fix_live_free_recipes` | Yes (2026-09-26) |

Rules:

1. **Never run a plain `supabase db push` against production.** It would apply every unapplied file at once, including the Phase 8 commerce schema, and history is now out of order.
2. Take a logical dump first (`supabase db dump --linked`, plus `--data-only`), and store it outside the repository.
3. Apply one reviewed migration at a time inside a transaction: wrap the file in `BEGIN; … COMMIT;` and run `supabase db query --linked -f <file>` from the repository root.
4. Record it: `supabase migration repair --status applied <version> --linked`.
5. Verify as a real caller (anonymous REST request or signed-in synthetic user), not as `service_role`. Then run `npm run smoke:production`.
6. Never run `supabase config push`. `supabase/config.toml` is local-only.
