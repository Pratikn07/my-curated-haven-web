import type { ConsoleStage, Operator, SupportStage } from "./contracts";

export type AdminNavGroup = "Workspace" | "Publishing" | "Customers" | "Access";
export type AdminNavLink = { href: string; label: string; current: boolean; group: AdminNavGroup };

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Home opens once both publishing domains are active; until then /admin keeps opening Recipes. */
export function homeActive(collectionStage: ConsoleStage): boolean {
  return collectionStage !== "disabled";
}

/** Support appears for staff who may read customer purchases, while the support stage is on. */
export function supportActive(operator: Operator, supportStage: SupportStage): boolean {
  return operator.permissions.includes("support.read") && supportStage !== "disabled";
}

/** Where /admin sends someone: Home once both publishing domains are on, Support for support-only staff. */
export function adminLanding(operator: Operator, collectionStage: ConsoleStage, supportStage: SupportStage): string {
  const publishing = operator.permissions.includes("recipe.read") || operator.permissions.includes("collection.read");
  if (!publishing && supportActive(operator, supportStage)) return "/admin/support";
  return homeActive(collectionStage) ? "/admin" : "/admin/recipes";
}

export function adminNavigation(
  operator: Operator,
  pathname: string,
  collectionStage: ConsoleStage = "disabled",
  supportStage: SupportStage = "disabled",
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
  if (supportActive(operator, supportStage)) {
    links.push({ href: "/admin/support", label: "Support", current: isCurrent(pathname, "/admin/support"), group: "Customers" });
  }
  if (operator.permissions.includes("team.manage")) {
    links.push({ href: "/admin/team", label: "Team", current: isCurrent(pathname, "/admin/team"), group: "Access" });
  }
  return links;
}
