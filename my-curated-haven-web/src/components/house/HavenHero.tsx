import Container from "@/components/layout/Container";
import TrackedHomepageLink from "@/components/home/TrackedHomepageLink";
import HouseExplorer, { type KitchenRecipeLink } from "@/components/house/HouseExplorer";
import HouseScene from "@/components/house/HouseScene";
import { HOMEPAGE_RECIPE_STATE } from "@/config/homepage-content";

/** Homepage opening: the headline, a direct way to recipes, and the house. Composed for phones first. */
export default function HavenHero({ kitchenRecipes }: { kitchenRecipes: KitchenRecipeLink[] }) {
  return (
    <section id="house" tabIndex={-1} aria-labelledby="home-title" className="scroll-mt-20 outline-none">
      <Container className="grid gap-6 pt-5 pb-12 sm:pt-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12 lg:py-16">
        <div className="grid min-w-0 gap-4 lg:gap-6">
          <p className="text-text-muted">A little room to pause.</p>
          <h1
            id="home-title"
            className="max-w-[13ch] font-display text-[2.6rem] leading-[1.02] font-light tracking-[-0.02em] sm:text-[3.4rem] lg:text-[4.6rem]"
          >
            Good enough is <em className="font-normal">exactly</em> enough.
          </h1>
          <p className="hidden max-w-[44ch] text-lg text-text-muted lg:block">
            A calm corner for parents of little ones. Simple recipes now, with storybooks and more rooms on the way.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <TrackedHomepageLink
              href="/recipes"
              tracking={{
                type: "cta",
                destination: "recipes_index",
                placement: "hero",
                presentationState: HOMEPAGE_RECIPE_STATE.mode,
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action px-5 py-3 font-semibold text-action-foreground hover:bg-action-hover"
            >
              Browse recipes
            </TrackedHomepageLink>
            <TrackedHomepageLink
              href="#library"
              tracking={{
                type: "cta",
                destination: "previews",
                placement: "hero",
                presentationState: HOMEPAGE_RECIPE_STATE.mode,
              }}
              className="inline-flex min-h-12 items-center font-semibold text-action underline decoration-1 underline-offset-[6px]"
            >
              See what&apos;s coming
            </TrackedHomepageLink>
          </div>
        </div>
        <HouseExplorer scene={<HouseScene />} kitchenRecipes={kitchenRecipes} />
      </Container>
    </section>
  );
}
