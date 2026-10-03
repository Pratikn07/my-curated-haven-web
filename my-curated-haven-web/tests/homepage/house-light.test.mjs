import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
  HOUSE_LIGHT_SCRIPT,
  HOUSE_LIGHT_TIMETABLE,
  applyHouseLight,
  daypartAt,
  houseLightAt,
} from "../../src/lib/house-light.ts";

function fakeRoot() {
  const attributes = new Map();
  const vars = new Map();
  return {
    attributes,
    vars,
    dataset: new Proxy({}, { set: (_, key, value) => (attributes.set(`data-${String(key)}`, String(value)), true) }),
    classList: { add() {} },
    style: { setProperty: (name, value) => vars.set(name, String(value)) },
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
  };
}

function at(hours, minutes) {
  return new Date(2026, 9, 2, hours, minutes, 0);
}

function runInlineScript(date) {
  const root = fakeRoot();
  const links = [];
  const RealDate = Date;
  const context = {
    document: {
      documentElement: root,
      head: { appendChild: (link) => links.push(link) },
      createElement: () => ({ setAttribute(name, value) { this[name] = value; } }),
    },
    CSS: { supports: () => true },
    Date: class extends RealDate {
      constructor() {
        super(date.getTime());
      }
    },
    Math,
  };
  vm.runInNewContext(HOUSE_LIGHT_SCRIPT, context);
  return { root, links };
}

test("the timetable covers the whole day in order", () => {
  assert.equal(HOUSE_LIGHT_TIMETABLE[0][0], 0);
  assert.equal(HOUSE_LIGHT_TIMETABLE.at(-1)[0], 1440);
  for (let i = 1; i < HOUSE_LIGHT_TIMETABLE.length; i += 1) {
    assert.ok(HOUSE_LIGHT_TIMETABLE[i][0] > HOUSE_LIGHT_TIMETABLE[i - 1][0]);
  }
});

test("key moments of the day get the expected light", () => {
  assert.deepEqual(houseLightAt(at(12, 0)), { evening: 0, night: 0, lamps: 0 });
  assert.deepEqual(houseLightAt(at(18, 30)), { evening: 1, night: 0.12, lamps: 0.65 });
  assert.deepEqual(houseLightAt(at(23, 0)), { evening: 0, night: 1, lamps: 1 });
  assert.deepEqual(houseLightAt(at(3, 0)), { evening: 0, night: 1, lamps: 1 });
  assert.equal(daypartAt(at(16, 59)), "day");
  assert.equal(daypartAt(at(17, 0)), "evening");
  assert.equal(daypartAt(at(20, 0)), "night");
  assert.equal(daypartAt(at(5, 59)), "night");
  assert.equal(daypartAt(at(6, 0)), "day");
});

test("light changes gradually, never jumping between neighbouring minutes", () => {
  let previous = houseLightAt(at(0, 0));
  for (let minute = 1; minute < 1440; minute += 1) {
    const light = houseLightAt(at(Math.floor(minute / 60), minute % 60));
    for (const key of ["evening", "night", "lamps"]) {
      assert.ok(Math.abs(light[key] - previous[key]) < 0.05, `${key} jumps at minute ${minute}`);
      assert.ok(light[key] >= 0 && light[key] <= 1);
    }
    previous = light;
  }
});

test("the before-first-paint script matches the live ticker at every quarter hour", () => {
  for (let minute = 0; minute < 1440; minute += 15) {
    const date = at(Math.floor(minute / 60), minute % 60);
    const expected = fakeRoot();
    applyHouseLight(expected, date);
    const { root } = runInlineScript(date);
    assert.deepEqual(Object.fromEntries(root.vars), Object.fromEntries(expected.vars), `vars at minute ${minute}`);
    assert.deepEqual(
      Object.fromEntries(root.attributes),
      Object.fromEntries(expected.attributes),
      `attributes at minute ${minute}`,
    );
  }
});

test("the script preloads only the painting that shows most", () => {
  const night = runInlineScript(at(23, 0)).links;
  assert.equal(night.length, 2);
  assert.ok(night.every((link) => link.imagesrcset.includes("house-night-") && link.type === "image/avif"));
  const day = runInlineScript(at(12, 0)).links;
  assert.ok(day.every((link) => link.imagesrcset.includes("house-day-")));
});
