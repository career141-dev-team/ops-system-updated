/**
 * The bell (7 Nov, UX order 3).
 *
 * One number in the sidebar, kept live, that says how much is waiting on
 * you. It is the top of Your day added up, so the two can never disagree -
 * which is the only reason to trust a number that follows you around.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { bellInWords, bellOf } from "@/lib/bell";

const NOW = Date.UTC(2026, 10, 7, 9, 0);
const HOUR = 3_600_000;

const db = {
  messages: [{ state: "draft" }, { state: "draft" }, { state: "sent" }, { state: "approved" }],
  tasks: [
    { state: "open", assigneeId: "me", dueAt: NOW + HOUR },
    { state: "open", assigneeId: "me", dueAt: NOW - HOUR }, // late
    { state: "open", assigneeId: "somebody-else", dueAt: NOW - HOUR }, // theirs, late, not mine
    { state: "done", assigneeId: "me", dueAt: NOW - HOUR }, // done is not waiting
  ],
  inbound: [{ readState: "new" }, { readState: "filed" }, { readState: "actioned" }],
};

test("the bell is the top of Your day added up, and only what is yours", () => {
  const bell = bellOf(db, "me", NOW);
  // 2 drafts + 2 open tasks of mine + 1 new mail.
  assert.equal(bell.waiting, 5);
  // Only my own late task counts. Somebody else's late task is their bell.
  assert.equal(bell.late, 1);
  assert.equal(bell.inbox, 1);
});

test("a different person sees their own number, not mine", () => {
  const theirs = bellOf(db, "somebody-else", NOW);
  // Drafts and new mail are the desk's; tasks are the person's.
  assert.equal(theirs.waiting, 2 + 1 + 1);
  assert.equal(theirs.late, 1);
});

test("nothing waiting says so, rather than showing a zero", () => {
  const quiet = bellOf({ messages: [], tasks: [], inbound: [] }, "me", NOW);
  assert.deepEqual(quiet, { waiting: 0, late: 0, inbox: 0 });
  assert.equal(bellInWords(quiet), "Nothing is waiting on you.");
});

test("the words name what is late and what is new, and nothing that is zero", () => {
  assert.equal(bellInWords({ waiting: 5, late: 1, inbox: 1 }), "5 things waiting on you, 1 late, 1 new in the inbox.");
  assert.equal(bellInWords({ waiting: 1, late: 0, inbox: 0 }), "1 thing waiting on you.");
  assert.equal(bellInWords({ waiting: 3, late: 0, inbox: 2 }), "3 things waiting on you, 2 new in the inbox.");
});

test("a task due this second is not late, and one a second ago is", () => {
  const edge = {
    messages: [],
    inbound: [],
    tasks: [
      { state: "open", assigneeId: "me", dueAt: NOW },
      { state: "open", assigneeId: "me", dueAt: NOW - 1 },
    ],
  };
  assert.equal(bellOf(edge, "me", NOW).late, 1);
});

test("with the team known, the inbox is your own box only (9 Nov)", () => {
  const withBoxes = {
    messages: [],
    tasks: [],
    inbound: [
      { readState: "new", mailbox: "me@career141.com" },
      { readState: "new", mailbox: "other@career141.com" },
      { readState: "new", mailbox: "opsteam@career141.com" },
    ],
    members: [{ id: "me", email: "Me@career141.com" }, { id: "other", email: "other@career141.com" }],
  };
  assert.equal(bellOf(withBoxes, "me", NOW).inbox, 1, "somebody else's box and the shared boxes are not my bell");
  assert.equal(bellOf(withBoxes, "other", NOW).inbox, 1);
});
