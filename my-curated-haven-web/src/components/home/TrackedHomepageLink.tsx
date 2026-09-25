"use client";

import Link, { type LinkProps } from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import {
  HOMEPAGE_CONTENT_VERSION,
  type HomepageDestination,
  type HomepageFeatureKey,
  type HomepagePlacement,
  type HomepageRecipePresentationState,
} from "@/config/homepage-content";

type Tracking =
  | {
      type: "cta";
      destination: HomepageDestination;
      placement: HomepagePlacement;
      presentationState: HomepageRecipePresentationState["mode"];
    }
  | { type: "preview"; featureKey: HomepageFeatureKey; placement: HomepagePlacement };

type TrackedHomepageLinkProps = Omit<LinkProps, "href"> & {
  href: LinkProps["href"];
  tracking: Tracking;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export default function TrackedHomepageLink({
  tracking,
  onClick,
  ...props
}: TrackedHomepageLinkProps) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (tracking.type === "preview") {
      void trackAnalyticsEvent(
        "homepage_preview_opened",
        {
          feature_key: tracking.featureKey,
          placement: tracking.placement,
          content_version: HOMEPAGE_CONTENT_VERSION,
        },
        "home",
      );
      return;
    }

    void trackAnalyticsEvent(
      "homepage_cta_clicked",
      {
        placement: tracking.placement,
        destination: tracking.destination,
        presentation_state: tracking.presentationState,
        content_version: HOMEPAGE_CONTENT_VERSION,
      },
      "home",
    );
  };

  return <Link {...props} onClick={handleClick} />;
}
