import assert from "node:assert/strict";
import test from "node:test";

import { bucketOf, buttonFor, clockOf, dayBounds, firstLines, standsLine, workView } from "@/lib/myWorkView";
import type { OpsDatabase, OpsTask } from "@/data/types";

const NOW = Date.parse("2026-11-19T05:00:00Z"); // 10:30 in Colombo
const task = (o: Partial<OpsTask>): OpsTask => ({
  id: "t1", kind: "check", title: "Do it", body: "Body. More.", assigneeId: "m1", dueAt: NOW + 3_600_000, state: "open",
  subjectType: null, subjectId: null, link: null, outcome: null, doneBy: null, doneAt: null, createdAt: 0, ...o,
});
const dbWith = (tasks: OpsTask[]) =>
  ({ tasks, messages: [], templates: [], calls: [], interviews: [], clients: [], clientSets: [], positions: [], leads: [] }) as unknown as OpsDatabase;
const panel = (n: string, id: string) => `/?panel=${n}&on=${id}`;

test("buckets: late, today, waits, later", () => {
  assert.equal(bucketOf({ title: "x", dueAt: NOW - 1 }, NOW), "late");
  assert.equal(bucketOf({ title: "x", dueAt: NOW + 60_000 }, NOW), "today");
  assert.equal(bucketOf({ title: "x", dueAt: NOW + 2 * 86_400_000 }, NOW), "later");
  assert.equal(bucketOf({ title: "Waits for: Ravi", dueAt: NOW - 1 }, NOW), "waits");
});

test("day bounds are the Colombo day", () => {
  const { start, end } = dayBounds(NOW);
  assert.equal(clockOf(start), "00:00");
  assert.equal(end - start, 86_400_000);
});

test("a call task opens the call panel; late comes first in Do first", () => {
  const db = dbWith([task({ id: "a", kind: "call", title: "Call X", dueAt: NOW + 1000 }), task({ id: "b", dueAt: NOW - 86_400_000 })]);
  const w = workView(db, "m1", NOW, panel);
  assert.equal(w.doFirst[0].taskId, "b");
  assert.equal(w.doFirst[0].tag, "Late · 1 day");
  assert.equal(w.calls[0].button?.href, "/?panel=call-client&on=a");
  assert.equal(w.counts.tasks, 2);
});

test("somebody else's task is not mine", () => {
  assert.equal(workView(dbWith([task({ assigneeId: "m2" })]), "m1", NOW, panel).counts.tasks, 0);
});

test("a plain task falls back to its own page", () => {
  const ctx = { client: null, role: null, position: null, interview: null, set: null, clientRow: null };
  assert.equal(buttonFor(task({}), ctx, panel).href, "/tasks/t1");
});

test("words", () => {
  assert.equal(standsLine(2, 4), "2 late, then 4 need you.");
  assert.equal(standsLine(0, 0), "Nothing is waiting on you.");
  assert.equal(firstLines("One. Two. Three."), "One.");
});
