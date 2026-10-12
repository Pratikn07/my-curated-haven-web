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

test("Support appears only for support readers while support is switched on", async () => {
  const { adminNavigation } = await import("../../src/lib/admin/navigation.ts");
  const support = { id: "u", email: "s@synthetic.test", roles: ["support_viewer"], permissions: ["support.read"] };
  const editor = { id: "e", email: "e@synthetic.test", roles: ["editor"], permissions: ["recipe.read", "recipe.edit"] };
  assert.deepEqual(adminNavigation(support, "/admin/support/orders/x", "disabled", "inspection").map((l) => [l.label, l.current]),
    [["Support", true]]);
  assert.equal(adminNavigation(support, "/admin/support", "disabled", "disabled").length, 0);
  assert.ok(!adminNavigation(editor, "/admin/recipes", "disabled", "repair").some((l) => l.label === "Support"));
});

test("/admin sends support-only staff to Support and everyone else as before", async () => {
  const { adminLanding } = await import("../../src/lib/admin/navigation.ts");
  const support = { id: "u", email: "s@synthetic.test", roles: ["support_operator"], permissions: ["support.read"] };
  const owner = { id: "o", email: "o@synthetic.test", roles: ["owner"], permissions: ["recipe.read", "collection.read", "support.read"] };
  assert.equal(adminLanding(support, "disabled", "inspection"), "/admin/support");
  assert.equal(adminLanding(support, "publication", "disabled"), "/admin");
  assert.equal(adminLanding(owner, "disabled", "repair"), "/admin/recipes");
  assert.equal(adminLanding(owner, "publication", "repair"), "/admin");
});
