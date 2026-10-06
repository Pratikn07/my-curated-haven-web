-- Admin working revisions: immutable snapshots on top of the existing draft authority.
-- Legacy private.recipe_drafts rows keep workflow_schema NULL and stay inspectable.

ALTER TABLE public.recipe_catalog
  ADD COLUMN IF NOT EXISTS preview_image_alt text,
  ADD COLUMN IF NOT EXISTS preview_image_description text,
  ADD COLUMN IF NOT EXISTS preview_image_object_id uuid,
  ADD COLUMN IF NOT EXISTS preview_image_object_version text;

ALTER TABLE private.recipe_drafts
  ADD COLUMN IF NOT EXISTS workflow_schema integer,
  ADD COLUMN IF NOT EXISTS lifecycle text CHECK (lifecycle IS NULL OR lifecycle IN ('draft','submitted','approved','changes_requested','rejected','published','superseded')),
  ADD COLUMN IF NOT EXISTS base_content_version integer,
  ADD COLUMN IF NOT EXISTS base_active_hash text,
  ADD COLUMN IF NOT EXISTS working_version integer,
  ADD COLUMN IF NOT EXISTS current_revision_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS recipe_one_open_console_head ON private.recipe_drafts (recipe_id)
  WHERE workflow_schema = 1 AND lifecycle IN ('draft','submitted','approved','changes_requested','rejected');

CREATE TABLE IF NOT EXISTS private.recipe_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES private.recipe_drafts(id) ON DELETE RESTRICT,
  recipe_id uuid NOT NULL REFERENCES public.recipe_catalog(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  snapshot jsonb NOT NULL,
  digest text NOT NULL,
  base_content_version integer,
  base_active_hash text NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  saved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipe_revisions_draft_version_uniq UNIQUE (draft_id, version)
);
CREATE INDEX IF NOT EXISTS recipe_revisions_recipe_idx ON private.recipe_revisions (recipe_id, version DESC);

ALTER TABLE private.recipe_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.recipe_revisions FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.recipe_revisions TO service_role;

DROP TRIGGER IF EXISTS recipe_revisions_immutable ON private.recipe_revisions;
CREATE TRIGGER recipe_revisions_immutable BEFORE UPDATE OR DELETE ON private.recipe_revisions
  FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();

CREATE OR REPLACE FUNCTION private.admin_snapshot_digest(p_snapshot jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT encode(extensions.digest(convert_to(p_snapshot::text, 'UTF8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION private.admin_active_hash(p_recipe_id uuid) RETURNS text
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT private.admin_snapshot_digest(jsonb_build_object(
    'publication', c.publication_state,
    'contentVersion', b.content_version,
    'snapshot', private.admin_snapshot(p_recipe_id)
  ))
  FROM public.recipe_catalog c
  LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
  WHERE c.id = p_recipe_id
$$;

-- Snapshot now carries persisted image metadata; legacy rows keep title fallback.
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
  )
  FROM public.recipe_catalog c
  LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
  WHERE c.id = p_recipe_id
$$;

REVOKE ALL ON FUNCTION private.admin_snapshot_digest(jsonb), private.admin_active_hash(uuid) FROM PUBLIC, anon, authenticated;
