-- Phase 3: human approval bound to one exact proposal.
--
-- The approver is the signed-in session (auth.uid(), aal2) with the approve permission while the support stage is
-- `repair`; no approver is ever taken from the request. The approval names the proposal's digest, and is refused when
-- the digest differs, the proposal has expired or has blockers, or the order, its owner, the evidence or the access it
-- depends on changed since preparation. One approval per proposal; approvals cannot be edited and never outlive the
-- proposal. Execution (Task 15) checks the approver's authority again when it commits.

CREATE TABLE private.support_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 proposal_id uuid NOT NULL UNIQUE REFERENCES private.support_proposals(id) ON DELETE RESTRICT,
 digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
 authoriser uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 channel text NOT NULL CHECK (channel IN ('web','operator')),
 -- Operator approvals name the registered login that recorded the human's answer and a short reference to where the
 -- answer was given (never a transcript). Web approvals have neither.
 attested_by text CHECK (attested_by IS NULL OR attested_by ~ '^[a-z_][a-z0-9_]{0,62}$'),
 evidence_reference text CHECK (evidence_reference IS NULL OR length(btrim(evidence_reference)) BETWEEN 1 AND 200),
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 CHECK ((channel = 'operator') = (attested_by IS NOT NULL AND evidence_reference IS NOT NULL))
);
CREATE TRIGGER support_approvals_immutable BEFORE UPDATE OR DELETE ON private.support_approvals
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
ALTER TABLE private.support_approvals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.support_approvals FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.support_approval_json(a private.support_approvals) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id', a.id, 'proposalId', a.proposal_id, 'digest', a.digest, 'humanAuthoriser', a.authoriser,
  'approvedAt', private.commerce_utc(a.approved_at), 'expiresAt', private.commerce_utc(a.expires_at), 'channel', a.channel)
$$;

-- Whether a proposal still describes the order as it is: same version and owner, its evidence still the newest
-- complete answer, and the access it depends on unchanged.
CREATE FUNCTION private.support_proposal_current(p private.support_proposals) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_order private.purchase_orders; v_obs private.commerce_provider_observations;
BEGIN
 SELECT * INTO v_order FROM private.purchase_orders WHERE id = p.order_id;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p.observation_id;
 RETURN v_order.version = (p.proposal->>'expectedOrderVersion')::int
  AND v_order.user_id IS NOT DISTINCT FROM (p.proposal->>'userId')::uuid
  AND NOT EXISTS (SELECT 1 FROM private.commerce_provider_observations n WHERE n.order_id = p.order_id AND n.complete
    AND n.fence > v_obs.fence)
  AND private.support_access_explanation(v_order.user_id, private.support_order_collection(v_order))->>'dependencyToken'
    = p.proposal->>'dependencyToken';
END $$;

CREATE FUNCTION public.admin_support_approve(p_proposal_id uuid, p_digest text, p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; v_receipt jsonb; p private.support_proposals; a private.support_approvals;
BEGIN
 actor := private.support_assert('support.repair.approve', 'repair');
 IF p_proposal_id IS NULL OR p_digest IS NULL OR p_operation_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 v_receipt := private.admin_begin_operation(actor, p_operation_id, 'support.approve', p_proposal_id,
  jsonb_build_object('digest', p_digest));
 IF v_receipt IS NOT NULL THEN
  SELECT * INTO a FROM private.support_approvals WHERE id = (v_receipt->>'approvalId')::uuid;
  RETURN private.support_approval_json(a);
 END IF;
 SELECT * INTO p FROM private.support_proposals WHERE id = p_proposal_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF p.digest IS DISTINCT FROM p_digest OR p.expires_at <= clock_timestamp() THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 IF p.blocked THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 IF EXISTS (SELECT 1 FROM private.support_approvals WHERE proposal_id = p.id) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF NOT private.support_proposal_current(p) THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
 INSERT INTO private.support_approvals(proposal_id, digest, authoriser, channel, expires_at)
 VALUES (p.id, p.digest, actor, 'web', p.expires_at) RETURNING * INTO a;
 PERFORM private.admin_finish_operation(actor, p_operation_id, jsonb_build_object('approvalId', a.id));
 RETURN private.support_approval_json(a);
END $$;

-- An order's proposals with their approval state, newest first, for staff who may read support. Expired, blocked and
-- unapproved proposals stay readable.
CREATE FUNCTION public.admin_support_proposals(p_order_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 IF p_order_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('proposal', p.proposal,
   'state', CASE WHEN a.id IS NOT NULL THEN 'approved' WHEN p.blocked THEN 'blocked'
     WHEN p.expires_at <= clock_timestamp() THEN 'expired' ELSE 'awaiting_approval' END,
   'approval', CASE WHEN a.id IS NULL THEN NULL ELSE private.support_approval_json(a) END,
   'preparedAt', private.commerce_utc(p.prepared_at)) ORDER BY p.prepared_at DESC, p.id), '[]')
  FROM (SELECT * FROM private.support_proposals WHERE order_id = p_order_id ORDER BY prepared_at DESC, id LIMIT 25) p
  LEFT JOIN private.support_approvals a ON a.proposal_id = p.id);
END $$;

REVOKE ALL ON FUNCTION private.support_approval_json(private.support_approvals), private.support_proposal_current(private.support_proposals)
 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_support_approve(uuid,text,uuid), public.admin_support_proposals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_approve(uuid,text,uuid), public.admin_support_proposals(uuid) TO authenticated;
