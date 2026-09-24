const DEFAULT_APP_URL = "http://127.0.0.1:3000";
const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const NONPRODUCTION_ENVIRONMENTS = new Set(["preview", "sandbox", "staging"]);
const PRODUCTION_ENVIRONMENTS = new Set(["live", "prod", "production"]);
const KNOWN_PRODUCTION_ORIGINS = new Set([
  "https://mycuratedhaven.com",
  "https://ccrgvammglkvdlaojgzv.supabase.co",
]);
const KNOWN_PRODUCTION_DATABASE_PROJECT = "ccrgvammglkvdlaojgzv";

function parseTarget(raw, label) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} must be a valid absolute URL`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${label} must use http or https`);
  }
  if (url.username || url.password) {
    throw new Error(`${label} must not include credentials`);
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${label} must identify an origin only`);
  }

  const local = url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
  return { origin: url.origin, hostname: url.hostname, local };
}

function parseOriginAllowlist(raw, label) {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const target = parseTarget(entry, `${label} entry`);
        return target.origin;
      }),
  );
}

function formatDatabaseTarget(hostname, port, databaseName) {
  const host = hostname.toLowerCase();
  const displayHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  return `${displayHost}:${port || "5432"}/${databaseName}`;
}

function parseDatabaseTarget(raw, label) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URL`);
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`${label} must use postgres or postgresql`);
  }
  if (!url.hostname || url.hash) {
    throw new Error(`${label} must identify a PostgreSQL target`);
  }

  let databaseName = "";
  try {
    databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch {
    throw new Error(`${label} must use a valid database name`);
  }
  if (databaseName.includes("/")) {
    throw new Error(`${label} must identify one database name`);
  }
  if (!databaseName) databaseName = url.username;

  const hostname = url.hostname.toLowerCase();
  const local = LOOPBACK_HOSTS.has(hostname);
  if (!local && !databaseName) {
    throw new Error(`${label} must name the remote database`);
  }
  return {
    hostname,
    local,
    target: formatDatabaseTarget(hostname, url.port, databaseName),
  };
}

function parseDatabaseAllowlist(raw) {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        if (entry.includes("@") || entry.includes("?") || entry.includes("#")) {
          throw new Error("PHASE10_ALLOWED_DATABASE_TARGETS entries must omit credentials and URL options");
        }
        return parseDatabaseTarget(`postgresql://${entry}`, "PHASE10_ALLOWED_DATABASE_TARGETS entry").target;
      }),
  );
}

function assertRemoteAllowed(target, label, environment, allowlist) {
  if (target.local) return;

  if (!NONPRODUCTION_ENVIRONMENTS.has(environment)) {
    throw new Error(
      `${label} is remote; set PHASE10_TARGET_ENVIRONMENT to preview, sandbox, or staging and explicitly allowlist the origin`,
    );
  }
  if (!allowlist.has(target.origin)) {
    throw new Error(`${label} target is not explicitly allowlisted`);
  }
}

function assertRemoteDatabaseAllowed(target, environment, allowlist) {
  if (target.local) return;
  if (!NONPRODUCTION_ENVIRONMENTS.has(environment)) {
    throw new Error(
      "A remote database is refused; set PHASE10_TARGET_ENVIRONMENT to preview, sandbox, or staging and explicitly allowlist its target",
    );
  }
  if (!allowlist.has(target.target)) {
    throw new Error("PostgreSQL database target is not explicitly allowlisted");
  }
}

/** Validate both application and database destinations before Playwright loads tests. */
export function validatePhase10Targets(environment = process.env) {
  const targetEnvironment = (environment.PHASE10_TARGET_ENVIRONMENT ?? "")
    .trim()
    .toLowerCase();

  if (PRODUCTION_ENVIRONMENTS.has(targetEnvironment)) {
    throw new Error("Phase 10 tests refuse production targets");
  }
  if (
    targetEnvironment &&
    !NONPRODUCTION_ENVIRONMENTS.has(targetEnvironment) &&
    targetEnvironment !== "local" &&
    targetEnvironment !== "development"
  ) {
    throw new Error("PHASE10_TARGET_ENVIRONMENT has an unsupported value");
  }

  const app = parseTarget(
    environment.PLAYWRIGHT_BASE_URL || DEFAULT_APP_URL,
    "PLAYWRIGHT_BASE_URL",
  );
  const supabase = parseTarget(
    environment.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  const databaseInputs = [
    ["COMMERCE_DATABASE_URL", environment.COMMERCE_DATABASE_URL],
    ["DATABASE_URL", environment.DATABASE_URL],
  ].filter(([, value]) => value);
  const databaseTargets = databaseInputs.map(([label, value]) =>
    parseDatabaseTarget(value, label),
  );

  const knownProductionApp =
    app.hostname === "mycuratedhaven.com" || app.hostname.endsWith(".mycuratedhaven.com");
  if (
    knownProductionApp ||
    KNOWN_PRODUCTION_ORIGINS.has(app.origin) ||
    KNOWN_PRODUCTION_ORIGINS.has(supabase.origin) ||
    databaseTargets.some((target) =>
      target.hostname.includes(KNOWN_PRODUCTION_DATABASE_PROJECT),
    )
  ) {
    throw new Error("Phase 10 tests refuse a known production origin");
  }

  assertRemoteAllowed(
    app,
    "Playwright application",
    targetEnvironment,
    parseOriginAllowlist(
      environment.PHASE10_ALLOWED_PLAYWRIGHT_ORIGINS,
      "PHASE10_ALLOWED_PLAYWRIGHT_ORIGINS",
    ),
  );
  assertRemoteAllowed(
    supabase,
    "Supabase",
    targetEnvironment,
    parseOriginAllowlist(
      environment.PHASE10_ALLOWED_SUPABASE_ORIGINS,
      "PHASE10_ALLOWED_SUPABASE_ORIGINS",
    ),
  );
  const databaseAllowlist = parseDatabaseAllowlist(
    environment.PHASE10_ALLOWED_DATABASE_TARGETS,
  );
  for (const target of databaseTargets) {
    assertRemoteDatabaseAllowed(target, targetEnvironment, databaseAllowlist);
  }

  const remoteTargets = new Set();
  if (!app.local) remoteTargets.add("playwright");
  if (!supabase.local) remoteTargets.add("supabase");
  if (databaseTargets.some((target) => !target.local)) remoteTargets.add("database");

  return {
    appOrigin: app.origin,
    supabaseOrigin: supabase.origin,
    remoteTargets: [...remoteTargets],
  };
}

export function assertSafePhase10Targets(environment = process.env) {
  return validatePhase10Targets(environment);
}
