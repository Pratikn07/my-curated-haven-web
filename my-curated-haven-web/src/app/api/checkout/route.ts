import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/payments/checkout";
import { acceptCampaignInput } from "@/lib/analytics/campaigns";

const CHECKOUT_FIELDS = new Set(["collectionSlug", "analyticsConsent", "attribution"]);
const ATTRIBUTION_FIELDS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
]);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required before purchasing." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
    }

    const record = body as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (!CHECKOUT_FIELDS.has(key)) {
        return NextResponse.json({ error: "Unknown checkout field." }, { status: 400 });
      }
    }

    const collectionSlug =
      typeof record.collectionSlug === "string" ? record.collectionSlug.trim() : "";

    if (!collectionSlug) {
      return NextResponse.json(
        { error: "Collection slug is required." },
        { status: 400 }
      );
    }

    let attribution: ReturnType<typeof acceptCampaignInput> = null;
    if (record.attribution !== undefined) {
      if (
        !record.attribution ||
        typeof record.attribution !== "object" ||
        Array.isArray(record.attribution)
      ) {
        return NextResponse.json({ error: "Invalid attribution." }, { status: 400 });
      }
      const raw = record.attribution as Record<string, unknown>;
      for (const key of Object.keys(raw)) {
        if (!ATTRIBUTION_FIELDS.has(key)) {
          return NextResponse.json({ error: "Unknown attribution field." }, { status: 400 });
        }
        if (raw[key] != null && typeof raw[key] !== "string") {
          return NextResponse.json({ error: "Invalid attribution." }, { status: 400 });
        }
      }
      attribution = acceptCampaignInput({
        utm_source: typeof raw.utm_source === "string" ? raw.utm_source : null,
        utm_medium: typeof raw.utm_medium === "string" ? raw.utm_medium : null,
        utm_campaign: typeof raw.utm_campaign === "string" ? raw.utm_campaign : null,
        utm_content: typeof raw.utm_content === "string" ? raw.utm_content : null,
      });
    }

    const requestOrigin = new URL(request.url).origin;
    const result = await createCheckoutSession({
      collectionSlug,
      user: {
        id: user.id,
        email: user.email,
      },
      requestOrigin,
      analyticsConsent: record.analyticsConsent === true,
      attribution,
    });

    if (result.status === "already_owned") {
      return NextResponse.json(
        {
          code: "already_owned",
          message: "You already have active access to this collection.",
          collectionSlug: result.collectionSlug,
        },
        { status: 409 }
      );
    }

    if (result.status === "error") {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: 400 }
      );
    }

    if (result.status === "success") {
      return NextResponse.json({
        checkoutUrl: result.checkoutUrl,
        supportReference: result.supportReference,
        analyticsAttemptRef: result.analyticsAttemptRef ?? null,
      });
    }

    return NextResponse.json(
      { error: "Unexpected checkout response." },
      { status: 500 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal checkout error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
