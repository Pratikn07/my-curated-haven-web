import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import { requireSupabasePublicConfig } from "./env";

/**
 * A visitor-level client with no cookies or session, for pages that are cached
 * and served to everyone (the Instagram landing pages). It reads only what an
 * anonymous visitor may read, so database RLS still decides what comes back.
 */
export function createPublicClient() {
  const { url, key } = requireSupabasePublicConfig();
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
