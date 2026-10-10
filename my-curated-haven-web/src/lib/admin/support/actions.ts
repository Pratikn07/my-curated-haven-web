"use server";

import type { Result } from "../contracts";
import type {
  Approval, CaseCommand, LookupResult, OperationStatus, ProviderObservation, RepairCommand, RepairProposal, SupportCase,
  SupportHistoryPage, SupportRead,
} from "./contracts";
import { executeSupportRepair, loadSupportOperation, postcheckSupportRepair } from "./repair";
import { diagnoseSupportOrder } from "./diagnosis";
import { InvalidLookup, parseLookup } from "./query";
import {
  approveSupportRepair, commandSupportCase, loadSupportHistory, lookupSupport, prepareSupportRepair,
} from "./repository";

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

/** Ask Stripe about one order and record what it says. Repeating the same operation joins the same check. */
export async function diagnoseOrderAction(orderId: string, operationId: string): Promise<Result<SupportRead<ProviderObservation>>> {
  if (!UUID.test(orderId) || !UUID.test(operationId)) return invalid("support-diagnosis");
  return diagnoseSupportOrder(orderId, operationId);
}

const DIGEST = /^[0-9a-f]{64}$/;

/** Prepare a repair. Only the order, the evidence, the kind and a reason are sent; the database works out the rest. */
export async function prepareRepairAction(input: { orderId: string; observationId: string; kind: string; reason: string;
  operationId: string }): Promise<Result<RepairProposal>> {
  if (typeof input !== "object" || input === null || Object.keys(input).length !== 5 || !UUID.test(input.orderId)
    || !UUID.test(input.observationId) || !UUID.test(input.operationId)
    || (input.kind !== "reconcile_order" && input.kind !== "rebuild_projection")
    || typeof input.reason !== "string" || input.reason.trim().length === 0 || input.reason.length > 500) {
    return invalid("support-prepare");
  }
  return prepareSupportRepair({ orderId: input.orderId, observationId: input.observationId, kind: input.kind,
    reason: input.reason, operationId: input.operationId });
}

/** Approve one exact proposal. The approver is the signed-in session; no approver is accepted from the request. */
export async function approveRepairAction(proposalId: string, digest: string, operationId: string): Promise<Result<Approval>> {
  if (!UUID.test(proposalId) || !DIGEST.test(digest) || !UUID.test(operationId)) return invalid("support-approve");
  return approveSupportRepair(proposalId, digest, operationId);
}

/** Apply an approved repair. Repeating the same command returns the same operation and, once committed, its receipt. */
export async function executeRepairAction(command: RepairCommand): Promise<Result<OperationStatus>> {
  if (typeof command !== "object" || command === null || Object.keys(command).sort().join(",") !== "caseId,expectedDigest,operationId,proposalId"
    || !UUID.test(command.operationId) || !UUID.test(command.proposalId) || !DIGEST.test(command.expectedDigest)
    || (command.caseId !== null && !UUID.test(command.caseId))) {
    return invalid("support-execute");
  }
  return executeSupportRepair(command);
}

/** The stored status or receipt of an operation; read this after a lost response instead of repairing again. */
export async function operationStatusAction(operationId: string): Promise<Result<OperationStatus>> {
  if (!UUID.test(operationId)) return invalid("support-operation");
  return loadSupportOperation(operationId);
}

/** Confirm a committed repair against the customer's current access; never repairs again. */
export async function postcheckAction(operationId: string): Promise<Result<OperationStatus>> {
  if (!UUID.test(operationId)) return invalid("support-postcheck");
  return postcheckSupportRepair(operationId);
}
