import { createHash } from "node:crypto";
import type { CollectionSnapshot, Member } from "@/lib/admin/collections/contracts";
import type { ShowroomCollection } from "@/lib/collections/types";
import type { Json } from "@/lib/types/database";

/**
 * Pure mapping from the legacy collection config (src/config/collections.ts) and reviewed tag data
 * (recipe-tags.json) to private collection candidates, checked against the target database.
 * It reports; it never decides. Differing config and sold memberships are reported, not unioned;
 * imported placement notes stay unverified evidence, not a new human approval; display-only
 * placeholder prices never reach a snapshot or an offer.
 */

export type ImportInput = { sourceSha: string; sourceDigests: Record<string, string>;
  config: readonly ShowroomCollection[]; tags: Record<string, Json>;
  inventory: { collections: { id: string; slug: string }[];
    recipes: { id: string; slug: string; contentVersion: number | null; reviewDigest: string | null; tagsDigest: string | null }[];
    releases: { id: string; collectionId: string; state: string; members: string[]; manifestChecksum: string | null }[];
    offers: { id: string; releaseId: string; mode: "test" | "live"; saleEnabled: boolean; termsDigest: string }[];
    orders: { id: string; releaseId: string; live: boolean; state: string; purchased: boolean; snapshotComplete: boolean }[];
    sources: { releaseId: string; sourceKind: string }[];
    policies: { originReleaseId: string; sourceKind: string; policy: "additions-v1" | "original-only" }[] } };
export type Discrepancy = { code: string; collectionSlug: string; severity: "blocker" | "suggestion"; details: Json };
export type TagEvidence = { tags: Json; collections: Json; reasons: Json; reviewGate: Json; digest: string };
export type ImportReport = { candidates: CollectionSnapshot[]; discrepancies: Discrepancy[];
  blockedCollectionIds: string[]; sourceDigest: string;
  hints: { collectionSlug: string; inShowroom: boolean; placeholderPrice: string; configStatus: string }[];
  tagEvidence: Record<string, TagEvidence> };

const COVER_PATH = /^\/images\/collections\/[a-z0-9-]+\.(?:webp|png|jpg)$/;
const COMMITTED_RELEASE_STATES = new Set(["sealed", "retired"]);

export function canonicalJson(value: unknown): string {
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

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** A stable UUID for a collection that has no database identity yet, so re-running the import agrees. */
export function importedCollectionId(slug: string): string {
  const h = sha256(`my-curated-haven:collection:${slug}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${"89ab"[parseInt(h[16], 16) % 4]}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function reconcileMemberIds(configIds: string[], databaseIds: string[]) {
  const configured = new Set(configIds), stored = new Set(databaseIds);
  const configOnly = [...configured].filter((id) => !stored.has(id)).sort();
  const databaseOnly = [...stored].filter((id) => !configured.has(id)).sort();
  return { matches: configOnly.length === 0 && databaseOnly.length === 0, configOnly, databaseOnly };
}

type TagRecord = { slug: string; tags?: Json; collections?: Json; collection_reasons?: Record<string, string>; review_gate?: Json };

function tagRecords(tags: Record<string, Json>): Map<string, TagRecord> {
  const recipes = Array.isArray(tags["recipes"]) ? (tags["recipes"] as unknown as TagRecord[]) : [];
  return new Map(recipes.filter((r) => typeof r?.slug === "string").map((r) => [r.slug, r]));
}

export function mapCollectionImport(input: ImportInput): ImportReport {
  const { inventory } = input;
  const discrepancies: Discrepancy[] = [];
  const blocked = new Set<string>();
  const candidates: CollectionSnapshot[] = [];
  const hints: ImportReport["hints"] = [];
  const tagEvidence: Record<string, TagEvidence> = {};
  const records = tagRecords(input.tags);
  const recipesBySlug = new Map(inventory.recipes.map((r) => [r.slug, r]));
  const idsBySlug = new Map(inventory.collections.map((c) => [c.slug, c.id]));
  const seenSlugs = new Set<string>();

  const report = (collectionSlug: string, collectionId: string | null, code: string,
    severity: Discrepancy["severity"], details: Json = {}) => {
    discrepancies.push({ code, collectionSlug, severity, details });
    if (severity === "blocker" && collectionId) blocked.add(collectionId);
  };

  input.config.forEach((config, index) => {
    const collectionId = idsBySlug.get(config.slug) ?? importedCollectionId(config.slug);
    if (seenSlugs.has(config.slug)) {
      report(config.slug, collectionId, "COLLECTION_DUPLICATE_SLUG", "blocker", { position: index + 1 });
      return;
    }
    seenSlugs.add(config.slug);
    if (!idsBySlug.has(config.slug)) {
      report(config.slug, null, "COLLECTION_IDENTITY_NEW", "suggestion", { collectionId });
    }

    const members: Member[] = [];
    for (const recipe of config.recipes) {
      const stored = recipesBySlug.get(recipe.slug);
      if (!stored) {
        report(config.slug, collectionId, "RECIPE_MISSING", "blocker", { recipeSlug: recipe.slug });
        continue;
      }
      if (stored.contentVersion === null || stored.reviewDigest === null) {
        report(config.slug, collectionId, "RECIPE_UNREVIEWED", "blocker", { recipeSlug: recipe.slug });
        continue;
      }
      const record = records.get(recipe.slug);
      if (!record) {
        report(config.slug, collectionId, "TAGS_MISSING", "blocker", { recipeSlug: recipe.slug });
        continue;
      }
      const evidence = tagEvidence[recipe.slug] ??= {
        tags: record.tags ?? null, collections: record.collections ?? null,
        reasons: (record.collection_reasons ?? null) as Json, reviewGate: record.review_gate ?? null,
        digest: sha256(canonicalJson(record.tags ?? null)),
      };
      if (stored.tagsDigest !== null && stored.tagsDigest !== evidence.digest) {
        report(config.slug, collectionId, "TAGS_CHANGED", "suggestion", { recipeSlug: recipe.slug });
      }
      members.push({ recipeId: stored.id, recipeSlug: recipe.slug, contentVersion: stored.contentVersion,
        reviewDigest: stored.reviewDigest, tagsDigest: evidence.digest,
        placementNote: record.collection_reasons?.[config.slug] ?? "", fit: "unverified" });
    }

    let cover: CollectionSnapshot["cover"] = null;
    if (config.cover) {
      const digest = input.sourceDigests[`public${config.cover.src}`];
      if (!COVER_PATH.test(config.cover.src)) {
        report(config.slug, collectionId, "COVER_INVALID", "blocker", { src: config.cover.src });
      } else if (!digest || !/^[0-9a-f]{64}$/.test(digest)) {
        report(config.slug, collectionId, "COVER_UNVERIFIED", "blocker", { src: config.cover.src });
      } else {
        cover = { ...config.cover, assetDigest: digest };
      }
    }

    reconcileCommerce(config, collectionId, members.map((m) => m.recipeId), input, report);

    candidates.push({
      collectionId, slug: config.slug, title: config.title, tagline: config.tagline, story: config.story,
      forWhen: config.forWhen, refresh: config.refresh, shelf: config.shelf, sortOrder: index + 1,
      stage: { min: config.stage.min, max: config.stage.max },
      series: config.series ? { key: config.series.key, volume: config.series.volume } : null,
      listingState: config.status === "published" ? "listed" : "unlisted",
      availability: config.availability, cloth: config.cloth, cover, members,
    });
    hints.push({ collectionSlug: config.slug, inShowroom: config.inShowroom ?? false,
      placeholderPrice: config.placeholderPrice, configStatus: config.status });
  });

  for (const stored of inventory.collections) {
    if (!seenSlugs.has(stored.slug)) {
      report(stored.slug, null, "DATABASE_ONLY_COLLECTION", "suggestion", { collectionId: stored.id });
    }
  }

  const sourceDigest = sha256(canonicalJson({ sourceSha: input.sourceSha, sourceDigests: input.sourceDigests,
    config: input.config, tags: input.tags, inventory }));
  return { candidates, discrepancies, blockedCollectionIds: [...blocked].sort(), sourceDigest, hints, tagEvidence };
}

/** Sold or committed releases must match the configured members exactly; buyers need an explicit policy. */
function reconcileCommerce(config: ShowroomCollection, collectionId: string, configIds: string[], input: ImportInput,
  report: (slug: string, id: string | null, code: string, severity: Discrepancy["severity"], details?: Json) => void) {
  const { inventory } = input;
  for (const release of inventory.releases.filter((r) => r.collectionId === collectionId)) {
    const orders = inventory.orders.filter((o) => o.releaseId === release.id);
    const sources = inventory.sources.filter((s) => s.releaseId === release.id);
    const liveOffer = inventory.offers.some((o) => o.releaseId === release.id && o.mode === "live" && o.saleEnabled);
    const committed = COMMITTED_RELEASE_STATES.has(release.state) || orders.length > 0 || sources.length > 0 || liveOffer;
    if (!committed) continue;

    const membership = reconcileMemberIds(configIds, release.members);
    if (!membership.matches) {
      report(config.slug, collectionId, "MEMBERSHIP_MISMATCH", "blocker",
        { releaseId: release.id, configOnly: membership.configOnly, databaseOnly: membership.databaseOnly });
    }
    const incomplete = orders.filter((o) => !o.snapshotComplete).length;
    if (incomplete > 0) {
      report(config.slug, collectionId, "ORDER_SNAPSHOT_INCOMPLETE", "blocker", { releaseId: release.id, orders: incomplete });
    }
    const testPurchases = orders.filter((o) => o.purchased && !o.live).length;
    if (testPurchases > 0) {
      report(config.slug, collectionId, "TEST_ACTIVITY", "suggestion", { releaseId: release.id, orders: testPurchases });
    }
    for (const kind of [...new Set(sources.map((s) => s.sourceKind))].sort()) {
      if (!inventory.policies.some((p) => p.originReleaseId === release.id && p.sourceKind === kind)) {
        report(config.slug, collectionId, "ACCESS_POLICY_UNKNOWN", "blocker", { releaseId: release.id, sourceKind: kind });
      }
    }
  }
}
