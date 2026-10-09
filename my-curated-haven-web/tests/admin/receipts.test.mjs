import assert from "node:assert/strict";
import test from "node:test";
import { decodeAdminRecipeOperations } from "../../src/lib/admin/receipts.ts";

const recipeId = "91000000-0000-0000-0000-000000000901";
const receipt = {
  operationId: "93000000-0000-0000-0000-000000000900",
  recipeId,
  action: "revision.publish",
  revisionId: "94000000-0000-0000-0000-000000000900",
  version: 2,
  digest: "saved-digest",
  noChange: false,
  committedAt: "2026-10-08T12:00:00Z",
  publication: "published",
};

test("receipt decoder accepts only a bounded same-recipe publication record", () => {
  assert.deepEqual(decodeAdminRecipeOperations([{ ...receipt, privateRequest: "hidden" }], recipeId), [receipt]);
  assert.throws(() => decodeAdminRecipeOperations(Array(11).fill(receipt), recipeId), /receipt list/);
  assert.throws(() => decodeAdminRecipeOperations([{ ...receipt, recipeId: "other" }], recipeId), /receipt/);
  assert.throws(() => decodeAdminRecipeOperations([{ ...receipt, action: "draft.save" }], recipeId), /receipt/);
});
