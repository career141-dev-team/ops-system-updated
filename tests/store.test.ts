/**
 * The store, against the sample data: a clock can be started, a task closed
 * with what happened, a draft approved, and every one of those leaves a trail.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-store-"));
const { repo } = await import("@/data/store");
const { HOUR } = await import("@/lib/calendar");
repo.reset();

test("the sample data has people, settings and clocks, and no real names", () => {
  assert(repo.members().length >= 4);
  assert(repo.settings().length > 10);
  assert(repo.liveTimers().length >= 1);
  const text = JSON.stringify(repo.members()) + JSON.stringify(repo.messages());
  assert.match(text, /example\.test/);
  assert.doesNotMatch(text, /career141\.com/, "no real address belongs in sample data");
});

test("starting a clock records it as running and leaves a trail", () => {
  const before = repo.audit().length;
  const timer = repo.startTimer({
    kind: "test.clock",
    subjectType: "test",
    subjectId: "test",
    startsAt: Date.now(),
    dueAt: Date.now() + 2 * HOUR,
    warnAt: Date.now() + HOUR,
    ownerId: "m_owner",
    payload: { label: "Test" },
  });
  assert.equal(timer.state, "running");
  assert(repo.liveTimers().some((t) => t.id === timer.id));
  assert.equal(repo.audit().length, before + 1);
  assert.equal(repo.audit()[0].action, "timer.started");
});

test("a task is closed with what happened, and by whom", () => {
  const task = repo.openTasksFor("m_owner")[0];
  assert(task, "the sample data gives the owner something to do");
  repo.finishTask(task.id, "m_owner", "  Will send slots on Friday  ");
  const after = repo.task(task.id);
  assert.equal(after?.state, "done");
  assert.equal(after?.outcome, "Will send slots on Friday");
  assert.equal(after?.doneBy, "m_owner");
  assert.equal(repo.audit()[0].reason, "Will send slots on Friday");
});

test("a draft can be edited, then settled once, with the reason kept", () => {
  const draft = repo.draftsWaiting()[0];
  assert(draft);
  repo.editMessage(draft.id, { subject: "Changed subject", body: "Changed body" }, "m_owner");
  assert.equal(repo.message(draft.id)?.subject, "Changed subject");

  repo.settleMessage(draft.id, "m_owner", "sent", ["test@example.test"], "Test mode: sent to test@example.test");
  const sent = repo.message(draft.id);
  assert.equal(sent?.state, "sent");
  assert.deepEqual(sent?.to, ["test@example.test"]);
  assert(sent?.sentAt);

  // An edit after it has gone changes nothing: the record of what was sent stands.
  repo.editMessage(draft.id, { subject: "Too late", body: "Too late" }, "m_owner");
  assert.equal(repo.message(draft.id)?.subject, "Changed subject");
});

test("changing a setting keeps the old value and demands a reason", () => {
  repo.setSetting("set.minCvs", 6, "m_lead", "The client asked for six");
  assert.equal(repo.setting("set.minCvs")?.value, 6);
  const entry = repo.audit()[0];
  assert.equal(entry.action, "setting.changed");
  assert.equal(entry.before, "5");
  assert.equal(entry.after, "6");
  assert.equal(entry.reason, "The client asked for six");
});

test("a write by another copy of the store is seen, not overwritten (8 Nov)", () => {
  // In `next dev` the action, the page and the route handler each hold their
  // own copy of this module. The page's clock pass saved a stale cache over
  // a note the action had just written. So: when the file changes under us,
  // the next load reads it rather than trusting the cache.
  const file = path.join(process.env.OPS_DATA_DIR as string, "ops.json");
  const onDisk = JSON.parse(fs.readFileSync(file, "utf8"));
  onDisk.tasks.push({
    id: "k_from_elsewhere", kind: "remind", title: "Written by the other copy", body: "", assigneeId: "m_owner",
    dueAt: Date.now(), state: "open", subjectType: null, subjectId: null, link: null, outcome: null, doneBy: null, doneAt: null, createdAt: Date.now(),
  });
  // A later mtime, as a real second write has: the clock is coarse on some disks.
  fs.writeFileSync(file, JSON.stringify(onDisk, null, 2));
  const later = new Date(Date.now() + 5_000);
  fs.utimesSync(file, later, later);

  assert.ok(repo.all().tasks.some((t) => t.id === "k_from_elsewhere"), "the other copy's task is read, not lost");
  // And our own next write keeps it.
  repo.createTask({ kind: "remind", title: "Ours", body: "", assigneeId: "m_owner", dueAt: Date.now(), subjectType: null, subjectId: null, link: null });
  const after = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.ok(after.tasks.some((t: { id: string }) => t.id === "k_from_elsewhere"), "still there after our save");
});
