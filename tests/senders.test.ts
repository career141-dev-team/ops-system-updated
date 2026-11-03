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
