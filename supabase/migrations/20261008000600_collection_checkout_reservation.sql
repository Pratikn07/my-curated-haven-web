-- Phase 2: checkout is bound to the reviewed collection publication.
-- A reservation locks the collection, checks that the buyer's page still matches what is on sale
-- (publication, release, offer, members, terms), checks ownership across every release, reuses an
-- unresolved attempt for any release of the collection, and freezes the full terms into the order.
-- The provider session is created from that frozen snapshot. Prices and sale switches are never changed.

-- Digest of every financial and enablement field of an offer.
CREATE FUNCTION private.collection_offer_terms_digest(p_offer private.commercial_offers) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT private.collection_digest(jsonb_build_object('account',p_offer.provider_account_id,'mode',p_offer.provider_mode,
  'product',p_offer.provider_product_id,'price',p_offer.provider_price_id,'currency',p_offer.currency,
  'amount',p_offer.base_minor_amount,'tax',p_offer.tax_mode,'quantity',p_offer.quantity,'terms',p_offer.terms_version,
  'refund',p_offer.refund_policy_version,'access',p_offer.access_policy_version,'saleEnabled',p_offer.sale_enabled))
$$;

-- What is on sale for a collection right now, or NULL. A database-sourced collection sells only its current
-- published release; a legacy collection keeps today's rule (newest published/sealed release with an
-- enabled offer).
CREATE FUNCTION private.collection_sellable(p_collection_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE mode text; delivered uuid; v_release uuid; offer private.commercial_offers; members jsonb; pub uuid; manifest text;
BEGIN
 SELECT source_mode INTO mode FROM private.collection_sources WHERE collection_id=p_collection_id;
 delivered := private.collection_delivered_release(p_collection_id);
 IF coalesce(mode,'legacy')='database' THEN
  v_release := delivered;
 ELSE
  SELECT r.id INTO v_release FROM public.collection_releases r
  WHERE r.collection_id=p_collection_id AND r.state IN ('published','sealed')
    AND EXISTS(SELECT 1 FROM private.commercial_offers o WHERE o.release_id=r.id AND o.sale_enabled)
  ORDER BY r.version DESC LIMIT 1;
 END IF;
 IF v_release IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO offer FROM private.commercial_offers WHERE release_id=v_release AND sale_enabled
  ORDER BY created_at DESC, id LIMIT 1;
 IF offer.id IS NULL THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_agg(recipe_id ORDER BY position),'[]'::jsonb) INTO members FROM public.collection_recipes
  WHERE collection_recipes.release_id=v_release;
 SELECT a.publication_id INTO pub FROM private.collection_active_publications a JOIN private.collection_publications p
  ON p.id=a.publication_id WHERE a.collection_id=p_collection_id AND p.release_id=v_release;
 manifest := private.collection_digest(members);
 RETURN jsonb_build_object('publicationId',pub,'releaseId',v_release,'offerId',offer.id,'manifestHash',manifest,
  'sourceDigest',private.collection_digest(jsonb_build_object('publicationId',pub,'releaseId',v_release,'manifest',manifest,
    'offerId',offer.id,'terms',private.collection_offer_terms_digest(offer))),
  'memberIds',members,
  'offer',jsonb_build_object('id',offer.id,'providerAccountId',offer.provider_account_id,'providerMode',offer.provider_mode,
    'providerProductId',offer.provider_product_id,'providerPriceId',offer.provider_price_id,'currency',offer.currency,
    'baseMinorAmount',offer.base_minor_amount,'taxMode',offer.tax_mode,'quantity',offer.quantity,
    'termsVersion',offer.terms_version,'refundPolicyVersion',offer.refund_policy_version,
    'accessPolicyVersion',offer.access_policy_version));
END $$;

CREATE FUNCTION private.collection_order_json(p_order private.purchase_orders) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',p_order.id,'supportReference',p_order.support_reference,'userId',p_order.user_id,
  'offerId',p_order.offer_id,'releaseId',p_order.release_id,'snapshot',p_order.snapshot,'attemptState',p_order.attempt_state,
  'sessionId',p_order.session_id,'checkoutUrl',p_order.checkout_url,'idempotencyKey',p_order.idempotency_key)
$$;

-- reserved | existing | owned | stale | unavailable | review_required
CREATE FUNCTION private.reserve_collection_order(p_user_id uuid, p_collection_id uuid, p_expected jsonb, p_idempotency_key text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE sellable jsonb; pending private.purchase_orders; pending_count int; created private.purchase_orders; snap jsonb; ref text;
BEGIN
 IF p_user_id IS NULL OR p_collection_id IS NULL OR length(coalesce(p_idempotency_key,'')) NOT BETWEEN 8 AND 200 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='CHECKOUT_INVALID';
 END IF;
 PERFORM 1 FROM public.recipe_collections WHERE id=p_collection_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('state','unavailable','order',null,'expected',null); END IF;
 IF private.collection_has_access(p_user_id, p_collection_id) THEN
  RETURN jsonb_build_object('state','owned','order',null,'expected',null);
 END IF;
 -- An unresolved attempt for any release of this collection is reused with its own frozen snapshot.
 SELECT count(*) INTO pending_count FROM private.purchase_orders po JOIN public.collection_releases r ON r.id=po.release_id
  WHERE po.user_id=p_user_id AND r.collection_id=p_collection_id
    AND po.attempt_state IN ('creating','creation_unknown','open','processing');
 IF pending_count > 1 THEN RETURN jsonb_build_object('state','review_required','order',null,'expected',null); END IF;
 IF pending_count = 1 THEN
  SELECT po.* INTO pending FROM private.purchase_orders po JOIN public.collection_releases r ON r.id=po.release_id
   WHERE po.user_id=p_user_id AND r.collection_id=p_collection_id
     AND po.attempt_state IN ('creating','creation_unknown','open','processing') FOR UPDATE OF po;
  RETURN jsonb_build_object('state','existing','order',private.collection_order_json(pending),'expected',null);
 END IF;
 sellable := private.collection_sellable(p_collection_id);
 IF sellable IS NULL THEN RETURN jsonb_build_object('state','unavailable','order',null,'expected',null); END IF;
 IF p_expected IS NULL OR jsonb_typeof(p_expected)<>'object'
  OR (p_expected->>'publicationId') IS DISTINCT FROM (sellable->>'publicationId')
  OR (p_expected->>'releaseId') IS DISTINCT FROM (sellable->>'releaseId')
  OR (p_expected->>'offerId') IS DISTINCT FROM (sellable->>'offerId')
  OR (p_expected->>'manifestHash') IS DISTINCT FROM (sellable->>'manifestHash')
  OR (p_expected->>'sourceDigest') IS DISTINCT FROM (sellable->>'sourceDigest') THEN
  RETURN jsonb_build_object('state','stale','order',null,'expected',sellable - 'offer' - 'memberIds');
 END IF;
 snap := jsonb_build_object(
  -- Fields the payment writer already validates, under their established names.
  'offer_id',sellable#>>'{offer,id}','release_id',sellable->>'releaseId','price_id',sellable#>>'{offer,providerPriceId}',
  'price_minor',(sellable#>>'{offer,baseMinorAmount}')::int,'currency',sellable#>>'{offer,currency}',
  'provider_account_id',sellable#>>'{offer,providerAccountId}','provider_mode',sellable#>>'{offer,providerMode}',
  'terms_version',sellable#>>'{offer,termsVersion}',
  -- The rest of the frozen promise.
  'collection_id',p_collection_id,'publication_id',sellable->>'publicationId','product_id',sellable#>>'{offer,providerProductId}',
  'tax_mode',sellable#>>'{offer,taxMode}','quantity',(sellable#>>'{offer,quantity}')::int,
  'refund_policy_version',sellable#>>'{offer,refundPolicyVersion}','access_policy_version',sellable#>>'{offer,accessPolicyVersion}',
  'member_recipe_ids',sellable->'memberIds','manifest_hash',sellable->>'manifestHash','source_digest',sellable->>'sourceDigest',
  'frozen_at',now());
 LOOP
  ref := 'MCH-'||upper(substr(md5(gen_random_uuid()::text),1,6));
  EXIT WHEN NOT EXISTS(SELECT 1 FROM private.purchase_orders WHERE support_reference=ref);
 END LOOP;
 INSERT INTO private.purchase_orders(support_reference,owner_principal,user_id,offer_id,release_id,snapshot,attempt_state,idempotency_key)
 VALUES(ref,p_user_id,p_user_id,(sellable#>>'{offer,id}')::uuid,(sellable->>'releaseId')::uuid,snap,'creating',p_idempotency_key)
 RETURNING * INTO created;
 RETURN jsonb_build_object('state','reserved','order',private.collection_order_json(created),'expected',null);
END $$;

-- Move an existing offer to a new release. Only the trusted publication writer calls this; it changes the
-- release binding and manifest hash, and refuses if any financial or enablement field changed since review.
CREATE FUNCTION private.collection_advance_offer(p_offer_id uuid, p_release_id uuid, p_manifest_hash text, p_expected_terms_digest text)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE offer private.commercial_offers;
BEGIN
 SELECT * INTO offer FROM private.commercial_offers WHERE id=p_offer_id FOR UPDATE;
 IF offer.id IS NULL OR private.collection_offer_terms_digest(offer) IS DISTINCT FROM p_expected_terms_digest THEN
  RAISE EXCEPTION USING ERRCODE='PT409', MESSAGE='ADM_CONFLICT';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.collection_releases n JOIN public.collection_releases o ON o.collection_id=n.collection_id
   WHERE n.id=p_release_id AND o.id=offer.release_id) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ADM_INVALID';
 END IF;
 UPDATE private.commercial_offers SET release_id=p_release_id, manifest_hash=p_manifest_hash, updated_at=now() WHERE id=p_offer_id;
END $$;

-- Payment recording takes the collection lock first; everything else is unchanged from
-- 20260924174355_phase8_remediation_guards.sql.
CREATE OR REPLACE FUNCTION private.record_payment_and_grant_access(
  p_order_id UUID,
  p_provider_account_id TEXT,
  p_provider_mode TEXT,
  p_payment_intent_id TEXT,
  p_charge_id TEXT,
  p_captured_amount INT,
  p_currency TEXT,
  p_paid_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_payment_id UUID;
  v_entitlement_state TEXT;
  v_expected_amount INT;
  v_expected_currency TEXT;
  v_expected_mode TEXT;
  v_expected_provider_account_id TEXT;
BEGIN
  -- Collection first, then the order: the lock order checkout reservation and publication also use.
  PERFORM 1
  FROM public.recipe_collections c
  JOIN public.collection_releases r ON r.collection_id = c.id
  JOIN private.purchase_orders po ON po.release_id = r.id
  WHERE po.id = p_order_id
  FOR UPDATE OF c;

  SELECT po.*
  INTO v_order
  FROM private.purchase_orders po
  WHERE po.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  BEGIN
    v_expected_amount := NULLIF(v_order.snapshot->>'price_minor', '')::INT;
  EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      v_expected_amount := NULL;
  END;
  v_expected_provider_account_id := NULLIF(v_order.snapshot->>'provider_account_id', '');
  v_expected_currency := lower(NULLIF(v_order.snapshot->>'currency', ''));
  v_expected_mode := NULLIF(v_order.snapshot->>'provider_mode', '');

  IF v_expected_amount IS NULL
     OR p_captured_amount IS DISTINCT FROM v_expected_amount
     OR v_expected_currency IS NULL
     OR lower(p_currency) IS DISTINCT FROM v_expected_currency
     OR v_expected_provider_account_id IS NULL
     OR p_provider_account_id IS DISTINCT FROM v_expected_provider_account_id
     OR p_provider_mode IS DISTINCT FROM v_expected_mode THEN
    UPDATE private.purchase_orders
    SET attempt_state = 'review', updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'attempt_state', 'review',
      'reason', 'payment_snapshot_mismatch'
    );
  END IF;

  INSERT INTO private.provider_payments AS existing_payment (
    order_id,
    provider_account_id,
    provider_mode,
    payment_intent_id,
    charge_id,
    status,
    captured_amount,
    currency,
    paid_at,
    verified_at
  )
  VALUES (
    p_order_id,
    p_provider_account_id,
    p_provider_mode,
    p_payment_intent_id,
    p_charge_id,
    'succeeded',
    p_captured_amount,
    lower(p_currency),
    p_paid_at,
    now()
  )
  ON CONFLICT (provider_account_id, provider_mode, payment_intent_id)
  DO UPDATE SET
    verified_at = now(),
    status = EXCLUDED.status
  WHERE existing_payment.order_id = EXCLUDED.order_id
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    UPDATE private.purchase_orders
    SET attempt_state = 'review', updated_at = now()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'order_id', p_order_id,
      'attempt_state', 'review',
      'reason', 'payment_intent_already_bound'
    );
  END IF;

  IF v_order.user_id IS NOT NULL THEN
    INSERT INTO private.access_sources (
      user_id,
      release_id,
      source_kind,
      source_id,
      is_eligible,
      valid_from
    )
    VALUES (
      v_order.user_id,
      v_order.release_id,
      'stripe_purchase',
      p_order_id::text,
      true,
      now()
    )
    ON CONFLICT (source_kind, source_id, release_id)
    DO UPDATE SET
      is_eligible = true,
      ineligibility_reason = NULL,
      updated_at = now();

    v_entitlement_state := private.project_user_entitlement(v_order.user_id, v_order.release_id);
  END IF;

  UPDATE private.purchase_orders
  SET attempt_state = 'closed', updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO private.commerce_outbox (
    idempotency_key,
    order_id,
    event_kind,
    payload
  )
  VALUES (
    'order-paid-' || p_order_id::text,
    p_order_id,
    'purchase_confirmed',
    jsonb_build_object(
      'order_id', p_order_id,
      'support_reference', v_order.support_reference,
      'amount', p_captured_amount,
      'currency', lower(p_currency),
      'paid_at', p_paid_at
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'payment_id', v_payment_id,
    'entitlement_state', v_entitlement_state
  );
END;
$$;

REVOKE ALL ON FUNCTION private.collection_offer_terms_digest(private.commercial_offers), private.collection_sellable(uuid),
 private.collection_order_json(private.purchase_orders), private.reserve_collection_order(uuid,uuid,jsonb,text),
 private.collection_advance_offer(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
