import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserPurchasedCollections } from "@/lib/payments/repository";
import { claimGuestOrders } from "@/lib/payments/guest-checkout";
import Badge from "@/components/ui/Badge";
import StatePanel from "@/components/ui/StatePanel";
import { BookOpen, ArrowRight, ListChecks } from "lucide-react";
import { makeAheadPlanFor } from "@/config/halloween";
import PurchasedLibraryTracker from "@/components/commerce/PurchasedLibraryTracker";

export const metadata: Metadata = {
  title: "My Library",
  robots: { index: false, follow: false },
};

export default async function AccountCollectionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?returnTo=/account/collections");
  }

  let collections: Awaited<ReturnType<typeof getUserPurchasedCollections>> = [];
  let unavailable = false;
  try {
    // Pay first: a purchase made before signing in with this email shows up here too (the claim never throws).
    await claimGuestOrders(user.id);
    collections = await getUserPurchasedCollections(user.id);
  } catch (error) {
    // Don't show "no purchases" when we simply couldn't check (R8-05).
    unavailable = true;
    console.error("[account/collections] purchases unavailable", error instanceof Error ? error.message : error);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8" data-track-ux="library">
      {/* Header */}
      <header className="mb-8">
        <nav aria-label="Breadcrumb" className="mb-4" data-track-ux="breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-text-muted">
            <li>
              <Link href="/account" className="hover:text-foreground hover:underline">
                Account
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-foreground">
              My Library
            </li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          My Library
        </h1>
        <p className="mt-2 text-base text-text-muted">
          The recipe books you bought, ready to read and print.
        </p>
      </header>

      {/* Purchased Collections Listing */}
      {unavailable ? (
        <StatePanel title="Purchases are unavailable right now">
          We couldn&apos;t load your books. Please try again later, or email support@mycuratedhaven.com.
        </StatePanel>
      ) : collections.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted">
            <BookOpen className="h-7 w-7 text-text-muted" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">
            No books yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            When you buy a recipe book, it appears here. You can read and print it any time.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/recipes"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover"
            >
              Explore Free Recipes
            </Link>
            <Link
              href="/collections"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-foreground hover:bg-surface-muted"
            >
              Browse Collections
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <PurchasedLibraryTracker />
          {/* One card per book; its page lists every recipe, so the library doesn't repeat them. */}
          {collections.map((coll) => {
            const plan = makeAheadPlanFor(coll.slug);
            return (
              <div
                key={coll.collectionId}
                id={coll.slug}
                className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge variant="collection">Yours to keep</Badge>
                    <h2 className="mt-2 text-2xl font-bold text-foreground">
                      {coll.title}
                    </h2>
                    <p className="mt-1 text-sm text-text-muted max-w-2xl">
                      {coll.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/collections/${coll.slug}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-action-hover"
                      data-track-cta="open_collection"
                    >
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      <span>Open Collection</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    {/* Halloween only: the plan that comes with the book. */}
                    {plan ? (
                      <Link
                        href={plan.path}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-muted"
                        data-track-cta="see_plan"
                      >
                        <ListChecks className="h-4 w-4 text-action" aria-hidden="true" />
                        <span>{plan.libraryLink}</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
