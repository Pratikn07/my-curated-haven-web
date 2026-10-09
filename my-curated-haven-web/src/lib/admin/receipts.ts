export type AdminRecipeOperation = {
  operationId: string;
  recipeId: string;
  action: "revision.publish" | "recipe.withdraw";
  revisionId: string | null;
  version: number;
  digest: string;
  noChange: boolean;
  committedAt: string;
  publication: "draft" | "published" | "withdrawn";
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function decodeAdminRecipeOperations(data: unknown, recipeId: string): AdminRecipeOperation[] {
  if (!Array.isArray(data) || data.length > 10) throw new Error("Invalid receipt list");
  return data.map((item): AdminRecipeOperation => {
    if (!record(item) || !uuid(item.operationId) || item.recipeId !== recipeId ||
      (item.action !== "revision.publish" && item.action !== "recipe.withdraw") ||
      (item.revisionId !== null && !uuid(item.revisionId)) ||
      !Number.isInteger(item.version) || Number(item.version) < 0 ||
      typeof item.digest !== "string" || typeof item.noChange !== "boolean" ||
      typeof item.committedAt !== "string" || !Number.isFinite(Date.parse(item.committedAt)) ||
      (item.publication !== "draft" && item.publication !== "published" && item.publication !== "withdrawn")) {
      throw new Error("Invalid recipe receipt");
    }
    return {
      operationId: item.operationId,
      recipeId,
      action: item.action,
      revisionId: item.revisionId,
      version: item.version as number,
      digest: item.digest,
      noChange: item.noChange,
      committedAt: item.committedAt,
      publication: item.publication,
    };
  });
}
