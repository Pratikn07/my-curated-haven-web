"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { parseAndRecordCampaign } from "@/lib/analytics/campaigns";
import { useAnalytics } from "./AnalyticsProvider";

export default function CampaignCapture() {
  const { consentStatus } = useAnalytics();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (consentStatus === "accepted" && searchParams) {
      parseAndRecordCampaign(searchParams);
    }
  }, [consentStatus, searchParams]);

  return null;
}
