import type { AdminCode, LibraryResult, Result } from "../contracts";
import type { CollectionLibrary, CollectionState } from "../collections/contracts";
import type { AccessConsequence, SupportQueuePage } from "../support/contracts";

/**
 * Publishing Home: what needs a decision, what can be continued, and what recently completed.
 * Each lane is built from its own authorised inventory read, so one failing source shows as
 * unavailable while the other stays useful, and a failure is never shown as zero.
 */

export type HomeRow = { key: string; title: string; reason: string; state: string; changedAt: string; href: string };
export type HomeCount = { label: string; count: number };
export type AttentionFeed =
  | { state: "ready"; rows: HomeRow[]; counts: HomeCount[]; total: number; checkedAt: string; inventoryHref: string }
  | { state: "unavailable"; code: AdminCode; reference: string; inventoryHref: string }
  | { state: "unauthorised" };
export type HomeResult = { operationId: string; domain: "recipe" | "collection"; objectId: string; title: string;
  action: "revision.publish" | "recipe.withdraw" | "recipe.correct" | "collection.publish"; noChange: boolean;
  refreshState: "complete" | "pending" | null; committedAt: string };
export type ContinueItem = { domain: "recipe" | "collection"; objectId: string; title: string; state: CollectionState;
  version: number; savedAt: string; savedByYou: boolean };
/** A support outcome the caller ran, approved or (as owner) sent; safe facts only. */
export type SupportResult = { operationId: string; kind: "repair" | "refund" | "notice"; orderId: string; supportReference: string;
  state: string; at: string };
/**
 * `continueWork` is null when the operator cannot edit in the current stage; `support` is unauthorised and
 * `supportResults` null unless the operator holds support.read while support is switched on.
 */
export type AdminHome = { recipes: AttentionFeed; collections: AttentionFeed;
  results: Result<HomeResult[]>; continueWork: Result<ContinueItem[]> | null;
  support: AttentionFeed; supportResults: Result<SupportResult[]> | null };

/** Rows shown per lane; the counts always cover the whole authorised inventory. */
export const HOME_ROWS = 5;

const PUBLICATION_LABELS = { draft: "Not published", published: "Published", withdrawn: "Withdrawn" } as const;

/** Recipes: blockers first, then submitted review, then approved and ready to publish. */
export function recipeFeed(attention: LibraryResult, review: LibraryResult, ready: LibraryResult): AttentionFeed {
  const rows: HomeRow[] = [];
  const seen = new Set<string>();
  const add = (list: LibraryResult, reason: (row: LibraryResult["rows"][number]) => string) => {
    for (const row of list.rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push({ key: `recipe:${row.id}`, title: row.title, reason: reason(row), state: PUBLICATION_LABELS[row.publication],
        changedAt: row.changedAt, href: `/admin/recipes/${row.id}` });
    }
  };
  add(attention, (row) => row.readiness.checks.find((c) => c.severity === "blocker" && c.state !== "pass")?.explanation
    ?? "Needs attention before it can be published");
  add(review, () => "Submitted for review");
  add(ready, () => "Approved and ready to publish");
  const summary = attention.summary;
  const counts = [
    { label: "Need attention", count: summary.attention },
    { label: "Awaiting review", count: summary.awaiting_review },
    { label: "Ready to publish", count: summary.ready },
  ];
  return { state: "ready", rows: rows.slice(0, HOME_ROWS), counts, total: counts.reduce((n, c) => n + c.count, 0),
    checkedAt: attention.checkedAt, inventoryHref: "/admin/recipes" };
}

const COLLECTION_ORDER: Partial<Record<CollectionState, number>> = { changes_requested: 0, submitted: 1, approved: 2 };
const COLLECTION_REASONS: Partial<Record<CollectionState, string>> = {
  changes_requested: "Changes requested on the private draft",
  submitted: "Submitted for review",
  approved: "Approved and ready to publish",
};

/** Collections that need a decision: requested changes first, then submitted review, then approved. */
export function collectionFeed(library: CollectionLibrary): AttentionFeed {
  const rows = library.rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (COLLECTION_ORDER[a.row.workingState ?? "draft"] ?? 3) - (COLLECTION_ORDER[b.row.workingState ?? "draft"] ?? 3)
      || a.index - b.index)
    .slice(0, HOME_ROWS)
    .map(({ row }) => ({ key: `collection:${row.collectionId}`, title: row.title,
      reason: COLLECTION_REASONS[row.workingState ?? "draft"] ?? "Needs a decision",
      state: row.publicationId ? `Published · ${row.publishedCount} ${row.publishedCount === 1 ? "recipe" : "recipes"}` : "Not published",
      changedAt: row.changedAt, href: `/admin/collections/${row.collectionId}` }));
  return { state: "ready", rows, counts: [{ label: "Need a decision", count: library.filteredTotal }],
    total: library.filteredTotal, checkedAt: library.checkedAt, inventoryHref: "/admin/collections" };
}

const CONSEQUENCE_ORDER = { blocked: 0, at_risk: 1, unknown: 2, none: 3 } as const;

/**
 * Customer support attention from the first page of each mode's protected queue. Verified dispute deadlines come
 * first (soonest first), then blocked and at-risk access, then the longest waiting. The counts are the items read,
 * not the whole queue, which Home does not know. Labels are passed in, so this stays free of runtime imports.
 */
export function supportFeed(live: SupportQueuePage, test: SupportQueuePage, checkedAt: string,
  labels: { reasons: Record<string, string>; access: Record<AccessConsequence, string> }): AttentionFeed {
  const items = [...live.items, ...test.items];
  const rows = items
    .map((item) => ({ item, deadline: item.deadlineAt ? Date.parse(item.deadlineAt) : Infinity }))
    .sort((a, b) => a.deadline - b.deadline || CONSEQUENCE_ORDER[a.item.accessConsequence] - CONSEQUENCE_ORDER[b.item.accessConsequence]
      || Date.parse(a.item.observedAt) - Date.parse(b.item.observedAt))
    .slice(0, HOME_ROWS)
    .map(({ item }) => ({
      key: `support:${item.mode}:${item.reasonCode}:${item.caseId ?? item.orderId}`,
      title: item.supportReference ?? "Account case",
      reason: `${labels.reasons[item.reasonCode] ?? item.reasonCode}${item.deadlineAt ? `; respond in Stripe by ${item.deadlineAt.slice(0, 10)}` : ""}`,
      state: `${item.mode === "live" ? "Live" : "Test"} · ${labels.access[item.accessConsequence]}`,
      changedAt: item.observedAt,
      href: item.orderId ? `/admin/support/orders/${item.orderId}` : `/admin/support?mode=${item.mode}`,
    }));
  const more = live.nextCursor !== null || test.nextCursor !== null;
  return { state: "ready", rows, counts: [{ label: "Live items shown", count: live.items.length },
    { label: "Test items shown", count: test.items.length }],
    total: items.length + (more ? 1 : 0), checkedAt, inventoryHref: "/admin/support" };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isTime = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function decodeHomeResults(data: unknown): HomeResult[] {
  if (!Array.isArray(data) || data.length > 10) throw new Error("Invalid home results");
  return data.map((item) => {
    if (!isRecord(item) || typeof item.operationId !== "string" || !UUID.test(item.operationId)
      || (item.domain !== "recipe" && item.domain !== "collection") || typeof item.objectId !== "string" || !UUID.test(item.objectId)
      || typeof item.title !== "string" || typeof item.noChange !== "boolean" || !isTime(item.committedAt)
      || !(item.domain === "recipe" ? ["revision.publish", "recipe.withdraw", "recipe.correct"] : ["collection.publish"])
        .includes(item.action as string)
      || !(item.refreshState === null || item.refreshState === "complete" || item.refreshState === "pending")) {
      throw new Error("Invalid home result");
    }
    return item as HomeResult;
  });
}

export function decodeContinueWork(data: unknown): ContinueItem[] {
  if (!Array.isArray(data) || data.length > 10) throw new Error("Invalid continue work");
  return data.map((item) => {
    if (!isRecord(item) || (item.domain !== "recipe" && item.domain !== "collection")
      || typeof item.objectId !== "string" || !UUID.test(item.objectId) || typeof item.title !== "string"
      || !["draft", "submitted", "approved", "changes_requested", "rejected"].includes(item.state as string)
      || !Number.isInteger(item.version) || !isTime(item.savedAt) || typeof item.savedByYou !== "boolean") {
      throw new Error("Invalid continue item");
    }
    return item as ContinueItem;
  });
}

const SUPPORT_KINDS = new Set(["repair", "refund", "notice"]);
const SUPPORT_REFERENCE = /^MCH-[A-Z0-9]{2,12}$/;

export function decodeSupportResults(data: unknown): SupportResult[] {
  if (!Array.isArray(data) || data.length > 10) throw new Error("Invalid support results");
  return data.map((item) => {
    if (!isRecord(item) || Object.keys(item).sort().join(",") !== "at,kind,operationId,orderId,state,supportReference"
      || typeof item.operationId !== "string" || !UUID.test(item.operationId) || !SUPPORT_KINDS.has(item.kind as string)
      || typeof item.orderId !== "string" || !UUID.test(item.orderId) || typeof item.supportReference !== "string"
      || !SUPPORT_REFERENCE.test(item.supportReference) || typeof item.state !== "string" || !/^[a-z_]{1,40}$/.test(item.state)
      || !isTime(item.at)) {
      throw new Error("Invalid support result");
    }
    return item as SupportResult;
  });
}
