-- Phase 5 (audit R5-13, G5-01). Internal review record for each recipe.
--
-- The owner delegated recipe review to an automated reviewer. This table
-- records who checked which content version, when, and how many blockers
-- remain. It is private: parents never see it, and the public allergen
-- wording (recipe_bodies.allergen_review_state) is unchanged by it.
--
-- The publishing gate now also accepts a recipe whose latest review of its
-- current content version has no open blockers. A later content edit bumps
-- content_version, so the old review no longer counts.

CREATE TABLE IF NOT EXISTS private.recipe_reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipe_catalog (id) ON DELETE CASCADE,
  content_version integer NOT NULL,
  reviewer_kind text NOT NULL CHECK (reviewer_kind IN ('ai', 'human')),
  reviewer text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  verdict text NOT NULL CHECK (verdict IN ('approve', 'approve_with_changes', 'reject')),
  open_blockers integer NOT NULL CHECK (open_blockers >= 0),
  notes text
);

CREATE INDEX IF NOT EXISTS recipe_reviews_recipe_version_idx
  ON private.recipe_reviews (recipe_id, content_version, reviewed_at DESC);

REVOKE ALL ON TABLE private.recipe_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE private.recipe_reviews TO service_role;

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
  )
  OR COALESCE((
    SELECT r.open_blockers = 0 AND r.verdict <> 'reject'
    FROM private.recipe_reviews r
    JOIN public.recipe_bodies b
      ON b.recipe_id = r.recipe_id AND b.content_version = r.content_version
    WHERE r.recipe_id = p_recipe_id
    ORDER BY r.reviewed_at DESC, r.id DESC
    LIMIT 1
  ), false);
$$;

REVOKE ALL ON FUNCTION private.recipe_is_reviewed(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.recipe_is_reviewed(uuid) TO postgres, service_role;
