-- Bound every guarded RPC's lock waits so contention fails fast with a
-- retryable 55P03 instead of hanging a pooled connection indefinitely.
-- Retries reuse the same operation id, which the shared operation ledger
-- makes idempotent; statements that already committed are never replayed
-- because lock timeouts only fire before any write in the same statement.

CREATE OR REPLACE FUNCTION private.admin_assert(p_permission text, p_stage text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid:=auth.uid(); current_stage text;
BEGIN
  PERFORM set_config('lock_timeout', '5000', true);
  IF actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_AUTH_REQUIRED'; END IF;
  IF (auth.jwt()->>'aal') IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_MFA_REQUIRED'; END IF;
  SELECT stage INTO current_stage FROM private.admin_console_settings WHERE singleton FOR SHARE;
  IF current_stage IS NULL OR array_position(ARRAY['disabled','inspection','editing','publication'],current_stage)<array_position(ARRAY['disabled','inspection','editing','publication'],p_stage) OR current_stage='disabled' THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_DISABLED';
  END IF;
  IF p_stage NOT IN ('inspection','editing','publication') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ADM_INVALID'; END IF;
  PERFORM 1 FROM private.admin_memberships WHERE user_id=actor AND active FOR SHARE;
  IF NOT EXISTS(SELECT 1 FROM private.admin_memberships WHERE user_id=actor AND active AND p_permission=ANY(private.admin_permissions(role))) THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ADM_DENIED';
  END IF;
  RETURN actor;
END $$;
