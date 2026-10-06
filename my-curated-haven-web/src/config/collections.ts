import type { CollectionRecipe, ShowroomCollection } from "@/lib/collections/types";

/**
 * The collections the showroom (/collections) and each collection page show.
 *
 * All three are published (owner decision, 2026-10-04) with placeholder prices
 * and refresh promises still awaiting approval (docs/implementation/
 * recipe-collections, RC-01 to RC-05). Until a commerce offer exists for a
 * slug, its page shows the placeholder price and "Opening soon".
 *
 * Recipe facts (title, minutes, allergens, freezer note, photo) are a snapshot
 * of the catalog taken on 2026-10-04 from ../recipe-review. On 2026-10-05 seven
 * adult recipes (written for pregnancy, no child steps) were swapped for reviewed
 * children's recipes: docs/implementation/recipe-collections/RECIPE-TAGS.md.
 * Membership moves into
 * collection_releases / collection_recipes when RC-02 is decided. The recipes
 * are drafts in the catalog, so they carry no link until they are published.
 */

const PHOTO_BASE = "https://ccrgvammglkvdlaojgzv.supabase.co/storage/v1/object/public/recipe-images/";

type Fact = Omit<CollectionRecipe, "slug" | "image"> & { image: string };

/** Catalog snapshot, 2026-10-04. */
const CATALOG: Record<string, Fact> = {
  // Halloween
  "pumpkin-and-ricotta-gnocchi-pillows": { title: "Pumpkin & Ricotta Gnocchi Pillows", minutes: 25, image: "770831df-41e7-4151-9bea-5aac6150f852-v2.png", allergens: ["wheat", "milk"], freezes: null },
  "cinnamon-sweet-potato-snack-fries-with-yogurt-dip": { title: "Cinnamon Sweet Potato Snack Fries with Yogurt Dip", minutes: 45, image: "11cffa39-83c4-4b5e-bfe1-c39cc3b092fe-v2.png", allergens: ["milk"], freezes: null },
  "soft-date-almond-cocoa-bites": { title: "Soft Date Almond Cocoa Bites", minutes: 55, image: "8314fde7-7891-4037-b664-92009ebd6d56-v2.png", allergens: ["tree nuts"], freezes: "2 months" },
  "mini-berry-yogurt-pops": { title: "Mini Berry Yogurt Pops", minutes: 205, image: "13b1d1ef-1b87-4ea8-8e28-2febceda8fa3-v2.png", allergens: ["milk"], freezes: "1 month" },
  "savory-corn-and-cheddar-muffins": { title: "Savory Corn & Cheddar Muffins", minutes: 45, image: "8a3701eb-8331-4e75-b32c-f9c3b4afc4af-v2.png", allergens: ["wheat", "milk", "egg"], freezes: "3 months" },
  "spinach-and-cheese-pizza-scrolls": { title: "Spinach & Cheese Pizza Scrolls", minutes: 40, image: "c5085fd7-a4f1-4e1d-ac61-d1ce36dff926-v2.png", allergens: ["wheat", "milk"], freezes: "3 months" },
  "soft-banana-oat-toddler-cookies": { title: "Soft Banana Oat Toddler Cookies", minutes: 40, image: "247073b9-7581-456a-bfb7-00e0190d20ae-v2.png", allergens: [], freezes: "2 months" },
  "apple-sunflower-snack-rounds": { title: "Apple Sunflower Snack Rounds", minutes: 10, image: "8f8f5616-2f3f-486a-8eb0-aa5036f11429-v2.png", allergens: [], freezes: null },
  // Meal Prep
  "slow-cooker-beef-and-vegetable-stew": { title: "Slow Cooker Beef and Vegetable Stew", minutes: 480, image: "95ea00e4-b591-4bf9-a888-7d58e9443538-v2.png", allergens: [], freezes: "2 months" },
  "veggie-packed-lasagna": { title: "Veggie-Packed Lasagna", minutes: 75, image: "c1fd76c2-ba4f-4845-bfb8-4cd3f133a39f-v2.png", allergens: ["wheat", "milk", "egg"], freezes: "2 months" },
  "mini-turkey-and-apple-meatloaf-muffins": { title: "Mini Turkey & Apple Meatloaf Muffins", minutes: 45, image: "ffe850af-331e-41e0-90ed-403ab3cd6f5c-v2.png", allergens: ["egg", "wheat"], freezes: "2 months" },
  "mild-vegetable-curry-with-rice": { title: "Mild Vegetable Curry with Rice", minutes: 40, image: "97bf9e64-ca84-4855-b0d5-90336e1939fb-v3.png", allergens: [], freezes: "2 months" },
  "one-pot-chicken-and-vegetable-rice": { title: "One-Pot Chicken and Vegetable Rice", minutes: 40, image: "5771fc64-2543-4023-8a2c-915343898ee4-v2.png", allergens: [], freezes: "2 months" },
  "cheesy-broccoli-and-quinoa-bites": { title: "Cheesy Broccoli & Quinoa Bites", minutes: 45, image: "4cbf26da-f8c0-4644-b2ea-f227c0c08f9b-v2.png", allergens: ["egg", "milk"], freezes: "2 months" },
  "cheesy-veggie-quinoa-toddler-bites": { title: "Cheesy Veggie Quinoa Toddler Bites", minutes: 60, image: "2bbb6f71-cee5-4b70-8db3-655da31ecf88-v2.png", allergens: ["milk", "egg", "wheat"], freezes: "2 months" },
  "mini-bean-and-cheese-burritos": { title: "Mini Bean & Cheese Burritos", minutes: 10, image: "d4e758fb-1ea5-4b0c-b230-d2948fe63c1e-v2.png", allergens: ["wheat", "milk"], freezes: "1 month" },
  "veggie-lentil-pancakes": { title: "Veggie Lentil Pancakes", minutes: 60, image: "0b1f8518-adf5-4209-b1bd-f77ae9d354f6-v2.png", allergens: [], freezes: "2 months" },
  "cheesy-veggie-mini-muffins": { title: "Cheesy Veggie Mini Muffins", minutes: 40, image: "558d4bb7-4811-443f-aedc-1ff390e336ba-v2.png", allergens: ["milk", "egg", "wheat"], freezes: "2 months" },
  // Protein Packs
  "mini-baked-chicken-nuggets": { title: "Mini Baked Chicken Nuggets", minutes: 40, image: "04ecc68a-752c-4b65-a003-af419cda610b-v2.png", allergens: ["egg", "wheat"], freezes: "2 months", protein: "Chicken" },
  "onigiri-rice-triangles": { title: "Onigiri Rice Triangles", minutes: 45, image: "7c7a9197-9384-40bd-b623-8d7a49812faa-v3.png", allergens: ["egg", "fish"], freezes: null, protein: "Tuna or salmon" },
  "soft-chicken-veggie-rice-bowl": { title: "Soft Chicken Veggie Rice Bowl", minutes: 40, image: "1af3ef26-5ca1-4678-8a31-bac8666d1b01-v2.png", allergens: [], freezes: "2 months", protein: "Chicken" },
  "mild-curried-red-lentil-cakes": { title: "Mild Curried Red Lentil Cakes", minutes: 45, image: "a3cd52f0-7652-4fe1-a543-7d4072d92e50-v2.png", allergens: [], freezes: "2 months", protein: "Red lentils" },
  "sesame-tofu-and-veggie-cubes": { title: "Sesame Tofu & Veggie Cubes", minutes: 30, image: "268cee74-16e6-491a-8d80-760aeb0be0e7-v2.png", allergens: ["soy", "sesame"], freezes: null, protein: "Tofu" },
  "turkey-and-hummus-pinwheels": { title: "Turkey & Hummus Pinwheels", minutes: 15, image: "e7ac0613-5e18-44ce-bdbf-02f4ac591de0-v2.png", allergens: ["wheat", "sesame"], freezes: null, protein: "Turkey" },
  "bean-and-veggie-burrito-bowl": { title: "Bean and Veggie Burrito Bowl", minutes: 55, image: "af5f3ff1-bbf1-43f4-a367-4c234656404f-v2.png", allergens: [], freezes: null, protein: "Black beans" },
  "salmon-potato-veggie-mash": { title: "Salmon Potato Veggie Mash", minutes: 40, image: "ab9d4c8d-f997-4664-9416-35d2f8a763bc-v2.png", allergens: ["milk", "fish"], freezes: null, protein: "Salmon" },
  "soft-tofu-veggie-stir-fry-with-rice": { title: "Soft Tofu Veggie Stir Fry with Rice", minutes: 25, image: "f803dcc2-ce11-4838-b6af-8fe4476fcc18-v2.png", allergens: ["soy"], freezes: null, protein: "Tofu" },
  "turkey-veggie-mini-meatballs-with-pasta": { title: "Turkey Veggie Mini Meatballs with Pasta", minutes: 45, image: "2938abd9-3dab-41b5-a8cb-cc15c9fc9ec5-v2.png", allergens: ["milk", "egg", "wheat"], freezes: null, protein: "Turkey" },
};

function recipes(slugs: readonly string[]): CollectionRecipe[] {
  return slugs.map((slug) => {
    const fact = CATALOG[slug];
    if (!fact) throw new Error(`[collections] Unknown recipe in config: ${slug}`);
    return { ...fact, slug, image: `${PHOTO_BASE}${fact.image}` };
  });
}

export const SHOWROOM_COLLECTIONS: readonly ShowroomCollection[] = [
  {
    slug: "halloween",
    status: "published",
    title: "Halloween",
    tagline: "A festive table for little hands. Nothing scary.",
    story:
      "Pumpkin, cocoa and berries: the colours of the season, in food a toddler can hold. Gnocchi pillows for dinner, snack fries for the walk around the block, yogurt pops for after.",
    forWhen: "For the week the costumes come out, and the party where you said you'd bring something.",
    cloth: "ember",
    cover: { src: "/images/collections/cover-halloween-1040.webp", width: 1040, height: 1412, alt: "A pumpkin-orange cloth cookbook with a gold-foil pumpkin on its cover" },
    refresh: "New recipes join each October, before the costumes come out.",
    placeholderPrice: "$6.99",
    recipes: recipes([
      "pumpkin-and-ricotta-gnocchi-pillows",
      "cinnamon-sweet-potato-snack-fries-with-yogurt-dip",
      "mini-berry-yogurt-pops",
      "spinach-and-cheese-pizza-scrolls",
      "soft-date-almond-cocoa-bites",
      "savory-corn-and-cheddar-muffins",
      "soft-banana-oat-toddler-cookies",
      "apple-sunflower-snack-rounds",
    ]),
  },
  {
    slug: "meal-prep",
    status: "published",
    title: "Meal Prep",
    tagline: "Cook once on Sunday. Eat well on Wednesday.",
    story:
      "Ten recipes that keep: a slow-cooker stew, a lasagna, a vegetable curry, and muffins, bites and burritos that go from freezer to plate on a tired evening. Every one of them freezes.",
    forWhen: "For the evenings when the only plan is the one you made at the weekend.",
    cloth: "forest",
    cover: { src: "/images/collections/cover-meal-prep-1040.webp", width: 1040, height: 1400, alt: "A forest-green cloth cookbook with gold-foil stacked food containers on its cover" },
    refresh: "New make-ahead recipes join each season.",
    placeholderPrice: "$12.99",
    recipes: recipes([
      "slow-cooker-beef-and-vegetable-stew",
      "veggie-packed-lasagna",
      "mild-vegetable-curry-with-rice",
      "mini-turkey-and-apple-meatloaf-muffins",
      "one-pot-chicken-and-vegetable-rice",
      "cheesy-veggie-quinoa-toddler-bites",
      "cheesy-broccoli-and-quinoa-bites",
      "mini-bean-and-cheese-burritos",
      "veggie-lentil-pancakes",
      "cheesy-veggie-mini-muffins",
    ]),
  },
  {
    slug: "protein-packs",
    status: "published",
    title: "Protein Packs",
    tagline: "Meals built around one protein, in shapes little hands can manage.",
    story:
      "Chicken, salmon, tuna, red lentils, tofu, turkey and black beans. Each recipe is built around one of them and comes as a bite, a cake, a bowl or a pinwheel.",
    forWhen: "For the plate that keeps coming back with only the pasta eaten.",
    cloth: "plum",
    cover: { src: "/images/collections/cover-protein-packs-1040.webp", width: 1040, height: 1414, alt: "A plum cloth cookbook with a gold-foil egg cup, lentils and beans on its cover" },
    refresh: "New recipes join through the year.",
    placeholderPrice: "$12.99",
    recipes: recipes([
      "mini-baked-chicken-nuggets",
      "onigiri-rice-triangles",
      "soft-chicken-veggie-rice-bowl",
      "mild-curried-red-lentil-cakes",
      "sesame-tofu-and-veggie-cubes",
      "turkey-and-hummus-pinwheels",
      "bean-and-veggie-burrito-bowl",
      "salmon-potato-veggie-mash",
      "soft-tofu-veggie-stir-fry-with-rice",
      "turkey-veggie-mini-meatballs-with-pasta",
    ]),
  },
];
