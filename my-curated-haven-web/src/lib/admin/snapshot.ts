import type { RecipeSnapshot } from "./contracts";
import type { Json } from "@/lib/types/database";

export type SnapshotDiff = { field: string; before: Json; after: Json };

const SECTIONS = ["catalog", "body", "image"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function patchSnapshot(
  base: RecipeSnapshot,
  patch: Partial<RecipeSnapshot>
): RecipeSnapshot {
  if ("recipeId" in patch && patch.recipeId !== undefined && patch.recipeId !== base.recipeId) {
    throw new Error("recipeId is read-only");
  }
  if ("slug" in patch && patch.slug !== undefined && patch.slug !== base.slug) {
    throw new Error("slug is read-only");
  }
  const next: RecipeSnapshot = {
    recipeId: base.recipeId,
    slug: base.slug,
    catalog: patch.catalog ?? base.catalog,
    body: patch.body !== undefined ? patch.body : base.body,
    image: patch.image ?? base.image,
  };
  for (const key of Object.keys(patch) as (keyof RecipeSnapshot)[]) {
    if (!["catalog", "body", "image"].includes(key)) {
      throw new Error(`unknown snapshot section: ${String(key)}`);
    }
  }
  return next;
}

function diffValues(path: string, before: unknown, after: unknown, out: SnapshotDiff[]): void {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  if (isRecord(before) && isRecord(after)) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      diffValues(path ? `${path}.${key}` : key, before[key], after[key], out);
    }
    return;
  }
  out.push({ field: path, before: before as Json, after: after as Json });
}

export function diffSnapshots(before: RecipeSnapshot, after: RecipeSnapshot): SnapshotDiff[] {
  const out: SnapshotDiff[] = [];
  for (const section of SECTIONS) {
    diffValues(section, before[section], after[section], out);
  }
  return out;
}

function getPath(root: unknown, path: string): unknown {
  let current = root;
  for (const part of path.split(".")) {
    if (!isRecord(current) && !Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setPath(root: unknown, path: string, value: unknown): unknown {
  const parts = path.split(".");
  const key = parts.pop() as string;
  const container =
    parts.length === 0 ? root : getPath(root, parts.join("."));
  const clone = Array.isArray(container) ? [...container] : { ...(container as Record<string, unknown>) };
  (clone as Record<string, unknown>)[key] = value;
  if (parts.length === 0) return clone;
  return setPath(root, parts.join("."), clone);
}

export function mergePaths(
  stored: RecipeSnapshot,
  candidate: RecipeSnapshot,
  choices: Record<string, "stored" | "candidate">
): RecipeSnapshot {
  let merged = JSON.parse(JSON.stringify(stored)) as RecipeSnapshot;
  for (const [field, choice] of Object.entries(choices)) {
    if (choice !== "candidate") continue;
    merged = setPath(merged, field, getPath(candidate, field)) as RecipeSnapshot;
  }
  return merged;
}
