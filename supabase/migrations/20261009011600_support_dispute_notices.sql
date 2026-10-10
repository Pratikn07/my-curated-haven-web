-- Phase 3, Task 27: owner-approved dispute notices.
--
-- When a customer formally disputes a payment, the owner may send them one neutral email about it. Only the owner,
-- signed in with MFA, prepares, approves and sends; nothing is sent from a webhook. The draft is rendered here from
-- the approved template (TypeScript twin: disputeNoticeCopy), bound to fresh provider evidence of the open dispute,
-- the customer's current verified email and their actual access, and approved exactly as shown for five minutes.
-- Each dispute gets at most one notice that was (or may have been) sent: a lost answer stays unknown and is never
-- resent. Sending has its own switch, off by default. Personal content follows its own retention period.

ALTER TABLE private.support_workspace_settings
 ADD COLUMN dispute_notice_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN notice_retention_days integer CHECK (notice_retention_days IS NULL OR notice_retention_days BETWEEN 30 AND 3650),
 -- The address customers are told to write to. No notice can be prepared until it is set.
 ADD COLUMN notice_support_email text CHECK (notice_support_email IS NULL
   OR notice_support_email ~ '^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,24}$');

-- The signed-in owner with this notice right at aal2 while the support stage is at least p_stage.
CREATE FUNCTION private.support_notice_actor(p_permission text, p_stage text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := private.support_assert(p_permission, p_stage);
BEGIN
 IF NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = actor AND role = 'owner' AND active) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
 RETURN actor;
END $$;

-- One notice identity per provider dispute and notice type.
CREATE TABLE private.support_notices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id text NOT NULL,
 mode text NOT NULL CHECK (mode IN ('test','live')),
 dispute_id text NOT NULL,
 notice_type text NOT NULL CHECK (notice_type = 'dispute_opened'),
 order_id uuid NOT NULL REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE (account_id, mode, dispute_id, notice_type)
);

-- Immutable preview versions. The personal content (recipient, subject, text) sits beside the draft so retention can
-- remove it without rewriting what was approved; the digest still proves what it was.
CREATE TABLE private.support_notice_drafts (
 id uuid PRIMARY KEY,
 notice_id uuid NOT NULL REFERENCES private.support_notices(id) ON DELETE RESTRICT,
 actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 order_id uuid NOT NULL REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
 observation_id uuid NOT NULL REFERENCES private.commerce_provider_observations(id) ON DELETE RESTRICT,
 draft jsonb NOT NULL,
 recipient text,
 subject text,
 body_text text,
 digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
 blocked boolean NOT NULL,
 prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 redacted_at timestamptz,
 CHECK ((redacted_at IS NULL) = (recipient IS NOT NULL AND subject IS NOT NULL AND body_text IS NOT NULL))
);
CREATE INDEX support_notice_drafts_order ON private.support_notice_drafts(order_id, prepared_at DESC);

-- Drafts never change, except the one retention change: removing the personal content once, inside a retention run.
CREATE FUNCTION private.support_notice_draft_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND current_setting('mch.support_retention', true) = 'on' AND OLD.redacted_at IS NULL
   AND NEW.redacted_at IS NOT NULL AND NEW.recipient IS NULL AND NEW.subject IS NULL AND NEW.body_text IS NULL
   AND to_jsonb(NEW) - ARRAY['recipient','subject','body_text','redacted_at'] = to_jsonb(OLD) - ARRAY['recipient','subject','body_text','redacted_at'] THEN
  RETURN NEW;
 END IF;
 RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_IMMUTABLE';
END $$;
CREATE TRIGGER support_notice_drafts_guard BEFORE UPDATE OR DELETE ON private.support_notice_drafts
 FOR EACH ROW EXECUTE FUNCTION private.support_notice_draft_guard();

CREATE TABLE private.support_notice_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 draft_id uuid NOT NULL UNIQUE REFERENCES private.support_notice_drafts(id) ON DELETE RESTRICT,
 digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
 authoriser uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL
);
CREATE TRIGGER support_notice_approvals_immutable BEFORE UPDATE OR DELETE ON private.support_notice_approvals
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();

-- One send per draft, and at most one sending, accepted or unknown send per notice across every draft.
CREATE TABLE private.support_notice_sends (
 operation_id uuid PRIMARY KEY,
 notice_id uuid NOT NULL REFERENCES private.support_notices(id) ON DELETE RESTRICT,
 draft_id uuid NOT NULL UNIQUE REFERENCES private.support_notice_drafts(id) ON DELETE RESTRICT,
 approval_id uuid NOT NULL REFERENCES private.support_notice_approvals(id) ON DELETE RESTRICT,
 actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 command jsonb NOT NULL,
 request_digest text NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
 state text NOT NULL CHECK (state IN ('dispatching','accepted','failed_before_acceptance','outcome_unknown')),
 fence bigint NOT NULL,
 claim_until timestamptz,
 provider_message_id text CHECK (provider_message_id IS NULL OR length(provider_message_id) BETWEEN 1 AND 255),
 reason_code text CHECK (reason_code IS NULL OR reason_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
 audit_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK ((state = 'accepted') = (provider_message_id IS NOT NULL))
);
CREATE UNIQUE INDEX support_notice_sends_one_live ON private.support_notice_sends(notice_id)
 WHERE state IN ('dispatching','accepted','outcome_unknown');
CREATE FUNCTION private.support_notice_send_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP = 'DELETE' OR to_jsonb(NEW) - ARRAY['state','claim_until','provider_message_id','reason_code','updated_at']
   IS DISTINCT FROM to_jsonb(OLD) - ARRAY['state','claim_until','provider_message_id','reason_code','updated_at']
   OR (OLD.provider_message_id IS NOT NULL AND NEW.provider_message_id IS DISTINCT FROM OLD.provider_message_id) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_IMMUTABLE';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER support_notice_sends_guard BEFORE UPDATE OR DELETE ON private.support_notice_sends
 FOR EACH ROW EXECUTE FUNCTION private.support_notice_send_guard();

ALTER TABLE private.commerce_verification_jobs ADD COLUMN notice_draft_id uuid REFERENCES private.support_notice_drafts(id) ON DELETE RESTRICT;

ALTER TABLE private.support_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_notice_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_notice_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_notice_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.support_notices, private.support_notice_drafts, private.support_notice_approvals, private.support_notice_sends
 FROM PUBLIC, anon, authenticated;

-- The approved neutral template, version dispute-opened-v1 (TypeScript twin: disputeNoticeCopy in
-- src/lib/admin/support/notices/template.ts; both are pinned to the same text by tests). Plain text only: no links,
-- tracking, marketing or request to buy again. The title is flattened to one line; the subject carries only the
-- support reference.
CREATE FUNCTION private.support_notice_copy(p_reference text, p_title text, p_access text, p_support_email text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object('subject', 'About your order ' || p_reference,
  'text', concat_ws(E'\n\n', 'Hello,',
   'Your bank or card issuer has told us that you are disputing the payment for your My Curated Haven order ' || p_reference
     || ' (' || left(btrim(regexp_replace(p_title, '[[:cntrl:]]+', ' ', 'g')), 200) || ').',
   CASE p_access
    WHEN 'active' THEN 'Your collection remains available through another valid purchase or access source.'
    WHEN 'denied' THEN 'While the dispute is open, the recipes from this purchase are paused. Nothing else in your account changes.'
    ELSE 'We could not confirm your access to this collection just now.' END,
   'Your bank decides the dispute, and this email does not change it. If you have a question, or you did not mean to dispute '
     || 'this payment, reply to this email or write to ' || p_support_email || ' and quote ' || p_reference || '.',
   'My Curated Haven'))
$$;

-- The customer's current verified email for an order, or null: a closed account, no email or an unconfirmed one.
CREATE FUNCTION private.support_notice_recipient(p_order private.purchase_orders) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN u.id IS NULL THEN jsonb_build_object('state', 'account_closed')
   WHEN u.email IS NULL OR u.email_confirmed_at IS NULL OR lower(btrim(u.email)) !~ '^[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$'
     THEN jsonb_build_object('state', 'recipient_unverified')
   ELSE jsonb_build_object('state', 'ok', 'email', lower(btrim(u.email)), 'reference', u.id,
     'version', private.support_digest(jsonb_build_object('email', lower(btrim(u.email)), 'confirmedAt', u.email_confirmed_at))) END
 FROM (SELECT 1) one LEFT JOIN auth.users u ON u.id = p_order.user_id
$$;

-- What a draft depends on, as it is now: the recipient, the customer's access, and whether this dispute's notice has
-- already gone (or may have gone).
CREATE FUNCTION private.support_notice_current(d private.support_notice_drafts) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE o private.purchase_orders; v_obs private.commerce_provider_observations;
BEGIN
 SELECT * INTO o FROM private.purchase_orders WHERE id = d.order_id;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = d.observation_id;
 RETURN d.redacted_at IS NULL
  AND private.support_notice_recipient(o)->>'version' IS NOT DISTINCT FROM d.draft->>'recipientVersion'
  AND o.user_id IS NOT NULL
  AND private.support_access_explanation(o.user_id, private.support_order_collection(o))->>'dependencyToken' = d.draft->>'dependencyToken'
  AND NOT EXISTS (SELECT 1 FROM private.support_notice_sends s WHERE s.notice_id = d.notice_id
    AND s.state IN ('dispatching','accepted','outcome_unknown'));
END $$;

CREATE FUNCTION private.support_notice_draft_json(d private.support_notice_drafts) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT d.draft || jsonb_build_object('recipient', coalesce(d.recipient, ''), 'subject', coalesce(d.subject, ''),
  'text', coalesce(d.body_text, ''), 'redacted', d.redacted_at IS NOT NULL)
$$;

-- Prepare a notice for one formal open dispute from a complete, current provider check of the order.
CREATE FUNCTION public.admin_support_notice_prepare(p_order_id uuid, p_dispute_id text, p_observation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; o private.purchase_orders; v_obs private.commerce_provider_observations; v_dispute jsonb; v_settings record;
 v_recipient jsonb; v_access jsonb; v_notice uuid; v_blockers text[] := '{}'; v_copy jsonb; v_title text; v_id uuid := gen_random_uuid();
 v_now timestamptz := clock_timestamp(); v_draft jsonb; v_digest text;
BEGIN
 actor := private.support_notice_actor('support.notice.prepare', 'diagnosis');
 IF p_order_id IS NULL OR p_observation_id IS NULL OR p_dispute_id IS NULL OR p_dispute_id !~ '^du_[A-Za-z0-9_]{1,255}$' THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 IF NOT private.support_consume_budget(actor, 'notice_prepare') THEN RAISE EXCEPTION USING ERRCODE='PT429', MESSAGE='ADM_RATE_LIMITED'; END IF;
 SELECT * INTO o FROM private.purchase_orders WHERE id = p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p_observation_id AND order_id = o.id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 -- Only the newest complete check, and only a recent one, describes the dispute as it is.
 IF NOT v_obs.complete OR v_obs.verified_at < now() - interval '15 minutes'
   OR EXISTS (SELECT 1 FROM private.commerce_provider_observations n WHERE n.order_id = o.id AND n.complete AND n.fence > v_obs.fence) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 SELECT x INTO v_dispute FROM jsonb_array_elements(v_obs.facts->'disputes') x WHERE x->>'id' = p_dispute_id;
 IF v_dispute IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT dispute_notice_enabled, notice_retention_days, notice_support_email INTO v_settings
 FROM private.support_workspace_settings WHERE singleton;

 IF v_dispute->>'classification' <> 'formal' OR v_dispute->>'status' NOT IN ('needs_response','under_review') THEN
  v_blockers := v_blockers || 'dispute_not_open'::text;
 END IF;
 v_recipient := private.support_notice_recipient(o);
 IF v_recipient->>'state' <> 'ok' THEN v_blockers := v_blockers || (v_recipient->>'state'); END IF;
 IF o.user_id IS NOT NULL THEN v_access := private.support_access_explanation(o.user_id, private.support_order_collection(o)); END IF;
 IF v_access IS NULL OR v_access->>'effective' NOT IN ('active','denied') THEN v_blockers := v_blockers || 'access_unavailable'::text; END IF;
 IF v_settings.notice_retention_days IS NULL THEN v_blockers := v_blockers || 'retention_unset'::text; END IF;
 IF v_settings.notice_support_email IS NULL THEN v_blockers := v_blockers || 'support_email_unset'::text; END IF;

 INSERT INTO private.support_notices(account_id, mode, dispute_id, notice_type, order_id)
 VALUES (v_obs.facts->>'accountId', v_obs.facts->>'mode', p_dispute_id, 'dispute_opened', o.id)
 ON CONFLICT (account_id, mode, dispute_id, notice_type) DO NOTHING;
 SELECT id INTO v_notice FROM private.support_notices
 WHERE account_id = v_obs.facts->>'accountId' AND mode = v_obs.facts->>'mode' AND dispute_id = p_dispute_id AND notice_type = 'dispute_opened';
 IF EXISTS (SELECT 1 FROM private.support_notice_sends s WHERE s.notice_id = v_notice AND s.state IN ('dispatching','accepted','outcome_unknown')) THEN
  v_blockers := v_blockers || 'already_sent'::text;
 END IF;

 SELECT title INTO v_title FROM public.recipe_collections WHERE id = private.support_order_collection(o);
 v_copy := private.support_notice_copy(o.support_reference, coalesce(v_title, 'your collection'), coalesce(v_access->>'effective', 'unavailable'),
  coalesce(v_settings.notice_support_email, ''));
 SELECT coalesce(array_agg(DISTINCT b ORDER BY b), '{}') INTO v_blockers FROM unnest(v_blockers) b;
 v_draft := jsonb_build_object('id', v_id, 'noticeId', v_notice, 'orderId', o.id, 'disputeId', p_dispute_id,
  'ownerPrincipal', o.owner_principal, 'recipientReference', coalesce(v_recipient->>'reference', ''),
  'recipientVersion', coalesce(v_recipient->>'version', ''), 'templateVersion', 'dispute-opened-v1',
  'disputeVersion', private.support_digest(v_dispute), 'disputeStatus', v_dispute->>'status', 'respondBy', v_dispute->'deadline',
  'effectiveAccess', coalesce(v_access->>'effective', 'unavailable'), 'dependencyToken', coalesce(v_access->>'dependencyToken', ''),
  'blockers', to_jsonb(v_blockers), 'expiresAt', private.commerce_utc(v_now + interval '300 seconds'));
 v_digest := private.support_digest((v_draft - 'id' - 'expiresAt') || jsonb_build_object('recipient', coalesce(v_recipient->>'email', ''),
  'subject', v_copy->>'subject', 'text', v_copy->>'text'));
 v_draft := v_draft || jsonb_build_object('digest', v_digest);
 INSERT INTO private.support_notice_drafts(id, notice_id, actor, order_id, observation_id, draft, recipient, subject, body_text, digest,
  blocked, prepared_at, expires_at)
 VALUES (v_id, v_notice, actor, o.id, v_obs.id, v_draft, coalesce(v_recipient->>'email', ''), v_copy->>'subject', v_copy->>'text', v_digest,
  cardinality(v_blockers) > 0, v_now, v_now + interval '300 seconds');
 RETURN private.support_notice_draft_json((SELECT d FROM private.support_notice_drafts d WHERE id = v_id));
END $$;

CREATE FUNCTION private.support_notice_approval_json(a private.support_notice_approvals) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id', a.id, 'proposalId', a.draft_id, 'digest', a.digest, 'humanAuthoriser', a.authoriser,
  'approvedAt', private.commerce_utc(a.approved_at), 'expiresAt', private.commerce_utc(a.expires_at), 'channel', 'web')
$$;

-- The owner approves exactly this draft, recipient and text, for five minutes at most.
CREATE FUNCTION public.admin_support_notice_approve(p_draft_id uuid, p_digest text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; d private.support_notice_drafts; a private.support_notice_approvals;
BEGIN
 actor := private.support_notice_actor('support.notice.approve', 'diagnosis');
 IF p_draft_id IS NULL OR p_digest IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT * INTO d FROM private.support_notice_drafts WHERE id = p_draft_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.support_notice_approvals WHERE draft_id = d.id;
 IF FOUND THEN
  IF a.authoriser = actor AND a.digest = p_digest THEN RETURN private.support_notice_approval_json(a); END IF;
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF d.digest IS DISTINCT FROM p_digest OR d.expires_at <= clock_timestamp() THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
 IF d.blocked THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED'; END IF;
 IF NOT private.support_notice_current(d)
   OR EXISTS (SELECT 1 FROM private.commerce_provider_observations n JOIN private.commerce_provider_observations c ON c.id = d.observation_id
     WHERE n.order_id = d.order_id AND n.complete AND n.fence > c.fence) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 INSERT INTO private.support_notice_approvals(draft_id, digest, authoriser, expires_at)
 VALUES (d.id, d.digest, actor, least(d.expires_at, clock_timestamp() + interval '5 minutes')) RETURNING * INTO a;
 RETURN private.support_notice_approval_json(a);
END $$;

-- Before sending, the owner asks for a fresh provider check tied to this draft.
CREATE FUNCTION public.admin_support_notice_send_check(p_draft_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; d private.support_notice_drafts; a private.support_notice_approvals; o private.purchase_orders;
 job private.commerce_verification_jobs;
BEGIN
 actor := private.support_notice_actor('support.notice.send', 'repair');
 IF NOT (SELECT dispute_notice_enabled FROM private.support_workspace_settings WHERE singleton) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DISABLED';
 END IF;
 IF p_draft_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT * INTO d FROM private.support_notice_drafts WHERE id = p_draft_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.support_notice_approvals WHERE draft_id = d.id;
 IF NOT FOUND OR a.expires_at <= clock_timestamp() THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
 IF NOT private.support_consume_budget(actor, 'provider_check') THEN RAISE EXCEPTION USING ERRCODE='PT429', MESSAGE='ADM_RATE_LIMITED'; END IF;
 SELECT * INTO o FROM private.purchase_orders WHERE id = d.order_id;
 SELECT * INTO job FROM private.commerce_verification_jobs WHERE order_id = d.order_id AND state IN ('pending','claimed') FOR UPDATE;
 IF FOUND AND (job.purpose <> 'notice_send' OR job.notice_draft_id IS DISTINCT FROM d.id) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF NOT FOUND THEN
  INSERT INTO private.commerce_verification_jobs(order_id, purpose, requested_by, operation_id, notice_draft_id, expected_order_version)
  VALUES (d.order_id, 'notice_send', actor, gen_random_uuid(), d.id, o.version) RETURNING * INTO job;
 END IF;
 RETURN jsonb_build_object('jobId', job.id);
END $$;

CREATE FUNCTION private.support_notice_receipt(s private.support_notice_sends) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('operationId', s.operation_id, 'draftId', s.draft_id, 'state', s.state,
  'providerMessageId', s.provider_message_id, 'delivery', 'unconfirmed', 'auditId', s.audit_id, 'reasonCode', s.reason_code,
  'checkedAt', private.commerce_utc(clock_timestamp()))
$$;

-- Claim the single send of an approved draft, at the last authenticated boundary before the email leaves.
-- Command: {operationId, draftId, expectedDigest}. The fresh check must still show the same open dispute, the same
-- verified recipient and the same access; a second send for the same dispute is refused.
CREATE FUNCTION public.admin_support_notice_send_claim(p_command jsonb, p_observation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; c jsonb := p_command; v_op uuid; d private.support_notice_drafts; a private.support_notice_approvals;
 v_obs private.commerce_provider_observations; v_job private.commerce_verification_jobs; v_dispute jsonb; s private.support_notice_sends;
 v_audit uuid; v_fence bigint;
BEGIN
 actor := private.support_notice_actor('support.notice.send', 'repair');
 IF NOT (SELECT dispute_notice_enabled FROM private.support_workspace_settings WHERE singleton) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DISABLED';
 END IF;
 IF c IS NULL OR jsonb_typeof(c) <> 'object' OR p_observation_id IS NULL
   OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(c) k) <> ARRAY['draftId','expectedDigest','operationId']
   OR (c->>'expectedDigest') !~ '^[0-9a-f]{64}$' THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 BEGIN
  v_op := (c->>'operationId')::uuid;
  SELECT * INTO d FROM private.support_notice_drafts WHERE id = (c->>'draftId')::uuid;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END;
 -- An operation sends at most once; repeating it never sends again (its receipt is read instead).
 IF EXISTS (SELECT 1 FROM private.support_notice_sends WHERE operation_id = v_op) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF d.id IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.support_notice_approvals WHERE draft_id = d.id;
 IF NOT FOUND OR a.digest <> c->>'expectedDigest' OR d.digest <> a.digest OR a.expires_at <= clock_timestamp()
   OR NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = a.authoriser AND role = 'owner' AND active)
   OR NOT private.support_has(a.authoriser, 'support.notice.approve') THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 SELECT * INTO v_obs FROM private.commerce_provider_observations WHERE id = p_observation_id;
 SELECT * INTO v_job FROM private.commerce_verification_jobs WHERE id = v_obs.job_id;
 IF v_obs.id IS NULL OR v_obs.purpose <> 'notice_send' OR v_job.notice_draft_id IS DISTINCT FROM d.id THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 -- One notice identity at a time: concurrent sends for the same dispute wait here.
 PERFORM 1 FROM private.support_notices WHERE id = d.notice_id FOR UPDATE;
 SELECT x INTO v_dispute FROM jsonb_array_elements(v_obs.facts->'disputes') x WHERE x->>'id' = d.draft->>'disputeId';
 IF NOT v_obs.complete
   OR EXISTS (SELECT 1 FROM private.commerce_provider_observations n WHERE n.order_id = d.order_id AND n.complete AND n.fence > v_obs.fence)
   OR v_dispute IS NULL OR private.support_digest(v_dispute) <> d.draft->>'disputeVersion'
   OR NOT private.support_notice_current(d) THEN
  IF EXISTS (SELECT 1 FROM private.support_notice_sends WHERE notice_id = d.notice_id AND state IN ('dispatching','accepted','outcome_unknown')) THEN
   RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
  END IF;
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 IF EXISTS (SELECT 1 FROM private.support_notice_sends WHERE draft_id = d.id) THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 v_fence := nextval('private.commerce_verification_fence');
 INSERT INTO private.access_events(actor_type, actor_id, event_type, metadata)
 VALUES ('human', actor, 'support_notice_dispatch', jsonb_build_object('operationId', v_op, 'draftId', d.id, 'approvalId', a.id,
  'orderId', d.order_id, 'fence', v_fence))
 RETURNING id INTO v_audit;
 INSERT INTO private.support_notice_sends(operation_id, notice_id, draft_id, approval_id, actor, command, request_digest, state, fence,
  claim_until, audit_id)
 VALUES (v_op, d.notice_id, d.id, a.id, actor, c, private.support_digest(jsonb_build_object('operationId', v_op, 'recipient', d.recipient,
  'subject', d.subject, 'text', d.body_text)), 'dispatching', v_fence, least(clock_timestamp() + interval '10 seconds', a.expires_at), v_audit)
 RETURNING * INTO s;
 RETURN jsonb_build_object('operationId', s.operation_id, 'fence', s.fence, 'expiresAt', private.commerce_utc(s.claim_until));
END $$;

-- The registered verifier login reads the approved email only under the live claim.
CREATE FUNCTION private.support_notice_payload(p_operation_id uuid, p_fence bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); s private.support_notice_sends; d private.support_notice_drafts;
BEGIN
 SELECT * INTO s FROM private.support_notice_sends WHERE operation_id = p_operation_id;
 IF NOT FOUND OR s.state <> 'dispatching' OR s.fence <> p_fence OR s.claim_until <= clock_timestamp() THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE';
 END IF;
 SELECT * INTO d FROM private.support_notice_drafts WHERE id = s.draft_id;
 IF d.redacted_at IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
 RETURN jsonb_build_object('operationId', s.operation_id, 'mode', (SELECT mode FROM private.support_notices WHERE id = s.notice_id),
  'recipient', d.recipient, 'subject', d.subject, 'text', d.body_text);
END $$;

-- Record the transport's answer. Acceptance is recorded whenever it arrives (even after the claim, a revocation or
-- the switch going off); "not sent" and "unknown" only count under the current claim, so a late or stale failure
-- can never free a dispute for a second email that may duplicate the first.
CREATE FUNCTION private.support_notice_result_record(p_operation_id uuid, p_fence bigint, p_result jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); s private.support_notice_sends; v_kind text := p_result->>'kind';
BEGIN
 IF p_result IS NULL OR jsonb_typeof(p_result) <> 'object' OR v_kind NOT IN ('accepted','not_executed','unknown')
   OR (v_kind = 'accepted' AND ((SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_result) k) <> ARRAY['kind','providerMessageId']
     OR length(p_result->>'providerMessageId') NOT BETWEEN 1 AND 255))
   OR (v_kind <> 'accepted' AND ((SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_result) k) <> ARRAY['code','kind']
     OR (p_result->>'code') !~ '^[A-Z][A-Z0-9_]{1,63}$')) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 SELECT * INTO s FROM private.support_notice_sends WHERE operation_id = p_operation_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF v_kind = 'accepted' THEN
  IF s.state = 'accepted' THEN
   IF s.provider_message_id = p_result->>'providerMessageId' THEN RETURN private.support_notice_receipt(s); END IF;
   RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
  END IF;
  IF s.state = 'failed_before_acceptance' THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
  UPDATE private.support_notice_sends SET state = 'accepted', provider_message_id = p_result->>'providerMessageId', reason_code = NULL,
   claim_until = NULL, updated_at = clock_timestamp() WHERE operation_id = s.operation_id RETURNING * INTO s;
 ELSE
  IF s.state <> 'dispatching' OR s.fence <> p_fence THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_STALE'; END IF;
  UPDATE private.support_notice_sends SET state = CASE v_kind WHEN 'unknown' THEN 'outcome_unknown' ELSE 'failed_before_acceptance' END,
   reason_code = p_result->>'code', claim_until = NULL, updated_at = clock_timestamp()
  WHERE operation_id = s.operation_id RETURNING * INTO s;
 END IF;
 INSERT INTO private.access_events(actor_type, actor_id, event_type, metadata)
 VALUES ('system', NULL, 'support_notice_result', jsonb_build_object('operationId', s.operation_id, 'state', s.state,
  'reasonCode', s.reason_code));
 RETURN private.support_notice_receipt(s);
END $$;

-- A claim that ran out without an answer: the email may have gone, so it becomes unknown, never "not sent".
CREATE FUNCTION private.support_notice_expire_claim(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_verifier text := private.commerce_verifier(); s private.support_notice_sends;
BEGIN
 UPDATE private.support_notice_sends SET state = 'outcome_unknown', reason_code = 'CLAIM_EXPIRED', claim_until = NULL,
  updated_at = clock_timestamp()
 WHERE operation_id = p_operation_id AND state = 'dispatching' AND claim_until <= clock_timestamp() RETURNING * INTO s;
 IF NOT FOUND THEN SELECT * INTO s FROM private.support_notice_sends WHERE operation_id = p_operation_id; END IF;
 IF s.operation_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 RETURN private.support_notice_receipt(s);
END $$;

-- The owner reads a send's receipt; readable at the inspection stage and with sending off.
CREATE FUNCTION public.admin_support_notice_operation(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; s private.support_notice_sends;
BEGIN
 actor := private.support_notice_actor('support.notice.prepare', 'inspection');
 SELECT * INTO s FROM private.support_notice_sends WHERE operation_id = p_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 RETURN private.support_notice_receipt(s);
END $$;

-- The owner's notices for one order, newest first, and whether sending is switched on.
CREATE FUNCTION public.admin_support_notices(p_order_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;
BEGIN
 actor := private.support_notice_actor('support.notice.prepare', 'inspection');
 IF p_order_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 RETURN jsonb_build_object('sendingEnabled', (SELECT dispute_notice_enabled FROM private.support_workspace_settings WHERE singleton),
  'items', (SELECT coalesce(jsonb_agg(jsonb_build_object('draft', private.support_notice_draft_json(d),
   'state', CASE WHEN s.operation_id IS NOT NULL THEN 'started' WHEN d.blocked THEN 'blocked'
     WHEN a.id IS NOT NULL AND a.expires_at > clock_timestamp() THEN 'approved'
     WHEN a.id IS NOT NULL OR d.expires_at <= clock_timestamp() THEN 'expired' ELSE 'awaiting_approval' END,
   'approval', CASE WHEN a.id IS NULL THEN NULL ELSE private.support_notice_approval_json(a) END,
   'receipt', CASE WHEN s.operation_id IS NULL THEN NULL ELSE private.support_notice_receipt(s) END,
   'preparedAt', private.commerce_utc(d.prepared_at)) ORDER BY d.prepared_at DESC, d.id), '[]')
  FROM (SELECT * FROM private.support_notice_drafts WHERE order_id = p_order_id ORDER BY prepared_at DESC, id LIMIT 10) d
  LEFT JOIN private.support_notice_approvals a ON a.draft_id = d.id
  LEFT JOIN private.support_notice_sends s ON s.draft_id = d.id));
END $$;

-- Retention also removes notice recipients and text after notice_retention_days, except while the dispute is open or
-- a send of that notice is unresolved. Approvals, sends and digests stay.
CREATE OR REPLACE FUNCTION public.admin_support_retention_run(p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; v_receipt jsonb; v_notes integer; v_observations integer; v_notices integer; v_note_days integer;
 v_observation_days integer; v_notice_days integer;
BEGIN
 actor := private.support_owner_session();
 IF p_operation_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 v_receipt := private.admin_begin_operation(actor, p_operation_id, 'support.retention', NULL, '{}'::jsonb);
 IF v_receipt IS NOT NULL THEN RETURN v_receipt; END IF;
 SELECT note_retention_days, observation_retention_days, notice_retention_days INTO v_note_days, v_observation_days, v_notice_days
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
 v_notices := 0;
 IF v_notice_days IS NOT NULL THEN
  WITH redacted AS (
   UPDATE private.support_notice_drafts d SET recipient = NULL, subject = NULL, body_text = NULL, redacted_at = clock_timestamp()
   FROM private.support_notices n
   WHERE n.id = d.notice_id AND d.redacted_at IS NULL AND d.prepared_at < now() - make_interval(days => v_notice_days)
    AND NOT EXISTS (SELECT 1 FROM private.support_notice_sends s WHERE s.notice_id = d.notice_id AND s.state IN ('dispatching','outcome_unknown'))
    AND NOT EXISTS (SELECT 1 FROM private.payment_disputes pd WHERE pd.provider_dispute_id = n.dispute_id
      AND pd.status IN ('needs_response','under_review','warning_needs_response','warning_under_review'))
   RETURNING 1)
  SELECT count(*) INTO v_notices FROM redacted;
 END IF;
 PERFORM set_config('mch.support_retention', 'off', true);

 v_receipt := jsonb_build_object('notesRedacted', v_notes, 'observationsMinimised', v_observations, 'noticesRedacted', v_notices);
 PERFORM private.admin_finish_operation(actor, p_operation_id, v_receipt);
 RETURN v_receipt;
END $$;

REVOKE ALL ON FUNCTION private.support_notice_actor(text,text), private.support_notice_copy(text,text,text,text),
 private.support_notice_recipient(private.purchase_orders), private.support_notice_current(private.support_notice_drafts),
 private.support_notice_draft_json(private.support_notice_drafts), private.support_notice_approval_json(private.support_notice_approvals),
 private.support_notice_receipt(private.support_notice_sends), private.support_notice_payload(uuid,bigint),
 private.support_notice_result_record(uuid,bigint,jsonb), private.support_notice_expire_claim(uuid),
 private.support_notice_draft_guard(), private.support_notice_send_guard()
 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_support_notice_prepare(uuid,text,uuid), public.admin_support_notice_approve(uuid,text),
 public.admin_support_notice_send_check(uuid), public.admin_support_notice_send_claim(jsonb,uuid),
 public.admin_support_notice_operation(uuid), public.admin_support_notices(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_notice_prepare(uuid,text,uuid), public.admin_support_notice_approve(uuid,text),
 public.admin_support_notice_send_check(uuid), public.admin_support_notice_send_claim(jsonb,uuid),
 public.admin_support_notice_operation(uuid), public.admin_support_notices(uuid) TO authenticated;
-- The verifier login only reads a claimed email and records the transport's answer.
GRANT EXECUTE ON FUNCTION private.support_notice_payload(uuid,bigint), private.support_notice_result_record(uuid,bigint,jsonb),
 private.support_notice_expire_claim(uuid) TO mch_commerce_verifier;
