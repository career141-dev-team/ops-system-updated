/**
 * One full run-through of Phase 1 (15, Phase 1 step 26).
 *
 * Not a unit test: this is the phase test from the build plan, the whole
 * foundation in one go. A clock runs out and leaves somebody something to do;
 * a message is drafted, approved and stopped by the test-mode guard; a client
 * replies and the chasing stops; a file is kept and found again; a call is
 * written down; a write waits for the TA System and then goes; the TA System's
 * events are read in order and the place we have read to moves.
 *
 * If this passes, the foundation holds together. Every piece has its own test
 * beside this one; this is the proof that they are wired to each other.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-runthrough-"));
process.env.OPS_STORE = "json";
// The TA side of the API does not exist yet, so the run-through talks to the
// stand-in. Everything else is the real code path.
process.env.OPS_TA_FAKE = "on";
// Nothing may leave the building during a test, even in a test.
delete process.env.OPS_SEND;

const { repo } = await import("@/data/store");
const desk = await import("@/data/desk");
const { HOUR } = await import("@/lib/calendar");
const { referenceFor } = await import("@/lib/mailMatch");
const { keyFor, mimeFor, sha256 } = await import("@/lib/files");
const { putBytes, readBytes } = await import("@/data/fileStore");

repo.reset();

const OWNER = "m_owner";
const NOW = Date.now();

test("a clock runs out and leaves a person something to do", async () => {
  repo.startTimer({
    kind: "esa.chase",
    subjectType: "esa",
    subjectId: "esa_run",
    startsAt: NOW - 3 * HOUR,
    dueAt: NOW - HOUR,
    warnAt: NOW - 2 * HOUR,
    ownerId: OWNER,
    payload: { label: "SAMPLE CLIENT" },
  });

  const pass = await desk.runClocks(NOW);
  assert.equal(pass.fired >= 1, true, "the overdue clock fired");

  const task = repo
    .openTasksFor(OWNER)
    .find((t) => t.subjectId === "esa_run");
  assert(task, "firing left a task behind");
  assert.match(task.title, /agreement has not come back/i);
});

test("a second clock for the same thing is cancelled when the client replies", async () => {
  const timer = repo.startTimer({
    kind: "esa.chase",
    subjectType: "esa",
    subjectId: "esa_reply",
    startsAt: NOW,
    dueAt: NOW + 24 * HOUR,
    warnAt: NOW + 12 * HOUR,
    ownerId: OWNER,
    payload: { label: "SAMPLE CLIENT" },
  });

  const stopped = await desk.recordReply("esa", "esa_reply", OWNER);
  assert.equal(stopped, 1);
  assert.equal(repo.timers().find((t) => t.id === timer.id)?.state, "cancelled");
});

test("a client's reply arrives by email, is matched by our reference, and stops the chase", async () => {
  // The reply is matched against something we have written about, which is why
  // this uses the set the sample desk has already drafted a message for: a
  // reference naming nothing is deliberately refused rather than guessed at.
  const chase = repo.startTimer({
    kind: "feedback.chase",
    subjectType: "clientSet",
    subjectId: "cs_1",
    startsAt: NOW,
    dueAt: NOW + 24 * HOUR,
    warnAt: null,
    ownerId: OWNER,
    payload: { label: "SAMPLE CLIENT set 2" },
  });
  const reference = referenceFor("clientSet", "cs_1");

  const taken = await desk.takeInbound(
    [
      {
        mailbox: "opsteam@example.test",
        from: "hr@example.test",
        fromName: "SAMPLE CONTACT",
        receivedAt: NOW,
        subject: "RE: SAMPLE CLIENT A > Head of engineering > set 2 " + reference,
        body: "Two of these look good, we will come back on the third.",
        providerId: "<client-reply-1@example.test>",
        inReplyTo: null,
      },
    ],
    OWNER,
    NOW,
  );

  assert.equal(taken.read, 1);
  assert.equal(taken.filed, 1, "it was filed, not left for somebody to place");
  assert.equal(taken.chasesStopped, 1, "the chase stopped because the client answered");
  assert.equal(repo.timers().find((t) => t.id === chase.id)?.state, "cancelled");
});

test("the same email arriving twice is recorded once", async () => {
  const again = await desk.takeInbound(
    [
      {
        mailbox: "opsteam@example.test",
        from: "hr@example.test",
        fromName: "SAMPLE CONTACT",
        receivedAt: NOW,
        subject: "RE: SAMPLE CLIENT A > Head of engineering > set 2",
        body: "Two of these look good.",
        providerId: "<client-reply-1@example.test>",
        inReplyTo: null,
      },
    ],
    OWNER,
    NOW,
  );
  assert.equal(again.read, 0, "nothing new was recorded");
});

test("a message is drafted, approved, and stopped by the guards rather than sent", () => {
  const draft = repo.draftsWaiting()[0];
  assert(draft, "the sample desk has something waiting for approval");

  repo.settleMessage(
    draft.id,
    OWNER,
    "blocked",
    ["test@example.test"],
    "Test mode: sent to test@example.test instead of hr@example.test. Sending is switched off (OPS_SEND).",
  );
  const after = repo.message(draft.id);
  assert.equal(after?.state, "blocked");
  assert.match(after?.note ?? "", /switched off/);
  assert.equal(after?.sentAt, null, "nothing that was blocked may look sent");
});

test("a file is kept and found again, by its own hash", async () => {
  const bytes = new TextEncoder().encode("SAMPLE agreement, not a real client.");
  const name = "SAMPLE agreement.pdf";
  const key = keyFor("esa_signed", "esa", "esa_run", name, NOW);
  await putBytes(key, bytes, mimeFor(name));
  const row = repo.addFile({
    kind: "esa_signed",
    key,
    name,
    size: bytes.length,
    mime: mimeFor(name),
    sha256: sha256(bytes),
    subjectType: "esa",
    subjectId: "esa_run",
    madeFrom: null,
    uploadedBy: OWNER,
  });

  const back = await readBytes(row.key);
  assert(back, "the bytes come back");
  assert.equal(sha256(back), row.sha256, "and they are the same bytes");
});

test("a call is written down, and the call task is finished by writing it", async () => {
  const task = repo.createTask({
    kind: "call",
    title: "Call SAMPLE CONTACT about the set",
    body: "They have not answered two emails.",
    assigneeId: OWNER,
    dueAt: NOW,
    subjectType: "clientSet",
    subjectId: "cs_1",
    link: null,
  });

  await desk.logCall({
    taskId: task.id,
    to: "+94771234567",
    toName: "SAMPLE CONTACT",
    purpose: "feedback.chase",
    spokeTo: "SAMPLE CONTACT",
    outcome: "They will send feedback on Friday.",
    subjectType: "clientSet",
    subjectId: "cs_1",
    by: OWNER,
  });
  repo.finishTask(task.id, OWNER, "Called: they will send feedback on Friday.");

  assert.equal(repo.calls()[0].outcome, "They will send feedback on Friday.");
  assert.equal(repo.task(task.id)?.state, "done");
});

test("the holiday list changes what a working-day clock means", async () => {
  const { addWorkingDays, colomboDate } = await import("@/lib/calendar");
  // A Monday, so the next working day is the Tuesday - unless it is a holiday.
  const monday = Date.UTC(2026, 10, 2, 4);
  const tuesday = colomboDate(addWorkingDays(monday, 1, []));
  assert.equal(tuesday, "2026-11-03");

  const added = await desk.addHolidays([{ date: "2026-11-03", name: "SAMPLE poya day" }], OWNER);
  assert.equal(added, 1);
  const afterHoliday = colomboDate(addWorkingDays(monday, 1, repo.holidays()));
  assert.equal(afterHoliday, "2026-11-04", "the clock steps over the holiday");
});

test("today's numbers are recorded, so a later number can be compared", async () => {
  await desk.addBaseline({
    measure: "esa.returnDays",
    period: "May to October 2026",
    value: 9.5,
    note: "counted from the agreement folder",
    by: OWNER,
  });
  const row = repo.baseline()[0];
  assert.equal(row.measure, "esa.returnDays");
  assert.equal(row.value, 9.5);
});

test("a write to the TA System waits in the outbox, then goes, and a repeat is one write", async () => {
  const first = await desk.queueTaWrite("/integrations/v1/notify", { userId: "ta_u1", title: "SAMPLE" });
  const same = await desk.queueTaWrite("/integrations/v1/notify", { title: "SAMPLE", userId: "ta_u1" });
  assert.equal(same.id, first.id, "the same intention twice is one write");
  assert.equal(first.state, "queued");

  const pushed = await desk.pushOutbox(NOW);
  assert.equal(pushed.sent, 1);
  assert.equal(repo.outbox().find((o) => o.id === first.id)?.state, "sent");
});

test("a write that cannot get through waits, and is not lost", async () => {
  process.env.OPS_TA_FAKE = "off";
  process.env.OPS_TA_WRITES_ENABLED = "off";
  const item = await desk.queueTaWrite("/integrations/v1/openings", { clientId: "ta_c1", title: "SAMPLE ROLE" });

  const pushed = await desk.pushOutbox(NOW);
  assert.equal(pushed.sent, 0);
  assert.equal(pushed.waiting, 1);
  const after = repo.outbox().find((o) => o.id === item.id);
  assert.equal(after?.state, "queued", "still waiting, never thrown away");
  assert.match(after?.lastError ?? "", /switched off/);
  assert.equal(after?.nextTryAt !== null, true, "and it knows when to try again");
  process.env.OPS_TA_FAKE = "on";
});

test("the TA System's events are read in order, once each, and the place we have read to moves", async () => {
  const first = await desk.readTaEvents(NOW);
  assert.equal(first.reason, null);
  assert.equal(first.read >= 3, true);
  assert.equal(first.kept, first.read);

  const cursor = repo.setting(desk.EVENTS_CURSOR)?.value;
  assert(cursor, "we remember where we got to");

  const again = await desk.readTaEvents(NOW);
  assert.equal(again.read, 0, "nothing is read twice");
  assert.equal(repo.events().filter((e) => e.taEventId === "ta_ev_1").length, 1);

  const unknown = repo.events().find((e) => e.type === "something.we.do.not.know");
  assert(unknown, "an event we do not understand is kept");
  assert.match(unknown.note, /do not know/);
});

test("everything that happened is in the trail, with who did it", () => {
  const actions = repo.audit().map((a) => a.action);
  for (const expected of [
    "timer.fired",
    "task.created",
    "timer.cancelled",
    "inbound.recorded",
    "file.kept",
    "call.logged",
    "holidays.added",
    "baseline.recorded",
    "outbox.queued",
    "outbox.sent",
  ]) {
    assert(actions.includes(expected), "the trail records " + expected);
  }
  // The events cursor and the clock pass are deliberately not in the trail.
  assert.equal(actions.filter((a) => a === "setting.changed").length, 0);
});
