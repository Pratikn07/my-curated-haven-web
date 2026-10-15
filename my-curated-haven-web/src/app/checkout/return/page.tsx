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
import { claimGuestOrders, isMockCheckoutSession, loadGuestCheckout, type GuestCheckout } from "@/lib/payments/guest-checkout";
import { SUPPORT_EMAIL } from "@/config/site-navigation";

export const metadata: Metadata = {
  title: "Checkout Status",
  robots: { index: false, follow: false },
};

interface ReturnPageProps {
  searchParams: Promise<{ session_id?: string }>;
}

const BUTTON = "inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover";

function SupportLink() {
  return (
    <a className="font-semibold text-foreground underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
      {SUPPORT_EMAIL}
    </a>
  );
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
      // A signed-out parent who just paid must not be sent to sign in with no word of their payment.
      if (!user) {
        return (
          <Card>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-10 w-10 text-amber-600 animate-pulse" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-foreground">We&apos;re checking your payment</h1>
            <p className="mt-2 text-sm text-text-muted">
              We couldn&apos;t load it just now. If you paid, nothing is lost: refresh in a moment. Still stuck? Email{" "}
              <SupportLink /> from the address you paid with.
            </p>
            <div className="mt-6">
              <Link href={`/checkout/return?session_id=${encodeURIComponent(sessionId)}`} className={BUTTON}>
                Refresh
              </Link>
            </div>
          </Card>
        );
      }
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
          // Only a local mock session has no Stripe page to collect the email. A real payment without an email on
          // record needs a person, never the test form.
          if (isMockCheckoutSession(sessionId)) return <Card><MockCheckoutEmailForm sessionId={sessionId} /></Card>;
          return (
            <Card>
              <h1 className="text-2xl font-bold text-foreground">Your payment went through</h1>
              <p className="mt-2 text-sm text-text-muted">
                We couldn&apos;t read the email from your payment, so we can&apos;t send your code yet. Email <SupportLink /> with
                order {guest.supportReference} and we&apos;ll add {guest.collectionTitle} to your account.
              </p>
            </Card>
          );
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
              collectionSlug={guest.collectionSlug}
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
        <h1 className="text-2xl font-bold text-foreground">We couldn&apos;t find that checkout</h1>
        <p className="mt-2 text-sm text-text-muted">
          If you just paid, your book is in My Library.
        </p>
        <div className="mt-6">
          <Link href="/account/collections" className={BUTTON}>
            Go to My Library
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
        <h1 className="mt-4 text-2xl font-bold text-foreground">We couldn&apos;t find this order in your account</h1>
        <p className="mt-2 text-sm text-text-muted">
          If you were charged, email us from the address you paid with and we&apos;ll find it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/recipes"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-6 py-3 font-semibold text-foreground hover:bg-surface-muted"
          >
            Browse free recipes
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-surface-muted px-6 py-3 font-semibold text-foreground border border-border hover:bg-surface"
          >
            Email support
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
            analyticsRef={orderSummary.analyticsRef}
          />
        ) : (
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-10 w-10 text-amber-600 animate-pulse" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-foreground">Payment received. Getting your book ready</h1>
            <p className="mt-2 text-sm text-text-muted">
              We received your payment for {orderSummary.collectionTitle} and are adding it to your library. This usually takes a few seconds.
            </p>

            <div className="mt-6">
              <Link
                href={`/checkout/return?session_id=${encodeURIComponent(sessionId)}`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover"
              >
                Refresh
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
