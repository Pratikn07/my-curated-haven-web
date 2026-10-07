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
  retryOnLock = false
): Promise<Result<T>> {
  let attempts = 0;
  for (;;) {
    attempts += 1;
    let response: { data: unknown; error: { code?: string; message?: string } | null };
    try {
      response = await call();
    } catch {
      return { ok: false, code: "UNAVAILABLE", reference: reference() };
    }
    if (response.error) {
      const code = classifyAdminError(response.error);
      if (
        retryOnLock &&
        attempts < 3 &&
        (response.error.code === "55P03" || response.error.code === "40P01")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
        continue;
      }
      return { ok: false, code, reference: reference() };
    }
    try {
      const value = decode(response.data);
      return { ok: true, value };
    } catch {
      return { ok: false, code: "UNAVAILABLE", reference: reference() };
    }
  }
}
