/**
 * One pass of the clocks, and who is told when nothing happens.
 *
 * These two decide whether the Ops system actually remembers. A clock that
 * fires and leaves nothing behind is worse than no clock, and a task that
 * escalates in a loop would bury the ops lead, so both are pinned here.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { escalationFor } from "@/lib/escalation";
import { tick } from "@/lib/tick";
import type { OpsMember, OpsTask, OpsTimer } from "@/data/types";

const NOW = Date.UTC(2026, 10, 2, 4, 30);
const HOUR = 3_600_000;

const timer = (over: Partial<OpsTimer> = {}): OpsTimer => ({
  id: "t1",
  kind: "esa.chase",
  subjectType: "esa",
  subjectId: "esa_1",
  startsAt: NOW - 4 * HOUR,
  dueAt: NOW - 1,
  warnAt: NOW - 2 * HOUR,
  state: "running",
  firedAt: null,
  ownerId: "m_owner",
  payload: {},
  ...over,
});

test("a clock that is due fires and leaves a task for its owner", () => {
  const [action] = tick([timer()], NOW);
  assert.equal(action.state, "fired");
  assert(action.task, "a fired clock always leaves something to do");
  assert.equal(action.task?.assigneeId, "m_owner");
  assert.equal(action.task?.kind, "approve");
  assert.equal(action.task?.subjectId, "esa_1");
  assert.match(String(action.task?.title), /agreement has not come back/);
});

test("a clock only warning leaves no task", () => {
  const [action] = tick([timer({ dueAt: NOW + HOUR })], NOW);
  assert.equal(action.state, "warned");
  assert.equal(action.task, null);
});

test("nothing happens twice, and nothing happens early", () => {
  assert.deepEqual(tick([timer({ state: "fired" })], NOW), []);
  assert.deepEqual(tick([timer({ state: "cancelled" })], NOW), []);
  assert.deepEqual(tick([timer({ dueAt: NOW + HOUR, warnAt: NOW + HOUR / 2 })], NOW), []);
});

test("each kind of clock says, in its task, what it actually means", () => {
  const kinds: [string, RegExp][] = [
    ["feedback.chase", /Call them today/],
    ["invoice.chase", /late charge/],
    ["guarantee.end", /clean end/],
    ["set.ownership", /claim on any CV/],
  ];
  for (const [kind, expected] of kinds) {
    const [action] = tick([timer({ kind })], NOW);
    assert.match(String(action.task?.body), expected, kind);
  }
});

test("a clock nobody wrote words for still leaves a usable task", () => {
  const [action] = tick([timer({ kind: "something.new", payload: { label: "Sample Client A" } })], NOW);
  assert.equal(action.task?.kind, "check");
  assert.equal(action.task?.title, "Sample Client A");
});

test("the label of the clock is carried into the task, so it names the client", () => {
  const [action] = tick([timer({ payload: { label: "Sample Client B" } })], NOW);
  assert.match(String(action.task?.title), /Sample Client B/);
});

const members: Pick<OpsMember, "id" | "role" | "active">[] = [
  { id: "m_owner", role: "ops_owner", active: true },
  { id: "m_lead", role: "ops_lead", active: true },
  { id: "m_dirops", role: "director_ops", active: true },
];
const rules = { leadAfterHours: 24, directorAfterHours: 72 };

const task = (over: Partial<OpsTask> = {}): Pick<OpsTask, "state" | "dueAt" | "assigneeId" | "subjectType" | "title"> => ({
  state: "open",
  dueAt: NOW - 25 * HOUR,
  assigneeId: "m_owner",
  subjectType: "clientSet",
  title: "Call the client",
  ...over,
});

test("a task nobody has done for a day goes to the ops lead", () => {
  const move = escalationFor(task(), members, rules, NOW);
  assert.equal(move?.toMemberId, "m_lead");
  assert.match(String(move?.note), /25 hours/);
});

test("a task still inside the day stays where it is", () => {
  assert.equal(escalationFor(task({ dueAt: NOW - 2 * HOUR }), members, rules, NOW), null);
});

test("a finished task never escalates", () => {
  assert.equal(escalationFor(task({ state: "done" }), members, rules, NOW), null);
});

test("money and the guarantee reach the Director of Operations after three days", () => {
  const late = { dueAt: NOW - 80 * HOUR };
  assert.equal(escalationFor(task({ ...late, subjectType: "invoice" }), members, rules, NOW)?.toMemberId, "m_dirops");
  assert.equal(escalationFor(task({ ...late, subjectType: "guarantee" }), members, rules, NOW)?.toMemberId, "m_dirops");
  // Anything else stops at the lead, however late it is.
  assert.equal(escalationFor(task({ ...late, subjectType: "clientSet" }), members, rules, NOW)?.toMemberId, "m_lead");
});

test("it never passes a task to the person already holding it", () => {
  assert.equal(escalationFor(task({ assigneeId: "m_lead" }), members, rules, NOW), null);
  // The Director is the top: a money task there stays there. This line used
  // to expect "m_lead" - it asserted the step down that, with the step up on
  // the next pass, moved one task 49 times in half an hour (9 Nov).
  const withDirector = task({ assigneeId: "m_dirops", subjectType: "invoice", dueAt: NOW - 80 * HOUR });
  assert.equal(escalationFor(withDirector, members, rules, NOW), null);
});

test("with nobody above to tell, it stays put rather than looping", () => {
  const onlyOwner = [{ id: "m_owner", role: "ops_owner" as const, active: true }];
  assert.equal(escalationFor(task(), onlyOwner, rules, NOW), null);
  const inactiveLead = [...onlyOwner, { id: "m_lead", role: "ops_lead" as const, active: false }];
  assert.equal(escalationFor(task(), inactiveLead, rules, NOW), null);
});

test("escalation only goes up: the Director keeps a money task, and a lead is never passed to another lead (9 Nov)", async () => {
  const { escalationFor } = await import("@/lib/escalation");
  const HOURS = 3_600_000;
  const now = Date.UTC(2026, 10, 9, 4, 0);
  const members = [
    { id: "m_owner", role: "ops_owner", active: true },
    { id: "m_lead", role: "ops_lead", active: true },
    { id: "m_lead2", role: "ops_lead", active: true },
    { id: "m_dir", role: "director_ops", active: true },
  ] as never[];
  const rules = { leadAfterHours: 24, directorAfterHours: 72 };
  const late = (assigneeId: string, subjectType: string, hours: number) =>
    ({ state: "open", dueAt: now - hours * HOURS, assigneeId, subjectType, title: "x" }) as never;

  // Up once: an owner's money task, very late, goes to the Director.
  assert.equal(escalationFor(late("m_owner", "invoice", 100), members, rules, now)?.toMemberId, "m_dir");
  // And stays there: the lead rule must not send it back down (it did, every pass).
  assert.equal(escalationFor(late("m_dir", "invoice", 100), members, rules, now), null);
  assert.equal(escalationFor(late("m_dir", "lead", 100), members, rules, now), null);
  // A lead holding a non-money task is the top for it; another lead is not "up".
  assert.equal(escalationFor(late("m_lead2", "lead", 100), members, rules, now), null);
  // A lead holding a money task goes up to the Director once it is late enough.
  assert.equal(escalationFor(late("m_lead", "invoice", 100), members, rules, now)?.toMemberId, "m_dir");
  assert.equal(escalationFor(late("m_lead", "invoice", 30), members, rules, now), null);
});
