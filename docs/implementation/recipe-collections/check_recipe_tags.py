"""Check recipe-tags.json against each recipe's own ingredients and the collection rules.

Run from this folder:  python3 check_recipe_tags.py
Exits non-zero when a rule is broken, so it can run before any import.

Allergens are found again from the ingredient text by keyword, without using the
recorded tags, and must match the recorded allergens. Free-from tags must agree with
them. Ages, stages and every collection placement are checked against COLLECTIONS.md.
"""
import collections
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
data = json.loads((HERE / "recipe-tags.json").read_text())
seed = json.loads((HERE / "collections.seed.json").read_text())
cmeta = {c["slug"]: c for c in seed["collections"]}
vocab = {group: {v["key"] for v in values} for group, values in seed["recipe_tags"].items()}

# Live collections keep these exact recipes (src/config/collections.ts).
LIVE = {
    "meal-prep": {"slow-cooker-beef-and-vegetable-stew", "veggie-packed-lasagna", "folate-rich-lentil-and-spinach-soup", "mini-turkey-and-apple-meatloaf-muffins", "one-pot-chicken-and-vegetable-rice", "lentil-and-vegetable-curry-with-coconut-milk", "cheesy-broccoli-and-quinoa-bites", "mini-bean-and-cheese-burritos", "veggie-lentil-pancakes", "cheesy-veggie-mini-muffins"},
    "protein-packs": {"mini-baked-chicken-nuggets", "salmon-and-sweet-potato-bowl-with-avocado", "spinach-and-feta-egg-muffins", "mild-curried-red-lentil-cakes", "sesame-tofu-and-veggie-cubes", "turkey-and-hummus-pinwheels", "quinoa-and-black-bean-burrito-bowl", "salmon-potato-veggie-mash", "chicken-and-vegetable-stir-fry-with-brown-rice", "mediterranean-chicken-and-chickpea-salad"},
    "halloween": {"pumpkin-and-ricotta-gnocchi-pillows", "cinnamon-sweet-potato-snack-fries-with-yogurt-dip", "mini-berry-yogurt-pops", "spinach-and-cheese-pizza-scrolls", "soft-date-almond-cocoa-bites", "savory-corn-and-cheddar-muffins", "soft-banana-oat-toddler-cookies", "apple-sunflower-snack-rounds"},
}

# Phrases that name an allergen without containing it ("egg-free pasta", "check the label for soy").
NEGATIONS = [
    r"\b(egg|soy|dairy|milk|nut|gluten|wheat|peanut)-free\b",
    r"\bno (milk|egg|soy)( or (milk|egg|soy))?( ingredients)?",
    r"check(ed)? (the )?label for [a-z ,]+",
    r"label-checked for [a-z ,]+",
    r"made without [a-z ]+",
    r"verify the package label",
]
ALLERGENS = {
    "milk": r"(?<!coconut )(?<!almond )(?<!breast )\bmilk\b|yogurt|cheese|cheddar|mozzarella|ricotta|feta|parmesan|(?<!peanut )(?<!nut )(?<!seed )\bbutter\b|\bcream\b|ghee",
    "eggs": r"\beggs?\b|mayonnaise",
    "wheat": r"(?<!rice )(?<!chickpea )(?<!oat )(?<!almond )\bflour\b(?! tortilla)|flour tortilla|bread|panko|(?<!chickpea )(?<!lentil )\bpasta\b|spaghetti|(?<!rice )noodles|(?<!corn )tortilla|pita|puff pastry|pizza dough|lasagna|soy sauce|naan|couscous",
    "soy": r"tofu|soy sauce|tamari|edamame|miso",
    "peanuts": r"peanut",
    "tree_nuts": r"almond|cashew|walnut|pecan|pistachio|hazelnut|pine nut|pesto",
    "fish": r"salmon|tuna|\bcod\b|\bfish\b|anchov",
    "shellfish": r"shrimp|prawn|crab|lobster",
    "sesame": r"sesame|tahini|hummus",
}
SWEETENER = r"\bsugar\b|maple|honey|syrup|chocolate chip|agave"
MEAT = r"chicken|beef|turkey|salmon|tuna|\bfish\b|pork|\bham\b|bacon|gelatin|anchov"
IRON = r"beef|lentil|\bdal\b|bean|chickpea|tofu|spinach|\begg|iron-fortified"
PREGNANCY = r"pregnan|nausea|morning sickness"
STAGES = [("6-8m", 6, 9), ("9-12m", 9, 12), ("1-2y", 12, 24), ("2-3y", 24, 36), ("3-5y", 36, 61)]


def allergens_in(ingredients):
    found = collections.defaultdict(list)
    for raw in ingredients:
        text = raw.lower()
        for pattern in NEGATIONS:
            text = re.sub(pattern, " ", text)
        for name, pattern in ALLERGENS.items():
            if re.search(pattern, text):
                found[name].append(raw)
    return found


def gluten_from_oats(ingredients):
    return [raw for raw in ingredients if re.search(r"\boats?\b|oat cereal|oat crumbs|granola", raw.lower()) and "gluten-free" not in raw.lower()]


def freezes(storage):
    s = storage.lower()
    return "freez" in s and not re.search(r"not suitable for freezing|do not freeze|freezing changes", s)


errors, notes = [], []
for r in data["recipes"]:
    tag = f'#{r["n"]} {r["title"]}'
    src = r["source"]
    ingredients = " | ".join(src["ingredients"]).lower()
    found = allergens_in(src["ingredients"])
    a, b = r["age_min_months"], r["age_max_months"]
    tags = r["tags"]
    free_from = set(tags["free_from"])

    # Allergens and free-from tags
    if set(found) != set(r["allergens"]):
        errors.append(f"{tag}: recorded allergens {sorted(r['allergens'])}, ingredients contain {sorted(found)}")
    if set(found) != set(r["catalog_allergens"]):
        notes.append(f"{tag}: catalog allergen list {sorted(r['catalog_allergens'])}, ingredients contain {sorted(found)}")
    for label, allergen in (("egg-free", {"eggs"}), ("dairy-free", {"milk"}), ("nut-free", {"peanuts", "tree_nuts"})):
        if label in free_from and allergen & set(found):
            errors.append(f"{tag}: tagged {label} but contains {sorted(allergen & set(found))}")
    if "gluten-free" in free_from and ("wheat" in found or gluten_from_oats(src["ingredients"])):
        errors.append(f"{tag}: tagged gluten-free but has wheat or oats not named gluten-free")
    if "vegetarian" in free_from and re.search(MEAT, ingredients):
        errors.append(f"{tag}: tagged vegetarian but has meat or fish")
    if "vegan" in free_from and (re.search(MEAT, ingredients) or {"milk", "eggs", "fish"} & set(found) or "honey" in ingredients):
        errors.append(f"{tag}: tagged vegan but has animal products")

    # Age and stage
    if "honey" in ingredients and a < 12:
        errors.append(f"{tag}: honey before 12 months")
    if re.search(r"sliced almonds|whole (nuts|almonds|peanuts)|chopped nuts", ingredients) and a < 48:
        errors.append(f"{tag}: whole or sliced nuts under 4 years")
    if tags["stage"] != [k for k, lo, hi in STAGES if a < hi and b > lo]:
        errors.append(f"{tag}: stage tags {tags['stage']} do not match age {a}-{b} months")

    # Tags must come from the agreed vocabulary
    for group in ("meal", "goal", "practical", "free_from", "occasion"):
        if set(tags[group]) - vocab[group]:
            errors.append(f"{tag}: {group} values not in vocabulary: {set(tags[group]) - vocab[group]}")
    if tags["texture"] not in vocab["texture"]:
        errors.append(f"{tag}: texture {tags['texture']} not in vocabulary")

    # Collections
    adult = re.search(PREGNANCY, (src["summary"] + " " + " ".join(src["tips"])).lower()) or r["written_for"] != "children"
    for slug in r["collections"]:
        if slug not in cmeta:
            errors.append(f"{tag}: unknown collection {slug}")
            continue
        lo, hi = cmeta[slug]["stage_min_months"], cmeta[slug]["stage_max_months"]
        live = slug in LIVE
        if live and r["slug"] not in LIVE[slug]:
            errors.append(f"{tag}: added to live collection {slug}")
        if r["free_sample"]:
            errors.append(f"{tag}: free sample in paid collection {slug}")
        if r["review_gate"] != "passed":
            errors.append(f"{tag}: review-rejected recipe in {slug}")
        if adult and not live:
            errors.append(f"{tag}: adult recipe in new collection {slug}")
        if lo is not None and not live:
            if hi is not None and hi <= 12 and a >= (9 if hi == 8 else hi):
                errors.append(f"{tag}: starts at {a} months, too old for {slug}")
            if (lo, hi) == (12, 24) and not (a < 24 and b > 12):
                errors.append(f"{tag}: {a}-{b} months does not fit {slug} (1-2 years)")
            if lo == 24 and b <= 24:
                errors.append(f"{tag}: ends at {b} months, too young for {slug} (2-4 years)")
        if live and hi == 24 and a >= 24:
            notes.append(f"{tag}: live in {slug} (1-2 years) but suits {a} months and up as written")
        if slug in ("batch-and-freeze-for-babies", "freezer-dinners") and not freezes(src["storage"]):
            errors.append(f"{tag}: in {slug} but its storage note does not say it freezes")
        if slug in ("lunchbox-and-daycare", "birthday-party") and {"peanuts", "tree_nuts"} & set(found):
            errors.append(f"{tag}: nuts in {slug}")
        if slug == "everyday-treats" and re.search(SWEETENER, ingredients):
            errors.append(f"{tag}: added sweetener in everyday-treats")
        if slug == "iron-rich-first-foods" and not re.search(IRON, ingredients):
            errors.append(f"{tag}: no iron source for iron-rich-first-foods")

# Live memberships must stay complete, and collection lists must match recipe placements
by_slug = collections.defaultdict(set)
for r in data["recipes"]:
    for slug in r["collections"]:
        by_slug[slug].add(r["slug"])
for slug, members in LIVE.items():
    if by_slug[slug] != members:
        errors.append(f"live {slug}: missing {sorted(members - by_slug[slug])}, extra {sorted(by_slug[slug] - members)}")
for c in data["collections"]:
    if set(c["recipes"]) != by_slug[c["slug"]] or c["count"] != len(c["recipes"]):
        errors.append(f"collection {c['slug']}: list does not match the recipes placed in it")

print(f"Checked {len(data['recipes'])} recipes and {len(data['collections'])} collections.")
print(f"\nRule errors: {len(errors)}")
for e in errors:
    print("  ", e)
print(f"\nFor the catalog or the owner ({len(notes)}):")
for n in notes:
    print("  ", n)
print("\nCollections:")
for c in data["collections"]:
    print(f"   {c['count']:3}  {c['status']:5}  {c['slug']}")
sys.exit(1 if errors else 0)
