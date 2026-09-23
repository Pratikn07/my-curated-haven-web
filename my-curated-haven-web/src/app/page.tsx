import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import Link from "next/link";

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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <section className="px-6 sm:px-8 pb-24">
          <div className="max-w-3xl mx-auto rounded-3xl bg-white border border-primary/10 px-6 py-10 sm:px-10 text-center">
            <h2 className="text-3xl font-bold font-heading text-foreground mb-4">
              What you can do today
            </h2>
            <p className="text-lg text-foreground/70 leading-relaxed mb-6">
              Recipe pages, accounts, and checkout are not available yet. If you have a question, email support. We will not ask you to buy anything from this site until a collection and its terms are ready.
            </p>
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center justify-center font-semibold text-foreground underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground rounded-sm"
            >
              Go to support
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
