"use server";

import { createClient } from "@/lib/supabase/server";

export async function lookupStaff(email: string) {
  const supabase = await createClient();
  const normalized = email.trim().slice(0, 320);
  const { data, error } = await supabase.rpc("admin_staff_lookup", { p_email: normalized });
  if (error) return { ok: false as const, code: "UNAVAILABLE" as const, reference: "staff-lookup" };
  const status = (data as { status?: string })?.status;
  if (status === "found") {
    return { ok: true as const, value: data as { status: "found"; match: { userId: string; email: string } } };
  }
  return {
    ok: true as const,
    value: data as { status: "not_found" | "unconfirmed" | "ambiguous" },
  };
}

export async function assignStaff(input: { userId: string; roles: string[]; reason: string; operationId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_staff_assign", {
    p_user_id: input.userId,
    p_roles: input.roles,
    p_reason: input.reason,
    p_operation_id: input.operationId,
  });
  if (error) return { ok: false as const, code: "UNAVAILABLE" as const, reference: "staff-assign" };
  return { ok: true as const, value: data };
}

export async function revokeStaff(input: { userId: string; reason: string; operationId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_staff_revoke", {
    p_user_id: input.userId,
    p_reason: input.reason,
    p_operation_id: input.operationId,
  });
  if (error) return { ok: false as const, code: "UNAVAILABLE" as const, reference: "staff-revoke" };
  return { ok: true as const, value: data };
}
