import "server-only";
import type { Result } from "../contracts";
import { adminRpc } from "../rpc";
import { createClient } from "../../supabase/server";
import type {
  AccessExplanation, CustomerSupportDto, LookupQuery, LookupResult, OrderSupportDto, SupportRead,
} from "./contracts";
import { decodeAccessRead, decodeCustomerRead, decodeLookupRead, decodeOrderRead } from "./decode";

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
