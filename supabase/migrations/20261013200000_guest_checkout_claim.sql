-- Pay first, account after (RC-16).
--
-- A parent who is not signed in can buy a collection: the order is reserved for a random guest principal with no
-- user, Stripe collects the email, and the payment is recorded exactly as before (the payment, refund and dispute
-- writers already skip access for an order without a user). After paying, the parent confirms that email with a
-- one-time code; private.claim_guest_orders then attaches every paid, unclaimed order bought with that confirmed
-- email to the account and grants access through the same source and projection the payment writer uses.
--
-- The email typed at Stripe is never trusted on its own: an order is claimed only by an account whose email is
-- confirmed (auth.users.email_confirmed_at) and equal to it. Signed-in purchases are unchanged.

ALTER TABLE private.purchase_orders
 ADD COLUMN buyer_email text CHECK (buyer_email IS NULL OR (buyer_email = lower(btrim(buyer_email))
   AND length(buyer_email) BETWEEN 3 AND 320 AND buyer_email ~ '^[^@[:space:]]+@[^@[:space:]]+$')),
 ADD COLUMN claimed_at timestamptz;

CREATE INDEX purchase_orders_unclaimed_buyer_email ON private.purchase_orders (buyer_email)
 WHERE user_id IS NULL AND buyer_email IS NOT NULL;
CREATE INDEX purchase_orders_guest_principal ON private.purchase_orders (owner_principal)
 WHERE user_id IS NULL;

-- The frozen promise of one sale, shared by guest reservations. Keep in step with private.reserve_collection_order,
-- which builds the same object inline.
CREATE FUNCTION private.collection_order_snapshot(p_collection_id uuid, p_sellable jsonb) RETURNS jsonb
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object(
  'offer_id',p_sellable#>>'{offer,id}','release_id',p_sellable->>'releaseId','price_id',p_sellable#>>'{offer,providerPriceId}',
  'price_minor',(p_sellable#>>'{offer,baseMinorAmount}')::int,'currency',p_sellable#>>'{offer,currency}',
  'provider_account_id',p_sellable#>>'{offer,providerAccountId}','provider_mode',p_sellable#>>'{offer,providerMode}',
  'terms_version',p_sellable#>>'{offer,termsVersion}',
  'collection_id',p_collection_id,'publication_id',p_sellable->>'publicationId','product_id',p_sellable#>>'{offer,providerProductId}',
  'tax_mode',p_sellable#>>'{offer,taxMode}','quantity',(p_sellable#>>'{offer,quantity}')::int,
  'refund_policy_version',p_sellable#>>'{offer,refundPolicyVersion}','access_policy_version',p_sellable#>>'{offer,accessPolicyVersion}',
  'member_recipe_ids',p_sellable->'memberIds','manifest_hash',p_sellable->>'manifestHash','source_digest',p_sellable->>'sourceDigest',
  'checkout_kind','guest','frozen_at',now())
$$;

-- reserved | existing | stale | unavailable | review_required (never "owned": a guest has no account to own anything).
-- p_principal is the guest's own random id from a browser cookie; an unresolved attempt of that guest is reused.
CREATE FUNCTION private.reserve_guest_collection_order(p_principal uuid, p_collection_id uuid, p_expected jsonb, p_idempotency_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sellable jsonb; pending private.purchase_orders; pending_count int; created private.purchase_orders; ref text;
BEGIN
 IF p_principal IS NULL OR p_collection_id IS NULL OR length(coalesce(p_idempotency_key,'')) NOT BETWEEN 8 AND 200 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='CHECKOUT_INVALID';
 END IF;
 -- A guest principal must never be an account: an account buys through private.reserve_collection_order.
 IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_principal) THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='CHECKOUT_INVALID';
 END IF;
 PERFORM 1 FROM public.recipe_collections WHERE id=p_collection_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('state','unavailable','order',null,'expected',null); END IF;
 SELECT count(*) INTO pending_count FROM private.purchase_orders po JOIN public.collection_releases r ON r.id=po.release_id
  WHERE po.owner_principal=p_principal AND po.user_id IS NULL AND r.collection_id=p_collection_id
    AND po.attempt_state IN ('creating','creation_unknown','open','processing');
 IF pending_count > 1 THEN RETURN jsonb_build_object('state','review_required','order',null,'expected',null); END IF;
 IF pending_count = 1 THEN
  SELECT po.* INTO pending FROM private.purchase_orders po JOIN public.collection_releases r ON r.id=po.release_id
   WHERE po.owner_principal=p_principal AND po.user_id IS NULL AND r.collection_id=p_collection_id
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
 LOOP
  ref := 'MCH-'||upper(substr(md5(gen_random_uuid()::text),1,6));
  EXIT WHEN NOT EXISTS(SELECT 1 FROM private.purchase_orders WHERE support_reference=ref);
 END LOOP;
 INSERT INTO private.purchase_orders(support_reference,owner_principal,user_id,offer_id,release_id,snapshot,attempt_state,idempotency_key)
 VALUES(ref,p_principal,NULL,(sellable#>>'{offer,id}')::uuid,(sellable->>'releaseId')::uuid,
   private.collection_order_snapshot(p_collection_id, sellable),'creating',p_idempotency_key)
 RETURNING * INTO created;
 RETURN jsonb_build_object('state','reserved','order',private.collection_order_json(created),'expected',null);
END $$;

-- The email Stripe collected for a paid guest order. Set once; an order that already has a user or an email keeps it.
CREATE FUNCTION private.record_guest_buyer_email(p_order_id uuid, p_email text) RETURNS boolean
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
 IF length(v_email) NOT BETWEEN 3 AND 320 OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' THEN RETURN false; END IF;
 UPDATE private.purchase_orders SET buyer_email = v_email, updated_at = now()
 WHERE id = p_order_id AND user_id IS NULL AND buyer_email IS NULL;
 RETURN FOUND;
END $$;

-- Attach every paid, unclaimed guest order bought with this account's confirmed email, and grant access through the
-- same purchase source and entitlement projection the payment writer uses. Idempotent: a claimed order has a user.
-- A refunded or disputed order is attached with its source ineligible, exactly as the payment writer would record it.
CREATE FUNCTION private.claim_guest_orders(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_email text; v_order record; v_exclusion text; v_claimed int := 0; v_ids uuid[] := '{}';
BEGIN
 SELECT lower(btrim(u.email)) INTO v_email FROM auth.users u
 WHERE u.id = p_user_id AND u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL;
 IF v_email IS NULL THEN RETURN jsonb_build_object('claimed', 0, 'orderIds', '[]'::jsonb); END IF;

 FOR v_order IN
  SELECT po.id, po.release_id FROM private.purchase_orders po
  WHERE po.user_id IS NULL AND po.buyer_email = v_email AND po.attempt_state = 'closed'
    AND EXISTS (SELECT 1 FROM private.provider_payments p WHERE p.order_id = po.id)
  ORDER BY po.created_at, po.id
 LOOP
  -- Collection first, then the order: the lock order checkout reservation and the payment writer use.
  PERFORM 1 FROM public.recipe_collections c JOIN public.collection_releases r ON r.collection_id = c.id
  WHERE r.id = v_order.release_id FOR UPDATE OF c;
  UPDATE private.purchase_orders SET user_id = p_user_id, claimed_at = now(), updated_at = now()
  WHERE id = v_order.id AND user_id IS NULL AND buyer_email = v_email;
  CONTINUE WHEN NOT FOUND;

  v_exclusion := private.commerce_recorded_exclusion(v_order.id);
  INSERT INTO private.access_sources (user_id, release_id, source_kind, source_id, is_eligible, ineligibility_reason, valid_from)
  VALUES (p_user_id, v_order.release_id, 'stripe_purchase', v_order.id::text, v_exclusion IS NULL, v_exclusion, now())
  ON CONFLICT (source_kind, source_id, release_id) DO UPDATE SET
   is_eligible = access_sources.is_eligible AND v_exclusion IS NULL,
   ineligibility_reason = CASE WHEN access_sources.is_eligible AND v_exclusion IS NULL THEN NULL
     ELSE coalesce(v_exclusion, access_sources.ineligibility_reason) END,
   updated_at = now();
  PERFORM private.project_user_entitlement(p_user_id, v_order.release_id);
  v_claimed := v_claimed + 1;
  v_ids := v_ids || v_order.id;
 END LOOP;
 RETURN jsonb_build_object('claimed', v_claimed, 'orderIds', to_jsonb(v_ids));
END $$;

REVOKE ALL ON FUNCTION private.collection_order_snapshot(uuid,jsonb), private.reserve_guest_collection_order(uuid,uuid,jsonb,text),
 private.record_guest_buyer_email(uuid,text), private.claim_guest_orders(uuid) FROM PUBLIC, anon, authenticated;
