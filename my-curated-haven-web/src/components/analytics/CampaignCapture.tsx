"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { parseAndRecordCampaign } from "@/lib/analytics/campaigns";
import { isPostHogActive, posthog } from "@/lib/analytics/posthog";

export default function CampaignCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    const campaign = parseAndRecordCampaign(searchParams);
    // Tag every later event in this visit with the registered campaign.
    if (campaign && isPostHogActive()) {
      posthog.register({ campaign_code: campaign.utm_campaign });
    }
  }, [searchParams]);

  return null;
}
