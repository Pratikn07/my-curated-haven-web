import type {
  Binding, DisputeFact, FinancialFacts, ProviderObservation, RefundFact, RepairEffect,
} from "../../payments/reconciliation/contracts";
import type {
  AccessExplanation, Approval, CustomerSupportDto, ExecutionStart, SupportMetrics, ProposalListItem, OrderCase, OrderCasesPage, LookupResult, OperationPending, OperationStatus, OrderSupportDto, RepairProposal, RepairReceipt,
  SupportCase, SupportDisputeDto, SupportHistoryPage, SupportQueuePage, SupportRead, SupportRefundDto, TimelineEvent,
} from "./contracts";
import type { RefundApproval, RefundCapacity, RefundList, RefundListItem, RefundProposal, RefundReceipt } from "./refunds/contracts";
import type {
  DisputeNoticeDraft, NoticeApproval, NoticeClaim, NoticeList, NoticeListItem, NoticeReceipt,
} from "./notices/contracts";

/**
 * Runtime decoding of support RPC responses. Every nested identifier, enum and amount is checked and unknown keys
 * are refused. A mismatch throws, and the caller reports the whole response as UNAVAILABLE instead of rendering a
 * guessed or partial record.
 */

class Invalid extends Error {}
type Decoder<T> = (value: unknown, path: string) => T;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DIGEST = /^[0-9a-f]{64}$/;
const CODE = /^[A-Z][A-Z0-9_]{1,63}$/;
const CURRENCY = /^[a-z]{3}$/;
const ACCOUNT = /^acct_[A-Za-z0-9_]{1,64}$/;
const SESSION = /^cs_(?:test|live)_[A-Za-z0-9_]{1,255}$/;

function bad(path: string): never {
  throw new Invalid(path);
}

function object<T>(fields: { [K in keyof T]: Decoder<T[K]> }): Decoder<T> {
  return (value, path) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) bad(path);
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) if (!(key in fields)) bad(`${path}.${key}`);
    const out = {} as T;
    for (const key of Object.keys(fields) as (keyof T)[]) {
      out[key] = fields[key](record[key as string], `${path}.${String(key)}`);
    }
    return out;
  };
}

const text = (max: number): Decoder<string> => (v, p) =>
  (typeof v === "string" && v.length > 0 && v.length <= max ? v : bad(p));
const pattern = (re: RegExp): Decoder<string> => (v, p) => (typeof v === "string" && re.test(v) ? v : bad(p));
const uuid = pattern(UUID);
const digest = pattern(DIGEST);
const code = pattern(CODE);
const timestamp: Decoder<string> = (v, p) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : bad(p));
const bool: Decoder<boolean> = (v, p) => (typeof v === "boolean" ? v : bad(p));
const count: Decoder<number> = (v, p) => (Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : bad(p));
const minor: Decoder<number> = count;
const nullable = <T>(d: Decoder<T>): Decoder<T | null> => (v, p) => (v === null ? null : d(v, p));
const oneOf = <T extends string>(...values: T[]): Decoder<T> => (v, p) =>
  (typeof v === "string" && (values as string[]).includes(v) ? (v as T) : bad(p));
const array = <T>(d: Decoder<T>, max = 500): Decoder<T[]> => (v, p) =>
  (Array.isArray(v) && v.length <= max ? v.map((item, i) => d(item, `${p}[${i}]`)) : bad(p));

const binding = object<Binding>({
  orderId: uuid,
  userId: nullable(uuid),
  ownerPrincipal: uuid,
  collectionId: uuid,
  releaseId: uuid,
  sessionId: nullable(pattern(SESSION)),
  accountId: pattern(ACCOUNT),
  mode: oneOf("test", "live"),
  expectedCapturedMinor: nullable(minor),
  currency: nullable(pattern(CURRENCY)),
  manifestHash: nullable(digest),
  refundPolicyVersion: nullable(text(100)),
  accessPolicyVersion: nullable(text(100)),
  version: count,
});

const effect = object<RepairEffect>({
  sourceId: uuid,
  beforeEligible: nullable(bool),
  afterEligible: bool,
  beforeEffective: oneOf("active", "denied"),
  afterEffective: oneOf("active", "denied"),
  recipeIds: array(uuid),
  notification: oneOf("none", "purchase_confirmation"),
});

const proposal = object<RepairProposal>({
  id: uuid,
  orderId: uuid,
  userId: uuid,
  ownerPrincipal: uuid,
  binding,
  kind: oneOf("reconcile_order", "rebuild_projection"),
  observationId: uuid,
  materialDigest: digest,
  expectedOrderVersion: count,
  dependencyToken: text(200),
  policyVersion: text(100),
  effects: array(effect, 50),
  // Blockers are the database's lowercase reason codes (for example policy_missing, no_change, dispute_open).
  blockers: array(pattern(/^[a-z][a-z0-9_]{1,63}$/), 50),
  digest,
  expiresAt: timestamp,
  reason: text(1000),
});

const approval = object<Approval>({
  id: uuid,
  proposalId: uuid,
  digest,
  humanAuthoriser: uuid,
  approvedAt: timestamp,
  expiresAt: timestamp,
  channel: oneOf("web", "operator"),
});

const proposalItem = object<ProposalListItem>({
  proposal,
  state: oneOf("awaiting_approval", "approved", "blocked", "expired"),
  approval: nullable(approval),
  operation: (v) => (v === null ? null : decodeOperation(v)),
  preparedAt: timestamp,
});

const receipt = object<RepairReceipt>({
  operationId: uuid,
  orderId: uuid,
  state: oneOf("applied", "already_satisfied"),
  effects: array(effect, 50),
  auditId: uuid,
  committedAt: timestamp,
  proposalId: uuid,
  verification: oneOf("pending", "verified", "unavailable"),
});

const pending = object<OperationPending>({
  operationId: uuid,
  state: oneOf("checking", "blocked", "failed_no_commit", "outcome_unknown"),
  reasonCode: nullable(code),
});

const SUPPORT_REFERENCE = /^MCH-[0-9A-Z]{1,6}$/;
const integer: Decoder<number> = (v, p) => (Number.isSafeInteger(v) ? (v as number) : bad(p));

function read<T>(value: Decoder<T>): Decoder<SupportRead<T>> {
  return object<SupportRead<T>>({ value, checkedAt: timestamp, complete: bool, resolverVersion: nullable(text(100)) });
}

const lookupResult: Decoder<LookupResult> = (v, p) => {
  const status = (v as { status?: unknown } | null)?.status;
  if (status === "found") {
    return object<Extract<LookupResult, { status: "found" }>>({
      status: oneOf("found"),
      target: object({ userId: nullable(uuid), orderId: nullable(uuid), ownerPrincipal: nullable(uuid) }),
    })(v, p);
  }
  return object<Exclude<LookupResult, { status: "found" }>>({ status: oneOf("not_found", "unconfirmed", "ambiguous") })(v, p);
};

const refundDto = object<SupportRefundDto>({
  amountMinor: minor,
  currency: pattern(CURRENCY),
  status: oneOf("pending", "requires_action", "succeeded", "failed", "canceled"),
  occurredAt: timestamp,
  providerRefundId: nullable(text(255)),
});

const disputeDto = object<SupportDisputeDto>({
  amountMinor: minor,
  currency: pattern(CURRENCY),
  status: text(64),
  classification: oneOf("inquiry", "formal", "unknown"),
  deadline: nullable(timestamp),
  providerDisputeId: nullable(text(255)),
});

const accessExplanation = object<AccessExplanation>({
  collectionId: uuid,
  publicationId: nullable(uuid),
  resolverVersion: text(100),
  dependencyToken: digest,
  effective: oneOf("active", "denied", "unavailable"),
  originalRecipeIds: array(uuid),
  additionRecipeIds: array(uuid),
  contentHoldRecipeIds: array(uuid),
  sources: array(object<AccessExplanation["sources"][number]>({
    id: uuid,
    kind: oneOf("stripe_purchase", "native_legacy", "support_grant", "promotional"),
    originReleaseId: uuid,
    eligible: bool,
    reason: nullable(text(200)),
    validFrom: timestamp,
    expiresAt: nullable(timestamp),
    policyVersion: nullable(text(100)),
  }), 100),
});

const timelineEvent = object<TimelineEvent>({
  id: uuid,
  kind: oneOf("provider", "case", "approval", "attempt", "commit", "postcheck"),
  at: timestamp,
  code,
  actorLabel: nullable(text(320)),
  operationId: nullable(uuid),
  note: nullable(text(2000)),
});

const history = object<SupportHistoryPage>({ events: array(timelineEvent, 25), nextCursor: nullable(text(200)) });

const supportCase = object<SupportCase>({
  id: uuid,
  orderId: nullable(uuid),
  userId: nullable(uuid),
  state: oneOf("open", "investigating", "waiting_on_customer", "waiting_on_provider", "resolved"),
  version: (v, p) => (Number.isSafeInteger(v) && (v as number) >= 1 ? (v as number) : bad(p)),
});

const orderCasesPage = object<OrderCasesPage>({
  cases: array(object<OrderCase>({
    id: uuid,
    orderId: nullable(uuid),
    userId: nullable(uuid),
    state: oneOf("open", "investigating", "waiting_on_customer", "waiting_on_provider", "resolved"),
    version: (v, p) => (Number.isSafeInteger(v) && (v as number) >= 1 ? (v as number) : bad(p)),
    category: oneOf("missing_access", "unresolved_payment", "account_mismatch", "refund_followup", "dispute_followup",
      "duplicate_purchase", "content_availability"),
    resolutionReference: nullable(text(1000)),
  }), 25),
  notesEnabled: bool,
  nextCursor: nullable(text(200)),
});

const queuePage = object<SupportQueuePage>({
  items: array(object<SupportQueuePage["items"][number]>({
    orderId: nullable(uuid),
    caseId: nullable(uuid),
    supportReference: nullable(pattern(SUPPORT_REFERENCE)),
    mode: oneOf("test", "live"),
    reasonCode: code,
    observedAt: timestamp,
    deadlineAt: nullable(timestamp),
    accessConsequence: oneOf("blocked", "at_risk", "none", "unknown"),
  }), 25),
  nextCursor: nullable(text(200)),
});

const orderDto = object<OrderSupportDto>({
  orderId: uuid,
  userId: nullable(uuid),
  ownerPrincipal: uuid,
  collectionId: uuid,
  binding: nullable(binding),
  supportReference: pattern(SUPPORT_REFERENCE),
  historicalComplete: bool,
  historical: object<OrderSupportDto["historical"]>({
    releaseId: uuid,
    manifestHash: nullable(digest),
    refundPolicyVersion: nullable(text(100)),
    accessPolicyVersion: nullable(text(100)),
    expectedCapturedMinor: nullable(integer),
    currency: nullable(pattern(CURRENCY)),
  }),
  historicalTitle: nullable(text(200)),
  currentTitle: nullable(text(200)),
  attemptState: oneOf("creating", "creation_unknown", "open", "processing", "review", "closed"),
  accountState: oneOf("active", "unconfirmed", "closed", "disabled", "unavailable"),
  paymentState: oneOf("unpaid", "processing", "paid", "failed", "unknown"),
  capturedMinor: nullable(minor),
  currency: nullable(pattern(CURRENCY)),
  successfulRefundMinor: nullable(minor),
  refunds: array(refundDto, 100),
  disputes: array(disputeDto, 100),
  providerVerifiedAt: nullable(timestamp),
  access: nullable(accessExplanation),
  history,
});

const customerDto = object<CustomerSupportDto>({
  userId: uuid,
  email: nullable(text(320)),
  confirmed: bool,
  available: bool,
  orders: array(object<CustomerSupportDto["orders"][number]>({
    orderId: uuid,
    supportReference: pattern(SUPPORT_REFERENCE),
    mode: oneOf("test", "live"),
    collectionId: uuid,
    historicalTitle: nullable(text(200)),
  }), 25),
  cases: array(supportCase, 25),
  nextCursor: nullable(text(200)),
});

// Provider facts as the verifier recorded them. Provider ids may be empty when Stripe omitted them; the observation's
// blockers already say so, and the record is still shown as recorded.
const providerId: Decoder<string> = (v, p) => (typeof v === "string" && v.length <= 255 ? v : bad(p));
const BLOCKER = /^[a-z][a-z0-9_]{1,63}$/;

const refundFact = object<RefundFact>({
  id: providerId,
  paymentIntentId: providerId,
  chargeId: providerId,
  amountMinor: minor,
  currency: pattern(CURRENCY),
  status: text(64) as Decoder<RefundFact["status"]>,
  occurredAt: timestamp,
});

const disputeFact = object<DisputeFact>({
  id: providerId,
  paymentIntentId: providerId,
  chargeId: providerId,
  amountMinor: minor,
  currency: pattern(CURRENCY),
  status: text(64),
  classification: oneOf("inquiry", "formal", "unknown"),
  deadline: nullable(timestamp),
});

const financialFacts = object<FinancialFacts>({
  accountId: pattern(ACCOUNT),
  mode: oneOf("test", "live"),
  sessionId: nullable(text(300)),
  paymentIntentId: nullable(providerId),
  chargeId: nullable(providerId),
  capturedMinor: nullable(minor),
  currency: nullable(pattern(CURRENCY)),
  paymentState: oneOf("unpaid", "processing", "paid", "failed", "unknown"),
  paidAt: nullable(timestamp),
  refunds: array(refundFact, 2000),
  disputes: array(disputeFact, 2000),
});

const observation = object<ProviderObservation>({
  id: uuid,
  orderId: uuid,
  jobId: uuid,
  fence: count,
  facts: financialFacts,
  complete: bool,
  blockers: array(pattern(BLOCKER), 50),
  verifiedAt: timestamp,
  apiVersion: text(40),
  materialDigest: digest,
});

export function decodeLookupRead(input: unknown): SupportRead<LookupResult> {
  return read(lookupResult)(input, "lookup");
}

export function decodeOrderRead(input: unknown): SupportRead<OrderSupportDto> {
  return read(orderDto)(input, "order");
}

export function decodeAccessRead(input: unknown): SupportRead<AccessExplanation> {
  return read(accessExplanation)(input, "access");
}

export function decodeCustomerRead(input: unknown): SupportRead<CustomerSupportDto> {
  return read(customerDto)(input, "customer");
}

export function decodeProposal(input: unknown): RepairProposal {
  return proposal(input, "proposal");
}

/** A committed receipt or a not-yet-committed state; a state name never stands in for a receipt. */
export function decodeOperation(input: unknown): OperationStatus {
  const state = (input as { state?: unknown } | null)?.state;
  return state === "applied" || state === "already_satisfied" ? receipt(input, "operation") : pending(input, "operation");
}

export function decodeExecutionStart(input: unknown): ExecutionStart {
  const record = (typeof input === "object" && input !== null ? input : {}) as { status?: unknown; jobId?: unknown };
  if (Object.keys(record).sort().join(",") !== "jobId,status") throw new Invalid("execution");
  return { status: decodeOperation(record.status), jobId: uuid(record.jobId, "execution.jobId") };
}

const metrics = object<SupportMetrics>({
  mode: oneOf("test", "live"),
  pendingChecks: count,
  oldestPendingCheckSeconds: count,
  webhookEvents: object({ pending: count, failed: count, setAside: count }),
  unresolvedMismatches: count,
  blockedRepairReasons: (v, p) => {
    if (typeof v !== "object" || v === null || Array.isArray(v)) bad(p);
    const out: Record<string, number> = {};
    for (const [key, n] of Object.entries(v as Record<string, unknown>)) {
      if (!/^[a-z][a-z0-9_]{1,63}$/.test(key)) bad(`${p}.${key}`);
      out[key] = count(n, `${p}.${key}`);
    }
    return out;
  },
  repairs: object({ applied: count, alreadySatisfied: count, failedWithoutCommit: count }),
  postchecks: object({ verified: count, pending: count }),
  unresolvedRefunds: object({ count, oldestSeconds: count }),
});

export function decodeSupportMetrics(input: unknown): SupportMetrics {
  return metrics(input, "metrics");
}

const LOWER_CODE = /^[a-z][a-z0-9_]{1,63}$/;
const refundCapacityDecoder = object<RefundCapacity>({
  capturedMinor: minor,
  successfulMinor: minor,
  pendingMinor: minor,
  reservedMinor: minor,
  availableMinor: minor,
  blockers: array(pattern(LOWER_CODE), 20),
});

const refundProposal = object<RefundProposal>({
  id: uuid,
  orderId: uuid,
  ownerPrincipal: uuid,
  binding,
  paymentIntentId: (v, p) => (typeof v === "string" && v.length <= 255 ? v : bad(p)),
  chargeId: (v, p) => (typeof v === "string" && v.length <= 255 ? v : bad(p)),
  observationId: uuid,
  expectedOrderVersion: count,
  amountMinor: minor,
  currency: pattern(CURRENCY),
  providerReason: oneOf("requested_by_customer", "duplicate"),
  exceptionCategory: oneOf("duplicate_charge", "billing_error", "unresolved_delivery", "required_remedy"),
  internalReason: text(500),
  capacity: refundCapacityDecoder,
  policyVersion: text(100),
  dependencyToken: text(200),
  effects: array(effect, 5),
  blockers: array(pattern(LOWER_CODE), 50),
  digest,
  expiresAt: timestamp,
});

const refundApproval = object<RefundApproval>({
  id: uuid,
  proposalId: uuid,
  digest,
  humanAuthoriser: uuid,
  approvedAt: timestamp,
  expiresAt: timestamp,
  channel: oneOf("web"),
});

const refundReceipt = object<RefundReceipt>({
  operationId: uuid,
  proposalId: uuid,
  orderId: uuid,
  amountMinor: minor,
  currency: pattern(CURRENCY),
  state: oneOf("reserved", "dispatching", "outcome_unknown", "submitted", "rejected", "expired"),
  providerRefundId: nullable(text(255)),
  providerStatus: nullable(oneOf("pending", "requires_action", "succeeded", "failed", "canceled")),
  reconciliation: oneOf("not_started", "pending", "applied", "unavailable"),
  auditId: uuid,
  reasonCode: nullable(code),
  firstDispatchedAt: nullable(timestamp),
  checkedAt: timestamp,
});

export function decodeRefundProposal(input: unknown): RefundProposal {
  return refundProposal(input, "refundProposal");
}

export function decodeRefundApproval(input: unknown): RefundApproval {
  return refundApproval(input, "refundApproval");
}

export function decodeRefundReceipt(input: unknown): RefundReceipt {
  return refundReceipt(input, "refundReceipt");
}

const refundList = object<RefundList>({
  submissionEnabled: bool,
  items: array(object<RefundListItem>({
    proposal: refundProposal,
    state: oneOf("awaiting_approval", "approved", "blocked", "expired", "started"),
    approval: nullable(refundApproval),
    receipt: nullable(refundReceipt),
    preparedAt: timestamp,
  }), 10),
});

export function decodeRefundList(input: unknown): RefundList {
  return refundList(input, "refunds");
}

export function decodeSupportCase(input: unknown): SupportCase {
  return supportCase(input, "case");
}

export function decodeQueuePage(input: unknown): SupportQueuePage {
  return queuePage(input, "queue");
}

export function decodeHistoryPage(input: unknown): SupportHistoryPage {
  return history(input, "history");
}

export function decodeRedaction(input: unknown): { eventId: string; redactedAt: string } {
  return object<{ eventId: string; redactedAt: string }>({ eventId: uuid, redactedAt: timestamp })(input, "redaction");
}

export function decodeOrderCases(input: unknown): OrderCasesPage {
  return orderCasesPage(input, "cases");
}

export function decodeDiagnosisJob(input: unknown): { jobId: string } {
  return object<{ jobId: string }>({ jobId: uuid })(input, "diagnosis");
}

export function decodeObservationRead(input: unknown): SupportRead<ProviderObservation> {
  return read(observation)(input, "observation");
}

/** The order's latest observation; null when no check was ever recorded. */
export function decodeLatestObservationRead(input: unknown): SupportRead<ProviderObservation | null> {
  return read(nullable(observation))(input, "observation");
}

export function decodeApproval(input: unknown): Approval {
  return approval(input, "approval");
}

/** An order's proposals, newest first, each with its approval state. */
export function decodeProposalList(input: unknown): ProposalListItem[] {
  return array(proposalItem, 25)(input, "proposals");
}

// Dispute notices. Retention may have emptied a draft's recipient and text, so those may be empty strings.
const maybeEmpty = (max: number): Decoder<string> => (v, p) => (typeof v === "string" && v.length <= max ? v : bad(p));
const emptyOr = (d: Decoder<string>): Decoder<string> => (v, p) => (v === "" ? "" : d(v, p));
const noticeDraft = object<DisputeNoticeDraft>({
  id: uuid,
  noticeId: uuid,
  orderId: uuid,
  disputeId: pattern(/^du_[A-Za-z0-9_]{1,255}$/),
  ownerPrincipal: uuid,
  recipient: maybeEmpty(320),
  recipientReference: emptyOr(uuid),
  recipientVersion: emptyOr(digest),
  subject: maybeEmpty(200),
  text: maybeEmpty(4000),
  templateVersion: oneOf("dispute-opened-v1"),
  disputeVersion: digest,
  disputeStatus: pattern(/^[a-z_]{1,40}$/),
  respondBy: nullable(timestamp),
  effectiveAccess: oneOf("active", "denied", "unavailable"),
  dependencyToken: emptyOr(digest),
  digest,
  expiresAt: timestamp,
  blockers: array(pattern(LOWER_CODE), 20),
  redacted: bool,
});
const noticeApproval = object<NoticeApproval>({
  id: uuid,
  proposalId: uuid,
  digest,
  humanAuthoriser: uuid,
  approvedAt: timestamp,
  expiresAt: timestamp,
  channel: oneOf("web"),
});
const noticeReceipt = object<NoticeReceipt>({
  operationId: uuid,
  draftId: uuid,
  state: oneOf("not_sent", "dispatching", "accepted", "failed_before_acceptance", "outcome_unknown"),
  providerMessageId: nullable(text(255)),
  delivery: oneOf("unconfirmed", "delivered", "bounced", "complained"),
  auditId: uuid,
  reasonCode: nullable(code),
  checkedAt: timestamp,
});
const noticeList = object<NoticeList>({
  sendingEnabled: bool,
  items: array(object<NoticeListItem>({
    draft: noticeDraft,
    state: oneOf("awaiting_approval", "approved", "blocked", "expired", "started"),
    approval: nullable(noticeApproval),
    receipt: nullable(noticeReceipt),
    preparedAt: timestamp,
  }), 10),
});
const noticeClaim = object<NoticeClaim>({ operationId: uuid, fence: count, expiresAt: timestamp });

export function decodeNoticeDraft(input: unknown): DisputeNoticeDraft {
  return noticeDraft(input, "noticeDraft");
}

export function decodeNoticeApproval(input: unknown): NoticeApproval {
  return noticeApproval(input, "noticeApproval");
}

export function decodeNoticeReceipt(input: unknown): NoticeReceipt {
  return noticeReceipt(input, "noticeReceipt");
}

export function decodeNoticeList(input: unknown): NoticeList {
  return noticeList(input, "notices");
}

export function decodeNoticeClaim(input: unknown): NoticeClaim {
  return noticeClaim(input, "noticeClaim");
}
