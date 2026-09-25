import { Leaf, MessageCircle, Moon, Puzzle, ShoppingBasket, Sprout } from "lucide-react";
import {
  HOME_FEATURE_PREVIEWS,
  HOMEPAGE_RECIPE_STATE,
} from "@/config/homepage-content";
import Container from "@/components/layout/Container";
import TrackedHomepageLink from "./TrackedHomepageLink";

type Feature = (typeof HOME_FEATURE_PREVIEWS)[number];

function PreviewIllustration({ feature }: { feature: Feature }) {
  if (feature.key === "chat") {
    return (
      <figure className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6">
        <figcaption className="flex items-center justify-between gap-3 border-b border-border pb-3 text-sm font-semibold">
          <span className="inline-flex items-center gap-2"><MessageCircle aria-hidden="true" size={18} /> Sample conversation</span>
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-accent-strong">Static example</span>
        </figcaption>
        <div className="grid gap-3 pt-4">
          <p className="max-w-[88%] justify-self-start rounded-2xl rounded-bl-sm bg-surface-muted px-4 py-3 text-sm">
            What could make mealtime feel calmer?
          </p>
          <p className="max-w-[88%] justify-self-end rounded-2xl rounded-br-sm bg-[#e9efe5] px-4 py-3 text-sm">
            A gentle routine can make the next meal feel more predictable.
          </p>
        </div>
        <p className="mt-4 text-xs text-text-muted">Illustrative text only. This is not a live conversation or guidance service.</p>
      </figure>
    );
  }

  if (feature.key === "shop") {
    const categories = [
      { name: "Feeding", icon: ShoppingBasket },
      { name: "Sleep", icon: Moon },
      { name: "Play", icon: Puzzle },
    ];
    return (
      <figure className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6">
        <figcaption className="flex items-center justify-between gap-3 border-b border-border pb-3 text-sm font-semibold">
          <span className="inline-flex items-center gap-2"><ShoppingBasket aria-hidden="true" size={18} /> Illustrative categories</span>
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-accent-strong">No products for sale</span>
        </figcaption>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {categories.map(({ name, icon: Icon }) => (
            <div key={name} className="flex min-h-28 flex-col justify-between rounded-xl bg-surface-muted p-4">
              <Icon aria-hidden="true" size={22} strokeWidth={1.7} className="text-accent-strong" />
              <span className="font-semibold">{name}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-text-muted">Category ideas only. No product listings, retailer links or checkout are available here.</p>
      </figure>
    );
  }

  return (
    <figure className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6">
      <figcaption className="flex items-center justify-between gap-3 border-b border-border pb-3 text-sm font-semibold">
        <span className="inline-flex items-center gap-2"><Sprout aria-hidden="true" size={18} /> Sample milestone</span>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-accent-strong">Synthetic example</span>
      </figcaption>
      <div className="mt-4 rounded-xl bg-[#e9efe5] p-5 sm:p-7">
        <p className="text-sm font-semibold text-accent-strong">A small moment worth remembering</p>
        <p className="mt-3 max-w-md font-brand text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
          Tried two bites of pear today.
        </p>
        <div className="mt-6 flex items-center gap-3 border-t border-accent-strong/20 pt-4 text-sm text-text-muted">
          <Leaf aria-hidden="true" size={18} className="text-accent-strong" />
          <span>Small moments count.</span>
        </div>
      </div>
      <p className="mt-4 text-xs text-text-muted">A made-up example for this preview. It does not contain a real child&apos;s information.</p>
    </figure>
  );
}

function PreviewSection({ feature }: { feature: Feature }) {
  return (
    <section
      id={feature.id}
      aria-labelledby={`${feature.id}-title`}
      data-homepage-preview={feature.key}
      className="scroll-mt-28 border-t border-border py-12 sm:py-16"
    >
      <Container className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className={feature.key === "shop" ? "lg:order-2" : ""}>
          <p className="inline-flex rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-accent-strong">
            Planned for the web
          </p>
          <h3 id={`${feature.id}-title`} className="mt-4 max-w-xl text-3xl font-semibold sm:text-4xl">
            {feature.heading}
          </h3>
          <p className="mt-4 max-w-[65ch] text-lg text-text-muted">{feature.summary}</p>
          <p className="mt-4 max-w-[65ch] text-sm text-text-muted">{feature.caption}</p>
          <TrackedHomepageLink
            href="#recipes"
            tracking={{ type: "cta", destination: "recipes_index", placement: "preview", presentationState: HOMEPAGE_RECIPE_STATE.mode }}
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4"
          >
            Back to recipes
          </TrackedHomepageLink>
        </div>
        <div className={feature.key === "shop" ? "lg:order-1" : ""}>
          <PreviewIllustration feature={feature} />
        </div>
      </Container>
    </section>
  );
}

export function WhatsAhead() {
  return (
    <section aria-labelledby="whats-ahead-title" className="bg-surface-muted pt-14 sm:pt-20">
      <Container>
        <div id="whats-ahead" tabIndex={-1} className="scroll-mt-28 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action">
          <h2 id="whats-ahead-title" className="max-w-2xl text-3xl font-semibold sm:text-4xl">
            What&apos;s ahead
          </h2>
          <p className="mt-3 max-w-[65ch] text-lg text-text-muted">
            Recipes are the starting point. The sections below are static previews of ideas being explored for the web, not features you can use today.
          </p>
        </div>
      </Container>
      {HOME_FEATURE_PREVIEWS.map((feature) => <PreviewSection key={feature.key} feature={feature} />)}
    </section>
  );
}
