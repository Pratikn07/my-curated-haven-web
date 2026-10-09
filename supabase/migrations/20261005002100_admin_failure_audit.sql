-- Admin operational failure audit: records safe failed attempts independently
-- after a rolled-back transaction. Only restricted server/operator
-- credentials execute it; authenticated/anon cannot.

CREATE OR REPLACE FUNCTION private.admin_record_failure(
  p_actor_id uuid, p_action text, p_target uuid,
  p_operation_id uuid, p_code text, p_request_reference text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_actor_id IS NULL OR p_operation_id IS NULL
    OR length(trim(coalesce(p_action, ''))) NOT BETWEEN 1 AND 80
    OR length(trim(coalesce(p_code, ''))) NOT BETWEEN 1 AND 40
    OR length(trim(coalesce(p_request_reference, ''))) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ADM_INVALID';
  END IF;
  INSERT INTO private.admin_audit(actor_id, action, recipe_id, request_id, reason, result)
  VALUES (p_actor_id, 'failure.' || trim(p_action), p_target, p_operation_id,
    trim(p_code) || ':' || trim(p_request_reference), 'failure');
END $$;

REVOKE ALL ON FUNCTION private.admin_record_failure(uuid, text, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
