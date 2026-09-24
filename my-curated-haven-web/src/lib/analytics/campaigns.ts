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

export const ALLOWED_SOURCES = ["instagram"] as const;
export const ALLOWED_MEDIUMS = ["organic_social"] as const;
export const ALLOWED_CONTENT = ["reel_001", "reel_002", "reel_003", "stories", "bio", "feed"] as const;

export type RegisteredCampaign = (typeof ALLOWED_CAMPAIGNS)[number];

export interface CampaignAttribution {
  utm_source: string;
  utm_medium: string;
  utm_campaign: RegisteredCampaign;
  utm_content?: string;
  captured_at: string;
}

export interface CampaignInput {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function cleanToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > 64) return null;
  if (EMAIL_REGEX.test(trimmed)) return null;
  if (/[?#\s]/.test(trimmed) || /https?:\/\//.test(trimmed)) return null;
  return trimmed;
}

export function isAllowedCampaign(val: string): val is RegisteredCampaign {
  return (ALLOWED_CAMPAIGNS as readonly string[]).includes(val);
}

/**
 * Registry check only. Unknown, oversized, or sensitive values are dropped.
 * Does not read or write storage.
 */
export function acceptCampaignInput(input: CampaignInput): Omit<CampaignAttribution, "captured_at"> | null {
  const source = cleanToken(input.utm_source);
  const medium = cleanToken(input.utm_medium);
  const campaign = cleanToken(input.utm_campaign);
  const contentToken =
    input.utm_content == null || input.utm_content === ""
      ? undefined
      : cleanToken(input.utm_content);
  const content = contentToken ?? undefined;

  if (!source || !medium || !campaign) return null;
  if (!(ALLOWED_SOURCES as readonly string[]).includes(source)) return null;
  if (!(ALLOWED_MEDIUMS as readonly string[]).includes(medium)) return null;
  if (!isAllowedCampaign(campaign)) return null;
  if (input.utm_content && content === undefined) return null;
  if (content && !(ALLOWED_CONTENT as readonly string[]).includes(content)) return null;

  return {
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
  };
}

export function parseAndRecordCampaign(searchParams: URLSearchParams): CampaignAttribution | null {
  if (!isAnalyticsPermitted() || typeof window === "undefined") {
    return null;
  }

  const accepted = acceptCampaignInput({
    utm_source: searchParams.get("utm_source"),
    utm_medium: searchParams.get("utm_medium"),
    utm_campaign: searchParams.get("utm_campaign"),
    utm_content: searchParams.get("utm_content"),
  });

  try {
    const existing = sessionStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing) as CampaignAttribution;
      if (acceptCampaignInput(parsed)) return parsed;
      sessionStorage.removeItem(CAMPAIGN_STORAGE_KEY);
    }

    if (!accepted) return null;

    const attribution: CampaignAttribution = {
      ...accepted,
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
    const parsed = JSON.parse(raw) as CampaignAttribution;
    if (!acceptCampaignInput(parsed)) {
      sessionStorage.removeItem(CAMPAIGN_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
