/** Errors raised by the admin_* database functions, and how the editor words them. */

export type AdminWriteError =
  | "not_admin"
  | "invalid"
  | "slug_taken"
  | "not_found"
  | "stale"
  | "slug_locked"
  | "allergens_required"
  | "not_reviewed"
  | "free_recipe"
  | "in_collection"
  | "unavailable";

/** Plain wording for every error the admin_* database functions can raise. */
export const ADMIN_WRITE_MESSAGES: Record<AdminWriteError, string> = {
  not_admin: "Your admin session has ended. Sign in again and retry.",
  invalid: "Something in the form isn't valid. Check the highlighted fields.",
  slug_taken: "Another recipe already uses this web address. Change the web address and save again.",
  not_found: "This recipe no longer exists.",
  stale:
    "Someone else saved this recipe after you opened it. Copy anything you need, then reload the page to see their version.",
  slug_locked: "This recipe has been live, so its web address can't change. Links to it are already shared.",
  allergens_required: "A live recipe must keep its allergen check. Choose what it contains.",
  not_reviewed: "Check the allergens before publishing.",
  free_recipe:
    "This is one of the three free recipes on the homepage, so it can't be taken down here yet. Ask for the free recipes to be changed first.",
  in_collection:
    "Parents who bought a collection can see this recipe, so it can't be taken down here.",
  unavailable: "The recipe database didn't respond. Your changes are not saved yet. Try again in a minute.",
};

const ERROR_CODES: Record<string, AdminWriteError> = {
  "42501": "not_admin",
  "22023": "invalid",
  "22P02": "invalid",
  "23505": "slug_taken",
  "23514": "not_reviewed",
  MCNF0: "not_found",
  MCSTL: "stale",
  MCSLG: "slug_locked",
  MCALG: "allergens_required",
  MCFRE: "free_recipe",
  MCCOL: "in_collection",
};

export function classifyAdminError(error: { code?: string } | null | undefined): AdminWriteError {
  return (error?.code && ERROR_CODES[error.code]) || "unavailable";
}
