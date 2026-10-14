import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { joinMakeAheadPlan, parseMakeAheadPlanContent } from "@/lib/collections/make-ahead";
import type { MakeAheadPlan, MakeAheadPlanPreview } from "@/lib/collections/make-ahead-types";
import type { Database } from "@/lib/types/database";

export type PlanRead = { status: "ok"; plan: MakeAheadPlan } | { status: "locked" } | { status: "unavailable" };

/**
 * A book's make-ahead plan, read with the visitor's own session so the database decides who sees it: the RLS on
 * public.collection_extras lets owners of the book, recipe admins and console staff read it, the same people who
 * read its paid recipe bodies. No row means "not yours". A read error, or a stored plan that fails its checks,
 * is "unavailable": the page never shows part of a plan.
 */
export async function readMakeAheadPlan(
  client: SupabaseClient<Database>,
  collectionSlug: string,
  preview: MakeAheadPlanPreview
): Promise<PlanRead> {
  const { data, error } = await client
    .from("collection_extras")
    .select("content, recipe_collections!inner(slug)")
    .eq("kind", "make_ahead_plan")
    .eq("recipe_collections.slug", collectionSlug)
    .maybeSingle();
  if (error) {
    console.error("[make-ahead] plan unavailable", error.code ?? "unknown");
    return { status: "unavailable" };
  }
  if (!data) return { status: "locked" };
  const parsed = parseMakeAheadPlanContent(data.content, preview);
  if (!parsed.ok) {
    console.error("[make-ahead] stored plan failed its checks", parsed.errors.length);
    return { status: "unavailable" };
  }
  return { status: "ok", plan: joinMakeAheadPlan(preview, parsed.content) };
}
