#!/usr/bin/env node
// Read-only production smoke check (audit M1-06, M2-02).
// Sends GET requests only. It never signs in, sends email, or touches checkout.
// Usage: node scripts/production-smoke.mjs [--origin=https://mycuratedhaven.com]

const DEFAULT_ORIGIN = "https://mycuratedhaven.com";
const WWW_ORIGIN = "https://www.mycuratedhaven.com";
const MIN_RECIPE_URLS = 3;
const ATTEMPTS = 3;
const RETRY_DELAY_MS = 10_000;
const TIMEOUT_MS = 20_000;
const UNAVAILABLE_TEXT = ["Temporarily Unavailable", "temporarily unavailable"];

const originArg = process.argv.find((arg) => arg.startsWith("--origin="));
const origin = (originArg ? originArg.slice("--origin=".length) : DEFAULT_ORIGIN).replace(/\/+$/, "");
// Loopback http is allowed so the check can be exercised against a local production build.
if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin) && !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
  console.error(`Refusing origin ${JSON.stringify(origin)}: use https://host or http://127.0.0.1:port, with no path.`);
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOnce(url, redirect) {
  const response = await fetch(url, {
    redirect,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "mch-production-smoke/1" },
  });
  const body = redirect === "manual" ? "" : await response.text();
  return { status: response.status, location: response.headers.get("location") ?? "", body };
}

/** Retry a check so a deploy that is still aliasing does not fail the run. */
async function check(name, url, assert, { redirect = "follow" } = {}) {
  let lastError = "";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const result = await fetchOnce(url, redirect);
      const problem = assert(result);
      if (!problem) {
        console.log(`ok    ${name} (${result.status})`);
        return result;
      }
      lastError = problem;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS);
  }
  console.log(`FAIL  ${name}: ${lastError}`);
  failures.push(`${name}: ${lastError}`);
  return null;
}

function page(expectedStatus = 200) {
  return ({ status, body }) => {
    if (status !== expectedStatus) return `expected HTTP ${expectedStatus}, got ${status}`;
    if (UNAVAILABLE_TEXT.some((text) => body.includes(text))) return "page shows the unavailable state";
    return "";
  };
}

/** A free recipe page must show its content, not just return 200 (Phase 6 audit R6-04). */
function recipePage() {
  const base = page();
  return (result) => {
    const problem = base(result);
    if (problem) return problem;
    const html = result.body.replace(/<script[\s\S]*?<\/script>/g, "");
    const section = (id) => html.match(new RegExp(`<section[^>]*aria-labelledby="${id}"[\\s\\S]*?</section>`))?.[0] ?? "";
    const items = (id) => (section(id).match(/<li\b/g) ?? []).length;
    if (items("ingredients-heading") < 1) return "no ingredients listed";
    if (items("instructions-heading") < 1) return "no method steps listed";
    if (!section("allergens-heading")) return "allergen section missing";
    return "";
  };
}

const failures = [];

console.log(`Production smoke check against ${origin}`);

for (const path of ["/", "/recipes", "/about", "/support", "/privacy", "/terms", "/sign-in"]) {
  await check(`GET ${path}`, `${origin}${path}`, page());
}

await check("deferred /features is unavailable", `${origin}/features`, ({ status }) =>
  status === 404 ? "" : `expected HTTP 404, got ${status}`,
);

const sitemap = await check("GET /sitemap.xml", `${origin}/sitemap.xml`, ({ status, body }) => {
  if (status !== 200) return `expected HTTP 200, got ${status}`;
  const count = (body.match(/<loc>[^<]*\/recipes\/[^<]+<\/loc>/g) ?? []).length;
  return count >= MIN_RECIPE_URLS ? "" : `expected at least ${MIN_RECIPE_URLS} recipe URLs, found ${count}`;
});

if (sitemap) {
  const recipeUrls = [...sitemap.body.matchAll(/<loc>([^<]*\/recipes\/[^<]+)<\/loc>/g)].map((match) => match[1]);
  for (const url of recipeUrls) {
    const path = new URL(url).pathname;
    await check(`GET ${path} (ingredients, steps, allergens)`, `${origin}${path}`, recipePage());
  }
}

if (origin === DEFAULT_ORIGIN) {
  await check(
    "www redirects to the apex domain",
    `${WWW_ORIGIN}/recipes?smoke=1`,
    ({ status, location }) => {
      if (status !== 301 && status !== 308) return `expected a permanent redirect, got ${status}`;
      return location === `${DEFAULT_ORIGIN}/recipes?smoke=1` ? "" : `redirected to ${location}`;
    },
    { redirect: "manual" },
  );
}

if (failures.length > 0) {
  console.log(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}
console.log("\nAll production smoke checks passed.");
