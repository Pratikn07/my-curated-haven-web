import type { ConsoleStage, Operator } from "./contracts";

export type AdminNavGroup = "Workspace" | "Publishing" | "Access";
export type AdminNavLink = { href: string; label: string; current: boolean; group: AdminNavGroup };

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Home opens once both publishing domains are active; until then /admin keeps opening Recipes. */
export function homeActive(collectionStage: ConsoleStage): boolean {
  return collectionStage !== "disabled";
}

export function adminNavigation(
  operator: Operator,
  pathname: string,
  collectionStage: ConsoleStage = "disabled",
): AdminNavLink[] {
  const links: AdminNavLink[] = [];
  if (homeActive(collectionStage)) {
    links.push({ href: "/admin", label: "Home", current: pathname === "/admin", group: "Workspace" });
  }
  if (operator.permissions.includes("recipe.read")) {
    links.push({ href: "/admin/recipes", label: "Recipes", current: isCurrent(pathname, "/admin/recipes"), group: "Publishing" });
  }
  if (operator.permissions.includes("collection.read") && collectionStage !== "disabled") {
    links.push({ href: "/admin/collections", label: "Collections", current: isCurrent(pathname, "/admin/collections"),
      group: "Publishing" });
  }
  if (operator.permissions.includes("team.manage")) {
    links.push({ href: "/admin/team", label: "Team", current: isCurrent(pathname, "/admin/team"), group: "Access" });
  }
  return links;
}
