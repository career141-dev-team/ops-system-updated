/**
 * The top bar hides, and nobody loses it (13 Nov).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { REVEAL_ZONE, barShown, type BarState } from "@/lib/topBar";

const scrolled: BarState = { scrollY: 600, pointerY: 400, overBar: false, focusWithin: false, touch: false };

test("in its place at the top of the page", () => {
  assert.equal(barShown({ ...scrolled, scrollY: 0 }), true);
  assert.equal(barShown({ ...scrolled, scrollY: 0, pointerY: null }), true);
});

test("out of the way once the page is scrolled", () => {
  assert.equal(barShown(scrolled), false);
  // Before the pointer has moved at all, a scrolled page still keeps it away.
  assert.equal(barShown({ ...scrolled, pointerY: null }), false);
});

test("back when the pointer reaches the top edge, and not a pixel before", () => {
  assert.equal(barShown({ ...scrolled, pointerY: 0 }), true);
  assert.equal(barShown({ ...scrolled, pointerY: REVEAL_ZONE }), true);
  assert.equal(barShown({ ...scrolled, pointerY: REVEAL_ZONE + 1 }), false);
});

test("it stays while the pointer is on it", () => {
  assert.equal(barShown({ ...scrolled, pointerY: 60, overBar: true }), true);
});

test("the keyboard and a touch screen never lose it", () => {
  assert.equal(barShown({ ...scrolled, focusWithin: true }), true);
  assert.equal(barShown({ ...scrolled, touch: true }), true);
});
