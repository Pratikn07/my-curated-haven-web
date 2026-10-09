"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseAndRecordCampaign } from "@/lib/analytics/campaigns";
import { isPostHogActive, posthog } from "@/lib/analytics/posthog";
import { isAdminPath } from "@/lib/analytics/private-paths";

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

  return null;
}
