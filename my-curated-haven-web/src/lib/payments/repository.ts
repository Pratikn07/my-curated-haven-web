import { Pool } from "pg";
import type {
  CollectionOfferDto,
  OrderSummaryDto,
  OwnershipStatus,
  CollectionRecipeSummary,
} from "./types";
import { trustedAnalyticsEnvironment } from "@/lib/analytics/environment";
import { resolveCommerceDatabaseConnectionString } from "./database-config";

let poolInstance: Pool | null = null;

export function getCommercePool(): Pool {
  if (!poolInstance) {
    const connectionString = resolveCommerceDatabaseConnectionString();

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

  // What is on sale right now; the Buy button sends it back so checkout can refuse a stale page.
  const { loadCheckoutExpectation } = await import("./collection-reservation");
  const expected = await loadCheckoutExpectation(coll.collection_id);

  // 3. Ownership covers every release of the collection, so a buyer of an earlier release still owns it.
  let ownershipState: OwnershipStatus = "unauthenticated";
  if (userId) {
    const { getCollectionCustomerState } = await import("@/lib/collections/customer-state");
    const state = await getCollectionCustomerState(coll.collection_id, userId);
    ownershipState = state.ok ? state.value.ownership : "unavailable";
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
    expected,
    recipes,
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
  // One entry per owned collection with the recipes the access resolver grants, including approved
  // additions from later releases. The resolver is the same one recipe-body policies use.
  const { rows } = await getCommercePool().query("SELECT private.user_collection_library($1) AS library", [userId]);
  return (rows[0]?.library ?? []) as Array<{
    collectionId: string; slug: string; title: string; summary: string; releaseVersion: number;
    entitlementState: string; validFrom: string;
    recipes: Array<{ id: string; slug: string; title: string; previewImagePath: string; totalMinutes: number | null }>;
  }>;
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
