const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_SUPABASE_ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

function isHostedDeploy(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
}

/**
 * Public Supabase URL and key.
 * Hosted deploys fail when either value is missing.
 * Local and CI builds keep the local stack fallback.
 */
export function getSupabasePublicConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    return { url, key };
  }

  if (isHostedDeploy()) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required"
    );
  }

  return {
    url: url || LOCAL_SUPABASE_URL,
    key: key || LOCAL_SUPABASE_ANON_KEY,
  };
}
