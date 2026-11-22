/** Outlook events: mapping, private ones, and what counts as a clash. */
import assert from "node:assert/strict";
import test from "node:test";

import { clashWith, mapEvents } from "@/lib/outlook";

// 20 Nov 2026, 10:00 Colombo = 04:30 UTC.
const T = Date.UTC(2026, 10, 20, 4, 30);
const graph = {
  value: [
    { id: "a", subject: "Weekly sync", start: { dateTime: "2026-11-20T04:30:00.0000000" }, end: { dateTime: "2026-11-20T05:00:00.0000000" }, isOnlineMeeting: true, onlineMeeting: { joinUrl: "https://teams.example/j" }, showAs: "busy" },
    { id: "b", subject: "Dentist", sensitivity: "private", isOnlineMeeting: true, onlineMeeting: { joinUrl: "https://teams.example/p" }, start: { dateTime: "2026-11-20T06:00:00.0000000" }, end: { dateTime: "2026-11-20T07:00:00.0000000" } },
    { id: "c", subject: "Lunch", showAs: "free", start: { dateTime: "2026-11-20T07:00:00.0000000" }, end: { dateTime: "2026-11-20T08:00:00.0000000" } },
    { subject: "no id" },
  ],
};

test("events map to UTC times with the join link", () => {
  const e = mapEvents(graph);
  assert.equal(e.length, 3);
  assert.deepEqual(e[0], { id: "a", title: "Weekly sync", start: T, end: T + 30 * 60_000, joinUrl: "https://teams.example/j", busy: true });
});

test("a private event is Busy with no link", () => {
  const b = mapEvents(graph).find((e) => e.id === "b")!;
  assert.equal(b.title, "Busy");
  assert.equal(b.joinUrl, undefined);
});

test("a clash is named, in Colombo time", () => {
  assert.equal(clashWith(T + 15 * 60_000, 30, mapEvents(graph)), 'You have "Weekly sync" in Outlook at 10:00 - 10:30.');
});

test("touching ends, free time and no events do not clash", () => {
  const e = mapEvents(graph);
  assert.equal(clashWith(T + 30 * 60_000, 30, e), null); // starts as the sync ends
  assert.equal(clashWith(T - 30 * 60_000, 30, e), null); // ends as it starts
  assert.equal(clashWith(Date.UTC(2026, 10, 20, 7, 0), 30, e), null); // free
  assert.equal(clashWith(T, 30, []), null);
  assert.deepEqual(mapEvents(null), []);
});
