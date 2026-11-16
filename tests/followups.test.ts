/**
 * Follow-up gaps (16 Nov, plan B3).
 *
 *  - the `slots.chase` and `interview.report` clocks now draft a chase, never send one;
 *  - a client who has answered is not chased;
 *  - the outbound gate gets a real do-not-contact list and a real count for today.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.OPS_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ops-followups-"));
process.env.OPS_STORE = "json";
delete process.env.OPS_SEND;

const { repo } = await import("@/data/store");
const desk = await import("@/data/desk");
const { DAY } = await import("@/lib/calendar");
const { doNotContactFrom, gate, sentToday } = await import("@/lib/messages");

repo.reset();
const OWNER = "m_owner";

function interview(over: Record<string, unknown> = {}) {
  return repo.addInterview({
    applicationTaId: "ta_a1",
    openingTaId: "ta_j1",
    positionId: null,
    clientId: null,
    candidateName: "SAMPLE CANDIDATE",
    scheduler: "us",
    state: "slots",
    round: 1,
    slots: [],
    slotLoops: 1,
    at: null,
    format: "online",
    interviewers: ["panel@example.test"],
    whereOrLink: "",
    interviewTaId: null,
    inviteMessageId: null,
    attendedAt: null,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    candidateFeedback: null,
    reason: null,
    ownerId: OWNER,
    ...over,
  } as Parameters<typeof repo.addInterview>[0]);
}

function overdue(kind: string, subjectId: string, now: number) {
  repo.startTimer({
    kind,
    subjectType: "interview",
    subjectId,
    startsAt: now - 3 * DAY,
    dueAt: now - 1_000,
    warnAt: null,
    ownerId: OWNER,
    payload: { label: "SAMPLE CANDIDATE" },
  });
}

test("slots.chase fires and drafts a chase for the client's people", async () => {
  const now = Date.now();
  const iv = interview();
  overdue("slots.chase", iv.id, now);
  await desk.runClocks(now);
  const drafts = repo.all().messages.filter((m) => m.subjectId === iv.id);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].state, "draft", "a chase is only ever a draft");
  assert.deepEqual(drafts[0].to, ["panel@example.test"]);
  assert.match(drafts[0].body, /waiting for times/);
  assert.doesNotMatch(drafts[0].subject + drafts[0].body, /\{\{/);
});

test("interview.report drafts a chase for the date, as well as leaving its task", async () => {
  const now = Date.now();
  const iv = interview({ scheduler: "client" });
  overdue("interview.report", iv.id, now);
  await desk.runClocks(now);
  const drafts = repo.all().messages.filter((m) => m.subjectId === iv.id);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].state, "draft");
  assert.match(drafts[0].body, /date you have booked/);
  assert.ok(repo.all().tasks.some((t) => t.subjectId === iv.id), "the task is still left for a person");
});

test("a client who has answered is not chased", async () => {
  const withTimes = interview({ slots: [Date.now() + DAY] });
  const booked = interview({ state: "booked", at: Date.now() + DAY });
  assert.equal((await desk.chaseForSlots(withTimes.id)).ok, false);
  assert.equal((await desk.chaseForDate(booked.id)).ok, false);
  assert.equal(repo.all().messages.filter((m) => m.subjectId === withTimes.id || m.subjectId === booked.id).length, 0);
});

test("nobody named means no draft, and the task still says who to ask", async () => {
  const iv = interview({ interviewers: [] });
  const answer = await desk.chaseForSlots(iv.id);
  assert.equal(answer.ok, false);
  assert.equal(answer.messageId, null);
});

test("do-not-contact comes from leads marked do-not-invite, whatever the spelling", () => {
  const list = doNotContactFrom([
    { contactEmail: "Never@Client.test, other@client.test", doNotInvite: true },
    { contactEmail: "fine@client.test", doNotInvite: false },
  ]);
  assert.deepEqual(list, ["never@client.test", "other@client.test"]);
});

test("the gate blocks a do-not-contact address with the real list", () => {
  const verdict = gate(
    { to: ["NEVER@client.test"], channel: "email", state: "approved", subject: "s", body: "b" },
    { outreachLive: true, testRecipient: null, doNotContact: doNotContactFrom([{ contactEmail: "never@client.test", doNotInvite: true }]), sentToClientToday: 0, dailyCapPerClient: 4 },
  );
  assert.equal(verdict.ok, false);
});

test("sentToday counts only what really went to these people, in the Colombo day", () => {
  const now = Date.UTC(2026, 10, 16, 6, 0); // 11:30 Colombo
  const early = Date.UTC(2026, 10, 15, 19, 0); // 00:30 Colombo, the 16th
  const yesterday = Date.UTC(2026, 10, 15, 17, 0); // 22:30 Colombo, the 15th
  const sent = (to: string, sentAt: number | null, state = "sent", channel = "email") =>
    ({ to: [to], sentAt, state, channel }) as Parameters<typeof sentToday>[0][number];
  const messages = [
    sent("a@client.test", now - 1000),
    sent("A@client.test", early),
    sent("a@client.test", yesterday),
    sent("a@client.test", now - 1000, "draft"),
    sent("a@client.test", now - 1000, "blocked"),
    sent("b@client.test", now - 1000),
  ];
  assert.equal(sentToday(messages, ["a@client.test"], now), 2);
  assert.equal(sentToday(messages, ["nobody@client.test"], now), 0);
});

test("the gate blocks at the daily cap", () => {
  const verdict = gate(
    { to: ["a@client.test"], channel: "email", state: "approved", subject: "s", body: "b" },
    { outreachLive: true, testRecipient: null, doNotContact: [], sentToClientToday: 4, dailyCapPerClient: 4 },
  );
  assert.equal(verdict.ok, false);
});
