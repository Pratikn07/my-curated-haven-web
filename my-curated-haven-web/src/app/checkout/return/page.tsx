import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { reconcileAndFulfillSession } from "@/lib/payments/fulfilment";
import { Clock, AlertCircle } from "lucide-react";
import PurchaseConfirmed from "@/components/commerce/PurchaseConfirmed";
import { getPublishedCollection } from "@/lib/collections/publication";
import ClaimPurchaseForm from "@/components/commerce/ClaimPurchaseForm";
import MockCheckoutEmailForm from "@/components/commerce/MockCheckoutEmailForm";
import { claimGuestOrders, loadGuestCheckout, type GuestCheckout } from "@/lib/payments/guest-checkout";

export const metadata: Metadata = {
  title: "Checkout Status",
  robots: { index: false, follow: false },
};

interface ReturnPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center shadow-sm">{children}</div>
    </div>
  );
}

export default async function CheckoutReturnPage({ searchParams }: ReturnPageProps) {
  const { session_id: sessionId } = await searchParams;
  const user = await getCurrentUser();

  // Pay first: a guest order unlocks once the parent confirms the email they paid with. A signed-in parent whose
  // email matches claims it straight away and falls through to "You're in".
  if (sessionId) {
    let guest: GuestCheckout;
    try {
      guest = await loadGuestCheckout(sessionId);
    } catch (error) {
      console.error("[checkout/return] guest lookup failed", error instanceof Error ? error.message : error);
      guest = { state: "not_guest" };
    }
    if (guest.state !== "not_guest") {
      let claimed = guest.state === "paid" && guest.claimed;
      if (user && guest.state === "paid" && !guest.claimed) claimed = (await claimGuestOrders(user.id)) > 0;
      if (!(user && claimed)) {
        if (guest.state === "pending") {
          return (
            <Card>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-10 w-10 text-amber-600 animate-pulse" />
              </div>
              <h1 className="mt-5 text-2xl font-bold text-foreground">Confirming your payment</h1>
              <p className="mt-2 text-sm text-text-muted">
                This usually takes a few seconds. Order {guest.supportReference}.
              </p>
              <div className="mt-6">
                <Link
                  href={`/checkout/return?session_id=${encodeURIComponent(sessionId)}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover"
                >
                  Refresh
                </Link>
              </div>
            </Card>
          );
        }
        if (guest.state === "needs_email") {
          return <Card><MockCheckoutEmailForm sessionId={sessionId} /></Card>;
        }
        if (guest.claimed) {
          // Already unlocked in an account, but this browser is signed out (or in another account).
          return (
            <Card>
              <h1 className="text-2xl font-bold text-foreground">Your recipes are in your account</h1>
              <p className="mt-2 text-sm text-text-muted">
                Sign in with <strong className="text-foreground">{guest.maskedEmail}</strong> to open {guest.collectionTitle}.
              </p>
              <div className="mt-6">
                <Link
                  href={`/sign-in?returnTo=${encodeURIComponent("/account/collections")}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover"
                >
                  Sign in with email
                </Link>
              </div>
            </Card>
          );
        }
        return (
          <Card>
            <ClaimPurchaseForm
              sessionId={sessionId}
              maskedEmail={guest.maskedEmail}
              collectionTitle={guest.collectionTitle}
              supportReference={guest.supportReference}
            />
          </Card>
        );
      }
    }
  }

  if (!user) {
    // Not a guest order: an account's purchase is only shown to that account.
    const returnUrl = sessionId ? `/checkout/return?session_id=${encodeURIComponent(sessionId)}` : "/account/collections";
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnUrl)}`);
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
            recipes={book?.recipes.map((recipe) => ({ slug: recipe.slug, title: recipe.title })) ?? []}
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
