# Phase 4 detailed implementation plan

## Goal

Prepare a secure recipe data layer for My Curated Haven. Establish the project, schema, access rules, storage and server integration before publishing recipe content or accepting payment.

This phase introduces infrastructure and test contracts. It does not launch login, real recipe pages, payment or parenting tools.

## P4-01: verify project and repository ownership

Owner: engineering/product. Dependencies: current repository and environment access.

1. Fetch main and read the implementation evidence for Phases 1–3.
2. Record the active application SHA, runtime, CI requirements and hosting project.
3. Identify the intended Supabase product project. Compare the native project marker, environment configuration and actual project ownership.
4. Do not choose insta-automation because it is the only connected project.
5. Record whether the web product reuses native identities or uses a separate project.
6. Identify the authoritative migration repository for the selected database.
7. Record unknowns in ARCHITECTURE.md. Continue isolated local work while remote questions remain unresolved.

Deliverable: environment/project decision record with verified evidence.

Acceptance: every remote target has a documented purpose and owner. No guessed project or secret is used.

## P4-02: inventory the selected backend and native compatibility

Owner: engineering. Dependencies: P4-01 for shared-project inspection.

1. Inspect schemas, table names, grants, policies, exposed schemas, functions, triggers, storage buckets and migration history through read-only operations.
2. Inspect auth providers, redirect allowlists, JWT configuration and existing application consumers.
3. Use metadata and synthetic accounts. Do not export child profiles, chats or customer records.
4. Compare actual objects with native migrations. Record name drift and missing history.
5. Review the native chat ownership issue and other privileged endpoints if the same project is reused.
6. Verify whether existing recipe tables are publicly readable and whether full ingredients/methods have already been published.
7. Choose additive coexistence or a new schema baseline. Do not overwrite native objects to fit the web plan.

Deliverable: compatibility map and adoption decision.

Acceptance: the planned web changes do not silently remove native access, recreate existing tables or inherit unsafe privileged endpoints.

## P4-03: establish isolated local development

Owner: engineering. Dependencies: P4-01 local path.

1. Select and pin a compatible Supabase CLI version.
2. Discover installed CLI commands and flags through --help before using them.
3. Establish repository-root supabase/ as the proposed web migration home, subject to the shared migration-owner decision.
4. Run a disposable local stack with synthetic identities and storage.
5. Keep the normal web-quality job independent of production secrets.
6. Document reset/replay commands with their local target clearly identified.
7. Pin @supabase/supabase-js and @supabase/ssr when integrating the app, with reviewed lockfile changes.

Deliverable: reproducible local backend and setup instructions.

Acceptance: another developer starts the same local schema without access to production.

## P4-04: implement the minimum data foundation locally

Owner: engineering. Dependencies: P4-02 for adopted schema, P4-03.

1. Translate DATA-CONTRACTS.md into reviewed migrations.
2. Separate catalog rows, approved recipe bodies and private drafts.
3. Create the three-slot free selection and collection-release membership model.
4. Create the entitlement read model without a public grant writer.
5. Add explicit constraints and indexes for ownership and membership lookups.
6. Keep auth.users as identity authority. Do not import child/profile/chat tables.
7. Use versioned content structures and preserve unknown metadata.
8. Define a trusted transactional publication operation and release-sealing behaviour.
9. Seed fictional recipes and synthetic users only.

Deliverable: local schema and type-ready fixtures.

Acceptance: invalid references, duplicate memberships and a fourth free slot are rejected. Published release membership cannot be changed through the chosen writer path.

## P4-05: enforce the access matrix

Owner: engineering. Dependencies: P4-04.

1. Apply explicit grants and RLS to each exposed relation.
2. Implement public-preview, free-body, owned-release and self-entitlement reads.
3. Deny client writes to editorial data and entitlements.
4. Protect private schemas, view access and function execution.
5. Test visitor, user A, user B, buyer A and revoked buyer cases.
6. Test direct REST/nested reads as well as application DTO queries.
7. Inspect policy dependencies for recursion and missing privileges.
8. Measure representative access queries and add only needed indexes.

Deliverable: passing local authorization tests.

Acceptance: user A cannot read user B's grant or use it to retrieve a body. Visitor and nonbuyer cannot retrieve paid text through any exposed query path.

## P4-06: create storage boundaries

Owner: engineering. Dependencies: P4-05.

1. Separate public preview assets from private protected files.
2. Document stable object naming and content-to-asset mapping.
3. Apply storage policies using the same recipe eligibility model.
4. Restrict uploads and replacements to the trusted writer.
5. Test anonymous URL access, authorized downloads, cross-user requests and expiry.
6. Define private-file cache and signed-link handling.
7. Record object backup and restoration separately from database backups.

Deliverable: local or isolated staging storage checks.

Acceptance: an unauthorized direct file URL fails. No paid printable file is stored in a public bucket.

## P4-07: integrate typed Next.js data access

Owner: engineering. Dependencies: P4-05, Phase 2 runner.

1. Generate database types from the authoritative schema.
2. Add separate browser and per-request server clients.
3. Compose session handling with the existing proxy. Preserve deferred-route and design-review restrictions.
4. Add explicit catalog and body DTO functions using caller credentials.
5. Return typed success, not-found, access-denied and backend-failure outcomes.
6. Keep protected responses out of shared caches and static payloads.
7. Add synthetic-session integration tests.
8. Leave public login, favourites and recipe routes for their feature phases.
9. Ensure the current marketing app still builds without remote production credentials.

Deliverable: reusable data/session modules, not a new customer account flow.

Acceptance: malformed identity, cross-project tokens and request-supplied user IDs do not bypass access. Existing public routes remain functional.

## P4-08: reconcile and rehearse migrations

Owner: engineering. Dependencies: P4-04 through P4-07.

1. Follow MIGRATION-AND-ROLLOUT.md.
2. Replay the new history from an empty local database.
3. Test upgrade from a representative synthetic existing-schema baseline.
4. Run security/performance advisors where supported and record unresolved findings.
5. Compare generated schema/types and inspect unexpected drift.
6. Test an additive application rollback against the new schema.
7. Verify database and storage restoration in an isolated environment.
8. Separate content backfill from schema deployment. Real recipe imports belong to Phase 5.

Deliverable: replay, upgrade and rollback evidence.

Acceptance: the same migrations produce the intended policies, grants and constraints on both supported paths. No broad destructive reset is needed for a shared target.

## P4-09: extend CI and verify the foundation

Owner: engineering. Dependencies: P4-08.

1. Keep the existing web-quality workflow and browser coverage intact.
2. Add a backend-quality job for disposable local migrations, synthetic identity tests and type drift.
3. Use local generated test credentials only, with log/artifact redaction.
4. Run the acceptance matrix in VALIDATION.md.
5. Verify the backend job actually fails when an unauthorized read becomes possible.
6. After a successful run, include the stable job in the selected main merge requirements when the configuration change is authorized.
7. Do not add blanket path skips which leave a required check absent.
8. Record exact run URLs and commit IDs.

Deliverable: repeatable backend checks alongside existing web checks.

Acceptance: the database access boundary is verified in CI and failures cannot be dismissed as an empty result without checking protected content.

## P4-10: prepare shared rollout and handoff

Owner: engineering/product. Dependencies: P4-01 remote decisions and P4-09.

1. Finalize target identity and confirm current remote migration history.
2. Capture a suitable backup and verify the restore path.
3. Apply reviewed additive migrations to staging through the chosen migration authority.
4. Verify real provider auth/storage behaviour with synthetic identities.
5. Record production release conditions and current authorization. Do not assume the documentation merge authorizes database writes.
6. Apply production changes only in an authorized implementation session with the verified target.
7. Keep sales and public recipe exposure disabled until their later launch gates pass.
8. Record remaining editorial, account, payment and analytics work.

Deliverable: verified foundation or a precise local-complete/remote-blocked report.

Acceptance: no phase is labelled production-ready while project identity, permissions, restore evidence or authorization tests remain unresolved.

## Proposed file map

| Repository path | Purpose |
| --- | --- |
| supabase/config.toml | Local stack configuration |
| supabase/migrations/ | Generated and reviewed migration history |
| supabase/tests/ | Database policy and constraint tests |
| supabase/seed.sql | Synthetic local fixtures only |
| my-curated-haven-web/src/lib/supabase/ | Browser, server and session clients |
| my-curated-haven-web/src/lib/data/ | Catalog/access DTO queries |
| my-curated-haven-web/src/lib/types/database.ts | Generated schema types |
| my-curated-haven-web/src/proxy.ts | Composed session and existing route behaviour |
| my-curated-haven-web/.env.example | Names and safe placeholders |
| .github/workflows/ | Existing web gate plus backend verification |
| docs/implementation/phase-4/ | Decisions, evidence and handoff |

Do not invent migration filenames. Create them through the installed CLI's supported migration workflow after inspecting help.

## Work batches

| Batch | Tasks | Exit evidence |
| --- | --- | --- |
| A | P4-01 to P4-03 | Target decision, compatibility inventory, local setup |
| B | P4-04 to P4-06 | Schema, access matrix and storage tests |
| C | P4-07 to P4-09 | Typed integration, replay and CI evidence |
| D | P4-10 | Staging/production status and later-phase handoff |

Local batches proceed before remote access is available. Remote changes remain blocked on the actual target decision, not on arbitrary new business requirements.
