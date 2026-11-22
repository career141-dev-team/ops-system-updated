import assert from "node:assert/strict";
import test from "node:test";

import { endOfWorkDay, moveTarget, problemWithMove } from "@/lib/taskMove";

const NOW = Date.parse("2026-11-23T02:30:00Z"); // Mon 08:00 in Colombo
const at = (iso: string) => Date.parse(iso);

test("end of the working day is 17:00 Colombo, or tomorrow's once it has passed", () => {
  assert.equal(endOfWorkDay(NOW), at("2026-11-23T11:30:00Z"));
  assert.equal(endOfWorkDay(at("2026-11-23T12:00:00Z")), at("2026-11-24T11:30:00Z"));
});

test("move to: today, tomorrow 09:00, a date 09:00, and bad dates", () => {
  assert.equal(moveTarget("today", "", NOW), at("2026-11-23T11:30:00Z"));
  assert.equal(moveTarget("tomorrow", "", NOW), at("2026-11-24T03:30:00Z"));
  assert.equal(moveTarget("date", "2026-12-01", NOW), at("2026-12-01T03:30:00Z"));
  assert.equal(moveTarget("date", "2026-02-31", NOW), null);
  assert.equal(moveTarget("date", "", NOW), null);
  // After 17:00 "today" is still today, an hour on.
  const late = at("2026-11-23T12:00:00Z"); // 17:30
  assert.equal(moveTarget("today", "", late), late + 3_600_000);
});

test("free tasks move either way; deadline tasks move later only with a reason", () => {
  const later = NOW + 3 * 86_400_000;
  const free = { dueAt: NOW + 3_600_000, subjectType: null };
  const system = { dueAt: NOW + 3_600_000, subjectType: "talentPulse" };
  assert.equal(problemWithMove(free, later, "", NOW), null);
  assert.match(problemWithMove(system, later, "  ", NOW) ?? "", /why/);
  assert.equal(problemWithMove(system, later, "Waiting on the client", NOW), null);
  assert.equal(problemWithMove({ dueAt: later, subjectType: "talentPulse" }, NOW + 3_600_000, "", NOW), null);
  assert.match(problemWithMove(free, null, "", NOW) ?? "", /day/);
  assert.match(problemWithMove(free, NOW - 2 * 86_400_000, "", NOW) ?? "", /later day/);
});
