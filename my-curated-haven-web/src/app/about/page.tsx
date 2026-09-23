import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-6 sm:px-8 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold tracking-wide text-foreground/70 mb-4">
            Recipes by Tiny Soho, inside My Curated Haven
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold text-foreground mb-6 font-heading">
            My Curated Haven
          </h1>
          <p className="text-xl text-foreground/70 leading-relaxed mb-6">
            My Curated Haven is the product. It began as a parenting companion. Tiny Soho grew from that work as the place parents find toddler food ideas.
          </p>
          <p className="text-lg text-foreground/70 leading-relaxed mb-10">
            This website is the home for those recipes: simple toddler recipes for busy families. The recipe collection is in preparation. Parenting tools, accounts, and purchases are not part of the site yet.
          </p>

          <div className="grid gap-6">
            <section className="rounded-3xl bg-white border border-primary/10 p-6">
              <h2 className="text-2xl font-bold font-heading mb-2">The product</h2>
              <p className="text-foreground/70 leading-relaxed">
                My Curated Haven stays the name of the product and of mycuratedhaven.com.
              </p>
            </section>
            <section className="rounded-3xl bg-white border border-primary/10 p-6">
              <h2 className="text-2xl font-bold font-heading mb-2">The recipes</h2>
              <p className="text-foreground/70 leading-relaxed">
                Tiny Soho is the content brand. Recipe pages will live here, inside My Curated Haven, when they are ready to publish.
              </p>
            </section>
            <section className="rounded-3xl bg-white border border-primary/10 p-6">
              <h2 className="text-2xl font-bold font-heading mb-2">What is public now</h2>
              <p className="text-foreground/70 leading-relaxed">
                You can read this site and email support. There is no recipe library, no checkout, and no live chat.
              </p>
            </section>
          </div>

          <p className="mt-10 text-foreground/70">
            Questions go to{" "}
            <Link href="/support" className="font-semibold text-foreground underline underline-offset-4">
              Support
            </Link>
            . The{" "}
            <Link href="/privacy" className="font-semibold text-foreground underline underline-offset-4">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-foreground underline underline-offset-4">
              Terms
            </Link>{" "}
            remain available and still need a review before any new account or payment data is collected.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
