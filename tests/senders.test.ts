/**
 * The two senders (15, Part F1 and F2).
 *
 * The sending itself needs Microsoft and Meta, so what is tested here is
 * everything that decides whether a real client hears from us: the switch, the
 * allow-list, and the reference that lets their reply find its way home. Each
 * of these has a matching scar in the TA System.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  emailAllowed,
  groupPostIsManual,
  healthLines,
  senderMailbox,
  outreachInWords,
  outreachLiveInEnv,
  phoneAllowed,
  sendEmail,
  sendWhatsApp,
  sendingEnabled,
  subjectWithReference,
} from "@/lib/senders";

const clearEnv = () => {
  for (const key of ["OPS_SEND", "OPS_OUTBOUND_LOCK", "OPS_OUTBOUND_ALLOW_EMAILS", "OPS_OUTBOUND_ALLOW_PHONES"]) {
    delete process.env[key];
  }
};

test("nothing is sent until sending is switched on, and it says so", async () => {
  clearEnv();
  assert.equal(sendingEnabled(), false, "off unless OPS_SEND says on");

  const mail = await sendEmail({ from: "rushda@career141.test", to: ["hr@client.test"], subject: "Set 1", body: "hello" });
  assert.equal(mail.ok, false);
  assert.match(mail.reason ?? "", /switched off/);

  const chat = await sendWhatsApp({ to: "+94770000000", body: "hello", templateKey: null });
  assert.equal(chat.ok, false);
  assert.match(chat.reason ?? "", /switched off/);

  process.env.OPS_SEND = "ON";
  assert.equal(sendingEnabled(), true, "the switch is not case-fussy");
  clearEnv();
});

test("the outbound lock allows only named addresses and numbers", () => {
  clearEnv();
  assert.equal(emailAllowed(["anyone@anywhere.test"]), true, "unlocked, everything passes");

  process.env.OPS_OUTBOUND_LOCK = "on";
  process.env.OPS_OUTBOUND_ALLOW_EMAILS = "me@career141.test";
  assert.equal(emailAllowed(["ME@Career141.test"]), true);
  assert.equal(emailAllowed([]), false, "nobody is not the same as allowed");
  assert.equal(
    emailAllowed(["me@career141.test", "hr@client.test"]),
    false,
    "every address must be allowed, not just the first",
  );

  process.env.OPS_OUTBOUND_ALLOW_PHONES = "+94 77 123 4567";
  // The same number, as three different people write it.
  assert.equal(phoneAllowed("94771234567"), true);
  assert.equal(phoneAllowed("0771234567"), true);
  assert.equal(phoneAllowed("+94771234568"), false);
  assert.equal(phoneAllowed("123"), false, "too short to be a number");
  clearEnv();
});

test("our reference goes into the subject once, and only when it names something", () => {
  assert.equal(subjectWithReference("Client > Role > SET 1", "clientSet", "cs_7"), "Client > Role > SET 1 [C141-CLIENTSET-CS7]");
  // Already carried, so not doubled - a reply we are quoting back keeps one.
  const once = subjectWithReference("RE: Set 1 [C141-CLIENTSET-CS7]", "clientSet", "cs_7");
  assert.equal(once.match(/\[C141/g)?.length, 1);
  // An internal note is about nothing in particular; it gets no reference.
  assert.equal(subjectWithReference("A note", null, null), "A note");
});

test("a WhatsApp group is posted by a person, and the system says so plainly", () => {
  const outcome = groupPostIsManual();
  assert.equal(outcome.ok, true);
  assert.equal(outcome.providerMessageId, null);
  assert.match(outcome.reason ?? "", /from your phone/);
});

test("outreach to real people needs the environment as well as the desk", () => {
  // The setting lives in the database, so it travels with a restored backup.
  // The environment does not, which is the whole point of having both (6 Nov).
  delete process.env.OPS_OUTREACH_LIVE;
  assert.equal(outreachLiveInEnv(), false, "unset is off, like every other switch here");
  process.env.OPS_OUTREACH_LIVE = "off";
  assert.equal(outreachLiveInEnv(), false);
  process.env.OPS_OUTREACH_LIVE = "ON";
  assert.equal(outreachLiveInEnv(), true, "the case of the word is not the point");
  process.env.OPS_OUTREACH_LIVE = " on ";
  assert.equal(outreachLiveInEnv(), true, "a space in an env file is not a decision");
  process.env.OPS_OUTREACH_LIVE = "true";
  assert.equal(outreachLiveInEnv(), false, "only the word we document turns it on");
  delete process.env.OPS_OUTREACH_LIVE;
});

test("the health screen says which of the two is off, not just that it is off", () => {
  assert.match(outreachInWords(true, true), /^on/);
  assert.match(outreachInWords(false, false), /neither/);
  // The two that send somebody looking in the wrong place unless they are named.
  assert.match(outreachInWords(false, true), /OPS_OUTREACH_LIVE/);
  assert.match(outreachInWords(true, false), /switch\.outreachLive/);
  // Three of the four are test mode, and each says so in the first words.
  for (const [a, b] of [[false, false], [false, true], [true, false]] as const) {
    assert.match(outreachInWords(a, b), /^test mode/);
  }
});

test("health lines show the sender and only the count of allowed addresses", () => {
  const lines = healthLines({ OPS_SEND: "on", OPS_OUTBOUND_LOCK: "on", OPS_OUTBOUND_ALLOW_EMAILS: "a@x.test, b@x.test," }, "me@x.test");
  assert.deepEqual(lines, ["Sending: on", "Sender mailbox: me@x.test", "Outbound lock: on, 2 addresses allowed"]);
  assert.ok(!lines.join(" ").includes("a@x.test"));
  assert.match(healthLines({}, "")[0], /switched off/);
  assert.equal(senderMailbox("me@x.test", true, { OPS_DEV_SENDER_EMAIL: "dev@x.test" }), "dev@x.test");
  assert.equal(senderMailbox("me@x.test", false, { OPS_DEV_SENDER_EMAIL: "dev@x.test" }), "me@x.test");
});
