import Image from "next/image";
import ButtonLink from "@/components/ui/ButtonLink";
import Container from "@/components/layout/Container";

export default function Hero() {
  return (
    <Container className="grid items-center gap-8 py-8 md:grid-cols-2 md:py-12">
      <div className="grid gap-4">
        <p className="font-semibold text-text-muted">
          Recipes by Tiny Soho, inside My Curated Haven
        </p>
        <h1 className="text-[2rem] font-semibold sm:text-5xl">
          Simple toddler recipes for busy families
        </h1>
        <p className="max-w-[65ch] text-lg text-text-muted">
          The recipe collection is in preparation. Nothing on this site is for sale yet.
        </p>
        <div>
          <ButtonLink href="/support">Contact support</ButtonLink>
        </div>
      </div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-surface-muted">
        <Image
          src="/images/Homepage-image.png"
          alt="Parent and child together"
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </Container>
  );
}
