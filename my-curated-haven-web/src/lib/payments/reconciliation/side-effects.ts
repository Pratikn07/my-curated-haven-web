/**
 * The one notification a change may carry (SQL twin: private.commerce_notification_effect). Diagnosis and projection
 * changes never notify; a fulfilment notifies once, and only when delivery of purchase confirmations is approved.
 * Dispute notices are a separate, separately approved flow and never come from here.
 */
export function notificationEffect(input: { kind: "diagnosis" | "projection" | "fulfilment"; alreadyQueued: boolean;
  deliveryApproved: boolean }): "none" | "purchase_confirmation" {
  return input.kind === "fulfilment" && !input.alreadyQueued && input.deliveryApproved ? "purchase_confirmation" : "none";
}
