-- Admin recipe reads: snapshot, readiness evaluator and list/detail/history/usage RPCs.
-- At Increment A, working revisions and new-workflow reviews are closed: working is null,
-- review comes from legacy evidence only, awaitingReview is false.

CREATE OR REPLACE FUNCTION private.admin_snapshot(p_recipe_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'recipeId', c.id,
    'slug', c.slug,
    'catalog', jsonb_build_object(
      'title', c.title,
      'publicSummary', c.public_summary,
      'totalMinutes', c.total_minutes,
      'mealLabels', coalesce(c.meal_labels, '{}'),
      'dietLabels', coalesce(c.diet_labels, '{}')
    ),
    'body', CASE WHEN b.recipe_id IS NULL THEN NULL ELSE jsonb_build_object(
      'ingredients', coalesce(b.ingredients, '[]'::jsonb),
      'instructions', coalesce(b.instructions, '[]'::jsonb),
      'yield', b.yield,
      'yieldStructured', b.yield_structured,
      'reviewedNotes', b.reviewed_notes,
      'allergenReviewState', b.allergen_review_state,
      'allergens', b.allergens,
      'storageNotes', b.storage_notes
    ) END,
    'image', jsonb_build_object(
      'path', c.preview_image_path,
      'alt', NULL::text,
      'description', NULL::text,
      'objectId', NULL::text,
      'objectVersion', NULL::text
    )
  )
  FROM public.recipe_catalog c
  LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
  WHERE c.id = p_recipe_id
$$;

CREATE OR REPLACE FUNCTION private.admin_recipe_status(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  snap jsonb;
  pub text;
  has_body boolean;
  has_image boolean;
  legacy_ok boolean;
  review_state text;
  checks jsonb := '[]'::jsonb;
  needs_attention boolean;
  ready boolean;
BEGIN
  SELECT c.publication_state INTO pub FROM public.recipe_catalog c WHERE c.id = p_recipe_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  snap := private.admin_snapshot(p_recipe_id);
  has_body := (snap->'body') IS NOT NULL AND (snap->'body') <> 'null'::jsonb;
  has_image := nullif(snap#>>'{image,path}', '') IS NOT NULL;
  BEGIN
    SELECT private.recipe_is_reviewed(p_recipe_id) INTO legacy_ok;
  EXCEPTION WHEN OTHERS THEN
    legacy_ok := false;
  END;
  review_state := CASE WHEN legacy_ok THEN 'approved' ELSE 'unreviewed' END;
  IF NOT has_body THEN
    checks := checks || jsonb_build_object('code', 'missing-body', 'scope', 'body',
      'state', 'fail', 'severity', 'blocker',
      'explanation', 'Recipe body is missing', 'origin', 'validation');
  END IF;
  IF NOT has_image THEN
    checks := checks || jsonb_build_object('code', 'missing-image', 'scope', 'image',
      'state', 'fail', 'severity', 'blocker',
      'explanation', 'Preview image is missing', 'origin', 'validation');
  END IF;
  IF NOT legacy_ok THEN
    checks := checks || jsonb_build_object('code', 'legacy-review', 'scope', 'review',
      'state', 'fail', 'severity', 'blocker',
      'explanation', 'No passing legacy review for the current version', 'origin', 'source');
  END IF;
  needs_attention := (NOT has_body) OR (NOT has_image) OR (NOT legacy_ok);
  ready := has_body AND has_image AND legacy_ok AND pub = 'draft';
  RETURN jsonb_build_object(
    'targetDigest', encode(extensions.digest(convert_to(snap::text, 'UTF8'), 'sha256'), 'hex'),
    'review', review_state,
    'checks', checks,
    'needsAttention', needs_attention,
    'awaitingReview', false,
    'readyToPublish', ready,
    'needsVerification', false,
    'evaluatedAt', now()
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_recipe_list(p_query jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  q text := coalesce(nullif(trim(p_query->>'q'), ''), '');
  collections text[] := coalesce(
    (SELECT array_agg(x) FROM jsonb_array_elements_text(coalesce(p_query->'collections', '[]'::jsonb)) x), '{}');
  pubs text[] := coalesce(
    (SELECT array_agg(x) FROM jsonb_array_elements_text(coalesce(p_query->'publication', '[]'::jsonb)) x), '{}');
  revs text[] := coalesce(
    (SELECT array_agg(x) FROM jsonb_array_elements_text(coalesce(p_query->'review', '[]'::jsonb)) x), '{}');
  view text := coalesce(p_query->>'view', 'all');
  page int := coalesce(nullif(p_query->>'page', '')::int, 1);
  page_size int := 25;
  offset_n int;
  q_uuid uuid;
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  IF view NOT IN ('all', 'attention', 'awaiting_review', 'ready', 'published', 'withdrawn') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF page < 1 OR page > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(pubs) p WHERE p NOT IN ('draft', 'published', 'withdrawn')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(revs) r WHERE r NOT IN ('unreviewed', 'submitted', 'approved', 'changes_requested', 'rejected')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  offset_n := (page - 1) * page_size;
  BEGIN
    q_uuid := q::uuid;
  EXCEPTION WHEN OTHERS THEN
    q_uuid := NULL;
  END;
  RETURN (
    WITH catalog_status AS MATERIALIZED (
      SELECT c.id, c.slug, c.title, c.publication_state, c.updated_at,
        greatest(c.updated_at, coalesce(b.updated_at, c.updated_at)) AS changed_at,
        (private.admin_recipe_status(c.id)->>'needsAttention')::boolean AS needs_attention,
        (private.admin_recipe_status(c.id)->>'awaitingReview')::boolean AS awaiting_review,
        (private.admin_recipe_status(c.id)->>'readyToPublish')::boolean AS ready_to_publish,
        private.admin_recipe_status(c.id)->>'review' AS review_state,
        private.admin_snapshot(c.id) AS snapshot,
        private.admin_recipe_status(c.id) AS readiness
      FROM public.recipe_catalog c
      LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
    ),
    filtered AS (
      SELECT s.* FROM catalog_status s
      WHERE (q = '' OR strpos(lower(s.title), lower(q)) > 0 OR strpos(lower(s.slug), lower(q)) > 0 OR s.id = q_uuid OR s.slug = q)
        AND (cardinality(pubs) = 0 OR s.publication_state = ANY (pubs))
        AND (cardinality(revs) = 0 OR s.review_state = ANY (revs))
        AND (cardinality(collections) = 0 OR EXISTS (
          SELECT 1 FROM public.collection_recipes cr
          JOIN public.collection_releases rel ON rel.id = cr.release_id
          JOIN public.recipe_collections col ON col.id = rel.collection_id
          WHERE cr.recipe_id = s.id AND col.slug = ANY (collections)))
        AND (view = 'all'
          OR (view = 'attention' AND s.needs_attention)
          OR (view = 'awaiting_review' AND s.awaiting_review)
          OR (view = 'ready' AND s.ready_to_publish)
          OR (view = 'published' AND s.publication_state = 'published')
          OR (view = 'withdrawn' AND s.publication_state = 'withdrawn'))
    ),
    summary AS (
      SELECT
        count(*)::int AS all_n,
        count(*) FILTER (WHERE needs_attention)::int AS attention_n,
        count(*) FILTER (WHERE awaiting_review)::int AS awaiting_n,
        count(*) FILTER (WHERE ready_to_publish)::int AS ready_n,
        count(*) FILTER (WHERE publication_state = 'published')::int AS published_n,
        count(*) FILTER (WHERE publication_state = 'withdrawn')::int AS withdrawn_n
      FROM catalog_status
    )
    SELECT jsonb_build_object(
      'rows', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', f.id, 'slug', f.slug, 'title', f.title,
        'imagePath', f.snapshot#>>'{image,path}',
        'publication', f.publication_state,
        'readiness', f.readiness,
        'collections', coalesce((SELECT jsonb_agg(jsonb_build_object('id', col.id, 'title', col.title))
          FROM public.collection_recipes cr
          JOIN public.collection_releases rel ON rel.id = cr.release_id
          JOIN public.recipe_collections col ON col.id = rel.collection_id
          WHERE cr.recipe_id = f.id), '[]'::jsonb),
        'changedAt', f.changed_at
      ) ORDER BY changed_at DESC, id ASC)
      FROM (SELECT * FROM filtered ORDER BY changed_at DESC, id ASC LIMIT page_size OFFSET offset_n) f), '[]'::jsonb),
      'filteredTotal', (SELECT count(*)::int FROM filtered),
      'summary', (SELECT jsonb_build_object('all', all_n, 'attention', attention_n,
        'awaiting_review', awaiting_n, 'ready', ready_n, 'published', published_n, 'withdrawn', withdrawn_n)
        FROM summary),
      'query', jsonb_build_object('q', q, 'collections', to_jsonb(collections),
        'publication', to_jsonb(pubs), 'review', to_jsonb(revs), 'view', view, 'page', page, 'pageSize', page_size),
      'sourceRevision', 'admin-reads-v1',
      'checkedAt', now(),
      'dependencyChecks', '[]'::jsonb
    )
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_recipe_detail(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  snap jsonb;
  pub text;
  ver int;
  hsh text;
  readiness jsonb;
  usage jsonb;
  legacy jsonb;
  hist jsonb;
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  SELECT c.publication_state INTO pub FROM public.recipe_catalog c WHERE c.id = p_recipe_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  snap := private.admin_snapshot(p_recipe_id);
  readiness := private.admin_recipe_status(p_recipe_id);
  SELECT b.content_version INTO ver FROM public.recipe_bodies b WHERE b.recipe_id = p_recipe_id;
  hsh := readiness->>'targetDigest';
  usage := public.admin_recipe_usage(p_recipe_id);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'contentVersion', r.content_version,
    'reviewerKind', r.reviewer_kind, 'reviewer', r.reviewer, 'verdict', r.verdict,
    'openBlockers', r.open_blockers, 'reviewedAt', r.reviewed_at)
    ORDER BY r.reviewed_at DESC, r.id DESC), '[]'::jsonb)
    INTO legacy FROM private.recipe_reviews r WHERE r.recipe_id = p_recipe_id;
  SELECT jsonb_build_object('events', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id', a.id, 'actorId', a.actor_id, 'action', a.action, 'recipeId', a.recipe_id,
    'revisionId', a.revision_id, 'digest', a.digest, 'beforeRef', a.before_ref,
    'afterRef', a.after_ref, 'requestId', a.request_id, 'at', a.at,
    'reason', a.reason, 'result', a.result) ORDER BY a.at DESC, a.id DESC)
    FROM private.admin_audit a WHERE a.recipe_id = p_recipe_id LIMIT 25), '[]'::jsonb),
    'nextCursor', NULL) INTO hist;
  RETURN jsonb_build_object(
    'active', snap,
    'publication', pub,
    'contentVersion', ver,
    'activeHash', hsh,
    'working', NULL,
    'readiness', readiness,
    'usage', jsonb_build_object('ok', true, 'value', usage),
    'legacyReviews', legacy,
    'history', hist,
    'checkedAt', now()
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_recipe_history(p_recipe_id uuid, p_cursor text DEFAULT NULL, p_limit int DEFAULT 25) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  lim int := least(greatest(coalesce(p_limit, 25), 1), 100);
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  IF NOT EXISTS (SELECT 1 FROM public.recipe_catalog WHERE id = p_recipe_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  RETURN (
    SELECT jsonb_build_object('events', coalesce(jsonb_agg(s.e ORDER BY s.at DESC, s.id DESC), '[]'::jsonb),
      'nextCursor', NULL)
    FROM (SELECT jsonb_build_object('id', a.id, 'actorId', a.actor_id, 'action', a.action,
        'recipeId', a.recipe_id, 'revisionId', a.revision_id, 'digest', a.digest,
        'beforeRef', a.before_ref, 'afterRef', a.after_ref, 'requestId', a.request_id,
        'at', a.at, 'reason', a.reason, 'result', a.result) AS e,
        a.at, a.id
      FROM private.admin_audit a
      WHERE a.recipe_id = p_recipe_id
        AND (p_cursor IS NULL OR (a.at, a.id) < ((p_cursor::timestamptz), '00000000-0000-0000-0000-000000000000'::uuid))
      ORDER BY a.at DESC, a.id DESC LIMIT lim) s(e, at, id)
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_recipe_usage(p_recipe_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  slots int[];
  rels jsonb;
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  IF NOT EXISTS (SELECT 1 FROM public.recipe_catalog WHERE id = p_recipe_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT coalesce(array_agg(s.slot ORDER BY s.slot), '{}') INTO slots
    FROM public.free_recipe_slots s WHERE s.recipe_id = p_recipe_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', rel.id, 'collectionId', rel.collection_id, 'title', col.title,
    'version', rel.version, 'state', rel.state,
    'sealed', rel.state IN ('sealed', 'retired'),
    'liveOffer', EXISTS (SELECT 1 FROM private.commercial_offers o
      WHERE o.release_id = rel.id AND o.provider_mode = 'live' AND o.sale_enabled),
    'pendingLiveAttempt', EXISTS (SELECT 1 FROM private.purchase_orders po
      JOIN private.commercial_offers o ON o.id = po.offer_id
      WHERE po.release_id = rel.id AND o.provider_mode = 'live'
        AND po.attempt_state IN ('creating', 'creation_unknown', 'open', 'processing', 'review')),
    'historicalLivePayment', EXISTS (SELECT 1 FROM private.provider_payments pay
      JOIN private.purchase_orders po ON po.id = pay.order_id
      JOIN private.commercial_offers o ON o.id = po.offer_id
      WHERE po.release_id = rel.id AND o.provider_mode = 'live' AND pay.captured_amount > 0),
    'testActivity', EXISTS (SELECT 1 FROM private.purchase_orders po
      JOIN private.commercial_offers o ON o.id = po.offer_id
      WHERE po.release_id = rel.id AND o.provider_mode = 'test'))
    ORDER BY col.title, rel.version), '[]'::jsonb)
    INTO rels
    FROM public.collection_recipes cr
    JOIN public.collection_releases rel ON rel.id = cr.release_id
    JOIN public.recipe_collections col ON col.id = rel.collection_id
    WHERE cr.recipe_id = p_recipe_id;
  RETURN jsonb_build_object(
    'checkedAt', now(),
    'sourceRevision', 'admin-reads-v1',
    'freeSlots', to_jsonb(slots),
    'releases', rels,
    'campaigns', '[]'::jsonb
  );
END $$;

REVOKE ALL ON FUNCTION private.admin_snapshot(uuid), private.admin_recipe_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_recipe_list(jsonb), public.admin_recipe_detail(uuid),
  public.admin_recipe_history(uuid, text, int), public.admin_recipe_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recipe_list(jsonb), public.admin_recipe_detail(uuid),
  public.admin_recipe_history(uuid, text, int), public.admin_recipe_usage(uuid) TO authenticated;
