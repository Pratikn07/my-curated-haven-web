export type HomepageRecipeLoadFailure =
  | "supabase_configuration"
  | "free_slot_query"
  | "upstream_unavailable"
  | "unexpected";

/** Return a bounded internal category without logging provider messages or user data. */
export function classifyHomepageRecipeLoadFailure(error: unknown): HomepageRecipeLoadFailure {
  if (!(error instanceof Error)) return "unexpected";

  if (/NEXT_PUBLIC_SUPABASE_(URL|ANON_KEY)/.test(error.message)) {
    return "supabase_configuration";
  }
  if (error.message.startsWith("Failed to fetch free slots:")) {
    return "free_slot_query";
  }
  if (/fetch failed|ECONNREFUSED|ETIMEDOUT|timed out/i.test(error.message)) {
    return "upstream_unavailable";
  }

  return "unexpected";
}
