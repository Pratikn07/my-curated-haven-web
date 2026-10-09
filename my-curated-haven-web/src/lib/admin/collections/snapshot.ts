import type { Check } from "../contracts";
import type { ClothName, SeriesKey, ShelfKey } from "@/lib/collections/types";
import type { CollectionSnapshot, SnapshotChange } from "./contracts";

// Kept in step with src/lib/collections/types.ts; `satisfies` fails typecheck if a value drifts.
export const SHELVES = ["mornings", "everyday-meals", "cook-once", "nourish", "snacks-and-treats",
  "seasons-and-parties"] as const satisfies readonly ShelfKey[];
export const SERIES = ["breakfast", "meal-prep"] as const satisfies readonly SeriesKey[];
export const CLOTHS = ["ember", "forest", "plum", "terracotta", "sage", "slate", "walnut", "navy",
  "rose", "ochre", "berry", "clay", "sky", "rust", "crimson", "teal"] as const satisfies readonly ClothName[];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIGEST = /^[0-9a-f]{64}$/;
const TEXT_LIMITS = { title: 120, tagline: 160, story: 1200, forWhen: 400, refresh: 400 } as const;

/** Sorted-key JSON. Arrays keep their order, so reordering recipes is a change; key order is not. */
export function canonicalCollection(value: CollectionSnapshot): string {
  function ordered(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(ordered);
    if (input !== null && typeof input === "object") {
      const record = input as Record<string, unknown>;
      return Object.fromEntries(Object.keys(record).sort().map((key) => [key, ordered(record[key])]));
    }
    return input;
  }
  return JSON.stringify(ordered(value));
}

function same(a: unknown, b: unknown): boolean {
  return canonicalCollection(a as CollectionSnapshot) === canonicalCollection(b as CollectionSnapshot);
}

/** Top-level fields that differ; `stage`, `series`, `cover` and `members` compare as whole values. */
export function diffCollection(before: CollectionSnapshot, after: CollectionSnapshot): SnapshotChange[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)] as (keyof CollectionSnapshot)[]);
  return [...keys].sort()
    .filter((field) => !same(before[field], after[field]))
    .map((field) => ({ field, before: before[field], after: after[field] }));
}

function check(code: string, scope: string, failed: boolean, explanation: string): Check {
  return { code, scope, state: failed ? "fail" : "pass", severity: "blocker", explanation, origin: "validation" };
}

function isAge(value: unknown): boolean {
  return value === null || (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 216);
}

/**
 * Draft validation. Blockers stop a save from being submitted; there is no recipe-count rule.
 * Unresolved recipe fit is a suggestion here and a blocker at publication (readiness).
 */
export function validateCollection(value: CollectionSnapshot): Check[] {
  const checks: Check[] = [];
  checks.push(check("COLLECTION_ID_INVALID", "collectionId", !UUID.test(value.collectionId),
    "The collection identity must be a UUID."));
  checks.push(check("COLLECTION_SLUG_INVALID", "slug", !SLUG.test(value.slug) || value.slug.length > 80,
    "Use lowercase words joined by hyphens, up to 80 characters."));
  for (const [field, max] of Object.entries(TEXT_LIMITS) as [keyof typeof TEXT_LIMITS, number][]) {
    const text = value[field];
    const empty = field === "title" && text.trim().length === 0;
    checks.push(check("COLLECTION_TEXT_INVALID", field, empty || text.length > max,
      empty ? "A title is required." : `Keep this under ${max} characters.`));
  }
  checks.push(check("COLLECTION_SORT_INVALID", "sortOrder", !Number.isFinite(value.sortOrder),
    "Shelf position must be a number."));
  const { min, max } = value.stage;
  checks.push(check("COLLECTION_STAGE_INVALID", "stage",
    !isAge(min) || !isAge(max) || (min !== null && max !== null && min >= max) || (min === null && max !== null),
    "Ages are whole months; the start must come before the end."));
  checks.push(check("COLLECTION_SHELF_UNKNOWN", "shelf", !(SHELVES as readonly string[]).includes(value.shelf),
    "Choose an existing shelf."));
  checks.push(check("COLLECTION_CLOTH_UNKNOWN", "cloth", !(CLOTHS as readonly string[]).includes(value.cloth),
    "Choose an existing cloth."));
  checks.push(check("COLLECTION_SERIES_INVALID", "series", value.series !== null && (
    !(SERIES as readonly string[]).includes(value.series.key) ||
    !Number.isInteger(value.series.volume) || value.series.volume < 1),
  "A series needs an existing series and a volume from 1."));
  const cover = value.cover;
  checks.push(check("COLLECTION_COVER_INVALID", "cover", cover !== null && (
    !(cover.src.startsWith("/") || cover.src.startsWith("https://")) ||
    !Number.isInteger(cover.width) || cover.width <= 0 ||
    !Number.isInteger(cover.height) || cover.height <= 0 ||
    cover.alt.trim().length < 3 || !DIGEST.test(cover.assetDigest)),
  "A cover needs a site or HTTPS image, positive size, a description and a checked asset."));

  const seen = new Set<string>();
  let duplicate = false;
  let badMember = false;
  let unresolved = false;
  for (const member of value.members) {
    if (seen.has(member.recipeId)) duplicate = true;
    seen.add(member.recipeId);
    if (!UUID.test(member.recipeId) || !SLUG.test(member.recipeSlug) ||
      !Number.isInteger(member.contentVersion) || member.contentVersion < 1 ||
      !DIGEST.test(member.reviewDigest) || !DIGEST.test(member.tagsDigest)) badMember = true;
    if (member.fit !== "accepted") unresolved = true;
  }
  checks.push(check("COLLECTION_DUPLICATE_MEMBER", "members", duplicate, "Each recipe can appear once."));
  checks.push(check("COLLECTION_MEMBER_INVALID", "members", badMember,
    "Each recipe needs a reviewed version reference."));
  checks.push({ code: "COLLECTION_MEMBER_FIT", scope: "members", state: unresolved ? "unknown" : "pass",
    severity: "suggestion", explanation: "Confirm each recipe belongs here before publication.",
    origin: "validation" });
  return checks;
}
