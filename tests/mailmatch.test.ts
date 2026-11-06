/**
 * Which client, and which thing, an incoming email belongs to.
 *
 * The rule that matters most here is the one about not guessing. A reply filed
 * against the wrong set stops the wrong chase and is read against the wrong
 * candidates, which is worse than one that waits for a person. So these tests
 * are as much about what it refuses to decide as what it decides.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { domainOf, houseSubject, isOurs, machineMail, matchInbound, referenceFor, referenceIn, sameName, stopsChasing, stripReplyPrefixes, tailOf } from "@/lib/mailMatch";

const known = {
  threads: [{ providerMessageId: "<msg-1@ours>", subjectType: "clientSet", subjectId: "cs_11112222" }],
  contacts: [
    { email: "hr@sampleclient.test", clientId: "cl_1" },
    { email: "md@sampleclient.test", clientId: "cl_1" },
    { email: "hr@other.test", clientId: "cl_2" },
  ],
  subjects: [
    { subjectType: "clientSet", subjectId: "cs_11112222" },
    { subjectType: "esa", subjectId: "esa_99998888" },
  ],
};

test("the reference we put in a subject comes back and names the thing", () => {
  const reference = referenceFor("clientSet", "cs_11112222");
  assert.equal(reference, "[C141-CLIENTSET-11112222]");
  assert.deepEqual(referenceIn("Re: CLIENT > ROLE > set 2 " + reference), {
    subjectType: "clientset",
    tail: "11112222",
  });
  assert.equal(referenceIn("Re: just a reply"), null);
});

test("an id with punctuation still makes a readable reference that matches back", () => {
  // The sample desk uses ids like cs_1 and the backend uses long random ones.
  // The underscore used to break the code: it was written into the subject and
  // then could not be read back, so a real reply looked like a stranger.
  assert.equal(tailOf("cs_1"), "cs1");
  assert.equal(referenceFor("clientSet", "cs_1"), "[C141-CLIENTSET-CS1]");
  const m = matchInbound(
    { from: "hr@sampleclient.test", subject: "Re: set 2 [C141-CLIENTSET-CS1]" },
    { threads: [], contacts: [], subjects: [{ subjectType: "clientSet", subjectId: "cs_1" }] },
  );
  assert.equal(m.method, "reference");
  assert.equal(m.subjectId, "cs_1");
});

test("a reply carrying our reference is matched with certainty", () => {
  const m = matchInbound(
    { from: "hr@sampleclient.test", subject: "Re: set 2 [C141-CLIENTSET-11112222]" },
    { ...known, subjects: [{ subjectType: "clientset", subjectId: "cs_11112222" }] },
  );
  assert.equal(m.method, "reference");
  assert.equal(m.subjectId, "cs_11112222");
  assert.equal(stopsChasing(m), true);
});

test("a reference we no longer recognise waits for a person instead of falling through", () => {
  const m = matchInbound(
    { from: "hr@sampleclient.test", subject: "Re: set 9 [C141-CLIENTSET-00000000]" },
    known,
  );
  assert.equal(m.method, "none");
  assert.match(m.note, /reference we do not recognise/);
  // The sender is known, but a stale reference must not quietly become a
  // domain match: it would file a reply about one set against another.
  assert.equal(m.clientId, null);
});

test("a reply in our own thread is matched by its header", () => {
  const m = matchInbound(
    { from: "hr@sampleclient.test", subject: "Re: anything at all", inReplyTo: "<msg-1@ours>" },
    known,
  );
  assert.equal(m.method, "thread");
  assert.equal(m.subjectId, "cs_11112222");
  assert.equal(stopsChasing(m), true);
});

test("a known sender with no reference reaches the client, and no further", () => {
  const m = matchInbound({ from: "MD@SampleClient.test", subject: "A question" }, known);
  assert.equal(m.method, "domain");
  assert.equal(m.clientId, "cl_1");
  assert.equal(m.subjectId, null, "it does not pick one of their positions");
  assert.equal(stopsChasing(m), false, "and it does not stop any chase");
  assert.match(m.note, /not which of their positions/);
});

test("two clients on one domain is a refusal, not a coin toss", () => {
  const shared = {
    ...known,
    contacts: [
      { email: "hr@group.test", clientId: "cl_1" },
      { email: "accounts@group.test", clientId: "cl_2" },
    ],
  };
  const m = matchInbound({ from: "someone@group.test", subject: "Hello" }, shared);
  assert.equal(m.method, "none");
  assert.match(m.note, /More than one client/);
});

test("a stranger waits in needs-filing", () => {
  const m = matchInbound({ from: "nobody@unknown.test", subject: "Hello" }, known);
  assert.equal(m.method, "none");
  assert.equal(m.clientId, null);
  assert.match(m.note, /do not recognise the sender/);
});

test("our own addresses are never treated as a client replying", () => {
  assert.equal(isOurs("ops@career141.com", ["career141.com"]), true);
  assert.equal(isOurs("HR@Career141.COM", ["career141.com"]), true);
  assert.equal(isOurs("hr@sampleclient.test", ["career141.com"]), false);
});

test("the domain is read from the last at-sign, and nonsense gives nothing", () => {
  assert.equal(domainOf(" HR@Sample.TEST "), "sample.test");
  assert.equal(domainOf("odd@name@sample.test"), "sample.test");
  assert.equal(domainOf("not-an-address"), "");
});

/**
 * The list of mailboxes (2 Nov). We read the boxes the desk already uses plus
 * each ops person's own, so one box being unreadable must not hide the others:
 * Microsoft answers 404 for a mailbox the app has not been allowed, and that is
 * one address to fix, not a dead reader.
 */
test("every named mailbox is read, and one bad box does not silence the rest", async () => {
  const { mailboxes, mailboxesInWords, readAllMailboxes } = await import("@/lib/graphMail");

  process.env.OPS_MAILBOXES = " opsteam@example.test , someone@example.test ";
  assert.deepEqual(mailboxes(), ["opsteam@example.test", "someone@example.test"]);
  assert.match(mailboxesInWords(), /2 mailboxes/);

  // Reading is off in a test run, so each box reports its own reason and the
  // pass still returns rather than throwing.
  const off = await readAllMailboxes();
  assert.equal(off.mail.length, 0);
  assert.equal(off.problems.length, 2, "one reason per box, not one for the lot");

  process.env.OPS_MAILBOXES = "";
  assert.equal(mailboxesInWords(), "no mailbox is named yet");
  assert.match((await readAllMailboxes()).problems[0], /No mailbox is named yet/);
});

test("the first read of a box is a short window, and our own mail is ours", async () => {
  const { FIRST_READ_DAYS, defaultSince, ourDomains } = await import("@/lib/graphMail");

  // A box in use for years must not drag in its whole history on the first pass.
  const now = Date.parse("2026-11-02T12:00:00Z");
  assert.equal(defaultSince(now), now - FIRST_READ_DAYS * 24 * 3_600_000);
  assert.ok(FIRST_READ_DAYS <= 7, "a short window, not a history import");

  // Reading every folder means reading Sent Items, so this is what keeps our
  // own copy from being read as a client's reply.
  assert.deepEqual(ourDomains(), ["career141.com"]);
  assert.equal(isOurs("rushda@career141.com", ourDomains()), true);
});

/**
 * The house subject, "CLIENT > ROLE > SET n" (c719, added 2 Nov).
 *
 * It sits beside the reference, not instead of it: the reference only appears
 * on mail the system sent, and the desk has typed this form by hand in Outlook
 * for years. It is the looser of the two rules, so these tests are mostly
 * about where it refuses.
 */
const sets = {
  threads: [],
  contacts: [{ email: "hr@sampleclient.test", clientId: "cl_1" }],
  subjects: [
    { subjectType: "clientSet", subjectId: "cs_1", subject: "Sample Client > PA to the CFO > SET 02" },
    { subjectType: "clientSet", subjectId: "cs_2", subject: "SET 1 - Other Client - Driver - 5 CVs" },
  ],
};

test("both forms of the house subject are read, through replies and markers", () => {
  assert.deepEqual(houseSubject("Sample Client > PA to the CFO > SET 02"), {
    client: "Sample Client",
    position: "PA to the CFO",
    setNumber: 2,
  });
  assert.deepEqual(houseSubject("SET 1 - Other Client - Driver - 5 CVs"), {
    client: "Other Client",
    position: "Driver",
    setNumber: 1,
  });
  // A reply carries prefixes, a REVISED marker and our own reference at once.
  assert.deepEqual(houseSubject("RE: FW: REVISED - A Co > Cook > SET 3 [C141-CLIENTSET-CS9]"), {
    client: "A Co",
    position: "Cook",
    setNumber: 3,
  });
  assert.equal(stripReplyPrefixes("Re: Fwd: hello"), "hello");
});

test("a typed reply is matched to its set although it carries no reference", () => {
  const m = matchInbound({ from: "hr@sampleclient.test", subject: "RE: SAMPLE CLIENT > pa to the cfo > Set 2" }, sets);
  assert.equal(m.method, "house", "case and spacing carry no meaning in a name");
  assert.equal(m.subjectId, "cs_1");
  assert.equal(stopsChasing(m), true, "it names the set, so that chase is over");
  assert.ok(sameName("A.B.C. Holdings (Pvt) Ltd", "abc holdings pvt ltd"));
});

test("the reference still wins where both are present", () => {
  const m = matchInbound(
    { from: "hr@sampleclient.test", subject: "RE: Other Client > Driver > SET 1 [C141-CLIENTSET-CS1]" },
    sets,
  );
  assert.equal(m.method, "reference");
  assert.equal(m.subjectId, "cs_1", "the reference points at set 2 of the other client, and is trusted");
});

test("it refuses rather than guesses", () => {
  // A different set number is a different set.
  assert.equal(matchInbound({ from: "hr@sampleclient.test", subject: "Sample Client > PA to the CFO > SET 9" }, sets).method, "domain");
  // No set number at all is not a house subject.
  assert.equal(houseSubject("Sample Client > PA to the CFO"), null);
  assert.equal(houseSubject("your shortlist - thanks"), null);
  // Two of our sets reading the same is held for a person, not split 50-50.
  const twins = {
    ...sets,
    subjects: [
      { subjectType: "clientSet", subjectId: "cs_1", subject: "Same Co > Driver > SET 1" },
      { subjectType: "clientSet", subjectId: "cs_2", subject: "SAME CO - driver - SET 1" },
    ],
  };
  const m = matchInbound({ from: "hr@sampleclient.test", subject: "RE: Same Co > Driver > SET 1" }, twins);
  assert.equal(m.method, "none");
  assert.match(m.note, /more than one of our sets/);
});

/* ── Mail no person sent (6 Nov) ─────────────────────────────────── */

test("a newsletter is left out, and says why", () => {
  // Every one of these came out of the real boxes on the first real read:
  // 34 messages, 14 of them like this, most in one person's own box.
  const unsub = machineMail({
    from: "newsletters-noreply@linkedin.com",
    headers: [{ name: "List-Unsubscribe", value: "<https://www.linkedin.com/e/unsub>" }],
  });
  assert.ok(unsub);
  assert.match(unsub, /unsubscribe/);

  // The address alone is enough, with no headers at all.
  assert.ok(machineMail({ from: "PowerAutomateNoReply@microsoft.com" }) === null, "noreply has to be its own word");
  assert.match(machineMail({ from: "noreply@clc.linkedin.com" }) ?? "", /nobody can reply/);
  assert.match(machineMail({ from: "no-reply@aws.com" }) ?? "", /nobody can reply/);
  // A random tag after the word, which is what Anthropic's own mail does.
  assert.match(machineMail({ from: "no-reply-_eVZfV_J5kKKwglOL5ixfQ@mail.anthropic.com" }) ?? "", /nobody can reply/);
  assert.match(machineMail({ from: "noreply+ticket99@vendor.test" }) ?? "", /nobody can reply/);
  assert.match(machineMail({ from: "MAILER-DAEMON@career141.com" }) ?? "", /nobody can reply/);

  // Bulk and automatic, said the standard way.
  assert.match(machineMail({ from: "x@y.test", headers: [{ name: "Precedence", value: "bulk" }] }) ?? "", /bulk/);
  assert.match(machineMail({ from: "x@y.test", headers: [{ name: "Auto-Submitted", value: "auto-replied" }] }) ?? "", /automatic/);
  assert.match(machineMail({ from: "x@y.test", headers: [{ name: "X-Auto-Response-Suppress", value: "All" }] }) ?? "", /automatic/);
});

test("a real person is never left out, however they write", () => {
  // This is the half that matters. Dropping a client's email is far worse
  // than showing a newsletter, so every one of these has to come through.
  const keep = [
    { from: "hr@nipponpaint.test" },
    { from: "md@client.test", headers: [{ name: "Auto-Submitted", value: "no" }] },
    // A person whose address happens to contain the word, which is not the
    // same as being that word.
    { from: "noreplyneeded@client.test" },
    { from: "bouncer@client.test" },
    // The dot is how people write their own names, so it is never a
    // separator here. This line caught the rule twice (6 Nov).
    { from: "noreply.team@client.test" },
    { from: "postmaster.general@client.test" },
    // A reply to something we sent, with ordinary threading headers.
    { from: "hr@client.test", headers: [{ name: "In-Reply-To", value: "<abc@career141.com>" }] },
  ];
  for (const mail of keep) {
    assert.equal(machineMail(mail), null, mail.from + " is a person and must come through");
  }
});
