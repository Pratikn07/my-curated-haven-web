import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getCommercePool } from "@/lib/payments/repository";
import { reconcileAndFulfillSession } from "@/lib/payments/fulfilment";

export async function POST(
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

    const { rows } = await pool.query(
      `SELECT session_id FROM private.purchase_orders WHERE (id = $1 OR support_reference = $1) AND user_id = $2`,
      [orderId, user.id]
    );

    if (rows.length === 0 || !rows[0].session_id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const summary = await reconcileAndFulfillSession(rows[0].session_id, user.id);
    return NextResponse.json(summary || { status: "not_found" });
  } catch (err: unknown) {
    // Log the detail; never echo database or provider errors to the caller (Phase 8 audit R8-04).
    console.error("[orders/refresh] failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Error refreshing order" }, { status: 500 });
  }
}
