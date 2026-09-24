type CommerceDatabaseEnvironment = Readonly<Record<string, string | undefined>>;

const LOCAL_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function parsePostgresUrl(connectionString: string): URL {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("Commerce database URL must be a valid PostgreSQL URL.");
  }

  if (
    (url.protocol !== "postgres:" && url.protocol !== "postgresql:") ||
    !url.hostname ||
    url.hash
  ) {
    throw new Error("Commerce database URL must identify a PostgreSQL database.");
  }

  return url;
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    LOCAL_HOSTS.has(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  );
}

/** Resolve the commerce database without ever guessing a deployed database target. */
export function resolveCommerceDatabaseConnectionString(
  environment: CommerceDatabaseEnvironment = process.env,
): string {
  const explicitCommerceUrl = environment.COMMERCE_DATABASE_URL?.trim();
  const isDeployed = environment.VERCEL_ENV !== undefined;

  if (isDeployed) {
    if (!explicitCommerceUrl) {
      throw new Error(
        "COMMERCE_DATABASE_URL is required in deployed environments.",
      );
    }

    const deployedUrl = parsePostgresUrl(explicitCommerceUrl);
    if (isLoopbackHost(deployedUrl.hostname)) {
      throw new Error(
        "COMMERCE_DATABASE_URL must not point to a local database in deployed environments.",
      );
    }

    return explicitCommerceUrl;
  }

  const connectionString =
    explicitCommerceUrl || environment.DATABASE_URL?.trim() || LOCAL_DATABASE_URL;
  parsePostgresUrl(connectionString);
  return connectionString;
}
