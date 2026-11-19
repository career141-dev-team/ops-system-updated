import assert from "node:assert/strict";
import test from "node:test";

import { answerLine, awaiting, columnOf, dayOfWindow, sentLine, shortDay } from "@/lib/setsBoard";

const at = (iso: string) => Date.parse(iso + "T05:00:00+05:30");
const mk = (state: string, cands: { decision?: string | null; claimedAt?: number | null }[] = [], sentAt: number | null = null) => ({
  setNumber: 2, state, sentAt, receivedAt: sentAt, candidates: cands,
});

test("a set is in the column its state and answers say", () => {
  assert.equal(columnOf(mk("ready")), "ready");
  assert.equal(columnOf(mk("reviewing")), "ready");
  assert.equal(columnOf(mk("withdrawn")), "withdrawn");
  assert.equal(columnOf(mk("sent", [{ decision: "rejected" }, {}], at("2026-11-12"))), "client");
  assert.equal(columnOf(mk("sent", [{ decision: "rejected" }, { claimedAt: 1 }], at("2026-11-12"))), "answered");
});

test("awaiting leaves out the answered and the claimed", () => {
  assert.equal(awaiting(mk("sent", [{ decision: "shortlisted" }, { claimedAt: 5 }, {}])), 1);
});

test("the day counts working days from receipt, capped at the window", () => {
  const set = mk("sent", [], at("2026-11-12"));
  assert.equal(dayOfWindow(set, at("2026-11-19"), [], 7), 5);
  assert.equal(dayOfWindow(set, at("2026-12-30"), [], 7), 7);
  assert.equal(sentLine(set, at("2026-11-19"), [], 7), "Sent 12 Nov · day 5 of 7");
  assert.equal(sentLine(set, at("2026-11-12"), [], 7), "Sent 12 Nov · today");
  assert.equal(shortDay(at("2026-11-12")), "12 Nov");
});

test("the answer line counts each kind", () => {
  assert.equal(answerLine(mk("sent", [{ decision: "shortlisted" }, { decision: "rejected" }, { decision: "rejected" }, { claimedAt: 1 }])), "1 shortlisted, 2 rejected, 1 already theirs");
  assert.equal(answerLine(mk("sent", [{}, {}])), "2 CVs, no answers");
});
