import assert from "node:assert/strict";
import test from "node:test";

import { candidatesOnDesk, initialsOf, searchCandidates, tileLines } from "@/lib/candidates";

const db = {
  positions: [
    { id: "p1", openingTaId: "o1", title: "Finance Manager", clientId: "c1" },
    { id: "p2", openingTaId: "o2", title: "Finance Lead", clientId: "c2" },
  ],
  clients: [{ id: "c1", name: "Meridian Foods" }, { id: "c2", name: "Kelani Fabrics" }],
  clientSets: [
    { openingTaId: "o1", name: "Set 1", state: "sent", candidates: [{ applicationTaId: "a1", name: "Kasun Jayasinghe", fileId: "f1", decision: "shortlisted" }] },
    { openingTaId: "o2", name: "Set 1", state: "draft", candidates: [{ applicationTaId: "a2", name: "kasun  jayasinghe", fileId: null, decision: null }, { applicationTaId: "a3", name: "Ishara Perera", fileId: null, decision: null, claimVerdict: "dropped" }] },
  ],
  interviews: [{ openingTaId: "o1", applicationTaId: "a1", positionId: "p1", candidateName: "Kasun Jayasinghe", state: "slots", round: 1, slotLoops: 0, decision: null, candidateFeedback: null }],
} as never;

test("one person across openings is one row, with a line for each opening", () => {
  const rows = candidatesOnDesk(db);
  assert.equal(rows.length, 2);
  const kasun = rows.find((r) => r.key === "kasun-jayasinghe")!;
  assert.equal(kasun.applications.length, 2);
  assert.equal(kasun.initials, "KJ");
  assert.equal(kasun.applications.find((a) => a.openingTaId === "o1")!.status.startsWith("Interview"), true, "an interview says more than the set");
  assert.equal(kasun.applications.find((a) => a.openingTaId === "o1")!.fileId, "f1", "the CV copy is kept");
  assert.deepEqual(tileLines(kasun), ["Finance Manager", "2 openings"]);
});

test("search matches name, role and client; the chips narrow it", () => {
  const rows = candidatesOnDesk(db);
  assert.equal(searchCandidates(rows, "kelani", null).length, 2);
  assert.equal(searchCandidates(rows, "ishara meridian", null).length, 0);
  assert.equal(searchCandidates(rows, "", "multi").length, 1);
  assert.equal(searchCandidates(rows, "", "shortlisted").length, 1);
  assert.equal(initialsOf("Madonna"), "M");
});
