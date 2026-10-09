import assert from "node:assert/strict";
import test from "node:test";
import { adminNavigation } from "../../src/lib/admin/navigation.ts";

const viewer = { id: "viewer", email: "viewer@example.test", roles: ["viewer"], permissions: ["recipe.read"] };
const owner = { id: "owner", email: "owner@example.test", roles: ["owner"], permissions: ["recipe.read", "team.manage"] };

test("viewer navigation contains only Recipes and marks nested recipe routes current", () => {
  assert.deepEqual(adminNavigation(viewer, "/admin/recipes/record/edit"), [
    { href: "/admin/recipes", label: "Recipes", current: true },
  ]);
});

test("owner navigation includes Team only when team.manage is current", () => {
  assert.deepEqual(adminNavigation(owner, "/admin/team"), [
    { href: "/admin/recipes", label: "Recipes", current: false },
    { href: "/admin/team", label: "Team", current: true },
  ]);
});
