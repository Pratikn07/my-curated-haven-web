/**
 * Instagram's and Facebook's in-app browsers. Google refuses to sign anyone in from inside them
 * ("disallowed_useragent"), so sign-in there offers the email code only. The email code works in
 * place: the parent types it into the same page, so the session stays in this browser.
 */
const IN_APP = /\b(Instagram|FBAN|FBAV|FB_IAB|FBIOS)\b/i;

export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && IN_APP.test(userAgent));
}

/**
 * Which app's browser this is, for analytics (entry_app): Instagram's, Facebook's (the other markers in IN_APP),
 * or an ordinary browser. Uses the same pattern as isInAppBrowser, so sign-in and analytics agree.
 */
export function inAppBrowserName(userAgent: string | null | undefined): "instagram" | "facebook" | "browser" {
  if (!userAgent || !isInAppBrowser(userAgent)) return "browser";
  return /\bInstagram\b/i.test(userAgent) ? "instagram" : "facebook";
}

/** How to leave the in-app browser, in Instagram's own words. */
export const OPEN_IN_BROWSER_HINT = "tap ⋯ at the top, then Open in browser";
