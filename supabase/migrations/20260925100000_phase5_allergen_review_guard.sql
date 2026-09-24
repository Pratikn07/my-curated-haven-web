-- Phase 5 correction.
-- An empty allergen array is not an editorial review. The original ingest
-- marked every empty list as reviewed_no_allergens. Keep that state only for
-- the one free recipe whose selection record documents the review.

CREATE OR REPLACE FUNCTION private.slugify(value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN trim(both '-' FROM lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(COALESCE(value, ''), '[&]', 'and', 'g'),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  ));
END;
$$;

REVOKE ALL ON FUNCTION private.slugify(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.slugify(text) TO service_role;

-- Incoming draft must not demote a recipe that is already published.
CREATE OR REPLACE FUNCTION private.merge_publication_state(
  existing_state text,
  incoming_state text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN existing_state = 'published' AND incoming_state IS DISTINCT FROM 'withdrawn'
      THEN 'published'
    ELSE COALESCE(incoming_state, existing_state, 'draft')
  END;
$$;

REVOKE ALL ON FUNCTION private.merge_publication_state(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.merge_publication_state(text, text) TO service_role;

CREATE OR REPLACE FUNCTION private.clear_unreviewed_allergen_claims()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  corrected integer;
BEGIN
  UPDATE public.recipe_bodies
  SET allergen_review_state = 'unknown',
      updated_at = now()
  WHERE allergen_review_state = 'reviewed_no_allergens'
    AND (allergens IS NULL OR cardinality(allergens) = 0)
    AND recipe_id <> '50663aaa-7e47-4b08-9fd8-a58b390db96d';

  GET DIAGNOSTICS corrected = ROW_COUNT;
  RETURN corrected;
END;
$$;

REVOKE ALL ON FUNCTION private.clear_unreviewed_allergen_claims() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.clear_unreviewed_allergen_claims() TO service_role;

SELECT private.clear_unreviewed_allergen_claims();
