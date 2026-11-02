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

import { domainOf, isOurs, matchInbound, referenceFor, referenceIn, stopsChasing, tailOf } from "@/lib/mailMatch";

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
