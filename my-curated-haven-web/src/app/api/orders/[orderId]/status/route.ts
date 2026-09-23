import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCommercePool } from "@/lib/payments/repository";

export async function GET(
  _request: Request,
  props: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await props.params;
    const pool = getCommercePool();

    const query = `
      SELECT
        po.id,
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
        ) as is_entitled
      FROM private.purchase_orders po
      JOIN public.collection_releases cr ON cr.id = po.release_id
      JOIN public.recipe_collections c ON c.id = cr.collection_id
      JOIN private.commercial_offers co ON co.id = po.offer_id
      WHERE (po.id = $1 OR po.support_reference = $1)
        AND po.user_id = $2;
    `;

    const { rows } = await pool.query(query, [orderId, user.id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const r = rows[0];
    return NextResponse.json({
      orderId: r.id,
      supportReference: r.support_reference,
      attemptState: r.attempt_state,
      releaseId: r.release_id,
      collectionSlug: r.collection_slug,
      collectionTitle: r.collection_title,
      isEntitled: Boolean(r.is_entitled),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching order status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
