-- Phase 2: buyers receive approved additions through the access they already hold.
-- A buyer keeps every recipe of the release they hold an entitlement for (unchanged). When their access
-- source for that origin release has an approved additions-v1 policy, they also receive the members of
-- the collection's current published release. No entitlement, order or access-source row is created:
-- access is derived on read. Missing policy evidence means original-only access, never a broader guess.

-- Is this entitlement row currently valid?
CREATE FUNCTION private.entitlement_valid(e public.access_entitlements) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT e.state='active' AND e.revoked_at IS NULL AND e.valid_from<=now() AND (e.expires_at IS NULL OR e.expires_at>now())
$$;

-- additions-v1 when an eligible, in-date access source of the user for this origin release has that approved policy.
CREATE FUNCTION private.collection_release_policy(p_user_id uuid, p_release_id uuid) RETURNS text
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT CASE WHEN EXISTS(
   SELECT 1 FROM private.access_sources s JOIN private.collection_access_policies p
     ON p.release_id=s.release_id AND p.source_kind=s.source_kind
   WHERE s.user_id=p_user_id AND s.release_id=p_release_id AND s.is_eligible
     AND s.valid_from<=now() AND (s.expires_at IS NULL OR s.expires_at>now()) AND p.policy='additions-v1')
  THEN 'additions-v1' ELSE 'original-only' END
$$;

-- The release currently delivered for a collection: its active publication's release, if published or sealed.
CREATE FUNCTION private.collection_delivered_release(p_collection_id uuid) RETURNS uuid
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT r.id FROM private.collection_active_publications a
 JOIN private.collection_publications p ON p.id=a.publication_id
 JOIN public.collection_releases r ON r.id=p.release_id
 WHERE a.collection_id=p_collection_id AND r.state IN ('published','sealed')
$$;

-- The release through which p_user_id may read p_recipe_id (original membership first), or NULL.
CREATE FUNCTION private.recipe_access_release(p_user_id uuid, p_recipe_id uuid) RETURNS uuid
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH held AS (
  SELECT r.id, r.collection_id, r.version FROM public.access_entitlements e
  JOIN public.collection_releases r ON r.id=e.release_id
  WHERE e.user_id=p_user_id AND private.entitlement_valid(e) AND r.state IN ('published','sealed','retired'))
 SELECT coalesce(
  (SELECT h.id FROM held h JOIN public.collection_recipes cr ON cr.release_id=h.id
    WHERE cr.recipe_id=p_recipe_id ORDER BY h.version DESC, h.id LIMIT 1),
  (SELECT d.release_id FROM held h
    CROSS JOIN LATERAL (SELECT private.collection_delivered_release(h.collection_id) release_id) d
    JOIN public.collection_releases dr ON dr.id=d.release_id
    JOIN public.collection_recipes cr ON cr.release_id=d.release_id
    WHERE cr.recipe_id=p_recipe_id AND dr.version>=h.version
      AND private.collection_release_policy(p_user_id, h.id)='additions-v1'
    ORDER BY dr.version DESC LIMIT 1))
$$;

CREATE FUNCTION private.collection_has_access(p_user_id uuid, p_collection_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.access_entitlements e JOIN public.collection_releases r ON r.id=e.release_id
   WHERE e.user_id=p_user_id AND r.collection_id=p_collection_id AND private.entitlement_valid(e))
$$;

-- Trusted server reads (commerce pool only; never granted to browser roles). The user id comes from the
-- server's verified session.

-- One entry per owned collection with exactly the recipes the resolver grants, in delivered order.
CREATE FUNCTION private.user_collection_library(p_user_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 WITH owned AS (
  SELECT r.collection_id, min(e.valid_from) valid_from, max(r.version) held_version
  FROM public.access_entitlements e JOIN public.collection_releases r ON r.id=e.release_id
  WHERE e.user_id=p_user_id AND private.entitlement_valid(e)
  GROUP BY r.collection_id),
 granted AS (
  SELECT o.collection_id, cr.recipe_id,
    min(CASE WHEN cr.release_id=private.collection_delivered_release(o.collection_id) THEN 0 ELSE 1 END*100000 + cr.position) rank
  FROM owned o JOIN public.collection_releases r ON r.collection_id=o.collection_id
  JOIN public.collection_recipes cr ON cr.release_id=r.id
  JOIN public.recipe_catalog c ON c.id=cr.recipe_id AND c.publication_state='published'
  WHERE private.recipe_access_release(p_user_id, cr.recipe_id) IS NOT NULL
  GROUP BY o.collection_id, cr.recipe_id)
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'collectionId',c.id,'slug',c.slug,
   'title',coalesce(p.title,c.title),'summary',coalesce(nullif(p.tagline,''),c.public_summary),
   'releaseVersion',coalesce((SELECT version FROM public.collection_releases WHERE id=private.collection_delivered_release(c.id)),o.held_version),
   'validFrom',o.valid_from,'entitlementState','active',
   'recipes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',rc.id,'slug',rc.slug,'title',rc.title,
       'previewImagePath',rc.preview_image_path,'totalMinutes',rc.total_minutes) ORDER BY g.rank, rc.id)
     FROM granted g JOIN public.recipe_catalog rc ON rc.id=g.recipe_id WHERE g.collection_id=c.id),'[]'::jsonb))
   ORDER BY o.valid_from DESC, c.id),'[]'::jsonb)
 FROM owned o JOIN public.recipe_collections c ON c.id=o.collection_id
 LEFT JOIN public.collection_publication_projection p ON p.collection_id=c.id
$$;

-- Owned when any valid entitlement covers the collection; pending when a checkout for any of its releases
-- is unresolved. Ownership is never inferred from the newest release alone.
CREATE FUNCTION private.collection_customer_state(p_user_id uuid, p_collection_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('ownership',CASE
   WHEN private.collection_has_access(p_user_id,p_collection_id) THEN 'owned'
   WHEN EXISTS(SELECT 1 FROM private.purchase_orders po JOIN public.collection_releases r ON r.id=po.release_id
     WHERE po.user_id=p_user_id AND r.collection_id=p_collection_id
       AND po.attempt_state IN ('creating','creation_unknown','open','processing')) THEN 'pending_payment'
   ELSE 'not_owned' END,
  'releaseId',coalesce(private.collection_delivered_release(p_collection_id),
    (SELECT r.id FROM public.access_entitlements e JOIN public.collection_releases r ON r.id=e.release_id
     WHERE e.user_id=p_user_id AND r.collection_id=p_collection_id AND private.entitlement_valid(e)
     ORDER BY r.version DESC LIMIT 1)))
$$;

-- Policy helpers for RLS. They read the caller from auth.uid() and never accept a user id, so they only
-- ever answer about the signed-in person.
CREATE FUNCTION public.is_recipe_entitled(p_recipe_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND private.recipe_access_release(auth.uid(), p_recipe_id) IS NOT NULL
$$;

CREATE FUNCTION public.owns_collection(p_collection_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND private.collection_has_access(auth.uid(), p_collection_id)
$$;

-- Effective access for the signed-in user. Uncached by design: callers must not store the answer
-- in a shared cache.
CREATE FUNCTION public.recipe_effective_access(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE published boolean; free boolean; via uuid;
BEGIN
 SELECT publication_state='published' INTO published FROM public.recipe_catalog WHERE id=p_recipe_id;
 IF NOT coalesce(published,false) THEN RETURN jsonb_build_object('type','denied','releaseId',null); END IF;
 SELECT EXISTS(SELECT 1 FROM public.free_recipe_slots WHERE recipe_id=p_recipe_id) INTO free;
 IF free THEN RETURN jsonb_build_object('type','free','releaseId',null); END IF;
 IF auth.uid() IS NULL THEN RETURN jsonb_build_object('type','denied','releaseId',null); END IF;
 via := private.recipe_access_release(auth.uid(), p_recipe_id);
 RETURN jsonb_build_object('type',CASE WHEN via IS NULL THEN 'denied' ELSE 'entitled' END,'releaseId',via);
END $$;

CREATE FUNCTION public.collection_effective_access(p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid := auth.uid(); origin uuid[]; delivered uuid; policy text := NULL; recipes jsonb;
BEGIN
 IF uid IS NULL OR NOT private.collection_has_access(uid, p_collection_id) THEN
  RETURN jsonb_build_object('collectionId',p_collection_id,'owned',false,'policy',null,'deliveredReleaseId',null,'recipeIds','[]'::jsonb);
 END IF;
 SELECT array_agg(r.id ORDER BY r.version) INTO origin FROM public.access_entitlements e
  JOIN public.collection_releases r ON r.id=e.release_id
  WHERE e.user_id=uid AND r.collection_id=p_collection_id AND private.entitlement_valid(e);
 policy := CASE WHEN EXISTS(SELECT 1 FROM unnest(origin) o WHERE private.collection_release_policy(uid,o)='additions-v1')
   THEN 'additions-v1' ELSE 'original-only' END;
 delivered := private.collection_delivered_release(p_collection_id);
 SELECT coalesce(jsonb_agg(DISTINCT cr.recipe_id),'[]'::jsonb) INTO recipes
 FROM public.collection_recipes cr JOIN public.recipe_catalog c ON c.id=cr.recipe_id
 WHERE c.publication_state='published' AND private.recipe_access_release(uid, cr.recipe_id) IS NOT NULL
   AND (cr.release_id=ANY(origin) OR cr.release_id=delivered);
 RETURN jsonb_build_object('collectionId',p_collection_id,'owned',true,'policy',policy,
  'deliveredReleaseId',CASE WHEN policy='additions-v1' THEN delivered ELSE origin[array_length(origin,1)] END,'recipeIds',recipes);
END $$;

-- Recipe bodies and protected files use the one resolver. Free, admin and console-staff reads are unchanged.
DROP POLICY "Read authorized recipe bodies" ON public.recipe_bodies;
CREATE POLICY "Read authorized recipe bodies" ON public.recipe_bodies FOR SELECT TO anon, authenticated USING (
 EXISTS(SELECT 1 FROM public.recipe_catalog rc WHERE rc.id=recipe_bodies.recipe_id AND rc.publication_state='published')
 AND (EXISTS(SELECT 1 FROM public.free_recipe_slots frs WHERE frs.recipe_id=recipe_bodies.recipe_id)
   OR (SELECT public.is_recipe_entitled(recipe_bodies.recipe_id))));

DROP POLICY "Authorized read protected recipe files" ON storage.objects;
CREATE POLICY "Authorized read protected recipe files" ON storage.objects FOR SELECT TO anon, authenticated USING (
 bucket_id='recipe-protected' AND (
  EXISTS(SELECT 1 FROM public.free_recipe_slots frs JOIN public.recipe_catalog rc ON rc.id=frs.recipe_id
    WHERE rc.publication_state='published' AND objects.name LIKE frs.recipe_id::text||'/%')
  OR (auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.recipe_catalog rc
    WHERE rc.id::text=split_part(objects.name,'/',1) AND rc.publication_state='published'
      AND public.is_recipe_entitled(rc.id)))));

-- Buyers keep reading collections they own after they are unlisted or retired.
DROP POLICY collection_projection_listed ON public.collection_publication_projection;
CREATE POLICY collection_projection_listed_or_owned ON public.collection_publication_projection
 FOR SELECT TO anon, authenticated USING (listing_state='listed' OR (SELECT public.owns_collection(collection_id)));

REVOKE ALL ON FUNCTION private.user_collection_library(uuid), private.collection_customer_state(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.entitlement_valid(public.access_entitlements), private.collection_release_policy(uuid,uuid),
 private.collection_delivered_release(uuid), private.recipe_access_release(uuid,uuid), private.collection_has_access(uuid,uuid)
 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_recipe_entitled(uuid), public.owns_collection(uuid), public.recipe_effective_access(uuid),
 public.collection_effective_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_recipe_entitled(uuid), public.owns_collection(uuid), public.recipe_effective_access(uuid),
 public.collection_effective_access(uuid) TO anon, authenticated;
