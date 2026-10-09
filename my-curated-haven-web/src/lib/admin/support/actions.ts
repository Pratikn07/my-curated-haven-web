"use server";

import type { Result } from "../contracts";
import type { CaseCommand, LookupResult, SupportCase, SupportHistoryPage, SupportRead } from "./contracts";
import { InvalidLookup, parseLookup } from "./query";
import { commandSupportCase, loadSupportHistory, lookupSupport } from "./repository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CURSOR = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z\|[0-9a-f-]{36}$/;

function invalid(reference: string) {
  return { ok: false as const, code: "INVALID" as const, reference };
}

/** Exact lookup. The query travels in this action's body only; it never reaches a URL. */
export async function lookupSupportAction(input: unknown): Promise<Result<SupportRead<LookupResult>>> {
  let query;
  try {
    query = parseLookup(input);
  } catch (error) {
    if (error instanceof InvalidLookup) return invalid("support-lookup");
    throw error;
  }
  return lookupSupport(query);
}

const CASE_KEYS = ["operationId", "caseId", "orderId", "userId", "expectedVersion", "action", "category", "note",
  "amendsEventId", "state", "resolutionReference"];

/** Case commands. The database checks every field again; this only refuses obviously malformed input early. */
export async function supportCaseAction(input: CaseCommand): Promise<Result<SupportCase>> {
  if (typeof input !== "object" || input === null || Object.keys(input).length !== CASE_KEYS.length
    || !CASE_KEYS.every((key) => key in input) || !UUID.test(input.operationId)
    || (input.caseId !== null && !UUID.test(input.caseId)) || (input.orderId !== null && !UUID.test(input.orderId))
    || (input.userId !== null && !UUID.test(input.userId)) || (input.amendsEventId !== null && !UUID.test(input.amendsEventId))
    || (input.note !== null && (typeof input.note !== "string" || input.note.length > 2000))
    || (input.resolutionReference !== null && (typeof input.resolutionReference !== "string" || input.resolutionReference.length > 1000))) {
    return invalid("support-case");
  }
  return commandSupportCase(input);
}

export async function supportHistoryAction(orderId: string, cursor: string): Promise<Result<SupportHistoryPage>> {
  if (!UUID.test(orderId) || !CURSOR.test(cursor)) return invalid("support-history");
  return loadSupportHistory(orderId, cursor);
}
