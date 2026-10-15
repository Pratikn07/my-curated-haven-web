"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseAndRecordCampaign } from "@/lib/analytics/campaigns";
import { isPostHogActive, posthog } from "@/lib/analytics/posthog";
import { isAdminPath } from "@/lib/analytics/private-paths";
import { getAnalyticsProvider } from "@/lib/analytics/provider";
import { inAppBrowserName } from "@/lib/auth/in-app-browser";

/** Ad and social click ids. Only whether one was present is kept, never its value. */
const CLICK_ID_PARAMS = ["fbclid", "gclid"];

export default function CampaignCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    if (pathname && isAdminPath(pathname)) return;
    const campaign = parseAndRecordCampaign(searchParams);
    // Tag every later event in this visit with the registered campaign.
    if (campaign && isPostHogActive()) {
      posthog.register({ campaign_code: campaign.utm_campaign });
    }
  }, [searchParams, pathname]);

  // Tracking PR 2: where the visit came from, set once per session from its first page: the app whose
  // browser it opened in, and whether the address carried a click id.
  useEffect(() => {
    if (!searchParams) return;
    if (pathname && isAdminPath(pathname)) return;
    // This runs before AnalyticsProvider's own effect on the first page, so start PostHog here (it starts once).
    getAnalyticsProvider();
    if (!isPostHogActive()) return;
    try {
      if (posthog.getSessionProperty("entry_app") !== undefined) return;
      posthog.register_for_session({
        entry_app: inAppBrowserName(navigator.userAgent),
        has_click_id: CLICK_ID_PARAMS.some((param) => searchParams.has(param)),
      });
    } catch {
      // Analytics must never interrupt the page.
    }
  }, [searchParams, pathname]);

  return null;
}
