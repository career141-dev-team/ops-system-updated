/**
 * The desk assistant (8 Nov, docs/31): words into the actions the desk
 * already has. The model is not here - it answers with an intent and
 * fields; these are the rules that turn that into one button, or a
 * question, or a refusal.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase, OpsMember } from "@/data/types";
import { AGENT_ACTIONS, RUNNABLE_NAMES, catalogueInWords, resolveIntent } from "@/lib/agent";

const NOW = Date.UTC(2026, 10, 8, 6, 0);
const HOUR = 3_600_000;

const owner = { id: "m_owner", role: "ops_owner", name: "Rushda", email: "r@example.test", active: true } as unknown as OpsMember;
const marketing = { id: "m_mkt", role: "marketing", name: "Marketing", email: "m@example.test", active: true } as unknown as OpsMember;
const accounts = { id: "m_acc", role: "accounts", name: "Accounts", email: "a@example.test", active: true } as unknown as OpsMember;

function desk(): OpsDatabase {
  return {
    clients: [{ id: "cl_1", name: "Nippon Paint Lanka" }, { id: "cl_2", name: "Another Client, Pvt" }],
    messages: [
      { id: "msg_old", state: "draft", subject: "Set 1 for Nippon", to: ["hr@nippon.test"], createdAt: NOW - 2 * HOUR },
      { id: "msg_new", state: "draft", subject: "Interview: Candidate Three", to: ["md@another.test"], createdAt: NOW - HOUR },
      { id: "msg_sent", state: "sent", subject: "Old", to: ["x@y.test"], createdAt: NOW - 9 * HOUR },
    ],
    tasks: [
      { id: "k_late", state: "open", assigneeId: "m_owner", title: "Ring Nippon about the set", body: "", dueAt: NOW - HOUR },
      { id: "k_soon", state: "open", assigneeId: "m_owner", title: "Book the intro call", body: "", dueAt: NOW + HOUR },
      { id: "k_theirs", state: "open", assigneeId: "m_lead", title: "Not mine", body: "", dueAt: NOW },
    ],
    inbound: [
      { id: "in_1", readState: "new", from: "hr@nippon.test", fromName: "Nippon HR", subject: "Re: Set 1", receivedAt: NOW - HOUR },
      { id: "in_2", readState: "filed", from: "x@y.test", fromName: "X", subject: "Filed", receivedAt: NOW },
    ],
    invoices: [
      { id: "inv_1", number: "C141-2026-0001", state: "sent", clientId: "cl_1", amount: 450000 },
      { id: "inv_2", number: "C141-2026-0002", state: "paid", clientId: "cl_1", amount: 100000 },
      { id: "inv_3", number: "C141-2026-0003", state: "draft", clientId: "cl_2", amount: 300000 },
    ],
  } as unknown as OpsDatabase;
}

test("every intent names a runnable action, and the runnable list is exactly what the catalogue uses", () => {
  const used = new Set(AGENT_ACTIONS.map((a) => a.action));
  for (const name of RUNNABLE_NAMES) assert.ok(used.has(name), name + " is runnable but no intent uses it");
  for (const a of AGENT_ACTIONS) assert.ok((RUNNABLE_NAMES as readonly string[]).includes(a.action), a.name + " points at an action that is not runnable");
  assert.equal(new Set(AGENT_ACTIONS.map((a) => a.name)).size, AGENT_ACTIONS.length, "intent names are unique");
});

test("'approve the last email' is the newest draft, named on the button", () => {
  const got = resolveIntent({ intent: "approve_draft", fields: { messageId: "the last one" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(got.kind, "proposal");
  if (got.kind !== "proposal") return;
  assert.equal(got.buttons[0].action, "approveAndSend");
  assert.equal(got.buttons[0].fields.messageId, "msg_new");
  assert.match(got.buttons[0].label, /Approve and send: Interview: Candidate Three to md@another\.test/);
});

test("a draft named by a word from its subject is found; one that matches nothing is asked about", () => {
  const found = resolveIntent({ intent: "approve_draft", fields: { messageId: "nippon set" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(found.kind, "proposal");
  if (found.kind === "proposal") assert.equal(found.buttons[0].fields.messageId, "msg_old");
  const none = resolveIntent({ intent: "approve_draft", fields: { messageId: "zebra" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(none.kind, "ask");
});

test("a client must be a whole name or an unambiguous part; a stranger is asked about, never assumed", () => {
  const ok = resolveIntent({ intent: "keep_note", fields: { text: "Call back Monday", about: "nippon paint lanka" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(ok.kind, "proposal");
  if (ok.kind === "proposal") assert.equal(ok.buttons[0].fields.about, "Nippon Paint Lanka");
  const part = resolveIntent({ intent: "keep_note", fields: { text: "Call back", about: "nippon" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(part.kind, "proposal", "one client contains the word, so it is that one");
  const who = resolveIntent({ intent: "keep_note", fields: { text: "Call back", about: "Acme" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(who.kind, "ask");
  if (who.kind === "ask") assert.match(who.said, /do not know a client called "Acme"/);
});

test("money: the amount is on the button, the invoice by number or by the client's only open one, and the permission is checked", () => {
  const byNumber = resolveIntent({ intent: "record_payment", fields: { invoiceId: "c141-2026-0001", amount: "450,000", method: "bank" }, question: "", notSaid: [] }, desk(), accounts, NOW);
  assert.equal(byNumber.kind, "proposal");
  if (byNumber.kind === "proposal") {
    assert.equal(byNumber.buttons[0].fields.invoiceId, "inv_1");
    assert.equal(byNumber.buttons[0].fields.amount, "450000");
    assert.match(byNumber.buttons[0].label, /Record LKR 450,000 against C141-2026-0001 \(Nippon Paint Lanka, LKR 450,000\)/);
    assert.match(byNumber.said, /This is money/);
  }
  // Nippon has one open invoice (0002 is paid), so the client's name is enough.
  const byClient = resolveIntent({ intent: "send_invoice", fields: { invoiceId: "Nippon Paint Lanka" }, question: "", notSaid: [] }, desk(), accounts, NOW);
  assert.equal(byClient.kind, "proposal");
  if (byClient.kind === "proposal") assert.equal(byClient.buttons[0].fields.invoiceId, "inv_1");
  // No amount: asked, not guessed.
  const noAmount = resolveIntent({ intent: "record_payment", fields: { invoiceId: "C141-2026-0001" }, question: "", notSaid: [] }, desk(), accounts, NOW);
  assert.equal(noAmount.kind, "ask");
  // An ops owner may not touch money.
  const notAllowed = resolveIntent({ intent: "record_payment", fields: { invoiceId: "C141-2026-0001", amount: "1" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(notAllowed.kind, "refuse");
});

test("tasks: 'the late one' is the late one, and only your own tasks are seen", () => {
  const late = resolveIntent({ intent: "finish_task", fields: { taskId: "the late one", outcome: "Spoke to HR" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(late.kind, "proposal");
  if (late.kind === "proposal") assert.equal(late.buttons[0].fields.taskId, "k_late");
  const theirs = resolveIntent({ intent: "finish_task", fields: { taskId: "not mine", outcome: "x" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(theirs.kind, "ask");
});

test("an email must look like one, a call carries the client as its subject, and the fixed fields ride along", () => {
  const bad = resolveIntent({ intent: "write_email", fields: { to: "hr at nippon", subject: "Set", body: "Hello" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(bad.kind, "ask");
  const call = resolveIntent({ intent: "log_call", fields: { to: "077 123 4567", spokeTo: "Rushda", outcome: "Dates on Monday", about: "Nippon Paint Lanka" }, question: "", notSaid: [] }, desk(), owner, NOW);
  assert.equal(call.kind, "proposal");
  if (call.kind === "proposal") {
    assert.equal(call.buttons[0].fields.subjectId, "cl_1");
    assert.equal(call.buttons[0].fields.purpose, "other");
    assert.equal(call.buttons[0].fields.about, undefined);
  }
  const note = resolveIntent({ intent: "keep_note", fields: { text: "x" }, question: "", notSaid: [] }, desk(), owner, NOW);
  if (note.kind === "proposal") assert.equal(note.buttons[0].fields.kind, "note");
});

test("an unknown intent is refused with three offers, inside the person's own permissions; a question passes through", () => {
  const got = resolveIntent({ intent: "launch_rocket", fields: {}, question: "", notSaid: [] }, desk(), marketing, NOW);
  assert.equal(got.kind, "refuse");
  if (got.kind === "refuse") assert.match(got.said, /Here is what I can: .+; .+; .+\./);
  assert.ok(!catalogueInWords(marketing).some((l) => l.startsWith("record_payment")), "marketing is not offered money");
  assert.equal(resolveIntent({ intent: "question", fields: {}, question: "", notSaid: [] }, desk(), owner, NOW).kind, "question");
});
