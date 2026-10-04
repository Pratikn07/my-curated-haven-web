import { DoorOpen } from "lucide-react";
import Container from "@/components/layout/Container";
import TrackedHomepageLink from "@/components/home/TrackedHomepageLink";
import HouseExplorer, { type KitchenRecipeLink } from "@/components/house/HouseExplorer";
import HouseScene from "@/components/house/HouseScene";
import { HOMEPAGE_RECIPE_STATE } from "@/config/homepage-content";

/**
 * Homepage opening: what the site is, a headline that invites the visitor in, a hint to tap the house,
 * then the house with the way to recipes under it. Composed for phones first: at Instagram's in-app
 * size the open Kitchen's tag sits on the first screen.
 */
export default function HavenHero({ kitchenRecipes }: { kitchenRecipes: KitchenRecipeLink[] }) {
  return (
    <section id="house" tabIndex={-1} aria-labelledby="home-title" className="scroll-mt-20 outline-none">
      <Container className="grid gap-4 pt-4 pb-12 sm:gap-6 sm:pt-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12 lg:py-16">
        <div className="grid min-w-0 gap-3 lg:gap-6">
          <p className="text-text-muted">Free toddler recipes by Tiny Soho</p>
          <h1
            id="home-title"
            className="max-w-[16ch] font-display text-[2.05rem] leading-[1.05] font-light tracking-[-0.02em] sm:text-[3rem] lg:text-[4.2rem]"
          >
            Come in. The <em className="font-normal">kitchen&rsquo;s</em> open.
          </h1>
          <p className="hidden max-w-[44ch] text-lg text-text-muted lg:block">
            A calm corner for parents of little ones. Simple recipes now, with storybooks and more rooms on the way.
          </p>
          <p className="flex items-center gap-2 font-semibold">
            <DoorOpen aria-hidden="true" size={20} strokeWidth={1.9} className="shrink-0 text-action" />
            Tap a room to step inside
          </p>
        </div>
        <HouseExplorer
          scene={<HouseScene />}
          kitchenRecipes={kitchenRecipes}
          after={
            <TrackedHomepageLink
              href="/recipes"
              tracking={{
                type: "cta",
                destination: "recipes_index",
                placement: "hero",
                presentationState: HOMEPAGE_RECIPE_STATE.mode,
              }}
              className="inline-flex min-h-12 items-center justify-center justify-self-start rounded-xl bg-action px-5 py-3 font-semibold text-action-foreground hover:bg-action-hover"
            >
              Browse recipes
            </TrackedHomepageLink>
          }
        />
      </Container>
    </section>
  );
}
