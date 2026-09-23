# Data contracts and ownership

## Model boundary

This is a proposed minimum schema, subject to the selected project's inventory. Names do not imply these tables already exist.

Separate publicly safe catalog data from full recipe bodies. Keep drafts, editorial provenance, payment identifiers and audit details outside the exposed API schema.

Use UUID identities, timezone-aware timestamps, explicit foreign keys and constrained state values. Do not use titles, slugs or email addresses as ownership keys.

## Proposed relations

| Relation | Minimum fields | Ownership and lifecycle |
| --- | --- | --- |
| public.recipe_catalog | id, slug, title, public_summary, preview_image_path, total_minutes nullable, public meal/diet labels, publication_state, published_at, updated_at | Editorial writer only. Public rows require published state |
| public.recipe_bodies | recipe_id primary/foreign key, content_version, ingredients, instructions, yield, reviewed notes, allergen_review_state, allergens nullable, updated_at | Full approved reading payload, protected by recipe access rules |
| public.free_recipe_slots | slot 1..3 primary key, recipe_id unique foreign key | Trusted publication operation only |
| public.recipe_collections | id, slug unique, title, public_summary, listing_state | Public merchandising metadata, no payment credentials |
| public.collection_releases | id, collection_id, version, state, sealed_at | A published release defines a frozen recipe membership |
| public.collection_recipes | release_id, recipe_id, position | Composite membership key, unique position per release |
| public.access_entitlements | id, user_id, release_id, state, valid_from, expires_at nullable, revoked_at nullable | Self-readable, trusted-server writes only |
| private.recipe_drafts | draft/revision identity, recipe_id, proposed content, reviewer status | Editorial staging, no public grants |
| private.access_events | event identity, actor/system, entitlement target, event type, timestamp, source reference | Restricted audit trail, no raw payment payloads required in Phase 4 |

Do not create public profile, child or chat tables merely to support these relations. Use auth.users as the future account identity authority. Saved-recipe persistence is Phase 7 work.

## Catalog and body separation

Catalog fields must be intentionally safe for all visitors. Ingredient lists, full methods, protected tips and paid printable files do not belong in catalog rows.

Use explicit DTO field lists. Never fetch a paid body with a privileged credential and remove the text afterward. Do not serialize protected fields into React props, search indexes, JSON-LD, prefetch payloads, errors or logs.

recipe_bodies holds the current approved revision only. Keep drafts and revision history private. An unpublished recipe is unreadable through the public recipe APIs, even by a customer with collection access, until a reviewed publication state permits access again.

A published correction to an existing recipe identity is distinct from adding a new recipe to a purchased collection. Phase 5 defines editorial revision handling and communication.

## Three free recipes

free_recipe_slots is the single source of free access. Do not maintain an independent is_free flag which drifts from slot membership.

Enforce slot values 1, 2 or 3, a unique recipe per slot and valid recipe references. These constraints enforce a maximum of three. The launch gate verifies exactly three distinct, reviewed, published recipes with valid bodies.

Use one transactional publication operation to select or replace the three recipes. Serialize competing publication updates and verify the postcondition before commit. Do not publish a half-updated free selection.

Changing free access has content and cache consequences. Purge public recipe caches before making previously free content paid. Previously downloaded or indexed public content cannot be made secret retroactively.

During Phase 4, use clearly synthetic recipes. Real recipe selection belongs to Phase 5.

## Collection releases and future additions

A collection identifies the product. A release identifies the exact set of recipe identities covered by a grant.

Freeze membership once a release is published/sealed. Enforce immutability in the trusted publication path and database constraints/triggers as needed. Do not let an ordinary update expand historical access silently.

New recipes go into a new release. Whether existing buyers receive access to that release is an owner decision and later entitlement action. No automatic “all future additions” policy is implied.

Retiring a collection from sale does not revoke existing grants. Public catalog policies show only listed releases, while an owner also reads the release and membership attached to their grant. Draft releases have no customer grants.

Removing an unsafe or withdrawn recipe is a separate editorial availability action and needs a customer/support response later. Do not promise permanent availability before access terms are decided.

## Entitlement contract

A grant belongs to a verified auth.users UUID and a collection release UUID. Recommended uniqueness: one current entitlement per user/release, with lifecycle history in private.access_events.

Access requires active state, valid_from at or before database time, no revocation, and either no expiry or a future expiry. Nullable expiry is a schema capability, not a lifetime-access promise.

Customers cannot insert, update, delete or transfer grants. Do not accept user_id, release_id or active state from browser payment claims as authority.

Phase 4 seeds grants only for synthetic test users through a restricted fixture path. Phase 8 owns signature-verified payment events, provider idempotency, refund/dispute handling and account linking. No public purchase writer is introduced now.

Keep provider event IDs and financial records in a restricted later payment ledger. Do not expose those fields in customer-readable entitlement rows. Account deletion and financial retention need separate decisions before real sales.

## Recipe content shape

Phase 4 supplies a versioned transport contract. Phase 5 finalizes editorial fields and validation.

| Field | Rule |
| --- | --- |
| Ingredients | Ordered items preserving quantity, unit and ingredient text. No lossy numeric conversion |
| Instructions | Ordered steps with nonempty text |
| Total time | Positive known value or null. Do not replace unknown with zero |
| Yield | Original reviewed text plus structured amount/unit only when supplied |
| Allergens | Unknown, reviewed list, or explicitly reviewed no-listed-allergens state. Empty data alone is not a safety claim |
| Dietary labels | Reviewed facts, never inferred solely from missing ingredients |
| Storage/reheating notes | Optional reviewed text, not generated defaults |
| Images | Approved object path and dimensions, no persisted signed URL |
| Publication | Draft, published, withdrawn or equivalent constrained states |
| Content version | Explicit schema/content version for validation and migrations |

Reject malformed content at the import boundary. Keep unknown values intact during mapping from native rows.

## Constraints and indexes

- Unique normalized slugs for public routes.
- Foreign keys from bodies and slots to catalog.
- Unique collection version per collection.
- Composite membership key and release-position uniqueness.
- Index membership by recipe_id for entitlement access checks.
- Index entitlements by user_id and release_id, with the uniqueness constraint covering that lookup.
- Index collection foreign keys and catalog queries based on actual pagination/filter patterns.
- Require valid time ranges for grants.
- Cascade dependent presentation content only where deletion is intentional.
- Prefer soft withdrawal to deleting published recipes with historical grants.

Postgres does not automatically add indexes on referencing foreign-key columns. Check existing index coverage before adding duplicates. Use query plans on representative synthetic data, not timing alone on five rows.

## Editorial writes

Use one documented trusted publishing process. No public admin UI or client-side “admin” flag is needed in this phase.

The writer validates the content, records actor/provenance, updates catalog and body atomically, and invalidates affected public caches. Grant only the required operations to that writer where the platform supports a scoped role.

Do not expose a service key in a browser-based editor.

## Future compatibility

Reuse native recipe IDs only after confirming type and uniqueness. Preserve a private legacy-to-new ID mapping during later imports. Do not overwrite the native recipes table or mutate its policies without a compatibility review.

The new schema must support web access without silently changing the native app's existing users, stored favourites or purchase model.
