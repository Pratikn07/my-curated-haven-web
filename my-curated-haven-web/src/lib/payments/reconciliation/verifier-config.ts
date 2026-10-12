import type { Binding } from "./contracts";

/**
 * Where the provider verifier connects, and when the local-ledger fixture may stand in for Stripe. No runtime imports,
 * so Node tests load it directly. A deployed site (VERCEL_ENV set) never uses a loopback verifier and never uses the
 * fixture; locally the fixture also needs SUPPORT_PROVIDER_FIXTURE=local-ledger and a test-mode order.
 */

type Env = Readonly<Record<string, string | undefined>>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function loopback(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return LOCAL_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local");
}

/** The verifier's database URL, or null when it is missing, malformed or not allowed here. */
export function verifierConnectionString(env: Env = process.env): string | null {
  const raw = env.SUPPORT_VERIFIER_DATABASE_URL?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if ((url.protocol !== "postgres:" && url.protocol !== "postgresql:") || !url.hostname || url.hash) return null;
  if (env.VERCEL_ENV !== undefined && loopback(url.hostname)) return null;
  return raw;
}

export function localLedgerReaderAllowed(binding: Pick<Binding, "mode">, env: Env = process.env): boolean {
  return env.SUPPORT_PROVIDER_FIXTURE === "local-ledger" && env.VERCEL_ENV === undefined && binding.mode === "test";
}
