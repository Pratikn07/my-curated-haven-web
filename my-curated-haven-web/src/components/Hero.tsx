import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="w-full pt-12 pb-16 px-6 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 flex flex-col gap-6 text-center md:text-left">
          <p className="text-sm font-semibold tracking-wide text-foreground/70">
            Recipes by Tiny Soho, inside My Curated Haven
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight font-heading text-foreground">
            Simple toddler recipes for busy families
          </h1>
          <p className="text-xl text-foreground/70 max-w-lg mx-auto md:mx-0 leading-relaxed">
            The recipe collection is in preparation. Nothing on this site is for sale yet.
          </p>
          <div className="mt-2 flex justify-center md:justify-start">
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-foreground px-8 py-3 font-semibold text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Contact support
            </Link>
          </div>
        </div>

        <div className="flex-1 relative w-full max-w-md md:max-w-full">
          <div className="relative aspect-[4/5] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl">
            <Image
              src="/images/Homepage-image.png"
              alt="Parent and child together"
              fill
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
