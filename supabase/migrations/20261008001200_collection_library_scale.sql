-- Phase 2 scale fixes found by scripts/admin-collections-concurrency.mjs --scenario scale.
--
-- The buyer library evaluated the per-recipe access resolver once for every member row of every release of
-- every owned collection (about 25,000 calls and 3.4 s at 12 collections of up to 200 members x 100 releases).
-- It now works on sets: the releases the buyer holds, plus each collection's delivered release when an
-- additions policy reaches it, then their members. A recipe is listed under a collection only when that
-- collection delivers it; before, a recipe the buyer could open through a different collection also appeared
-- under every owned collection that had ever contained it.
CREATE OR REPLACE FUNCTION private.user_collection_library(p_user_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH held AS (
  SELECT r.id, r.collection_id, r.version, e.valid_from FROM public.access_entitlements e
  JOIN public.collection_releases r ON r.id=e.release_id
  WHERE e.user_id=p_user_id AND private.entitlement_valid(e) AND r.state IN ('published','sealed','retired')),
 owned AS (
  SELECT collection_id, min(valid_from) valid_from, max(version) held_version FROM held GROUP BY collection_id),
 delivered AS (
  SELECT o.collection_id, d.id release_id, d.version FROM owned o
  JOIN public.collection_releases d ON d.id=private.collection_delivered_release(o.collection_id)),
 reachable AS (
  SELECT h.collection_id, h.id release_id FROM held h
  UNION
  SELECT d.collection_id, d.release_id FROM delivered d
  WHERE EXISTS (SELECT 1 FROM held h WHERE h.collection_id=d.collection_id AND d.version>=h.version
    AND private.collection_release_policy(p_user_id, h.id)='additions-v1')),
 granted AS (
  SELECT x.collection_id, cr.recipe_id,
    min(CASE WHEN cr.release_id=d.release_id THEN 0 ELSE 1 END*100000 + cr.position) rank
  FROM reachable x JOIN public.collection_recipes cr ON cr.release_id=x.release_id
  JOIN public.recipe_catalog c ON c.id=cr.recipe_id AND c.publication_state='published'
  LEFT JOIN delivered d ON d.collection_id=x.collection_id
  GROUP BY x.collection_id, cr.recipe_id)
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'collectionId',c.id,'slug',c.slug,
   'title',coalesce(p.title,c.title),'summary',coalesce(nullif(p.tagline,''),c.public_summary),
   'releaseVersion',coalesce((SELECT version FROM delivered d WHERE d.collection_id=c.id),o.held_version),
   'validFrom',o.valid_from,'entitlementState','active',
   'recipes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',rc.id,'slug',rc.slug,'title',rc.title,
       'previewImagePath',rc.preview_image_path,'totalMinutes',rc.total_minutes) ORDER BY g.rank, rc.id)
     FROM granted g JOIN public.recipe_catalog rc ON rc.id=g.recipe_id WHERE g.collection_id=c.id),'[]'::jsonb))
   ORDER BY o.valid_from DESC, c.id),'[]'::jsonb)
 FROM owned o JOIN public.recipe_collections c ON c.id=o.collection_id
 LEFT JOIN public.collection_publication_projection p ON p.collection_id=c.id
$$;

-- Protected members read each committed release's members through the release index instead of hashing the
-- whole membership table (one full scan per impact evaluation before).
CREATE OR REPLACE FUNCTION private.collection_protected_members(p_collection_id uuid) RETURNS TABLE(recipe_id uuid)
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH committed AS (
  SELECT r.id FROM public.collection_releases r
  WHERE r.collection_id=p_collection_id AND (
   r.state IN ('sealed','retired')
   OR EXISTS(SELECT 1 FROM private.purchase_orders po JOIN private.commercial_offers o ON o.id=po.offer_id
     WHERE po.release_id=r.id AND o.provider_mode='live' AND (
       po.attempt_state IN ('creating','creation_unknown','open','processing','review')
       OR EXISTS(SELECT 1 FROM private.provider_payments p WHERE p.order_id=po.id AND p.provider_mode='live')))
   OR EXISTS(SELECT 1 FROM private.commercial_offers o WHERE o.release_id=r.id AND o.sale_enabled AND o.provider_mode='live')
   OR EXISTS(SELECT 1 FROM private.access_sources s WHERE s.release_id=r.id AND (
     s.source_kind IN ('native_legacy','support_grant','promotional')
     OR NOT EXISTS(SELECT 1 FROM private.purchase_orders po JOIN private.commercial_offers o ON o.id=po.offer_id
       WHERE po.id::text=s.source_id AND o.provider_mode='test')))
   OR EXISTS(SELECT 1 FROM public.access_entitlements e WHERE e.release_id=r.id
     AND NOT EXISTS(SELECT 1 FROM private.access_sources s WHERE s.release_id=e.release_id AND s.user_id=e.user_id))))
 SELECT DISTINCT x.recipe_id FROM public.collection_recipes x WHERE x.release_id = ANY(ARRAY(SELECT id FROM committed))
 UNION
 SELECT DISTINCT unnest(m.member_recipe_ids) FROM private.release_manifests m JOIN committed c ON c.id=m.release_id
$$;

-- Offers are read by release (checkout, impact, publication) and publications by collection (receipts, history).
CREATE INDEX IF NOT EXISTS idx_commercial_offers_release_id ON private.commercial_offers(release_id);
CREATE INDEX IF NOT EXISTS idx_collection_publications_collection_id ON private.collection_publications(collection_id);

-- Every writer that takes collection locks gives up after 5 s with a retryable 55P03 instead of waiting
-- indefinitely. Browser commands already get this through their authority check; the checkout reservation
-- (called by the server) and the operator procedures (no browser check) set it on the function.
ALTER FUNCTION private.reserve_collection_order(uuid,uuid,jsonb,text) SET lock_timeout = '5s';
ALTER FUNCTION private.collection_operator_prepare(jsonb) SET lock_timeout = '5s';
ALTER FUNCTION private.collection_operator_attest(jsonb) SET lock_timeout = '5s';
ALTER FUNCTION private.collection_operator_publish(uuid,uuid) SET lock_timeout = '5s';
ALTER FUNCTION private.recipe_operator_correct(uuid,uuid) SET lock_timeout = '5s';
