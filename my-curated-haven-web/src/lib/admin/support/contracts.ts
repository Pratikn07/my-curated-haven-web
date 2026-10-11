import type {
  Binding,
  DisputeFact,
  FinancialFacts,
  Mode,
  RefundFact,
  RepairEffect,
  CommerceReceipt,
} from "../../payments/reconciliation/contracts";

export type {
  Binding,
  CommerceReceipt,
  DisputeFact,
  Eligibility,
  EligibilityPolicy,
  FinancialFacts,
  Mode,
  ProviderObservation,
  RefundFact,
  RepairEffect,
  VerifiedEvent,
} from "../../payments/reconciliation/contracts";

/**
 * Support workspace contracts (Phase 3). Reads are timestamped with `checkedAt`; a provider observation carries its
 * own verification time. Refund and dispute-notice contracts live beside these in their own modules.
 */

export type { SupportStage } from "../contracts";
export type SupportPermission = "support.read" | "support.case.write"
  | "support.provider.inspect" | "support.repair.prepare"
  | "support.repair.approve" | "support.repair.execute"
  | "support.refund.prepare" | "support.refund.approve" | "support.refund.execute"
  | "support.notice.prepare" | "support.notice.approve" | "support.notice.send";

export type LookupQuery = { kind: "email" | "user_id" | "support_reference"; value: string }
  | { kind: "provider_id"; value: string; accountId: string; mode: Mode };
export type LookupResult = { status: "found"; target: { userId: string | null; orderId: string | null;
  ownerPrincipal: string | null } }
  | { status: "not_found" | "unconfirmed" | "ambiguous" };

export type SupportRead<T> = { value: T; checkedAt: string; complete: boolean; resolverVersion: string | null };

export type AccessSourceKind = "stripe_purchase" | "native_legacy" | "support_grant" | "promotional";
export type AccessExplanation = {
  collectionId: string;
  publicationId: string | null;
  resolverVersion: string;
  dependencyToken: string;
  effective: "active" | "denied" | "unavailable";
  originalRecipeIds: string[];
  additionRecipeIds: string[];
  contentHoldRecipeIds: string[];
  sources: {
    id: string;
    kind: AccessSourceKind;
    originReleaseId: string;
    eligible: boolean;
    reason: string | null;
    validFrom: string;
    expiresAt: string | null;
    policyVersion: string | null;
  }[];
};

export type RepairKind = "reconcile_order" | "rebuild_projection";
export type RepairProposal = {
  id: string;
  orderId: string;
  userId: string;
  ownerPrincipal: string;
  binding: Binding;
  kind: RepairKind;
  observationId: string;
  materialDigest: string;
  expectedOrderVersion: number;
  dependencyToken: string;
  policyVersion: string;
  effects: RepairEffect[];
  blockers: string[];
  digest: string;
  expiresAt: string;
  reason: string;
};
export type RepairCommand = { operationId: string; proposalId: string; expectedDigest: string; caseId: string | null };
export type Approval = { id: string; proposalId: string; digest: string; humanAuthoriser: string;
  approvedAt: string; expiresAt: string; channel: "web" | "operator" };

/** One of an order's proposals as staff see it; expired, blocked and unapproved proposals stay listed. */
export type ProposalListItem = { proposal: RepairProposal; state: "awaiting_approval" | "approved" | "blocked" | "expired";
  approval: Approval | null; operation: OperationStatus | null; preparedAt: string };

/** Private support metrics for one mode: counts only, never customer, note or provider details. */
export type SupportMetrics = {
  mode: Mode;
  pendingChecks: number;
  oldestPendingCheckSeconds: number;
  webhookEvents: { pending: number; failed: number; setAside: number };
  unresolvedMismatches: number;
  blockedRepairReasons: Record<string, number>;
  repairs: { applied: number; alreadySatisfied: number; failedWithoutCommit: number };
  postchecks: { verified: number; pending: number };
  /** Refunds still sending or with an unknown outcome; the oldest's age since it was sent. */
  unresolvedRefunds: { count: number; oldestSeconds: number };
};

export type RepairReceipt = CommerceReceipt & { proposalId: string; verification: "pending" | "verified" | "unavailable" };
export type OperationPending = { operationId: string;
  state: "checking" | "blocked" | "failed_no_commit" | "outcome_unknown"; reasonCode: string | null };
export type OperationStatus = OperationPending | RepairReceipt;
/** Starting an approved repair: where the operation stands and the provider check it is waiting on. */
export type ExecutionStart = { status: OperationStatus; jobId: string };

export type CaseState = "open" | "investigating" | "waiting_on_customer" | "waiting_on_provider" | "resolved";
export type CaseCategory = "missing_access" | "unresolved_payment" | "account_mismatch" | "refund_followup"
  | "dispute_followup" | "duplicate_purchase" | "content_availability";
export type CaseCommand = {
  operationId: string;
  caseId: string | null;
  orderId: string | null;
  userId: string | null;
  expectedVersion: number | null;
  action: "create" | "append_note" | "amend_note" | "set_state";
  category: CaseCategory;
  note: string | null;
  amendsEventId: string | null;
  state: CaseState;
  resolutionReference: string | null;
};
export type SupportCase = { id: string; orderId: string | null; userId: string | null; state: CaseState; version: number };
export type OrderCase = SupportCase & { category: CaseCategory; resolutionReference: string | null };
/** Cases on one order. `notesEnabled` is false until the owner approves how long notes are kept. */
export type OrderCasesPage = { cases: OrderCase[]; notesEnabled: boolean; nextCursor: string | null };
export type TimelineEvent = { id: string; kind: "provider" | "case" | "approval" | "attempt" | "commit" | "postcheck";
  at: string; code: string; actorLabel: string | null; operationId: string | null; note: string | null };
export type SupportHistoryPage = { events: TimelineEvent[]; nextCursor: string | null };

export type SupportRefundDto = Omit<RefundFact, "id" | "paymentIntentId" | "chargeId"> & { providerRefundId: string | null };
export type SupportDisputeDto = Omit<DisputeFact, "id" | "paymentIntentId" | "chargeId"> & { providerDisputeId: string | null };

/** One order as support sees it. Without provider inspection, `binding` and provider ids are null, never faked. */
export type OrderSupportDto = {
  orderId: string;
  userId: string | null;
  ownerPrincipal: string;
  collectionId: string;
  binding: Binding | null;
  supportReference: string;
  historicalComplete: boolean;
  historical: { releaseId: string; manifestHash: string | null; refundPolicyVersion: string | null;
    accessPolicyVersion: string | null; expectedCapturedMinor: number | null; currency: string | null };
  historicalTitle: string | null;
  currentTitle: string | null;
  attemptState: "creating" | "creation_unknown" | "open" | "processing" | "review" | "closed";
  accountState: "active" | "unconfirmed" | "closed" | "disabled" | "unavailable";
  paymentState: FinancialFacts["paymentState"];
  capturedMinor: number | null;
  currency: string | null;
  successfulRefundMinor: number | null;
  refunds: SupportRefundDto[];
  disputes: SupportDisputeDto[];
  providerVerifiedAt: string | null;
  access: AccessExplanation | null;
  history: SupportHistoryPage;
};
/** `email` is null for a closed account, which support finds only through the orders it owned. */
export type CustomerSupportDto = {
  userId: string;
  email: string | null;
  confirmed: boolean;
  available: boolean;
  orders: { orderId: string; supportReference: string; mode: Mode; collectionId: string; historicalTitle: string | null }[];
  cases: SupportCase[];
  nextCursor: string | null;
};
/** What an attention item means for access, from verified local facts only. */
export type AccessConsequence = "blocked" | "at_risk" | "none" | "unknown";
export type SupportQueuePage = { items: { orderId: string | null; caseId: string | null; supportReference: string | null;
  mode: Mode; reasonCode: string; observedAt: string;
  /** A formal dispute's response deadline as Stripe gave it; never inferred from a note or receipt. */
  deadlineAt: string | null; accessConsequence: AccessConsequence }[]; nextCursor: string | null };
