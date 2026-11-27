/**
 * The counts on the positions table and the lists behind them (26 Nov, Nov 25 ops meeting).
 */
import assert from "node:assert/strict";
import test from "node:test";

import { COUNT_KINDS, countItems } from "@/lib/positionCounts";
import { candidatesForPosition } from "@/lib/positionCandidates";
import { trackingForPosition } from "@/lib/setTracking";
import type { OpsDatabase, OpsPosition } from "@/data/types";

const iv = (id: string, round: number, state: string) => ({ id, positionId: "p1", applicationTaId: "app-" + id, candidateName: "Cand " + id, round, state, at: 1_700_000_000_000 });
const db = {
  clients: [{ id: "c1", name: "Acme", clientType: "local" }],
  members: [{ id: "m1", name: "Rakshana", active: true }],
  requirements: [],
  agreements: [],
  positions: [{ id: "p1", clientId: "c1", clientTaId: "t1", openingTaId: "o1", title: "Sales", requirementId: null, ownerId: "m1", stage: "searching", primaryTaId: "ta1", team: [{ taId: "ta2" }] }],
  clientSets: [
    { id: "s1", openingTaId: "o1", state: "sent", setNumber: 1, sentAt: 1_700_000_000_000, candidates: [{ applicationTaId: "app-a" }, {}] },
    { id: "s2", openingTaId: "o1", state: "ready", setNumber: 2, sentAt: null, candidates: [{}] },
    { id: "s3", openingTaId: "other", state: "sent", setNumber: 1, sentAt: 1, candidates: [] },
  ],
  interviews: [iv("a", 1, "attended"), iv("b", 2, "booked"), iv("c", 3, "attended"), iv("d", 1, "cancelled"), iv("e", 2, "withdrew"), iv("f", 1, "no_show")],
  placements: [
    { id: "x1", positionId: "p1", candidateName: "A", package: "", state: "placed", joinedAt: null, createdAt: 1 },
    { id: "x2", positionId: "p1", candidateName: "B", package: "", state: "joined", joinedAt: 2, createdAt: 1 },
    { id: "x3", positionId: "p1", candidateName: "C", package: "", state: "cancelled", joinedAt: null, createdAt: 1 },
    { id: "x4", positionId: "p1", candidateName: "D", package: "", state: "no_show", joinedAt: null, createdAt: 1 },
  ],
} as unknown as OpsDatabase;

test("each list holds exactly what its count says, and cancelled counts nowhere", () => {
  const ids = (k: (typeof COUNT_KINDS)[number]) => countItems(db, "p1", k).map((i) => i.id).sort();
  assert.deepEqual(ids("sets"), ["s1"]);
  assert.deepEqual(ids("i1"), ["a"]);
  assert.deepEqual(ids("i2"), ["b"]);
  assert.deepEqual(ids("ifinal"), ["c"]);
  assert.deepEqual(ids("dropout"), ["e", "f"]);
  assert.deepEqual(ids("offered"), ["x1", "x2"]);
  assert.deepEqual(ids("joined"), ["x2"]);
  assert.deepEqual(ids("live"), ["b"]);
  assert.equal(countItems(db, "nope", "sets").length, 0);
});

test("a record with no positionId counts by its opening, and another opening's does not", () => {
  const loose = (id: string, openingTaId: string) => ({ ...iv(id, 1, "booked"), positionId: null, openingTaId });
  const withLoose = { ...db, interviews: [loose("g", "o1"), loose("h", "other")] } as unknown as OpsDatabase;
  assert.deepEqual(countItems(withLoose, "p1", "live").map((i) => i.id), ["g"]);
});

test("an item names its set and opens the candidate, or the record when they are in no set", () => {
  const [inSet] = countItems(db, "p1", "i1");
  assert.match(inSet.line, /^Set 1 · Round 1/);
  assert.equal(inSet.href, "/positions/p1/candidates/app-a");
  assert.equal(countItems(db, "p1", "i2")[0].href, "/interviews/b");

  const withNames = {
    ...db,
    clientSets: [{ id: "s1", openingTaId: "o1", state: "sent", setNumber: 1, sentAt: 1_700_000_000_000, candidates: [{ applicationTaId: "app-a", name: "Alice" }, { name: "Bob" }] }],
  } as unknown as OpsDatabase;
  const [setItem] = countItems(withNames, "p1", "sets");
  assert.equal(setItem.href, "/positions/p1?view=sets");
  assert.match(setItem.line, /Alice, Bob/);
});

test("records with no positionId belong by opening, and a no-show is not joining", () => {
  const desk = {
    positions: [], clientSets: [], inbound: [],
    interviews: [{ id: "i1", positionId: null, openingTaId: "o1", applicationTaId: "manual:m1", state: "attended", round: 1, decision: "next", decidedAt: 1 }],
    placements: [
      { id: "x1", positionId: null, openingTaId: "o1", applicationTaId: "manual:m2", state: "placed", joinedAt: null },
      { id: "x2", positionId: "p1", openingTaId: "o1", applicationTaId: "manual:m3", state: "no_show", joinedAt: null },
    ],
  } as unknown as OpsDatabase;
  const position = { id: "p1", openingTaId: "o1", title: "Role", manualCandidates: ["m1", "m2", "m3"].map((id) => ({ id, name: id })) } as unknown as OpsPosition;
  const list = candidatesForPosition(desk, position, []);
  assert.deepEqual(list.map((c) => c.level), ["interview", "joining", "found"]);
  assert.equal(trackingForPosition(desk, position, list).rows[0].feedback, "Interview 1: Next round");
});
