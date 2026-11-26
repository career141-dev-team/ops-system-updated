/**
 * The gate every outgoing message passes.
 *
 * Ops writes to real clients, so this is the file that must never be wrong: a
 * person approves, test mode really blocks, do-not-contact really stops it, and
 * one client is never written to past the daily cap.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  doNotContactFrom,
  draftKind,
  fillTemplate,
  gate,
  isRoutine,
  needsApproval,
  sentToday,
  type SendContext,
  unfilledHoles,
} from "@/lib/messages";

const ctx = (over: Partial<SendContext> = {}): SendContext => ({
  outreachLive: false,
  testRecipient: "test@example.test",
  doNotContact: [],
  sentToClientToday: 0,
  dailyCapPerClient: 4,
  ...over,
});

const message = { to: ["hr@example.test"], channel: "email" as const, state: "approved" as const };

test("a draft to a client needs a person; an internal note does not", () => {
  assert.equal(needsApproval({ state: "draft", channel: "email" }), true);
  assert.equal(needsApproval({ state: "draft", channel: "internal" }), false);
  assert.equal(needsApproval({ state: "approved", channel: "email" }), false);
});

test("nothing unapproved gets through the gate", () => {
  const r = gate({ ...message, state: "draft" }, ctx());
  assert.deepEqual(r, { ok: false, state: "blocked", note: "Nobody has approved this message yet." });
});

test("in test mode it goes to the test address, and says whose place it took", () => {
  const r = gate(message, ctx());
  assert.equal(r.ok, true);
  assert(r.ok && r.to.length === 1 && r.to[0] === "test@example.test");
  assert.match(String(r.ok && r.note), /hr@example\.test/);
});

test("test mode with no test address sends nothing at all", () => {
  const r = gate(message, ctx({ testRecipient: null }));
  assert.equal(r.ok, false);
  assert(!r.ok && r.state === "blocked");
});

test("a do-not-contact address stops it, whatever the spelling", () => {
  const r = gate(message, ctx({ doNotContact: ["HR@Example.Test"] }));
  assert.equal(r.ok, false);
  assert(!r.ok && /do-not-contact/.test(r.note));
});

test("the daily cap per client holds", () => {
  assert.equal(gate(message, ctx({ sentToClientToday: 3 })).ok, true);
  const capped = gate(message, ctx({ sentToClientToday: 4 }));
  assert.equal(capped.ok, false);
  assert(!capped.ok && /already had 4 messages today/.test(capped.note));
});

test("with nobody to send to it fails rather than silently passing", () => {
  const r = gate({ ...message, to: ["  "] }, ctx());
  assert.equal(r.ok, false);
  assert(!r.ok && r.state === "failed");
});

test("live outreach sends to the real recipients and adds no note", () => {
  const r = gate(message, ctx({ outreachLive: true }));
  assert.deepEqual(r, { ok: true, to: ["hr@example.test"], note: null });
});

test("an internal note skips the gate entirely", () => {
  const r = gate({ to: ["m_owner"], channel: "internal", state: "draft" }, ctx());
  assert.deepEqual(r, { ok: true, to: ["m_owner"], note: null });
});

test("a template with a hole left in it reports the hole", () => {
  const filled = fillTemplate("Dear {{name}}, the fee is {{fee}}.", { name: "Sample", fee: "one month" });
  assert.equal(filled.text, "Dear Sample, the fee is one month.");
  assert.deepEqual(filled.missing, []);

  const short = fillTemplate("Dear {{name}}, your tax number is {{tax}}.", { name: "Sample", tax: " " });
  assert.deepEqual(short.missing, ["tax"]);
  assert.match(short.text, /\{\{tax\}\}/);
});

test("a group post passes with no address, because a person posts it", () => {
  // The group may not exist when the first set goes out. Approving the post
  // must not read as a failure for that (found in the browser, 3 Nov).
  const post = { to: [] as string[], channel: "group_post" as const, state: "approved" as const };
  const nameless = gate(post, ctx());
  assert.equal(nameless.ok, true);
  assert.match(String(nameless.ok && nameless.note), /not written down yet/);

  const named = gate({ ...post, to: ["Career 141 x Sample Client"] }, ctx());
  assert(named.ok && named.to[0] === "Career 141 x Sample Client", "not sent to the test address");
  assert.match(String(named.ok && named.note), /Yours to post/);

  // It still waits for a person, like everything else.
  assert.equal(gate({ ...post, state: "draft" }, ctx()).ok, false);
});

const BREAK = String.fromCharCode(10);

test("a hole nobody filled never reaches a client", () => {
  // The mailbox walk on 5 November: a drop-out notice drafted, approved and
  // signed "{{opsPerson}}". fillTemplate always said a hole stops the send;
  // the gate was the place that never asked.
  assert.deepEqual(unfilledHoles("Dear all," + BREAK + "Kind regards" + BREAK + "{{opsPerson}}"), ["opsPerson"]);
  assert.deepEqual(unfilledHoles("nothing to fill"), []);

  const verdict = gate(
    {
      to: ["hr@example.test"],
      channel: "email",
      state: "approved",
      subject: "{{candidate}} - interview",
      body: "Kind regards" + BREAK + "{{opsPerson}}",
    },
    {
      doNotContact: [],
      sentToClientToday: 0,
      dailyCapPerClient: 5,
      outreachLive: true,
      testRecipient: null,
    },
  );
  assert.equal(verdict.ok, false);
  assert.equal(verdict.ok === false && verdict.state, "blocked");
  assert.match(verdict.ok === false ? verdict.note ?? "" : "", /\{\{candidate\}\}, \{\{opsPerson\}\}/);
  assert.match(verdict.ok === false ? verdict.note ?? "" : "", /nobody filled/);

  // Nothing changes for a message whose words are finished.
  const fine = gate(
    { to: ["hr@example.test"], channel: "email", state: "approved", subject: "The set", body: "Attached." },
    { doNotContact: [], sentToClientToday: 0, dailyCapPerClient: 5, outreachLive: true, testRecipient: null },
  );
  assert.equal(fine.ok, true);
});

/* ── Which drafts "approve all routine" may take (7 Nov, UX order 2) ── */

test("a routine notice is one from a template somebody approved once, and nothing else", () => {
  const approved = { approvedForAuto: true };
  const notApproved = { approvedForAuto: false };

  // The owner's rule: wording approved once, for notices only.
  assert.equal(isRoutine({ templateKey: "task.notice", state: "draft" }, approved), true);

  // A template nobody approved for this: a person reads it.
  assert.equal(isRoutine({ templateKey: "esa.chase2", state: "draft" }, notApproved), false);

  // Hand-written is never routine, whatever else is true.
  assert.equal(isRoutine({ templateKey: null, state: "draft" }, approved), false);

  // A key that no longer names a template: refuse, do not guess.
  assert.equal(isRoutine({ templateKey: "gone.template", state: "draft" }, null), false);

  // Only a draft. An approved or sent one is already settled.
  assert.equal(isRoutine({ templateKey: "task.notice", state: "approved" }, approved), false);
  assert.equal(isRoutine({ templateKey: "task.notice", state: "sent" }, approved), false);
});

test("a draft's kind comes from what it is about", () => {
  assert.equal(draftKind({ subjectType: "esa" }), "agreements");
  assert.equal(draftKind({ subjectType: "clientSet", templateKey: "esa.chase2" }), "chases");
  assert.equal(draftKind({ subjectType: "invoice" }), "invoices");
  assert.equal(draftKind({ subjectType: "interview", templateKey: "interview.reminder" }), "candidates");
  assert.equal(draftKind({ subjectType: "interview", templateKey: "interview.client_feedback" }), "chases");
  assert.equal(draftKind({ subjectType: null }), "chases");
  assert.equal(draftKind({ subjectType: "applicant", templateKey: "hiring.interview_invite" }), "candidates");
});
