import assert from "node:assert/strict";
import test from "node:test";

import { bucketOf, buttonFor, clockOf, dayBounds, firstLines, standsLine, taskSource, workView } from "@/lib/myWorkView";
import type { OpsDatabase, OpsPlacement, OpsPosition, OpsTask } from "@/data/types";

const NOW = Date.parse("2026-11-19T05:00:00Z"); // 10:30 in Colombo
const task = (o: Partial<OpsTask>): OpsTask => ({
  id: "t1", kind: "check", title: "Do it", body: "Body. More.", assigneeId: "m1", dueAt: NOW + 3_600_000, state: "open",
  subjectType: null, subjectId: null, link: null, outcome: null, doneBy: null, doneAt: null, createdAt: 0, ...o,
});
const dbWith = (tasks: OpsTask[]) =>
  ({ tasks, messages: [], templates: [], calls: [], interviews: [], clients: [], clientSets: [], positions: [], leads: [], placements: [], agreements: [], requirements: [] }) as unknown as OpsDatabase;
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

test("W1 buttons open the v6 drawer the flow list names", () => {
  const none = { client: null, role: null, position: null, interview: null, set: null, clientRow: null };
  const inRole = { ...none, position: { id: "pos_1" } } as unknown as typeof none;
  assert.equal(
    buttonFor(task({ subjectType: "esa", subjectId: "esa_1", title: "Chase 3" }), none, panel).href,
    "/clients/agreements?panel=chase-agreement&on=esa_1",
  );
  assert.equal(
    buttonFor(task({ subjectType: "placement", subjectId: "pl_1", title: "Missing from the placement: address" }), inRole, panel).href,
    "/positions/pos_1?view=offer&panel=record-address&on=pl_1",
  );
  assert.equal(
    buttonFor(task({ subjectType: "placement", subjectId: "pl_2", title: "A no-show: Sahan" }), inRole, panel).href,
    "/positions/pos_1?view=offer&panel=did-not-join&on=pl_2",
  );
});

test("words", () => {
  assert.equal(standsLine(2, 4), "2 late, then 4 need you.");
  assert.equal(standsLine(0, 0), "Nothing is waiting on you.");
  assert.equal(firstLines("One. Two. Three."), "One.");
});

test("a board card says where the task came from; only a task with nothing attached is free", () => {
  assert.equal(taskSource({ subjectType: "report", link: "/reports/r1" }, ""), "From the weekly report");
  assert.equal(taskSource({ subjectType: "client", link: null }, "Nippon Paint"), "Nippon Paint");
  assert.equal(taskSource({ subjectType: null, link: "/x" }, ""), "From the system");
  assert.equal(taskSource({ subjectType: null, link: null }, ""), "Free task");
});

// 26 Nov (Nov 25 ops meeting): My positions and testimonials to ask for.
const pos = (o: Partial<OpsPosition>) => ({ id: "p1", title: "Cook", stage: "open", ownerId: "m1", clientId: "c1", requirementId: null, closedAt: null, salaryMonthly: 1000, salaryCurrency: "USD", ...o }) as unknown as OpsPosition;
const pl = (o: Partial<OpsPlacement>) => ({ id: "pl1", state: "joined", joinedAt: 1, positionId: "p1", clientId: "c1", ownerId: "m1", candidateName: "Ann", testimonial: { candidate: "pending", client: "done" }, ...o }) as unknown as OpsPlacement;
const dbPos = (positions: OpsPosition[], placements: OpsPlacement[] = []) =>
  ({ ...dbWith([]), positions, placements, clients: [{ id: "c1", name: "Acme", leadId: null }] }) as unknown as OpsDatabase;

test("my positions: main and backup, open only, value and one total per currency", () => {
  const w = workView(
    dbPos([
      pos({ id: "a" }),
      pos({ id: "b", ownerId: "m2", backupOwnerId: "m1", salaryMonthly: undefined }),
      pos({ id: "c", stage: "closed" }),
      pos({ id: "d", ownerId: "m2" }),
      pos({ id: "e", salaryCurrency: "LKR", salaryMonthly: 500 }),
    ]),
    "m1", NOW, panel,
  );
  assert.deepEqual(w.myPositions.map((p) => [p.id, p.role, p.value]), [["a", "Main", 1000], ["e", "Main", 500], ["b", "Backup", null]]);
  assert.equal(w.myPositions[0].client, "Acme");
  assert.deepEqual(w.myPositionTotals, [{ currency: "USD", amount: 1000 }, { currency: "LKR", amount: 500 }]);
});

test("testimonials pending: only joined, mine, and a side still pending", () => {
  const w = workView(
    dbPos([pos({})], [
      pl({}),
      pl({ id: "x2", testimonial: { candidate: "done", client: "done" } }),
      pl({ id: "x3", state: "offered", joinedAt: null }),
      pl({ id: "x4", ownerId: "m2" }),
      pl({ id: "x5", testimonial: { candidate: "pending", client: "pending" } }),
    ]),
    "m1", NOW, panel,
  );
  assert.equal(w.testimonialsPending.length, 3); // x4 is m2's placement but m1 owns the position
  assert.deepEqual(w.testimonialsPending[0].sides, ["candidate"]);
  assert.deepEqual(w.testimonialsPending.at(-1)!.sides, ["candidate", "client"]);
  assert.equal(w.testimonialsPending[0].href, "/positions/p1?view=offer");
});
