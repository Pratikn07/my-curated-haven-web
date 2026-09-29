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
