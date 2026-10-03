import Link from "next/link";
import type { HomepageRecipePresentationState } from "@/config/homepage-content";
import Container from "@/components/layout/Container";

export default function HomeFaq({ state }: { state: HomepageRecipePresentationState }) {
  const todayAnswer =
    state.mode === "preparation"
      ? "The Kitchen is being prepared. When it opens, its free recipes will be on the Recipes page. The other rooms are still being built."
      : "The Kitchen. Every free recipe is on the Recipes page, and you can read or print it without an account. The other rooms are still being built.";
  const purchaseAnswer =
    state.mode === "collection_ready"
      ? "The approved collection page explains what is included and its current terms before any purchase. The room samples are separate from any recipe access."
      : state.mode === "free_ready"
        ? "No. The free recipes are on the Recipes page, and no paid collection is being presented here."
        : "Nothing on this site is for sale today. If a collection becomes available, its own page will explain exactly what it includes before any purchase.";

  const questions = [
    { question: "What can I use today?", answer: todayAnswer },
    {
      question: "When do the other rooms open?",
      answer:
        "The Library, for personalized storybooks, comes next. The Nursery and the Shelf come later. Until then, each room has a small sample to try, and nothing you try is saved.",
    },
    { question: "Can I buy anything here?", answer: purchaseAnswer },
    {
      question: "Who makes My Curated Haven?",
      answer: "Nibble & Nurture, our small company. Tiny Soho is our recipe brand. If you have a question, write to us through",
    },
  ];

  return (
    <section id="questions" aria-labelledby="questions-title" className="bg-surface-muted py-14 sm:py-20">
      <Container>
        <h2 id="questions-title" className="font-display text-[2rem] font-normal sm:text-[2.6rem]">Questions</h2>
        <dl className="mt-8 grid gap-6 md:grid-cols-2">
          {questions.map((item, index) => (
            <div key={item.question} className="border-t border-border pt-5">
              <dt className="text-lg font-semibold">{item.question}</dt>
              <dd className="mt-2 max-w-[65ch] text-text-muted">
                {item.answer}
                {index === questions.length - 1 ? (
                  <>
                    {" "}
                    <Link href="/support" className="font-semibold text-action underline underline-offset-4">Support</Link>.
                  </>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
