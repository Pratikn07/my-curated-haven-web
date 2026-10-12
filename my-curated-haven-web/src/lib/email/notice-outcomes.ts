import type { NoticeSendResult } from "../admin/support/notices/contracts";

/**
 * How an SES SendEmail error is read. Only a documented refusal that comes back as a client error proves nothing was
 * sent; timeouts, connection errors, server errors and anything unrecognised are unknown, because the message may
 * have been accepted. No runtime imports.
 */
const NOT_EXECUTED = new Set(["MessageRejected", "MailFromDomainNotVerifiedException", "AccountSuspendedException",
  "SendingPausedException", "BadRequestException", "NotFoundException", "LimitExceededException", "TooManyRequestsException"]);

export function noticeErrorResult(error: unknown): NoticeSendResult {
  const e = (error ?? {}) as { name?: unknown; $metadata?: { httpStatusCode?: unknown } };
  const status = typeof e.$metadata?.httpStatusCode === "number" ? e.$metadata.httpStatusCode : null;
  if (typeof e.name === "string" && NOT_EXECUTED.has(e.name) && status !== null && status >= 400 && status < 500) {
    return { kind: "not_executed", code: e.name.replace(/Exception$/, "").replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase() };
  }
  return { kind: "unknown", code: "TRANSPORT_OUTCOME_UNKNOWN" };
}

/** A returned SES message id: accepted for sending, which is not delivery. */
export function noticeAccepted(messageId: unknown): NoticeSendResult {
  return typeof messageId === "string" && messageId.length >= 1 && messageId.length <= 255
    ? { kind: "accepted", providerMessageId: messageId } : { kind: "unknown", code: "TRANSPORT_OUTCOME_UNKNOWN" };
}
