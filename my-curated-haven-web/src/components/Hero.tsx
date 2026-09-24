import Image from "next/image";
import Container from "@/components/layout/Container";
import { HOMEPAGE_RECIPE_STATE } from "@/config/homepage-content";
import TrackedHomepageLink from "@/components/home/TrackedHomepageLink";

export default function Hero() {
  const isPreparation = HOMEPAGE_RECIPE_STATE.mode === "preparation";

  return (
    <Container className="grid items-center gap-8 py-8 sm:py-12 lg:grid-cols-2 lg:gap-12 lg:py-16">
      <div className="grid gap-4">
        <h1 className="max-w-[14ch] text-[2.5rem] font-semibold leading-[1.08] sm:text-5xl">
          A little more support for everyday parenting.
        </h1>
        <p className="max-w-[58ch] text-lg text-text-muted sm:text-xl">
          {isPreparation
            ? "We're starting with toddler recipes from Tiny Soho. The recipe collection is in preparation."
            : "My Curated Haven brings together toddler recipes and thoughtful ideas for everyday parenting."}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <TrackedHomepageLink
            href={isPreparation ? "#recipes" : "/recipes"}
            tracking={{
              type: "cta",
              destination: "recipes_index",
              placement: "hero",
              presentationState: HOMEPAGE_RECIPE_STATE.mode,
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action px-5 py-3 font-semibold text-action-foreground hover:bg-action-hover"
          >
            {isPreparation ? "See the recipe plan" : "Explore free recipes"}
          </TrackedHomepageLink>
          <TrackedHomepageLink
            href="#whats-ahead"
            tracking={{
              type: "cta",
              destination: "previews",
              placement: "hero",
              presentationState: HOMEPAGE_RECIPE_STATE.mode,
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border-control bg-surface px-5 py-3 font-semibold text-foreground hover:bg-surface-muted"
          >
            See what&apos;s ahead
          </TrackedHomepageLink>
        </div>
      </div>
      <div className="relative aspect-[4/5] max-h-[30rem] overflow-hidden rounded-[var(--radius-card)] bg-surface-muted lg:max-h-[36rem]">
        <Image
          src="/images/homepage/homepage-hero.webp"
          alt="Parent and child together"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, (min-width: 640px) 80vw, 100vw"
          className="object-cover"
        />
      </div>
    </Container>
  );
}
