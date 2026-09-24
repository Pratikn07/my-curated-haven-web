import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..");
const SCENARIO_SOURCES = [
  ["J", "docs/implementation/phase-10/CUSTOMER-JOURNEY-MATRIX.md"],
  ["S", "docs/implementation/phase-10/SECURITY-PRIVACY-AND-PAYMENTS.md"],
  ["A", "docs/implementation/phase-10/SECURITY-PRIVACY-AND-PAYMENTS.md"],
  ["M", "docs/implementation/phase-10/MOBILE-ACCESSIBILITY-AND-PRINT.md"],
  ["P", "docs/implementation/phase-10/PERFORMANCE-SEO-AND-CONTENT.md"],
  ["O", "docs/implementation/phase-10/ROLLBACK-AND-OPERATIONS-REHEARSAL.md"],
];

const EXTERNAL_BLOCKERS = new Map([
  ["QA-J01", "Needs a named staging candidate, approved campaign link, and consent/network evidence."],
  ["QA-J02", "Needs the approved free-recipe manifest and its isolated candidate database; production recipe bodies are excluded from CI fixtures."],
  ["QA-J07", "Needs approved content and reviewed print-to-PDF evidence on the named release candidate."],
  ["QA-J13", "Needs an approved native-client account-continuity run on the supported mobile client versions."],
  ["QA-J15", "Needs approved commercial terms, collection membership, and a named staged candidate."],
  ["QA-J16", "Needs isolated Stripe test-mode credentials and provider-backed staging evidence."],
  ["QA-J17", "Needs isolated Stripe Checkout cancellation and retry evidence."],
  ["QA-J18", "Needs approved test-mode payment methods and provider decline/challenge evidence."],
  ["QA-J19", "Needs provider-backed concurrent-attempt and ambiguous-timeout evidence."],
  ["QA-J20", "Needs signed test-mode webhook delivery and second-device staging evidence."],
  ["QA-J21", "Needs a named staged candidate and provider-confirmed pending/return-state evidence."],
  ["QA-J22", "Needs an isolated candidate with separate synthetic accounts and private order references."],
  ["QA-J23", "Needs a staged approved manifest and real second-device print/access evidence."],
  ["QA-J24", "Needs approved offer/checkout policy and a staged owner-account run."],
  ["QA-S06", "Refund access behaviour awaits an approved refund policy and provider-backed staging evidence."],
  ["QA-S07", "Partial/repeated refund behaviour awaits an approved refund policy and provider-backed staging evidence."],
  ["QA-S08", "Dispute suspension/restoration behaviour awaits an approved dispute policy and provider-backed staging evidence."],
  ["QA-S21", "Needs an approved operational log/privacy review on the named candidate."],
  ["QA-S22", "Needs an approved retention/deletion policy and synthetic staging deletion rehearsal."],
  ["QA-S23", "Needs an approved cross-project credential and operator-role audit."],
  ["QA-M04", "Requires VoiceOver and TalkBack checks on supported physical devices."],
  ["QA-M06", "Requires supported-device keyboard, autofill, rotation, and background/resume checks."],
  ["QA-M07", "Requires real Instagram in-app browsers and a Stripe test-mode staged handoff."],
  ["QA-M09", "Requires reviewed A4 and US Letter PDF output for the approved recipe manifest."],
  ["QA-M11", "Requires physical mobile print/share checks and reviewed print evidence."],
  ["QA-P01", "Needs accepted performance budgets, a named staging candidate, and recorded hardware/network/cache conditions."],
  ["QA-P03", "Requires bounded load and slow-network checks against isolated staging."],
  ["QA-P08", "Requires editorial approval of every free and paid manifest member."],
  ["QA-P09", "Requires approved commercial, refund, receipt, terms, and support wording."],
  ["QA-P10", "Requires an approved withdrawal/update policy and staged cache invalidation evidence."],
  ["QA-A07", "Requires an approved, separate Instagram export source and data-separation review."],
  ["QA-O01", "Requires a named operations owner and isolated checkout/webhook rehearsal."],
  ["QA-O02", "Requires an isolated staging worker/backlog recovery rehearsal and named alert recipient."],
  ["QA-O03", "Requires isolated provider/database outage and recovery evidence."],
  ["QA-O04", "Requires isolated Stripe outage and ambiguous-attempt recovery evidence."],
  ["QA-O05", "Requires an approved rollback owner and staged forward-schema rollback rehearsal."],
  ["QA-O06", "Requires a staging backup restore into a new isolated target and provider reconciliation."],
  ["QA-O07", "Requires named support coverage and an approved support/refund policy rehearsal."],
  ["QA-O08", "Requires named alert recipients, backups, and successful containment evidence."],
]);

const PARTIAL = new Set([
  "QA-J01",
  "QA-J03",
  "QA-J04",
  "QA-J08",
  "QA-J09",
  "QA-J10",
  "QA-J12",
  "QA-J19",
  "QA-J20",
  "QA-J22",
  "QA-S05",
  "QA-S13",
  "QA-S19",
  "QA-M01",
  "QA-M08",
  "QA-M09",
  "QA-P04",
  "QA-P05",
  "QA-P06",
  "QA-A01",
]);
const OPTIONAL_MEASUREMENT_NA = new Set([
  "QA-A02",
  "QA-A03",
  "QA-A05",
  "QA-A07",
]);

function parseTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return [];
  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim().replaceAll("\\|", "|"));
}

export async function discoverPhase10Scenarios() {
  const scenarios = [];
  for (const [family, relativePath] of SCENARIO_SOURCES) {
    const source = await readFile(path.join(REPO_ROOT, relativePath), "utf8");
    for (const line of source.split(/\r?\n/)) {
      const cells = parseTableRow(line);
      const id = cells[0];
      const match = /^QA-([JSMPAO])(\d{2})$/.exec(id ?? "");
      if (!match || match[1] !== family || cells.length < 3) continue;
      scenarios.push({
        id,
        family,
        description: cells[1],
        expected: cells[2],
        source: relativePath,
        coverage: PARTIAL.has(id) ? "partial" : "unmapped",
        blocker: EXTERNAL_BLOCKERS.get(id) ?? "",
      });
    }
  }

  const ids = new Set(scenarios.map(({ id }) => id));
  const expectedCounts = { J: 24, S: 24, M: 12, P: 10, A: 8, O: 8 };
  const actualCounts = Object.fromEntries(
    Object.keys(expectedCounts).map((family) => [
      family,
      scenarios.filter((scenario) => scenario.family === family).length,
    ]),
  );
  if (ids.size !== 86 || scenarios.length !== 86) {
    throw new Error(`Phase 10 matrix inventory drift: found ${scenarios.length} rows and ${ids.size} unique IDs`);
  }
  for (const [family, expected] of Object.entries(expectedCounts)) {
    if (actualCounts[family] !== expected) {
      throw new Error(`Phase 10 ${family} inventory drift: expected ${expected}, found ${actualCounts[family]}`);
    }
  }
  return scenarios;
}

function gatherSpecs(suites, parentFile = "") {
  const specs = [];
  for (const suite of suites ?? []) {
    const file = suite.file || parentFile;
    for (const spec of suite.specs ?? []) {
      specs.push({
        title: spec.title ?? "",
        file,
        tests: (spec.tests ?? []).map((test) => ({ ...test, title: spec.title ?? "", file })),
      });
    }
    specs.push(...gatherSpecs(suite.suites, file));
  }
  return specs;
}

function getScenarioTags(title) {
  return [...title.matchAll(/\[(QA-[A-Z]\d{2}):(partial|full)\]/g)].map(
    ([, id, coverage]) => ({ id, coverage }),
  );
}

function resultDisposition(statuses) {
  if (statuses.includes("failed") || statuses.includes("timedOut") || statuses.includes("interrupted")) {
    return statuses.includes("passed") ? "flaky" : "fail";
  }
  if (statuses.includes("passed")) return "pass";
  if (statuses.length > 0 && statuses.every((status) => status === "skipped")) return "skipped";
  return "not_run";
}

function sanitizeReason(value) {
  const text = String(value ?? "").replace(/[\r\n\t\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (/https?:\/\/|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:sk|pk|whsec|sb_secret)_[A-Za-z0-9_-]{8,}/i.test(text)) {
    return "[redacted non-public skip detail]";
  }
  return text.slice(0, 200);
}

function testOutcome(test, projectName = "") {
  const results = Array.isArray(test.results) ? test.results : [];
  const statuses = results.map((result) => result.status).filter(Boolean);
  const skips = [];
  for (const annotation of [...(test.annotations ?? []), ...results.flatMap((result) => result.annotations ?? [])]) {
    if (annotation.type !== "skip") continue;
    const reason = sanitizeReason(annotation.description);
    if (reason && !skips.includes(reason)) skips.push(reason);
  }
  return {
    status: resultDisposition(statuses),
    statuses,
    skipReasons: skips,
    file: test.file,
    projectName,
  };
}

function scenarioIdFromReportTitle(title) {
  return getScenarioTags(title);
}

function summarizeScenario(scenario, outcomes) {
  const statusCounts = { passCount: 0, failCount: 0, skipCount: 0, flakyCount: 0, notRunCount: 0 };
  for (const outcome of outcomes) {
    if (outcome.status === "pass") statusCounts.passCount += 1;
    else if (outcome.status === "fail") statusCounts.failCount += 1;
    else if (outcome.status === "skipped") statusCounts.skipCount += 1;
    else if (outcome.status === "flaky") statusCounts.flakyCount += 1;
    else statusCounts.notRunCount += 1;
  }

  const skipReasons = [...new Set(outcomes.flatMap((outcome) => outcome.skipReasons))];
  const approvedNotApplicable = scenario.approvedNotApplicable;
  const failed = statusCounts.failCount > 0 || statusCounts.flakyCount > 0;
  const allSkipped = outcomes.length > 0 && statusCounts.skipCount === outcomes.length;
  const allPassed = outcomes.length > 0 && statusCounts.passCount === outcomes.length;
  let disposition;
  if (approvedNotApplicable) disposition = "not_applicable";
  else if (failed) disposition = "fail";
  else if (scenario.blocker) disposition = "blocked";
  else if (allSkipped) disposition = "blocked";
  else if (allPassed) disposition = scenario.coverage === "partial" ? "partial" : "pass";
  else if (outcomes.length > 0 && statusCounts.passCount > 0) disposition = "partial";
  else disposition = "not_run";

  const actualParts = [];
  if (outcomes.length === 0) actualParts.push("No mapped automated test result was recorded.");
  else actualParts.push(`Mapped test outcomes: ${statusCounts.passCount} passed, ${statusCounts.failCount} failed, ${statusCounts.skipCount} skipped, ${statusCounts.flakyCount} flaky, ${statusCounts.notRunCount} not run.`);
  if (scenario.coverage === "partial" && outcomes.length > 0) {
    actualParts.push("This test mapping covers only part of the acceptance scenario.");
  }
  if (skipReasons.length) actualParts.push(`Skip reasons: ${skipReasons.join("; ")}.`);
  if (scenario.blocker) actualParts.push(`Blocking evidence: ${scenario.blocker}`);
  if (approvedNotApplicable) {
    actualParts.push(
      `Owner-approved N/A: ${approvedNotApplicable.reason} (owner: ${approvedNotApplicable.owner}; evidence: ${approvedNotApplicable.evidence}).`,
    );
  }

  return {
    id: scenario.id,
    family: scenario.family,
    description: scenario.description,
    expected: scenario.expected,
    disposition,
    coverage: scenario.coverage,
    actual: actualParts.join(" "),
    evidence: [
      ...new Set(
        outcomes
          .filter((outcome) => outcome.file)
          .map(
            (outcome) =>
              `${outcome.file} [${outcome.projectName || "project"}=${outcome.status}]`,
          ),
      ),
      ...(approvedNotApplicable ? [approvedNotApplicable.evidence] : []),
    ].join("; "),
    blocker: scenario.blocker,
    ...statusCounts,
  };
}

export async function buildPhase10Results(report, metadata = {}) {
  const scenarios = await discoverPhase10Scenarios();
  const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const approvedNotApplicable = metadata.approvedNotApplicable ?? {};
  for (const [id, decision] of Object.entries(approvedNotApplicable)) {
    const scenario = scenarioById.get(id);
    if (!scenario) throw new Error(`Approved N/A references unknown scenario ${id}`);
    if (!OPTIONAL_MEASUREMENT_NA.has(id)) {
      throw new Error(`${id} is not an optional measurement scenario and cannot be marked N/A`);
    }
    if (
      !decision ||
      [decision.owner, decision.reason, decision.evidence].some(
        (value) => typeof value !== "string" || value.trim().length === 0,
      )
    ) {
      throw new Error(`Approved N/A for ${id} requires owner, reason, and evidence`);
    }
    if ([decision.owner, decision.reason, decision.evidence].some((value) => value.length > 200)) {
      throw new Error(`Approved N/A for ${id} contains an overlong value`);
    }
    scenario.approvedNotApplicable = decision;
  }
  const outcomeByScenario = new Map(scenarios.map(({ id }) => [id, []]));
  let discoveredTestCount = 0;
  let resultCount = 0;
  const skippedTests = [];
  const suiteSpecs = gatherSpecs(report?.suites);
  const projectNames = new Map(
    (report?.config?.projects ?? []).map((project) => [project.id, project.name]),
  );
  for (const spec of suiteSpecs) {
    const tags = scenarioIdFromReportTitle(spec.title);
    for (const tag of tags) {
      if (!outcomeByScenario.has(tag.id)) {
        throw new Error(`Playwright result references unknown Phase 10 scenario ${tag.id}`);
      }
      for (const test of spec.tests) {
        discoveredTestCount += 1;
        const outcome = testOutcome(test, projectNames.get(test.projectId) ?? "");
        resultCount += outcome.statuses.length;
        outcomeByScenario.get(tag.id).push(outcome);
        const scenario = scenarioById.get(tag.id);
        if (scenario && tag.coverage === "full") scenario.coverage = "full";
      }
    }
    for (const test of spec.tests) {
      const outcome = testOutcome(test, projectNames.get(test.projectId) ?? "");
      if (outcome.status !== "skipped") continue;
      skippedTests.push({
        file: test.file,
        title: sanitizeReason(test.title),
        scenarios: tags.map(({ id }) => id),
        reason: outcome.skipReasons.join("; ") || "Skipped without an explicit annotation reason",
      });
    }
  }

  for (const [id, decision] of Object.entries(approvedNotApplicable)) {
    if (outcomeByScenario.get(id).length > 0) {
      throw new Error(`Approved N/A for ${id} conflicts with mapped automated test evidence`);
    }
    for (const value of [decision.owner, decision.reason, decision.evidence]) {
      if (/https?:\/\/|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:sk|pk|whsec|sb_secret)_[A-Za-z0-9_-]{8,}/i.test(value)) {
        throw new Error(`Approved N/A for ${id} contains a value that must not be published`);
      }
    }
  }

  const cases = scenarios.map((scenario) =>
    summarizeScenario(scenario, outcomeByScenario.get(scenario.id)),
  );
  const dispositions = Object.fromEntries(
    ["pass", "partial", "fail", "blocked", "not_run", "not_applicable"].map((disposition) => [
      disposition,
      cases.filter((item) => item.disposition === disposition).length,
    ]),
  );
  const playwrightStatuses = { pass: 0, fail: 0, skipped: 0, flaky: 0, notRun: 0 };
  for (const spec of suiteSpecs) {
    for (const test of spec.tests) {
      const status = testOutcome(test, projectNames.get(test.projectId) ?? "").status;
      if (status === "pass") playwrightStatuses.pass += 1;
      else if (status === "fail") playwrightStatuses.fail += 1;
      else if (status === "skipped") playwrightStatuses.skipped += 1;
      else if (status === "flaky") playwrightStatuses.flaky += 1;
      else playwrightStatuses.notRun += 1;
    }
  }

  return {
    schemaVersion: 1,
    candidate: {
      sourceSha: metadata.sourceSha || "unrecorded",
      generatedAt: metadata.generatedAt || new Date().toISOString(),
      environment: metadata.environment || "local-or-ci-synthetic",
    },
    playwright: {
      reportProvided: Boolean(report),
      discoveredTestCount,
      resultCount,
      ...playwrightStatuses,
      skippedTests,
    },
    summary: {
      scenarioCount: cases.length,
      dispositions,
    },
    cases,
  };
}

function csv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function renderCaseResultsCsv(results) {
  const header = [
    "scenario_id",
    "family",
    "description",
    "expected",
    "disposition",
    "coverage",
    "actual",
    "evidence_ref",
    "blocker",
    "pass_count",
    "fail_count",
    "skip_count",
    "flaky_count",
    "not_run_count",
  ];
  const lines = [header.join(",")];
  for (const item of results.cases) {
    lines.push(
      [
        item.id,
        item.family,
        item.description,
        item.expected,
        item.disposition,
        item.coverage,
        item.actual,
        item.evidence,
        item.blocker,
        item.passCount,
        item.failCount,
        item.skipCount,
        item.flakyCount,
        item.notRunCount,
      ]
        .map(csv)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function renderPhase10Markdown(results) {
  const counts = results.summary.dispositions;
  const lines = [
    "## Phase 10 launch QA evidence",
    "",
    `- Candidate source: \`${results.candidate.sourceSha}\``,
    `- Playwright tests: ${results.playwright.pass} passed, ${results.playwright.fail} failed, ${results.playwright.skipped} skipped, ${results.playwright.flaky} flaky, ${results.playwright.notRun} not run (${results.playwright.discoveredTestCount} discovered)`,
    `- Scenario dispositions: ${counts.pass} pass, ${counts.partial} partial, ${counts.fail} fail, ${counts.blocked} blocked, ${counts.not_run} not run, ${counts.not_applicable} approved N/A`,
    "",
    "A green local or CI run is not a release approval. Partial coverage and external/manual blockers remain visible in the attached CSV/JSON case register.",
    "",
  ];
  return lines.join("\n");
}

async function readOptionalJson(filePath) {
  if (!filePath) return undefined;
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

function readArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return arg?.slice(prefix.length);
}

async function runCli() {
  const reportPath = readArg("report") || process.env.PHASE10_PLAYWRIGHT_REPORT;
  const approvedNaPath = readArg("approved-na") || process.env.PHASE10_APPROVED_NA_FILE;
  const outputDirectory = path.resolve(
    readArg("output-dir") || process.env.PHASE10_RESULTS_DIR || "phase10-results",
  );
  const report = await readOptionalJson(reportPath);
  const approvedNotApplicable = await readOptionalJson(approvedNaPath);
  const results = await buildPhase10Results(report, {
    sourceSha: readArg("source-sha") || process.env.PHASE10_SOURCE_SHA || process.env.GITHUB_SHA,
    environment: "local-or-ci-synthetic",
    approvedNotApplicable,
  });

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "phase10-results.json"), `${JSON.stringify(results, null, 2)}\n`);
  await writeFile(path.join(outputDirectory, "CASE-RESULTS.csv"), renderCaseResultsCsv(results));

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const prior = await readFile(summaryPath, "utf8").catch(() => "");
    await writeFile(summaryPath, `${prior}${renderPhase10Markdown(results)}`);
  }

  const counts = results.summary.dispositions;
  process.stdout.write(
    `Phase 10 results written: ${results.summary.scenarioCount} scenarios; ${counts.pass} pass, ${counts.partial} partial, ${counts.fail} fail, ${counts.blocked} blocked, ${counts.not_run} not run, ${counts.not_applicable} approved N/A.\n`,
  );
  process.stdout.write(`Phase 10 scenario register valid: ${results.summary.scenarioCount} unique IDs.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runCli();
}
