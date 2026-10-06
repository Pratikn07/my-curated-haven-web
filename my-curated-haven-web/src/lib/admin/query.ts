import type {
  AdminCode,
  LibraryQuery,
  LibraryView,
  PublicationState,
  Result,
  ReviewState,
} from "./contracts";

const PUBLICATION_STATES: readonly PublicationState[] = ["draft", "published", "withdrawn"];
const REVIEW_STATES: readonly ReviewState[] = [
  "unreviewed",
  "submitted",
  "approved",
  "changes_requested",
  "rejected",
];
const LIBRARY_VIEWS: readonly LibraryView[] = [
  "all",
  "attention",
  "awaiting_review",
  "ready",
  "published",
  "withdrawn",
];

function parseList(value: string | null, allowed: readonly string[]): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && allowed.includes(s));
}

function fail(code: AdminCode): { ok: false; code: AdminCode; reference: string } {
  return { ok: false, code, reference: `admin-query-${Math.random().toString(36).slice(2, 10)}` };
}

export function parseLibraryQuery(params: URLSearchParams): Result<LibraryQuery> {
  const q = (params.get("q") ?? "").slice(0, 200);
  const viewRaw = params.get("view") ?? "all";
  if (!LIBRARY_VIEWS.includes(viewRaw as LibraryView)) {
    return { ...fail("INVALID"), fields: { view: "Unknown library view" } };
  }
  const publication = parseList(params.get("publication"), PUBLICATION_STATES) as PublicationState[];
  const review = parseList(params.get("review"), REVIEW_STATES) as ReviewState[];
  if (params.get("publication") && publication.length === 0 && params.get("publication")?.trim() !== "") {
    return { ...fail("INVALID"), fields: { publication: "Unknown publication filter" } };
  }
  if (params.get("review") && review.length === 0 && params.get("review")?.trim() !== "") {
    return { ...fail("INVALID"), fields: { review: "Unknown review filter" } };
  }
  const collections = (params.get("collections") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 20);
  for (const c of collections) {
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(c)) {
      return { ...fail("INVALID"), fields: { collections: "Unknown collection filter" } };
    }
  }
  const pageRaw = params.get("page") ?? "1";
  const page = Number(pageRaw);
  if (!Number.isInteger(page) || page < 1 || page > 1000) {
    return { ...fail("INVALID"), fields: { page: "Page must be an integer from 1" } };
  }
  return {
    ok: true,
    value: {
      q,
      collections,
      publication,
      review,
      view: viewRaw as LibraryView,
      page,
      pageSize: 25,
    },
  };
}

export function safeAdminReturn(value: string | null): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) return "/admin/recipes";
  const url = new URL(value, "https://admin.local");
  if (url.origin !== "https://admin.local" || !/^\/admin(?:\/|$)/.test(url.pathname)) return "/admin/recipes";
  return url.pathname + url.search + url.hash;
}
