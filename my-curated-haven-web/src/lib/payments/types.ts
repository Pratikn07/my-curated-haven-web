export type AttemptState =
  | "creating"
  | "creation_unknown"
  | "open"
  | "processing"
  | "review"
  | "closed";

export type TaxMode = "inclusive" | "exclusive" | "none";

export interface CommercialOffer {
  id: string;
  releaseId: string;
  providerAccountId: string;
  providerMode: "test" | "live";
  providerProductId: string;
  providerPriceId: string;
  currency: string;
  baseMinorAmount: number;
  taxMode: TaxMode;
  quantity: number;
  termsVersion: string;
  refundPolicyVersion: string;
  accessPolicyVersion: string;
  saleEnabled: boolean;
  manifestHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  supportReference: string;
  ownerPrincipal: string;
  userId: string | null;
  offerId: string;
  releaseId: string;
  snapshot: Record<string, unknown>;
  attemptState: AttemptState;
  sessionId: string | null;
  checkoutUrl: string | null;
  idempotencyKey: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderPayment {
  id: string;
  orderId: string;
  providerAccountId: string;
  providerMode: "test" | "live";
  paymentIntentId: string;
  chargeId: string | null;
  status: string;
  capturedAmount: number;
  currency: string;
  paidAt: string;
  verifiedAt: string;
}

export interface AccessSource {
  id: string;
  userId: string;
  releaseId: string;
  sourceKind: "stripe_purchase" | "native_legacy" | "support_grant" | "promotional";
  sourceId: string;
  isEligible: boolean;
  ineligibilityReason: string | null;
  validFrom: string;
  expiresAt: string | null;
}

export type OwnershipStatus =
  | "unauthenticated"
  | "not_owned"
  | "owned"
  | "pending_payment"
  | "unavailable";

export interface CollectionRecipeSummary {
  id: string;
  slug: string;
  title: string;
  isFree: boolean;
  previewImagePath: string;
  totalMinutes: number | null;
}

export interface CollectionOfferDto {
  collectionId: string;
  collectionSlug: string;
  collectionTitle: string;
  collectionSummary: string;
  releaseId: string;
  priceMinor: number;
  currency: string;
  formattedPrice: string;
  saleEnabled: boolean;
  termsVersion: string;
  ownershipState: OwnershipStatus;
  recipes: CollectionRecipeSummary[];
}

export interface OrderSummaryDto {
  orderId: string;
  supportReference: string;
  attemptState: AttemptState;
  releaseId: string;
  collectionSlug: string;
  collectionTitle: string;
  amountMinor: number;
  currency: string;
  formattedAmount: string;
  isEntitled: boolean;
  statusDisplay:
    | "verifying"
    | "paid_active"
    | "paid_pending_access"
    | "payment_processing"
    | "unpaid_open"
    | "expired"
    | "review"
    | "not_found";
}

export type CheckoutResult =
  | {
      status: "success";
      checkoutUrl: string;
      supportReference: string;
      analyticsAttemptRef?: string | null;
    }
  | { status: "already_owned"; collectionSlug: string }
  | { status: "unauthenticated" }
  | { status: "error"; message: string; code?: string };
