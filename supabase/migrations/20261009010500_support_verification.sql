-- Phase 3: trusted provider observations through fenced verification jobs.
--
-- Staff with provider inspection ask for a check (admin_support_diagnose_begin). A registered verifier login (the
-- server's restricted database connection, identified by session_user) claims the job with a 30-second lease and
-- an increasing fence, reads Stripe outside any transaction, and records the normalised facts only while its lease,
-- fence, the order's version and the requester's authority all still hold. Observations are immutable. Nothing here
-- writes payments, sources, entitlements or the outbox. No migration registers a real verifier login.

CREATE TABLE private.commerce_verifier_principals (
 principal text PRIMARY KEY CHECK (principal ~ '^[a-z_][a-z0-9_]{0,62}$'),
 label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
 registered_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 registered_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);

CREATE SEQUENCE private.commerce_verification_fence;

CREATE TABLE private.commerce_verification_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
 purpose text NOT NULL CHECK (purpose IN ('diagnosis','execution','webhook','recovery','refund_prepare','refund_dispatch','notice_send')),
 requested_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
 operation_id uuid,
 expected_order_version integer NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','claimed','complete','failed')),
 lease_until timestamptz,
 fence bigint NOT NULL DEFAULT 0,
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
 verifier text,
 failure_code text CHECK (failure_code IS NULL OR failure_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
 observation_id uuid,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 completed_at timestamptz
);
-- One live check per order; an expired lease is retried under a new fence, never run in parallel.
CREATE UNIQUE INDEX commerce_verification_one_live ON private.commerce_verification_jobs(order_id)
 WHERE state IN ('pending','claimed');

-- The facts a verifier may record: exactly the FinancialFacts shape, with typed fields.
CREATE FUNCTION private.commerce_facts_valid(f jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_typeof(f) = 'object'
  AND (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(f) k) = ARRAY['accountId','capturedMinor','chargeId','currency',
    'disputes','mode','paidAt','paymentIntentId','paymentState','refunds','sessionId']
  AND (f->>'accountId') ~ '^acct_[A-Za-z0-9_]{1,64}$' AND f->>'mode' IN ('test','live')
  AND f->>'paymentState' IN ('unpaid','processing','paid','failed','unknown')
  AND jsonb_typeof(f->'refunds') = 'array' AND jsonb_typeof(f->'disputes') = 'array'
  AND (f->'capturedMinor' = 'null' OR (f->>'capturedMinor') ~ '^[0-9]{1,15}$')
  AND (f->'currency' = 'null' OR (f->>'currency') ~ '^[a-z]{3}$')
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(f->'refunds') r WHERE jsonb_typeof(r) <> 'object'
    OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(r) k) <> ARRAY['amountMinor','chargeId','currency','id',
      'occurredAt','paymentIntentId','status'])
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(f->'disputes') d WHERE jsonb_typeof(d) <> 'object'
    OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(d) k) <> ARRAY['amountMinor','chargeId','classification',
      'currency','deadline','id','paymentIntentId','status']
    -- The deadline is stored as a timestamp, so only an exact UTC time (or none) is accepted.
    OR NOT (d->'deadline' = 'null' OR (d->>'deadline') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$'))
$$;

CREATE TABLE private.commerce_provider_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL UNIQUE REFERENCES private.commerce_verification_jobs(id) ON DELETE RESTRICT,
 order_id uuid NOT NULL REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
 fence bigint NOT NULL,
 purpose text NOT NULL,
 facts jsonb NOT NULL CHECK (private.commerce_facts_valid(facts)),
 complete boolean NOT NULL,
 blockers jsonb NOT NULL CHECK (jsonb_typeof(blockers) = 'array'),
 material_digest text NOT NULL CHECK (material_digest ~ '^[0-9a-f]{64}$'),
 api_version text NOT NULL CHECK (length(api_version) BETWEEN 1 AND 40),
 verifier text NOT NULL,
 verified_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX commerce_provider_observations_order ON private.commerce_provider_observations(order_id, verified_at DESC);
CREATE TRIGGER commerce_provider_observations_immutable BEFORE UPDATE OR DELETE ON private.commerce_provider_observations
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();

ALTER TABLE private.commerce_verifier_principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.commerce_verification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.commerce_provider_observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.commerce_verifier_principals, private.commerce_verification_jobs, private.commerce_provider_observations
 FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.commerce_verifier() RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE found text;
BEGIN
 SELECT principal INTO found FROM private.commerce_verifier_principals WHERE principal = session_user::text AND revoked_at IS NULL;
 IF found IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED'; END IF;
 RETURN found;
END $$;

-- Database-owner steps (runbook); no grants.
CREATE FUNCTION private.commerce_verifier_register(p_principal text, p_label text, p_owner uuid) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = p_owner AND active AND role = 'owner') THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
 INSERT INTO private.commerce_verifier_principals(principal, label, registered_by) VALUES (p_principal, p_label, p_owner);
END $$;
CREATE FUNCTION private.commerce_verifier_revoke(p_principal text) RETURNS void
LANGUAGE sql SET search_path='' AS $$
 UPDATE private.commerce_verifier_principals SET revoked_at = now() WHERE principal = p_principal AND revoked_at IS NULL
$$;

-- An order's frozen binding, as support and the verifier use it.
CREATE FUNCTION private.commerce_order_binding(p_order_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('orderId', o.id, 'userId', o.user_id, 'ownerPrincipal', o.owner_principal,
   'collectionId', private.support_order_collection(o), 'releaseId', o.release_id, 'sessionId', o.session_id,
   'accountId', o.snapshot->>'provider_account_id', 'mode', o.snapshot->>'provider_mode',
   'expectedCapturedMinor', (o.snapshot->>'price_minor')::int, 'currency', o.snapshot->>'currency',
   'manifestHash', coalesce(o.snapshot->>'manifest_hash', (SELECT manifest_checksum FROM private.release_manifests WHERE release_id = o.release_id)),
   'refundPolicyVersion', o.snapshot->>'refund_policy_version', 'accessPolicyVersion', o.snapshot->>'access_policy_version',
   'version', o.version)
 FROM private.purchase_orders o WHERE o.id = p_order_id
$$;

-- Staff ask for a provider check of one order. Repeating the operation returns the same job; a live check for the
-- order is joined rather than duplicated.
CREATE FUNCTION public.admin_support_diagnose_begin(p_order_id uuid, p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; receipt jsonb; o private.purchase_orders; job private.commerce_verification_jobs;
BEGIN
 actor := private.support_assert('support.provider.inspect', 'diagnosis');
 IF p_order_id IS NULL OR p_operation_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 receipt := private.admin_begin_operation(actor, p_operation_id, 'support.diagnose', p_order_id, '{}'::jsonb);
 IF receipt IS NOT NULL THEN RETURN receipt; END IF;
 SELECT * INTO o FROM private.purchase_orders WHERE id = p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF NOT private.support_consume_budget(actor, 'provider_check') THEN
  RAISE EXCEPTION USING ERRCODE='PT429', MESSAGE='ADM_RATE_LIMITED';
 END IF;
 SELECT * INTO job FROM private.commerce_verification_jobs WHERE order_id = p_order_id AND state IN ('pending','claimed') FOR UPDATE;
 IF NOT FOUND THEN
  INSERT INTO private.commerce_verification_jobs(order_id, purpose, requested_by, operation_id, expected_order_version)
  VALUES (p_order_id, 'diagnosis', actor, p_operation_id, o.version) RETURNING * INTO job;
 END IF;
 receipt := jsonb_build_object('jobId', job.id);
 PERFORM private.admin_finish_operation(actor, p_operation_id, receipt);
 RETURN receipt;
END $$;

-- The verifier claims a job: a 30-second lease and a new fence. A live lease held by another claim is a conflict.
CREATE FUNCTION private.commerce_verification_claim(p_job_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); job private.commerce_verification_jobs;
BEGIN
 PERFORM set_config('lock_timeout', '5000', true);
 SELECT * INTO job FROM private.commerce_verification_jobs WHERE id = p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF job.state = 'complete' THEN RETURN jsonb_build_object('state', 'complete', 'observationId', job.observation_id); END IF;
 IF job.state = 'failed' OR job.attempts >= 10 THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 IF job.state = 'claimed' AND job.lease_until > clock_timestamp() THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 UPDATE private.commerce_verification_jobs SET state = 'claimed', lease_until = clock_timestamp() + interval '30 seconds',
  fence = nextval('private.commerce_verification_fence'), attempts = attempts + 1, verifier = v_verifier
 WHERE id = p_job_id RETURNING * INTO job;
 RETURN jsonb_build_object('state', 'claimed', 'jobId', job.id, 'fence', job.fence, 'leaseUntil', job.lease_until,
  'purpose', job.purpose, 'binding', private.commerce_order_binding(job.order_id));
END $$;

-- Record what the provider said, only if this claim still holds and nothing it depended on has changed.
CREATE FUNCTION private.commerce_observation_record(p_job_id uuid, p_fence bigint, p_facts jsonb, p_complete boolean,
  p_blockers jsonb, p_api_version text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); job private.commerce_verification_jobs; o private.purchase_orders;
 material jsonb; observation uuid;
BEGIN
 PERFORM set_config('lock_timeout', '5000', true);
 SELECT * INTO job FROM private.commerce_verification_jobs WHERE id = p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF job.state <> 'claimed' OR job.fence <> p_fence OR job.verifier IS DISTINCT FROM v_verifier
   OR job.lease_until <= clock_timestamp() THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 SELECT * INTO o FROM private.purchase_orders WHERE id = job.order_id;
 IF o.version <> job.expected_order_version THEN
  UPDATE private.commerce_verification_jobs SET state = 'failed', failure_code = 'ORDER_CHANGED', completed_at = clock_timestamp()
  WHERE id = job.id;
  RETURN jsonb_build_object('state', 'failed', 'code', 'ORDER_CHANGED');
 END IF;
 -- A staff check is recorded only while the person who asked for it still holds the right it was asked under.
 IF (job.purpose = 'diagnosis' AND NOT private.support_has(job.requested_by, 'support.provider.inspect'))
   OR (job.purpose = 'refund_prepare' AND NOT private.support_has(job.requested_by, 'support.refund.prepare'))
   OR (job.purpose = 'refund_dispatch' AND NOT private.support_has(job.requested_by, 'support.refund.execute'))
   OR (job.purpose = 'notice_send' AND NOT private.support_has(job.requested_by, 'support.notice.send')) THEN
  UPDATE private.commerce_verification_jobs SET state = 'failed', failure_code = 'REQUESTER_REVOKED', completed_at = clock_timestamp()
  WHERE id = job.id;
  RETURN jsonb_build_object('state', 'failed', 'code', 'REQUESTER_REVOKED');
 END IF;
 IF NOT coalesce(private.commerce_facts_valid(p_facts), false) OR p_complete IS NULL OR jsonb_typeof(p_blockers) IS DISTINCT FROM 'array'
   OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_blockers) b WHERE b !~ '^[a-z][a-z0-9_]{1,63}$')
   OR (p_complete AND jsonb_array_length(p_blockers) > 0) OR p_api_version IS NULL OR length(p_api_version) NOT BETWEEN 1 AND 40 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 -- The digest covers the facts only, with exact repeats removed and refunds and disputes in identity order, as
 -- materialFactsDigest computes it in TypeScript.
 material := jsonb_set(jsonb_set(p_facts,
   '{refunds}', (SELECT coalesce(jsonb_agg(x ORDER BY x->>'id' COLLATE "C"), '[]')
     FROM (SELECT DISTINCT x FROM jsonb_array_elements(p_facts->'refunds') x) r)),
   '{disputes}', (SELECT coalesce(jsonb_agg(x ORDER BY x->>'id' COLLATE "C"), '[]')
     FROM (SELECT DISTINCT x FROM jsonb_array_elements(p_facts->'disputes') x) d));
 INSERT INTO private.commerce_provider_observations(job_id, order_id, fence, purpose, facts, complete, blockers, material_digest,
  api_version, verifier)
 VALUES (job.id, job.order_id, job.fence, job.purpose, material, p_complete, p_blockers, private.support_digest(material),
  p_api_version, v_verifier) RETURNING id INTO observation;
 UPDATE private.commerce_verification_jobs SET state = 'complete', observation_id = observation, completed_at = clock_timestamp(),
  lease_until = NULL WHERE id = job.id;
 RETURN jsonb_build_object('state', 'complete', 'observationId', observation);
END $$;

CREATE FUNCTION private.commerce_observation_json(p private.commerce_provider_observations) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id', p.id, 'orderId', p.order_id, 'jobId', p.job_id, 'fence', p.fence, 'facts', p.facts,
   'complete', p.complete, 'blockers', p.blockers, 'verifiedAt', p.verified_at, 'apiVersion', p.api_version,
   'materialDigest', p.material_digest)
$$;

-- A recorded observation, for staff who may inspect provider details.
CREATE FUNCTION public.admin_support_observation(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; p private.commerce_provider_observations;
BEGIN
 actor := private.support_assert('support.provider.inspect', 'diagnosis');
 SELECT * INTO p FROM private.commerce_provider_observations WHERE id = p_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 PERFORM private.support_audit_read(actor, 'observation', p.order_id::text, 'found');
 RETURN private.support_read(private.commerce_observation_json(p), p.complete);
END $$;

-- The latest observation of an order, or null value when none was recorded.
CREATE FUNCTION public.admin_support_latest_observation(p_order_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; p private.commerce_provider_observations;
BEGIN
 actor := private.support_assert('support.provider.inspect', 'diagnosis');
 SELECT * INTO p FROM private.commerce_provider_observations WHERE order_id = p_order_id ORDER BY verified_at DESC, id DESC LIMIT 1;
 PERFORM private.support_audit_read(actor, 'observation', p_order_id::text, CASE WHEN p.id IS NULL THEN 'not_found' ELSE 'found' END);
 RETURN private.support_read(CASE WHEN p.id IS NULL THEN 'null'::jsonb ELSE private.commerce_observation_json(p) END,
   coalesce(p.complete, true));
END $$;

-- An order's purchase eligibility from a recorded observation and the order's approved policy (Task 8's evaluator).
CREATE FUNCTION private.commerce_evaluate_purchase(p_order_id uuid, p_observation_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE binding jsonb := private.commerce_order_binding(p_order_id); obs private.commerce_provider_observations;
BEGIN
 SELECT * INTO obs FROM private.commerce_provider_observations WHERE id = p_observation_id AND order_id = p_order_id;
 IF binding IS NULL OR NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 RETURN private.commerce_evaluate(jsonb_build_object('facts', obs.facts, 'binding', binding,
  'policy', private.commerce_policy_for(binding->>'refundPolicyVersion', binding->>'accessPolicyVersion'),
  'accountActive', private.support_account_state((binding->>'userId')::uuid) IN ('active','unconfirmed'),
  'manualHold', false, 'now', clock_timestamp()));
END $$;

DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mch_commerce_verifier') THEN
  CREATE ROLE mch_commerce_verifier NOLOGIN;
 END IF;
END $$;
GRANT USAGE ON SCHEMA private TO mch_commerce_verifier;

REVOKE ALL ON FUNCTION private.commerce_facts_valid(jsonb), private.commerce_verifier(), private.commerce_verifier_register(text,text,uuid),
 private.commerce_verifier_revoke(text), private.commerce_order_binding(uuid), private.commerce_verification_claim(uuid),
 private.commerce_observation_record(uuid,bigint,jsonb,boolean,jsonb,text), private.commerce_observation_json(private.commerce_provider_observations),
 private.commerce_evaluate_purchase(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.commerce_verification_claim(uuid), private.commerce_observation_record(uuid,bigint,jsonb,boolean,jsonb,text)
 TO mch_commerce_verifier;
REVOKE ALL ON FUNCTION public.admin_support_diagnose_begin(uuid,uuid), public.admin_support_observation(uuid),
 public.admin_support_latest_observation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_diagnose_begin(uuid,uuid), public.admin_support_observation(uuid),
 public.admin_support_latest_observation(uuid) TO authenticated;
