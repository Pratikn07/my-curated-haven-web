-- Admin image availability: checks bound to exact revisions, listed only from
-- catalog-referenced recipe-previews objects. Unknown or unavailable is never
-- a pass; publication rechecks identity and version in its own transaction.

CREATE TABLE IF NOT EXISTS private.recipe_asset_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL REFERENCES private.recipe_revisions(id) ON DELETE CASCADE,
  digest text NOT NULL,
  object_id uuid,
  object_version text,
  available boolean NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recipe_asset_checks_revision_idx
  ON private.recipe_asset_checks (revision_id, checked_at DESC);

ALTER TABLE private.recipe_asset_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.recipe_asset_checks FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.recipe_asset_checks TO service_role;

CREATE OR REPLACE FUNCTION private.admin_record_asset_check(
  p_revision_id uuid, p_digest text, p_object_id uuid,
  p_object_version text, p_available boolean, p_checked_at timestamptz
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_revision_id IS NULL OR p_digest IS NULL OR p_checked_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  INSERT INTO private.recipe_asset_checks(revision_id, digest, object_id, object_version, available, checked_at)
  VALUES (p_revision_id, p_digest, p_object_id, p_object_version, p_available, p_checked_at);
END $$;

REVOKE ALL ON FUNCTION private.admin_record_asset_check(uuid, text, uuid, text, boolean, timestamptz)
  FROM PUBLIC, anon, authenticated;

-- Enumerate only catalog-referenced recipe-previews objects with live identity.
CREATE OR REPLACE FUNCTION public.admin_recipe_assets() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.admin_assert('recipe.read', 'inspection');
  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'path', c.preview_image_path,
      'alt', c.preview_image_alt,
      'description', c.preview_image_description,
      'objectId', o.id,
      'objectVersion', o.version,
      'bucket', 'recipe-previews',
      'available', o.id IS NOT NULL,
      'provenance', 'requires_review'
    ) ORDER BY c.preview_image_path), '[]'::jsonb)
    FROM (SELECT DISTINCT preview_image_path, preview_image_alt, preview_image_description
      FROM public.recipe_catalog
      WHERE nullif(trim(preview_image_path), '') IS NOT NULL) c
    LEFT JOIN storage.objects o
      ON o.bucket_id = 'recipe-previews'
      AND o.name = CASE
        WHEN c.preview_image_path LIKE 'recipe-previews/%'
        THEN substr(c.preview_image_path, length('recipe-previews/') + 1)
        ELSE c.preview_image_path END
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_recipe_assets() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recipe_assets() TO authenticated;

-- Readiness gains image-availability knowledge for the open working revision:
-- a fresh matching check passes, a fresh mismatch fails, anything else is
-- unknown and needs verification. Legacy active-only content is unaffected.
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
  needs_verify boolean := false;
  head_id uuid;
  head_rev uuid;
  head_digest text;
  latest jsonb;
  fresh boolean;
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
  SELECT d.id, d.current_revision_id INTO head_id, head_rev FROM private.recipe_drafts d
    WHERE d.recipe_id = p_recipe_id AND d.workflow_schema = 1
      AND d.lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  IF head_id IS NOT NULL THEN
    SELECT r.digest INTO head_digest FROM private.recipe_revisions r WHERE r.id = head_rev;
    SELECT jsonb_build_object('available', c.available, 'digest', c.digest, 'checked_at', c.checked_at)
      INTO latest FROM private.recipe_asset_checks c
      WHERE c.revision_id = head_rev ORDER BY c.checked_at DESC, c.id DESC LIMIT 1;
    IF latest IS NULL THEN
      checks := checks || jsonb_build_object('code', 'image-availability', 'scope', 'image',
        'state', 'unknown', 'severity', 'blocker',
        'explanation', 'No availability check recorded for the working revision', 'origin', 'source');
      needs_verify := true;
    ELSE
      fresh := (now() - (latest->>'checked_at')::timestamptz) <= interval '60 seconds';
      IF NOT fresh OR (latest->>'digest') IS DISTINCT FROM head_digest THEN
        checks := checks || jsonb_build_object('code', 'image-availability', 'scope', 'image',
          'state', 'unknown', 'severity', 'blocker',
          'explanation', 'Availability evidence is stale or targets another revision', 'origin', 'source');
        needs_verify := true;
      ELSIF (latest->>'available')::boolean THEN
        checks := checks || jsonb_build_object('code', 'image-availability', 'scope', 'image',
          'state', 'pass', 'severity', 'blocker',
          'explanation', 'Working image object verified available', 'origin', 'source');
      ELSE
        checks := checks || jsonb_build_object('code', 'image-availability', 'scope', 'image',
          'state', 'fail', 'severity', 'blocker',
          'explanation', 'Working image object is unavailable', 'origin', 'source');
      END IF;
    END IF;
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
    'needsVerification', needs_verify,
    'evaluatedAt', now()
  );
END $$;
