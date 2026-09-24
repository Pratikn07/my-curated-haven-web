import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPhase10Results,
  discoverPhase10Scenarios,
  renderCaseResultsCsv,
  renderPhase10Markdown,
} from "../../scripts/phase10-results.mjs";

const fakeReport = {
  config: {
    projects: [
      { id: "desktop", name: "chromium-desktop" },
      { id: "mobile", name: "chromium-mobile" },
    ],
  },
  suites: [
    {
      title: "recipes.spec.ts",
      file: "tests/e2e/recipes.spec.ts",
      specs: [
        {
          title: "[QA-J03:partial] search input updates URL state",
          tests: [
            {
              projectId: "desktop",
              results: [{ status: "passed", retry: 0 }],
            },
            {
              projectId: "mobile",
              results: [
                {
                  status: "skipped",
                  retry: 0,
                  annotations: [
                    { type: "skip", description: "runs once on desktop" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

test("the Phase 10 inventory resolves exactly the 86 matrix scenarios", async () => {
  const scenarios = await discoverPhase10Scenarios();
  assert.equal(scenarios.length, 86);
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 86);
  assert.deepEqual(
    Object.fromEntries(
      ["J", "S", "M", "P", "A", "O"].map((family) => [
        family,
        scenarios.filter((scenario) => scenario.family === family).length,
      ]),
    ),
    { J: 24, S: 24, M: 12, P: 10, A: 8, O: 8 },
  );
});

test("partial coverage stays partial while preserving intentional skip reasons", async () => {
  const results = await buildPhase10Results(fakeReport, {
    generatedAt: "2026-09-24T00:00:00.000Z",
    sourceSha: "abc123",
  });
  const scenario = results.cases.find(({ id }) => id === "QA-J03");
  assert.equal(scenario.disposition, "partial");
  assert.equal(scenario.passCount, 1);
  assert.equal(scenario.skipCount, 1);
  assert.match(scenario.actual, /runs once on desktop/);
  assert.match(results.playwright.skippedTests[0].reason, /runs once on desktop/);
  assert.match(scenario.evidence, /chromium-desktop=pass/);
  assert.match(scenario.evidence, /chromium-mobile=skipped/);
});

test("Playwright totals cover untagged tests and identify source and integration SHAs", async () => {
  const report = {
    suites: [
      {
        title: "public-site.spec.ts",
        file: "tests/e2e/public-site.spec.ts",
        specs: [
          {
            title: "[QA-P04:partial] [QA-P05:partial] canonical metadata",
            tests: [{ projectId: "desktop", results: [{ status: "passed" }] }],
          },
          {
            title: "untagged navigation test",
            tests: [{ projectId: "desktop", results: [{ status: "passed" }] }],
          },
        ],
      },
    ],
  };
  const results = await buildPhase10Results(report, {
    sourceSha: "pr-head-sha",
    integrationSha: "github-merge-sha",
  });

  assert.equal(results.playwright.discoveredTestCount, 2);
  assert.equal(results.playwright.mappedTestCount, 1);
  assert.equal(results.playwright.resultCount, 2);
  assert.equal(results.playwright.mappedResultCount, 1);
  assert.equal(results.candidate.sourceSha, "pr-head-sha");
  assert.equal(results.candidate.integrationSha, "github-merge-sha");
  assert.match(renderCaseResultsCsv(results), /QA-P04/);
  assert.match(renderPhase10Markdown(results), /2 discovered; 1 mapped to Phase 10 cases/);
});

test("a failed mapped test fails its scenario and unmapped scenarios remain not run or blocked", async () => {
  const report = {
    suites: [
      {
        title: "recipes.spec.ts",
        file: "tests/e2e/recipes.spec.ts",
        specs: [
          {
            title: "[QA-J04:partial] no matches state",
            tests: [
              {
                results: [
                  { status: "failed", retry: 0, errors: [{ message: "assertion failed" }] },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const results = await buildPhase10Results(report, {
    generatedAt: "2026-09-24T00:00:00.000Z",
    sourceSha: "abc123",
  });
  assert.equal(
    results.cases.find(({ id }) => id === "QA-J04").disposition,
    "fail",
  );
  assert.ok(results.cases.some(({ disposition }) => disposition === "not_run"));
  assert.ok(results.cases.some(({ disposition }) => disposition === "blocked"));
});

test("CSV output escapes scenario text and includes all records", async () => {
  const results = await buildPhase10Results(fakeReport, {
    generatedAt: "2026-09-24T00:00:00.000Z",
    sourceSha: "abc123",
  });
  const csv = renderCaseResultsCsv(results);
  assert.ok(csv.startsWith("scenario_id,family,description,expected,disposition,"));
  assert.equal((csv.match(/\n/g) ?? []).length, 87);
  assert.match(csv, /"QA-J03"/);
});

test("approved N/A needs an owner, reason, and evidence reference", async () => {
  const emptyReport = { suites: [] };
  await assert.rejects(
    buildPhase10Results(emptyReport, {
      approvedNotApplicable: { "QA-A02": { owner: "", reason: "off", evidence: "" } },
    }),
    /owner, reason, and evidence/i,
  );
  await assert.rejects(
    buildPhase10Results(emptyReport, {
      approvedNotApplicable: {
        "QA-J16": { owner: "commerce", reason: "provider unavailable", evidence: "DEC-12" },
      },
    }),
    /not an optional measurement scenario/i,
  );
  const results = await buildPhase10Results(emptyReport, {
    approvedNotApplicable: {
      "QA-A02": {
        owner: "analytics owner",
        reason: "Optional measurement is explicitly disabled for this candidate",
        evidence: "DEC-12",
      },
    },
  });
  const scenario = results.cases.find(({ id }) => id === "QA-A02");
  assert.equal(scenario.disposition, "not_applicable");
  assert.match(scenario.actual, /DEC-12/);
});
