-- Phase 2: reviewed recipe tags. Global tags belong to a recipe's reviewed version: they are part of the
-- snapshot an editor changes and a reviewer approves, and each published content version keeps its own tags.
-- Tags come into the database only through the owner-reviewed import (scripts/admin-recipe-tags-import.mjs);
-- until then a recipe's snapshot has no "tags" key and its hashes are unchanged. Arbitrary tag creation is
-- out of scope: the vocabulary below is the reviewed one from recipe-tags.json.

CREATE TABLE private.recipe_tag_categories (
 category text PRIMARY KEY CHECK (category ~ '^[a-z_]{1,40}$'),
 multiple boolean NOT NULL,
 position int NOT NULL
);
CREATE TABLE private.recipe_tag_values (
 category text NOT NULL REFERENCES private.recipe_tag_categories(category),
 value text NOT NULL CHECK (value ~ '^[a-z0-9-]{1,60}$'),
 position int NOT NULL,
 PRIMARY KEY (category, value)
);
INSERT INTO private.recipe_tag_categories(category, multiple, position) VALUES
 ('stage',true,1),('meal',true,2),('goal',true,3),('practical',true,4),('free_from',true,5),('occasion',true,6),('texture',false,7);
INSERT INTO private.recipe_tag_values(category, value, position)
SELECT v.category, v.value, v.position FROM (VALUES
 ('stage','6-8m',1),('stage','9-12m',2),('stage','1-2y',3),('stage','2-3y',4),('stage','3-5y',5),
 ('meal','breakfast',1),('meal','lunch',2),('meal','dinner',3),('meal','snack',4),('meal','treat',5),
 ('goal','fiber',1),('goal','iron',2),('goal','picky-friendly',3),('goal','protein',4),('goal','sick-days',5),('goal','veg-packed',6),
 ('practical','freezes',1),('practical','make-ahead',2),('practical','no-cook',3),('practical','on-the-go',4),
 ('practical','one-pot',5),('practical','under-15-min',6),('practical','whole-family',7),
 ('free_from','dairy-free',1),('free_from','egg-free',2),('free_from','gluten-free',3),('free_from','nut-free',4),
 ('free_from','vegan',5),('free_from','vegetarian',6),
 ('occasion','back-to-school',1),('occasion','birthday',2),('occasion','halloween',3),('occasion','holidays',4),
 ('occasion','summer',5),('occasion','thanksgiving',6),
 ('texture','puree',1),('texture','mash',2),('texture','bites',3),('texture','finger-food',4),('texture','bowl',5)
) v(category, value, position);

-- Tags per recipe content version. A version's tags never change; a change is a new reviewed version.
CREATE TABLE private.recipe_tag_versions (
 recipe_id uuid NOT NULL REFERENCES public.recipe_catalog(id) ON DELETE CASCADE,
 content_version int NOT NULL CHECK (content_version > 0),
 tags jsonb NOT NULL CHECK (jsonb_typeof(tags) = 'object'),
 provenance text NOT NULL CHECK (provenance IN ('import','review')),
 source_digest text CHECK (source_digest IS NULL OR source_digest ~ '^[0-9a-f]{64}$'),
 recorded_by uuid REFERENCES auth.users(id),
 revision_id uuid,
 operation_id uuid,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (recipe_id, content_version)
);
REVOKE ALL ON private.recipe_tag_categories, private.recipe_tag_values, private.recipe_tag_versions FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.recipe_tag_categories, private.recipe_tag_values, private.recipe_tag_versions TO service_role;
ALTER TABLE private.recipe_tag_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.recipe_tag_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.recipe_tag_versions ENABLE ROW LEVEL SECURITY;
-- Immutable, except that deleting the recipe itself removes its tag history with it (cascade).
CREATE FUNCTION private.recipe_tag_versions_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' AND NOT EXISTS (SELECT 1 FROM public.recipe_catalog WHERE id=OLD.recipe_id) THEN RETURN OLD; END IF;
 RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_IMMUTABLE';
END $$;
CREATE TRIGGER recipe_tag_versions_immutable BEFORE UPDATE OR DELETE ON private.recipe_tag_versions
 FOR EACH ROW EXECUTE FUNCTION private.recipe_tag_versions_guard();

-- Exactly the vocabulary's categories; lists of distinct known values, or one known value (or null) for a
-- single-value category. Missing categories are invalid, so no category is dropped silently.
CREATE FUNCTION private.recipe_tags_valid(p_tags jsonb) RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_typeof(p_tags) = 'object'
  AND (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_tags) k)
   = (SELECT array_agg(category ORDER BY category) FROM private.recipe_tag_categories)
  AND NOT EXISTS (
   SELECT 1 FROM private.recipe_tag_categories c WHERE
    CASE WHEN c.multiple THEN
     jsonb_typeof(p_tags->c.category) <> 'array'
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_tags->c.category) v WHERE jsonb_typeof(v) <> 'string'
       OR NOT EXISTS (SELECT 1 FROM private.recipe_tag_values x WHERE x.category=c.category AND x.value=v#>>'{}'))
     OR jsonb_array_length(p_tags->c.category)
       <> (SELECT count(DISTINCT v#>>'{}') FROM jsonb_array_elements(p_tags->c.category) v)
    ELSE
     jsonb_typeof(p_tags->c.category) NOT IN ('string','null')
     OR (jsonb_typeof(p_tags->c.category) = 'string' AND NOT EXISTS (SELECT 1 FROM private.recipe_tag_values x
       WHERE x.category=c.category AND x.value=p_tags->>c.category))
    END)
$$;

-- The tags of the recipe's current content version, or NULL when none were imported or reviewed.
CREATE FUNCTION private.recipe_current_tags(p_recipe_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT t.tags FROM public.recipe_bodies b
 JOIN private.recipe_tag_versions t ON t.recipe_id=b.recipe_id AND t.content_version=b.content_version
 WHERE b.recipe_id=p_recipe_id
$$;

-- Phase 1's snapshot, plus "tags" when the current version has them.
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
      'alt', c.preview_image_alt,
      'description', c.preview_image_description,
      'objectId', c.preview_image_object_id,
      'objectVersion', c.preview_image_object_version
    )
  ) || CASE WHEN t.tags IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('tags', t.tags) END
  FROM public.recipe_catalog c
  LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
  LEFT JOIN private.recipe_tag_versions t ON t.recipe_id = c.id AND t.content_version = b.content_version
  WHERE c.id = p_recipe_id
$$;

-- Phase 1's validator, plus "tags": valid against the vocabulary, and required once the recipe has tags.
CREATE OR REPLACE FUNCTION private.admin_validate_snapshot(p_snapshot jsonb) RETURNS void
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
  top text[];
  catalog jsonb;
  body jsonb;
  image jsonb;
  recipe uuid;
BEGIN
  IF jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT array_agg(k) INTO top FROM jsonb_object_keys(p_snapshot) k;
  IF EXISTS (SELECT 1 FROM unnest(top) k WHERE k NOT IN ('recipeId','slug','catalog','body','image','tags')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF octet_length(p_snapshot::text) > 200000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  catalog := p_snapshot->'catalog';
  IF jsonb_typeof(catalog) <> 'object'
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(catalog) k
      WHERE k NOT IN ('title','publicSummary','totalMinutes','mealLabels','dietLabels'))
    OR nullif(trim(catalog->>'title'), '') IS NULL
    OR char_length(catalog->>'title') > 300 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  body := p_snapshot->'body';
  IF body IS NOT NULL AND body <> 'null'::jsonb THEN
    IF jsonb_typeof(body) <> 'object'
      OR EXISTS (SELECT 1 FROM jsonb_object_keys(body) k
        WHERE k NOT IN ('ingredients','instructions','yield','yieldStructured','reviewedNotes','allergenReviewState','allergens','storageNotes')) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
    IF (body ? 'ingredients') AND jsonb_typeof(body->'ingredients') <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
    IF (body ? 'instructions') AND jsonb_typeof(body->'instructions') <> 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
  END IF;
  image := p_snapshot->'image';
  IF jsonb_typeof(image) <> 'object'
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(image) k
      WHERE k NOT IN ('path','alt','description','objectId','objectVersion')) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF p_snapshot ? 'tags' THEN
    IF NOT coalesce(private.recipe_tags_valid(p_snapshot->'tags'), false) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
  ELSE
    BEGIN recipe := (p_snapshot->>'recipeId')::uuid;
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END;
    IF private.recipe_current_tags(recipe) IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
  END IF;
END $$;

-- Publication and correction both record the human review of the new content version; its reviewed tags
-- become that version's tags.
CREATE FUNCTION private.recipe_tags_follow_review() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE reviewed jsonb; reviewer uuid;
BEGIN
 SELECT r.snapshot->'tags' INTO reviewed FROM private.recipe_revisions r WHERE r.id=NEW.admin_revision_id;
 IF reviewed IS NULL OR reviewed='null'::jsonb THEN RETURN NEW; END IF;
 BEGIN reviewer := NEW.reviewer::uuid;
 EXCEPTION WHEN OTHERS THEN reviewer := NULL;
 END;
 INSERT INTO private.recipe_tag_versions(recipe_id, content_version, tags, provenance, recorded_by, revision_id)
 VALUES (NEW.recipe_id, NEW.content_version, reviewed, 'review', reviewer, NEW.admin_revision_id)
 ON CONFLICT (recipe_id, content_version) DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER recipe_reviews_record_tags AFTER INSERT ON private.recipe_reviews
 FOR EACH ROW WHEN (NEW.admin_revision_id IS NOT NULL AND NEW.verdict = 'approve')
 EXECUTE FUNCTION private.recipe_tags_follow_review();

-- The vocabulary the editor offers.
CREATE FUNCTION public.admin_recipe_tag_vocabulary() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.admin_assert('recipe.read','inspection');
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('category',c.category,'multiple',c.multiple,
   'values',(SELECT coalesce(jsonb_agg(v.value ORDER BY v.position),'[]'::jsonb) FROM private.recipe_tag_values v
     WHERE v.category=c.category)) ORDER BY c.position) FROM private.recipe_tag_categories c),'[]'::jsonb);
END $$;

-- Reviewed import, run only by the import script through the server's database connection. It records tags
-- for each recipe's current content version that has none, with import provenance and the named owner as
-- authoriser. A recipe whose current version already has different tags is skipped: it changes through review.
CREATE FUNCTION private.recipe_tags_import(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE
 authoriser uuid; op uuid; reason text := p_payload->>'reason'; item jsonb; recipe uuid; version int; current jsonb;
 imported jsonb := '[]'; unchanged jsonb := '[]'; skipped jsonb := '[]';
BEGIN
 BEGIN
  authoriser := (p_payload->>'authoriser')::uuid; op := (p_payload->>'operationId')::uuid;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 IF authoriser IS NULL OR op IS NULL OR length(trim(coalesce(reason,''))) NOT BETWEEN 1 AND 1000
  OR jsonb_typeof(p_payload->'recipes') <> 'array' THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id=authoriser AND active AND role='owner') THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
 PERFORM set_config('lock_timeout','5000',true);
 FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'recipes') LOOP
  recipe := NULL; version := NULL;
  SELECT c.id, b.content_version INTO recipe, version FROM public.recipe_catalog c
  JOIN public.recipe_bodies b ON b.recipe_id=c.id WHERE c.slug=item->>'slug' FOR UPDATE OF c;
  IF recipe IS NULL OR NOT coalesce(private.recipe_tags_valid(item->'tags'), false)
   OR coalesce(item->>'sourceDigest','') !~ '^[0-9a-f]{64}$' THEN
   skipped := skipped || jsonb_build_object('slug',item->>'slug','reason','not-importable');
   CONTINUE;
  END IF;
  current := private.recipe_current_tags(recipe);
  IF current IS NULL THEN
   INSERT INTO private.recipe_tag_versions(recipe_id, content_version, tags, provenance, source_digest, recorded_by, operation_id)
   VALUES (recipe, version, item->'tags', 'import', item->>'sourceDigest', authoriser, op);
   INSERT INTO private.admin_audit(actor_id, action, recipe_id, digest, after_ref, request_id, reason, result)
   VALUES (authoriser, 'recipe.tags_import', recipe, item->>'sourceDigest', version::text, op, reason, 'success');
   imported := imported || to_jsonb(item->>'slug');
  ELSIF current = item->'tags' THEN
   unchanged := unchanged || to_jsonb(item->>'slug');
  ELSE
   skipped := skipped || jsonb_build_object('slug',item->>'slug','reason','different-reviewed-tags');
  END IF;
 END LOOP;
 RETURN jsonb_build_object('imported',imported,'unchanged',unchanged,'skipped',skipped);
END $$;

REVOKE ALL ON FUNCTION private.recipe_tags_valid(jsonb), private.recipe_current_tags(uuid), private.recipe_tags_follow_review(),
 private.recipe_tag_versions_guard(),
 private.recipe_tags_import(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_recipe_tag_vocabulary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recipe_tag_vocabulary() TO authenticated;
