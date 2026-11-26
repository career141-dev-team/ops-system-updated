import assert from "node:assert/strict";
import test from "node:test";

import { setCounts, stageRowsCsv, stageRowsHtml, stageRowsTsv, summaryLine, trackingRows, type TrackCandidate, type TrackSet } from "@/lib/setTracking";

const DAY = 86_400_000;
const T = Date.UTC(2026, 10, 20, 6);
const sets: TrackSet[] = [
  { id: "s1", setNumber: 1, state: "sent", candidates: [
    { applicationTaId: "a", decision: "shortlisted", decidedAt: T },
    { applicationTaId: "b", decision: "shortlisted", decidedAt: T },
    { applicationTaId: "c", decision: "rejected", decisionReason: "too junior", decidedAt: T },
  ] },
  { id: "s2", setNumber: 2, state: "sent", candidates: [{ applicationTaId: "d" }, { applicationTaId: "e" }] },
  { id: "s3", setNumber: 3, state: "ready", candidates: [{ applicationTaId: "f" }] },
];

test("counts cover only the sets that went, and the summary names them", () => {
  const counts = setCounts(sets);
  assert.deepEqual(counts.map((c) => [c.setNumber, c.sent, c.shortlisted, c.rejected, c.awaiting]), [[1, 3, 2, 1, 0], [2, 2, 0, 0, 2]]);
  assert.equal(summaryLine(counts), "2 shortlisted (set 1) · set 2 awaiting feedback");
  assert.equal(summaryLine([]), "No set has gone to the client yet.");
  assert.equal(summaryLine(setCounts([sets[0]])), "2 shortlisted (set 1)");
  assert.equal(summaryLine(setCounts([sets[1]])), "Set 2 awaiting feedback");
  assert.equal(summaryLine(setCounts([{ ...sets[0], candidates: [{ applicationTaId: "c", decision: "rejected" }] }])), "Set 1 answered, nobody shortlisted");
});

test("rows: only candidates the client has seen, with the newest feedback", () => {
  const cands: TrackCandidate[] = [
    { id: "a", applicationTaId: "a", name: "Asha", setId: "s1", level: "interview" },
    { id: "c", applicationTaId: "c", name: "Chamal", setId: "s1", level: "out" },
    { id: "d", applicationTaId: "d", name: "Dinesh", setId: "s2", level: "internal" },
    { id: "f", applicationTaId: "f", name: "Farah", setId: "s3", level: "internal" },
    { id: "z", applicationTaId: "z", name: "Zed", setId: null, level: "found" },
  ];
  const rows = trackingRows(cands, sets, [{ applicationTaId: "a", round: 1, decision: "rejected", decisionReason: "salary", decidedAt: T + DAY }]);
  assert.deepEqual(rows.map((r) => r.name), ["Asha", "Chamal", "Dinesh"]);
  assert.equal(rows[0].feedback, "Interview 1: Rejected: salary"); // newer than the set answer
  assert.equal(rows[1].feedback, "Rejected: too junior");
  assert.equal(rows[2].feedback, "Awaiting feedback");
  assert.equal(rows[0].setNumber, 1);
});

test("the CSV guards formulas and the table text is safe to paste", () => {
  const rows = trackingRows([{ id: "a", applicationTaId: "a", name: "=SUM(A1)", setId: "s1", level: "external" }], sets, []);
  assert.match(stageRowsCsv(rows), /"'=SUM\(A1\)"/);
  assert.equal(stageRowsTsv(rows).split("\n").length, 2);
  assert.match(stageRowsHtml([{ ...rows[0], name: "<b>x</b>" }]), /&lt;b&gt;x&lt;\/b&gt;/);
});
