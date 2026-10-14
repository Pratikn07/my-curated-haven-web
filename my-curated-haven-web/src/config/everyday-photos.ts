/**
 * Everyday photos for the before-and-after slider on a recipe's page (and the "Make them
 * Halloween" section of /halloween). Each is the recipe's own photo with only its Halloween
 * step taken out, so the two halves line up. A recipe listed here shows the slider in place
 * of its single photo; every other recipe keeps the photo.
 *
 * Only recipes with a real Halloween step are here. The banana pumpkin mini donuts, mini
 * pumpkin cheesecake bites, candy corn parfaits, gummy worms and protein fruit gummies look
 * the same every day, so they have no everyday photo. Sources: docs/implementation/instagram-landing/HALLOWEEN.md.
 */

const DIR = "/images/recipes/everyday";

export interface EverydayPhoto {
  src: string;
  alt: string;
}

const photo = (slug: string, alt: string): EverydayPhoto => ({ src: `${DIR}/${slug}-1040.webp`, alt });

export const EVERYDAY_PHOTOS: Readonly<Record<string, EverydayPhoto>> = {
  "berry-ghost-yogurt-bark": photo("berry-ghost-yogurt-bark", "The same berry yogurt bark without the ghost faces"),
  "mummy-banana-pops": photo("mummy-banana-pops", "The same banana pops in a plain yogurt coat, without the wraps or eyes"),
  "spider-cracker-bites": photo("spider-cracker-bites", "The same cream cheese cracker sandwiches without legs or eyes"),
  "apple-peanut-butter-smiles": photo("apple-peanut-butter-smiles", "The same apple and peanut butter sandwiches, closed, without the strawberry tongues or apple teeth"),
  "apple-pie-halloween-pockets": photo("apple-pie-halloween-pockets", "The same apple hand pies cut as plain rounds instead of pumpkins"),
  "blueberry-yogurt-bites": photo("blueberry-yogurt-bites", "The same blueberry yogurt bites without the white chocolate spiderwebs"),
  "chocolate-pumpkin-protein-tarts": photo("chocolate-pumpkin-protein-tarts", "The same chocolate pumpkin tarts without the jack-o'-lantern faces"),
  "jack-o-lantern-mango-stars": photo("jack-o-lantern-mango-stars", "The same mango stars without the chocolate faces or kiwi stems"),
  "jack-o-lantern-peanut-butter-tart": photo("jack-o-lantern-peanut-butter-tart", "The same peanut butter cups without the faces"),
  "mandarin-orange-pumpkins": photo("mandarin-orange-pumpkins", "The same peeled mandarins without the celery stems"),
  "monster-energy-balls": photo("monster-energy-balls", "The same green energy balls without the eyes"),
  "spider-peanut-butter-oat-bites": photo("spider-peanut-butter-oat-bites", "The same peanut butter oat bites without the chocolate legs or eyes"),
  "strawberry-yogurt-ghost-hearts": photo("strawberry-yogurt-ghost-hearts", "The same strawberry yogurt hearts without the white chocolate ghosts"),
  "sweet-potato-jack-o-lantern-cupcakes": photo("sweet-potato-jack-o-lantern-cupcakes", "The same sweet potato cupcakes with plain yogurt tops, no faces"),
  "witchs-broomsticks": photo("witchs-broomsticks", "The same cheese and pretzel sticks without the broom fringe"),
};
