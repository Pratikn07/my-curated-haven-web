import type { DestinationKind, LinkType, TargetKind } from "./events";
import { pathToCanonicalRouteKey } from "./schema";

/**
 * What a tapped link opens, as fixed values for cta_clicked: never the URL itself (the validator rejects URLs).
 * Our own pages give their route key and, for a recipe, book, plan, series or story, its slug.
 * Plan: docs/implementation/tracking/PLAN.md, "How labelled clicks work".
 */
export interface LinkDescription {
  link_type: LinkType;
  destination_kind: DestinationKind;
  target_kind?: TargetKind;
  target_slug?: string;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** The live site's own hosts, so an absolute link to it still counts as internal on a preview or local origin. */
const OWN_HOSTS = new Set(["mycuratedhaven.com", "www.mycuratedhaven.com"]);

const TARGETS: [RegExp, TargetKind][] = [
  [/^\/recipes\/([^/]+)$/, "recipe"],
  [/^\/collections\/series\/([^/]+)$/, "series"],
  [/^\/collections\/([^/]+)\/plan$/, "plan"],
  [/^\/collections\/([^/]+)$/, "collection"],
  [/^\/stories\/([^/]+)$/, "story"],
];

const ACTION: LinkDescription = { link_type: "action", destination_kind: "none" };
const ANCHOR: LinkDescription = { link_type: "anchor", destination_kind: "anchor" };
const EXTERNAL: LinkDescription = { link_type: "external", destination_kind: "external" };

function hostIs(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** "/recipes/" and "/recipes" are the same page. */
function normalisePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

function targetOf(path: string): Pick<LinkDescription, "target_kind" | "target_slug"> {
  for (const [pattern, kind] of TARGETS) {
    const match = pattern.exec(path);
    if (!match) continue;
    if (kind === "collection" && match[1] === "series") return {};
    return SLUG.test(match[1]) ? { target_kind: kind, target_slug: match[1] } : {};
  }
  return {};
}

/**
 * Describes a link from its raw href. `origin` is this site's origin; `currentPath`, when given, makes a
 * link to a part of the same page (`/halloween#hw-recipes` on /halloween) an anchor rather than a page.
 * No href (a button) is an action.
 */
export function describeLink(href: string | null | undefined, origin: string, currentPath?: string): LinkDescription {
  if (href === null || href === undefined) return ACTION;
  const raw = href.trim();
  if (raw.startsWith("#")) return ANCHOR;
  if (/^mailto:/i.test(raw)) return { link_type: "external", destination_kind: "email" };
  if (/^(javascript|data):/i.test(raw)) return ACTION;

  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return EXTERNAL;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return EXTERNAL;

  const host = url.hostname.toLowerCase();
  let own = false;
  try {
    own = url.origin === new URL(origin).origin || OWN_HOSTS.has(host);
  } catch {
    own = OWN_HOSTS.has(host);
  }
  if (!own) {
    if (hostIs(host, "instagram.com")) return { link_type: "external", destination_kind: "instagram" };
    if (hostIs(host, "stripe.com")) return { link_type: "external", destination_kind: "stripe" };
    return EXTERNAL;
  }

  const path = normalisePath(url.pathname);
  if (url.hash && currentPath !== undefined && path === normalisePath(currentPath)) return ANCHOR;
  return {
    link_type: "internal",
    destination_kind: pathToCanonicalRouteKey(path) ?? "other_page",
    ...targetOf(path),
  };
}
