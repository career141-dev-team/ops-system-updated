/**
 * The candidate feedback log (owner, 16 Nov): what belongs to one candidate,
 * and every voice about them in one list, newest first.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase } from "@/data/types";
import { feedbackLog, subjectsOfCandidate } from "@/lib/timeline";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 16, 9, 0);
const who = { applicationTaId: "ta_app1", name: "Sample Candidate", openingTaId: "op_1" };
const nameOf = (id: string | null) => (id ? "Person " + id : null);

function desk(): OpsDatabase {
  return {
    clientSets: [
      {
        id: "cs_1",
        openingTaId: "op_1",
        name: "ACME > Accountant > SET 1",
        candidates: [
          {
            applicationTaId: "ta_app1",
            name: "Sample Candidate",
            internalInterview: { by: "m_1", at: NOW - 5 * DAY, outcome: "pass", notes: "Sharp." },
            decision: "shortlisted",
            decisionReason: "Liked the numbers",
            decidedAt: NOW - 3 * DAY,
          },
          { applicationTaId: "ta_other", name: "Someone Else", internalInterview: { by: "m_1", at: NOW, outcome: "pass", notes: "not theirs" } },
        ],
      },
    ],
    interviews: [
      {
        id: "int_1", applicationTaId: "ta_app1", openingTaId: "op_1", candidateName: "Sample Candidate", round: 1,
        decision: "next", decisionReason: "Strong", decidedAt: NOW - DAY, candidateFeedback: "Liked the team", updatedAt: NOW - 2 * DAY,
      },
      {
        id: "int_x", applicationTaId: "ta_other", openingTaId: "op_1", candidateName: "Someone Else", round: 1,
        decision: "rejected", decisionReason: "not theirs", decidedAt: NOW, candidateFeedback: null, updatedAt: NOW,
      },
    ],
    references: [
      { id: "ref_1", applicationTaId: "ta_app1", report: "Reliable.", reportedAt: NOW - 6 * DAY, requestedAt: NOW - 7 * DAY, decision: "cleared", reason: null },
    ],
    audit: [
      { id: "x1", actorId: null, action: "interview.candidateFeedback", subjectType: "interview", subjectId: "int_1", before: null, after: null, reason: null, at: NOW - 12 * 3_600_000 },
    ],
  } as unknown as OpsDatabase;
}

test("a candidate owns their sets, interviews and reference, and nobody else's", () => {
  assert.deepEqual([...subjectsOfCandidate(desk(), who)].sort(), ["cs_1", "int_1", "ref_1"]);
  // An interview typed in by hand, with no application id, still matches on name and opening.
  const db = desk();
  (db.interviews[0] as { applicationTaId: string | null }).applicationTaId = null;
  assert.ok(subjectsOfCandidate(db, who).has("int_1"));
});

test("the log has every voice about them, newest first, and none of anybody else's", () => {
  const log = feedbackLog(desk(), who, nameOf);
  assert.deepEqual(log.map((e) => e.kind), ["candidate", "round", "client", "internal", "reference"]);
  assert.equal(log[0].said, "Liked the team");
  assert.match(log[1].said, /next: Strong/);
  assert.match(log[3].said, /Passed: Sharp\./);
  assert.equal(log[3].by, "Person m_1");
  assert.ok(!log.some((e) => /not theirs/.test(e.said)));
});

test("a candidate who failed our interview is no longer in the set, and is still found", () => {
  const db = desk();
  (db.clientSets[0] as { candidates: unknown[] }).candidates = [];
  db.audit.push({
    id: "x2", actorId: "m_2", action: "clientSet.internalInterview.fail", subjectType: "clientSet", subjectId: "cs_1",
    before: "ready", after: "ready", reason: "Sample Candidate: Could not explain the gap", at: NOW - 4 * DAY,
  });
  const failed = feedbackLog(db, who, nameOf).find((e) => e.kind === "internal");
  assert.equal(failed?.said, "Failed: Could not explain the gap");
  assert.equal(failed?.by, "Person m_2");
  // Another candidate's failure does not leak in.
  assert.equal(feedbackLog(db, { ...who, name: "Someone Else", applicationTaId: "ta_other" }, nameOf).some((e) => /gap/.test(e.said)), false);
});
