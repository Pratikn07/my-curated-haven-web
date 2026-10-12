/**
 * Shared commerce reconciliation contracts: the order binding, provider facts, eligibility policy and the effects a
 * repair would have. Support (Phase 3) and webhook processing both use them; the database stays authoritative for
 * digests, eligibility and approval, and these types only describe what crosses the boundary.
 */

export type Mode = "test" | "live";

/** The exact order a support action is about, frozen when the order was reserved. */
export type Binding = {
  orderId: string;
  userId: string | null;
  ownerPrincipal: string;
  collectionId: string;
  releaseId: string;
  sessionId: string | null;
  accountId: string;
  mode: Mode;
  expectedCapturedMinor: number | null;
  currency: string | null;
  manifestHash: string | null;
  refundPolicyVersion: string | null;
  accessPolicyVersion: string | null;
  version: number;
};

export type RefundStatus = "pending" | "requires_action" | "succeeded" | "failed" | "canceled";

export type RefundFact = {
  id: string;
  paymentIntentId: string;
  chargeId: string;
  amountMinor: number;
  currency: string;
  status: RefundStatus;
  occurredAt: string;
};

export type DisputeFact = {
  id: string;
  paymentIntentId: string;
  chargeId: string;
  amountMinor: number;
  currency: string;
  status: string;
  classification: "inquiry" | "formal" | "unknown";
  deadline: string | null;
};

export type PaymentState = "unpaid" | "processing" | "paid" | "failed" | "unknown";

/** What the provider says about one order's payment, refunds and disputes. */
export type FinancialFacts = {
  accountId: string;
  mode: Mode;
  sessionId: string | null;
  paymentIntentId: string | null;
  chargeId: string | null;
  capturedMinor: number | null;
  currency: string | null;
  paymentState: PaymentState;
  paidAt: string | null;
  refunds: RefundFact[];
  disputes: DisputeFact[];
};

/** A trusted, immutable record of one provider verification. Its digest covers only the facts. */
export type ProviderObservation = {
  id: string;
  orderId: string;
  jobId: string;
  fence: number;
  facts: FinancialFacts;
  complete: boolean;
  blockers: string[];
  verifiedAt: string;
  apiVersion: string;
  materialDigest: string;
};

/**
 * An approved, versioned mapping from financial conditions to access. The accepted policy for new purchases uses
 * formalOpen "hold", duration "indefinite" and fixedSeconds null. "Indefinite" is a technical term, not a promise
 * of lifetime access. A historical version without an approved mapping stays blocked; nothing falls back to this.
 */
export type EligibilityPolicy = {
  id: string;
  approved: boolean;
  version: string;
  pendingRefund: "retain";
  partialRefund: "retain";
  fullRefund: "ineligible";
  inquiry: "retain";
  formalOpen: "hold" | "retain";
  formalLost: "ineligible";
  duration: "indefinite" | "fixed";
  fixedSeconds: number | null;
};

export type Eligibility = {
  state: "eligible" | "ineligible" | "blocked";
  reasons: string[];
  validFrom: string | null;
  expiresAt: string | null;
};

/** One purchase source's change. `sourceId` is the stable purchase source id (the original order id). */
export type RepairEffect = {
  sourceId: string;
  beforeEligible: boolean | null;
  afterEligible: boolean;
  beforeEffective: "active" | "denied";
  afterEffective: "active" | "denied";
  recipeIds: string[];
  notification: "none" | "purchase_confirmation";
};

export type CommerceReceipt = {
  operationId: string;
  orderId: string;
  state: "applied" | "already_satisfied";
  effects: RepairEffect[];
  auditId: string;
  committedAt: string;
};

/** A provider event whose signature, account and mode were verified before anything reads it. */
export type VerifiedEvent = {
  id: string;
  type: string;
  accountId: string;
  mode: Mode;
  apiVersion: string;
  objectId: string;
  payloadHash: string;
};
