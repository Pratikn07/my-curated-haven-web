import { NextResponse } from "next/server";
import crypto from "crypto";
import { reconcileRecentStripeEvents } from "@/lib/payments/inbox";

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. Without the secret the
// route refuses everything, so it is never a public "run the worker" endpoint.
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    console.error("[payments-reconcile] CRON_SECRET is not set; refusing run");
    return NextResponse.json({ error: "reconciliation not configured" }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await reconcileRecentStripeEvents();
    console.info("[payments-reconcile] run finished", result);
    // A failed event is retried on the next run; report it so the cron log shows the run was partial.
    return NextResponse.json(result, { status: result.failed > 0 ? 500 : 200 });
  } catch (err: unknown) {
    console.error("[payments-reconcile] run failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "reconciliation failed" }, { status: 500 });
  }
}
