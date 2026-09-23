const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";

const publicPages = [
  { path: "/", marker: "Simple toddler recipes for busy families" },
  { path: "/about", marker: "Recipes by Tiny Soho, inside My Curated Haven" },
  { path: "/support", marker: "support@mycuratedhaven.com" },
  { path: "/privacy", marker: "Privacy Policy" },
  { path: "/terms", marker: "Terms of Service" },
];

const deferredPaths = ["/features", "/resources", "/careers", "/contact"];

const banned = [
  "Modern Parents",
  "Expert-Vetted",
  "Join Our",
  "Live Chat",
  "apps.apple.com",
  "Milestone tracked",
  "24/7 AI",
  "AI Parenting Assistant",
  "Cancel Subscription",
  "/features",
  "/resources",
  "/careers",
  "/contact",
];

const failures = [];

function fail(message) {
  failures.push(message);
}

async function request(path, init) {
  const response = await fetch(`${base}${path}`, init);
  const text = await response.text();
  return { response, text };
}

function assertNoBanned(label, text) {
  for (const phrase of banned) {
    if (text.includes(phrase)) {
      fail(`${label} contains ${JSON.stringify(phrase)}`);
    }
  }
}

for (const page of publicPages) {
  const { response, text } = await request(page.path);
  if (response.status !== 200) {
    fail(`${page.path} status ${response.status}, expected 200`);
  }
  if (!text.includes(page.marker)) {
    fail(`${page.path} missing marker ${page.marker}`);
  }
  assertNoBanned(page.path, text);
  if (!text.includes('rel="canonical"')) {
    fail(`${page.path} missing canonical link`);
  }
}

for (const path of deferredPaths) {
  const direct = await request(path);
  if (direct.response.status !== 404) {
    fail(`${path} status ${direct.response.status}, expected 404`);
  }
  assertNoBanned(path, direct.text);
  if (!direct.text.includes("This page is not available")) {
    fail(`${path} missing unavailable message`);
  }
  if (!direct.text.includes('href="/"') || !direct.text.includes('href="/support"')) {
    fail(`${path} missing Home or Support link`);
  }
  if (!/noindex/i.test(direct.text)) {
    fail(`${path} missing noindex`);
  }

  const queried = await request(`${path}?preview=1&internal=1`);
  if (queried.response.status !== 404) {
    fail(`${path}?preview=1 status ${queried.response.status}, expected 404`);
  }
  assertNoBanned(`${path}?query`, queried.text);

  const slashed = await fetch(`${base}${path}/`, { redirect: "manual" });
  const slashStatus = slashed.status;
  if (slashStatus === 308 || slashStatus === 307) {
    const followed = await request(`${path}/`);
    if (followed.response.status !== 404) {
      fail(`${path}/ followed to status ${followed.response.status}, expected 404`);
    }
    assertNoBanned(`${path}/`, followed.text);
  } else if (slashStatus !== 404) {
    fail(`${path}/ status ${slashStatus}, expected 404 or redirect`);
  }
}

const sitemap = await request("/sitemap.xml");
if (sitemap.response.status !== 200) {
  fail(`sitemap status ${sitemap.response.status}`);
}
const expectedUrls = [
  "https://mycuratedhaven.com/",
  "https://mycuratedhaven.com/about",
  "https://mycuratedhaven.com/support",
  "https://mycuratedhaven.com/privacy",
  "https://mycuratedhaven.com/terms",
];
for (const url of expectedUrls) {
  if (!sitemap.text.includes(url)) {
    fail(`sitemap missing ${url}`);
  }
}
for (const blocked of ["/features", "/resources", "/careers", "/contact", "/recipes", "/account"]) {
  if (sitemap.text.includes(`mycuratedhaven.com${blocked}`)) {
    fail(`sitemap includes ${blocked}`);
  }
}

const robots = await request("/robots.txt");
if (robots.response.status !== 200) {
  fail(`robots status ${robots.response.status}`);
}
if (!robots.text.includes("Sitemap: https://mycuratedhaven.com/sitemap.xml")) {
  fail("robots missing production sitemap");
}

const home = await request("/");
const scriptSrcs = [...home.text.matchAll(/src="([^"]+\.js)"/g)].map((match) => match[1]);
for (const src of scriptSrcs) {
  const url = src.startsWith("http") ? src : `${base}${src}`;
  const script = await fetch(url);
  const body = await script.text();
  for (const phrase of ["Modern Parents", "Expert-Vetted", "Live Chat", "Join Our Mission"]) {
    if (body.includes(phrase)) {
      fail(`bundle ${src} contains ${phrase}`);
    }
  }
}

const rsc = await fetch(`${base}/features`, {
  headers: { RSC: "1", Accept: "text/x-component" },
});
const rscBody = await rsc.text();
if (rsc.status !== 404) {
  fail(`RSC /features status ${rsc.status}, expected 404`);
}
assertNoBanned("RSC /features", rscBody);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Route checks passed against ${base}`);
