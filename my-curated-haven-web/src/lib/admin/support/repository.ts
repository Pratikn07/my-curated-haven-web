import "server-only";
import type { Result } from "../contracts";
import { adminRpc } from "../rpc";
import { createClient } from "../../supabase/server";
import type {
  AccessExplanation, CaseCommand, CustomerSupportDto, LookupQuery, LookupResult, Mode, OrderCasesPage, OrderSupportDto, SupportCase,
  SupportHistoryPage, SupportQueuePage, SupportRead,
} from "./contracts";
import {
  decodeAccessRead, decodeCustomerRead, decodeHistoryPage, decodeLookupRead, decodeOrderCases, decodeOrderRead, decodeQueuePage,
  decodeRedaction,
  decodeSupportCase,
} from "./decode";

/**
 * Support reads through the signed-in staff member's own session. The database checks authority, the support stage
 * and the rate budget on every call; a response that does not match its contract becomes UNAVAILABLE.
 */

export async function lookupSupport(query: LookupQuery): Promise<Result<SupportRead<LookupResult>>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_lookup", { p_query: query }), decodeLookupRead);
}

export async function loadSupportOrder(orderId: string): Promise<Result<SupportRead<OrderSupportDto>>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_order", { p_order_id: orderId }), decodeOrderRead);
}

export async function loadSupportCustomer(userId: string, cursor: string | null):
  Promise<Result<SupportRead<CustomerSupportDto>>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_customer", { p_user_id: userId, p_cursor: cursor as string }),
    decodeCustomerRead);
}

/** Why the order's owner has (or lacks) access to its collection, from the same rules the customer's pages use. */
export async function loadSupportAccess(orderId: string): Promise<Result<SupportRead<AccessExplanation>>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_access", { p_order_id: orderId }), decodeAccessRead);
}

/** Create a case, add or amend a note, or move its state. Repeating the same operation returns the same case. */
export async function commandSupportCase(command: CaseCommand): Promise<Result<SupportCase>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_case", { p_command: command }), decodeSupportCase, true);
}

export async function loadSupportQueue(mode: Mode, cursor: string | null): Promise<Result<SupportQueuePage>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_queue", { p_mode: mode, p_cursor: cursor as string }), decodeQueuePage);
}

export async function loadSupportHistory(orderId: string, cursor: string | null): Promise<Result<SupportHistoryPage>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_history", { p_order_id: orderId, p_cursor: cursor as string }),
    decodeHistoryPage);
}

/** Owner only: clear a note's text, keeping who, when and why. */
export async function redactSupportNote(eventId: string, reason: string, operationId: string):
  Promise<Result<{ eventId: string; redactedAt: string }>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_redact_note", { p_event_id: eventId, p_reason: reason,
    p_operation_id: operationId }), decodeRedaction, true);
}

export async function loadSupportCases(orderId: string, cursor: string | null): Promise<Result<OrderCasesPage>> {
  const supabase = await createClient();
  return adminRpc(() => supabase.rpc("admin_support_cases", { p_order_id: orderId, p_cursor: cursor as string }), decodeOrderCases);
}
