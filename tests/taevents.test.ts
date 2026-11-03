/**
 * The events reader. The cursor rule is the whole point: nothing may be
 * skipped, because a skipped placement is the problem being fixed.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { cursorAfter, cursorAgeInWords, isKnownEvent, whatWeDoWithIt } from "@/lib/taEvents";

const handled = (id: string) => ({ taEventId: id, handledAt: 1 });
const stuck = (id: string) => ({ taEventId: id, handledAt: null });

test("the cursor moves to the end of a batch that was all handled", () => {
  assert.equal(cursorAfter([handled("a"), handled("b"), handled("c")], "start"), "c");
});

test("the cursor stops at the first event that was not handled", () => {
  assert.equal(cursorAfter([handled("a"), stuck("b"), handled("c")], "start"), "a");
  assert.equal(cursorAfter([stuck("a"), handled("b")], "start"), "start", "nothing handled, nothing moves");
});

test("an empty batch leaves the cursor alone", () => {
  assert.equal(cursorAfter([], "where-we-were"), "where-we-were");
});

test("an event we do not know is kept and flagged, not thrown away", () => {
  assert.equal(isKnownEvent("placement.created"), true);
  assert.equal(isKnownEvent("something.new"), false);
  assert.match(whatWeDoWithIt("something.new"), /do not know/);
  assert.match(whatWeDoWithIt("placement.joined"), /Phase 6/);
  assert.match(whatWeDoWithIt("client_set.ready"), /Phase 4/);
  assert.match(whatWeDoWithIt("interview.booked"), /Phase 5/);
});

test("a reader that has stopped is said to have stopped", () => {
  const now = 10 * 3_600_000;
  assert.match(cursorAgeInWords(null, now), /never been read/);
  assert.match(cursorAgeInWords(now - 60_000, now), /less than two minutes/);
  assert.match(cursorAgeInWords(now - 20 * 60_000, now), /20 minutes ago/);
  assert.match(cursorAgeInWords(now - 3 * 3_600_000, now), /something has stopped/);
});
