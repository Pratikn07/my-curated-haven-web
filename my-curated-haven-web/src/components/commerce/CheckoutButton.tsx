"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { CheckoutExpectation, OwnershipStatus } from "@/lib/payments/types";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { getSessionCampaign } from "@/lib/analytics/campaigns";
import type { CheckoutAnalyticsInput } from "@/lib/analytics/checkout-analytics";
import { ENTRY_STORY_STORAGE_KEY, isAnalyticsPermitted, rememberAttemptRef } from "@/lib/analytics/consent";
import type { CheckoutSurface } from "@/lib/analytics/events";
import { isPostHogActive, posthog } from "@/lib/analytics/posthog";
import { pathToCanonicalRouteKey } from "@/lib/analytics/schema";
import { rememberBoughtFrom } from "@/lib/recipes/bought-from";

const CHECKOUT_FAILED = "We couldn't start checkout. Please refresh the page and try again.";

/** The visit behind this tap, so the order and the server's purchase event can name it. */
function checkoutAnalytics(surface: CheckoutSurface): CheckoutAnalyticsInput | undefined {
  if (!isAnalyticsPermitted()) return undefined;
  const input: CheckoutAnalyticsInput = { surface };
  try {
    if (isPostHogActive()) {
      input.distinct_id = posthog.get_distinct_id();
      input.session_id = posthog.get_session_id();
    }
    const story = sessionStorage.getItem(ENTRY_STORY_STORAGE_KEY);
    if (story) input.entry_story = story;
  } catch {
    // Analytics must never stop a purchase.
  }
  return input;
}

interface CheckoutButtonProps {
  collectionSlug: string;
  formattedPrice: string;
  ownershipState: OwnershipStatus;
  /** What this page shows for sale; checkout refuses a stale expectation and asks for a refresh. */
  expected: CheckoutExpectation | null;
  /** Which Buy button this is, for checkout_clicked and the order: a lock card or a collection's buy box. */
  surface: CheckoutSurface;
  className?: string;
  /** "cloth" renders in the collections pages' button style; labels and behaviour are unchanged. */
  appearance?: "default" | "cloth";
  /** Signed-out "Already bought it? Sign in" under the button; off where the page has its own sign-in line. */
  signInHint?: boolean;
  /** The recipe page this button sits on, so "You're in" can send the buyer straight back to it. */
  fromRecipeSlug?: string;
}

export default function CheckoutButton({
  collectionSlug,
  formattedPrice,
  ownershipState,
  expected,
  surface,
  className = "",
  appearance = "default",
  signInHint = true,
  fromRecipeSlug,
}: CheckoutButtonProps) {
  const look = (defaults: string) => (appearance === "cloth" ? "cl-button" : defaults);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (ownershipState === "owned") {
    return (
      <a
        href="#collection-recipes"
        className={`${look("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-surface-muted px-6 py-3 text-base font-semibold text-action border border-action/20 hover:bg-action/5 focus-visible:outline-2 focus-visible:outline-action")} ${className}`}
      >
        <CheckCircle2 className="h-4 w-4 text-action" aria-hidden="true" />
        <span>Open your collection</span>
      </a>
    );
  }

  // Nothing is on sale right now (no enabled offer for the current release); a pending checkout can still resume.
  if (ownershipState === "unavailable" || ((ownershipState === "not_owned" || ownershipState === "unauthenticated") && !expected)) {
    return (
      <button
        disabled
        className={`${look("inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-surface-muted px-6 py-3 text-base font-medium text-text-muted border border-border")} ${className}`}
      >
        Purchase currently unavailable
      </button>
    );
  }

  // Pay first: a signed-out parent pays now and confirms their email afterwards (RC-16).
  const signedOut = ownershipState === "unauthenticated";

  async function handleCheckout() {
    setIsLoading(true);
    setErrorMessage(null);

    const releaseId = expected?.releaseId;
    void trackAnalyticsEvent(
      "checkout_clicked",
      {
        collection_slug: collectionSlug,
        surface,
        ...(releaseId ? { collection_release_id: releaseId } : {}),
      },
      pathToCanonicalRouteKey(window.location.pathname) ?? undefined
    );

    try {
      const campaign = getSessionCampaign();
      const bodyPayload = {
        collectionSlug,
        expected,
        analyticsConsent: isAnalyticsPermitted(),
        attribution: campaign
          ? {
              utm_source: campaign.utm_source,
              utm_medium: campaign.utm_medium,
              utm_campaign: campaign.utm_campaign,
              utm_content: campaign.utm_content,
            }
          : undefined,
        analytics: checkoutAnalytics(surface),
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      // A timeout or proxy error can answer with HTML; never show the browser's parse error to a parent.
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 409) {
          // Already owned
          window.location.reload();
          return;
        }
        // Checkout's own answers carry a code and are written for parents; anything else is technical.
        setErrorMessage(typeof data?.code === "string" && typeof data?.error === "string" ? data.error : CHECKOUT_FAILED);
        setIsLoading(false);
        return;
      }

      if (data?.analyticsAttemptRef) {
        rememberAttemptRef(data.analyticsAttemptRef);
      }

      if (data?.checkoutUrl) {
        if (fromRecipeSlug) rememberBoughtFrom(collectionSlug, fromRecipeSlug);
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMessage(CHECKOUT_FAILED);
        setIsLoading(false);
      }
    } catch {
      setErrorMessage("We couldn't reach checkout. Check your connection and try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCheckout}
        disabled={isLoading}
        data-checkout-expected={expected ? JSON.stringify(expected) : undefined}
        aria-busy={isLoading}
        className={`${look("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-4 py-3 sm:px-6 text-sm sm:text-base font-semibold text-white shadow-sm transition hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:opacity-75 text-center")} ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            <span className="break-words">Preparing checkout...</span>
          </>
        ) : (
          <span className="break-words">{signedOut ? `Buy now — ${formattedPrice}` : `Buy Collection — ${formattedPrice}`}</span>
        )}
      </button>

      {signedOut && (
        <p className="text-center text-sm text-text-muted">
          No account needed to pay.
          {signInHint ? (
            <>
              {" "}Already bought it?{" "}
              <Link href={`/sign-in?returnTo=/collections/${collectionSlug}`} className="underline hover:text-foreground">
                Sign in
              </Link>
            </>
          ) : null}
        </p>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="text-sm font-medium text-red-600 dark:text-red-400 mt-1"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
