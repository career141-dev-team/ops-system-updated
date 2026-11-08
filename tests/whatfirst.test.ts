/**
 * What to do first today (8 Nov, UX order 6): the rules order the day, the
 * model only says why. The order must not depend on the model at all.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { type DayItem, firstBecause, orderTheDay, whatFirst, whatFirstKey } from "@/lib/whatFirst";

const NOW = Date.UTC(2026, 10, 3, 4, 0);
const HOUR = 3_600_000;

const day: DayItem[] = [
  { said: "Routine notice to a client", href: "/messages/m_r", kind: "routine", at: NOW - 2 * HOUR },
  { said: "Chase the agreement", href: "/tasks/k_due", kind: "due", at: NOW + 3 * HOUR },
  { said: "A clock: the set is due", href: "/sets/cs_1", kind: "clock", at: NOW + HOUR },
  { said: "Draft to Nippon", href: "/messages/m_d", kind: "draft", at: NOW - 5 * HOUR },
  { said: "Ring the client back", href: "/tasks/k_late2", kind: "late", at: NOW - HOUR },
  { said: "Countersign reminder", href: "/tasks/k_late1", kind: "late", at: NOW - 26 * HOUR },
  { said: "Call about feedback", href: "/tasks/k_due2", kind: "due", at: NOW + HOUR },
];

test("late first and the most late of those, then a draft a person must read, then due, clocks, routine", () => {
  assert.deepEqual(
    orderTheDay(day).map((i) => i.href),
    ["/tasks/k_late1", "/tasks/k_late2", "/messages/m_d", "/tasks/k_due2", "/tasks/k_due", "/sets/cs_1", "/messages/m_r"],
  );
});

test("the first thing and the rest; a clear day is null, not a sentence about nothing", () => {
  const got = whatFirst(day);
  assert.equal(got?.first.href, "/tasks/k_late1");
  assert.equal(got?.others.length, 6);
  assert.equal(whatFirst([]), null);
});

test("the rules can say why without a model, and the words fit the kind", () => {
  const got = whatFirst(day)!;
  assert.equal(firstBecause(got.first, got.others), "It is already late, and nothing else is. 6 more wait behind it.");
  const only = { said: "x", href: "/x", kind: "routine" as const, at: NOW };
  assert.equal(firstBecause(only, []), "Only routine notices are left; one button sends them all. Nothing else is waiting.");
  const one = { said: "x", href: "/x", kind: "draft" as const, at: NOW };
  assert.match(firstBecause(one, [only]), /1 more waits behind it/);
});

test("a day's answer is kept per person, per day, per first thing - a new first thing is a new question", () => {
  const first = day[5];
  assert.equal(whatFirstKey("m_1", "2026-11-03", first), "m_1|2026-11-03|/tasks/k_late1");
  assert.notEqual(whatFirstKey("m_1", "2026-11-03", first), whatFirstKey("m_1", "2026-11-03", day[4]));
  assert.notEqual(whatFirstKey("m_1", "2026-11-03", first), whatFirstKey("m_2", "2026-11-03", first));
});
