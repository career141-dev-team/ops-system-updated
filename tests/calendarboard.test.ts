import assert from "node:assert/strict";
import test from "node:test";

import { clockOf, dayWord, filterCards, filterFrom, saturdayAfter, weekLabel } from "@/lib/calendarBoard";
import { DAY } from "@/lib/calendar";

const mon = Date.UTC(2026, 10, 15, 18, 30); // Mon 16 Nov 00:00 in Colombo

test("each filter keeps its own cards, and Mine keeps the owner's", () => {
  const cards = [
    { kind: "client" as const, ownerId: "a" },
    { kind: "internal" as const, ownerId: "b" },
  ];
  assert.equal(filterCards(cards, "team", "a").length, 2);
  assert.equal(filterCards(cards, "mine", "a").length, 1);
  assert.equal(filterCards(cards, "client", "a")[0].ownerId, "a");
  assert.equal(filterCards(cards, "meetings", "a").length, 0);
  assert.equal(filterFrom("nonsense"), "team");
  assert.equal(filterFrom("mine"), "mine");
});

test("the week reads Monday to Saturday, across a month end too", () => {
  assert.equal(weekLabel(mon), "Mon 16 to Sat 21 Nov");
  assert.equal(weekLabel(Date.UTC(2026, 10, 29, 18, 30)), "Mon 30 Nov to Sat 5 Dec");
  assert.equal(clockOf(Date.UTC(2026, 10, 20, 5, 0)), "10:30");
  assert.equal(dayWord(Date.UTC(2026, 10, 20, 5, 0)), "Fri 20 Nov");
});

test("Saturday follows Friday and is today only on that day", () => {
  const sat = saturdayAfter(mon + 5 * DAY, mon + 5 * DAY + 3600_000);
  assert.equal(sat.dayNum, 21);
  assert.equal(sat.isToday, true);
  assert.equal(saturdayAfter(mon + 5 * DAY, mon).isToday, false);
});
