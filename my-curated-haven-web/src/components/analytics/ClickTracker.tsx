"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import type { CtaClickedPayload, DestinationKind } from "@/lib/analytics/events";
import { describeLink } from "@/lib/analytics/links";
import { isAdminPath } from "@/lib/analytics/private-paths";
import { pathToCanonicalRouteKey } from "@/lib/analytics/schema";
import { isPrimaryUx } from "@/lib/analytics/ux";

const CTA = /^[a-z][a-z0-9_]{0,31}$/;
/** Destinations a data-track-dest override may name: those a link can't show, such as the Buy button's checkout. */
const DESTINATION_OVERRIDES = new Set<DestinationKind>(["checkout", "anchor", "email", "instagram", "stripe", "external", "none"]);

/**
 * What a tap on this link or button records, from the labels in the markup:
 * - primary_ux: the closest data-track-ux (the module), else "unlabelled" so gaps show up;
 * - cta: data-track-cta on the control, a fixed key;
 * - cta_position: the closest data-track-pos inside that module, 1 to 50;
 * - where it goes, from the link (describeLink), or data-track-dest on the control.
 */
function describeClick(control: HTMLElement, location: { origin: string; pathname: string }): CtaClickedPayload {
  const area = control.closest<HTMLElement>("[data-track-ux]");
  const ux = area?.dataset.trackUx;
  const cta = control.dataset.trackCta;
  const slot = control.closest<HTMLElement>("[data-track-pos]");
  const position = slot && (!area || area.contains(slot)) ? Number(slot.dataset.trackPos) : NaN;
  const href = control.tagName === "A" ? control.getAttribute("href") : null;
  const link = describeLink(href, location.origin, location.pathname);
  const override = control.dataset.trackDest as DestinationKind | undefined;

  return {
    primary_ux: isPrimaryUx(ux) ? ux : "unlabelled",
    link_type: link.link_type,
    ...(cta && CTA.test(cta) ? { cta } : {}),
    ...(Number.isInteger(position) && position >= 1 && position <= 50 ? { cta_position: position } : {}),
    destination_kind: override && DESTINATION_OVERRIDES.has(override) ? override : link.destination_kind,
    ...(link.target_kind && link.target_slug ? { target_kind: link.target_kind, target_slug: link.target_slug } : {}),
  };
}

/**
 * One listener for every tap on the site: cta_clicked for each link and button, labelled by the markup's
 * data-track-* attributes (docs/implementation/tracking/PLAN.md, "How labelled clicks work"). It listens in the
 * capture phase, so a handler that stops the click (the bookcase's opening book) can't hide it.
 * Skips [data-track-ignore] and disabled controls. Never on admin pages.
 */
export default function ClickTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      try {
        if (isAdminPath(window.location.pathname)) return;
        const target = event.target instanceof Element ? event.target : null;
        const control = target?.closest<HTMLElement>("a, button, [role=button]");
        if (!control || control.closest("[data-track-ignore]")) return;
        if (control.matches(":disabled") || control.getAttribute("aria-disabled") === "true") return;
        const payload = describeClick(control, window.location);
        void trackAnalyticsEvent("cta_clicked", payload, pathToCanonicalRouteKey(window.location.pathname) ?? undefined);
      } catch {
        // Analytics must never interrupt a tap.
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
