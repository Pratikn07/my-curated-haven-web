import test from "node:test";
import assert from "node:assert/strict";
import { loopbackTarget, SCENARIOS, selectScenarios } from "../../scripts/admin-support-concurrency-plan.mjs";

const config = (project, port) => `project_id = "${project}"\n\n[api]\nport = 54361\n\n[db]\n# local\nport = ${port}\nshadow_port = 54360\n`;

test("a run selects every scenario by default and refuses unknown ones", () => {
  assert.deepEqual(selectScenarios([]), Object.keys(SCENARIOS));
  assert.deepEqual(selectScenarios(["stale-fence", "stale-fence"]), ["stale-fence"]);
  assert.throws(() => selectScenarios(["drop-everything"]), /Unknown scenario/);
  assert.ok(Object.keys(SCENARIOS).length >= 10);
});

test("the harness only targets an owned loopback test stack", () => {
  assert.deepEqual(loopbackTarget(config("mch-admin-support-test", 54362)),
    { projectId: "mch-admin-support-test", url: "postgresql://postgres:postgres@127.0.0.1:54362/postgres" });
  assert.throws(() => loopbackTarget(config("my-curated-haven", 54362)), /owned test project/);
  assert.throws(() => loopbackTarget(config("mch-admin-support-test", 54322)), /default local stack/);
  assert.throws(() => loopbackTarget('project_id = "x-test"\n'), /port/);
});

test("in CI the job's own stack is accepted, still on loopback", () => {
  assert.deepEqual(loopbackTarget(config("my-curated-haven", 54322), { ci: true }),
    { projectId: "my-curated-haven", url: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
  assert.throws(() => loopbackTarget('project_id = "x"\n', { ci: true }), /port/);
});
