import { Pool } from "pg";
import type {
  CommercialOffer,
  PurchaseOrder,
  CollectionOfferDto,
  OrderSummaryDto,
  OwnershipStatus,
  CollectionRecipeSummary,
} from "./types";
import { trustedAnalyticsEnvironment } from "@/lib/analytics/environment";

let poolInstance: Pool | null = null;

export function getCommercePool(): Pool {
  if (!poolInstance) {
    const connectionString =
      process.env.COMMERCE_DATABASE_URL ||
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

    poolInstance = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return poolInstance;
}

export function formatPrice(amountMinor: number, currency: string): string {
  const amount = (amountMinor / 100).toFixed(2);
  const symbol = currency.toUpperCase() === "USD" ? "$" : `${currency.toUpperCase()} `;
  return `${symbol}${amount}`;
}

export async function getCommercialOfferBySlug(slug: string): Promise<{
  offer: CommercialOffer;
  collectionId: string;
  collectionTitle: string;
  releaseId: string;
} | null> {
  const pool = getCommercePool();
  const query = `
    SELECT
      o.id,
      o.release_id,
      o.provider_account_id,
      o.provider_mode,
      o.provider_product_id,
      o.provider_price_id,
      o.currency,
      o.base_minor_amount,
      o.tax_mode,
      o.quantity,
      o.terms_version,
      o.refund_policy_version,
      o.access_policy_version,
      o.sale_enabled,
      o.manifest_hash,
      o.created_at,
      o.updated_at,
      c.id as collection_id,
      c.title as collection_title,
      r.id as resolved_release_id
    FROM public.recipe_collections c
    JOIN public.collection_releases r ON r.collection_id = c.id
    JOIN private.commercial_offers o ON o.release_id = r.id
    WHERE c.slug = $1
      AND o.sale_enabled = true
      AND r.state IN ('published', 'sealed')
    ORDER BY r.version DESC
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [slug]);
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    collectionId: row.collection_id,
    collectionTitle: row.collection_title,
    releaseId: row.resolved_release_id,
    offer: {
      id: row.id,
      releaseId: row.release_id,
      providerAccountId: row.provider_account_id,
      providerMode: row.provider_mode,
      providerProductId: row.provider_product_id,
      providerPriceId: row.provider_price_id,
      currency: row.currency,
      baseMinorAmount: row.base_minor_amount,
      taxMode: row.tax_mode,
      quantity: row.quantity,
      termsVersion: row.terms_version,
      refundPolicyVersion: row.refund_policy_version,
      accessPolicyVersion: row.access_policy_version,
      saleEnabled: row.sale_enabled,
      manifestHash: row.manifest_hash,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    },
  };
}

export async function getCollectionOfferDetails(
  slug: string,
  userId?: string | null
): Promise<CollectionOfferDto | null> {
  const pool = getCommercePool();

  // 1. Fetch collection, latest active release, and offer
  const collectionQuery = `
    SELECT
      c.id as collection_id,
      c.slug as collection_slug,
      c.title as collection_title,
      c.public_summary as collection_summary,
      r.id as release_id,
      r.version as release_version,
      o.id as offer_id,
      o.base_minor_amount,
      o.currency,
      o.terms_version,
      o.sale_enabled
    FROM public.recipe_collections c
    JOIN public.collection_releases r ON r.collection_id = c.id
    LEFT JOIN private.commercial_offers o ON o.release_id = r.id AND o.sale_enabled = true
    WHERE c.slug = $1
      AND r.state IN ('published', 'sealed')
    ORDER BY r.version DESC
    LIMIT 1;
  `;

  const { rows: collRows } = await pool.query(collectionQuery, [slug]);
  if (collRows.length === 0) return null;
  const coll = collRows[0];

  // 2. Fetch member recipes with free-slot flag
  const recipesQuery = `
    SELECT
      rc.id,
      rc.slug,
      rc.title,
      rc.preview_image_path,
      rc.total_minutes,
      cr.position,
      EXISTS(SELECT 1 FROM public.free_recipe_slots frs WHERE frs.recipe_id = rc.id) as is_free
    FROM public.collection_recipes cr
    JOIN public.recipe_catalog rc ON rc.id = cr.recipe_id
    WHERE cr.release_id = $1
      AND rc.publication_state = 'published'
    ORDER BY cr.position ASC;
  `;

  const { rows: recipeRows } = await pool.query(recipesQuery, [coll.release_id]);
  const recipes: CollectionRecipeSummary[] = recipeRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    isFree: Boolean(r.is_free),
    previewImagePath: r.preview_image_path,
    totalMinutes: r.total_minutes,
  }));

  // 3. Determine user ownership state
  let ownershipState: OwnershipStatus = "unauthenticated";

  if (userId) {
    const entitlementQuery = `
      SELECT state
      FROM public.access_entitlements
      WHERE user_id = $1
        AND release_id = $2
        AND state = 'active'
        AND valid_from <= now()
        AND (expires_at IS NULL OR expires_at > now())
        AND revoked_at IS NULL;
    `;
    const { rows: entRows } = await pool.query(entitlementQuery, [userId, coll.release_id]);

    if (entRows.length > 0) {
      ownershipState = "owned";
    } else {
      // Check for pending/open order attempt
      const attemptQuery = `
        SELECT attempt_state
        FROM private.purchase_orders
        WHERE user_id = $1
          AND release_id = $2
          AND attempt_state IN ('creating', 'creation_unknown', 'open', 'processing')
        LIMIT 1;
      `;
      const { rows: attRows } = await pool.query(attemptQuery, [userId, coll.release_id]);
      if (attRows.length > 0) {
        ownershipState = "pending_payment";
      } else {
        ownershipState = "not_owned";
      }
    }
  }

  const basePriceMinor = coll.base_minor_amount || 1500;
  const currency = coll.currency || "usd";

  return {
    collectionId: coll.collection_id,
    collectionSlug: coll.collection_slug,
    collectionTitle: coll.collection_title,
    collectionSummary: coll.collection_summary,
    releaseId: coll.release_id,
    priceMinor: basePriceMinor,
    currency,
    formattedPrice: formatPrice(basePriceMinor, currency),
    saleEnabled: Boolean(coll.sale_enabled),
    termsVersion: coll.terms_version || "2026-09-v1",
    ownershipState,
    recipes,
  };
}

export async function getUserActiveEntitlement(
  userId: string,
  releaseId: string
): Promise<boolean> {
  const pool = getCommercePool();
  const query = `
    SELECT 1
    FROM public.access_entitlements
    WHERE user_id = $1
      AND release_id = $2
      AND state = 'active'
      AND valid_from <= now()
      AND (expires_at IS NULL OR expires_at > now())
      AND revoked_at IS NULL;
  `;
  const { rows } = await pool.query(query, [userId, releaseId]);
  return rows.length > 0;
}

export async function getActiveOrderAttempt(
  userId: string,
  releaseId: string
): Promise<PurchaseOrder | null> {
  const pool = getCommercePool();
  const query = `
    SELECT
      id,
      support_reference,
      owner_principal,
      user_id,
      offer_id,
      release_id,
      snapshot,
      attempt_state,
      session_id,
      checkout_url,
      idempotency_key,
      version,
      created_at,
      updated_at
    FROM private.purchase_orders
    WHERE user_id = $1
      AND release_id = $2
      AND attempt_state IN ('creating', 'creation_unknown', 'open', 'processing')
    ORDER BY created_at DESC
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [userId, releaseId]);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    supportReference: r.support_reference,
    ownerPrincipal: r.owner_principal,
    userId: r.user_id,
    offerId: r.offer_id,
    releaseId: r.release_id,
    snapshot: r.snapshot,
    attemptState: r.attempt_state,
    sessionId: r.session_id,
    checkoutUrl: r.checkout_url,
    idempotencyKey: r.idempotency_key,
    version: r.version,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function reservePurchaseOrder(params: {
  userId: string;
  offerId: string;
  releaseId: string;
  snapshot: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<PurchaseOrder> {
  const pool = getCommercePool();
  const supportRef = "MCH-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  const insertWithReuseQuery = `
    INSERT INTO private.purchase_orders (
      support_reference,
      owner_principal,
      user_id,
      offer_id,
      release_id,
      snapshot,
      attempt_state,
      idempotency_key
    ) VALUES ($1, $2, $2, $3, $4, $5, 'creating', $6)
    ON CONFLICT (user_id, release_id)
      WHERE attempt_state IN ('creating', 'creation_unknown', 'open', 'processing')
      DO NOTHING
    RETURNING
      id,
      support_reference,
      owner_principal,
      user_id,
      offer_id,
      release_id,
      snapshot,
      attempt_state,
      session_id,
      checkout_url,
      idempotency_key,
      version,
      created_at,
      updated_at;
  `;

  const { rows: insertedRows } = await pool.query(insertWithReuseQuery, [
    supportRef,
    params.userId,
    params.offerId,
    params.releaseId,
    JSON.stringify(params.snapshot),
    params.idempotencyKey,
  ]);

  let r = insertedRows[0];
  if (!r) {
    const existing = await pool.query(
      `SELECT id, support_reference, owner_principal, user_id, offer_id, release_id,
              snapshot, attempt_state, session_id, checkout_url, idempotency_key,
              version, created_at, updated_at
       FROM private.purchase_orders
       WHERE user_id = $1 AND release_id = $2
         AND attempt_state IN ('creating', 'creation_unknown', 'open', 'processing')
       ORDER BY created_at DESC
       LIMIT 1`,
      [params.userId, params.releaseId]
    );
    r = existing.rows[0];
    if (!r) throw new Error("Unable to reserve or reuse the checkout attempt.");
  }

  return {
    id: r.id,
    supportReference: r.support_reference,
    ownerPrincipal: r.owner_principal,
    userId: r.user_id,
    offerId: r.offer_id,
    releaseId: r.release_id,
    snapshot: r.snapshot,
    attemptState: r.attempt_state,
    sessionId: r.session_id,
    checkoutUrl: r.checkout_url,
    idempotencyKey: r.idempotency_key,
    version: r.version,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function bindSessionToOrder(
  orderId: string,
  sessionId: string,
  checkoutUrl: string | null
): Promise<void> {
  const pool = getCommercePool();
  await pool.query(
    `UPDATE private.purchase_orders
     SET session_id = $1, checkout_url = $2, attempt_state = 'open', updated_at = now()
     WHERE id = $3`,
    [sessionId, checkoutUrl, orderId]
  );
}

export async function markPurchaseOrderForReview(orderId: string): Promise<void> {
  const pool = getCommercePool();
  await pool.query(
    `UPDATE private.purchase_orders
     SET attempt_state = 'review', updated_at = now()
     WHERE id = $1 AND attempt_state IN ('creating', 'creation_unknown', 'open', 'processing')`,
    [orderId]
  );
}

export async function recordCheckoutMeasurement(params: {
  orderId: string;
  campaignCode: string | null;
  analyticsConsent: boolean;
  environment: string;
}): Promise<string | null> {
  const pool = getCommercePool();
  const { rows } = await pool.query(
    `SELECT private.record_checkout_measurement($1, $2, $3, $4) AS attempt_ref`,
    [params.orderId, params.campaignCode, params.analyticsConsent, params.environment]
  );
  const ref = rows[0]?.attempt_ref;
  return typeof ref === "string" ? ref : null;
}

export async function suppressAnalyticsAttempts(attemptRefs: string[]): Promise<number> {
  const pool = getCommercePool();
  const { rows } = await pool.query(
    `SELECT private.suppress_analytics_attempts($1::uuid[]) AS suppressed`,
    [attemptRefs]
  );
  return Number(rows[0]?.suppressed ?? 0);
}

export async function getOrderSummaryBySessionId(
  sessionId: string,
  userId: string
): Promise<OrderSummaryDto | null> {
  const pool = getCommercePool();
  const query = `
    SELECT
      po.id as order_id,
      po.support_reference,
      po.attempt_state,
      po.release_id,
      po.session_id,
      c.slug as collection_slug,
      c.title as collection_title,
      co.base_minor_amount,
      co.currency,
      EXISTS(
        SELECT 1 FROM public.access_entitlements ae
        WHERE ae.user_id = po.user_id
          AND ae.release_id = po.release_id
          AND ae.state = 'active'
          AND ae.valid_from <= now()
          AND (ae.expires_at IS NULL OR ae.expires_at > now())
          AND ae.revoked_at IS NULL
      ) as is_entitled,
      EXISTS(
        SELECT 1 FROM private.provider_payments pp
        WHERE pp.order_id = po.id
          AND pp.status = 'succeeded'
      ) as is_paid
    FROM private.purchase_orders po
    JOIN public.collection_releases cr ON cr.id = po.release_id
    JOIN public.recipe_collections c ON c.id = cr.collection_id
    JOIN private.commercial_offers co ON co.id = po.offer_id
    WHERE po.session_id = $1
      AND po.user_id = $2;
  `;

  const { rows } = await pool.query(query, [sessionId, userId]);
  if (rows.length === 0) return null;

  const r = rows[0];
  const amountMinor = r.base_minor_amount || 1500;
  const currency = r.currency || "usd";

  let statusDisplay: OrderSummaryDto["statusDisplay"] = "verifying";

  if (r.is_entitled) {
    statusDisplay = "paid_active";
  } else if (r.is_paid) {
    statusDisplay = "paid_pending_access";
  } else if (r.attempt_state === "processing") {
    statusDisplay = "payment_processing";
  } else if (r.attempt_state === "open") {
    statusDisplay = "unpaid_open";
  } else if (r.attempt_state === "closed") {
    statusDisplay = "expired";
  } else if (r.attempt_state === "review") {
    statusDisplay = "review";
  }

  return {
    orderId: r.order_id,
    supportReference: r.support_reference,
    attemptState: r.attempt_state,
    releaseId: r.release_id,
    collectionSlug: r.collection_slug,
    collectionTitle: r.collection_title,
    amountMinor,
    currency,
    formattedAmount: formatPrice(amountMinor, currency),
    isEntitled: Boolean(r.is_entitled),
    statusDisplay,
  };
}

export async function getUserPurchasedCollections(userId: string): Promise<
  Array<{
    collectionId: string;
    slug: string;
    title: string;
    summary: string;
    releaseVersion: number;
    entitlementState: string;
    validFrom: string;
    recipes: Array<{ id: string; slug: string; title: string; previewImagePath: string; totalMinutes: number | null }>;
  }>
> {
  const pool = getCommercePool();
  const query = `
    SELECT
      c.id as collection_id,
      c.slug,
      c.title,
      c.public_summary,
      cr.id as release_id,
      cr.version as release_version,
      ae.state as entitlement_state,
      ae.valid_from
    FROM public.access_entitlements ae
    JOIN public.collection_releases cr ON cr.id = ae.release_id
    JOIN public.recipe_collections c ON c.id = cr.collection_id
    WHERE ae.user_id = $1
      AND ae.state = 'active'
      AND ae.valid_from <= now()
      AND (ae.expires_at IS NULL OR ae.expires_at > now())
      AND ae.revoked_at IS NULL
    ORDER BY ae.valid_from DESC;
  `;

  const { rows: collRows } = await pool.query(query, [userId]);
  const results = [];

  for (const coll of collRows) {
    const recQuery = `
      SELECT
        rc.id,
        rc.slug,
        rc.title,
        rc.preview_image_path,
        rc.total_minutes
      FROM public.collection_recipes cr
      JOIN public.recipe_catalog rc ON rc.id = cr.recipe_id
      WHERE cr.release_id = $1
        AND rc.publication_state = 'published'
      ORDER BY cr.position ASC;
    `;
    const { rows: recipeRows } = await pool.query(recQuery, [coll.release_id]);
    results.push({
      collectionId: coll.collection_id,
      slug: coll.slug,
      title: coll.title,
      summary: coll.public_summary,
      releaseVersion: coll.release_version,
      entitlementState: coll.entitlement_state,
      validFrom: coll.valid_from.toISOString(),
      recipes: recipeRows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        previewImagePath: r.preview_image_path,
        totalMinutes: r.total_minutes,
      })),
    });
  }

  return results;
}

export async function recordPaymentAndGrantAccess(params: {
  orderId: string;
  providerAccountId: string;
  providerMode: string;
  paymentIntentId: string;
  chargeId: string | null;
  capturedAmount: number;
  currency: string;
  paidAt: Date;
}): Promise<void> {
  const pool = getCommercePool();
  const environment = trustedAnalyticsEnvironment();
  await pool.query(
    `SELECT set_config('app.analytics_environment', $9, true),
            private.record_payment_and_grant_access($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      params.orderId,
      params.providerAccountId,
      params.providerMode,
      params.paymentIntentId,
      params.chargeId,
      params.capturedAmount,
      params.currency,
      params.paidAt,
      environment,
    ]
  );
}

export async function recordRefundAndRecomputeAccess(params: {
  orderId: string;
  providerRefundId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  occurredAt: Date;
}): Promise<void> {
  const pool = getCommercePool();
  const environment = trustedAnalyticsEnvironment();
  await pool.query(
    `SELECT set_config('app.analytics_environment', $9, true),
            private.record_refund_and_recompute_access($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      params.orderId,
      params.providerRefundId,
      params.paymentId,
      params.amount,
      params.currency,
      params.status,
      params.reason,
      params.occurredAt,
      environment,
    ]
  );
}

export async function ingestPaymentEvent(params: {
  eventId: string;
  providerAccountId: string;
  providerMode: string;
  apiVersion: string;
  eventType: string;
  objectId: string;
  payloadHash: string;
}): Promise<boolean> {
  const pool = getCommercePool();
  const query = `
    INSERT INTO private.payment_events (
      event_id,
      provider_account_id,
      provider_mode,
      api_version,
      event_type,
      object_id,
      payload_hash
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (provider_account_id, provider_mode, event_id) DO NOTHING
    RETURNING id;
  `;
  const { rows } = await pool.query(query, [
    params.eventId,
    params.providerAccountId,
    params.providerMode,
    params.apiVersion,
    params.eventType,
    params.objectId,
    params.payloadHash,
  ]);
  return rows.length > 0;
}
