import type { CampaignPageData } from "@/lib/data/load-campaign";
import { recipeCountLabel } from "@/lib/campaigns/validate";
import { Kicker } from "./CampaignParts";

/** 7. Short, plain answers a careful parent looks for. Questions about paid options appear only when those options do. */
export default function CampaignQuestions({ data }: { data: CampaignPageData }) {
  const { recipes, pack, collection } = data;
  const free = recipes.length === 1 ? "This recipe is" : `All ${recipeCountLabel(recipes.length)} on this page are`;

  const questions: { question: string; answer: string }[] = [
    {
      question: recipes.length === 1 ? "Is this recipe free?" : "Are these recipes free?",
      answer: `Yes. ${free} free to read, cook and print. No account and no email.`,
    },
    {
      question: "Do I need an account?",
      answer: "No. An account is only for saving recipes to come back to later.",
    },
    {
      question: "Where do I print a recipe?",
      answer:
        "Open the recipe and use Print on its page. Inside Instagram, tap ⋯ at the top, choose Open in browser, then print from there.",
    },
    {
      question: "How are allergens shown?",
      answer:
        "Allergens are listed on every recipe page, so you can check before you cook. If you’re unsure, ask your child’s doctor.",
    },
  ];
  if (pack) {
    questions.push({
      question: "What is included in a pack?",
      answer: `${pack.title} has ${recipeCountLabel(pack.recipeCount)}, each with ingredients, steps, allergens and storage. It is a one-time purchase of ${pack.formattedPrice}.`,
    });
  }
  if (collection) {
    questions.push(
      {
        question: "What is included in a collection?",
        answer: `Every recipe in ${collection.title}: ${recipeCountLabel(collection.recipeCount)} today, each laid out the same way. It is a one-time purchase of ${collection.formattedPrice}.`,
      },
      {
        question: "Do future recipes get added to a collection?",
        answer: `Yes. Recipes added to ${collection.title} later are included at no extra cost.`,
      }
    );
  }

  return (
    <section className="cp-questions" aria-labelledby="cp-questions-title" data-story-section="questions">
      <div className="cp-questions-inner">
        <div className="cp-questions-head">
          <Kicker>Practical questions</Kicker>
          <h2 id="cp-questions-title" className="cp-h2">
            Good to know
          </h2>
        </div>
        <div className="cp-faq">
          {questions.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
