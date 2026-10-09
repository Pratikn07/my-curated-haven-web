import type { AdminCode, Result } from "../contracts";
import type { CollectionQuery, CollectionStatusFilter } from "./contracts";

// Shelf keys mirror SHELVES in ./snapshot; stage keys mirror the bookcase STAGE_OPTIONS (minus "all").
const SHELF_FILTERS = ["mornings", "everyday-meals", "cook-once", "nourish", "snacks-and-treats",
  "seasons-and-parties"] as const;
const STAGE_FILTERS = ["6-12m", "1-2y", "2-4y"] as const;
const STATUS_FILTERS: readonly CollectionStatusFilter[] = ["published", "unpublished", "listed", "unlisted", "retired"];

function fail(code: AdminCode, field: string, message: string): Result<never> {
  return { ok: false, code, reference: `admin-query-${Math.random().toString(36).slice(2, 10)}`,
    fields: { [field]: message } };
}

/** null when the list is present but holds an unknown value, so a typo never widens the filter. */
function parseList(raw: string | null, allowed: readonly string[]): string[] | null {
  if (raw === null || raw.trim() === "") return [];
  const values = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  return values.every((v) => allowed.includes(v)) ? values : null;
}

export function parseCollectionQuery(params: URLSearchParams): Result<CollectionQuery> {
  const q = (params.get("q") ?? "").slice(0, 200);
  const shelf = parseList(params.get("shelf"), SHELF_FILTERS);
  if (!shelf) return fail("INVALID", "shelf", "Unknown shelf filter");
  const stage = parseList(params.get("stage"), STAGE_FILTERS);
  if (!stage) return fail("INVALID", "stage", "Unknown stage filter");
  const status = parseList(params.get("status"), STATUS_FILTERS) as CollectionStatusFilter[] | null;
  if (!status) return fail("INVALID", "status", "Unknown status filter");
  const draftRaw = params.get("draft") || null;
  if (draftRaw !== null && draftRaw !== "true" && draftRaw !== "false") {
    return fail("INVALID", "draft", "Draft filter must be true or false");
  }
  const attentionRaw = params.get("attention") || null;
  if (attentionRaw !== null && attentionRaw !== "1") return fail("INVALID", "attention", "Attention filter must be 1");
  const page = Number(params.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > 1000) {
    return fail("INVALID", "page", "Page must be an integer from 1");
  }
  return { ok: true, value: { q, shelf, stage, status,
    draft: draftRaw === null ? null : draftRaw === "true", attention: attentionRaw === "1", page, pageSize: 25 } };
}

/** Inverse of parseCollectionQuery; default values are omitted so the plain library URL stays clean. */
export function serializeCollectionQuery(query: CollectionQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.shelf.length) params.set("shelf", query.shelf.join(","));
  if (query.stage.length) params.set("stage", query.stage.join(","));
  if (query.status.length) params.set("status", query.status.join(","));
  if (query.draft !== null) params.set("draft", String(query.draft));
  if (query.attention) params.set("attention", "1");
  if (query.page !== 1) params.set("page", String(query.page));
  return params;
}

/** A same-site return path to the collection list (keeping its filters), or the plain list. */
export function safeCollectionReturn(value: string | null): string {
  if (!value || !value.startsWith("/admin/collections") || value.startsWith("//")) return "/admin/collections";
  const url = new URL(value, "https://admin.local");
  if (url.origin !== "https://admin.local" || url.pathname !== "/admin/collections") return "/admin/collections";
  return url.pathname + url.search;
}
