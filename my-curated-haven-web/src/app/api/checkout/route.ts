import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/payments/checkout";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required before purchasing." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const collectionSlug = typeof body.collectionSlug === "string" ? body.collectionSlug.trim() : "";

    if (!collectionSlug) {
      return NextResponse.json(
        { error: "Collection slug is required." },
        { status: 400 }
      );
    }

    const requestOrigin = new URL(request.url).origin;
    const result = await createCheckoutSession({
      collectionSlug,
      user: {
        id: user.id,
        email: user.email,
      },
      requestOrigin,
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
