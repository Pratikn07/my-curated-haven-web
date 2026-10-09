import test from "node:test";
import assert from "node:assert/strict";
import {
  isAdminNavigationContext,
  isAdminPath,
} from "../../src/lib/analytics/private-paths.ts";

test("admin prefix is segment-safe", () => {
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/admin/recipes"), true);
  assert.equal(isAdminPath("/administrator"), false);
  assert.equal(
    isAdminNavigationContext("https://fixture.test/sign-in?returnTo=%2Fadmin%2Frecipes%3Fq%3Dprivate"),
    true
  );
});

test("non-admin contexts stay public", () => {
  assert.equal(isAdminPath("/recipes"), false);
  assert.equal(isAdminNavigationContext("https://fixture.test/recipes"), false);
  assert.equal(isAdminNavigationContext("https://fixture.test/sign-in?returnTo=%2Frecipes"), false);
});
