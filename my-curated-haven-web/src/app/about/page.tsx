import Container from "@/components/layout/Container";
import Link from "next/link";

export default function About() {
  return (
    <Container reading className="py-8 sm:py-12">
      <p className="font-semibold text-text-muted">
        Recipes by Tiny Soho, inside My Curated Haven
      </p>
      <h1 className="mt-3 text-[2rem] font-semibold sm:text-5xl">My Curated Haven</h1>
      <p className="mt-4 text-lg">
        My Curated Haven is the product. It began as a parenting companion. Tiny Soho grew from that work as the place parents find toddler food ideas.
      </p>
      <p className="mt-4 text-lg text-text-muted">
        This website is the home for those recipes: simple toddler recipes for busy families. The recipe collection is in preparation. Parenting tools, accounts, and purchases are not part of the site yet.
      </p>
      <div className="mt-8 grid gap-4">
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-2xl font-semibold">The product</h2>
          <p className="mt-2 text-text-muted">
            My Curated Haven stays the name of the product and of mycuratedhaven.com.
          </p>
        </section>
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-2xl font-semibold">The recipes</h2>
          <p className="mt-2 text-text-muted">
            Tiny Soho is the content brand. Recipe pages will live here, inside My Curated Haven, when they are ready to publish.
          </p>
        </section>
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-2xl font-semibold">What is public now</h2>
          <p className="mt-2 text-text-muted">
            You can read this site and email support. There is no recipe library, no checkout, and no live chat.
          </p>
        </section>
      </div>
      <p className="mt-8 text-text-muted">
        Questions go to{" "}
        <Link href="/support" className="font-semibold text-action">
          Support
        </Link>
        . The{" "}
        <Link href="/privacy" className="font-semibold text-action">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="font-semibold text-action">
          Terms
        </Link>{" "}
        remain available and still need a review before any new account or payment data is collected.
      </p>
    </Container>
  );
}
