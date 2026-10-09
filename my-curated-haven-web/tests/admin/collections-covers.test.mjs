import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCoverManifest } from "../../scripts/admin-collections-cover-manifest.mjs";

const manifest = JSON.parse(readFileSync(new URL("../../src/config/collection-covers.json", import.meta.url), "utf8"));

test("the cover manifest matches the shipped files", async () => {
  assert.deepEqual(await buildCoverManifest(), manifest);
});

test("configured covers keep their recorded size", async () => {
  const { register } = await import("node:module");
  register("../../scripts/ts-alias-hooks.mjs", import.meta.url);
  const { SHOWROOM_COLLECTIONS } = await import("../../src/config/collections.ts");
  for (const c of SHOWROOM_COLLECTIONS.filter((x) => x.cover)) {
    const entry = manifest.find((m) => m.src === c.cover.src);
    assert.ok(entry, c.slug);
    assert.deepEqual([entry.width, entry.height], [c.cover.width, c.cover.height], c.slug);
  }
});
