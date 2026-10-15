import Image from "next/image";
import Link from "next/link";
import OpenBoughtRecipe from "@/components/commerce/OpenBoughtRecipe";
import PageEventTracker from "@/components/analytics/PageEventTracker";
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
  /** The book's recipes, so a parent who bought from a recipe page can go straight back to it. */
  recipes?: readonly { slug: string; title: string }[];
  /** The order's analytics reference, for purchase_confirmation_viewed; without one the screen sends nothing. */
  analyticsRef?: string | null;
}

/**
 * The first screen after paying: the book is theirs, and one button opens its page, every recipe unlocked.
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
  recipes: bookRecipes = [],
  analyticsRef = null,
}: PurchaseConfirmedProps) {
  const recipes = recipeCount ? `All ${recipeCount} recipes are` : "Every recipe is";
  return (
    <div data-track-ux="confirmation">
      {/* Sent on every showing; reports count distinct order_ref, so a reload is not a second sale. */}
      {analyticsRef ? (
        <PageEventTracker
          event="purchase_confirmation_viewed"
          payload={{ order_ref: analyticsRef, collection_slug: collectionSlug }}
        />
      ) : null}
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
      <OpenBoughtRecipe
        collectionSlug={collectionSlug}
        recipes={bookRecipes}
        openLabel={recipeCount ? `Open your ${recipeCount} recipes` : "Open your recipes"}
      />
      <p className="mt-6 text-sm text-text-muted">
        {email ? (
          <>
            Your recipes are saved to your account, <strong className="text-foreground">{email}</strong>. If you&apos;re ever
            signed out, sign in with that email to open them.
          </>
        ) : (
          <>
            Your recipes are saved in <Link href="/account/collections" className="underline hover:text-foreground" data-track-cta="library">My Library</Link>.
          </>
        )}
      </p>
      <p className="mt-4 text-xs text-text-muted">
        Order {supportReference} · {formattedAmount}. If you ever need help, quote this order number.
      </p>
    </div>
  );
}
