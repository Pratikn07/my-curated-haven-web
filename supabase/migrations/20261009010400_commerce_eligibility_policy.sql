-- Phase 3: versioned purchase eligibility.
--
-- An order's refund and access policy versions map to approved rules only through this registry; nothing falls
-- back to a default, and older orders without a mapping stay blocked. No mapping is seeded here: each one needs the
-- owner's recorded approval. private.commerce_evaluate is the database twin of evaluatePurchase in
-- src/lib/payments/reconciliation/policy.ts; both are checked against the same case table. Installing this changes
-- no purchase, source or entitlement.

CREATE FUNCTION private.commerce_policy_valid(p jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_typeof(p) = 'object'
  AND (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p) k) = ARRAY['approved','duration','fixedSeconds','formalLost',
    'formalOpen','fullRefund','id','inquiry','partialRefund','pendingRefund','version']
  AND jsonb_typeof(p->'id') = 'string' AND jsonb_typeof(p->'version') = 'string' AND jsonb_typeof(p->'approved') = 'boolean'
  AND p->>'pendingRefund' = 'retain' AND p->>'partialRefund' = 'retain' AND p->>'fullRefund' = 'ineligible'
  AND p->>'inquiry' = 'retain' AND p->>'formalOpen' IN ('hold','retain') AND p->>'formalLost' = 'ineligible'
  AND ((p->>'duration' = 'indefinite' AND p->'fixedSeconds' = 'null')
    OR (p->>'duration' = 'fixed' AND jsonb_typeof(p->'fixedSeconds') = 'number' AND (p->>'fixedSeconds') ~ '^[1-9][0-9]{0,9}$'))
$$;

CREATE TABLE private.commerce_access_policies (
 refund_policy_version text NOT NULL CHECK (length(refund_policy_version) BETWEEN 1 AND 100),
 access_policy_version text NOT NULL CHECK (length(access_policy_version) BETWEEN 1 AND 100),
 policy jsonb NOT NULL CHECK (private.commerce_policy_valid(policy) AND (policy->>'approved')::boolean),
 approved_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 approved_at timestamptz NOT NULL DEFAULT now(),
 evidence text NOT NULL CHECK (length(trim(evidence)) BETWEEN 1 AND 1000),
 PRIMARY KEY (refund_policy_version, access_policy_version)
);
CREATE TRIGGER commerce_access_policies_immutable BEFORE UPDATE OR DELETE ON private.commerce_access_policies
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
ALTER TABLE private.commerce_access_policies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.commerce_access_policies FROM PUBLIC, anon, authenticated;

-- The approved rules for an order's versions, or NULL when no mapping was approved.
CREATE FUNCTION private.commerce_policy_for(p_refund_version text, p_access_version text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT policy FROM private.commerce_access_policies
 WHERE refund_policy_version = p_refund_version AND access_policy_version = p_access_version
$$;

CREATE FUNCTION private.commerce_utc(p_at timestamptz) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT to_char(p_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

-- Input: {facts, binding, policy, accountActive, manualHold, now}; output: {state, reasons, validFrom, expiresAt}.
CREATE FUNCTION private.commerce_evaluate(p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE facts jsonb := p_input->'facts'; b jsonb := p_input->'binding'; pol jsonb := p_input->'policy';
 now_at timestamptz := (p_input->>'now')::timestamptz; blockers text[] := '{}'; exclusions text[] := '{}';
 notes text[] := '{}'; paid boolean := facts->>'paymentState' = 'paid'; paid_at timestamptz; captured numeric;
 refunded numeric; d jsonb; expires timestamptz; result_state text; reasons text[];
BEGIN
 IF b->>'accountId' IS DISTINCT FROM facts->>'accountId' THEN blockers := blockers || 'account_mismatch'::text; END IF;
 IF b->>'mode' IS DISTINCT FROM facts->>'mode' THEN blockers := blockers || 'mode_mismatch'::text; END IF;
 IF b->'sessionId' <> 'null' AND facts->'sessionId' <> 'null' AND b->>'sessionId' <> facts->>'sessionId' THEN
  blockers := blockers || 'session_mismatch'::text;
 END IF;
 IF b->'expectedCapturedMinor' = 'null' OR b->'currency' = 'null' THEN blockers := blockers || 'binding_incomplete'::text; END IF;
 IF facts->'capturedMinor' <> 'null' AND b->'expectedCapturedMinor' <> 'null'
   AND (facts->>'capturedMinor')::numeric <> (b->>'expectedCapturedMinor')::numeric THEN
  blockers := blockers || 'amount_mismatch'::text;
 END IF;
 IF facts->'currency' <> 'null' AND b->'currency' <> 'null' AND facts->>'currency' <> b->>'currency' THEN
  blockers := blockers || 'currency_mismatch'::text;
 END IF;
 IF pol IS NULL OR pol = 'null' OR NOT coalesce((pol->>'approved')::boolean, false) THEN
  blockers := blockers || 'policy_missing'::text;
 END IF;
 IF facts->>'paymentState' = 'unknown' THEN blockers := blockers || 'payment_unknown'::text; END IF;

 -- Exact repeats collapse; one id with different content is a conflict.
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(facts->'refunds') x GROUP BY x->>'id' HAVING count(DISTINCT x) > 1) THEN
  blockers := blockers || 'refund_conflict'::text;
 END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(facts->'disputes') x GROUP BY x->>'id' HAVING count(DISTINCT x) > 1) THEN
  blockers := blockers || 'dispute_conflict'::text;
 END IF;
 IF EXISTS (SELECT 1 FROM (SELECT x FROM jsonb_array_elements(facts->'refunds') x UNION SELECT x FROM jsonb_array_elements(facts->'disputes') x) a
   WHERE jsonb_typeof(x->'amountMinor') <> 'number' OR (x->>'amountMinor') !~ '^[1-9][0-9]{0,15}$') THEN
  blockers := blockers || 'amount_invalid'::text;
 END IF;
 IF facts->'currency' <> 'null' AND EXISTS (SELECT 1 FROM (SELECT x FROM jsonb_array_elements(facts->'refunds') x
   UNION SELECT x FROM jsonb_array_elements(facts->'disputes') x) a WHERE x->>'currency' IS DISTINCT FROM facts->>'currency') THEN
  blockers := blockers || 'currency_mismatch'::text;
 END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(facts->'disputes') x WHERE x->>'classification' = 'unknown') THEN
  blockers := blockers || 'dispute_unknown'::text;
 END IF;

 IF facts->>'paymentState' IN ('unpaid','processing','failed') THEN exclusions := exclusions || 'not_paid'::text; END IF;
 IF paid AND facts->'capturedMinor' <> 'null' THEN
  captured := (facts->>'capturedMinor')::numeric;
  SELECT coalesce(sum((x->>'amountMinor')::numeric), 0) INTO refunded
   FROM (SELECT DISTINCT x FROM jsonb_array_elements(facts->'refunds') x) r
   WHERE x->>'status' = 'succeeded' AND (x->>'amountMinor') ~ '^[1-9][0-9]{0,15}$';
  IF refunded >= captured THEN exclusions := exclusions || 'fully_refunded'::text; END IF;
 END IF;
 FOR d IN SELECT DISTINCT x FROM jsonb_array_elements(facts->'disputes') x WHERE x->>'classification' = 'formal' LOOP
  IF d->>'status' = 'lost' THEN exclusions := exclusions || 'dispute_lost'::text;
  ELSIF d->>'status' IN ('needs_response','under_review') THEN
   IF pol->>'formalOpen' = 'hold' THEN exclusions := exclusions || 'dispute_hold'::text; ELSE notes := notes || 'dispute_open'::text; END IF;
  -- Closed without a loss: won, closed because the charge was refunded (the refund decides), or prevented.
  ELSIF d->>'status' NOT IN ('won','charge_refunded','prevented') THEN blockers := blockers || 'dispute_unknown'::text;
  END IF;
 END LOOP;
 IF NOT coalesce((p_input->>'accountActive')::boolean, false) THEN exclusions := exclusions || 'account_inactive'::text; END IF;
 IF coalesce((p_input->>'manualHold')::boolean, true) THEN exclusions := exclusions || 'manual_hold'::text; END IF;

 IF paid AND facts->'paidAt' <> 'null' THEN paid_at := (facts->>'paidAt')::timestamptz; END IF;
 IF paid_at IS NOT NULL AND pol->>'duration' = 'fixed' THEN
  IF jsonb_typeof(pol->'fixedSeconds') <> 'number' OR (pol->>'fixedSeconds') !~ '^[1-9][0-9]{0,9}$' THEN
   blockers := blockers || 'policy_missing'::text;
  ELSE
   expires := paid_at + make_interval(secs => (pol->>'fixedSeconds')::numeric);
   IF now_at >= expires THEN exclusions := exclusions || 'expired'::text; END IF;
  END IF;
 END IF;

 result_state := CASE WHEN cardinality(blockers) > 0 THEN 'blocked' WHEN cardinality(exclusions) > 0 THEN 'ineligible' ELSE 'eligible' END;
 SELECT coalesce(array_agg(r ORDER BY r COLLATE "C"), '{}') INTO reasons
  FROM (SELECT DISTINCT r FROM unnest(blockers || exclusions || CASE WHEN result_state = 'eligible' THEN notes ELSE '{}'::text[] END) r) x;
 RETURN jsonb_build_object('state', result_state, 'reasons', to_jsonb(reasons),
  'validFrom', CASE WHEN paid_at IS NULL THEN NULL ELSE private.commerce_utc(paid_at) END,
  'expiresAt', CASE WHEN expires IS NULL THEN NULL ELSE private.commerce_utc(expires) END);
END $$;

REVOKE ALL ON FUNCTION private.commerce_policy_valid(jsonb), private.commerce_policy_for(text,text), private.commerce_utc(timestamptz),
 private.commerce_evaluate(jsonb) FROM PUBLIC, anon, authenticated;
