"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import type { OwnershipStatus } from "@/lib/payments/types";

interface CheckoutButtonProps {
  collectionSlug: string;
  formattedPrice: string;
  ownershipState: OwnershipStatus;
  className?: string;
}

export default function CheckoutButton({
  collectionSlug,
  formattedPrice,
  ownershipState,
  className = "",
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (ownershipState === "unauthenticated") {
    return (
      <Link
        href={`/sign-in?returnTo=/collections/${collectionSlug}`}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-4 py-3 sm:px-6 text-sm sm:text-base font-semibold text-white shadow-sm transition hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action text-center ${className}`}
      >
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="break-words">Sign in to buy ({formattedPrice})</span>
      </Link>
    );
  }

  if (ownershipState === "owned") {
    return (
      <a
        href="#collection-recipes"
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-surface-muted px-6 py-3 text-base font-semibold text-action border border-action/20 hover:bg-action/5 focus-visible:outline-2 focus-visible:outline-action ${className}`}
      >
        <CheckCircle2 className="h-4 w-4 text-action" aria-hidden="true" />
        <span>Open your collection</span>
      </a>
    );
  }

  if (ownershipState === "unavailable") {
    return (
      <button
        disabled
        className={`inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-surface-muted px-6 py-3 text-base font-medium text-text-muted border border-border ${className}`}
      >
        Purchase currently unavailable
      </button>
    );
  }

  async function handleCheckout() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionSlug }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          // Already owned
          window.location.reload();
          return;
        }
        throw new Error(data.error || "Failed to start checkout session.");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Missing checkout destination URL.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCheckout}
        disabled={isLoading}
        aria-busy={isLoading}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-4 py-3 sm:px-6 text-sm sm:text-base font-semibold text-white shadow-sm transition hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:opacity-75 text-center ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            <span className="break-words">Preparing checkout...</span>
          </>
        ) : (
          <span className="break-words">Buy Collection — {formattedPrice}</span>
        )}
      </button>

      {errorMessage && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
