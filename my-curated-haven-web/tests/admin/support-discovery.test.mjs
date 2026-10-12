import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

test("required test groups cannot silently discover zero files",()=>{
  assert.ok(readdirSync("tests/admin").some(name=>/^support-.*\.test\.mjs$/.test(name)));
  assert.ok(readdirSync("tests/payments").some(name=>/^reconciliation-.*\.test\.mjs$/.test(name)));
});

test("every support database suite and browser spec CI requires exists", () => {
  const suites = readdirSync("../supabase/tests/database").filter((name) => /^[78][0-9]_[a-z_]*admin_support[a-z_]*\.test\.sql$/.test(name));
  assert.ok(suites.length >= 12, `found ${suites.length} support suites`);
  const ci = readFileSync("../.github/workflows/web-ci.yml", "utf8");
  for (const spec of ["admin-support-inspection", "admin-support-diagnosis", "admin-support-repair", "commerce-events"]) {
    assert.ok(ci.includes(spec), `${spec} is required in CI`);
    assert.ok(readdirSync("tests/e2e").includes(`${spec}.spec.ts`), `${spec}.spec.ts exists`);
  }
  assert.ok(ci.includes("admin-support-concurrency.mjs"), "CI runs the race harness");
});

test("the browser suite runs one worker at a time, and payment tests are in verify", () => {
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  assert.match(scripts["test:e2e"], /--workers=1/);
  assert.match(scripts.verify, /test:reconciliation:unit/);
  assert.match(scripts["test:support:unit"], /tests\/admin\/support-\*\.test\.mjs/);
});
