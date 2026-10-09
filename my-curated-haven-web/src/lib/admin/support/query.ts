import type { LookupQuery } from "./contracts";

/**
 * Exact support lookup input. Only these shapes are accepted, so a request can never smuggle an actor, a wildcard
 * or a broader search. Emails and support references are normalised the way the database compares them.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@%*,;"'<>()\\]+@[^\s@%*,;"'<>()\\]+\.[^\s@%*,;"'<>()\\]+$/;
// Phase 2 orders use MCH- plus 6 hex characters; older orders use MCH- plus up to 6 base-36 characters.
const SUPPORT_REFERENCE = /^MCH-[0-9A-Z]{1,6}$/;
const PROVIDER_ID = /^(?:cs_(?:test|live)_|pi_|ch_|py_|re_|dp_|du_)[A-Za-z0-9_]{1,255}$/;
const ACCOUNT = /^acct_[A-Za-z0-9_]{1,64}$/;

export class InvalidLookup extends Error {}

function invalid(): never {
  throw new InvalidLookup("Invalid support lookup");
}

function exactKeys(record: Record<string, unknown>, keys: string[]): void {
  const present = Object.keys(record);
  if (present.length !== keys.length || present.some((key) => !keys.includes(key))) invalid();
}

export function parseLookup(input: unknown): LookupQuery {
  if (typeof input !== "object" || input === null || Array.isArray(input)) invalid();
  const record = input as Record<string, unknown>;
  if (typeof record.value !== "string") invalid();
  const value = record.value.trim();
  switch (record.kind) {
    case "email": {
      exactKeys(record, ["kind", "value"]);
      const email = value.toLowerCase();
      return email.length <= 254 && EMAIL.test(email) ? { kind: "email", value: email } : invalid();
    }
    case "user_id":
      exactKeys(record, ["kind", "value"]);
      return UUID.test(value) ? { kind: "user_id", value } : invalid();
    case "support_reference": {
      exactKeys(record, ["kind", "value"]);
      const reference = value.toUpperCase();
      return SUPPORT_REFERENCE.test(reference) ? { kind: "support_reference", value: reference } : invalid();
    }
    case "provider_id": {
      exactKeys(record, ["kind", "value", "accountId", "mode"]);
      const { accountId, mode } = record;
      if (!PROVIDER_ID.test(value) || typeof accountId !== "string" || !ACCOUNT.test(accountId)
        || (mode !== "test" && mode !== "live")) invalid();
      return { kind: "provider_id", value, accountId, mode };
    }
    default:
      return invalid();
  }
}
