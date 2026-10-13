-- How many recipes are free is the owner's choice (2026-10-13), not a fixed three.
-- The launch plan offered exactly three free recipes, so slots were limited to 1, 2 and 3 and the
-- one writer took exactly three. Access never counted slots: a recipe is free when it is on this list.
-- The other guards stay: only the service role writes the list, every free recipe must be published,
-- reviewed and have a body, and each recipe appears once.

ALTER TABLE public.free_recipe_slots DROP CONSTRAINT free_recipe_slots_slot_check;
ALTER TABLE public.free_recipe_slots ADD CONSTRAINT free_recipe_slots_slot_check CHECK (slot >= 1);

CREATE OR REPLACE FUNCTION private.publish_free_recipe_slots(p_recipe_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_recipe_ids IS NULL OR cardinality(p_recipe_ids) = 0 THEN
    RAISE EXCEPTION 'free selection must contain at least one recipe';
  END IF;

  IF (
    SELECT count(DISTINCT recipe_id)
    FROM unnest(p_recipe_ids) AS recipe_id
  ) <> cardinality(p_recipe_ids) THEN
    RAISE EXCEPTION 'free selection recipes must be distinct';
  END IF;

  LOCK TABLE public.free_recipe_slots IN EXCLUSIVE MODE;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_recipe_ids) AS rid(recipe_id)
    LEFT JOIN public.recipe_catalog rc ON rc.id = rid.recipe_id
    WHERE rc.id IS NULL
       OR rc.publication_state <> 'published'
  ) THEN
    RAISE EXCEPTION 'every free slot recipe must be published';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_recipe_ids) AS rid(recipe_id)
    LEFT JOIN public.recipe_bodies rb ON rb.recipe_id = rid.recipe_id
    WHERE rb.recipe_id IS NULL
  ) THEN
    RAISE EXCEPTION 'every free slot recipe must have a body';
  END IF;

  DELETE FROM public.free_recipe_slots;

  INSERT INTO public.free_recipe_slots (slot, recipe_id)
  SELECT ordinality::smallint, recipe_id
  FROM unnest(p_recipe_ids) WITH ORDINALITY AS slot_row(recipe_id, ordinality);
END;
$$;

REVOKE ALL ON FUNCTION private.publish_free_recipe_slots(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.publish_free_recipe_slots(UUID[]) TO service_role;
