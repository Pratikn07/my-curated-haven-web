-- Phase 3: retention, activation checks and private aggregate metrics for support.
--
-- Retention: the owner sets how long case notes and detailed provider checks are kept. An owner-only retention run
-- clears note text (keeping who, when and why) and strips provider identifiers from old checks, keeping their payment
-- facts, amounts and evidence digest, so approvals and receipts still verify. Nothing that a pending approval or
-- operation relies on is touched, and nothing is deleted. The support stage can only move to diagnosis or repair once
-- the verifier, retention and an approved access policy are in place. Metrics are counts only, per mode.

ALTER TABLE private.support_workspace_settings
 ADD COLUMN observation_retention_days integer
  CHECK (observation_retention_days IS NULL OR observation_retention_days BETWEEN 30 AND 3650);

ALTER TABLE private.commerce_provider_observations ADD COLUMN minimised_at timestamptz;

-- A check's facts without provider identifiers: payment state, amounts, currency, statuses and dates stay.
CREATE FUNCTION private.commerce_minimised_facts(f jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT f || jsonb_build_object('sessionId', NULL, 'paymentIntentId', NULL, 'chargeId', NULL,
  'refunds', (SELECT coalesce(jsonb_agg(x || '{"id":"redacted","paymentIntentId":"","chargeId":""}'::jsonb ORDER BY o), '[]')
    FROM jsonb_array_elements(f->'refunds') WITH ORDINALITY a(x, o)),
  'disputes', (SELECT coalesce(jsonb_agg(x || '{"id":"redacted","paymentIntentId":"","chargeId":""}'::jsonb ORDER BY o), '[]')
    FROM jsonb_array_elements(f->'disputes') WITH ORDINALITY a(x, o)))
$$;

-- Observations stay immutable, except the one retention change: minimising the facts once, inside a retention run.
CREATE FUNCTION private.commerce_observation_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND current_setting('mch.support_retention', true) = 'on' AND OLD.minimised_at IS NULL
   AND NEW.minimised_at IS NOT NULL AND NEW.facts = private.commerce_minimised_facts(OLD.facts)
   AND to_jsonb(NEW) - 'facts' - 'minimised_at' = to_jsonb(OLD) - 'facts' - 'minimised_at' THEN
  RETURN NEW;
 END IF;
 RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_IMMUTABLE';
END $$;
DROP TRIGGER commerce_provider_observations_immutable ON private.commerce_provider_observations;
CREATE TRIGGER commerce_provider_observations_immutable BEFORE UPDATE OR DELETE ON private.commerce_provider_observations
 FOR EACH ROW EXECUTE FUNCTION private.commerce_observation_guard();

-- The signed-in owner at aal2, whatever the support stage: retention and the stage switch must work while support is
-- off.
CREATE FUNCTION private.support_owner_session() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_AUTH_REQUIRED'; END IF;
 IF auth.jwt()->>'aal' IS DISTINCT FROM 'aal2' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_MFA_REQUIRED'; END IF;
 IF NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = actor AND role = 'owner' AND active) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
 RETURN actor;
END $$;

-- Owner only, in any stage. Clears expired note text and minimises expired provider checks; repeating the operation
-- returns its first result.
CREATE FUNCTION public.admin_support_retention_run(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; v_receipt jsonb; v_notes integer; v_observations integer; v_note_days integer; v_observation_days integer;
BEGIN
 actor := private.support_owner_session();
 IF p_operation_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 v_receipt := private.admin_begin_operation(actor, p_operation_id, 'support.retention', NULL, '{}'::jsonb);
 IF v_receipt IS NOT NULL THEN RETURN v_receipt; END IF;
 SELECT note_retention_days, observation_retention_days INTO v_note_days, v_observation_days
 FROM private.support_workspace_settings WHERE singleton;
 IF v_note_days IS NULL OR v_observation_days IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;

 WITH expired AS (
  UPDATE private.support_note_texts n SET text = NULL, redacted_at = clock_timestamp(), redacted_by = actor,
   redaction_reason = 'Retention period ended'
  FROM private.support_case_events e
  WHERE e.id = n.event_id AND n.text IS NOT NULL AND e.at < now() - make_interval(days => v_note_days)
  RETURNING n.event_id, e.case_id),
 events AS (
  INSERT INTO private.support_case_events(case_id, action, actor_id, amends_event_id, operation_id)
  SELECT case_id, 'redact_note', actor, event_id, p_operation_id FROM expired RETURNING 1)
 SELECT count(*) INTO v_notes FROM events;

 PERFORM set_config('mch.support_retention', 'on', true);
 WITH minimised AS (
  UPDATE private.commerce_provider_observations p SET facts = private.commerce_minimised_facts(p.facts), minimised_at = clock_timestamp()
  WHERE p.minimised_at IS NULL AND p.verified_at < now() - make_interval(days => v_observation_days)
   -- Never what a pending approval or operation still relies on.
   AND NOT EXISTS (SELECT 1 FROM private.support_proposals sp LEFT JOIN private.support_approvals sa ON sa.proposal_id = sp.id
     WHERE sp.observation_id = p.id AND (sp.expires_at > now() OR sa.expires_at > now()))
   AND NOT EXISTS (SELECT 1 FROM private.support_operations so WHERE so.job_id = p.job_id AND so.state = 'checking')
  RETURNING 1)
 SELECT count(*) INTO v_observations FROM minimised;
 PERFORM set_config('mch.support_retention', 'off', true);

 v_receipt := jsonb_build_object('notesRedacted', v_notes, 'observationsMinimised', v_observations);
 PERFORM private.admin_finish_operation(actor, p_operation_id, v_receipt);
 RETURN v_receipt;
END $$;

-- What still stands between the support workspace and a stage, in plain codes.
CREATE FUNCTION private.support_stage_blockers(p_stage text) RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(array_agg(b ORDER BY b), '{}') FROM (
  SELECT 'verifier_unregistered' b WHERE p_stage IN ('diagnosis','repair')
    AND NOT EXISTS (SELECT 1 FROM private.commerce_verifier_principals WHERE revoked_at IS NULL)
  UNION ALL SELECT 'observation_retention_unset' WHERE p_stage IN ('diagnosis','repair')
    AND (SELECT observation_retention_days FROM private.support_workspace_settings WHERE singleton) IS NULL
  UNION ALL SELECT 'note_retention_unset' WHERE p_stage = 'repair'
    AND (SELECT note_retention_days FROM private.support_workspace_settings WHERE singleton) IS NULL
  UNION ALL SELECT 'access_policy_missing' WHERE p_stage = 'repair'
    AND NOT EXISTS (SELECT 1 FROM private.commerce_access_policies)
  -- The verifier records provider facts and an agent login applies repairs: one login must never be both.
  UNION ALL SELECT 'verifier_is_operator' WHERE p_stage IN ('diagnosis','repair')
    AND EXISTS (SELECT 1 FROM private.commerce_verifier_principals v JOIN private.support_operator_principals o ON o.principal = v.principal
      WHERE v.revoked_at IS NULL AND o.revoked_at IS NULL)) x
$$;

-- Owner only: what each stage still needs, without any customer data.
CREATE FUNCTION public.admin_support_readiness() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := private.support_owner_session();
BEGIN
 RETURN jsonb_build_object('stage', (SELECT stage FROM private.support_workspace_settings WHERE singleton),
  'diagnosis', to_jsonb(private.support_stage_blockers('diagnosis')), 'repair', to_jsonb(private.support_stage_blockers('repair')));
END $$;

-- Owner only: move the support stage. Diagnosis and repair are refused while anything they need is missing; turning
-- support down is always allowed.
CREATE FUNCTION public.admin_support_set_stage(p_stage text, p_reason text, p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := private.support_owner_session(); v_receipt jsonb; v_blockers text[];
BEGIN
 IF p_stage IS NULL OR p_stage NOT IN ('disabled','inspection','diagnosis','repair') OR p_operation_id IS NULL
   OR length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 v_receipt := private.admin_begin_operation(actor, p_operation_id, 'support.stage', NULL,
  jsonb_build_object('stage', p_stage, 'reason', btrim(p_reason)));
 IF v_receipt IS NOT NULL THEN RETURN v_receipt; END IF;
 v_blockers := private.support_stage_blockers(p_stage);
 IF cardinality(v_blockers) > 0 THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 UPDATE private.support_workspace_settings SET stage = p_stage, updated_at = now(), updated_by = actor, reason = btrim(p_reason)
 WHERE singleton;
 v_receipt := jsonb_build_object('stage', p_stage);
 PERFORM private.admin_finish_operation(actor, p_operation_id, v_receipt);
 RETURN v_receipt;
END $$;

-- Counts only, for one mode: waiting checks, webhook backlog, why repairs were blocked, repair outcomes, post-checks
-- and orders whose newest complete check disagrees with their purchase source. No ids, emails, notes or provider data.
CREATE FUNCTION public.admin_support_metrics(p_mode text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; v_since timestamptz := now() - interval '30 days';
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 IF p_mode IS NULL OR p_mode NOT IN ('test','live') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 RETURN (
  WITH orders AS (SELECT id, user_id, release_id FROM private.purchase_orders WHERE snapshot->>'provider_mode' = p_mode),
  latest AS (SELECT DISTINCT ON (p.order_id) p.order_id, p.id FROM private.commerce_provider_observations p
    JOIN orders o ON o.id = p.order_id WHERE p.complete ORDER BY p.order_id, p.fence DESC),
  judged AS (SELECT l.order_id, private.commerce_evaluate_purchase(l.order_id, l.id)->>'state' AS state,
     (SELECT s.is_eligible FROM private.access_sources s WHERE s.source_kind = 'stripe_purchase' AND s.source_id = l.order_id::text) AS eligible
    FROM latest l),
  ops AS (SELECT so.* FROM private.support_operations so JOIN private.support_proposals sp ON sp.id = so.proposal_id
    JOIN orders o ON o.id = sp.order_id WHERE so.created_at >= v_since),
  checks AS (SELECT DISTINCT ON (pc.operation_id) pc.matched FROM private.support_postchecks pc JOIN ops ON ops.operation_id = pc.operation_id
    ORDER BY pc.operation_id, pc.checked_at DESC)
  SELECT jsonb_build_object('mode', p_mode,
   'pendingChecks', (SELECT count(*) FROM private.commerce_verification_jobs j JOIN orders o ON o.id = j.order_id
     WHERE j.state IN ('pending','claimed')),
   'oldestPendingCheckSeconds', (SELECT coalesce(extract(epoch FROM now() - min(j.created_at))::int, 0)
     FROM private.commerce_verification_jobs j JOIN orders o ON o.id = j.order_id WHERE j.state IN ('pending','claimed')),
   'webhookEvents', (SELECT jsonb_build_object('pending', count(*) FILTER (WHERE processing_state IN ('pending','processing')),
     'failed', count(*) FILTER (WHERE processing_state = 'failed'), 'setAside', count(*) FILTER (WHERE processing_state = 'dead_letter'))
     FROM private.payment_events WHERE provider_mode = p_mode),
   'unresolvedMismatches', (SELECT count(*) FROM judged WHERE state IN ('eligible','ineligible')
     AND coalesce(eligible, false) <> (state = 'eligible')),
   'blockedRepairReasons', (SELECT coalesce(jsonb_object_agg(reason, n), '{}') FROM (SELECT b AS reason, count(*) AS n
     FROM private.support_proposals sp JOIN orders o ON o.id = sp.order_id, jsonb_array_elements_text(sp.proposal->'blockers') b
     WHERE sp.prepared_at >= v_since GROUP BY b) r),
   'repairs', (SELECT jsonb_build_object('applied', count(*) FILTER (WHERE ops.receipt->>'state' = 'applied'),
     'alreadySatisfied', count(*) FILTER (WHERE ops.receipt->>'state' = 'already_satisfied'),
     'failedWithoutCommit', count(*) FILTER (WHERE ops.state = 'checking' AND EXISTS (SELECT 1 FROM private.commerce_verification_jobs j
       WHERE j.id = ops.job_id AND j.state = 'failed'))) FROM ops),
   'postchecks', (SELECT jsonb_build_object('verified', count(*) FILTER (WHERE matched), 'pending', count(*) FILTER (WHERE NOT matched))
     FROM checks)));
END $$;

REVOKE ALL ON FUNCTION private.commerce_minimised_facts(jsonb), private.commerce_observation_guard(), private.support_owner_session(),
 private.support_stage_blockers(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_support_retention_run(uuid), public.admin_support_readiness(),
 public.admin_support_set_stage(text,text,uuid), public.admin_support_metrics(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_retention_run(uuid), public.admin_support_readiness(),
 public.admin_support_set_stage(text,text,uuid), public.admin_support_metrics(text) TO authenticated;
