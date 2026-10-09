import type { AccessExplanation } from "./contracts";

export type SupportAccessSummary = {
  effective: "active" | "denied" | "unavailable";
  sourceCount: number | null;
  originalCount: number | null;
  additionCount: number | null;
  heldCount: number | null;
};

/**
 * Counts for the access summary line. An unavailable explanation stays unavailable with unknown counts; it is
 * never shown as denied or as zero recipes. A recipe listed in both original and added sets counts once.
 */
export function summariseSupportAccess(value: AccessExplanation | null): SupportAccessSummary {
  if (value === null || value.effective === "unavailable") {
    return { effective: "unavailable", sourceCount: null, originalCount: null, additionCount: null, heldCount: null };
  }
  const original = new Set(value.originalRecipeIds);
  const added = new Set(value.additionRecipeIds.filter((id) => !original.has(id)));
  return {
    effective: value.effective,
    sourceCount: value.sources.length,
    originalCount: original.size,
    additionCount: added.size,
    heldCount: new Set(value.contentHoldRecipeIds).size,
  };
}
