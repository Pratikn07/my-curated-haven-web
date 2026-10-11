-- Phase 3 UI, Task 4: the Customer support lane on the admin Home.
--
-- A narrow, same-person read of recent support outcomes: the repairs the caller ran or approved, and, for the owner,
-- their refunds and dispute notices, including ones still sending or unknown. Only safe facts leave: the operation,
-- its kind, the order and its support reference, a state code and when it last changed. No note, email, amount,
-- provider id or request or response body. A caller without support.read, or with support switched off, gets none.

CREATE FUNCTION public.admin_home_support_results(p_limit int) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor uuid; perms text[]; v_stage text; v_owner boolean;
BEGIN
 perms := private.admin_home_permissions();
 v_actor := auth.uid();
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT stage INTO v_stage FROM private.support_workspace_settings WHERE singleton;
 IF NOT ('support.read' = ANY(perms)) OR coalesce(v_stage, 'disabled') = 'disabled' THEN RETURN '[]'::jsonb; END IF;
 v_owner := EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = v_actor AND role = 'owner' AND active);
 RETURN coalesce((SELECT jsonb_agg(x.r ORDER BY x.at DESC, x.id DESC) FROM (
  SELECT u.r, u.at, u.id FROM (
   SELECT jsonb_build_object('operationId', so.operation_id, 'kind', 'repair', 'orderId', o.id, 'supportReference', o.support_reference,
     'state', private.support_operation_status(so)->>'state', 'at', private.commerce_utc(coalesce(so.committed_at, so.created_at))) r,
     coalesce(so.committed_at, so.created_at) at, so.operation_id id
   FROM private.support_operations so JOIN private.support_proposals sp ON sp.id = so.proposal_id
   JOIN private.purchase_orders o ON o.id = sp.order_id
   WHERE (so.actor = v_actor AND 'support.repair.execute' = ANY(perms))
     OR ('support.repair.approve' = ANY(perms) AND EXISTS (SELECT 1 FROM private.support_approvals a WHERE a.id = so.approval_id
       AND a.authoriser = v_actor))
   UNION ALL
   SELECT jsonb_build_object('operationId', i.operation_id, 'kind', 'refund', 'orderId', o.id, 'supportReference', o.support_reference,
     'state', CASE WHEN private.support_refund_lapsed(i) THEN 'expired' ELSE i.state END, 'at', private.commerce_utc(i.updated_at)),
     i.updated_at, i.operation_id
   FROM private.support_refund_intents i JOIN private.purchase_orders o ON o.id = i.order_id
   WHERE v_owner AND 'support.refund.prepare' = ANY(perms) AND i.actor = v_actor
   UNION ALL
   SELECT jsonb_build_object('operationId', s.operation_id, 'kind', 'notice', 'orderId', o.id, 'supportReference', o.support_reference,
     'state', s.state, 'at', private.commerce_utc(s.updated_at)), s.updated_at, s.operation_id
   FROM private.support_notice_sends s JOIN private.support_notices n ON n.id = s.notice_id JOIN private.purchase_orders o ON o.id = n.order_id
   WHERE v_owner AND 'support.notice.prepare' = ANY(perms) AND s.actor = v_actor
  ) u ORDER BY u.at DESC, u.id DESC LIMIT p_limit) x), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.admin_home_support_results(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_home_support_results(int) TO authenticated;
