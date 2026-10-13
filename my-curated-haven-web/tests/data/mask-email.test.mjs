// The return link shows the buyer's email masked: recognisable to them, unreadable to anyone else holding the link.
import assert from "node:assert/strict";
import test from "node:test";
import { maskEmail } from "../../src/lib/payments/mask-email.ts";

test("keeps the first and last letter and the domain", () => {
  assert.equal(maskEmail("parent.name@gmail.com"), "p•••e@gmail.com");
  assert.equal(maskEmail("ab@example.com"), "a•••@example.com");
  assert.equal(maskEmail("a@example.com"), "a•••@example.com");
});

test("never echoes something that is not an email", () => {
  assert.equal(maskEmail("not-an-email"), "your email");
  assert.equal(maskEmail("@example.com"), "your email");
});
