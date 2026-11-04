/**
 * "What to do now" (23, sections 2 and 4).
 *
 * The card at the top of a page is only worth having if it is right, so the
 * rule behind it is tested like any other: one step at a time, whose move it
 * is, and what will happen by itself.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { NAV, isHere, sectionFor } from "@/lib/nav";
import { clientNextStep, leadNextStep } from "@/lib/nextStep";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 9, 4, 30);

const lead = (over = {}) => ({
  state: "new",
  company: "SAMPLE CLIENT",
  industryFlagged: false,
  industryConfirmedBy: null,
  clientTaId: null,
  reason: null,
  ...over,
});
const parts = (over = {}) => ({
  meetings: [] as { kind: string; state: string; at: number; rebookCount: number }[],
  esa: null,
  requirement: null,
  position: null,
  requiredFields: ["title", "level", "salary"],
  ...over,
});

test("a new lead is asked the two questions before anything else", () => {
  const first = leadNextStep(lead(), parts(), NOW);
  assert.equal(first.at, "duplicate");
  assert.match(first.waiting, /already our client/);

  // Flagged for the industry: nothing else until somebody answers.
  const flagged = leadNextStep(lead({ clientTaId: "ta_c1", industryFlagged: true }), parts(), NOW);
  assert.equal(flagged.at, "industry");
  assert.match(flagged.waiting, /banking or finance/);

  // Answered, so the intro call is next.
  const answered = leadNextStep(
    lead({ clientTaId: "ta_c1", industryFlagged: true, industryConfirmedBy: "m_lead" }),
    parts(),
    NOW,
  );
  assert.equal(answered.at, "intro");
  assert.match(answered.waiting, /Book the intro call/);
});

test("the intro call says when it is, and what the clocks will do", () => {
  const booked = leadNextStep(
    lead({ state: "intro", clientTaId: "ta_c1" }),
    parts({ meetings: [{ kind: "intro", state: "booked", at: NOW + 2 * DAY, rebookCount: 0 }] }),
    NOW,
  );
  assert.match(booked.waiting, /booked for in 2 days/);
  assert.match(booked.clock ?? "", /reminder goes the day before/);

  // Rebooking says how many tries, and what the third one does.
  const again = leadNextStep(
    lead({ state: "intro", clientTaId: "ta_c1" }),
    parts({ meetings: [{ kind: "intro", state: "not_held", at: NOW - DAY, rebookCount: 2 }] }),
    NOW,
  );
  assert.match(again.waiting, /2 attempts so far/);
  assert.match(again.clock ?? "", /closes itself/);
});

test("the agreement's own steps, each with whose move it is", () => {
  const held = parts({ meetings: [{ kind: "intro", state: "held", at: NOW - DAY, rebookCount: 0 }] });
  const esa = (over = {}) => ({
    state: "draft",
    version: 1,
    chaseStep: 0,
    sentAt: null,
    expiresAt: null,
    signedAt: null,
    ...over,
  });

  assert.match(leadNextStep(lead({ clientTaId: "ta_c1" }), held, NOW).waiting, /Start the agreement/);
  assert.match(
    leadNextStep(lead({ clientTaId: "ta_c1" }), { ...held, esa: esa() }, NOW).waiting,
    /Fill in the agreement/,
  );

  const sent = leadNextStep(
    lead({ clientTaId: "ta_c1" }),
    { ...held, esa: esa({ state: "sent", sentAt: NOW - 3 * DAY, expiresAt: NOW + 11 * DAY }) },
    NOW,
  );
  assert.match(sent.waiting, /Waiting on them to sign/);
  assert.match(sent.clock ?? "", /email, WhatsApp, email/);
  assert.match(sent.clock ?? "", /declines in 11 days/);

  const chased = leadNextStep(
    lead({ clientTaId: "ta_c1" }),
    { ...held, esa: esa({ state: "chasing", chaseStep: 3, sentAt: NOW - 9 * DAY }) },
    NOW,
  );
  assert.match(chased.waiting, /Chased 3 times/);

  assert.match(
    leadNextStep(lead({ clientTaId: "ta_c1" }), { ...held, esa: esa({ state: "changes", version: 2 }) }, NOW).waiting,
    /want changes/,
  );
  assert.match(
    leadNextStep(lead({ clientTaId: "ta_c1" }), { ...held, esa: esa({ state: "signed", signedAt: NOW - DAY }) }, NOW)
      .waiting,
    /Director countersigns/,
  );
});

test("after the agreement: the meeting, the fields, then TA's move", () => {
  const after = parts({
    meetings: [{ kind: "intro", state: "held", at: NOW - 20 * DAY, rebookCount: 0 }],
    esa: { state: "countersigned", version: 1, chaseStep: 0, sentAt: NOW - 18 * DAY, expiresAt: null, signedAt: NOW - 15 * DAY },
  });
  const me = lead({ state: "agreement", clientTaId: "ta_c1" });

  assert.match(leadNextStep(me, after, NOW).waiting, /Book the requirement meeting/);

  const met = {
    ...after,
    meetings: [...after.meetings, { kind: "requirement", state: "held", at: NOW - DAY, rebookCount: 0 }],
  };
  // Half-written: it says how many fields, and why it matters.
  const half = leadNextStep(me, { ...met, requirement: { fields: { title: "Head of finance" } } }, NOW);
  assert.match(half.waiting, /2 fields are still blank/);
  assert.match(half.waiting, /half a requirement/);

  const full = { title: "Head of finance", level: "Manager", salary: "450,000" };
  assert.match(leadNextStep(me, { ...met, requirement: { fields: full } }, NOW).waiting, /Hand it to the TA System/);

  // Queued: it is TA's move, and the card says so rather than offering a button.
  const queued = leadNextStep(
    me,
    { ...met, requirement: { fields: full }, position: { openingTaId: null, title: "Head of finance" } },
    NOW,
  );
  assert.match(queued.waiting, /Nothing: the TA System is creating the opening/);
  assert.match(queued.clock ?? "", /their event/i);

  const open = leadNextStep(
    me,
    { ...met, requirement: { fields: full }, position: { openingTaId: "ta_j1", title: "Head of finance" } },
    NOW,
  );
  assert.match(open.waiting, /the search is the TA System's now/);
  assert.equal(open.clock, null);
});

test("a closed lead says why, and asks for nothing", () => {
  const closed = leadNextStep(lead({ state: "closed_no_reply", reason: "Three emails, no reply." }), parts(), NOW);
  assert.equal(closed.at, "closed");
  assert.match(closed.waiting, /this lead is closed/);
  assert.match(closed.where, /Three emails/);

  const declined = leadNextStep(
    lead({ state: "declined_industry", reason: "A finance company." }),
    parts(),
    NOW,
  );
  assert.match(declined.waiting, /declined because of what they do/);
});

test("a client's card points at the work, or at what the record is missing", () => {
  const client = (over = {}) => ({
    stage: "active",
    name: "SAMPLE CLIENT",
    billingEmail: "finance@example.test",
    groupName: "Career 141 x Sample",
    ...over,
  });
  const theirs = (over = {}) => ({
    positions: [{ stage: "searching", title: "Head of finance" }],
    sets: [] as { state: string }[],
    owing: [] as { number: string }[],
    holds: [] as { state: string }[],
    ...over,
  });

  // The record's own gaps come first: an invoice has nowhere to go.
  assert.match(clientNextStep(client({ billingEmail: "" }), theirs()).waiting, /billing address/);

  // A hold outranks money, because it is why nothing is moving.
  const held = clientNextStep(client(), theirs({ holds: [{ state: "held" }] }));
  assert.match(held.waiting, /held because they went quiet/);
  assert.match(held.clock ?? "", /never closes by itself/);

  const owed = clientNextStep(client(), theirs({ owing: [{ number: "C141-2026-0001" }] }));
  assert.match(owed.waiting, /C141-2026-0001 is still owed/);

  // Nothing open: a person decides whether they are finished with us.
  assert.match(clientNextStep(client(), theirs({ positions: [] })).waiting, /move them to dormant with a reason/);

  // No group written down, once sets have gone.
  assert.match(
    clientNextStep(client({ groupName: "" }), theirs({ sets: [{ state: "sent" }] })).waiting,
    /WhatsApp group is not written down/,
  );

  // Otherwise it points at the work rather than inventing some.
  const fine = clientNextStep(client(), theirs({ sets: [{ state: "sent" }] }));
  assert.match(fine.waiting, /The work is on their position/);

  assert.match(clientNextStep(client({ stage: "dormant" }), theirs()).waiting, /this client is dormant/);
});

test("the shell has five sections, and every page is in exactly one", () => {
  assert.equal(NAV.length, 5);
  const seen = new Map<string, number>();
  for (const section of NAV) {
    for (const page of section.pages) seen.set(page.href, (seen.get(page.href) ?? 0) + 1);
  }
  for (const [href, count] of seen) assert.equal(count, 1, href + " is in more than one section");
  // The pages that exist are all there: a page in no section cannot be found.
  for (const href of [
    "/",
    "/leads",
    "/clients",
    "/positions",
    "/sets",
    "/holds",
    "/interviews",
    "/placements",
    "/invoices",
    "/guarantees",
    "/closes",
    "/adverts",
    "/talent-pulse",
    "/reports",
    "/numbers",
    "/ai",
    "/mail",
    "/calls",
    "/templates",
    "/files",
    "/ta",
    "/import",
    "/settings",
    "/health",
  ]) {
    assert(seen.has(href), href + " is in no section");
  }
});

test("the section is found from the path, and the longest page wins", () => {
  assert.equal(sectionFor("/").key, "today");
  assert.equal(sectionFor("/mail").key, "today");
  assert.equal(sectionFor("/leads").key, "clients");
  assert.equal(sectionFor("/leads/lead_1").key, "clients");
  assert.equal(sectionFor("/sets/set_1").key, "search");
  assert.equal(sectionFor("/invoices/inv_1").key, "money");
  assert.equal(sectionFor("/ai").key, "setup");
  // Something nobody put in a section falls back to the day, not to nothing.
  assert.equal(sectionFor("/nowhere").key, "today");

  assert.equal(isHere("/", "/"), true);
  assert.equal(isHere("/leads", "/"), false, "the day is only the day");
  assert.equal(isHere("/leads/lead_1", "/leads"), true);
  assert.equal(isHere("/leadsomething", "/leads"), false, "a prefix is not a match");
});
