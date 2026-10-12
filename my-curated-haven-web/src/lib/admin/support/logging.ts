/**
 * Support log lines keep an allowlist of fields: the operation, a code, a reference and a state. Customer details,
 * notes, provider objects, URLs and anything else are dropped, so a log never carries an email or a Stripe body.
 */
const ALLOWED = ["operationId", "code", "reference", "state"] as const;
type SafeLog = Partial<Record<(typeof ALLOWED)[number], string>>;

export function safeSupportLog(input: Record<string, unknown>): SafeLog {
  const out: SafeLog = {};
  for (const key of ALLOWED) {
    const value = input[key];
    if (typeof value === "string" && value.length <= 120 && /^[A-Za-z0-9_.:-]+$/.test(value)) out[key] = value;
  }
  return out;
}
