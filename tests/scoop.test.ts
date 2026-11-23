/**
 * A Scoop (23 Nov): the batch record, who sends one, when the summary is due, and what it says.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { batchesOf, batchesOn, isScoopSender, keyOf, newBatch, nextSummaryAt, parseBatch, sendersFrom, summaryOf, SCOOP_KEY } from "@/lib/scoop";

// Tuesday 24 Nov 2026, 10:00 in Colombo.
const MORNING = Date.UTC(2026, 10, 24, 4, 30);
const at = (month: number, day: number, h: number, m = 0) => Date.UTC(2026, month, day, h, m) - 5.5 * 3_600_000;

test("a batch round-trips through its settings row, and a bad row is left out", () => {
  const b = newBatch({ id: "AAMk-1=", at: MORNING, source: "mail", from: "sir@career141.com", subject: "CVs", found: 3 });
  assert.equal(keyOf(b.id), SCOOP_KEY + "AAMk-1_", "an id with odd characters makes a safe key");
  assert.deepEqual(parseBatch(JSON.stringify(b)), b);
  assert.equal(parseBatch("not json"), null);
  const list = batchesOf([{ key: keyOf(b.id), value: JSON.stringify(b) }, { key: SCOOP_KEY + "bad", value: "{" }, { key: "mail.reached.x", value: "1|a" }]);
  assert.equal(list.length, 1);
});

test("a Scoop sender is an address or a whole domain, and an empty list is nobody", () => {
  const senders = sendersFrom("Sir@Career141.com, ta.career141.com\n@hr.example.test");
  assert.deepEqual(senders, ["sir@career141.com", "ta.career141.com", "@hr.example.test"]);
  assert.equal(isScoopSender("SIR@career141.com", senders), true);
  assert.equal(isScoopSender("anyone@ta.career141.com", senders), true);
  assert.equal(isScoopSender("anyone@hr.example.test", senders), true);
  assert.equal(isScoopSender("sir@career141.com.evil.test", senders), false);
  assert.equal(isScoopSender("other@career141.com", senders), false);
  assert.equal(isScoopSender("sir@career141.com", sendersFrom("")), false);
});

test("the summary is due at 17:30 on a working day: today's if it has not come, else the next working day's", () => {
  assert.equal(nextSummaryAt(MORNING), at(10, 24, 17, 30));
  assert.equal(nextSummaryAt(at(10, 24, 17, 31)), at(10, 25, 17, 30));
  // Friday evening goes to Monday.
  assert.equal(nextSummaryAt(at(10, 27, 18)), at(10, 30, 17, 30));
  // A holiday is skipped.
  assert.equal(nextSummaryAt(at(10, 24, 18), ["2026-11-25"]), at(10, 26, 17, 30));
});

test("batches are grouped by the Colombo day they arrived", () => {
  const a = newBatch({ id: "a", at: MORNING, source: "mail", found: 1 });
  const b = newBatch({ id: "b", at: MORNING + 86_400_000, source: "upload", found: 1 });
  assert.deepEqual(batchesOn([a, b], MORNING).map((x) => x.id), ["a"]);
});

const app = (id: string, stage: string, over: Record<string, unknown> = {}) => ({ id, name: "Person " + id, stage, tries: 0, interviewAt: null, rejectReason: null, rejectedAtStage: null, ...over });

test("the summary counts who responded, who did not, who was turned away and why, and the interviews", () => {
  const b = { ...newBatch({ id: "s", at: MORNING, source: "mail", found: 8 }), applicantIds: ["1", "2", "3", "4", "5", "6"], duplicates: [{ name: "dup.pdf", of: "Person 9" }], unreadable: [{ name: "scan.pdf", why: "no text" }] };
  const s = summaryOf(b, [
    app("1", "new"),
    app("2", "call", { tries: 2 }),
    app("3", "fits", { tries: 1 }),
    app("4", "interview", { tries: 1, interviewAt: 5 }),
    app("5", "rejected", { tries: 0, rejectReason: "Not our sector", rejectedAtStage: "call" }),
    app("6", "rejected", { tries: 1, rejectReason: "Failed the interview", rejectedAtStage: "interview", interviewAt: 6 }),
    app("7", "new"), // not in this batch
  ]);
  assert.deepEqual([s.processed, s.responded, s.noAnswer, s.notCalled, s.interviews], [6, 3, 1, 1, 2]);
  assert.deepEqual(s.screeningRejects, [{ name: "Person 5", reason: "Not our sector" }]);
  assert.equal(s.lines.length, 4);
  assert.match(s.lines[0], /6 CVs were processed, 1 was somebody already on file, 1 could not be read\./);
  assert.match(s.lines[2], /Person 5 \(Not our sector\)/);
  assert.match(summaryOf(newBatch({ id: "e", at: MORNING, source: "upload", found: 0 }), []).lines[2], /Nobody was turned away/);
});
