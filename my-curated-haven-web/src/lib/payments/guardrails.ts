export interface PaymentSnapshotGuardInput {
  expectedAmount: unknown;
  expectedCurrency: unknown;
  expectedMode: unknown;
  capturedAmount: unknown;
  currency: unknown;
  livemode: boolean;
}

export function paymentCaptureMatchesSnapshot({
  expectedAmount,
  expectedCurrency,
  expectedMode,
  capturedAmount,
  currency,
  livemode,
}: PaymentSnapshotGuardInput): boolean {
  const expectedCurrencyCode =
    typeof expectedCurrency === "string" && /^[a-z]{3}$/i.test(expectedCurrency)
      ? expectedCurrency.toLowerCase()
      : null;
  const capturedCurrencyCode =
    typeof currency === "string" && /^[a-z]{3}$/i.test(currency)
      ? currency.toLowerCase()
      : null;
  const stripeMode = livemode ? "live" : "test";

  return (
    typeof expectedAmount === "number" &&
    Number.isSafeInteger(expectedAmount) &&
    expectedAmount > 0 &&
    typeof capturedAmount === "number" &&
    Number.isSafeInteger(capturedAmount) &&
    capturedAmount === expectedAmount &&
    expectedCurrencyCode !== null &&
    expectedCurrencyCode === capturedCurrencyCode &&
    expectedMode === stripeMode
  );
}

export function reusableCheckoutUrl(
  storedUrl: unknown,
  retrievedUrl?: unknown
): string | null {
  if (typeof storedUrl === "string" && storedUrl.trim()) return storedUrl;
  if (typeof retrievedUrl === "string" && retrievedUrl.trim()) return retrievedUrl;
  return null;
}
