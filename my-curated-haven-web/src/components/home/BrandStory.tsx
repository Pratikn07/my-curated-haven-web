import Link from "next/link";
import Container from "@/components/layout/Container";

export default function BrandStory() {
  return (
    <section id="our-story" aria-labelledby="our-story-title" className="py-14 sm:py-20">
      <Container className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <div>
          <h2 id="our-story-title" className="max-w-sm text-3xl font-semibold sm:text-4xl">
            Meet Nibble &amp; Nurture
          </h2>
        </div>
        <div className="max-w-[65ch]">
          <p className="text-xl leading-relaxed">
            Nibble &amp; Nurture is the company behind My Curated Haven. My Curated Haven began as a parenting companion, and Tiny Soho grew from that work as a place for toddler food ideas.
          </p>
          <p className="mt-4 text-lg text-text-muted">
            The recipe collection is the first part being prepared for this website. The other areas here are ideas for the web, shown as static previews.
          </p>
          <Link href="/about" className="mt-5 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4">
            Read more about Nibble &amp; Nurture
          </Link>
        </div>
      </Container>
    </section>
  );
}
