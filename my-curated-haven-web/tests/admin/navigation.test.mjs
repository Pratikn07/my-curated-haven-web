import assert from "node:assert/strict";
import test from "node:test";
import { adminNavigation } from "../../src/lib/admin/navigation.ts";

const viewer = { id: "viewer", email: "viewer@example.test", roles: ["viewer"], permissions: ["recipe.read"] };
const owner = { id: "owner", email: "owner@example.test", roles: ["owner"], permissions: ["recipe.read", "team.manage"] };

test("viewer navigation contains only Recipes and marks nested recipe routes current", () => {
  assert.deepEqual(adminNavigation(viewer, "/admin/recipes/record/edit"), [
    { href: "/admin/recipes", label: "Recipes", current: true, group: "Publishing" },
  ]);
});

test("owner navigation includes Team only when team.manage is current", () => {
  assert.deepEqual(adminNavigation(owner, "/admin/team"), [
    { href: "/admin/recipes", label: "Recipes", current: false, group: "Publishing" },
    { href: "/admin/team", label: "Team", current: true, group: "Access" },
  ]);
});

const collectionReader = { ...viewer, permissions: ["recipe.read", "collection.read"] };

test("Collections appears only with collection.read and a switched-on collection stage", () => {
  assert.deepEqual(adminNavigation(collectionReader, "/admin/collections/x", "inspection"), [
    { href: "/admin", label: "Home", current: false, group: "Workspace" },
    { href: "/admin/recipes", label: "Recipes", current: false, group: "Publishing" },
    { href: "/admin/collections", label: "Collections", current: true, group: "Publishing" },
  ]);
  assert.equal(adminNavigation(collectionReader, "/admin/recipes", "disabled").some((l) => l.label === "Collections"), false);
  assert.equal(adminNavigation(collectionReader, "/admin/recipes").some((l) => l.label === "Collections"), false);
  assert.equal(adminNavigation(viewer, "/admin/recipes", "publication").some((l) => l.label === "Collections"), false);
});

test("Home appears once collections are switched on and is current only on /admin itself", () => {
  assert.equal(adminNavigation(viewer, "/admin", "disabled").some((l) => l.label === "Home"), false);
  const links = adminNavigation(viewer, "/admin", "inspection");
  assert.deepEqual(links[0], { href: "/admin", label: "Home", current: true, group: "Workspace" });
  assert.equal(adminNavigation(viewer, "/admin/recipes", "inspection")[0].current, false);
});
