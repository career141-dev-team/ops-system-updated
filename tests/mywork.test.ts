/**
 * The words on My Work (13 Nov).
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  countInWords,
  dayInWords,
  doneToday,
  firstName,
  greetingFor,
  laterLast,
  lateInWords,
  rowIcon,
  rowLabel,
  summaryLine,
} from "@/lib/myWork";
import type { DayItem } from "@/lib/whatFirst";

// 12 November 2026, 09:30 in Colombo (04:00 UTC).
const NOW = Date.UTC(2026, 10, 12, 4, 0);
const H = 3_600_000;

test("the greeting follows the hour in Colombo, not the server's", () => {
  assert.equal(greetingFor(NOW), "Good morning");
  assert.equal(greetingFor(NOW + 4 * H), "Good afternoon"); // 13:30
  assert.equal(greetingFor(NOW + 9 * H), "Good evening"); // 18:30
  assert.equal(firstName("  Rushda Shareef "), "Rushda");
  assert.equal(dayInWords(NOW), "Thursday, 12 November");
  // 23:00 UTC on the 12th is already the 13th in Colombo.
  assert.equal(dayInWords(Date.UTC(2026, 10, 12, 23, 0)), "Friday, 13 November");
});

test("one sentence says how much, and how bad", () => {
  assert.equal(summaryLine(6, 2), "Six things today. Two can't wait.");
  assert.equal(summaryLine(1, 0), "One thing today. Nothing is late.");
  assert.equal(summaryLine(1, 1), "One thing today. One can't wait.");
  assert.equal(summaryLine(3, 3), "Three things today. All of them are late.");
  assert.equal(summaryLine(0, 0), "Nothing is waiting on you. The day is clear.");
  assert.equal(countInWords(14), "14");
});

test("done means done by you, today in Colombo", () => {
  const tasks = [
    { state: "done", doneBy: "m1", doneAt: NOW - H },
    { state: "done", doneBy: "m2", doneAt: NOW - H }, // somebody else
    { state: "done", doneBy: "m1", doneAt: NOW - 12 * H }, // yesterday in Colombo
    { state: "open", doneBy: null, doneAt: null },
  ];
  assert.equal(doneToday(tasks, "m1", NOW), 1);
});

test("late reads the way the design writes it", () => {
  assert.equal(lateInWords(NOW - 26 * H, NOW), "A day late");
  assert.equal(lateInWords(NOW - 3 * 24 * H, NOW), "3 days late");
  assert.equal(lateInWords(NOW - 3 * H - 60_000, NOW), "3h late");
  assert.equal(lateInWords(NOW - 20 * 60_000, NOW), "20 min late");
});

const item = (kind: DayItem["kind"], at: number, href = "/x/" + kind): DayItem => ({ said: kind, href, kind, at });

test("each row ends in how late, what to do, or when", () => {
  assert.deepEqual(rowLabel(item("late", NOW - 3 * H), NOW), { text: "3h late", late: true });
  assert.deepEqual(rowLabel(item("draft", NOW), NOW), { text: "Approve", late: false });
  assert.deepEqual(rowLabel(item("mail", NOW), NOW), { text: "Reply", late: false });
  assert.deepEqual(rowLabel(item("due", NOW + 2 * H), NOW), { text: "Today", late: false });
  assert.deepEqual(rowLabel(item("due", NOW + 20 * H), NOW), { text: "Tomorrow 05:30", late: false });
  assert.deepEqual(rowLabel(item("clock", NOW + 30 * 60_000), NOW), { text: "10:00", late: false });
  assert.equal(rowIcon(item("routine", NOW)), "mail");
  assert.equal(rowIcon(item("due", NOW)), "calendar");
  assert.equal(rowIcon(item("late", NOW)), "file");
});

test("later moves a thing to the end, and loses nothing", () => {
  const a = item("late", NOW, "/a");
  const b = item("draft", NOW, "/b");
  const c = item("due", NOW, "/c");
  assert.deepEqual(laterLast([a, b, c], ["/a"]).map((i) => i.href), ["/b", "/c", "/a"]);
  assert.deepEqual(laterLast([a, b, c], []).map((i) => i.href), ["/a", "/b", "/c"]);
});
