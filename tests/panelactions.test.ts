import assert from "node:assert/strict";
import test from "node:test";

import {
  problemWithHistoryCorrection,
  problemWithInviteBack,
  problemWithManualChase,
  problemWithRefundDecision,
  problemWithTeamNote,
} from "../src/lib/panelActions";

test("problemWithManualChase requires a valid channel and a short note", () => {
  assert.ok(problemWithManualChase("fax", "Sent follow up"));
  assert.ok(problemWithManualChase("whatsapp", "hi"));
  assert.equal(problemWithManualChase("whatsapp", "Sent reminder on group"), null);
});

test("problemWithInviteBack validates date format and rejects past dates", () => {
  const now = Date.parse("2026-11-19T06:00:00Z");
  assert.equal(problemWithInviteBack("bad", now).ok, false);
  assert.equal(problemWithInviteBack("2026-10-01", now).ok, false);
  const ok = problemWithInviteBack("2026-12-05", now);
  assert.equal(ok.ok, true);
});

test("problemWithRefundDecision validates yes, custom amount, and no", () => {
  assert.equal(problemWithRefundDecision({ answer: "yes", paid: 100000, reason: "" }), null);
  assert.ok(problemWithRefundDecision({ answer: "other", customAmount: 0, paid: 100000, reason: "Agreed 30%" }));
  assert.ok(problemWithRefundDecision({ answer: "other", customAmount: 150000, paid: 100000, reason: "Too high" }));
  assert.ok(problemWithRefundDecision({ answer: "other", customAmount: 30000, paid: 100000, reason: "no" }));
  assert.equal(problemWithRefundDecision({ answer: "other", customAmount: 30000, paid: 100000, reason: "Director approved 30%" }), null);
  assert.ok(problemWithRefundDecision({ answer: "no", paid: 100000, reason: "" }));
  assert.equal(problemWithRefundDecision({ answer: "no", paid: 100000, reason: "Outside guarantee terms" }), null);
});

test("problemWithHistoryCorrection and problemWithTeamNote enforce bounds", () => {
  assert.ok(problemWithHistoryCorrection("fix"));
  assert.equal(problemWithHistoryCorrection("Salary was LKR 210,000 not 200,000."), null);
  assert.ok(problemWithTeamNote(" "));
  assert.equal(problemWithTeamNote("Serendib Foods confirmed Friday 10am."), null);
});
