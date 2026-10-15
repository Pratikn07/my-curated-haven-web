/**
 * Web OAuth sign-in.
 *
 * Google only. Apple stays off the website: Sign in with Apple hands back a
 * Private Relay address, so a parent who bought a collection with an email code
 * would come back as a different user and lose access to it (audit G7-01).
 */
export const OAUTH_PROVIDERS = ["google"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const AUTH_CALLBACK_PATH = "/auth/callback";

/**
 * Short-lived marker left for the destination page. Both sign-in methods finish
 * on the server and redirect (Google in /auth/callback, the email code in a
 * server action), so the page that started them never sees the success and
 * cannot close the funnel on its own.
 */
export const SIGN_IN_METHOD_COOKIE = "mch_signin_method";

export const SIGN_IN_METHOD_MARKERS = ["email_code", ...OAUTH_PROVIDERS] as const;
export type SignInMethodMarker = (typeof SIGN_IN_METHOD_MARKERS)[number];

export function isSignInMethodMarker(value: unknown): value is SignInMethodMarker {
  return typeof value === "string" && (SIGN_IN_METHOD_MARKERS as readonly string[]).includes(value);
}

/** Readable by the page (not httpOnly), gone after two minutes. */
export function signInMethodCookieOptions() {
  return {
    path: "/",
    maxAge: 120,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return typeof value === "string" && (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Absolute callback URL for the provider round trip, built from the origin the
 * parent is already on. Supabase's redirect allowlist is the security control,
 * so an attacker-supplied host can never widen where the provider returns to.
 */
export function oauthCallbackUrl(origin: string, returnTo?: string | null): string {
  const url = new URL(AUTH_CALLBACK_PATH, origin);
  if (returnTo) {
    url.searchParams.set("next", returnTo);
  }
  return url.toString();
}
