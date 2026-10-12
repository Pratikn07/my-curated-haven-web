/**
 * The only support fields that may reach a server log: an operation UUID, a support reference and an uppercase
 * reason code, each kept only when it has exactly that shape. Everything else is dropped, so an email, note,
 * provider error, URL or token can never be logged by accident; nothing tries to recognise secrets one by one.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SUPPORT_REFERENCE = /^MCH-[0-9A-Z]{1,6}$/;
const CODE = /^[A-Z][A-Z0-9_]{1,63}$/;

export function safeSupportLog(input: unknown): { operationId?: string; supportReference?: string; code?: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {};
  const record = input as Record<string, unknown>;
  const out: { operationId?: string; supportReference?: string; code?: string } = {};
  if (typeof record.operationId === "string" && UUID.test(record.operationId)) out.operationId = record.operationId;
  if (typeof record.supportReference === "string" && SUPPORT_REFERENCE.test(record.supportReference)) {
    out.supportReference = record.supportReference;
  }
  if (typeof record.code === "string" && CODE.test(record.code)) out.code = record.code;
  return out;
}
