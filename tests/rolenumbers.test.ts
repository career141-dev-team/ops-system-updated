import assert from "node:assert/strict";
import test from "node:test";

import { roleNumbers } from "@/lib/roleNumbers";

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 19, 6, 0);
const base = { now, headcount: 3, candidates: [], sets: [], interviews: [], placements: [], guarantees: [] };

test("an opening with nothing on it counts zero and says nothing", () => {
  const n = roleNumbers(base);
  assert.equal(n.withClient.n, 0);
  assert.equal(n.withClient.line, "—");
  assert.equal(n.guarantee.line, "—");
  assert.deepEqual(n.placed, { done: 0, of: 3 });
});

test("with the client counts only people still waiting for a yes or no", () => {
  const n = roleNumbers({
    ...base,
    sets: [
      { name: "SET 2", state: "sent", sentAt: now - 4 * DAY, candidates: [{ decision: "shortlisted" }, {}, {}] },
      { name: "SET 3", state: "sent", sentAt: now - 4 * DAY, candidates: [{ decision: "rejected" }] },
      { name: "SET 4", state: "draft", sentAt: null, candidates: [{}, {}] },
    ],
  });
  assert.equal(n.withClient.n, 2);
  assert.equal(n.withClient.line, "SET 2 day 5");
  assert.equal(n.ready.n, 2);
});

test("interviews: a live one with no time needs a time", () => {
  const n = roleNumbers({
    ...base,
    interviews: [
      { state: "booked", at: now + DAY },
      { state: "slots", at: null },
      { state: "cancelled", at: null },
    ],
  });
  assert.equal(n.interviews.n, 2);
  assert.equal(n.interviews.needsTime, 1);
  assert.equal(n.interviews.line, "1 needs a time");
});

test("placed counts placed and joined, against the headcount", () => {
  const n = roleNumbers({
    ...base,
    placements: [
      { state: "joined", joinDate: now - 30 * DAY },
      { state: "placed", joinDate: now + 12 * DAY },
      { state: "no_show", joinDate: now - DAY },
    ],
    guarantees: [{ state: "running", startsAt: now - 34 * DAY, endsAt: now + 55 * DAY }],
  });
  assert.deepEqual(n.placed, { done: 2, of: 3 });
  assert.equal(n.joining.n, 1);
  assert.equal(n.guarantee.line, "day 35 of 89");
});
