import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { reconcileAndFulfillSession } from "@/lib/payments/fulfilment";
import { Clock, AlertCircle } from "lucide-react";
import PurchaseConfirmed from "@/components/commerce/PurchaseConfirmed";
import { getPublishedCollection } from "@/lib/collections/publication";

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
  // The book's cover and recipe count for the confirmation; the page still works without them.
  const book = isConfirmed
    ? await getPublishedCollection(orderSummary.collectionSlug).then((c) => c?.collection ?? null).catch(() => null)
    : null;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center shadow-sm">
        {isConfirmed ? (
          <PurchaseConfirmed
            collectionSlug={orderSummary.collectionSlug}
            collectionTitle={orderSummary.collectionTitle}
            recipeCount={book?.recipes.length ?? null}
            cover={book?.cover ?? null}
            supportReference={orderSummary.supportReference}
            formattedAmount={orderSummary.formattedAmount}
            email={user.email ?? null}
          />
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
