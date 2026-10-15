/**
 * The part of a page a tap or a view happened in: `primary_ux` on cta_clicked, section_viewed, faq_opened,
 * load_failed and empty_state_viewed. One fixed list, so a module is grouped the same way on every page.
 * Which component carries which value: docs/implementation/tracking/PLAN.md, "Where the labels go".
 * "unlabelled" is what a tap outside any labelled module reports, so gaps show up instead of disappearing.
 */
export const PRIMARY_UX_VALUES = [
  "header_nav",
  "mobile_nav",
  "footer",
  "breadcrumb",
  "intro",
  "hero",
  "house",
  "room_dialog",
  "storybook",
  "recipe_grid",
  "collection_band",
  "faq",
  "search",
  "filters",
  "recipe_toolbar",
  "recipe_method",
  "lock_card",
  "more_recipes",
  "campaign_recipes",
  "book_card",
  "plan_strip",
  "book_tiles",
  "story",
  "story_offer",
  "related_shelf",
  "closing",
  "sticky_bar",
  "bookcase",
  "buy_box",
  "plan_card",
  "contents_list",
  "free_samples",
  "next_book",
  "plan",
  "shopping_list",
  "sign_in",
  "confirmation",
  "claim_form",
  "checkout_status",
  "checkout_cancel",
  "account",
  "library",
  "saved_recipes",
  "support",
  "static_page",
  "error_page",
  "empty_state",
  "unlabelled",
] as const;

export type PrimaryUx = (typeof PRIMARY_UX_VALUES)[number];

export function isPrimaryUx(value: unknown): value is PrimaryUx {
  return typeof value === "string" && (PRIMARY_UX_VALUES as readonly string[]).includes(value);
}
