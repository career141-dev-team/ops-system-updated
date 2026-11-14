/**
 * The keyboard (8 Nov, UX order 8): what each key means, and when it means
 * nothing because somebody is typing.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { keyActFor, rowAfter } from "@/lib/keys";

test("the five keys, upper or lower case, and the arrows as well", () => {
  assert.equal(keyActFor({ key: "j" }), "next");
  assert.equal(keyActFor({ key: "K" }), "prev");
  assert.equal(keyActFor({ key: "ArrowDown" }), "next");
  assert.equal(keyActFor({ key: "a" }), "approve");
  assert.equal(keyActFor({ key: "Enter" }), "open");
  assert.equal(keyActFor({ key: "o" }), "open");
  assert.equal(keyActFor({ key: "/" }), "search");
  assert.equal(keyActFor({ key: "x" }), null);
});

test("a letter typed into a box is a letter, never a command", () => {
  assert.equal(keyActFor({ key: "a", target: { tagName: "input" } }), null);
  assert.equal(keyActFor({ key: "j", target: { tagName: "TEXTAREA" } }), null);
  assert.equal(keyActFor({ key: "/", target: { tagName: "SELECT" } }), null);
  assert.equal(keyActFor({ key: "a", target: { tagName: "DIV", isContentEditable: true } }), null);
  // A row that has focus is not a box.
  assert.equal(keyActFor({ key: "a", target: { tagName: "DIV" } }), "approve");
});

test("a key with a modifier belongs to the browser", () => {
  assert.equal(keyActFor({ key: "a", ctrlKey: true }), null);
  assert.equal(keyActFor({ key: "k", metaKey: true }), null);
  assert.equal(keyActFor({ key: "/", altKey: true }), null);
});

test("moving stops at the ends and starts at the top", () => {
  assert.equal(rowAfter(-1, 5, "next"), 0);
  assert.equal(rowAfter(-1, 5, "prev"), 0);
  assert.equal(rowAfter(0, 5, "prev"), 0);
  assert.equal(rowAfter(4, 5, "next"), 4);
  assert.equal(rowAfter(2, 5, "next"), 3);
  assert.equal(rowAfter(2, 5, "prev"), 1);
  assert.equal(rowAfter(0, 0, "next"), null);
});

test("E edits and S skips, but only when nobody is typing", () => {
  assert.equal(keyActFor({ key: "e" }), "edit");
  assert.equal(keyActFor({ key: "S" }), "skip");
  assert.equal(keyActFor({ key: "s", target: { tagName: "TEXTAREA" } }), null);
});
