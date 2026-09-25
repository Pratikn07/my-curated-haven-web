import { BookOpen, MessageCircle, ShoppingBag, Sprout } from "lucide-react";
import { HOME_PILLARS, HOMEPAGE_RECIPE_STATE } from "@/config/homepage-content";
import Container from "@/components/layout/Container";
import TrackedHomepageLink from "./TrackedHomepageLink";

const icons = {
  recipes: BookOpen,
  chat: MessageCircle,
  shop: ShoppingBag,
  bloom: Sprout,
};

export default function PillarOverview() {
  return (
    <section id="explore-haven" aria-labelledby="explore-haven-title" className="bg-surface-muted py-12 sm:py-16">
      <Container>
        <div className="max-w-2xl">
          <h2 id="explore-haven-title" className="text-3xl font-semibold sm:text-4xl">
            Meet My Curated Haven
          </h2>
          <p className="mt-3 max-w-[65ch] text-lg text-text-muted">
            A parenting companion taking shape around food, everyday questions, thoughtful finds and the moments in between.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_PILLARS.map((pillar) => {
            const isRecipe = pillar.key === "recipes";
            const Icon = icons[pillar.key];
            const content = (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-accent-strong">
                  <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
                </span>
                <span className="mt-4 block text-xl font-semibold text-foreground">{pillar.label}</span>
                <span className="mt-1 block text-sm leading-6 text-text-muted">{pillar.description}</span>
                <span className="mt-4 block text-sm font-semibold text-accent-strong">
                  {isRecipe
                    ? HOMEPAGE_RECIPE_STATE.mode === "preparation"
                      ? "Recipe plan"
                      : "Available"
                    : "Planned for the web"}
                </span>
              </>
            );

            return (
              <article key={pillar.key} className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
                {isRecipe ? (
                  <TrackedHomepageLink
                    href={pillar.href}
                    tracking={{
                      type: "cta",
                      destination: "recipes_index",
                      placement: "overview",
                      presentationState: HOMEPAGE_RECIPE_STATE.mode,
                    }}
                    className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action"
                  >
                    {content}
                  </TrackedHomepageLink>
                ) : (
                  <TrackedHomepageLink
                    href={pillar.href}
                    tracking={{ type: "preview", featureKey: pillar.key, placement: "overview" }}
                    aria-label={`Preview ${pillar.label}`}
                    className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action"
                  >
                    {content}
                  </TrackedHomepageLink>
                )}
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
