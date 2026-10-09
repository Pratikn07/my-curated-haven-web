import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeCatalogPage,
  decodeCollectionDetail,
  decodeCollectionLibrary,
} from "../../src/lib/admin/collections/decode.ts";

const ID = "93000000-0000-0000-0000-000000000001";
const PUB = "93000000-0000-0000-0000-000000000201";
const REV = "93000000-0000-0000-0000-000000000301";
const USER = "92000000-0000-0000-0000-000000000001";
const DIGEST = "d".repeat(64);
const AT = "2026-10-08T12:00:00.000Z";

const snapshot = () => ({
  collectionId: ID,
  slug: "first-foods",
  title: "First foods",
  tagline: "Soft starts",
  story: "Gentle first tastes.",
  forWhen: "Starting solids",
  refresh: "New recipes each season",
  shelf: "mornings",
  sortOrder: 1,
  stage: { min: 6, max: null },
  series: { key: "breakfast", volume: 1 },
  listingState: "listed",
  availability: "open",
  cloth: "sage",
  cover: { src: "/covers/first.png", width: 600, height: 900, alt: "A green book", assetDigest: DIGEST },
  members: [{
    recipeId: "93000000-0000-0000-0000-000000000101",
    recipeSlug: "pear-puree",
    contentVersion: 2,
    reviewDigest: DIGEST,
    tagsDigest: DIGEST,
    placementNote: "",
    fit: "accepted",
  }],
});

const check = { code: "COLLECTION_READY", scope: "collection", state: "pass", severity: "blocker",
  explanation: "Ready", origin: "validation" };

const detail = () => ({
  collectionId: ID,
  identity: { slug: "first-foods", title: "First foods" },
  sourceMode: "database",
  commerceState: "disabled",
  published: { publicationId: PUB, releaseId: null, snapshot: snapshot() },
  working: {
    id: REV, collectionId: ID, version: 3, digest: DIGEST,
    base: { publicationId: PUB, digest: DIGEST }, state: "draft", submissionId: null,
    snapshot: snapshot(), savedAt: AT, savedBy: USER,
  },
  readiness: { digest: DIGEST, checks: [check], readyForApproval: true, readyToPublish: false,
    needsVerification: false },
  impact: { ok: true, value: { token: "impact-token", checkedAt: AT, sourceRevision: "rev-1",
    protectedRecipeIds: [], eligibleBuyerCount: 0, pendingLiveCount: 0, offerIds: [],
    affectedCampaignSlugs: [], checks: [] } },
  recipes: [{ recipeId: "93000000-0000-0000-0000-000000000101", slug: "pear-puree", title: "Pear purée",
    publication: "published", totalMinutes: 10, imagePath: "recipe-previews/pear.webp", allergens: [], storageNotes: null }],
  history: [{ id: "e1", action: "collection.save", at: AT, reason: "Draft", humanAuthoriser: USER,
    authoriserEmail: "owner@synthetic.test", executor: USER, executorType: "human", beforeRef: null, afterRef: REV,
    operationId: "op-1" }],
  historyCursor: null,
  checkedAt: AT,
});

test("a complete detail decodes", () => {
  const result = decodeCollectionDetail(detail());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.working.version, 3);
    assert.equal(result.value.published.snapshot.members[0].recipeSlug, "pear-puree");
  }
});

test("an unavailable impact source stays unavailable, not zero buyers", () => {
  const value = { ...detail(), impact: { ok: false, code: "UNAVAILABLE", reference: "impact-1" } };
  const result = decodeCollectionDetail(value);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.impact.ok, false);
});

test("nested identifiers, states and numbers are checked, not cast", () => {
  const broken = [
    (d) => { d.collectionId = "not-a-uuid"; },
    (d) => { d.sourceMode = "spreadsheet"; },
    (d) => { d.working.state = "live"; },
    (d) => { d.working.version = "3"; },
    (d) => { d.working.snapshot.members[0].recipeId = "x"; },
    (d) => { d.working.snapshot.members[0].fit = "great"; },
    (d) => { d.published.snapshot.cover.width = -1; },
    (d) => { d.readiness.checks[0].state = "maybe"; },
    (d) => { d.impact.value.eligibleBuyerCount = -2; },
    (d) => { d.history[0].executorType = "robot"; },
    (d) => { d.working.digest = "short"; },
    (d) => { d.recipes[0].recipeId = "x"; },
    (d) => { d.checkedAt = "yesterday"; },
  ];
  for (const mutate of broken) {
    const value = detail();
    mutate(value);
    const result = decodeCollectionDetail(value);
    assert.equal(result.ok, false, mutate.toString());
    if (!result.ok) assert.equal(result.code, "UNAVAILABLE");
  }
});

test("unknown top-level shapes are unavailable", () => {
  for (const value of [null, [], "x", {}, { ...detail(), extra: { secret: true } }]) {
    assert.equal(decodeCollectionDetail(value).ok, false);
  }
});

test("library rows keep published and draft counts and commerce state independent", () => {
  const row = { collectionId: ID, slug: "first-foods", title: "First foods", shelf: "mornings",
    stage: { min: null, max: null }, series: null, listingState: "unlisted", availability: "coming-soon",
    publicationId: null, publishedCount: 0, draftCount: null, workingState: null, needsAttention: false,
    commerceState: "unavailable", changedAt: AT };
  const result = decodeCollectionLibrary({ rows: [row], filteredTotal: 1, page: 1, pageSize: 25, checkedAt: AT });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.rows[0].commerceState, "unavailable");
    assert.equal(result.value.rows[0].draftCount, null);
  }
  assert.equal(decodeCollectionLibrary({ rows: [{ ...row, publishedCount: 1.5 }], filteredTotal: 1,
    page: 1, pageSize: 25, checkedAt: AT }).ok, false);
});

test("catalog rows carry review state and allergens; a recipe without a body has no version", () => {
  const row = { recipeId: ID, slug: "pear", title: "Pear", publication: "draft", contentVersion: null, activeHash: null,
    reviewed: false, allergens: [], tagsDigest: DIGEST, totalMinutes: null, mealLabels: [], dietLabels: [] };
  assert.equal(decodeCatalogPage({ rows: [row], filteredTotal: 1, page: 1, pageSize: 25, checkedAt: AT }).ok, true);
  assert.equal(decodeCatalogPage({ rows: [{ ...row, reviewed: "yes" }], filteredTotal: 1, page: 1, pageSize: 25, checkedAt: AT }).ok, false);
});
