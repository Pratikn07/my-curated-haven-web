-- Bind availability evidence to the exact saved revision and storage name.
ALTER TABLE private.recipe_asset_checks
  ADD COLUMN IF NOT EXISTS bucket_id text,
  ADD COLUMN IF NOT EXISTS object_name text;

CREATE OR REPLACE FUNCTION private.admin_recipe_asset_name(p_path text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE
  object_name text;
BEGIN
  IF p_path IS NULL OR position('%' in p_path) > 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF p_path ~ '^https?://[^/?#]+/storage/v1/object/public/recipe-previews/' THEN
    object_name := substring(p_path from '^https?://[^/?#]+/storage/v1/object/public/recipe-previews/(.*)$');
  ELSIF p_path LIKE 'recipe-previews/%' THEN
    object_name := substr(p_path, length('recipe-previews/') + 1);
  ELSE
    object_name := p_path;
  END IF;
  IF object_name IS NULL OR length(object_name) > 301
    OR object_name !~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
    OR position('..' in object_name) > 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  RETURN object_name;
END $$;

REVOKE ALL ON FUNCTION private.admin_recipe_asset_name(text) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS private.admin_record_asset_check(uuid, text, uuid, text, boolean, timestamptz);
CREATE OR REPLACE FUNCTION private.admin_record_asset_check(
  p_revision_id uuid, p_digest text, p_bucket_id text, p_object_name text,
  p_object_id uuid, p_object_version text, p_available boolean, p_checked_at timestamptz
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  saved private.recipe_revisions;
  expected_name text;
  actual_version text;
BEGIN
  IF p_revision_id IS NULL OR p_digest IS NULL OR p_bucket_id <> 'recipe-previews'
    OR p_object_name IS NULL OR p_checked_at IS NULL OR p_available IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  SELECT * INTO saved FROM private.recipe_revisions WHERE id = p_revision_id;
  IF saved.id IS NULL OR saved.digest IS DISTINCT FROM p_digest THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  expected_name := private.admin_recipe_asset_name(saved.snapshot#>>'{image,path}');
  IF expected_name IS DISTINCT FROM p_object_name THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  IF p_object_id IS NOT NULL THEN
    SELECT version INTO actual_version FROM storage.objects
    WHERE id = p_object_id AND bucket_id = p_bucket_id AND name = p_object_name;
    IF NOT FOUND OR actual_version IS DISTINCT FROM p_object_version THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
    END IF;
  ELSIF p_available THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  INSERT INTO private.recipe_asset_checks(
    revision_id, digest, bucket_id, object_name, object_id, object_version, available, checked_at
  ) VALUES (
    p_revision_id, p_digest, p_bucket_id, p_object_name,
    p_object_id, p_object_version, p_available, p_checked_at
  );
END $$;

REVOKE ALL ON FUNCTION private.admin_record_asset_check(uuid,text,text,text,uuid,text,boolean,timestamptz)
  FROM PUBLIC, anon, authenticated;

-- Readiness must use the same saved-object identity that publication enforces.
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
  head_lifecycle text;
  head_sub uuid;
  latest jsonb;
  fresh boolean;
  expected_name text;
  approved_now boolean := false;
  open_blockers int;
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
  SELECT d.id, d.current_revision_id, d.lifecycle, d.current_submission_id
    INTO head_id, head_rev, head_lifecycle, head_sub FROM private.recipe_drafts d
    WHERE d.recipe_id = p_recipe_id AND d.workflow_schema = 1
      AND d.lifecycle IN ('draft','submitted','approved','changes_requested','rejected');
  IF head_id IS NOT NULL THEN
    SELECT r.digest INTO head_digest FROM private.recipe_revisions r WHERE r.id = head_rev;
    review_state := CASE head_lifecycle
      WHEN 'submitted' THEN 'submitted'
      WHEN 'approved' THEN 'approved'
      WHEN 'changes_requested' THEN 'changes_requested'
      WHEN 'rejected' THEN 'rejected'
      ELSE 'unreviewed' END;
    IF head_lifecycle = 'approved' THEN
      SELECT count(*)::int INTO open_blockers FROM private.recipe_revision_issues i
      WHERE i.revision_id = head_rev AND i.severity = 'blocker'
        AND NOT EXISTS (SELECT 1 FROM private.recipe_issue_resolutions r WHERE r.issue_id = i.id);
      approved_now := open_blockers = 0 AND EXISTS (
        SELECT 1 FROM private.recipe_review_decisions d
        WHERE d.submission_id = head_sub AND d.revision_id = head_rev
          AND d.digest = head_digest AND d.decision = 'approve');
      IF NOT approved_now THEN
        review_state := 'unreviewed';
      END IF;
    END IF;
  ELSE
    review_state := CASE WHEN legacy_ok THEN 'approved' ELSE 'unreviewed' END;
  END IF;
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
  IF NOT legacy_ok AND NOT approved_now THEN
    checks := checks || jsonb_build_object('code', 'legacy-review', 'scope', 'review',
      'state', 'fail', 'severity', 'blocker',
      'explanation', 'No passing legacy review for the current version', 'origin', 'source');
  END IF;
  IF head_id IS NOT NULL THEN
    BEGIN
      SELECT private.admin_recipe_asset_name(r.snapshot#>>'{image,path}') INTO expected_name
      FROM private.recipe_revisions r WHERE r.id = head_rev;
    EXCEPTION WHEN others THEN
      expected_name := NULL;
    END;
    SELECT jsonb_build_object('available', c.available, 'digest', c.digest,
      'bucket_id', c.bucket_id, 'object_name', c.object_name,
      'object_id', c.object_id, 'object_version', c.object_version, 'checked_at', c.checked_at)
      INTO latest FROM private.recipe_asset_checks c
      WHERE c.revision_id = head_rev ORDER BY c.checked_at DESC, c.id DESC LIMIT 1;
    IF latest IS NULL THEN
      checks := checks || jsonb_build_object('code', 'image-availability', 'scope', 'image',
        'state', 'unknown', 'severity', 'blocker',
        'explanation', 'No availability check recorded for the working revision', 'origin', 'source');
      needs_verify := true;
    ELSE
      fresh := (now() - (latest->>'checked_at')::timestamptz) <= interval '60 seconds';
      IF NOT fresh OR (latest->>'digest') IS DISTINCT FROM head_digest
        OR expected_name IS NULL
        OR (latest->>'bucket_id') IS DISTINCT FROM 'recipe-previews'
        OR (latest->>'object_name') IS DISTINCT FROM expected_name
        OR ((latest->>'available')::boolean AND NOT EXISTS (
          SELECT 1 FROM storage.objects o WHERE o.id = (latest->>'object_id')::uuid
            AND o.bucket_id = 'recipe-previews' AND o.name = expected_name
            AND o.version IS NOT DISTINCT FROM (latest->>'object_version'))) THEN
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
  needs_attention := (NOT has_body) OR (NOT has_image) OR (NOT legacy_ok AND NOT approved_now);
  ready := has_body AND has_image AND (legacy_ok OR approved_now) AND pub = 'draft';
  RETURN jsonb_build_object(
    'targetDigest', encode(extensions.digest(convert_to(snap::text, 'UTF8'), 'sha256'), 'hex'),
    'review', review_state,
    'checks', checks,
    'needsAttention', needs_attention,
    'awaitingReview', coalesce(head_lifecycle = 'submitted', false),
    'readyToPublish', ready,
    'needsVerification', needs_verify,
    'evaluatedAt', now()
  );
END $$;
