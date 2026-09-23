import type { Metadata } from "next";
import Container from "@/components/layout/Container";
import Field, { TextInput } from "@/components/ui/Field";
import StatePanel from "@/components/ui/StatePanel";
import ButtonLink from "@/components/ui/ButtonLink";
import { sampleDetail } from "@/design-review/fixtures";
import FilterDemo from "@/design-review/FilterDemo";

export const metadata: Metadata = {
  title: "Design review",
  robots: { index: false, follow: false },
};

export default function DesignReviewPage() {
  return (
    <Container className="py-8">
      <p className="font-semibold text-action">Design review fixture. Not a public recipe.</p>
      <h1 className="mt-2 text-[2rem] font-semibold">Recipe layout examples</h1>
      <p className="mt-3 max-w-[65ch] text-text-muted">
        These samples are fictional. They are not feeding advice, not for sale, and not part of the public recipe library.
      </p>

      <section className="no-print mt-8 grid gap-6">
        <h2 className="text-2xl font-semibold">Fields and states</h2>
        <Field id="sample-email" label="Sample email" hint="This field is not submitted." error="Enter a sample address.">
          <TextInput name="sample-email" defaultValue="not-an-address" />
        </Field>
        <StatePanel title="No sample recipes" action={<ButtonLink href="/support">Contact support</ButtonLink>}>
          Nothing in this fixture matches. This is an empty result, not a failed request.
        </StatePanel>
        <StatePanel title="Sample request failed" action={<ButtonLink href="/support">Contact support</ButtonLink>}>
          The sample request failed. Retry is not available in this fixture.
        </StatePanel>
      </section>

      <section className="no-print mt-10">
        <h2 className="mb-4 text-2xl font-semibold">Listing and filters</h2>
        <FilterDemo />
      </section>

      <article className="recipe-print-root mt-10">
        <p className="text-sm text-text-muted">Sample recipe detail</p>
        <h2 className="mt-2 text-[2rem] font-semibold">{sampleDetail.title}</h2>
        <p className="mt-3 max-w-[65ch]">{sampleDetail.intro}</p>
        <div className="recipe-print-image mt-4 flex aspect-[4/3] max-w-xl items-center justify-center rounded-[var(--radius-card)] bg-surface-muted">
          Sample photo, not a tested dish
        </div>
        <p className="mt-4">Yield: {sampleDetail.yield}</p>
        <p>Allergens: {sampleDetail.allergen}</p>
        <h3 className="mt-6 text-2xl font-semibold">Ingredients</h3>
        <ul className="mt-2 list-disc pl-5">
          {sampleDetail.ingredients.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h3 className="mt-6 text-2xl font-semibold">Method</h3>
        <ol className="mt-2 list-decimal pl-5">
          {sampleDetail.steps.map((step) => (
            <li key={step} className="mb-2">
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm">
          Fixture only. Price, refunds, and future additions are not decided. One-time purchase is the planned shape, with no amount shown.
        </p>
      </article>
    </Container>
  );
}
