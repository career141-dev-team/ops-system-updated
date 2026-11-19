import assert from "node:assert/strict";
import test from "node:test";

import { filterRows, groupByClient, listView, roleRows, type ListInput, type PositionIn } from "@/lib/positionsList";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 19, 4, 30);

const pos = (id: string, over: Partial<PositionIn> = {}): PositionIn => ({
  id, clientId: "c1", clientTaId: "c1", openingTaId: "o_" + id, title: "Role " + id, stage: "searching",
  primaryTaId: "ta1", jdApprovedAt: NOW - 9 * DAY, pendingCount: null, handedOverAt: NOW - 3 * DAY, closedAt: null,
  ownerId: "me", createdAt: NOW - 5 * DAY, ...over,
});
const input = (over: Partial<ListInput>): ListInput => ({
  now: NOW, chaseDays: 1, positions: [], sets: [], interviews: [], placements: [], holds: [],
  clientNameOf: (p) => (p.clientId === "c2" ? "Beta" : "Alpha"),
  contactFirstNameOf: () => "Dilshan", taFirstNameOf: () => "Kavindi", agreementPendingOf: () => false, ...over,
});

test("a set with no answer past the chase days is a call, in red", () => {
  const [r] = roleRows(input({
    positions: [pos("a")],
    sets: [{ openingTaId: "o_a", setNumber: 2, state: "sent", receivedAt: NOW - 8 * DAY, candidates: [{}, {}] }],
  }));
  assert.equal(r.tone, "danger");
  assert.equal(r.action?.label, "Call Dilshan");
  assert.equal(r.counts.client, 2);
  assert.equal(r.waitingDays, 8);
});

test("no TA asks to choose one; an interview with no time asks to find one", () => {
  const rows = roleRows(input({
    positions: [pos("a", { primaryTaId: null }), pos("b")],
    interviews: [{ id: "iv1", openingTaId: "o_b", state: "slots", round: 2, at: null }],
  }));
  assert.equal(rows[0].action?.kind, "choose-ta");
  assert.equal(rows[1].action?.kind, "find-a-time");
  assert.equal(rows[1].action?.on, "iv1");
});

test("a searching role with nothing at the client asks the TA for CVs; closed and held roles ask nothing", () => {
  const rows = roleRows(input({
    positions: [pos("a"), pos("b", { stage: "closed" }), pos("c")],
    holds: ["o_c"],
  }));
  assert.equal(rows[0].action?.label, "Ask Kavindi for CVs");
  assert.equal(rows[1].action, null);
  assert.equal(rows[2].onHold, true);
  assert.equal(rows[2].action, null);
});

test("an unsigned agreement is chased; a passed joining day goes to the client's HR", () => {
  const rows = roleRows(input({
    positions: [pos("a"), pos("b")],
    agreementPendingOf: (p) => p.id === "a",
    placements: [{ openingTaId: "o_b", state: "placed", joinDate: NOW - 3 * DAY, joinedAt: null, candidateName: "Sam" }],
  }));
  assert.equal(rows[0].action?.kind, "chase-agreement");
  assert.equal(rows[1].action?.kind, "chase-hr");
});

test("the view counts what needs doing, groups by client and filters", () => {
  const i = input({
    positions: [pos("a", { primaryTaId: null }), pos("b", { clientId: "c2" }), pos("c", { ownerId: "x" })],
    sets: [{ openingTaId: "o_b", setNumber: 1, state: "sent", receivedAt: NOW - 2 * DAY, candidates: [{}] }],
  });
  const v = listView(i);
  assert.equal(v.needsYou, 3);
  assert.equal(v.withClient, 1);
  assert.equal(v.oldestWaitClient, "Beta");
  assert.deepEqual(groupByClient(v.rows, true).map((g) => g.name), ["Beta", "Alpha"]);
  assert.equal(filterRows(v.rows, "mine", "", "me").length, 2);
  assert.equal(filterRows(v.rows, "needs", "", "me").length, 3);
  assert.equal(filterRows(v.rows, "all", "beta", "me").length, 1);
});
