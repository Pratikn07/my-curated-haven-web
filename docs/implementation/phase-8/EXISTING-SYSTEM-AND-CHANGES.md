# Existing system and required changes

## Source evidence

Refreshed baseline: `dae5aed5024d29d2e0e4edebeab7e4ab9582e737`. Findings below concern inspected source. Verify effective hosted schema, grants, buckets, deployment settings and native usage before changes.

| Existing source | Reuse | Required Phase 8 work |
| --- | --- | --- |
| `supabase/migrations/20260923042735_phase4_schema.sql` | Catalog, bodies, free slots, collections, releases, membership and entitlements | Harden saleable-release immutability, grant projection, deletion behaviour and full access matrix |
| `public.access_entitlements` | Unique `(user_id, release_id)`, active/revoked/expired states | Derive access from all valid purchase and legacy grant sources, add private provenance |
| `public.collection_releases` | `draft`, `published`, `sealed`, `retired`, plus `sealed_at` | Freeze membership before sale, prevent reopening and parent deletion bypass |
| `public.check_release_sealed_mutation()` | Existing membership guard intent | Check both OLD and NEW release IDs on updates, lock against concurrent publication, cover parent transitions |
| `supabase/migrations/20260923053000_phase5_recipe_ingestion.sql` | Existing recipe IDs and mapped content | Select/review the paid manifest without rerunning a broad overwrite |
| `src/lib/data/recipes.ts` | Caller-scoped body query and safe catalog DTO | Runtime content validation and sanitised errors, preserve RLS for full bodies |
| `src/lib/data/access.ts` | Existing access-result boundary | Add `unavailable` result, propagate failures rather than treating them as no ownership |
| `src/lib/supabase/server.ts` | Request-scoped server client | Validate hosted configuration, no local fallback in production, compose Phase 7 session handling |
| `recipe-previews` / `recipe-protected` buckets | Public preview images and private paid assets | Inventory actual files, audit alternate public URLs and issue only short-lived protected links |
| Legacy `public.recipes` and old migrations | Canonical recipe identity/native compatibility | Close alternate body-reading paths before charging for protected content |
| Phase 6 recipe pages, `PrintButton` and print CSS | Existing reading, filters, responsive layout and printing | Adapt denied bodies from the current 404 to safe collection previews, keep full recipe JSON-LD limited to genuinely public free recipes |
| Phase 9 package | Measurement names, consent boundaries and ledger requirements | Supply authoritative business transitions, not browser purchase claims |

App paths in this table are relative to `my-curated-haven-web/`.

## Priority gaps

**G01: published release mutation.** The existing trigger blocks membership edits only for `sealed` and `retired` states. A saleable `published` release is still mutable. The trigger selects `COALESCE(OLD.release_id, NEW.release_id)`, which does not inspect both sides of a move. A row moved from draft into a frozen release requires explicit protection.

Adopt `sealed_at` as a permanent membership-freeze marker. Saleable releases are `published` with non-null `sealed_at`. Freeze membership, verify the manifest and publish atomically. Reject removal of the marker, return to draft, changes to collection/version, parent deletion and cascades affecting a sold release. Lock the release during membership edits/publication. Preserve `sealed` for legacy nonpublic frozen releases if needed, with documented transitions. New sales require the chosen public saleable state, not every frozen state.

**G02: legacy paywall bypass.** The migration `20251212000000_create_saved_recipes.sql` includes a `public.recipes` SELECT policy using `USING (true)`. The legacy table contains full content. New-table RLS does not protect an independent old table. Audit grants, subsequent policies, RPCs, GraphQL, storage and source exports. Preserve native source IDs and saved-recipe references while defining the authorised native read contract. Do not deploy paid copy while the same protected body remains publicly readable through an overlooked API.

**G03: access errors resemble no purchase.** `checkRecipeAccess()` maps catalog errors to `not_found` and ignores some later query errors. Implement a distinct unavailable state. Suppress new checkout when ownership cannot be verified. Otherwise a database outage risks asking an owner to pay twice.

**G04: incomplete ownership provenance.** The current entitlement row does not explain whether access comes from a Stripe order, native purchase or approved support grant. A single old refund must not revoke access supported by another valid source. Inventory and backfill provenance before allowing payment workers to update existing grants.

**G05: content-review assumptions.** The Phase 5 ingestion defaults missing servings to `2 servings` and derives allergen review state from the source array. Recheck proposed paid recipes against editorial records. Missing yield or an empty array is not independent review evidence. The migration publishes three selected free rows and leaves others draft. Do not bulk publish the remainder as a payment shortcut.

**G06: destructive cascades.** Existing collection/release and recipe foreign keys use cascade deletion, as does entitlement ownership. A financial order must survive account deletion and remain auditable. Restrict deletion of sold releases and referenced commercial snapshots. Coordinate account closure with Phase 7, preserve the required financial record with a nullable current auth link, and remove access.

**G07: exactly three free recipes.** A slot constraint restricted to 1, 2 and 3 enforces a maximum, not an exact count. The launch validator must assert all three slots resolve to distinct, published, complete recipes and anonymous read/print succeeds.

**G08: backend configuration and broad grants.** Verify hosted env validation, schema privileges and existing blanket revocations before adding commerce. Do not re-grant all public tables to repair a native or saved-recipe regression. Apply narrow forward migrations and test unrelated existing native write paths.

## Content manifest

The approved manifest records release UUID, collection UUID/version, ordered recipe UUIDs, content versions reviewed, public titles, free/paid overlap, review owner/date and a checksum. The checksum is an audit aid, not the only access control.

Keep source UUIDs from the parenting app. Store an immutable manifest snapshot at sale release, with per-order reference and commercial snapshot. Freeze collection membership. Recipe body corrections follow a separate reviewed revision history. Do not promise immutable historical recipe text unless a versioned-delivery design is explicitly added.

Test the exact free selections recorded in Phase 5 against the target environment. Source documentation alone does not prove the deployed slots match.

## Native continuity

Inventory existing subscription/store entitlements before asserting every native user must purchase again. Map verified native rights into the same private access-source model. Preserve original user UUIDs, recipe IDs and saved recipe references. Email equality is insufficient for merging accounts or transferring purchases.

If native compatibility and secure paid web access conflict, pause new paid publication while choosing a compatible API contract. Do not silently keep a public legacy bypass or revoke established customer rights.

## Phase 6 integration update

PR #14 added the free recipe experience while this plan was being prepared. Reuse `src/app/recipes/page.tsx`, `src/app/recipes/[slug]/page.tsx`, `src/components/recipe/PrintButton.tsx` and `src/styles/recipe-print.css`. The current detail route treats `access_denied` as not found and emits full recipe structured data for readable bodies. Phase 8 needs explicit safe preview/owned states and a free-only full-body structured-data rule. Request-scoped React memoization is different from a shared response cache. Test both independently before paid publication. Phase 6 evidence records a product project reference, but implementation must still verify the intended hosted target and effective access.
