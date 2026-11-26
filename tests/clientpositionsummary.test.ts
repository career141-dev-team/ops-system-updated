import assert from "node:assert/strict";
import test from "node:test";

import { positionSummary } from "@/lib/clientPositionSummary";

test("the five numbers of a position", () => {
  const sets = [
    { id: "s1", setNumber: 1, state: "sent", candidates: [{ applicationTaId: "a", decision: "shortlisted" }, { applicationTaId: "b", decision: "rejected" }, { applicationTaId: "c", decision: "shortlisted" }] },
    { id: "s2", setNumber: 2, state: "sent", candidates: [{ applicationTaId: "d" }] },
    { id: "s3", setNumber: 3, state: "ready", candidates: [{ applicationTaId: "e", decision: "shortlisted" }] },
  ];
  const s = positionSummary(
    sets,
    [{ state: "booked" }, { state: "attended" }, { state: "cancelled" }, { state: "withdrew" }],
    [{ state: "placed" }, { state: "joined", joinedAt: 5 }, { state: "cancelled" }, { state: "no_show" }],
  );
  assert.deepEqual(s, { setsSent: 2, shortlisted: 2, interviews: 2, offered: 2, joined: 1 });
});

test("a position with nothing yet is all zeros", () => {
  assert.deepEqual(positionSummary([], [], []), { setsSent: 0, shortlisted: 0, interviews: 0, offered: 0, joined: 0 });
});
