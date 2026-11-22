/**
 * The desk, through the store it is really configured with (6 Nov).
 *
 * Every other suite tests a rule. The rules are pure, so they are the same
 * whichever store is underneath, and that is why 45 suites were green while
 * `/mail` was a 500 on Convex: **no test had ever awaited `desk()`**. The
 * sixteen suites that import `src/data/desk.ts` take the plain helpers that
 * live in it (`clientIn(db, id)` and the like) and never the async path, so
 * every `usingConvex()` branch - 97 functions here, 64 on the backend - ran
 * for the first time when a person opened the page.
 *
 * So this suite writes and reads back through the real path, and the runner
 * points it at either store:
 *
 *     node tests/run.mjs                      the JSON file, which is CI
 *     OPS_TEST_STORE=convex node tests/run.mjs    a backend, when one is up
 *
 * What it checks is deliberately not the rules: it is **shape**. A row that
 * comes back missing a field the TypeScript type promises is the fault that
 * cost an afternoon, and it only ever shows on one store.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// The JSON store writes beside the app unless told otherwise; a test should
// not leave anything behind in the data a person is looking at.
process.env.OPS_DATA_DIR ??= fs.mkdtempSync(path.join(os.tmpdir(), "ops-both-"));

const { addChatRow, addLead, chatFor, desk, draftMessage, settleMessage, startTimer, updateChatRow } = await import("@/data/desk");
const { usingConvex } = await import("@/data/convexClient");

test("a team note can be posted, seen and deleted by its author only, and the delete is audited", async () => {
  const { addTeamNote, removeTeamNote } = await import("@/data/desk");
  const note = await addTeamNote("m_owner", "Round trip note " + Date.now());
  assert.ok((await desk()).teamNotes.some((n) => n.id === note.id));
  await removeTeamNote(note.id, "m_other");
  assert.ok((await desk()).teamNotes.some((n) => n.id === note.id), "someone else cannot delete it");
  await removeTeamNote(note.id, "m_owner");
  const after = await desk();
  assert.ok(!after.teamNotes.some((n) => n.id === note.id));
  assert.ok(after.audit.some((a) => a.action === "teamNote.deleted" && a.subjectId === note.id));
});

const WHICH = usingConvex() ? "convex" : "json";

/**
 * This suite **writes rows**, so it only ever points at a laptop.
 *
 * It is the one test that does, and the rows it leaves are real: after a run
 * against a backend whose schema has since changed, the next `convex deploy`
 * refuses until they are cleared. That is a minute on a laptop and a migration
 * anywhere else, which is reason enough for this never to reach anywhere else.
 * AGENTS.md rule 1 says the same thing in general; this says it at the one
 * place that could break it.
 */
if (usingConvex()) {
  const where = new URL(process.env.CONVEX_SELF_HOSTED_URL ?? "http://nowhere.invalid");
  const ownMachine = ["127.0.0.1", "localhost", "[::1]", "::1"].includes(where.hostname);
  assert.ok(
    ownMachine,
    "These suites write rows. " + where.hostname + " is not this machine, so they refuse to run against it.",
  );
}

/**
 * Every field `OpsLead` promises. A row missing one of these is the bug this
 * file exists for, whichever store returned it.
 */
const LEAD_FIELDS = [
  "id", "company", "nameKey", "contactName", "contactEmail", "contactPhone",
  "source", "industry", "website", "notes", "industryFlagged", "industryBecause",
  "industryConfirmedBy", "state", "reason", "doNotInvite", "clientTaId",
  "ownerId", "createdBy", "createdAt", "updatedAt",
];

/** Every field `OpsMessage` promises. `attachmentFileIds` is the one that bit. */
const MESSAGE_FIELDS = [
  "id", "channel", "to", "subject", "body", "templateKey", "state",
  "subjectType", "subjectId", "approvedBy", "approvedAt", "sentAt",
  "providerMessageId", "note", "attachmentFileIds", "createdAt",
];

function hasEveryField(row: Record<string, unknown>, fields: string[], what: string) {
  const missing = fields.filter((f) => !(f in row) || row[f] === undefined);
  assert.deepEqual(
    missing,
    [],
    what + " came back from the " + WHICH + " store without " + missing.join(", ") +
      ". The type says it is always there, so every page that reads it is a crash on this store and fine on the other.",
  );
}

test("the store answers at all, and knows who works here", async () => {
  const db = await desk();
  assert.ok(db.members.length > 0, "no members: the " + WHICH + " store is empty or unreachable");
  assert.ok(db.settings.length > 0, "no settings: nothing would have a number to work from");
  for (const member of db.members) {
    assert.equal(typeof member.id, "string");
    assert.ok(member.email.includes("@"), "a member with no address cannot sign in or be written to");
  }
});

test("a lead written through the desk comes back whole", async () => {
  const stamp = Date.now();
  const made = await addLead({
    company: "Both Stores Ltd " + stamp,
    nameKey: "bothstores" + stamp,
    contactName: "A Contact",
    contactEmail: "hr@bothstores.test",
    contactPhone: "",
    source: "call",
    industry: "manufacturing",
    website: "",
    notes: "",
    industryFlagged: false,
    industryBecause: "",
    industryConfirmedBy: null,
    state: "new",
    reason: null,
    doNotInvite: false,
    clientTaId: null,
    ownerId: (await desk()).members[0].id,
    createdBy: (await desk()).members[0].id,
  });

  hasEveryField(made as unknown as Record<string, unknown>, LEAD_FIELDS, "A lead");
  assert.equal(typeof made.id, "string");
  assert.ok(made.id.length > 0);

  // And it is really there, not just returned.
  const back = (await desk()).leads.find((one) => one.id === made.id);
  assert.ok(back, "the lead was returned but is not in the store a moment later");
  hasEveryField(back as unknown as Record<string, unknown>, LEAD_FIELDS, "A lead read back");
  assert.equal(back.company, made.company);
});

test("a drafted message always has its list of attachments", async () => {
  const me = (await desk()).members[0].id;
  const drafted = await draftMessage({
    channel: "email",
    to: ["hr@bothstores.test"],
    subject: "Both stores",
    body: "Checking the shape of what comes back.",
    templateKey: null,
    subjectType: null,
    subjectId: null,
  });

  hasEveryField(drafted as unknown as Record<string, unknown>, MESSAGE_FIELDS, "A message");

  // The exact fault: optional in the Convex schema, `Id[]` in the type, so the
  // field came back missing and the mailbox read `.length` of undefined.
  assert.ok(
    Array.isArray(drafted.attachmentFileIds),
    "attachmentFileIds is not an array on the " + WHICH + " store, and /mail reads .length of it",
  );
  assert.equal(drafted.state, "draft", "nothing is ever created already approved");

  const back = (await desk()).messages.find((one) => one.id === drafted.id);
  assert.ok(back, "the message was returned but is not in the store");
  assert.ok(Array.isArray(back.attachmentFileIds), "and it is not an array when read back either");

  // Settling it is the write every client message goes through.
  await settleMessage(drafted.id, me, "blocked", drafted.to, "Written by the test; nothing may leave.");
  const after = (await desk()).messages.find((one) => one.id === drafted.id);
  assert.equal(after?.state, "blocked");
  assert.ok(Array.isArray(after?.attachmentFileIds), "settling must not lose the attachments");
});

test("a clock started through the desk is running, and says when", async () => {
  const due = Date.now() + 60 * 60 * 1000;
  await startTimer({
    kind: "test.bothstores",
    subjectType: "test",
    subjectId: "both-" + Date.now(),
    startsAt: Date.now(),
    dueAt: due,
    warnAt: null,
    ownerId: (await desk()).members[0].id,
    payload: { why: "Started by the both-stores suite." },
  });
  const running = (await desk()).timers.filter((one) => one.kind === "test.bothstores");
  assert.ok(running.length > 0, "the clock was started and the " + WHICH + " store has none");
  const one = running[running.length - 1];
  assert.equal(one.state, "running");
  assert.equal(typeof one.dueAt, "number");
  assert.ok(one.dueAt > Date.now(), "a clock due in the past would fire the moment it was made");
});

test("every write left a trail", async () => {
  const db = await desk();
  assert.ok(db.audit.length > 0, "nothing was written down, on the " + WHICH + " store");
  for (const entry of db.audit.slice(-5)) {
    assert.equal(typeof entry.action, "string");
    assert.ok(entry.action.length > 0, "an audit line with no action says nothing");
  }
});

test("a chat line written through the desk comes back whole, buttons and all (docs/31)", async () => {
  const me = (await desk()).members[0].id;
  const row = await addChatRow({
    memberId: me,
    who: "desk",
    text: "Ready when you are.",
    buttons: [{ label: "Approve and send: x", action: "approveAndSend", fields: { messageId: "msg_x", back: "/" }, shows: [{ label: "Draft", value: "x", href: "/messages/msg_x", field: "messageId" }] }],
    state: "proposed",
    actionName: null,
    runId: null,
    at: Date.now(),
  });
  hasEveryField(row as unknown as Record<string, unknown>, ["id", "memberId", "who", "text", "buttons", "state", "actionName", "runId", "at"], "A chat row");
  assert.equal(row.buttons[0].fields.messageId, "msg_x");
  assert.equal(row.buttons[0].shows[0].label, "Draft");
  await updateChatRow(row.id, { state: "done", actionName: "approveAndSend" });
  const back = chatFor(await desk(), me, 1000).find((r) => r.id === row.id);
  assert.equal(back?.state, "done");
  assert.equal(back?.actionName, "approveAndSend");
  assert.equal(back?.buttons[0].shows[0].value, "x", "the rows a person read before pressing are kept");
});

test("a named chat: made, written into, renamed, listed, deleted with its lines (9 Nov)", async () => {
  const { addChatThread, renameChatThread, deleteChatThread, chatsOf, chatOpen, chatLines, chatName } = await import("@/data/chats");
  const me = (await desk()).members[0].id;
  const t = await addChatThread({ memberId: me, name: chatName("  approve   the last email  "), at: Date.now() });
  hasEveryField(t as unknown as Record<string, unknown>, ["id", "memberId", "name", "at"], "A chat");
  assert.equal(t.name, "approve the last email");
  const line = await addChatRow({ thread: t.id, memberId: me, who: "person", text: "hello", buttons: [], state: "said", actionName: null, runId: null, at: Date.now() + 1 });
  await renameChatThread(t.id, "Nippon set 2");
  let db = await desk();
  assert.equal(chatsOf(db, me).find((c) => c.id === t.id)?.name, "Nippon set 2");
  assert.equal(chatOpen(db, me, t.id), t.id);
  assert.equal(chatOpen(db, me, "new"), null, "New chat shows nothing until words are sent");
  assert.equal(chatOpen(db, me, "somebody-else"), chatsOf(db, me)[0].id, "an unknown cookie falls back to the latest");
  assert.deepEqual(chatLines(db, me, t.id).map((r) => r.id), [line.id]);
  await deleteChatThread(me, t.id);
  db = await desk();
  assert.ok(!chatsOf(db, me).some((c) => c.id === t.id), "the chat is gone from the list");
  assert.ok(!db.chat.some((r) => r.id === line.id), "and its lines with it");
  assert.match(chatName("x".repeat(80)), /…$/);
});
