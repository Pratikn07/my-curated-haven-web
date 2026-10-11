-- Phase 3: private support cases, an append-only read audit, the order timeline and the attention queue.
--
-- A case belongs to an order, an account, or both, and both must agree. Every change is an immutable event; note
-- text sits beside its event so the owner can redact it without rewriting history. Personal notes stay off until
-- the owner approves how long they are kept (note_retention_days). Reads are audited by actor, action, what was
-- found and the outcome, never by search term or returned data. Nothing here changes access, payments or orders.

ALTER TABLE private.support_workspace_settings
 ADD COLUMN note_retention_days integer CHECK (note_retention_days IS NULL OR note_retention_days BETWEEN 1 AND 3650);

CREATE TABLE private.support_cases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid REFERENCES private.purchase_orders(id) ON DELETE RESTRICT,
 -- The account or, for a closed account, its order principal. No foreign key, so a case outlives an account.
 user_id uuid,
 category text NOT NULL CHECK (category IN ('missing_access','unresolved_payment','account_mismatch','refund_followup',
   'dispute_followup','duplicate_purchase','content_availability')),
 state text NOT NULL CHECK (state IN ('open','investigating','waiting_on_customer','waiting_on_provider','resolved')),
 version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
 resolution_reference text CHECK (resolution_reference IS NULL OR length(trim(resolution_reference)) BETWEEN 1 AND 1000),
 created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK (order_id IS NOT NULL OR user_id IS NOT NULL),
 CHECK (state <> 'resolved' OR resolution_reference IS NOT NULL)
);
CREATE INDEX support_cases_order ON private.support_cases(order_id);
CREATE INDEX support_cases_user ON private.support_cases(user_id);

CREATE TABLE private.support_case_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 case_id uuid NOT NULL REFERENCES private.support_cases(id) ON DELETE RESTRICT,
 action text NOT NULL CHECK (action IN ('create','append_note','amend_note','set_state','redact_note')),
 actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 at timestamptz NOT NULL DEFAULT clock_timestamp(),
 state text,
 amends_event_id uuid REFERENCES private.support_case_events(id) ON DELETE RESTRICT,
 resolution_reference text,
 operation_id uuid NOT NULL
);
CREATE INDEX support_case_events_case ON private.support_case_events(case_id, at);
CREATE TRIGGER support_case_events_immutable BEFORE UPDATE OR DELETE ON private.support_case_events
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();

-- Redactable note text. Redaction clears the text and records who, when and why; no copy is kept anywhere.
CREATE TABLE private.support_note_texts (
 event_id uuid PRIMARY KEY REFERENCES private.support_case_events(id) ON DELETE RESTRICT,
 text text CHECK (text IS NULL OR length(text) BETWEEN 1 AND 2000),
 redacted_at timestamptz,
 redacted_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
 redaction_reason text CHECK (redaction_reason IS NULL OR length(trim(redaction_reason)) BETWEEN 1 AND 1000),
 CHECK ((text IS NULL) = (redacted_at IS NOT NULL))
);

CREATE TABLE private.support_read_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL,
 action text NOT NULL CHECK (action ~ '^[a-z_.]{1,40}$'),
 target_ref text CHECK (target_ref IS NULL OR length(target_ref) <= 80),
 outcome text NOT NULL CHECK (outcome ~ '^[a-z_]{1,40}$'),
 at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER support_read_audit_immutable BEFORE UPDATE OR DELETE ON private.support_read_audit
 FOR EACH ROW EXECUTE FUNCTION private.admin_immutable();

ALTER TABLE private.support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_note_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_read_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.support_cases, private.support_case_events, private.support_note_texts, private.support_read_audit
 FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.support_audit_read(p_actor uuid, p_action text, p_target text, p_outcome text) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 INSERT INTO private.support_read_audit(actor_id, action, target_ref, outcome)
 VALUES (p_actor, p_action, p_target, coalesce(p_outcome, 'unknown'));
END $$;

CREATE FUNCTION private.support_case_json(p_case private.support_cases) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id', p_case.id, 'orderId', p_case.order_id, 'userId', p_case.user_id,
   'state', p_case.state, 'version', p_case.version)
$$;

CREATE OR REPLACE FUNCTION private.support_customer_cases(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(private.support_case_json(c) ORDER BY c.updated_at DESC, c.id DESC), '[]'::jsonb)
 FROM (SELECT c.* FROM private.support_cases c LEFT JOIN private.purchase_orders o ON o.id = c.order_id
   WHERE c.user_id = p_user OR o.user_id = p_user OR o.owner_principal = p_user
   ORDER BY c.updated_at DESC, c.id DESC LIMIT 25) c
$$;

-- Case activity on an order, newest first, 25 a page. The cursor is "<at>|<event id>".
CREATE OR REPLACE FUNCTION private.support_order_history(p_order uuid, p_cursor text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE after_at timestamptz; after_id uuid; events jsonb; more boolean; last_at timestamptz; last_id uuid;
BEGIN
 IF p_cursor IS NOT NULL THEN
  IF length(p_cursor) > 80 OR p_cursor !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z\|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  after_at := split_part(p_cursor, '|', 1)::timestamptz;
  after_id := split_part(p_cursor, '|', 2)::uuid;
 END IF;
 WITH page AS (
  SELECT e.*, n.text note_text FROM private.support_case_events e
  JOIN private.support_cases c ON c.id = e.case_id
  LEFT JOIN private.support_note_texts n ON n.event_id = e.id
  WHERE c.order_id = p_order AND (after_at IS NULL OR (e.at, e.id) < (after_at, after_id))
  ORDER BY e.at DESC, e.id DESC LIMIT 26)
 SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'kind', 'case', 'at', p.at, 'code', 'CASE_' || upper(p.action),
   'actorLabel', (SELECT email FROM auth.users WHERE id = p.actor_id), 'operationId', p.operation_id, 'note', p.note_text)
   ORDER BY p.at DESC, p.id DESC) FILTER (WHERE p.rn <= 25), '[]'::jsonb), count(*) > 25
 INTO events, more
 FROM (SELECT page.*, row_number() OVER (ORDER BY at DESC, id DESC) rn FROM page) p;
 IF more THEN
  SELECT e.at, e.id INTO last_at, last_id FROM private.support_case_events e JOIN private.support_cases c ON c.id = e.case_id
   WHERE c.order_id = p_order AND (after_at IS NULL OR (e.at, e.id) < (after_at, after_id))
   ORDER BY e.at DESC, e.id DESC OFFSET 24 LIMIT 1;
 END IF;
 RETURN jsonb_build_object('events', events, 'nextCursor', CASE WHEN more THEN
   to_char(last_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || last_id END);
END $$;

CREATE FUNCTION public.admin_support_history(p_order_id uuid, p_cursor text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; page jsonb;
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 IF NOT EXISTS (SELECT 1 FROM private.purchase_orders WHERE id = p_order_id) THEN
  RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND';
 END IF;
 page := private.support_order_history(p_order_id, p_cursor);
 PERFORM private.support_audit_read(actor, 'history', p_order_id::text, 'found');
 RETURN page;
END $$;

-- Cases on an order, most recently changed first, 25 a page ("<updated_at>|<case id>"), and whether notes are on.
CREATE FUNCTION public.admin_support_cases(p_order_id uuid, p_cursor text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; after_at timestamptz; after_id uuid; cases jsonb; more boolean; last_at timestamptz; last_id uuid;
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 IF NOT EXISTS (SELECT 1 FROM private.purchase_orders WHERE id = p_order_id) THEN
  RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND';
 END IF;
 IF p_cursor IS NOT NULL THEN
  IF length(p_cursor) > 80 OR p_cursor !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z\|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  after_at := split_part(p_cursor, '|', 1)::timestamptz;
  after_id := split_part(p_cursor, '|', 2)::uuid;
 END IF;
 WITH numbered AS (
  SELECT c.*, row_number() OVER (ORDER BY c.updated_at DESC, c.id DESC) rn FROM private.support_cases c
  WHERE c.order_id = p_order_id AND (after_at IS NULL OR (c.updated_at, c.id) < (after_at, after_id)))
 SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'orderId', order_id, 'userId', user_id, 'state', state,
   'version', version, 'category', category, 'resolutionReference', resolution_reference) ORDER BY rn) FILTER (WHERE rn <= 25),
   '[]'::jsonb), count(*) > 25, max(updated_at) FILTER (WHERE rn = 25), max(id::text) FILTER (WHERE rn = 25)::uuid
 INTO cases, more, last_at, last_id FROM numbered;
 PERFORM private.support_audit_read(actor, 'cases', p_order_id::text, 'found');
 RETURN jsonb_build_object('cases', cases,
  'notesEnabled', (SELECT note_retention_days IS NOT NULL FROM private.support_workspace_settings WHERE singleton),
  'nextCursor', CASE WHEN more THEN to_char(last_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || last_id END);
END $$;

-- JSON field readers that refuse the wrong type instead of guessing.
CREATE FUNCTION private.support_json_uuid(p_value jsonb) RETURNS uuid
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 IF p_value IS NULL OR p_value = 'null'::jsonb THEN RETURN NULL; END IF;
 IF jsonb_typeof(p_value) <> 'string'
   OR (p_value #>> '{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 RETURN (p_value #>> '{}')::uuid;
END $$;

CREATE FUNCTION private.support_json_text(p_value jsonb, p_max integer) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
 IF p_value IS NULL OR p_value = 'null'::jsonb THEN RETURN NULL; END IF;
 IF jsonb_typeof(p_value) <> 'string' OR length(trim(p_value #>> '{}')) = 0 OR length(p_value #>> '{}') > p_max THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 RETURN p_value #>> '{}';
END $$;

CREATE FUNCTION public.admin_support_case(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; receipt jsonb; c private.support_cases; o private.purchase_orders; v_event uuid;
 keys constant text[] := ARRAY['operationId','caseId','orderId','userId','expectedVersion','action','category','note',
   'amendsEventId','state','resolutionReference'];
 v_op uuid; v_case uuid; v_order uuid; v_user uuid; v_expected integer; v_act text; v_category text; v_note text;
 v_amends uuid; v_state text; v_resolution text; v_retention integer;
BEGIN
 actor := private.support_assert('support.case.write', 'inspection');
 IF jsonb_typeof(p_command) IS DISTINCT FROM 'object'
   OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_command) k WHERE NOT (k = ANY(keys)))
   OR EXISTS (SELECT 1 FROM unnest(keys) k WHERE NOT p_command ? k) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 v_op := private.support_json_uuid(p_command->'operationId');
 v_case := private.support_json_uuid(p_command->'caseId');
 v_order := private.support_json_uuid(p_command->'orderId');
 v_user := private.support_json_uuid(p_command->'userId');
 v_amends := private.support_json_uuid(p_command->'amendsEventId');
 v_note := private.support_json_text(p_command->'note', 2000);
 v_resolution := private.support_json_text(p_command->'resolutionReference', 1000);
 v_act := p_command->>'action'; v_category := p_command->>'category'; v_state := p_command->>'state';
 IF p_command->'expectedVersion' <> 'null'::jsonb THEN
  IF jsonb_typeof(p_command->'expectedVersion') <> 'number' OR (p_command->>'expectedVersion') !~ '^[0-9]{1,9}$' THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  v_expected := (p_command->>'expectedVersion')::integer;
 END IF;
 IF v_op IS NULL OR v_act IS NULL OR v_act NOT IN ('create','append_note','amend_note','set_state')
   OR v_category IS NULL OR v_category NOT IN ('missing_access','unresolved_payment','account_mismatch','refund_followup',
     'dispute_followup','duplicate_purchase','content_availability')
   OR v_state IS NULL OR v_state NOT IN ('open','investigating','waiting_on_customer','waiting_on_provider','resolved') THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 receipt := private.admin_begin_operation(actor, v_op, 'support.case.' || v_act, coalesce(v_case, v_order, v_user),
   p_command - 'operationId');
 IF receipt IS NOT NULL THEN RETURN receipt; END IF;

 -- The order and the account must agree; a case's account is the order's owner principal.
 IF v_order IS NOT NULL THEN
  SELECT * INTO o FROM private.purchase_orders WHERE id = v_order;
  IF NOT FOUND OR (v_user IS NOT NULL AND v_user IS DISTINCT FROM o.user_id AND v_user IS DISTINCT FROM o.owner_principal) THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  v_user := o.owner_principal;
 ELSIF v_user IS NULL OR NOT (EXISTS (SELECT 1 FROM auth.users WHERE id = v_user)
   OR EXISTS (SELECT 1 FROM private.purchase_orders WHERE owner_principal = v_user)) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 SELECT note_retention_days INTO v_retention FROM private.support_workspace_settings WHERE singleton;
 IF v_note IS NOT NULL AND v_retention IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_BLOCKED';
 END IF;

 IF v_act = 'create' THEN
  IF v_case IS NOT NULL OR v_expected IS NOT NULL OR v_state <> 'open' OR v_amends IS NOT NULL OR v_resolution IS NOT NULL THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  INSERT INTO private.support_cases(order_id, user_id, category, state, created_by)
  VALUES (v_order, v_user, v_category, 'open', actor) RETURNING * INTO c;
  INSERT INTO private.support_case_events(case_id, action, actor_id, state, operation_id)
  VALUES (c.id, 'create', actor, 'open', v_op) RETURNING id INTO v_event;
 ELSE
  IF v_case IS NULL OR v_expected IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
  SELECT * INTO c FROM private.support_cases WHERE id = v_case FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
  IF c.order_id IS DISTINCT FROM v_order OR c.user_id IS DISTINCT FROM v_user OR c.category <> v_category THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  IF c.version <> v_expected THEN RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT'; END IF;
  IF v_act = 'append_note' THEN
   IF v_note IS NULL OR v_amends IS NOT NULL OR v_resolution IS NOT NULL OR v_state <> c.state THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
   END IF;
   INSERT INTO private.support_case_events(case_id, action, actor_id, state, operation_id)
   VALUES (c.id, 'append_note', actor, c.state, v_op) RETURNING id INTO v_event;
  ELSIF v_act = 'amend_note' THEN
   IF v_note IS NULL OR v_resolution IS NOT NULL OR v_state <> c.state OR v_amends IS NULL
     OR NOT EXISTS (SELECT 1 FROM private.support_case_events e JOIN private.support_note_texts n ON n.event_id = e.id
       WHERE e.id = v_amends AND e.case_id = c.id) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
   END IF;
   INSERT INTO private.support_case_events(case_id, action, actor_id, state, amends_event_id, operation_id)
   VALUES (c.id, 'amend_note', actor, c.state, v_amends, v_op) RETURNING id INTO v_event;
  ELSE
   -- Resolving needs the recorded outcome: a post-check receipt or the action left with the customer.
   IF v_note IS NOT NULL OR v_amends IS NOT NULL OR v_state = c.state
     OR (v_state = 'resolved') <> (v_resolution IS NOT NULL) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
   END IF;
   INSERT INTO private.support_case_events(case_id, action, actor_id, state, resolution_reference, operation_id)
   VALUES (c.id, 'set_state', actor, v_state, v_resolution, v_op) RETURNING id INTO v_event;
   c.state := v_state; c.resolution_reference := v_resolution;
  END IF;
  UPDATE private.support_cases SET state = c.state, resolution_reference = c.resolution_reference,
   version = c.version + 1, updated_at = clock_timestamp() WHERE id = c.id RETURNING * INTO c;
 END IF;
 IF v_note IS NOT NULL THEN
  INSERT INTO private.support_note_texts(event_id, text) VALUES (v_event, v_note);
 END IF;
 receipt := private.support_case_json(c);
 PERFORM private.admin_finish_operation(actor, v_op, receipt);
 RETURN receipt;
END $$;

-- Owner-only: clear a note's text, recording who, when and why. The text is not copied anywhere.
CREATE FUNCTION public.admin_support_redact_note(p_event_id uuid, p_reason text, p_operation_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; receipt jsonb; n private.support_note_texts; v_case uuid;
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 IF NOT EXISTS (SELECT 1 FROM private.admin_memberships WHERE user_id = actor AND role = 'owner' AND active) THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='ADM_DENIED';
 END IF;
 IF p_event_id IS NULL OR p_operation_id IS NULL OR length(trim(coalesce(p_reason, ''))) NOT BETWEEN 1 AND 1000 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 receipt := private.admin_begin_operation(actor, p_operation_id, 'support.note.redact', p_event_id,
   jsonb_build_object('reason', p_reason));
 IF receipt IS NOT NULL THEN RETURN receipt; END IF;
 SELECT * INTO n FROM private.support_note_texts WHERE event_id = p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 IF n.redacted_at IS NULL THEN
  UPDATE private.support_note_texts SET text = NULL, redacted_at = clock_timestamp(), redacted_by = actor,
   redaction_reason = p_reason WHERE event_id = p_event_id RETURNING * INTO n;
  SELECT e.case_id INTO v_case FROM private.support_case_events e WHERE e.id = p_event_id;
  INSERT INTO private.support_case_events(case_id, action, actor_id, amends_event_id, operation_id)
  VALUES (v_case, 'redact_note', actor, p_event_id, p_operation_id);
 END IF;
 receipt := jsonb_build_object('eventId', p_event_id, 'redactedAt', n.redacted_at);
 PERFORM private.admin_finish_operation(actor, p_operation_id, receipt);
 RETURN receipt;
END $$;

-- Items needing attention, from local records only (Stripe is never scanned here). An ordinary open checkout is not
-- a failure. Cases without an order appear in both modes. Newest first, 25 a page; the cursor is "<at>|<key>".
-- What an attention item means for the customer's access, from verified local facts only: 'at_risk' while a formal
-- dispute or a refund is pending, 'blocked' when a verified, not fully refunded payment has no access behind it,
-- 'none' otherwise, and 'unknown' without a verified payment or an account.
CREATE FUNCTION private.support_access_consequence(p_order_id uuid, p_reason text) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE o private.purchase_orders; pay private.provider_payments; v_refunded bigint;
BEGIN
 SELECT * INTO o FROM private.purchase_orders WHERE id = p_order_id;
 IF o.id IS NULL OR o.user_id IS NULL THEN RETURN 'unknown'; END IF;
 IF p_reason IN ('DISPUTE_OPEN','REFUND_PENDING') THEN RETURN 'at_risk'; END IF;
 SELECT * INTO pay FROM private.provider_payments WHERE order_id = o.id AND status = 'succeeded' AND verified_at IS NOT NULL
 ORDER BY paid_at DESC NULLS LAST LIMIT 1;
 IF pay.id IS NULL THEN RETURN 'unknown'; END IF;
 SELECT coalesce(sum(amount), 0) INTO v_refunded FROM private.payment_refunds WHERE payment_id = pay.id AND status = 'succeeded';
 IF v_refunded >= pay.captured_amount THEN RETURN 'none'; END IF;
 IF EXISTS (SELECT 1 FROM private.payment_disputes WHERE order_id = o.id AND status IN ('needs_response','under_review','lost')) THEN
  RETURN 'at_risk';
 END IF;
 RETURN CASE WHEN private.collection_has_access(o.user_id, private.support_order_collection(o)) THEN 'none' ELSE 'blocked' END;
END $$;
REVOKE ALL ON FUNCTION private.support_access_consequence(uuid,text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.admin_support_queue(p_mode text, p_cursor text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; after_at timestamptz; after_key text; items jsonb; more boolean; last_at timestamptz; last_key text;
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 IF p_mode IS NULL OR p_mode NOT IN ('test','live') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 IF p_cursor IS NOT NULL THEN
  IF length(p_cursor) > 120 OR p_cursor !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z\|[A-Z_]{1,40}:[0-9a-f-]{36}$' THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  after_at := split_part(p_cursor, '|', 1)::timestamptz;
  after_key := split_part(p_cursor, '|', 2);
 END IF;
 WITH signals(order_id, case_id, support_reference, mode, reason_code, observed_at, key, deadline_at) AS (
  SELECT o.id, NULL::uuid, o.support_reference, o.snapshot->>'provider_mode', 'ORDER_REVIEW', o.updated_at, 'ORDER_REVIEW:' || o.id, NULL::timestamptz
   FROM private.purchase_orders o WHERE o.attempt_state = 'review' AND o.snapshot->>'provider_mode' = p_mode
  UNION ALL
  SELECT c.order_id, c.id, o.support_reference, coalesce(o.snapshot->>'provider_mode', p_mode), 'CASE_' || upper(c.state),
   c.updated_at, 'CASE:' || c.id, NULL
   FROM private.support_cases c LEFT JOIN private.purchase_orders o ON o.id = c.order_id
   WHERE c.state <> 'resolved' AND (o.id IS NULL OR o.snapshot->>'provider_mode' = p_mode)
  UNION ALL
  SELECT r.order_id, NULL, o.support_reference, p.provider_mode,
   CASE WHEN r.status IN ('pending','requires_action') THEN 'REFUND_PENDING' ELSE 'REFUND_FAILED' END, r.verified_at, 'REFUND:' || r.id, NULL
   FROM private.payment_refunds r JOIN private.provider_payments p ON p.id = r.payment_id
   JOIN private.purchase_orders o ON o.id = r.order_id
   WHERE r.status IN ('pending','requires_action','failed','canceled') AND p.provider_mode = p_mode
  UNION ALL
  SELECT d.order_id, NULL, o.support_reference, p.provider_mode,
   CASE WHEN private.support_dispute_classification(d.status) = 'inquiry' THEN 'DISPUTE_INQUIRY' ELSE 'DISPUTE_OPEN' END,
   d.updated_at, 'DISPUTE:' || d.id,
   -- Only a formal dispute's deadline, as Stripe gave it; an inquiry or a missing deadline shows none.
   CASE WHEN private.support_dispute_classification(d.status) = 'formal' THEN d.response_deadline END
   FROM private.payment_disputes d JOIN private.provider_payments p ON p.id = d.payment_id
   JOIN private.purchase_orders o ON o.id = d.order_id
   WHERE d.status IN ('warning_needs_response','warning_under_review','needs_response','under_review') AND p.provider_mode = p_mode),
 numbered AS (
  SELECT s.*, row_number() OVER (ORDER BY observed_at DESC, key DESC) rn FROM signals s
  WHERE after_at IS NULL OR (s.observed_at, s.key) < (after_at, after_key))
 SELECT coalesce(jsonb_agg(jsonb_build_object('orderId', order_id, 'caseId', case_id, 'supportReference', support_reference,
   'mode', mode, 'reasonCode', reason_code, 'observedAt', observed_at, 'deadlineAt', deadline_at,
   'accessConsequence', private.support_access_consequence(order_id, reason_code)) ORDER BY rn) FILTER (WHERE rn <= 25), '[]'::jsonb),
   count(*) > 25, max(observed_at) FILTER (WHERE rn = 25), max(key) FILTER (WHERE rn = 25)
 INTO items, more, last_at, last_key FROM numbered;
 PERFORM private.support_audit_read(actor, 'queue', NULL, 'found');
 RETURN jsonb_build_object('items', items, 'nextCursor', CASE WHEN more THEN
   to_char(last_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || last_key END);
END $$;

REVOKE ALL ON FUNCTION private.support_case_json(private.support_cases), private.support_json_uuid(jsonb),
 private.support_json_text(jsonb,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_support_case(jsonb), public.admin_support_redact_note(uuid,text,uuid),
 public.admin_support_queue(text,text), public.admin_support_history(uuid,text), public.admin_support_cases(uuid,text)
 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_case(jsonb), public.admin_support_redact_note(uuid,text,uuid),
 public.admin_support_queue(text,text), public.admin_support_history(uuid,text), public.admin_support_cases(uuid,text)
 TO authenticated;
