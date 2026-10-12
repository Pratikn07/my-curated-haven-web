-- Phase 3: exact customer lookup and purchase reads for support staff.
--
-- Lookups match exactly: emails after trimming and lower-casing (as Team lookup does), never LIKE, substring or
-- address rewriting; support references in either format; provider ids only inside an explicit account and mode
-- and only for staff who may inspect provider details. Order reads return the order's frozen terms and leave
-- missing older fields unknown instead of borrowing today's offer or title. Nothing here reads children, chats or
-- preferences, and nothing writes.

-- The response deadline Stripe gives a dispute (evidence due by), recorded by reconciliation (20261009010600).
ALTER TABLE private.payment_disputes ADD COLUMN response_deadline timestamptz;

-- Accounts whose sign-in email or any linked identity email equals p_email after trim and lower-case.
CREATE FUNCTION private.support_email_matches(p_email text) RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(array_agg(DISTINCT u.id), '{}') FROM auth.users u
 WHERE lower(trim(u.email)) = lower(trim(p_email))
    OR EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
      AND lower(trim(i.identity_data->>'email')) = lower(trim(p_email)))
$$;

-- Does p_actor currently hold p_permission through an active membership? (Stage is checked by support_assert.)
CREATE FUNCTION private.support_has(p_actor uuid, p_permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM private.admin_memberships
   WHERE user_id = p_actor AND active AND p_permission = ANY(private.admin_permissions(role)))
$$;

CREATE FUNCTION private.support_read(p_value jsonb, p_complete boolean) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('value', p_value, 'checkedAt', now(), 'complete', p_complete, 'resolverVersion', NULL)
$$;

CREATE FUNCTION private.support_found(p_user uuid, p_order uuid, p_principal uuid) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT jsonb_build_object('status', 'found', 'target',
   jsonb_build_object('userId', p_user, 'orderId', p_order, 'ownerPrincipal', p_principal))
$$;

-- Cases, order history and the read audit arrive with 20261009010300; until then these return nothing.
CREATE FUNCTION private.support_customer_cases(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT '[]'::jsonb $$;
CREATE FUNCTION private.support_order_history(p_order uuid, p_cursor text) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT '{"events":[],"nextCursor":null}'::jsonb $$;
CREATE FUNCTION private.support_audit_read(p_actor uuid, p_action text, p_target text, p_outcome text) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN NULL; END $$;

-- The match itself, for an already authorised and validated query.
CREATE FUNCTION private.support_lookup_match(p_kind text, p_value text, p_account text, p_mode text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE matches uuid[]; target auth.users; orders uuid[]; o private.purchase_orders;
BEGIN
 IF p_kind = 'email' THEN
  matches := private.support_email_matches(p_value);
  IF cardinality(matches) = 0 THEN RETURN '{"status":"not_found"}'; END IF;
  IF cardinality(matches) > 1 THEN RETURN '{"status":"ambiguous"}'; END IF;
  SELECT * INTO target FROM auth.users WHERE id = matches[1];
  IF target.email_confirmed_at IS NULL THEN RETURN '{"status":"unconfirmed"}'; END IF;
  RETURN private.support_found(target.id, NULL, target.id);
 ELSIF p_kind = 'user_id' THEN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_value::uuid) THEN
   RETURN private.support_found(p_value::uuid, NULL, p_value::uuid);
  END IF;
  -- A closed account is found only through orders it owned; no account is reconstructed.
  IF EXISTS (SELECT 1 FROM private.purchase_orders WHERE owner_principal = p_value::uuid) THEN
   RETURN private.support_found(NULL, NULL, p_value::uuid);
  END IF;
  RETURN '{"status":"not_found"}';
 ELSIF p_kind = 'support_reference' THEN
  SELECT array_agg(id) INTO orders FROM private.purchase_orders WHERE support_reference = p_value;
 ELSE
  SELECT array_agg(DISTINCT order_id) INTO orders FROM (
   SELECT po.id order_id FROM private.purchase_orders po
    WHERE po.session_id = p_value AND po.snapshot->>'provider_account_id' = p_account AND po.snapshot->>'provider_mode' = p_mode
   UNION ALL
   SELECT p.order_id FROM private.provider_payments p
    WHERE (p.payment_intent_id = p_value OR p.charge_id = p_value) AND p.provider_account_id = p_account AND p.provider_mode = p_mode
   UNION ALL
   SELECT r.order_id FROM private.payment_refunds r JOIN private.provider_payments p ON p.id = r.payment_id
    WHERE r.provider_refund_id = p_value AND p.provider_account_id = p_account AND p.provider_mode = p_mode
   UNION ALL
   SELECT d.order_id FROM private.payment_disputes d JOIN private.provider_payments p ON p.id = d.payment_id
    WHERE d.provider_dispute_id = p_value AND p.provider_account_id = p_account AND p.provider_mode = p_mode) m;
 END IF;
 IF coalesce(cardinality(orders), 0) = 0 THEN RETURN '{"status":"not_found"}'; END IF;
 IF cardinality(orders) > 1 THEN RETURN '{"status":"ambiguous"}'; END IF;
 SELECT * INTO o FROM private.purchase_orders WHERE id = orders[1];
 RETURN private.support_found(o.user_id, o.id, o.owner_principal);
END $$;

CREATE FUNCTION public.admin_support_lookup(p_query jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; kind text := p_query->>'kind'; v text := p_query->>'value'; result jsonb;
 account text := p_query->>'accountId'; mode text := p_query->>'mode';
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 IF jsonb_typeof(p_query) IS DISTINCT FROM 'object' OR jsonb_typeof(p_query->'value') IS DISTINCT FROM 'string'
   OR kind IS NULL OR kind NOT IN ('email','user_id','support_reference','provider_id')
   OR (kind <> 'provider_id' AND (SELECT count(*) FROM jsonb_object_keys(p_query)) <> 2)
   OR (kind = 'provider_id' AND ((SELECT count(*) FROM jsonb_object_keys(p_query)) <> 4
     OR account IS NULL OR account !~ '^acct_[A-Za-z0-9_]{1,64}$' OR mode IS NULL OR mode NOT IN ('test','live')))
   OR length(v) > (CASE WHEN kind = 'email' THEN 320 ELSE 255 END) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 IF NOT private.support_consume_budget(actor, 'lookup') THEN
  RAISE EXCEPTION USING ERRCODE='PT429', MESSAGE='ADM_RATE_LIMITED';
 END IF;
 v := trim(v);
 IF kind = 'user_id' AND v !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 ELSIF kind = 'support_reference' THEN
  v := upper(v);
  IF v !~ '^MCH-[0-9A-Z]{1,6}$' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 ELSIF kind = 'provider_id' THEN
  PERFORM private.support_assert('support.provider.inspect', 'inspection');
  IF v !~ '^(cs_(test|live)_|pi_|ch_|py_|re_|dp_|du_)[A-Za-z0-9_]{1,255}$' THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
 END IF;
 result := private.support_lookup_match(kind, v, account, mode);
 -- The audit keeps what was found, never what was searched for.
 PERFORM private.support_audit_read(actor, 'lookup.' || kind,
   coalesce(result#>>'{target,orderId}', result#>>'{target,ownerPrincipal}'), result->>'status');
 RETURN private.support_read(result, true);
END $$;

-- An account's state as support sees it: never reconstructed from an email.
CREATE FUNCTION private.support_account_state(p_user uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN u.id IS NULL THEN 'closed'
   WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'disabled'
   WHEN u.email_confirmed_at IS NULL THEN 'unconfirmed' ELSE 'active' END
 FROM (SELECT p_user AS id) x LEFT JOIN auth.users u ON u.id = x.id
$$;

-- Stripe distinguishes inquiries (warning_*) from formal disputes.
CREATE FUNCTION private.support_dispute_classification(p_status text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN p_status IN ('warning_needs_response','warning_under_review','warning_closed') THEN 'inquiry'
   WHEN p_status IN ('needs_response','under_review','won','lost','charge_refunded','prevented') THEN 'formal'
   ELSE 'unknown' END
$$;

-- Why p_user_id has (or lacks) access to p_collection_id, from the same Phase 2 rules the customer's library and
-- recipe pages use: releases held through a valid entitlement supply their own recipes; the delivered release adds
-- its recipes when a held release's source has an additions-v1 decision. Withdrawn recipes are listed as held.
-- Nothing is written; reading an explanation can never restore or change access.
CREATE FUNCTION private.support_access_explanation(p_user_id uuid, p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE delivered uuid := private.collection_delivered_release(p_collection_id); delivered_version integer;
 publication uuid; held uuid[]; originals uuid[]; additions uuid[] := '{}'; holds uuid[]; sources jsonb; entitlements jsonb;
BEGIN
 SELECT version INTO delivered_version FROM public.collection_releases WHERE id = delivered;
 SELECT publication_id INTO publication FROM private.collection_active_publications WHERE collection_id = p_collection_id;
 SELECT coalesce(array_agg(r.id), '{}') INTO held FROM public.access_entitlements e
  JOIN public.collection_releases r ON r.id = e.release_id
  WHERE e.user_id = p_user_id AND r.collection_id = p_collection_id AND private.entitlement_valid(e)
    AND r.state IN ('published','sealed','retired');
 SELECT coalesce(array_agg(DISTINCT recipe_id ORDER BY recipe_id), '{}') INTO originals
  FROM public.collection_recipes WHERE release_id = ANY(held);
 IF delivered IS NOT NULL AND EXISTS (SELECT 1 FROM public.collection_releases r WHERE r.id = ANY(held)
   AND delivered_version >= r.version AND private.collection_release_policy(p_user_id, r.id) = 'additions-v1') THEN
  SELECT coalesce(array_agg(DISTINCT recipe_id ORDER BY recipe_id), '{}') INTO additions
   FROM public.collection_recipes WHERE release_id = delivered AND NOT (recipe_id = ANY(originals));
 END IF;
 SELECT coalesce(array_agg(id ORDER BY id), '{}') INTO holds FROM public.recipe_catalog
  WHERE (id = ANY(originals) OR id = ANY(additions)) AND publication_state <> 'published';
 SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'kind', s.source_kind, 'originReleaseId', s.release_id,
   'eligible', s.is_eligible AND s.valid_from <= now() AND (s.expires_at IS NULL OR s.expires_at > now()),
   'reason', CASE WHEN NOT s.is_eligible THEN coalesce(s.ineligibility_reason, 'ineligible')
     WHEN s.valid_from > now() THEN 'not_yet_valid' WHEN s.expires_at <= now() THEN 'expired' END,
   'validFrom', s.valid_from, 'expiresAt', s.expires_at,
   'policyVersion', (SELECT p.policy FROM private.collection_access_policies p
     WHERE p.release_id = s.release_id AND p.source_kind = s.source_kind))
   ORDER BY r.version, s.valid_from, s.id), '[]'::jsonb) INTO sources
  FROM private.access_sources s JOIN public.collection_releases r ON r.id = s.release_id
  WHERE s.user_id = p_user_id AND r.collection_id = p_collection_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('release', e.release_id, 'state', e.state, 'validFrom', e.valid_from,
   'expiresAt', e.expires_at, 'revokedAt', e.revoked_at) ORDER BY e.release_id), '[]'::jsonb) INTO entitlements
  FROM public.access_entitlements e JOIN public.collection_releases r ON r.id = e.release_id
  WHERE e.user_id = p_user_id AND r.collection_id = p_collection_id;
 RETURN jsonb_build_object('collectionId', p_collection_id, 'publicationId', publication,
  'resolverVersion', 'phase2-additions-v1',
  -- Changes whenever anything the explanation depends on changes, so a repair prepared against it can be refused.
  'dependencyToken', private.support_digest(jsonb_build_object('delivered', delivered, 'publication', publication,
    'originals', to_jsonb(originals), 'additions', to_jsonb(additions), 'holds', to_jsonb(holds), 'sources', sources,
    'entitlements', entitlements)),
  'effective', CASE WHEN private.collection_has_access(p_user_id, p_collection_id) THEN 'active' ELSE 'denied' END,
  'originalRecipeIds', to_jsonb(originals), 'additionRecipeIds', to_jsonb(additions),
  'contentHoldRecipeIds', to_jsonb(holds), 'sources', sources);
END $$;

CREATE FUNCTION private.support_order_collection(p_order private.purchase_orders) RETURNS uuid
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce((p_order.snapshot->>'collection_id')::uuid,
   (SELECT collection_id FROM public.collection_releases WHERE id = p_order.release_id))
$$;

-- The access explanation for an order's owner and collection.
CREATE FUNCTION public.admin_support_access(p_order_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; o private.purchase_orders; explanation jsonb;
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 SELECT * INTO o FROM private.purchase_orders WHERE id = p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 explanation := private.support_access_explanation(coalesce(o.user_id, o.owner_principal), private.support_order_collection(o));
 PERFORM private.support_audit_read(actor, 'access', o.id::text, explanation->>'effective');
 RETURN jsonb_set(private.support_read(explanation, true), '{resolverVersion}', explanation->'resolverVersion');
END $$;

CREATE FUNCTION public.admin_support_order(p_order_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; o private.purchase_orders; snap jsonb; inspect boolean; pay private.provider_payments;
 manifest text; collection uuid; historical jsonb; complete boolean; payment_state text; value jsonb;
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 IF p_order_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 SELECT * INTO o FROM private.purchase_orders WHERE id = p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND'; END IF;
 inspect := private.support_has(actor, 'support.provider.inspect');
 snap := o.snapshot;
 SELECT * INTO pay FROM private.provider_payments WHERE order_id = o.id
  ORDER BY (status = 'succeeded') DESC, paid_at DESC, id LIMIT 1;
 -- The release manifest is immutable, so it is historical truth even when an older snapshot lacks the hash.
 SELECT manifest_checksum INTO manifest FROM private.release_manifests WHERE release_id = o.release_id;
 SELECT collection_id INTO collection FROM public.collection_releases WHERE id = o.release_id;
 historical := jsonb_build_object('releaseId', o.release_id,
   'manifestHash', coalesce(snap->>'manifest_hash', manifest),
   'refundPolicyVersion', snap->>'refund_policy_version', 'accessPolicyVersion', snap->>'access_policy_version',
   'expectedCapturedMinor', (snap->>'price_minor')::int, 'currency', snap->>'currency');
 complete := historical->>'manifestHash' IS NOT NULL AND historical->>'refundPolicyVersion' IS NOT NULL
   AND historical->>'accessPolicyVersion' IS NOT NULL AND historical->>'expectedCapturedMinor' IS NOT NULL
   AND historical->>'currency' IS NOT NULL;
 payment_state := CASE WHEN pay.status = 'succeeded' THEN 'paid'
   WHEN o.attempt_state IN ('creating','creation_unknown','open') THEN 'unpaid'
   WHEN o.attempt_state = 'processing' THEN 'processing'
   ELSE 'unknown' END;  -- review, or closed with no recorded payment: closed does not mean unpaid
 value := jsonb_build_object(
  'orderId', o.id, 'userId', o.user_id, 'ownerPrincipal', o.owner_principal,
  'collectionId', coalesce((snap->>'collection_id')::uuid, collection),
  'binding', CASE WHEN inspect THEN jsonb_build_object('orderId', o.id, 'userId', o.user_id,
    'ownerPrincipal', o.owner_principal, 'collectionId', coalesce((snap->>'collection_id')::uuid, collection),
    'releaseId', o.release_id, 'sessionId', o.session_id, 'accountId', snap->>'provider_account_id',
    'mode', snap->>'provider_mode', 'expectedCapturedMinor', (snap->>'price_minor')::int, 'currency', snap->>'currency',
    'manifestHash', historical->>'manifestHash', 'refundPolicyVersion', snap->>'refund_policy_version',
    'accessPolicyVersion', snap->>'access_policy_version', 'version', o.version) END,
  'supportReference', o.support_reference, 'historicalComplete', complete, 'historical', historical,
  'historicalTitle', NULL, 'currentTitle', (SELECT title FROM public.recipe_collections WHERE id = collection),
  'attemptState', o.attempt_state, 'accountState', private.support_account_state(o.user_id),
  'paymentState', payment_state,
  'capturedMinor', pay.captured_amount, 'currency', coalesce(pay.currency, snap->>'currency'),
  'successfulRefundMinor', CASE WHEN pay.id IS NULL THEN NULL ELSE coalesce((SELECT sum(amount)::int
    FROM private.payment_refunds WHERE order_id = o.id AND status = 'succeeded'), 0) END,
  'refunds', coalesce((SELECT jsonb_agg(jsonb_build_object('amountMinor', r.amount, 'currency', r.currency, 'status', r.status,
    'occurredAt', r.occurred_at, 'providerRefundId', CASE WHEN inspect THEN r.provider_refund_id END)
    ORDER BY r.occurred_at, r.id) FROM private.payment_refunds r WHERE r.order_id = o.id), '[]'::jsonb),
  'disputes', coalesce((SELECT jsonb_agg(jsonb_build_object('amountMinor', d.amount, 'currency', d.currency, 'status', d.status,
    'classification', private.support_dispute_classification(d.status), 'deadline', d.response_deadline,
    'providerDisputeId', CASE WHEN inspect THEN d.provider_dispute_id END)
    ORDER BY d.created_at, d.id) FROM private.payment_disputes d WHERE d.order_id = o.id), '[]'::jsonb),
  'providerVerifiedAt', (SELECT max(verified_at) FROM private.provider_payments WHERE order_id = o.id),
  'access', private.support_access_explanation(coalesce(o.user_id, o.owner_principal), private.support_order_collection(o)),
  'history', private.support_order_history(o.id, NULL));
 PERFORM private.support_audit_read(actor, 'order', o.id::text, 'found');
 RETURN private.support_read(value, complete);
END $$;

-- A customer and their orders, newest first, 25 per page. The cursor is "<created_at>|<order id>".
CREATE FUNCTION public.admin_support_customer(p_user_id uuid, p_cursor text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; target auth.users; after_at timestamptz; after_id uuid; page jsonb; more boolean; last_row record;
BEGIN
 actor := private.support_assert('support.read', 'inspection');
 IF p_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID'; END IF;
 IF p_cursor IS NOT NULL THEN
  IF length(p_cursor) > 80 OR p_cursor !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z\|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
  END IF;
  after_at := split_part(p_cursor, '|', 1)::timestamptz;
  after_id := split_part(p_cursor, '|', 2)::uuid;
 END IF;
 SELECT * INTO target FROM auth.users WHERE id = p_user_id;
 IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM private.purchase_orders WHERE owner_principal = p_user_id) THEN
  RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='ADM_NOT_FOUND';
 END IF;
 CREATE TEMP TABLE IF NOT EXISTS pg_temp.support_customer_page(id uuid, support_reference text, mode text,
  collection_id uuid, created_at timestamptz) ON COMMIT DROP;
 TRUNCATE pg_temp.support_customer_page;
 INSERT INTO pg_temp.support_customer_page
 SELECT o.id, o.support_reference, o.snapshot->>'provider_mode',
  coalesce((o.snapshot->>'collection_id')::uuid, r.collection_id), o.created_at
 FROM private.purchase_orders o JOIN public.collection_releases r ON r.id = o.release_id
 WHERE (o.owner_principal = p_user_id OR o.user_id = p_user_id)
   AND (after_at IS NULL OR (o.created_at, o.id) < (after_at, after_id))
 ORDER BY o.created_at DESC, o.id DESC LIMIT 26;
 more := (SELECT count(*) FROM pg_temp.support_customer_page) > 25;
 SELECT * INTO last_row FROM (SELECT * FROM pg_temp.support_customer_page ORDER BY created_at DESC, id DESC LIMIT 25) p
  ORDER BY created_at ASC, id ASC LIMIT 1;
 SELECT coalesce(jsonb_agg(jsonb_build_object('orderId', id, 'supportReference', support_reference, 'mode', mode,
   'collectionId', collection_id, 'historicalTitle', NULL) ORDER BY created_at DESC, id DESC), '[]'::jsonb) INTO page
 FROM (SELECT * FROM pg_temp.support_customer_page ORDER BY created_at DESC, id DESC LIMIT 25) p;
 PERFORM private.support_audit_read(actor, 'customer', p_user_id::text, 'found');
 RETURN private.support_read(jsonb_build_object('userId', p_user_id, 'email', target.email,
   'confirmed', target.email_confirmed_at IS NOT NULL,
   'available', private.support_account_state(p_user_id) IN ('active','unconfirmed'),
   'orders', page, 'cases', private.support_customer_cases(p_user_id),
   'nextCursor', CASE WHEN more THEN to_char(last_row.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
     || '|' || last_row.id END), true);
END $$;

REVOKE ALL ON FUNCTION private.support_email_matches(text), private.support_has(uuid,text), private.support_read(jsonb,boolean),
 private.support_found(uuid,uuid,uuid), private.support_account_state(uuid), private.support_dispute_classification(text),
 private.support_access_explanation(uuid,uuid), private.support_order_collection(private.purchase_orders),
 private.support_customer_cases(uuid), private.support_order_history(uuid,text), private.support_audit_read(uuid,text,text,text),
 private.support_lookup_match(text,text,text,text)
 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_support_lookup(jsonb), public.admin_support_order(uuid), public.admin_support_customer(uuid,text),
 public.admin_support_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_support_lookup(jsonb), public.admin_support_order(uuid), public.admin_support_customer(uuid,text),
 public.admin_support_access(uuid) TO authenticated;
