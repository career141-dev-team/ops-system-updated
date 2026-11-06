/**
 * The mailbox (24, section 7).
 *
 * The rules that decide what a person sees as one conversation. They are
 * tested on their own because getting them wrong is worse than having no
 * mailbox at all: two threads where there is one, and somebody answers the
 * wrong message in front of a client.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  addressesFrom,
  buildThreads,
  normalSubject,
  problemWithCompose,
  problemWithReply,
  replySubject,
  replyTo,
  threadInWords,
  threadKeyOf,
} from "@/lib/mailbox";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 9, 4, 30);

const inbound = (over = {}) => ({
  id: "in_1",
  channel: "email",
  from: "hr@example.test",
  fromName: "Their HR",
  receivedAt: NOW - DAY,
  subject: "Head of finance",
  body: "Can we see more CVs?",
  providerId: "p_in_1",
  inReplyTo: null,
  subjectType: null,
  subjectId: null,
  clientId: null,
  ...over,
});

const outbound = (over = {}) => ({
  id: "msg_1",
  channel: "email",
  to: ["hr@example.test"],
  subject: "Head of finance",
  body: "Here is the set.",
  state: "sent",
  subjectType: null,
  subjectId: null,
  providerMessageId: "p_out_1",
  inReplyToProviderId: null,
  attachmentFileIds: [] as string[],
  sentAt: NOW - 2 * DAY,
  createdAt: NOW - 2 * DAY,
  ...over,
});

test("a subject keeps its meaning however many times it is replied to", () => {
  assert.equal(normalSubject("Re: Head of finance"), "Head of finance");
  assert.equal(normalSubject("RE: FW: Re: Head of finance"), "Head of finance");
  assert.equal(normalSubject("  Fwd:   Head   of finance "), "Head of finance");
  assert.equal(normalSubject("Head of finance"), "Head of finance");
  assert.equal(normalSubject(""), "");

  // And a reply says "Re:" once, not once per answer.
  assert.equal(replySubject("Head of finance"), "Re: Head of finance");
  assert.equal(replySubject("Re: Re: Head of finance"), "Re: Head of finance");
});

test("what it is filed against beats the subject, and two clients are two threads", () => {
  const filed = threadKeyOf({ about: { type: "esa", id: "esa_1" }, subject: "anything", who: "a@b.test", id: "x" });
  assert.equal(filed, "about:esa:esa_1");
  // Same subject, different people: not one conversation.
  const one = threadKeyOf({ about: null, subject: "Invoice", who: "a@one.test", id: "x" });
  const two = threadKeyOf({ about: null, subject: "Invoice", who: "a@two.test", id: "y" });
  assert.notEqual(one, two);
  // Same conversation, written back with "Re:".
  assert.equal(
    threadKeyOf({ about: null, subject: "Re: Invoice", who: "A@One.test", id: "z" }),
    one,
  );
});

test("both directions come back as one conversation, newest first", () => {
  const threads = buildThreads(
    [inbound()],
    [outbound(), outbound({ id: "msg_2", subject: "Something else", providerMessageId: "p_out_2", sentAt: NOW - 3 * DAY })],
  );

  assert.equal(threads.length, 2);
  const [first, second] = threads;
  assert.equal(first.subject, "Head of finance");
  assert.equal(first.items.length, 2, "our message and their reply are one thread");
  assert.equal(first.items[0].direction, "out", "oldest first inside the thread");
  assert.equal(first.items[1].direction, "in");
  assert.equal(first.waitingOnUs, true, "they wrote last");
  assert.equal(second.subject, "Something else");
  assert.equal(second.waitingOnUs, false);
});

test("a reply joins the message it answers, even with a rewritten subject", () => {
  const threads = buildThreads(
    [inbound({ subject: "about that thing", inReplyTo: "p_out_1" })],
    [outbound()],
  );
  assert.equal(threads.length, 1, "In-Reply-To is the one join we can be sure of");
  assert.equal(threads[0].items.length, 2);
});

test("a draft on a thread outranks everything else it could say", () => {
  const threads = buildThreads([inbound()], [outbound({ state: "draft", sentAt: null })]);
  assert.equal(threads[0].hasDraft, true);
  assert.match(threadInWords(threads[0], NOW), /draft is waiting for you to approve/);

  const answered = buildThreads([inbound()], []);
  assert.match(threadInWords(answered[0], NOW), /They wrote yesterday. Nobody has answered./);

  const ours = buildThreads([], [outbound()]);
  assert.match(threadInWords(ours[0], NOW), /We wrote 2 days ago./);

  // A blocked message is not a draft: nobody is being asked to approve it,
  // and saying so would send a person looking for a button that is not there.
  const blocked = buildThreads([], [outbound({ state: "blocked" })]);
  assert.equal(blocked[0].hasDraft, false);
  assert.equal(blocked[0].hasTrouble, true);
  assert.match(threadInWords(blocked[0], NOW), /never went: it is blocked/);
});

test("a reply goes to whoever wrote last", () => {
  // Somebody else at the client answers: their reply carries In-Reply-To, so
  // it is the same conversation, and the answer goes to the person who wrote.
  const threads = buildThreads(
    [inbound({ from: "md@example.test", fromName: "The MD", inReplyTo: "p_out_1" })],
    [outbound({ to: ["hr@example.test"] })],
  );
  assert.equal(threads.length, 1);
  assert.deepEqual(replyTo(threads[0]), ["md@example.test"]);
  assert.deepEqual([...threads[0].with].sort(), ["hr@example.test", "md@example.test"]);

  // Without that link, a different person writing the same subject is a
  // different conversation - the safe way round.
  const apart = buildThreads([inbound({ from: "md@example.test" })], [outbound({ to: ["hr@example.test"] })]);
  assert.equal(apart.length, 2);

  // Nothing came back: we answer where we wrote.
  const ours = buildThreads([], [outbound()]);
  assert.deepEqual(replyTo(ours[0]), ["hr@example.test"]);
});

test("a reply and a new message are refused for reasons a person can act on", () => {
  assert.equal(problemWithReply(["hr@example.test"], "Yes, Monday works."), null);
  assert.match(problemWithReply([], "Yes") ?? "", /no address to reply to/);
  assert.match(problemWithReply(["hr@example.test"], " ") ?? "", /Write something first/);

  assert.equal(problemWithCompose(["hr@example.test"], "The set", "Attached."), null);
  assert.match(problemWithCompose([], "The set", "Attached.") ?? "", /Say who it goes to/);
  assert.match(problemWithCompose(Array(11).fill("a@b.test"), "s", "b") ?? "", /more than ten addresses/);
  assert.match(problemWithCompose(["hr@example.test"], " ", "Attached.") ?? "", /Give it a subject/);
  assert.match(problemWithCompose(["hr@example.test"], "The set", "") ?? "", /Write something first/);
});

test("addresses are read the way a person types them", () => {
  assert.deepEqual(addressesFrom("a@b.test, c@d.test; e@f.test"), ["a@b.test", "c@d.test", "e@f.test"]);
  assert.deepEqual(addressesFrom("a@b.test\n c@d.test"), ["a@b.test", "c@d.test"]);
  assert.deepEqual(addressesFrom("nobody"), []);
  assert.deepEqual(addressesFrom(""), []);
});
