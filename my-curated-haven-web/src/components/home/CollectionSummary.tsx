import type { HomepageRecipePresentationState } from "@/config/homepage-content";
import Container from "@/components/layout/Container";
import TrackedHomepageLink from "./TrackedHomepageLink";

export default function CollectionSummary({
  state,
}: {
  state: HomepageRecipePresentationState;
}) {
  if (state.mode !== "collection_ready") return null;

  return (
    <section id="recipe-collection" aria-labelledby="collection-summary-title" className="pb-14">
      <Container>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8">
          <p className="text-sm font-semibold text-accent-strong">Recipe collection</p>
          <h2 id="collection-summary-title" className="mt-2 text-2xl font-semibold">
            A collection from Tiny Soho
          </h2>
          <p className="mt-2 max-w-[65ch] text-text-muted">{state.collection.summary}</p>
          <TrackedHomepageLink
            href={state.collection.href}
            tracking={{
              type: "cta",
              destination: "collection_detail",
              placement: "final",
              presentationState: "collection_ready",
            }}
            className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-action px-5 py-3 font-semibold text-action-foreground hover:bg-action-hover"
          >
            View the recipe collection
          </TrackedHomepageLink>
        </div>
      </Container>
    </section>
  );
}
