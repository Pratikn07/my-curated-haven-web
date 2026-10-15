import Link from "next/link";
import type { HomepageRecipePresentationState } from "@/config/homepage-content";
import Container from "@/components/layout/Container";

export default function CollectionSummary({
  state,
}: {
  state: HomepageRecipePresentationState;
}) {
  if (state.mode !== "collection_ready") return null;

  return (
    <section id="recipe-collection" aria-labelledby="collection-summary-title" className="pb-14" data-track-ux="collection_band">
      <Container>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8">
          <p className="text-sm font-semibold text-accent-strong">Recipe collection</p>
          <h2 id="collection-summary-title" className="mt-2 text-2xl font-semibold">
            A collection from Tiny Soho
          </h2>
          <p className="mt-2 max-w-[65ch] text-text-muted">{state.collection.summary}</p>
          <Link
            href={state.collection.href}
            className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-action px-5 py-3 font-semibold text-action-foreground hover:bg-action-hover"
            data-track-cta="see_collection"
          >
            View the recipe collection
          </Link>
        </div>
      </Container>
    </section>
  );
}
