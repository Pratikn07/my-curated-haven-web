-- Phase 3: exact, immutable repair proposals.
--
-- A support operator with provider inspection prepares a repair of one order from one recorded observation. The
-- database works out the effects itself: for `reconcile_order` it runs the shared reconciliation writer on that
-- evidence and rolls it back, so the preview is exactly what the writer would do now; for `rebuild_projection` it
-- reprojects access the same way and rolls back, leaving payment facts and purchase sources alone. Nothing submitted
-- by the caller becomes a before or after fact. The proposal, its blockers and its digest are stored and cannot be
-- changed; a different repair is a new proposal. Proposals expire five minutes after preparation.

CREATE TABLE private.support_proposals (
 id uuid PRIMARY KEY,
 actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 operation_id uuid NOT NULL,
 order_id uuid NOT NULL REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
 observation_id uuid NOT NULL REFERENCES private.commerce_provider_observations(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK (kind IN ('reconcile_order','rebuild_projection')),
 channel text NOT NULL DEFAULT 'web' CHECK (channel IN ('web','operator')),
 proposal jsonb NOT NULL,
 digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
 blocked boolean NOT NULL,
 prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 UNIQUE (actor, operation_id)
);
CREATE INDEX support_proposals_order ON private.support_proposals(order_id, prepared_at DESC);
CREATE TRIGGER support_proposals_immutable BEFORE UPDATE OR DELETE ON private.support_proposals
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();
ALTER TABLE private.support_proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.support_proposals FROM PUBLIC, anon, authenticated;

-- The approved material of a proposal: everything except its own id, the observation that supplied the evidence
-- (its facts are covered by materialDigest), the digest itself and the expiry.
CREATE FUNCTION private.support_proposal_material(p_proposal jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT p_proposal - 'id' - 'observationId' - 'digest' - 'expiresAt'
$$;

CREATE FUNCTION public.admin_support_prepare(p_order_id uuid, p_observation_id uuid, p_kind text, p_reason text,
  p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 actor uuid; v_receipt jsonb; v_order private.purchase_orders; v_obs private.commerce_provider_observations;
 v_job private.commerce_verification_jobs; v_source private.access_sources; v_binding jsonb; v_policy jsonb; v_sim jsonb;
 v_effects jsonb; v_blockers text[] := '{}'; v_collection uuid; v_dependency text; v_proposal jsonb; v_digest text;
 v_id uuid := gen_random_uuid(); v_now timestamptz := clock_timestamp(); v_reason text := btrim(p_reason);
 v_before boolean; v_after boolean;
BEGIN
 actor := private.support_assert('support.repair.prepare', 'repair');
 -- Preparing from provider evidence also needs the right to see it.
 IF NOT private.support_has(actor, 'support.provider.inspect') THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED'; END IF;
 IF p_order_id IS NULL OR p_observation_id IS NULL OR p_operation_id IS NULL OR p_kind IS NULL
   OR p_kind NOT IN ('reconcile_order','rebuild_projection') OR v_reason IS NULL OR length(v_reason) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 v_receipt := private.admin_begin_operation(actor, p_operation_id, 'support.prepare', p_order_id,
  jsonb_build_object('observationId', p_observation_id, 'kind', p_kind, 'reason', v_reason));
 IF v_receipt IS NOT NULL THEN
  RETURN (SELECT proposal FROM private.support_proposals WHERE id = (v_receipt->>'proposalId')::uuid);
 END IF;

 SELECT * INTO v_order FROM private.purchase_orders WHERE id = p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 -- A closed account is not repaired here: its purchases stay with the closed principal.
 IF v_order.user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p_observation_id AND order_id = p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO v_job FROM private.commerce_verification_jobs WHERE id = v_obs.job_id;
 -- Evidence about an order that has changed since, or older than a newer complete answer, is not prepared from.
 IF v_job.expected_order_version <> v_order.version OR EXISTS (SELECT 1 FROM private.commerce_provider_observations n
   WHERE n.order_id = v_order.id AND n.complete AND n.fence > v_obs.fence) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;

 v_binding := private.commerce_order_binding(v_order.id);
 v_policy := private.commerce_policy_for(v_binding->>'refundPolicyVersion', v_binding->>'accessPolicyVersion');
 v_collection := private.support_order_collection(v_order);
 v_dependency := private.support_access_explanation(v_order.user_id, v_collection)->>'dependencyToken';
 SELECT * INTO v_source FROM private.access_sources WHERE source_kind = 'stripe_purchase' AND source_id = v_order.id::text
  AND release_id = v_order.release_id;

 IF p_kind = 'reconcile_order' THEN
  -- What the shared writer would do with this evidence now: run it, keep its answer, roll it back.
  BEGIN
   v_sim := private.commerce_reconcile_core(jsonb_build_object('actor', 'human', 'actorId', actor, 'approvalId', v_id,
    'eventId', NULL, 'fence', v_obs.fence, 'orderId', v_order.id, 'purpose', v_obs.purpose), v_obs.id, gen_random_uuid());
   RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='SUPPORT_PREVIEW';
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'SUPPORT_PREVIEW' THEN RAISE; END IF;
  END;
  v_effects := v_sim->'effects';
  IF v_sim->>'state' = 'blocked' THEN
   v_blockers := v_blockers || ARRAY(SELECT jsonb_array_elements_text(v_sim->'reasons'));
  ELSIF v_sim->>'state' = 'already_satisfied' THEN
   v_blockers := v_blockers || 'no_change'::text;
  END IF;
  -- Access is never restored while a formal dispute is open, whatever the policy would keep.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_effects) e WHERE (e->>'afterEligible')::boolean
      AND NOT coalesce((e->>'beforeEligible')::boolean, false))
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_obs.facts->'disputes') d WHERE d->>'classification' = 'formal'
      AND d->>'status' IN ('needs_response','under_review')) THEN
   v_blockers := v_blockers || 'dispute_open'::text;
  END IF;
 ELSE
  -- Rebuild the projection only: purchase sources and payment facts are not touched.
  v_before := private.collection_has_access(v_order.user_id, v_collection);
  BEGIN
   PERFORM private.project_user_entitlement(v_order.user_id, v_order.release_id);
   v_after := private.collection_has_access(v_order.user_id, v_collection);
   RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='SUPPORT_PREVIEW';
  EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'SUPPORT_PREVIEW' THEN RAISE; END IF;
  END;
  v_effects := jsonb_build_array(jsonb_build_object('sourceId', v_order.id,
   'beforeEligible', CASE WHEN v_source.id IS NULL THEN NULL ELSE v_source.is_eligible END,
   'afterEligible', coalesce(v_source.is_eligible, false),
   'beforeEffective', CASE WHEN v_before THEN 'active' ELSE 'denied' END,
   'afterEffective', CASE WHEN v_after THEN 'active' ELSE 'denied' END,
   'recipeIds', (SELECT coalesce(jsonb_agg(cr.recipe_id ORDER BY cr.position), '[]') FROM public.collection_recipes cr
     WHERE cr.release_id = v_order.release_id),
   'notification', 'none'));
  IF v_before = v_after THEN v_blockers := v_blockers || 'no_change'::text; END IF;
 END IF;
 IF NOT v_obs.complete THEN v_blockers := v_blockers || 'evidence_incomplete'::text; END IF;

 SELECT coalesce(array_agg(DISTINCT b ORDER BY b), '{}') INTO v_blockers FROM unnest(v_blockers) b;
 v_proposal := jsonb_build_object('id', v_id, 'orderId', v_order.id, 'userId', v_order.user_id,
  'ownerPrincipal', v_order.owner_principal, 'binding', v_binding, 'kind', p_kind, 'observationId', v_obs.id,
  'materialDigest', v_obs.material_digest, 'expectedOrderVersion', v_order.version, 'dependencyToken', v_dependency,
  'policyVersion', coalesce(v_policy->>'version', 'none'), 'effects', coalesce(v_effects, '[]'), 'blockers', to_jsonb(v_blockers),
  'expiresAt', private.commerce_utc(v_now + interval '300 seconds'), 'reason', v_reason);
 v_digest := private.support_digest(private.support_proposal_material(v_proposal));
 v_proposal := v_proposal || jsonb_build_object('digest', v_digest);
 INSERT INTO private.support_proposals(id, actor, operation_id, order_id, observation_id, kind, proposal, digest, blocked, prepared_at,
  expires_at)
 VALUES (v_id, actor, p_operation_id, v_order.id, v_obs.id, p_kind, v_proposal, v_digest, cardinality(v_blockers) > 0, v_now,
  v_now + interval '300 seconds');
 PERFORM private.admin_finish_operation(actor, p_operation_id, jsonb_build_object('proposalId', v_id));
 RETURN v_proposal;
END $$;

REVOKE ALL ON FUNCTION private.support_proposal_material(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_support_prepare(uuid,uuid,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_prepare(uuid,uuid,text,text,uuid) TO authenticated;
