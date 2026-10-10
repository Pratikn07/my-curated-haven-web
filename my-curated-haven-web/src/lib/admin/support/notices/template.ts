import type { NoticeAccess, NoticeDelivery, NoticeState } from "./contracts";

/**
 * The approved neutral dispute notice, version dispute-opened-v1. SQL twin: private.support_notice_copy, which renders
 * the text that is approved and sent; tests pin both to the same words. Plain text only: no links, tracking,
 * marketing or request to buy again. No runtime imports.
 */
export function disputeNoticeCopy(input: { supportReference: string; collectionTitle: string; effectiveAccess: NoticeAccess;
  supportEmail: string }): { subject: string; text: string } {
  const title = input.collectionTitle.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/^ +| +$/g, "").slice(0, 200);
  const access = input.effectiveAccess === "active"
    ? "Your collection remains available through another valid purchase or access source."
    : input.effectiveAccess === "denied"
      ? "While the dispute is open, the recipes from this purchase are paused. Nothing else in your account changes."
      : "We could not confirm your access to this collection just now.";
  return {
    subject: `About your order ${input.supportReference}`,
    text: [
      "Hello,",
      `Your bank or card issuer has told us that you are disputing the payment for your My Curated Haven order ${input.supportReference} (${title}).`,
      access,
      "Your bank decides the dispute, and this email does not change it. If you have a question, or you did not mean to dispute "
        + `this payment, reply to this email or write to ${input.supportEmail} and quote ${input.supportReference}.`,
      "My Curated Haven",
    ].join("\n\n"),
  };
}

/** What a notice's state proves. Acceptance by the mail provider is never reported as delivery. */
export function noticeStatusMessage(state: NoticeState, delivery: NoticeDelivery): string {
  switch (state) {
    case "accepted":
      return delivery === "delivered" ? "Email delivered."
        : delivery === "bounced" ? "Email accepted by the provider, then bounced."
        : delivery === "complained" ? "Email delivered; the recipient marked it as spam."
        : "Email accepted by the provider. Delivery is not confirmed.";
    case "outcome_unknown":
      return "Email send outcome unknown. Check this operation before sending again.";
    case "dispatching":
      return "Email is being sent. Check this operation before doing anything else.";
    case "failed_before_acceptance":
      return "The mail provider refused the email before accepting it. Nothing was sent.";
    case "not_sent":
      return "Not sent.";
  }
}
