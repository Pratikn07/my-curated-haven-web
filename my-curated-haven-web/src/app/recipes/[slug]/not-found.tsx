import Link from "next/link";

export default function RecipeNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Recipe Not Found
      </h1>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        We couldn&rsquo;t find the recipe you&rsquo;re looking for. It may have been updated, moved, or is not currently available for free public viewing.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/recipes"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action px-6 py-3 font-semibold text-action-foreground hover:bg-action-hover focus-visible:outline-2"
        >
          Browse free recipes
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border-control bg-surface px-6 py-3 font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
