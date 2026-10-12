import type { Approval } from "../contracts";

/**
 * Owner-approved dispute notices (Phase 3, Task 27). One neutral email per formal dispute, prepared from fresh evidence,
 * approved exactly as shown and sent at most once. Nothing here is sent from a webhook.
 */

export type NoticeAccess = "active" | "denied" | "unavailable";
export type DisputeNoticeDraft = {
  id: string;
  noticeId: string;
  orderId: string;
  disputeId: string;
  ownerPrincipal: string;
  recipient: string;
  recipientReference: string;
  recipientVersion: string;
  subject: string;
  text: string;
  templateVersion: string;
  disputeVersion: string;
  disputeStatus: string;
  /** Stripe's evidence deadline, when it gave one. */
  respondBy: string | null;
  effectiveAccess: NoticeAccess;
  dependencyToken: string;
  digest: string;
  expiresAt: string;
  blockers: string[];
  /** Retention removed the recipient and text; the digest still proves what they were. */
  redacted: boolean;
};
export type NoticeApproval = Omit<Approval, "channel"> & { channel: "web" };
export type NoticeCommand = { operationId: string; draftId: string; expectedDigest: string };
export type NoticeState = "not_sent" | "dispatching" | "accepted" | "failed_before_acceptance" | "outcome_unknown";
export type NoticeDelivery = "unconfirmed" | "delivered" | "bounced" | "complained";
export type NoticeReceipt = {
  operationId: string;
  draftId: string;
  state: NoticeState;
  providerMessageId: string | null;
  delivery: NoticeDelivery;
  auditId: string;
  reasonCode: string | null;
  checkedAt: string;
};
export type NoticeClaim = { operationId: string; fence: number; expiresAt: string };
/** Server-private: what the transport sends, read by the verifier login under the live claim. */
export type NoticePayload = { operationId: string; mode: "test" | "live"; recipient: string; subject: string; text: string };
export type NoticeSendResult = { kind: "accepted"; providerMessageId: string } | { kind: "not_executed"; code: string }
  | { kind: "unknown"; code: string };
export type NoticeListState = "awaiting_approval" | "approved" | "blocked" | "expired" | "started";
export type NoticeListItem = { draft: DisputeNoticeDraft; state: NoticeListState; approval: NoticeApproval | null;
  receipt: NoticeReceipt | null; preparedAt: string };
export type NoticeList = { sendingEnabled: boolean; items: NoticeListItem[] };
