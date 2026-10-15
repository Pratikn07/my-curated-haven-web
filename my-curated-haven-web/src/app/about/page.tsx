import Container from "@/components/layout/Container";
import Link from "next/link";

export default function About() {
  return (
    <Container reading className="py-8 sm:py-12" trackUx="static_page">
      <p className="font-semibold text-text-muted">
        About Nibble &amp; Nurture
      </p>
      <h1 className="mt-3 text-[2rem] font-semibold sm:text-5xl">Nibble &amp; Nurture</h1>
      <p className="mt-4 text-lg">
        Nibble &amp; Nurture is the company behind the My Curated Haven parenting product and the Tiny Soho recipe brand.
      </p>
      <p className="mt-4 text-lg text-text-muted">
        This website is the home for those recipes: simple toddler recipes for busy families. Some are free to read and print; the rest come in recipe collections you buy once. Other parenting tools are not part of the website yet.
      </p>
      <div className="mt-8 grid gap-4">
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-2xl font-semibold">The product</h2>
          <p className="mt-2 text-text-muted">
            My Curated Haven is our parenting product. Its website address remains mycuratedhaven.com.
          </p>
        </section>
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-2xl font-semibold">The recipes</h2>
          <p className="mt-2 text-text-muted">
            Tiny Soho is the recipe brand. Its recipes live here on the{" "}
            <Link href="/recipes" className="font-semibold text-action">
              Recipes
            </Link>{" "}
            page.
          </p>
        </section>
        <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <h2 className="text-2xl font-semibold">What is public now</h2>
          <p className="mt-2 text-text-muted">
            You can read and print the free recipes without an account. You can sign in with an email code to save recipes. Recipe{" "}
            <Link href="/collections" className="font-semibold text-action">
              collections
            </Link>{" "}
            are for sale here as one-time purchases, with no subscription. There is no live chat.
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
        explain how the website handles your information and what applies when you use it.
      </p>
    </Container>
  );
}
