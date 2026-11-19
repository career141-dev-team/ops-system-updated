import assert from "node:assert/strict";
import test from "node:test";

import { agreementColumn, chaseDueAt, dueWords, enquiryColumn, lastTalkWords, tileLetters } from "@/lib/clientsBoard";

const lead = (state: string, flagged = false, by: string | null = null) => ({ state, industryFlagged: flagged, industryConfirmedBy: by });

test("enquiry columns", () => {
  assert.equal(enquiryColumn(lead("new"), [], null), "new");
  assert.equal(enquiryColumn(lead("new", true), [], null), "checks");
  assert.equal(enquiryColumn(lead("new", true, "m1"), [], null), "new");
  assert.equal(enquiryColumn(lead("intro_call"), [{ kind: "intro", state: "booked" }], null), "intro");
  assert.equal(enquiryColumn(lead("intro_call"), [{ kind: "intro", state: "held" }], null), "send");
  assert.equal(enquiryColumn(lead("waiting_agreement"), [], "draft"), "send");
  assert.equal(enquiryColumn(lead("waiting_agreement"), [], "sent"), null);
  assert.equal(enquiryColumn(lead("closed_silent"), [], null), null);
  assert.equal(enquiryColumn(lead("declined_industry"), [], null), null);
});

test("agreement columns", () => {
  const now = Date.now();
  assert.equal(agreementColumn({ state: "draft", countersignedAt: null }, now), "send");
  assert.equal(agreementColumn({ state: "chasing", countersignedAt: null }, now), "chasing");
  assert.equal(agreementColumn({ state: "negotiating", countersignedAt: null }, now), "changes");
  assert.equal(agreementColumn({ state: "signed", countersignedAt: null }, now), "signed");
  assert.equal(agreementColumn({ state: "countersigned", countersignedAt: now - 5 * 86_400_000 }, now), "done");
  assert.equal(agreementColumn({ state: "countersigned", countersignedAt: now - 40 * 86_400_000 }, now), null);
  assert.equal(agreementColumn({ state: "declined", countersignedAt: null }, now), null);
});

test("chase dates and words", () => {
  const plan = [{ step: 1, afterDays: 2 }, { step: 2, afterDays: 2 }, { step: 3, afterDays: 3 }];
  const sent = Date.UTC(2026, 10, 11, 4);
  assert.equal(chaseDueAt(sent, 3, plan), sent + 7 * 86_400_000);
  const now = Date.UTC(2026, 10, 18, 4);
  assert.equal(dueWords(now, now).text, "due today");
  assert.equal(dueWords(now - 2 * 86_400_000, now).tone, "danger");
  assert.match(dueWords(now + 2 * 86_400_000, now).text, /^due /);
});

test("talk words and tiles", () => {
  const now = Date.UTC(2026, 10, 18, 4);
  assert.equal(lastTalkWords(null, now), "no talk logged yet");
  assert.equal(lastTalkWords(now, now), "last talk today");
  assert.equal(lastTalkWords(now - 2 * 86_400_000, now), "last talk 2 days ago");
  assert.equal(tileLetters("Hill Country Tea"), "HT");
  assert.equal(tileLetters("Lotus"), "LO");
});

import { contactsOf, isQuiet } from "@/lib/clientsBoard";

test("contacts and quiet", () => {
  const lead = { contactName: "A B", contactEmail: "a@x.lk", contactPhone: "" };
  assert.equal(contactsOf({ contacts: [{ name: "Z", role: "HR", email: "", phone: "" }] }, lead)[0].name, "Z");
  assert.equal(contactsOf({}, lead)[0].email, "a@x.lk");
  assert.equal(contactsOf({}, null).length, 0);
  const now = Date.now();
  assert.equal(isQuiet(null, now), true);
  assert.equal(isQuiet(now - 86_400_000, now), false);
  assert.equal(isQuiet(now - 4 * 86_400_000, now), true);
});
