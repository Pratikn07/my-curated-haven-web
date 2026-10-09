-- The collection recipe picker also needs review state, allergens and a tag digest, so an editor sees
-- blockers before adding a recipe. tagsDigest covers the catalog's own meal/diet labels until reviewed
-- tag versions exist (Task 15).
CREATE OR REPLACE FUNCTION public.admin_collection_catalog(p_query jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q text := lower(left(coalesce(p_query->>'q',''),200)); page int := coalesce((p_query->>'page')::int,1);
BEGIN
 PERFORM private.collection_assert('collection.read','inspection');
 IF page < 1 OR page > 1000 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 RETURN (WITH matches AS (
   SELECT c.id, c.slug, c.title, c.publication_state, c.total_minutes, c.meal_labels, c.diet_labels,
     b.content_version, b.allergens, b.recipe_id IS NOT NULL AS has_body
   FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id=c.id
   WHERE q='' OR position(q IN lower(c.title))>0 OR position(q IN lower(c.slug))>0)
  SELECT jsonb_build_object(
   'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('recipeId',m.id,'slug',m.slug,'title',m.title,
      'publication',m.publication_state,'contentVersion',m.content_version,'activeHash',private.admin_active_hash(m.id),
      'reviewed',m.has_body AND private.recipe_is_reviewed(m.id),
      'allergens',coalesce(to_jsonb(m.allergens),'[]'::jsonb),
      'tagsDigest',private.collection_digest(jsonb_build_object('meal',to_jsonb(m.meal_labels),'diet',to_jsonb(m.diet_labels))),
      'totalMinutes',m.total_minutes,'mealLabels',to_jsonb(m.meal_labels),'dietLabels',to_jsonb(m.diet_labels))
      ORDER BY lower(m.title), m.id)
     FROM (SELECT * FROM matches ORDER BY lower(title), id LIMIT 25 OFFSET (page-1)*25) m),'[]'::jsonb),
   'filteredTotal',(SELECT count(*) FROM matches),'page',page,'pageSize',25,'checkedAt',now()));
END $$;
