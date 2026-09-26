import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserPurchasedCollections } from "@/lib/payments/repository";
import Badge from "@/components/ui/Badge";
import StatePanel from "@/components/ui/StatePanel";
import { BookOpen, ShoppingBag, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "My Recipe Collections",
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
    collections = await getUserPurchasedCollections(user.id);
  } catch (error) {
    // Don't show "no purchases" when we simply couldn't check (R8-05).
    unavailable = true;
    console.error("[account/collections] purchases unavailable", error instanceof Error ? error.message : error);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-2 text-sm text-text-muted">
            <li>
              <Link href="/account" className="hover:text-foreground hover:underline">
                Account
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-foreground">
              Purchased Collections
            </li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          My Recipe Collections
        </h1>
        <p className="mt-2 text-base text-text-muted">
          Your purchased recipe collections and printable views.
        </p>
      </header>

      {/* Purchased Collections Listing */}
      {unavailable ? (
        <StatePanel title="Purchases are unavailable right now">
          We couldn&apos;t load your recipe collections. Please try again later, or email support@mycuratedhaven.com.
        </StatePanel>
      ) : collections.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted">
            <BookOpen className="h-7 w-7 text-text-muted" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">
            No Purchased Collections Yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            When you purchase a curated collection, it will appear here with unlimited reading and printing access.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/recipes"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover"
            >
              Explore Free Recipes
            </Link>
            <Link
              href="/collections/comfort-haven-collection"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-foreground hover:bg-surface-muted"
            >
              Browse Collections
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {collections.map((coll) => (
            <div
              key={coll.collectionId}
              className="overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="collection">Active Access</Badge>
                    <span className="text-xs text-text-muted">Release v{coll.releaseVersion}</span>
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-foreground">
                    {coll.title}
                  </h2>
                  <p className="mt-1 text-sm text-text-muted max-w-2xl">
                    {coll.summary}
                  </p>
                </div>

                <Link
                  href={`/collections/${coll.slug}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-action-hover"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Open Collection</span>
                </Link>
              </div>

              {/* Recipe List */}
              <div className="mt-6 border-t border-border pt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
                  Included Recipes ({coll.recipes.length})
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {coll.recipes.map((recipe) => (
                    <Link
                      key={recipe.id}
                      href={`/recipes/${recipe.slug}`}
                      className="group flex items-center justify-between rounded-xl border border-border bg-surface-muted p-3 transition hover:border-action/40 hover:bg-surface"
                    >
                      <span className="truncate text-sm font-medium text-foreground group-hover:text-action">
                        {recipe.title}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-text-muted group-hover:text-action" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
