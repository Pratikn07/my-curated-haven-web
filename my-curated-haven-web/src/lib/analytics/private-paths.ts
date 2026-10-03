/**
 * Pages whose screens can show an email, a sign-in code, an order, saved
 * recipes or unpublished admin drafts. Session recording is always off here;
 * events are still captured.
 */
const PRIVATE_PATH_PREFIXES = ["/sign-in", "/account", "/checkout", "/admin"];

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
