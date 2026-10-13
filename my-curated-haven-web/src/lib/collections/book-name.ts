/**
 * A collection named in a sentence: "the Halloween collection", or the title as written when it already says
 * "Collection" ("The Comfort Haven Collection"), so the page never reads "the The ... Collection collection".
 */
export function bookName(title: string): string {
  return /\bcollection\b/i.test(title) ? title : `the ${title} collection`;
}

/** The same at the start of a sentence. */
export function bookNameStart(title: string): string {
  const name = bookName(title);
  return name.charAt(0).toUpperCase() + name.slice(1);
}
