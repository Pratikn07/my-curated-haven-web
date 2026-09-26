import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { reconcileAndFulfillSession } from "@/lib/payments/fulfilment";
import { CheckCircle2, Clock, AlertCircle, ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Checkout Status",
  robots: { index: false, follow: false },
};

interface ReturnPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutReturnPage({ searchParams }: ReturnPageProps) {
  const { session_id: sessionId } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    const returnUrl = sessionId
      ? `/checkout/return?session_id=${encodeURIComponent(sessionId)}`
      : "/account/collections";

    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Sign In to View Purchase</h1>
        <p className="mt-2 text-sm text-text-muted">
          Please sign in to verify your purchase and unlock your recipe collection.
        </p>
        <div className="mt-6">
          <Link
            href={`/sign-in?returnTo=${encodeURIComponent(returnUrl)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover"
          >
            Sign in with email
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">No Checkout Session</h1>
        <p className="mt-2 text-sm text-text-muted">
          We could not find an active checkout reference.
        </p>
        <div className="mt-6">
          <Link
            href="/account/collections"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover"
          >
            Go to Your Collections
          </Link>
        </div>
      </div>
    );
  }

  // Authoritatively reconcile and fulfill the session for this user
  const orderSummary = await reconcileAndFulfillSession(sessionId, user.id);

  if (!orderSummary) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-yellow-600" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Order Not Found</h1>
        <p className="mt-2 text-sm text-text-muted">
          We couldn&apos;t match this payment reference to your account. If you were charged, please contact support with reference: {sessionId}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/recipes"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-6 py-3 font-semibold text-foreground hover:bg-surface-muted"
          >
            Browse Free Recipes
          </Link>
          <a
            href="mailto:support@mycuratedhaven.com"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-surface-muted px-6 py-3 font-semibold text-foreground border border-border hover:bg-surface"
          >
            Contact Support
          </a>
        </div>
      </div>
    );
  }

  const isConfirmed = orderSummary.isEntitled || orderSummary.statusDisplay === "paid_active";

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center shadow-sm">
        {isConfirmed ? (
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="mt-5 text-3xl font-extrabold text-foreground">
              Purchase Confirmed!
            </h1>
            <p className="mt-2 text-base text-text-muted">
              You now have full access to{" "}
              <strong className="text-foreground">{orderSummary.collectionTitle}</strong>.
            </p>

            <div className="mt-6 rounded-xl bg-surface-muted p-4 text-left text-sm border border-border">
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Order Reference:</span>
                <span className="font-mono font-medium text-foreground">{orderSummary.supportReference}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Amount Paid:</span>
                <span className="font-semibold text-foreground">{orderSummary.formattedAmount}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Access Status:</span>
                <span className="font-semibold text-emerald-600">Active & Unlocked</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/collections/${orderSummary.collectionSlug}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-action-hover"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Open Collection</span>
              </Link>
              <Link
                href="/account/collections"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 text-base font-semibold text-foreground hover:bg-surface-muted"
              >
                View Library
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-10 w-10 text-amber-600 animate-pulse" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-foreground">
              Payment Received — Preparing Access
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              We received your payment for {orderSummary.collectionTitle} and are setting up your access. This normally completes in a few seconds.
            </p>

            <div className="mt-6">
              <Link
                href={`/checkout/return?session_id=${encodeURIComponent(sessionId)}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover"
              >
                Refresh Status
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
