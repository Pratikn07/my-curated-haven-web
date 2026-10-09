import "server-only";
import { createHash } from "node:crypto";
import type { SourceMode } from "@/lib/admin/collections/contracts";
import { getCommercePool } from "@/lib/payments/repository";
import { usableImageSrc } from "@/lib/recipes/format";
import { listShowroomCollections, SLUG_PATTERN } from "./visibility";
import { databaseShowroomCollection, type ProjectionRow, type RecipeFact } from "./publication-map";
import type { ShowroomCollection } from "./types";

/**
 * The one storefront reader for collections. With COLLECTIONS_SOURCE_BACKEND unset or "legacy" it serves
 * the configured collections exactly as before, with no database read. With "registry" each collection
 * follows its source mode: a legacy collection is served whole from config, a database collection only from
 * its committed publication and current recipe facts. Registry mode never falls back to config on an error:
 * the read throws, so a cached page keeps serving its last committed snapshot instead.
 */

export type PublicCollection = { publicationId: string | null; releaseId: string | null; sourceMode: SourceMode;
  sourceDigest: string; listed: boolean; collection: ShowroomCollection };

export function collectionsSourceBackend(): "legacy" | "registry" {
  const value = process.env.COLLECTIONS_SOURCE_BACKEND ?? "legacy";
  if (value !== "legacy" && value !== "registry") throw new Error(`Unknown COLLECTIONS_SOURCE_BACKEND: ${value}`);
  return value;
}

function configDigest(collection: ShowroomCollection): string {
  return createHash("sha256").update(JSON.stringify(collection)).digest("hex");
}

function fromConfig(collection: ShowroomCollection): PublicCollection {
  return { publicationId: null, releaseId: null, sourceMode: "legacy", sourceDigest: configDigest(collection),
    listed: true, collection };
}

const SHELF_ORDER = ["mornings", "everyday-meals", "cook-once", "nourish", "snacks-and-treats", "seasons-and-parties"];

async function readRegistry(): Promise<PublicCollection[]> {
  const pool = getCommercePool();
  const { rows } = await pool.query(`
    SELECT c.slug, coalesce(s.source_mode, 'legacy') AS source_mode, to_jsonb(p) AS projection
    FROM public.recipe_collections c
    LEFT JOIN private.collection_sources s ON s.collection_id = c.id
    LEFT JOIN public.collection_publication_projection p ON p.collection_id = c.id`);
  const database = rows.filter((r) => r.source_mode === "database" && r.projection) as { slug: string; projection: ProjectionRow }[];
  const memberIds = [...new Set(database.flatMap((r) => r.projection.members.map((m) => m.recipeId)))];
  const facts = new Map<string, RecipeFact>();
  if (memberIds.length > 0) {
    const { rows: recipeRows } = await pool.query(`
      SELECT c.id, c.slug, c.title, c.total_minutes, c.preview_image_path, c.publication_state, b.allergens, b.storage_notes
      FROM public.recipe_catalog c LEFT JOIN public.recipe_bodies b ON b.recipe_id = c.id
      WHERE c.id = ANY($1::uuid[])`, [memberIds]);
    for (const r of recipeRows as RecipeFact[]) facts.set(r.id, r);
  }
  const bySlug = new Map(database.map((r) => [r.slug, r.projection]));
  const configured = listShowroomCollections();
  const result: PublicCollection[] = configured.map((config) => {
    const row = bySlug.get(config.slug);
    if (!row) return fromConfig(config);
    return { publicationId: row.publication_id, releaseId: row.release_id, sourceMode: "database",
      sourceDigest: row.publication_id, listed: row.listing_state === "listed",
      collection: databaseShowroomCollection(row, facts, config, usableImageSrc) };
  });
  const configuredSlugs = new Set(configured.map((c) => c.slug));
  const databaseOnly = database.filter((r) => !configuredSlugs.has(r.slug)).map((r) => r.projection)
    .sort((a, b) => SHELF_ORDER.indexOf(a.shelf) - SHELF_ORDER.indexOf(b.shelf) || a.sort_order - b.sort_order);
  for (const row of databaseOnly) {
    result.push({ publicationId: row.publication_id, releaseId: row.release_id, sourceMode: "database",
      sourceDigest: row.publication_id, listed: row.listing_state === "listed",
      collection: databaseShowroomCollection(row, facts, null, usableImageSrc) });
  }
  // Retired collections leave the storefront; buyers keep them in their library.
  return result.filter((c) => !(c.sourceMode === "database" && bySlug.get(c.collection.slug)?.listing_state === "retired"));
}

async function allCollections(): Promise<PublicCollection[]> {
  return collectionsSourceBackend() === "legacy" ? listShowroomCollections().map(fromConfig) : readRegistry();
}

/** Collections on the bookcase (listed), in shelf order. */
export async function listPublishedCollections(): Promise<PublicCollection[]> {
  return (await allCollections()).filter((c) => c.listed);
}

/** Listed collections with their own page. */
export async function listOpenPublishedCollections(): Promise<PublicCollection[]> {
  return (await listPublishedCollections()).filter((c) => c.collection.availability === "open");
}

/** An open collection by slug, listed or unlisted (unlisted pages are reachable by link only). */
export async function getPublishedCollection(slug: string): Promise<PublicCollection | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  return (await allCollections()).find((c) => c.collection.slug === slug && c.collection.availability === "open") ?? null;
}

/** The chapters of the first showroom (/collections/test), in its original order. */
const SHOWROOM_ORDER = ["halloween", "meal-prep", "protein-packs"];

export async function listPublishedShowroomChapters(): Promise<PublicCollection[]> {
  return (await listOpenPublishedCollections()).filter((c) => c.collection.inShowroom)
    .sort((a, b) => SHOWROOM_ORDER.indexOf(a.collection.slug) - SHOWROOM_ORDER.indexOf(b.collection.slug));
}
