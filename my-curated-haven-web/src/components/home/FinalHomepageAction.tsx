import { HOMEPAGE_RECIPE_STATE } from "@/config/homepage-content";
import Container from "@/components/layout/Container";
import TrackedHomepageLink from "./TrackedHomepageLink";

export default function FinalHomepageAction() {
  const isPreparation = HOMEPAGE_RECIPE_STATE.mode === "preparation";
  return (
    <section aria-labelledby="homepage-next-step-title" className="py-14 sm:py-20">
      <Container>
        <div className="flex flex-col gap-6 rounded-[var(--radius-card)] bg-[#f4f1de] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="max-w-2xl">
            <h2 id="homepage-next-step-title" className="text-2xl font-semibold sm:text-3xl">
              {isPreparation ? "We're starting with recipes." : "Find a recipe to make."}
            </h2>
            <p className="mt-2 text-text-muted">
              {isPreparation
                ? "See what's being prepared for the first part of My Curated Haven."
                : "Browse the public toddler recipe collection by Tiny Soho."}
            </p>
          </div>
          <TrackedHomepageLink
            href={isPreparation ? "#recipes" : "/recipes"}
            tracking={{
              type: "cta",
              destination: "recipes_index",
              placement: "final",
              presentationState: HOMEPAGE_RECIPE_STATE.mode,
            }}
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-action px-5 py-3 font-semibold text-action-foreground hover:bg-action-hover"
          >
            {isPreparation ? "See the recipe plan" : "Explore free recipes"}
          </TrackedHomepageLink>
        </div>
      </Container>
    </section>
  );
}
