import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Checkout Cancelled | My Curated Haven",
  robots: { index: false, follow: false },
};

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Checkout Cancelled</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Your payment was not completed and you have not been charged.
          You can return to the collection whenever you are ready.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/recipes"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-6 py-3 font-semibold text-white hover:bg-action-hover"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Browse Recipes</span>
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-foreground hover:bg-surface-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
