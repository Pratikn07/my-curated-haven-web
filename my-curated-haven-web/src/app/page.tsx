import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Container from "@/components/layout/Container";
import ButtonLink from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: {
    absolute: "My Curated Haven | Simple toddler recipes for busy families",
  },
  description:
    "Simple toddler recipes for busy families. Recipes by Tiny Soho, inside My Curated Haven. The recipe collection is in preparation.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Hero />
      <section className="pb-12">
        <Container reading>
          <h2 className="text-2xl font-semibold sm:text-3xl">What you can do today</h2>
          <p className="mt-3 text-lg text-text-muted">
            Recipe pages, accounts, and checkout are not available yet. If you have a question, email support. We will not ask you to buy anything from this site until a collection and its terms are ready.
          </p>
          <div className="mt-6">
            <ButtonLink href="/support" variant="secondary">
              Go to support
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
