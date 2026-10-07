import type { AdminCode, Result } from "./contracts";

const KNOWN_CODES: Record<string, AdminCode> = {
  ADM_AUTH_REQUIRED: "AUTH_REQUIRED",
  ADM_MFA_REQUIRED: "MFA_REQUIRED",
  ADM_DENIED: "DENIED",
  ADM_DISABLED: "DISABLED",
  ADM_INVALID: "INVALID",
  ADM_NOT_FOUND: "NOT_FOUND",
  ADM_CONFLICT: "CONFLICT",
  ADM_UNAVAILABLE: "UNAVAILABLE",
  ADM_BLOCKED: "BLOCKED",
};

function reference(): string {
  return `admin-rpc-${Math.random().toString(36).slice(2, 10)}`;
}

export function classifyAdminError(error: { code?: string; message?: string } | null): AdminCode {
  if (!error) return "UNAVAILABLE";
  const message = error.message ?? "";
  const match = message.match(/ADM_[A-Z_]+/);
  if (match && KNOWN_CODES[match[0]]) return KNOWN_CODES[match[0]];
  if (error.code === "42501") return "DENIED";
  if (error.code === "PGRST301" || error.code === "401") return "AUTH_REQUIRED";
  if (error.code === "55P03") return "UNAVAILABLE";
  return "UNAVAILABLE";
}

export async function adminRpc<T>(
  call: () => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>,
  decode: (data: unknown) => T,
): Promise<Result<T>> {
  let response: { data: unknown; error: { code?: string; message?: string } | null };
  try {
    response = await call();
  } catch {
    return { ok: false, code: "UNAVAILABLE", reference: reference() };
  }
  if (response.error) {
    return { ok: false, code: classifyAdminError(response.error), reference: reference() };
  }
  try {
    const value = decode(response.data);
    return { ok: true, value };
  } catch {
    return { ok: false, code: "UNAVAILABLE", reference: reference() };
  }
}
