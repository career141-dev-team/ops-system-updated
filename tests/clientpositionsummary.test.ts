import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase } from "@/data/types";
import { positionSummary } from "@/lib/clientPositionSummary";

const position = { id: "p1", openingTaId: "o1" };
const set = (setNumber: number, state: string, decisions: (string | undefined)[]) => ({ id: "s" + setNumber, setNumber, state, openingTaId: "o1", candidates: decisions.map((decision, i) => ({ applicationTaId: setNumber + "-" + i, decision })) });
const rec = (over: Record<string, unknown>) => ({ id: "x", positionId: "p1", openingTaId: "o1", applicationTaId: "", candidateName: "A", round: 1, ...over });

test("the five numbers of a position, counted as the positions table counts them", () => {
  const db = {
    positions: [position],
    clientSets: [set(1, "sent", ["shortlisted", "rejected", "shortlisted"]), set(2, "sent", [undefined]), set(3, "ready", ["shortlisted"])],
    // A dropout (no show, withdrew) and a cancelled one are not interviews; a record TA sent before the position was known counts.
    interviews: [rec({ state: "booked" }), rec({ state: "attended", round: 3, positionId: null }), rec({ state: "no_show" }), rec({ state: "withdrew" }), rec({ state: "cancelled" })],
    placements: [rec({ state: "placed" }), rec({ state: "joined", positionId: null }), rec({ state: "cancelled" }), rec({ state: "no_show" })],
  } as unknown as OpsDatabase;
  assert.deepEqual(positionSummary(db, position), { setsSent: 2, shortlisted: 2, interviews: 2, offered: 2, joined: 1 });
});

test("a position with no opening and nothing yet is all zeros", () => {
  const p = { id: "p2", openingTaId: null };
  const db = { positions: [p], clientSets: [{ ...set(1, "sent", ["shortlisted"]), openingTaId: null }], interviews: [], placements: [] } as unknown as OpsDatabase;
  assert.deepEqual(positionSummary(db, p), { setsSent: 0, shortlisted: 0, interviews: 0, offered: 0, joined: 0 });
});
