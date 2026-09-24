const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_SUPABASE_ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

function isHostedDeploy(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
}

export type SupabasePublicConfig = { url: string; key: string };

/**
 * Public Supabase URL and key.
 * Hosted deploys return null when either value is missing so the proxy can
 * keep marketing pages up. Local and CI builds keep the local stack fallback.
 * Data clients call requireSupabasePublicConfig and fail closed.
 */
export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    return { url, key };
  }

  if (isHostedDeploy()) {
    return null;
  }

  return {
    url: url || LOCAL_SUPABASE_URL,
    key: key || LOCAL_SUPABASE_ANON_KEY,
  };
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required"
    );
  }
  return config;
}
