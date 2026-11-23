/**
 * Pipeline history (23 Nov): one row per candidate per set, with the furthest outcome the desk knows.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { outcomeCounts, outcomeWords, pipelineHistory } from "@/lib/pipelineHistory";
import type { OpsDatabase } from "@/data/types";

const cand = (id: string, extra: Record<string, unknown> = {}) => ({ applicationTaId: id, name: "Person " + id, fileId: null, problem: null, ...extra });
const iv = (app: string, state: string, round: number, extra: Record<string, unknown> = {}) => ({ applicationTaId: app, state, round, createdAt: round, decision: null, decisionReason: null, reason: null, ...extra });

const db = {
  clients: [{ id: "c1", name: "Acme Ltd" }],
  positions: [{ id: "p1", openingTaId: "o1", clientId: "c1", title: "Head of sales" }],
  holds: [] as unknown[],
  placements: [{ applicationTaId: "a1", state: "joined" }, { applicationTaId: "a9", state: "cancelled" }],
  interviews: [iv("a2", "booked", 1), iv("a3", "withdrew", 1, { reason: "Took another offer" }), iv("a4", "attended", 2, { decision: "rejected", decisionReason: "Weak on numbers" })],
  clientSets: [
    {
      id: "s1", openingTaId: "o1", clientId: "c1", setNumber: 1, name: "ACME > HEAD OF SALES > SET 1", role: "Head of sales", state: "sent", sentAt: 2000,
      candidates: [
        cand("a1"), cand("a2"), cand("a3"), cand("a4"),
        cand("a5", { decision: "rejected", decisionReason: "Too junior" }),
        cand("a6", { decision: "shortlisted" }),
        cand("a7", { claimVerdict: "dropped" }),
        cand("a8"),
        cand("a9"),
      ],
    },
    { id: "s2", openingTaId: "o1", clientId: "c1", setNumber: 2, name: "ACME > HEAD OF SALES > SET 2", role: "Head of sales", state: "ready", sentAt: null, candidates: [cand("b1")] },
    { id: "s3", openingTaId: "o2", clientId: null, setNumber: 1, name: "OTHER > SET 1", role: "Other", state: "sent", sentAt: 1000, candidates: [cand("c1")] },
  ],
} as unknown as OpsDatabase;

test("each candidate's outcome is the furthest the desk knows, read from the end", () => {
  const rows = pipelineHistory(db, { positionId: "p1" });
  const by = (n: string) => rows.find((r) => r.key === "s1:" + n)!;
  assert.equal(by("a1").outcome, "Placed");
  assert.equal(outcomeWords(by("a2")), "1st interview");
  assert.deepEqual([by("a3").outcome, by("a3").reason], ["Withdrew", "Took another offer"]);
  assert.deepEqual([by("a4").outcome, by("a4").reason], ["Rejected", "Weak on numbers"]);
  assert.deepEqual([by("a5").outcome, by("a5").reason], ["Rejected", "Too junior"]);
  assert.equal(by("a6").outcome, "Shortlisted");
  assert.equal(by("a7").outcome, "Client already had the CV");
  assert.equal(by("a8").outcome, "Pending client feedback");
  assert.equal(by("a9").outcome, "Pending client feedback", "a cancelled placement does not count as placed");
  assert.equal(rows.find((r) => r.key === "s2:b1")!.outcome, "Not sent yet");
});

test("a hold on the opening turns the unanswered into on hold, and the rows are scoped and ordered", () => {
  (db as unknown as { holds: unknown[] }).holds.push({ openingTaId: "o1", state: "on_hold" });
  const rows = pipelineHistory(db, { clientId: "c1" });
  assert.equal(rows.find((r) => r.key === "s1:a8")!.outcome, "On hold");
  assert.ok(rows.every((r) => r.client === "Acme Ltd"));
  assert.equal(rows.some((r) => r.key.startsWith("s3")), false, "another opening's set is not here");
  assert.equal(rows[0].setNumber, 2, "a set not sent yet leads, because it needs somebody");
  assert.equal(outcomeWords({ outcome: "Interview", round: 3 }), "Interview round 3");
  assert.ok(outcomeCounts(rows).some((x) => x.outcome === "Placed" && x.n === 1));
});
