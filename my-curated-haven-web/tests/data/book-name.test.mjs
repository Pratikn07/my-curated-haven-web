// Collection names in sentences never double up "the ... collection".
import assert from "node:assert/strict";
import test from "node:test";
import { bookName, bookNameStart } from "../../src/lib/collections/book-name.ts";

test("adds 'the ... collection' only when the title lacks it", () => {
  assert.equal(bookName("Halloween"), "the Halloween collection");
  assert.equal(bookName("The Comfort Haven Collection"), "The Comfort Haven Collection");
  assert.equal(bookNameStart("Halloween"), "The Halloween collection");
  assert.equal(bookNameStart("Meal Prep"), "The Meal Prep collection");
});
