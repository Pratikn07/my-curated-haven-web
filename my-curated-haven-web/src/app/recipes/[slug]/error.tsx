"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";

export default function RecipeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Unable to Load Recipe
      </h1>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        An error occurred while fetching the recipe details. Please try again or return to the recipes catalog.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button onClick={() => reset()}>
          Try again
        </Button>
        <Link
          href="/recipes"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border-control bg-surface px-6 py-3 font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2"
        >
          Back to recipes
        </Link>
      </div>
    </div>
  );
}
