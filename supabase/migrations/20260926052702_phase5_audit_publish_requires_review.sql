-- Phase 5 audit, 2026-09-25 (docs/audit/AUDIT-BACKLOG.md M5-04).
-- A recipe reached the public site without any editorial review. From now on
-- a recipe can only go live, take a free slot or join a paid collection once
-- its body has a reviewed allergen state. Recipes that are already published
-- stay published, and marking a body unreviewed again is always allowed.
-- Not gated: inserting a brand-new catalog row directly as published (the local
-- seed does this before bodies exist). Imports should insert drafts and publish later.

CREATE OR REPLACE FUNCTION private.recipe_is_reviewed(p_recipe_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recipe_bodies b
    WHERE b.recipe_id = p_recipe_id
      AND b.allergen_review_state <> 'unknown'
  );
$$;

CREATE OR REPLACE FUNCTION private.require_reviewed_recipe()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  target uuid;
BEGIN
  IF TG_TABLE_NAME = 'recipe_catalog' THEN
    -- Only the transition into published is gated.
    IF NEW.publication_state <> 'published' OR OLD.publication_state = 'published' THEN
      RETURN NEW;
    END IF;
    target := NEW.id;
  ELSE
    target := NEW.recipe_id;
  END IF;

  IF NOT private.recipe_is_reviewed(target) THEN
    RAISE EXCEPTION 'recipe % has not been editorially reviewed', target
      USING ERRCODE = 'check_violation',
            HINT = 'Review the recipe and set recipe_bodies.allergen_review_state before publishing it.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.recipe_is_reviewed(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.require_reviewed_recipe() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.recipe_is_reviewed(uuid) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION private.require_reviewed_recipe() TO postgres, service_role;

DROP TRIGGER IF EXISTS recipe_catalog_publish_requires_review ON public.recipe_catalog;
CREATE TRIGGER recipe_catalog_publish_requires_review
  BEFORE UPDATE OF publication_state ON public.recipe_catalog
  FOR EACH ROW EXECUTE FUNCTION private.require_reviewed_recipe();

DROP TRIGGER IF EXISTS free_recipe_slots_require_review ON public.free_recipe_slots;
CREATE TRIGGER free_recipe_slots_require_review
  BEFORE INSERT OR UPDATE OF recipe_id ON public.free_recipe_slots
  FOR EACH ROW EXECUTE FUNCTION private.require_reviewed_recipe();

DROP TRIGGER IF EXISTS collection_recipes_require_review ON public.collection_recipes;
CREATE TRIGGER collection_recipes_require_review
  BEFORE INSERT OR UPDATE OF recipe_id ON public.collection_recipes
  FOR EACH ROW EXECUTE FUNCTION private.require_reviewed_recipe();
