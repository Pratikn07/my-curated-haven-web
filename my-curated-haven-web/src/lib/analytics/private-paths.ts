/**
 * Pages whose screens can show an email, a sign-in code, an order or saved
 * recipes. Session recording is always off here; events are still captured.
 */
const PRIVATE_PATH_PREFIXES = ["/sign-in", "/account", "/checkout"];

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isAdminNavigationContext(url: string): boolean {
  try {
    const parsed = new URL(url, "https://admin.local");
    if (isAdminPath(parsed.pathname)) return true;
    const returnTo = parsed.searchParams.get("returnTo");
    if (returnTo && returnTo.startsWith("/admin") && !returnTo.startsWith("//")) {
      const inner = new URL(returnTo, "https://admin.local");
      if (inner.origin === "https://admin.local" && /^\/admin(?:\/|$)/.test(inner.pathname)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
