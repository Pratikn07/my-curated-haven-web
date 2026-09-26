# Phase 4 implementation evidence

Status: implemented. **Correction (2026-09-25 audit):** the original line said this work did not modify the production database. It did. PR #11 applied `20260923042735_phase4_schema.sql` to the shared product database `ccrgvammglkvdlaojgzv`, with no staging rehearsal. The record below describes the branch; see [the audit](#audit-2026-09-25) for production state.

## Source

- Branch: `phase-4-backend-foundation-d9f2`
- Base: `2d6e54e` on `main`
- Scope: isolated local schema, strict RLS access policies, storage boundaries, typed data access DTOs, pgTAP tests, and CI automation.

## What shipped in the branch

- **Local Supabase Configuration**:
  - `supabase/config.toml` configuring local API, DB, Studio, and Auth services.
- **Minimum Recipe Schema Migration (`supabase/migrations/20260923042735_phase4_schema.sql`)**:
  - `private.recipe_drafts` and `private.access_events` with restricted access (no public grants).
  - `public.recipe_catalog` with publication state constraints (`draft`, `published`, `withdrawn`).
  - `public.recipe_bodies` with explicit separation from catalog, content versioning, and structured allergen review states.
  - `public.free_recipe_slots` enforcing exactly 3 slots (`CHECK (slot IN (1, 2, 3))`) and unique recipe reference.
  - `public.recipe_collections`, `public.collection_releases`, and `public.collection_recipes` with trigger immutability on sealed/retired releases.
  - `public.access_entitlements` bound to `auth.users`, with active/revoked/expired states and validity timestamps.
  - Indexes on all foreign keys, slugs, and access lookup paths.
- **Row Level Security (RLS) & Access Matrix**:
  - RLS enabled on all exposed tables. Only `SELECT` granted to `anon` and `authenticated` roles; client mutations revoked.
  - Catalog policies permit only published rows.
  - Recipe bodies permit access only when published AND (in `free_recipe_slots` OR active entitlement held by caller).
  - Entitlements permit self-reads only (`auth.uid() = user_id`).
- **Storage Boundaries**:
  - `recipe-previews` bucket (public) for preview imagery.
  - `recipe-protected` bucket (private) with RLS ensuring downloads are permitted only for free published recipes or active buyers.
- **Synthetic Fixtures (`supabase/seed.sql`)**:
  - Synthetic auth identities: Buyer A, Nonbuyer B, Revoked/Expired User C with valid GoTrue credentials and identities.
  - 3 published free recipes occupying slots 1, 2, and 3.
  - 2 paid recipes (Release 1 published, Release 2 retired).
  - 1 draft recipe and 1 withdrawn recipe with sentinel strings in instructions.
  - Active entitlement for Buyer A; revoked and expired grants for User C.
- **Database Access Tests (`supabase/tests/database/01_access_matrix.test.sql`)**:
  - pgTAP suite verifying scenarios S01 through S15 from `VALIDATION.md`.
- **Typed Next.js Data Layer (`my-curated-haven-web/`)**:
  - Generated database types in `src/lib/types/database.ts`.
  - Browser and request-scoped server Supabase clients in `src/lib/supabase/`.
  - Session refresh and claims verification utility in `src/lib/supabase/session.ts`.
  - Typed DTO functions in `src/lib/data/recipes.ts` and access determination in `src/lib/data/access.ts`.
  - Composed session refresh in `src/proxy.ts` preserving deferred routes 404s and production design-review restriction.
  - Playwright integration suite in `tests/e2e/data-access.spec.ts`.
- **Continuous Integration**:
  - Added `backend-quality` job to `.github/workflows/web-ci.yml` running Supabase CLI start, migration replay from scratch, pgTAP access matrix suite, type drift check, and data access integration tests.

## Checks

Local verification run on Node 24.5.0:

| Check | Result |
| --- | --- |
| `supabase db reset` | Passed (clean empty-database replay from scratch) |
| `supabase test db` | 15/15 tests passed (Result: PASS) |
| `supabase gen types typescript --local` | Passed (0 drift against `database.ts`) |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed (Next.js 16 Turbopack production build with proxy) |
| `npm run test:e2e` | 67 tests passed, 17 skipped (other mobile viewports for data tests) |

## Downstream Boundaries & Not Done

- The parenting app production database remains untouched and isolated; no shared database mutation was performed.
- No real customer recipes imported (reserved for Phase 5).
- No public recipe navigation, browsing, or detail pages exposed (reserved for Phase 6).
- No customer authentication or saved recipes UI (reserved for Phase 7).
- No Stripe webhook handlers or real payment-derived grants (reserved for Phase 8).

## Audit 2026-09-25

Audited against `main` at `f6c39cd` and the live project `ccrgvammglkvdlaojgzv`. Full findings: [the audit backlog](../../audit/AUDIT-BACKLOG.md#phase-4-backend-security-and-data-foundation).

### Backup taken first

A logical dump (`schema.sql`, `data.sql`, `roles.sql`) and the deployed Edge Function bundles were saved outside the repository before any change, because they contain personal data. The project is on the free plan with no platform backups (R4-02).

### Changes applied to production

| Item | Change | Verified |
| --- | --- | --- |
| M4-01 | Deleted Edge Functions `chat` (v28) and `generate-tip` (v8). `chat` used the service-role key and trusted a `userId` from the request body, so the public key was enough to read any user's child context. Source stays in `Pratikn07/parenting-app`. The deployed `chat` differed from that repo's `main`; the deployed bundle is kept with the backup | `POST /functions/v1/chat` with the public key → 404. No functions remain |
| R4-01 | Applied `20260924120000_phase4_access_hardening.sql` (PR #19) in one transaction, then `supabase migration repair --status applied` | Anonymous `GET /rest/v1/recipes` → 401 `permission denied` (was 70 full recipes). `search_analytics` → 401. `recipe_catalog`, `recipe_bodies`, `free_recipe_slots` still return the 3 free recipes |
| M4-02, M4-05 | New migration `20260926020339_phase4_audit_storage_and_rpc_hardening.sql`: drops the anonymous upload policy on `recipe-images`, removes client `EXECUTE` on `handle_new_user()` and `increment_shop_click(uuid)` | Storage keeps only read policies. Function ACLs: `postgres`, `service_role` (+ `supabase_auth_admin` for the signup trigger). pgTAP `07_phase4_audit_hardening` 8/8 locally; a real local OTP signup still creates its profile |
| M4-03 | Auth `mailer_otp_exp` 86400 → 3600; email copy "expires in 1 hour" | Read back from the Management API |

After the changes, the security advisor dropped from 16 warnings to 10 (plus 2 expected INFO notes for the now-closed legacy tables). `npm run smoke:production` passed 13/13.

### Backups and upgrade (2026-09-25, later the same evening)

- **R4-02, free backups**: `ops/backup-production.sh`, scheduled daily at 03:30 by launchd. Restore rehearsed into an empty local Supabase stack: 70 recipes, 70 catalog rows (3 published), 70 bodies, 3 free slots, 4 profiles, 4 auth users and 69 public policies restored, and an anonymous caller saw only the 3 free recipes. This satisfies P4-08.7. Procedure and caveats: `ops/README.md`.
- **M4-04, Postgres upgrade**: `17.4.1.074` → `17.6.1.166` in about 9 minutes. Collation version refreshed after reindexing `public` and `private`. Advisor warning `vulnerable_postgres_version` cleared.

### Leftovers closed (2026-09-25)

- **R4-04, leak drill (P4-09.5)**: PR #44 added a policy letting anonymous callers read every recipe body. `backend-quality` failed on S03 and three S13 cases, GitHub reported `BLOCKED`, and the merge was refused. Closed without merging.
- **R4-07, S16**: `tests/data/backend-errors.test.mjs` proves backend failures surface as typed errors. It runs in `web-quality` and `npm run verify`.
- **M4-06**: `20260926031344_phase4_audit_pin_function_search_path.sql`, applied to production. The security advisor is down from 16 warnings to 1.

### Still open

- R4-05 staging rehearsal: Phase 10.
