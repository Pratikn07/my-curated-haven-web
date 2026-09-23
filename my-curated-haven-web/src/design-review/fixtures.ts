import { RecipeExample } from "@/components/recipe/RecipeCard";

export const FIXTURE_MARKER = "Design review fixture";

export const sampleRecipes: RecipeExample[] = [
  {
    id: "oat-fingers",
    title: "Sample oat fingers for a very long toddler breakfast title",
    mealLabel: "Breakfast",
    totalMinutes: 20,
    dietaryLabels: ["No nuts in this sample"],
    accessLabel: "Free sample",
    imageLabel: "Sample breakfast photo",
  },
  {
    id: "pear-porridge",
    title: "Sample pear porridge",
    mealLabel: "Breakfast",
    accessLabel: "Free sample",
    missingImage: true,
  },
  {
    id: "tomato-lentils",
    title: "Sample tomato lentils",
    mealLabel: "Meal",
    totalMinutes: 35,
    accessLabel: "Collection preview",
    imageLabel: "Sample meal photo",
  },
];

export const sampleDetail = {
  title: "Sample oat fingers for a very long toddler breakfast title",
  intro: "A fictional recipe used only to review layout. This is not feeding advice.",
  yield: "About 8 small fingers",
  allergen: "Allergen information not reviewed",
  ingredients: [
    "1 cup rolled oats",
    "1 ripe banana, mashed",
    "1 tablespoon ground flax, stirred into 3 tablespoons water",
  ],
  steps: [
    "Heat the oven to the temperature printed on your own tested recipe. This sample does not set a temperature.",
    "Stir the oats, banana, and flax mixture until the oats look evenly damp.",
    "Spread the mixture on a lined tray and bake until the edges look set. Cool before serving in this fictional example.",
  ],
};
