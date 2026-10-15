/**
 * The address of the 404 page showing now, if any. A 404's address was typed or forwarded and can hold anything,
 * so while it shows, analytics leaves out everything read from it: no content_slug, no route_key, no page_view,
 * and PostHog's own address properties say NOT_FOUND_PATH instead. Set by NotFoundTracker.
 */
let notFoundPath: string | null = null;

/** What PostHog's address properties say on a 404 page. */
export const NOT_FOUND_PATH = "/404";

export function markNotFoundPage(pathname: string): void {
  notFoundPath = pathname;
}

/** Forgets the mark only if it still belongs to this address, so a newer 404's mark is kept. */
export function clearNotFoundPage(pathname: string): void {
  if (notFoundPath === pathname) notFoundPath = null;
}

export function isNotFoundPage(pathname: string): boolean {
  return notFoundPath !== null && notFoundPath === pathname;
}

export function currentNotFoundPath(): string | null {
  return notFoundPath;
}
