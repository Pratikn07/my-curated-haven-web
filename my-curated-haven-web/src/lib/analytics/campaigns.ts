import { CAMPAIGN_STORAGE_KEY, isAnalyticsPermitted } from "./consent";

export const ALLOWED_CAMPAIGNS = [
  "toddler_recipes_launch",
  "sample_reel_001",
  "sample_reel_002",
  "sample_reel_003",
  "stories_launch",
  "bio_link",
  "feed_post_001",
] as const;

export type RegisteredCampaign = (typeof ALLOWED_CAMPAIGNS)[number];

export interface CampaignAttribution {
  utm_source: string;
  utm_medium: string;
  utm_campaign: RegisteredCampaign | string;
  utm_content?: string;
  captured_at: string;
}

export function isAllowedCampaign(val: string): val is RegisteredCampaign {
  return (ALLOWED_CAMPAIGNS as readonly string[]).includes(val);
}

export function parseAndRecordCampaign(searchParams: URLSearchParams): CampaignAttribution | null {
  if (!isAnalyticsPermitted() || typeof window === "undefined") {
    return null;
  }

  const utm_source = searchParams.get("utm_source");
  const utm_medium = searchParams.get("utm_medium");
  const utm_campaign = searchParams.get("utm_campaign");
  const utm_content = searchParams.get("utm_content") || undefined;

  // Attribution requires at least utm_source and utm_campaign
  if (!utm_source || !utm_campaign) {
    return null;
  }

  // Validate against allowlist or sanitize strictly
  const validSource = utm_source.toLowerCase().slice(0, 32);
  const validMedium = (utm_medium || "referral").toLowerCase().slice(0, 32);
  const validCampaign = utm_campaign.toLowerCase().slice(0, 48);
  const validContent = utm_content ? utm_content.toLowerCase().slice(0, 32) : undefined;

  // Session rule: keep first-touch external campaign in session storage
  try {
    const existing = sessionStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (existing) {
      return JSON.parse(existing);
    }

    const attribution: CampaignAttribution = {
      utm_source: validSource,
      utm_medium: validMedium,
      utm_campaign: validCampaign,
      utm_content: validContent,
      captured_at: new Date().toISOString(),
    };

    sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return null;
  }
}

export function getSessionCampaign(): CampaignAttribution | null {
  if (!isAnalyticsPermitted() || typeof window === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
