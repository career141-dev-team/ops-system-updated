/**
 * The top bar hides, and nobody loses it (13 Nov).
 *
 * On My Work it is the page's header, in place at the top; everywhere else
 * the sidebar is the navigation and the bar waits out of sight.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { REVEAL_ZONE, barShown, type BarState } from "@/lib/topBar";

const myWork: BarState = { pinnedAtTop: true, scrollY: 600, pointerY: 400, overBar: false, focusWithin: false, touch: false };
const elsewhere: BarState = { ...myWork, pinnedAtTop: false };

test("on My Work: in its place at the top of the page", () => {
  assert.equal(barShown({ ...myWork, scrollY: 0 }), true);
  assert.equal(barShown({ ...myWork, scrollY: 0, pointerY: null }), true);
});

test("on My Work: out of the way once the page is scrolled", () => {
  assert.equal(barShown(myWork), false);
  assert.equal(barShown({ ...myWork, pointerY: null }), false);
});

test("on every other page: out of sight even at the top, the sidebar is there", () => {
  assert.equal(barShown({ ...elsewhere, scrollY: 0 }), false);
  assert.equal(barShown({ ...elsewhere, scrollY: 0, pointerY: null }), false);
});

test("anywhere: back when the pointer reaches the top edge, and not a pixel before", () => {
  for (const page of [myWork, elsewhere]) {
    assert.equal(barShown({ ...page, pointerY: 0 }), true);
    assert.equal(barShown({ ...page, pointerY: REVEAL_ZONE }), true);
    assert.equal(barShown({ ...page, pointerY: REVEAL_ZONE + 1 }), false);
  }
});

test("it stays while the pointer is on it", () => {
  assert.equal(barShown({ ...elsewhere, pointerY: 60, overBar: true }), true);
});

test("the keyboard and a touch screen never lose it", () => {
  assert.equal(barShown({ ...elsewhere, focusWithin: true }), true);
  assert.equal(barShown({ ...elsewhere, touch: true }), true);
});
