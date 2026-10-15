"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { forgetBoughtFrom, recallBoughtFrom } from "@/lib/recipes/bought-from";

interface OpenBoughtRecipeProps {
  collectionSlug: string;
  /** The book's recipes; the remembered slug must be one of them. */
  recipes: readonly { slug: string; title: string }[];
  openLabel: string;
}

const BUTTON =
  "mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-action px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-action-hover sm:w-auto";

/**
 * "Open your 20 recipes" on the book's page, or, when the parent bought from a recipe page in this browser, that
 * recipe: it opens with the reveal (?opened=1). Rendered first as the book link, so it works before and without script.
 */
export default function OpenBoughtRecipe({ collectionSlug, recipes, openLabel }: OpenBoughtRecipeProps) {
  const [recipe, setRecipe] = useState<{ slug: string; title: string } | null>(null);

  useEffect(() => {
    const slug = recallBoughtFrom(collectionSlug, recipes.map((entry) => entry.slug));
    const match = slug ? recipes.find((entry) => entry.slug === slug) : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage after hydration
    if (match) setRecipe(match);
  }, [collectionSlug, recipes]);

  const book = `/collections/${collectionSlug}`;
  if (!recipe) {
    return (
      <Link href={book} className={BUTTON} data-track-cta="open_collection">
        <span>{openLabel}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    );
  }
  return (
    <>
      <Link href={`/recipes/${recipe.slug}?opened=1`} className={BUTTON} onClick={forgetBoughtFrom} data-track-cta="open_recipe">
        <span>Open {recipe.title}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
      <p className="mt-3 text-sm">
        <Link href={book} className="font-semibold text-action underline underline-offset-4 hover:text-action-hover" data-track-cta="open_collection">
          Or see all your recipes
        </Link>
      </p>
    </>
  );
}
