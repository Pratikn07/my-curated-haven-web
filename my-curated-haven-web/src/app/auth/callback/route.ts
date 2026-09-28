import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeReturnTo } from "@/lib/auth/redirects";
import { SIGN_IN_METHOD_COOKIE } from "@/lib/auth/oauth";

export const dynamic = "force-dynamic";

export type CallbackFailure = "cancelled" | "failed";

/**
 * A relative Location, so a forwarded host header can never send a parent
 * off-site mid sign-in (Phase 7: "Do not trust forwarded host headers to
 * construct authentication redirects").
 */
function authRedirect(path: string): NextResponse {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: path,
      "Cache-Control": "no-store, private",
    },
  });
}

export function signInFailurePath(returnTo: string, reason: CallbackFailure): string {
  return `/sign-in?${new URLSearchParams({ returnTo, authError: reason }).toString()}`;
}

/**
 * PKCE code exchange for provider sign-in. The session cookie is written by the
 * Supabase SSR client through next/headers, and applied to this response.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = sanitizeReturnTo(url.searchParams.get("next"));
  const code = url.searchParams.get("code");

  // Google sends `error=access_denied` when the parent presses Cancel.
  if (url.searchParams.get("error")) {
    return authRedirect(signInFailurePath(next, "cancelled"));
  }

  if (!code) {
    return authRedirect(signInFailurePath(next, "failed"));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Log the detail; never echo provider errors to the parent (audit R8-04).
      console.error("[auth/callback] code exchange failed", error.message);
      return authRedirect(signInFailurePath(next, "failed"));
    }
  } catch (err) {
    console.error(
      "[auth/callback] code exchange threw",
      err instanceof Error ? err.message : err
    );
    return authRedirect(signInFailurePath(next, "failed"));
  }

  const response = authRedirect(next);
  response.cookies.set(SIGN_IN_METHOD_COOKIE, "google", {
    path: "/",
    maxAge: 120,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
