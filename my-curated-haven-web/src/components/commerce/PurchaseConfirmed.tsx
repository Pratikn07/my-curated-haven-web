import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { bookNameStart } from "@/lib/collections/book-name";

export interface PurchaseConfirmedProps {
  collectionSlug: string;
  collectionTitle: string;
  /** Recipes in the book, when the storefront knows them; the wording drops the number otherwise. */
  recipeCount: number | null;
  cover: { src: string; width: number; height: number; alt: string } | null;
  supportReference: string;
  formattedAmount: string;
  /** The signed-in email, so a parent who later opens the site in another browser knows how to get back in. */
  email: string | null;
}

/**
 * The first screen after paying: the book is theirs, and one button opens its recipes in the library.
 * Most buyers arrive from Instagram's in-app browser, so it also says how to find the book again elsewhere.
 */
export default function PurchaseConfirmed({
  collectionSlug,
  collectionTitle,
  recipeCount,
  cover,
  supportReference,
  formattedAmount,
  email,
}: PurchaseConfirmedProps) {
  const recipes = recipeCount ? `All ${recipeCount} recipes are` : "Every recipe is";
  return (
    <div>
      {cover ? (
        <Image
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          sizes="8.5rem"
          priority
          className="mx-auto h-auto w-[8.5rem] -rotate-3 drop-shadow-lg"
        />
      ) : null}
      <h1 className="mt-6 text-3xl font-extrabold text-foreground">You&apos;re in.</h1>
      <p className="mx-auto mt-2 max-w-sm text-base text-text-muted">
        <strong className="text-foreground">{bookNameStart(collectionTitle)}</strong> is yours. {recipes} ready when you are.
      </p>
      <Link
        href={`/account/collections#${collectionSlug}`}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-action px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-action-hover sm:w-auto"
      >
        <span>{recipeCount ? `Open your ${recipeCount} recipes` : "Open your recipes"}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <p className="mt-6 text-sm text-text-muted">
        {email ? (
          <>
            Your recipes are saved to your account, <strong className="text-foreground">{email}</strong>. If you&apos;re ever
            signed out, sign in with that email to open them.
          </>
        ) : (
          <>
            Your recipes are saved in <Link href="/account/collections" className="underline hover:text-foreground">My Library</Link>.
          </>
        )}
      </p>
      <p className="mt-4 text-xs text-text-muted">
        Order {supportReference} · {formattedAmount}. If you ever need help, quote this order number.
      </p>
    </div>
  );
}
