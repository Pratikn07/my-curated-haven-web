import Link from "next/link";
import type { HomepageRecipePresentationState } from "@/config/homepage-content";
import Container from "@/components/layout/Container";

const questions = [
  {
    question: "What can I use on this website today?",
    answer: "The recipe collection is in preparation. These sections are sneak peeks, and they do not open working Chat, Shop or Bloom features.",
  },
  {
    question: "Are the Chat, Shop and Bloom previews live?",
    answer: "No. Each one is a static illustration labelled Planned for the web. There is no live assistant, product checkout or milestone logging on this page.",
  },
  {
    question: "Can I buy a recipe collection here?",
    answer: "Nothing on this site is for sale today. If a collection becomes available, its own page will explain exactly what it includes before any purchase.",
  },
  {
    question: "How can I ask a question about the plan?",
    answer: "You can contact the team through the existing support page. It does not sign you up for updates or create an account.",
  },
] as const;

export default function HomeFaq({ state }: { state: HomepageRecipePresentationState }) {
  const firstAnswer =
    state.mode === "preparation"
      ? questions[0].answer
      : "The free recipe area is available from the Recipes page. These sections are sneak peeks, and they do not open working Chat, Shop or Bloom features.";
  const purchaseAnswer =
    state.mode === "collection_ready"
      ? "The approved collection page explains what is included and presents its current terms. Chat, Shop and Bloom previews are separate from the recipe collection."
      : state.mode === "free_ready"
        ? "The free recipes are available on the Recipes page. No paid collection is being presented here, and the previews are separate from any recipe access."
        : questions[2].answer;

  return (
    <section id="questions" aria-labelledby="questions-title" className="bg-surface-muted py-14 sm:py-20">
      <Container>
        <h2 id="questions-title" className="text-3xl font-semibold sm:text-4xl">Questions</h2>
        <dl className="mt-8 grid gap-6 md:grid-cols-2">
          {questions.map((item, index) => (
            <div key={item.question} className="border-t border-border pt-5">
              <dt className="text-lg font-semibold">{item.question}</dt>
              <dd className="mt-2 max-w-[65ch] text-text-muted">
                {index === 0 ? firstAnswer : index === 2 ? purchaseAnswer : item.answer}
                {index === 3 ? (
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
