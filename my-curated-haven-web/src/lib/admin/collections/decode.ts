import type { AdminCode, Check, Result } from "../contracts";
import type {
  CatalogPage,
  CatalogRecipe,
  CollectionDetail,
  CollectionEvent,
  CollectionHistoryPage,
  CollectionImpact,
  CollectionLibrary,
  CollectionReadiness,
  CollectionRevision,
  CollectionRow,
  CollectionSnapshot,
  DraftResult,
  Member,
  RecipeSummary,
} from "./contracts";

/**
 * Runtime decoding of collection RPC responses. Every nested identifier, state and number is
 * checked; unknown keys are refused. Any mismatch makes the whole response UNAVAILABLE so the UI
 * shows "couldn't load" rather than rendering a guessed or partial record.
 */

class Invalid extends Error {}
type Decoder<T> = (value: unknown, path: string) => T;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const ADMIN_CODES: readonly AdminCode[] = ["AUTH_REQUIRED", "MFA_REQUIRED", "DENIED", "DISABLED",
  "INVALID", "NOT_FOUND", "CONFLICT", "UNAVAILABLE", "BLOCKED"];

function bad(path: string): never {
  throw new Invalid(path);
}

function object<T>(fields: { [K in keyof T]: Decoder<T[K]> }): Decoder<T> {
  return (value, path) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) bad(path);
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) if (!(key in fields)) bad(`${path}.${key}`);
    const out = {} as T;
    for (const key of Object.keys(fields) as (keyof T)[]) {
      out[key] = fields[key](record[key as string], `${path}.${String(key)}`);
    }
    return out;
  };
}

const string: Decoder<string> = (v, p) => (typeof v === "string" ? v : bad(p));
const uuid: Decoder<string> = (v, p) => (typeof v === "string" && UUID.test(v) ? v : bad(p));
const digest: Decoder<string> = (v, p) => (typeof v === "string" && DIGEST.test(v) ? v : bad(p));
const timestamp: Decoder<string> = (v, p) =>
  (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : bad(p));
const boolean: Decoder<boolean> = (v, p) => (typeof v === "boolean" ? v : bad(p));
const count: Decoder<number> = (v, p) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : bad(p));
const positive: Decoder<number> = (v, p) => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : bad(p));
const finite: Decoder<number> = (v, p) => (typeof v === "number" && Number.isFinite(v) ? v : bad(p));

function oneOf<T extends string>(values: readonly T[]): Decoder<T> {
  return (v, p) => (values.includes(v as T) ? (v as T) : bad(p));
}
function nullable<T>(decode: Decoder<T>): Decoder<T | null> {
  return (v, p) => (v === null ? null : decode(v, p));
}
function array<T>(decode: Decoder<T>): Decoder<T[]> {
  return (v, p) => (Array.isArray(v) ? v.map((item, i) => decode(item, `${p}[${i}]`)) : bad(p));
}
function literal<T>(expected: T): Decoder<T> {
  return (v, p) => (v === expected ? expected : bad(p));
}

const age = nullable(count);

const member = object<Member>({
  recipeId: uuid, recipeSlug: string, contentVersion: positive, reviewDigest: digest,
  tagsDigest: digest, placementNote: string, fit: oneOf(["unverified", "accepted", "blocked"]),
});

const snapshot = object<CollectionSnapshot>({
  collectionId: uuid, slug: string, title: string, tagline: string, story: string, forWhen: string,
  refresh: string, shelf: string, sortOrder: finite,
  stage: object({ min: age, max: age }),
  series: nullable(object({ key: string, volume: positive })),
  listingState: oneOf(["listed", "unlisted", "retired"]),
  availability: oneOf(["open", "coming-soon"]),
  cloth: string,
  cover: nullable(object({ src: string, width: positive, height: positive, alt: string, assetDigest: digest })),
  members: array(member),
});

const collectionState = oneOf(["draft", "submitted", "approved", "changes_requested", "rejected",
  "published", "superseded", "discarded"] as const);

const revision = object<CollectionRevision>({
  id: uuid, collectionId: uuid, version: positive, digest,
  base: object({ publicationId: nullable(uuid), digest }),
  state: collectionState, submissionId: nullable(uuid), snapshot, savedAt: timestamp, savedBy: uuid,
});

const check = object<Check>({
  code: string, scope: string, state: oneOf(["pass", "fail", "unknown"]),
  severity: oneOf(["blocker", "suggestion"]), explanation: string,
  origin: oneOf(["validation", "human", "source"]),
});

const readiness = object<CollectionReadiness>({
  digest, checks: array(check), readyForApproval: boolean, readyToPublish: boolean, needsVerification: boolean,
});

const impactValue = object<CollectionImpact>({
  token: string, checkedAt: timestamp, sourceRevision: string, protectedRecipeIds: array(uuid),
  eligibleBuyerCount: count, pendingLiveCount: count, offerIds: array(uuid),
  affectedCampaignSlugs: array(string), checks: array(check),
});

const impact: Decoder<Result<CollectionImpact>> = (v, p) => {
  if (typeof v === "object" && v !== null && (v as { ok?: unknown }).ok === true) {
    return object<{ ok: true; value: CollectionImpact }>({ ok: literal(true), value: impactValue })(v, p);
  }
  const failed = object<{ ok: false; code: AdminCode; reference: string }>({
    ok: literal(false), code: oneOf(ADMIN_CODES), reference: string,
  })(v, p);
  return failed;
};

const event = object<CollectionEvent>({
  id: string, action: string, at: timestamp, reason: string, humanAuthoriser: nullable(uuid),
  authoriserEmail: nullable(string), executor: string, executorType: oneOf(["human", "operator"]), beforeRef: nullable(string),
  afterRef: nullable(string), operationId: string,
});

const recipeSummary = object<RecipeSummary>({ recipeId: uuid, slug: string, title: string, publication: string,
  totalMinutes: nullable(count), imagePath: string, allergens: array(string), storageNotes: nullable(string) });

const detail = object<CollectionDetail>({
  collectionId: uuid, identity: object({ slug: string, title: string }), sourceMode: oneOf(["legacy", "database"]),
  commerceState: oneOf(["enabled", "disabled", "no_offer", "unavailable"]),
  published: nullable(object({ publicationId: uuid, releaseId: nullable(uuid), snapshot })),
  working: nullable(revision), readiness, impact, recipes: array(recipeSummary),
  history: array(event), historyCursor: nullable(string), checkedAt: timestamp,
});

const historyPage = object<CollectionHistoryPage>({ events: array(event), nextCursor: nullable(string) });

const row = object<CollectionRow>({
  collectionId: uuid, slug: string, title: string, shelf: string,
  stage: object({ min: age, max: age }),
  series: nullable(object({ key: string, volume: positive })),
  listingState: oneOf(["listed", "unlisted", "retired"]), availability: oneOf(["open", "coming-soon"]),
  publicationId: nullable(uuid), publishedCount: count, draftCount: nullable(count),
  workingState: nullable(collectionState), needsAttention: boolean,
  commerceState: oneOf(["enabled", "disabled", "no_offer", "unavailable"]), changedAt: timestamp,
});

const library = object<CollectionLibrary>({
  rows: array(row), filteredTotal: count, page: positive, pageSize: literal(25 as const), checkedAt: timestamp,
});

function run<T>(decode: Decoder<T>, value: unknown): Result<T> {
  try {
    return { ok: true, value: decode(value, "$") };
  } catch (error) {
    if (!(error instanceof Invalid)) throw error;
    return { ok: false, code: "UNAVAILABLE", reference: `collection-decode-${Math.random().toString(36).slice(2, 10)}` };
  }
}

export function decodeCollectionDetail(data: unknown): Result<CollectionDetail> {
  return run(detail, data);
}

const draftResult = object<DraftResult>({ operationId: uuid, noChange: boolean, revision: nullable(revision),
  committedAt: timestamp });

const catalogRecipe = object<CatalogRecipe>({
  recipeId: uuid, slug: string, title: string, publication: string, contentVersion: nullable(positive),
  activeHash: nullable(digest), reviewed: boolean, allergens: array(string), tagsDigest: digest,
  totalMinutes: nullable(count), mealLabels: array(string), dietLabels: array(string),
});

const catalogPage = object<CatalogPage>({
  rows: array(catalogRecipe), filteredTotal: count, page: positive, pageSize: literal(25 as const), checkedAt: timestamp,
});

export function decodeImpactResult(data: unknown): Result<Result<CollectionImpact>> {
  return run(impact, data);
}

export function decodeCatalogPage(data: unknown): Result<CatalogPage> {
  return run(catalogPage, data);
}

export function decodeDraftResult(data: unknown): Result<DraftResult> {
  return run(draftResult, data);
}

export function decodeCollectionHistory(data: unknown): Result<CollectionHistoryPage> {
  return run(historyPage, data);
}

export function decodeCollectionLibrary(data: unknown): Result<CollectionLibrary> {
  return run(library, data);
}
