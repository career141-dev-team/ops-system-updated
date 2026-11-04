/**
 * What happens when something is wrong (15, Phase 8 steps 3 to 8).
 *
 * The other tests prove the work gets done. These prove the system behaves
 * when it cannot be done: the TA System down, a handler that throws, a write
 * asked for twice, and every switch off. The last one matters most - the day
 * this goes live, everything is switched off and nothing may reach a real
 * client by accident.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { dueNow, keyFor, nextTryAt, shouldGiveUp } from "@/lib/outbox";
import { gate } from "@/lib/messages";
import { sendEmail, sendWhatsApp, sendingEnabled } from "@/lib/senders";

const DAY = 86_400_000;

test("a write asked for twice carries the same key, so TA makes one of it", () => {
  const path = "/integrations/v1/openings/ta_j1/status";
  const body = { status: "closed", reason: "ended_clean" };
  assert.equal(keyFor(path, body), keyFor(path, { reason: "ended_clean", status: "closed" }), "order does not matter");
  // A different intention is a different key, or a retry would swallow it.
  assert.notEqual(keyFor(path, body), keyFor(path, { status: "open", reason: "replacement" }));
  assert.notEqual(keyFor(path, body), keyFor("/integrations/v1/openings/ta_j2/status", body));
  // Never built from the time, or every retry would look new.
  assert.equal(keyFor(path, body), keyFor(path, body));
});

test("a write that cannot get through waits longer each time, then stops", () => {
  const now = Date.now();
  const waits = [0, 1, 2, 3, 4, 11].map((attempts) => nextTryAt(attempts, now) - now);
  for (let i = 1; i < waits.length; i += 1) {
    assert(waits[i] >= waits[i - 1], "the wait never gets shorter");
  }
  assert.equal(shouldGiveUp(0), false);
  assert.equal(shouldGiveUp(11), false);
  assert.equal(shouldGiveUp(12), true, "after about nine hours a person is told instead");

  // Only what is queued and past its waiting time is tried.
  const items = [
    { state: "queued", nextTryAt: null },
    { state: "queued", nextTryAt: now - 1000 },
    { state: "queued", nextTryAt: now + 10 * 60_000 },
    { state: "sent", nextTryAt: null },
  ];
  assert.equal(dueNow(items, now).length, 2);
});

test("with the senders off, nothing can leave the building", async () => {
  // This is the state the system goes live in, and the state a laptop is
  // always in: OPS_SEND unset.
  delete process.env.OPS_SEND;
  assert.equal(sendingEnabled(), false);

  const email = await sendEmail({
    from: "ops@example.test",
    to: ["a-real-client@example.test"],
    subject: "This must not go",
    body: "Nor this.",
  });
  assert.equal(email.ok, false, "switched off is not a send");
  assert.match(email.reason ?? "", /switched off/i);
  assert.equal(email.providerMessageId, null);

  const whatsapp = await sendWhatsApp({ to: "+94770000000", body: "Nor this.", templateKey: null });
  assert.equal(whatsapp.ok, false);
  assert.match(whatsapp.reason ?? "", /switched off/i);
});

test("in test mode a client's own address is never written to", () => {
  const message = { to: ["hr@a-real-client.test"], channel: "email" as const, state: "approved" as const };
  const verdict = gate(message, {
    outreachLive: false,
    testRecipient: "test@example.test",
    doNotContact: [],
    sentToClientToday: 0,
    dailyCapPerClient: 4,
  });
  assert(verdict.ok, "it goes, but not to them");
  assert.deepEqual(verdict.ok && verdict.to, ["test@example.test"]);
  assert(verdict.ok && verdict.note?.includes("hr@a-real-client.test"), "and says whose place it took");

  // With no test address, nothing goes at all - rather than the real one.
  const nowhere = gate(message, {
    outreachLive: false,
    testRecipient: null,
    doNotContact: [],
    sentToClientToday: 0,
    dailyCapPerClient: 4,
  });
  assert.equal(nowhere.ok, false);
  assert.equal(nowhere.ok === false && nowhere.state, "blocked", "blocked, not failed: it was switched off on purpose");
});

test("the TA System being down queues the writes and tells somebody", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-hard-"));
  process.env.OPS_STORE = "json";
  // The stand-in off and no address set: this is what "TA is down" looks like.
  process.env.OPS_TA_FAKE = "off";
  delete process.env.OPS_TA_URL;
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  // The link is on; it is the other side that is down.
  repo.setSetting("switch.taWritesEnabled", true, "m_lead", "The TA link is live.");
  await desk.queueTaWrite("/integrations/v1/openings/ta_j1/status", { status: "closed" }, null);
  assert.equal(repo.all().outbox.length, 1, "the work is kept, not lost");

  const pass = await desk.pushOutbox(now);
  assert.equal(pass.sent, 0);
  assert.equal(pass.waiting, 1, "still waiting, with a reason written on it");
  const item = repo.all().outbox[0];
  assert.equal(item.state, "queued");
  assert.equal(item.attempts, 1);
  assert(item.lastError, "and the reason is kept for the health screen");
  assert(item.nextTryAt && item.nextTryAt > now, "it waits before trying again");

  // Reading degrades the same way: an answer that says no, never a throw.
  const { people } = await import("@/lib/ta");
  const read = await people();
  assert.equal(read.ok, false);
  assert(read.ok === false && read.reason, "the screen can say why rather than breaking");
});

test("a clock whose handler throws does not stop the rest of the pass", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-hard2-"));
  process.env.OPS_STORE = "json";
  // Still "down", so the handler that drafts the agreement chase cannot do
  // its work: exactly the case this is about.
  process.env.OPS_TA_FAKE = "off";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  const now = Date.now();
  // Two clocks due at once: one whose subject is gone (its handler will find
  // nothing), and one ordinary one.
  repo.startTimer({
    kind: "esa.chase",
    subjectType: "esa",
    subjectId: "esa_gone",
    startsAt: now - DAY,
    dueAt: now - 1000,
    warnAt: null,
    ownerId: "m_owner",
    payload: { label: "A vanished agreement" },
  });
  repo.startTimer({
    kind: "set.due",
    subjectType: "clientSet",
    subjectId: "cs_gone",
    startsAt: now - DAY,
    dueAt: now - 1000,
    warnAt: null,
    ownerId: "m_owner",
    payload: { label: "A set" },
  });

  const pass = await desk.runClocks(now);
  assert.equal(pass.fired, 2, "both fired; neither took the pass with it");
  const tasks = repo.all().tasks.filter((t) => t.subjectId === "esa_gone" || t.subjectId === "cs_gone");
  assert.equal(tasks.length, 2, "and each left somebody something to do");
});

test("the switches are read every time, not remembered", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-hard3-"));
  process.env.OPS_STORE = "json";
  process.env.OPS_TA_FAKE = "on";
  const { repo } = await import("@/data/store");
  const desk = await import("@/data/desk");
  repo.reset();

  // Timers off: a pass does nothing at all, and nothing is lost by it.
  repo.setSetting("switch.timersEnabled", false, "m_lead", "Pausing Ops.");
  const now = Date.now();
  repo.startTimer({
    kind: "set.due",
    subjectType: "clientSet",
    subjectId: "cs_1",
    startsAt: now - DAY,
    dueAt: now - 1000,
    warnAt: null,
    ownerId: "m_owner",
    payload: {},
  });
  const paused = await desk.runClocks(now);
  assert.equal(paused.fired, 0, "nothing fires while the clocks are off");
  assert.equal(repo.liveTimers().some((t) => t.subjectId === "cs_1"), true, "and the work is still there");

  // Back on, and the same clock fires.
  repo.setSetting("switch.timersEnabled", true, "m_lead", "Ops running again.");
  const running = await desk.runClocks(now);
  assert(running.fired >= 1, "it fires once the switch is back on");

  // TA writes off: the work still queues, so nothing is lost; it just waits.
  repo.setSetting("switch.taWritesEnabled", false, "m_lead", "Holding the TA link.");
  await desk.queueTaWrite("/integrations/v1/openings/ta_j1/status", { status: "open" }, null);
  const held = await desk.pushOutbox(now);
  assert.equal(held.sent, 0, "nothing goes to TA while the switch is off");
  assert.equal(repo.all().outbox[0].state, "queued", "and it is still queued for when it is back on");
});
