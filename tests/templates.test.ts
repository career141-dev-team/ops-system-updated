/**
 * Template wording and its holes (15, Phase 1 step 25).
 *
 * The rule under test, more than any other, is the one the board paid for: an
 * agreement went to a client with its placeholders still in it (Best Pacific).
 * So an unfilled hole must be loud and must stop the send.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { fill, holesIn, holesNeeded, mayGoWithoutAPerson, problemWith } from "@/lib/templates";

const chase = {
  channel: "email" as const,
  name: "Agreement chase 1",
  subject: "{{client}} · {{position}} — our agreement",
  body: "Dear {{contact}},\n\nWe sent the agreement on {{date}}.\n\n{{opsPerson}}",
  approvedForAuto: false,
};

test("the holes are found once each, in the order they appear", () => {
  assert.deepEqual(holesIn("{{a}} then {{b}} then {{a}} again"), ["a", "b"]);
  assert.deepEqual(holesIn("no holes here"), []);
  // Spaces inside the braces are a normal typing habit, not a different hole.
  assert.deepEqual(holesIn("{{ client }}"), ["client"]);
  assert.deepEqual(holesNeeded(chase), ["client", "position", "contact", "date", "opsPerson"]);
});

test("an unfilled hole stays visible and is reported", () => {
  const out = fill(chase, { client: "Sample Co", position: "Driver", contact: "", opsPerson: "Rushda" });
  assert.deepEqual(out.missing, ["contact", "date"], "empty counts as missing, not as blank");
  assert.match(out.body, /Dear \{\{contact\}\},/, "the hole is left showing, so the draft looks unfinished");
  assert.ok(!out.body.includes("Dear ,"), "a blank would look finished, which is the dangerous case");
  assert.equal(out.subject, "Sample Co · Driver — our agreement");
});

test("nothing is missing once every hole is filled, and spaces are trimmed", () => {
  const out = fill(chase, {
    client: "Sample Co",
    position: "Driver",
    contact: "  Mr Perera  ",
    date: "2 November",
    opsPerson: "Rushda",
  });
  assert.deepEqual(out.missing, []);
  assert.match(out.body, /Dear Mr Perera,/);
});

test("a template that could not work is refused while it is being written", () => {
  assert.equal(problemWith(chase), null);
  assert.match(problemWith({ ...chase, subject: "" }) ?? "", /needs a subject/);
  assert.match(problemWith({ ...chase, body: "  " }) ?? "", /nothing to send/);
  assert.match(problemWith({ ...chase, name: "" }) ?? "", /Give it a name/);
  // WhatsApp has nowhere to put a subject, so one typed there would be lost.
  assert.match(problemWith({ ...chase, channel: "whatsapp", subject: "Hello" }) ?? "", /Only an email has a subject/);
  // A hole nobody can fill would block every send from this template.
  assert.match(problemWith({ ...chase, body: "Dear {{freind}}," }) ?? "", /\{\{freind\}\}/);
});

test("only approved wording goes out without a person reading it", () => {
  assert.equal(mayGoWithoutAPerson({ channel: "email", approvedForAuto: false }), false);
  assert.equal(mayGoWithoutAPerson({ channel: "email", approvedForAuto: true }), true);
  // A notice to our own people is not a client message.
  assert.equal(mayGoWithoutAPerson({ channel: "internal", approvedForAuto: false }), true);
});
