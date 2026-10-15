import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getPublishedCollection } from "@/lib/collections/publication";
import PageEventTracker from "@/components/analytics/PageEventTracker";
import { isTrackingSlug } from "@/lib/analytics/schema";

export const metadata: Metadata = {
  title: "Checkout cancelled",
  robots: { index: false, follow: false },
};

interface CancelPageProps {
  /** `book` is the collection slug Stripe's cancel link carries; older checkouts sent only an order id. */
  searchParams: Promise<{ book?: string }>;
}

/** Where a parent lands after leaving Stripe's page without paying: back to the book they were buying. */
export default async function CheckoutCancelPage({ searchParams }: CancelPageProps) {
  const { book: slug } = await searchParams;
  const book = slug ? await getPublishedCollection(slug).then((found) => found?.collection ?? null).catch(() => null) : null;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
      {/* The address is typed or forwarded by anyone, so it names the book only when it is a well-formed slug. */}
      <PageEventTracker event="checkout_cancelled" payload={isTrackingSlug(slug) ? { collection_slug: slug } : {}} />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Checkout cancelled</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Your payment was not completed and you have not been charged.
          {book ? ` ${book.title} is there whenever you are ready.` : " The books are there whenever you are ready."}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={book ? `/collections/${book.slug}` : "/collections"}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover"
          >
            <BookOpen className="h-4 w-4" />
            <span>{book ? `Back to ${book.title}` : "See the books"}</span>
          </Link>
          <Link
            href="/recipes"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-foreground hover:bg-surface-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Free recipes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
