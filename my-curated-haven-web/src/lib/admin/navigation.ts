import type { Operator } from "./contracts";

export type AdminNavLink = { href: string; label: string; current: boolean };

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function adminNavigation(operator: Operator, pathname: string): AdminNavLink[] {
  const links: AdminNavLink[] = [];
  if (operator.permissions.includes("recipe.read")) {
    links.push({ href: "/admin/recipes", label: "Recipes", current: isCurrent(pathname, "/admin/recipes") });
  }
  if (operator.permissions.includes("team.manage")) {
    links.push({ href: "/admin/team", label: "Team", current: isCurrent(pathname, "/admin/team") });
  }
  return links;
}
