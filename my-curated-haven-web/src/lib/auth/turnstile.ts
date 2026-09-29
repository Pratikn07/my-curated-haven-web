/**
 * Cloudflare Turnstile on the sign-in form.
 *
 * Requesting a code creates an unconfirmed `auth.users` row before anyone has
 * proved they own the address, and every send spends the project's hourly email
 * quota and Amazon SES sending reputation (audit M7-01, M7-03). The challenge is
 * what stops a script doing that in bulk with the public anon key.
 *
 * The site key is absent locally, in CI and on preview deployments, and the form
 * has to keep working without it. That is safe because Supabase only enforces the
 * challenge when the matching secret key is set on the project, so the browser
 * widget and the server-side check switch on together.
 */
export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key ? key : null;
}

export function isTurnstileEnabled(): boolean {
  return getTurnstileSiteKey() !== null;
}

/**
 * Whether the email button must stay disabled while the challenge resolves.
 *
 * Only true while the widget is genuinely still working on a token. A widget
 * that failed — a wrong site key, a blocked script, an unsupported browser —
 * must NOT hold the button shut: it leaves every visitor staring at a disabled
 * button with no way forward. It failed exactly that way in production on
 * 2026-09-28 with Turnstile error 400020 (invalid sitekey).
 */
export function emailSubmitBlocked(state: {
  configured: boolean;
  token: string | null;
  widgetFailed: boolean;
}): boolean {
  return state.configured && !state.token && !state.widgetFailed;
}
