import assert from "node:assert/strict";
import test from "node:test";

import { columnOf, confirmationText, slotWords, timesThatFit } from "@/lib/roleInterviews";

const at = Date.parse("2026-11-25T10:00:00+05:30");

test("a time reads in Colombo time", () => {
  assert.equal(slotWords(at), "Wed 25 Nov, 10:00");
});

test("columns follow the state, and a held interview with a decision is done", () => {
  assert.equal(columnOf({ state: "slots", decision: null }), "needs");
  assert.equal(columnOf({ state: "reconfirmed", decision: null }), "booked");
  assert.equal(columnOf({ state: "attended", decision: null }), "waiting");
  assert.equal(columnOf({ state: "attended", decision: "next" }), "done");
  assert.equal(columnOf({ state: "cancelled", decision: null }), "done");
});

test("only times the candidate was marked free for fit", () => {
  const iv = { slots: [1, 2, 3], slotAnswers: [{ at: 1, free: false }, { at: 2, free: true }] };
  assert.deepEqual(timesThatFit(iv), [2]);
});

test("the confirmation names the time and the place", () => {
  const t = confirmationText({ candidate: "Dinuka W", client: "Serendib", at, where: "head office", opsPerson: "Rushda" });
  assert.match(t, /Wed 25 Nov at 10:00, head office/);
});
