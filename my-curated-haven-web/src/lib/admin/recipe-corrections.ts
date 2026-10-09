import "server-only";
import { getCommercePool } from "@/lib/payments/repository";
import type { CorrectionImpact, MutationReceipt, RecipeCorrectionCommand, Result } from "./contracts";
import { decodeReceipt } from "./recipes";
import { adminRpc } from "./rpc";
import { createClient } from "../supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Publish an exact approved correction to a recipe people have already bought. The database passes
 * Phase 1's commercial block only for this command, the same recipe identity and an acknowledged
 * global effect; collection membership, releases, offers and orders never change.
 */
export async function publishRecipeCorrection(input: RecipeCorrectionCommand): Promise<Result<MutationReceipt>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_recipe_correct", {
    p_command: {
      operation_id: input.operationId,
      recipe_id: input.recipeId,
      reason: input.reason,
      revision_id: input.revisionId,
      expected_version: input.expectedVersion,
      expected_digest: input.expectedDigest,
      base: { content_version: input.base.contentVersion, active_hash: input.base.activeHash },
      impact_token: input.impactToken,
      correction_kind: input.correctionKind,
      acknowledge_global_impact: input.acknowledgeGlobalImpact,
    } as never,
  }), decodeReceipt, true);
}

function decodeCorrectionImpact(data: unknown): CorrectionImpact {
  const value = data as CorrectionImpact;
  if (!value || typeof value.checkedAt !== "string" || !Array.isArray(value.collections)
    || !value.collections.every((c) => UUID.test(c.collectionId) && typeof c.slug === "string" && typeof c.title === "string"
      && Array.isArray(c.releases) && c.releases.every((r) => Number.isInteger(r.version) && typeof r.state === "string")
      && (c.draft === null || (typeof c.draft.state === "string" && Number.isInteger(c.draft.version))))) {
    throw new Error("Invalid correction impact");
  }
  return value;
}

/** The collections a correction reaches: releases holding the recipe and open private drafts that reference it. */
export async function loadRecipeCorrectionImpact(recipeId: string): Promise<Result<CorrectionImpact>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_recipe_correction_impact", { p_recipe_id: recipeId }), decodeCorrectionImpact, true);
}

/** Public and admin collection pages that show this recipe, taken from the database, never from the caller. */
export async function recipeCollectionPaths(recipeId: string): Promise<string[]> {
  if (!UUID.test(recipeId)) return [];
  const { rows } = await getCommercePool().query(`SELECT DISTINCT path FROM public.recipe_collections c
    CROSS JOIN LATERAL unnest(private.collection_refresh_paths(c.id, c.slug)) path
    WHERE c.id = ANY(private.recipe_collection_ids($1))`, [recipeId]);
  return rows.map((row) => row.path as string);
}
