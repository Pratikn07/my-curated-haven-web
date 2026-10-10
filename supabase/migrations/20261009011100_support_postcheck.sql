-- Phase 3: confirming what a repair did.
--
-- After a repair commits, `admin_support_postcheck` reads the customer's current rights with the same rules their
-- pages use (purchase source eligibility and collection access) and compares them with the receipt. A match marks the
-- receipt verified. A mismatch keeps it pending and opens one follow-up case for a person to look at; it never starts
-- another repair. Nothing is accepted from the caller except the operation id, and the check never signs in as, or
-- speaks for, the customer.

CREATE TABLE private.support_postchecks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 operation_id uuid NOT NULL REFERENCES private.support_operations(operation_id) ON DELETE RESTRICT,
 actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 matched boolean NOT NULL,
 observed jsonb NOT NULL,
 follow_up_case_id uuid REFERENCES private.support_cases(id) ON DELETE RESTRICT,
 checked_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX support_postchecks_operation ON private.support_postchecks(operation_id, checked_at DESC);
CREATE TRIGGER support_postchecks_immutable BEFORE UPDATE OR DELETE ON private.support_postchecks
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
ALTER TABLE private.support_postchecks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.support_postchecks FROM PUBLIC, anon, authenticated;

-- Receipts now report the latest post-check: verified after a match, pending otherwise.
CREATE OR REPLACE FUNCTION private.support_operation_status(o private.support_operations) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_job private.commerce_verification_jobs;
BEGIN
 IF o.state = 'committed' THEN
  RETURN o.receipt || jsonb_build_object('verification', coalesce((SELECT CASE WHEN matched THEN 'verified' ELSE 'pending' END
   FROM private.support_postchecks WHERE operation_id = o.operation_id ORDER BY checked_at DESC, id DESC LIMIT 1), 'pending'));
 END IF;
 SELECT * INTO v_job FROM private.commerce_verification_jobs WHERE id = o.job_id;
 IF v_job.state = 'failed' THEN
  RETURN jsonb_build_object('operationId', o.operation_id, 'state', 'failed_no_commit', 'reasonCode', v_job.failure_code);
 END IF;
 IF EXISTS (SELECT 1 FROM private.support_approvals a WHERE a.id = o.approval_id AND a.expires_at <= clock_timestamp()) THEN
  RETURN jsonb_build_object('operationId', o.operation_id, 'state', 'blocked', 'reasonCode', 'APPROVAL_EXPIRED');
 END IF;
 RETURN jsonb_build_object('operationId', o.operation_id, 'state', 'checking', 'reasonCode', NULL);
END $$;

CREATE FUNCTION public.admin_support_postcheck(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; o private.support_operations; v_order private.purchase_orders; v_now jsonb; v_expected jsonb; v_matched boolean;
 v_case uuid;
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 SELECT * INTO o FROM private.support_operations WHERE operation_id = p_operation_id;
 IF NOT FOUND OR (o.actor <> actor AND NOT private.support_has(actor, 'support.repair.approve')) THEN
  RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND';
 END IF;
 IF o.state <> 'committed' THEN RETURN private.support_operation_status(o); END IF;
 SELECT * INTO v_order FROM private.purchase_orders WHERE id = (o.receipt->>'orderId')::uuid;
 v_expected := (SELECT jsonb_build_object('eligible', (e->>'afterEligible')::boolean, 'effective', e->>'afterEffective')
  FROM jsonb_array_elements(o.receipt->'effects') e LIMIT 1);
 IF v_order.user_id IS NULL THEN
  -- The account has closed since; there is no one whose access could be confirmed.
  v_now := jsonb_build_object('eligible', false, 'effective', 'denied', 'account', 'closed');
  v_matched := false;
 ELSE
  v_now := private.support_effect_now(v_order);
  v_matched := v_expected IS NULL OR v_now = v_expected;
 END IF;
 IF NOT v_matched THEN
  -- One follow-up case per operation, for a person; never another repair.
  SELECT follow_up_case_id INTO v_case FROM private.support_postchecks WHERE operation_id = o.operation_id
   AND follow_up_case_id IS NOT NULL LIMIT 1;
  IF v_case IS NULL THEN
   INSERT INTO private.support_cases(order_id, user_id, category, state, created_by)
   VALUES (v_order.id, coalesce(v_order.user_id, v_order.owner_principal), 'missing_access', 'open', actor) RETURNING id INTO v_case;
   INSERT INTO private.support_case_events(case_id, action, actor_id, state, operation_id)
   VALUES (v_case, 'create', actor, 'open', gen_random_uuid());
  END IF;
 END IF;
 INSERT INTO private.support_postchecks(operation_id, actor, matched, observed, follow_up_case_id)
 VALUES (o.operation_id, actor, v_matched, v_now, CASE WHEN v_matched THEN NULL ELSE v_case END);
 RETURN private.support_operation_status(o);
END $$;

REVOKE ALL ON FUNCTION public.admin_support_postcheck(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_postcheck(uuid) TO authenticated;
