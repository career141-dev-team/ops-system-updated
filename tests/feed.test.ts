/**
 * The feed (8 Nov, docs/31 part 2): what arrived by itself becomes a line
 * in the chat, once, for the person it is for.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase } from "@/data/types";
import { feedMark, feedSince } from "@/lib/feed";

const NOW = Date.UTC(2026, 10, 8, 6, 0);
const HOUR = 3_600_000;

const db = {
  members: [{ id: "m_me", email: "me@career141.com" }, { id: "m_other", email: "other@career141.com" }],
  clients: [{ id: "cl_1", name: "Nippon Paint Lanka" }],
  inbound: [
    { id: "in_new", mailbox: "me@career141.com", readState: "new", from: "hr@nippon.test", fromName: "Nippon HR", subject: "Re: Set 1", receivedAt: NOW - HOUR, clientId: "cl_1" },
    { id: "in_old", mailbox: "me@career141.com", readState: "new", from: "x@y.test", fromName: "", subject: "Old", receivedAt: NOW - 5 * HOUR, clientId: null },
    { id: "in_filed", mailbox: "me@career141.com", readState: "filed", from: "z@y.test", fromName: "Z", subject: "Filed", receivedAt: NOW - HOUR, clientId: null },
    { id: "in_theirs", mailbox: "other@career141.com", readState: "new", from: "q@y.test", fromName: "Q", subject: "Not mine", receivedAt: NOW - HOUR, clientId: null },
  ],
  timers: [
    { id: "t_mine", ownerId: "m_me", kind: "set.due", payload: { label: "Set 2 is due at Nippon" } },
    { id: "t_theirs", ownerId: "m_other", kind: "esa.send", payload: {} },
  ],
  tasks: [
    { id: "k_mine", assigneeId: "m_me", title: "Ring Nippon" },
    { id: "k_theirs", assigneeId: "m_other", title: "Not mine" },
  ],
  events: [{ id: "ev_1", type: "client_set.ready", receivedAt: NOW - 2 * HOUR }],
  audit: [
    { id: "a1", action: "timer.fired", subjectType: "timer", subjectId: "t_mine", at: NOW - HOUR + 1 },
    { id: "a2", action: "timer.fired", subjectType: "timer", subjectId: "t_theirs", at: NOW - HOUR + 2 },
    { id: "a3", action: "task.created", subjectType: "task", subjectId: "k_mine", at: NOW - HOUR + 3 },
    { id: "a4", action: "task.created", subjectType: "task", subjectId: "k_theirs", at: NOW - HOUR + 4 },
    { id: "a5", action: "task.escalated", subjectType: "task", subjectId: "k_mine", at: NOW - HOUR + 5 },
  ],
} as unknown as OpsDatabase;

test("after a cursor: the new email with a button, my clock, my tasks, the TA event - oldest first, nobody else's", () => {
  const lines = feedSince(db, "m_me", NOW - 3 * HOUR, NOW);
  assert.deepEqual(
    lines.map((l) => l.key),
    ["event:ev_1", "inbound:in_new", "timer:t_mine", "task:k_mine:task.created", "task:k_mine:task.escalated"],
  );
  const mail = lines[1];
  assert.equal(mail.text, "Email from Nippon HR (Nippon Paint Lanka): Re: Set 1");
  assert.equal(mail.buttons[0].action, "markMailDone");
  assert.equal(mail.buttons[0].fields.inboundId, "in_new");
  assert.equal(mail.open, "/mail");
  assert.equal(lines[2].text, "A clock ran out: Set 2 is due at Nippon.");
  assert.match(lines[4].text, /^Passed to you: Ring Nippon/);
});

test("before the cursor is not news, filed mail is not news, and the mark is one per source row", () => {
  assert.equal(feedSince(db, "m_me", NOW, NOW).length, 0);
  const all = feedSince(db, "m_me", 0, NOW);
  assert.ok(all.some((l) => l.key === "inbound:in_old"), "an old unread email still counts when the cursor is at zero");
  assert.ok(!all.some((l) => l.key === "inbound:in_filed"));
  assert.ok(!all.some((l) => l.key === "inbound:in_theirs"), "somebody else's mailbox is not my feed");
  assert.equal(feedMark("inbound:in_new"), "feed:inbound:in_new");
});
