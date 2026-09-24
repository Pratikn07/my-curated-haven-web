/**
 * Validates and sanitizes post-authentication return paths.
 * Allows intended recipe and account paths while preventing open redirects,
 * protocol-relative URLs, loops, and control characters.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string {
  const fallback = "/account/saved-recipes";
  if (!raw || typeof raw !== "string") {
    return fallback;
  }

  // Trim whitespace
  const trimmed = raw.trim();

  // Must begin with a single '/' and not '//' or '/\'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Reject control characters or newlines
  if (/[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }

  // Reject loops to sign-in or auth routes
  if (trimmed.startsWith("/sign-in") || trimmed.startsWith("/auth")) {
    return fallback;
  }

  // Whitelist intended destinations
  const isRecipePath = trimmed === "/recipes" || trimmed.startsWith("/recipes/");
  const isAccountPath = trimmed === "/account" || trimmed.startsWith("/account/");
  const isCollectionPath = trimmed === "/collections" || trimmed.startsWith("/collections/");
  const isCheckoutPath = trimmed === "/checkout" || trimmed.startsWith("/checkout/");

  if (isRecipePath || isAccountPath || isCollectionPath || isCheckoutPath) {
    return trimmed;
  }

  return fallback;
}
