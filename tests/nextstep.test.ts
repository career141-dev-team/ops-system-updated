/**
 * "What to do now" (23, sections 2 and 4).
 *
 * The card at the top of a page is only worth having if it is right, so the
 * rule behind it is tested like any other: one step at a time, whose move it
 * is, and what will happen by itself.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { NAV, isHere, pageAndSectionFor, sectionFor } from "@/lib/nav";
import {
  clientNextStep,
  holdNextStep,
  interviewNextStep,
  leadNextStep,
  setNextStep,
} from "@/lib/nextStep";
import { workByPage, workInWords } from "@/lib/sectionWork";

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
  const held = clientNextStep(client(), theirs({ holds: [{ state: "on_hold" }] }));
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

test("every section and every page says what it is for", () => {
  // The owner's complaint on 4 November: a list of words teaches nobody what
  // the system can do. A page with no purpose line is a page nobody can judge
  // from the menu, so an empty one fails here rather than shipping.
  for (const section of NAV) {
    assert(section.about.length > 20, section.what + " has no purpose line");
    for (const page of section.pages) {
      assert(page.about.length > 20, page.href + " has no purpose line");
      assert(!/^The page/i.test(page.about), page.href + " describes itself, not its work");
    }
  }
});

test("work is counted on the page its own link points at", () => {
  const counts = workByPage(
    [
      { link: "/sets/set_1", dueAt: NOW - DAY }, // late, the search
      { link: "/sets", dueAt: NOW + DAY }, // the search
      { link: "/invoices/inv_1", dueAt: NOW - DAY }, // late, money
      { link: null, dueAt: NOW + DAY }, // nothing to point at: the day keeps it
      { link: "/nowhere", dueAt: NOW + DAY }, // a page we do not have: the same
    ],
    NOW,
  );

  assert.deepEqual(counts["/sets"], { waiting: 2, late: 1 });
  assert.deepEqual(counts["search"], { waiting: 2, late: 1 });
  assert.deepEqual(counts["/invoices"], { waiting: 1, late: 1 });
  assert.deepEqual(counts["money"], { waiting: 1, late: 1 });
  // Nothing is ever lost: a task with nowhere to go lands on the day.
  assert.deepEqual(counts["/"], { waiting: 2, late: 0 });
  assert.deepEqual(counts["today"], { waiting: 2, late: 0 });
  assert.deepEqual(counts["/holds"], { waiting: 0, late: 0 });

  assert.equal(workInWords(counts["/holds"]), "Nothing waiting");
  assert.equal(workInWords(counts["/invoices"]), "1 thing waiting, 1 late");
  assert.equal(workInWords(counts["/sets"]), "2 things waiting, 1 late");
  assert.equal(workInWords(undefined), "Nothing waiting");
});

test("a path finds its own page, not only its section", () => {
  assert.equal(pageAndSectionFor("/sets/set_1")?.page.href, "/sets");
  assert.equal(pageAndSectionFor("/sets/set_1")?.section.key, "search");
  assert.equal(pageAndSectionFor("/")?.page.href, "/");
  assert.equal(pageAndSectionFor("/nowhere"), null);
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

/* ── The search's three cards (24, step 4) ─────────────────────── */

const cv = (name: string, over = {}) => ({ name, fileId: "f_1", problem: null, ...over });
const aSet = (over = {}) => ({
  state: "reviewing",
  name: "SAMPLE CLIENT > Head of finance > SET 1",
  candidates: [cv("One"), cv("Two"), cv("Three"), cv("Four"), cv("Five")],
  dueAt: NOW + 2 * DAY,
  sentAt: null,
  receivedAt: null,
  reason: null,
  ...over,
});
const noParts = { minCvs: 5, ownershipClosesAt: null, feedback: null, holdState: null };

test("a set says the one step, and never four clocks at once", () => {
  assert.match(setNextStep(aSet({ state: "ready" }), noParts, NOW).waiting, /Read it before it goes/);

  // Short of five, and it names who is missing a CV rather than a number.
  const short = setNextStep(
    aSet({ candidates: [cv("One"), cv("Two"), cv("Three"), cv("Four"), cv("Five", { fileId: null })] }),
    noParts,
    NOW,
  );
  assert.equal(short.at, "candidates");
  assert.match(short.waiting, /4 of 5 CVs are ready/);
  assert.match(short.waiting, /Five has no CV/);

  const ready = setNextStep(aSet(), noParts, NOW);
  assert.equal(ready.at, "send");
  assert.match(ready.clock ?? "", /Due at the client in 2 days/);

  // Sent but not received: nothing after it can start, and the card says so.
  const sent = setNextStep(aSet({ state: "sent", sentAt: NOW - DAY }), noParts, NOW);
  assert.equal(sent.at, "received");
  assert.match(sent.waiting, /none of them is running/);
});

test("once a set is received the card picks one clock, in this order", () => {
  const received = (over = {}, parts = {}) =>
    setNextStep(
      aSet({ state: "sent", sentAt: NOW - 3 * DAY, receivedAt: NOW - 2 * DAY, ...over }),
      { ...noParts, ...parts },
      NOW,
    );

  // A proposed hold outranks the chase: it is why nothing is moving.
  const proposed = received({}, { holdState: "proposed", feedback: { what: "call", because: "x" } });
  assert.equal(proposed.at, "hold");
  assert.match(proposed.clock ?? "", /without a person/);

  assert.match(received({}, { holdState: "on_hold" }).clock ?? "", /never closes by itself/);

  const chase = received({}, { feedback: { what: "chase", because: "A day with no feedback." } });
  assert.match(chase.waiting, /Ask once, in writing: 5 of 5/);
  assert.match(chase.clock ?? "", /nothing goes out on its own/);

  const call = received({}, { feedback: { what: "call", because: "Chased already." } });
  assert.match(call.waiting, /Ring them today/);

  const stop = received({}, { feedback: { what: "stop", because: "Silent for 4 days." } });
  assert.match(stop.clock ?? "", /never put on by itself/);

  // Everybody answered: the work moves to the position, not to this page.
  const done = received({
    candidates: [cv("One", { decision: "shortlisted" }), cv("Two", { decision: "rejected" })],
  });
  assert.equal(done.at, "decisions");
  assert.match(done.waiting, /the depth rule decides/);

  // The ownership window is the quiet clock when nothing else is waiting.
  const waiting = received({}, { ownershipClosesAt: NOW + 3 * DAY });
  assert.match(waiting.clock ?? "", /that window shuts in 3 days/);
});

test("a hold never closes by itself, and the card says so every time", () => {
  const hold = (over = {}) => ({
    state: "proposed",
    reason: "Nothing for two weeks.",
    liftedReason: null,
    heldAt: null,
    liftedAt: null,
    reviewAt: null,
    noticeMessageId: null,
    ...over,
  });

  const proposed = holdNextStep(hold(), NOW);
  assert.equal(proposed.at, "approve");
  assert.match(proposed.waiting, /Nothing is drafted yet/);
  assert.match(holdNextStep(hold({ noticeMessageId: "m_1" }), NOW).waiting, /drafted and waiting for you/);

  const held = holdNextStep(hold({ state: "on_hold", heldAt: NOW - 10 * DAY, reviewAt: NOW + 20 * DAY }), NOW);
  assert.equal(held.at, "review");
  assert.match(held.where, /Held since 10 days ago/);
  assert.match(held.clock ?? "", /asked about it again in 20 days/);
  assert.match(held.clock ?? "", /never closes by itself/);

  const lifted = holdNextStep(
    hold({ state: "lifted", liftedAt: NOW - DAY, liftedReason: "They came back." }),
    NOW,
  );
  assert.match(lifted.waiting, /the search is running again. They came back./);
  assert.equal(lifted.clock, null);
});

test("an interview card is the client's side only, one step at a time", () => {
  const iv = (over = {}) => ({
    state: "slots",
    scheduler: "us",
    round: 1,
    slots: [] as number[],
    slotLoops: 0,
    at: null,
    whereOrLink: "",
    interviewers: [] as string[],
    decision: null,
    reason: null,
    candidateFeedback: null,
    ...over,
  });
  const parts = { maxSlotLoops: 3, reference: null };

  assert.match(interviewNextStep(iv(), parts, NOW).waiting, /Ask the client for times/);
  assert.match(interviewNextStep(iv({ slots: [NOW, NOW + DAY] }), parts, NOW).waiting, /which one they picked/);
  assert.match(
    interviewNextStep(iv({ scheduler: "client" }), parts, NOW).waiting,
    /The client books it themselves/,
  );
  assert.match(interviewNextStep(iv({ slotLoops: 3 }), parts, NOW).waiting, /finds a back-up candidate/);

  // Agreed, but it would be refused: the card says what is missing first.
  assert.match(interviewNextStep(iv({ state: "agreed" }), parts, NOW).waiting, /refuse until you give it a link/);
  assert.match(
    interviewNextStep(iv({ state: "agreed", whereOrLink: "https://teams.test/x" }), parts, NOW).waiting,
    /who is interviewing/,
  );
  assert.match(
    interviewNextStep(
      iv({ state: "agreed", whereOrLink: "https://teams.test/x", interviewers: ["hr@example.test"] }),
      parts,
      NOW,
    ).waiting,
    /The invite is drafted for you to approve/,
  );

  const booked = interviewNextStep(iv({ state: "booked", at: NOW + 2 * DAY }), parts, NOW);
  assert.match(booked.clock ?? "", /nine the morning before/);
  assert.match(booked.waiting, /how late it is goes in the notice/);

  const held = interviewNextStep(iv({ state: "attended", at: NOW - DAY }), parts, NOW);
  assert.equal(held.at, "decision");
  assert.match(held.waiting, /in their own words/);

  const reference = interviewNextStep(
    iv({ state: "attended", at: NOW - DAY, decision: "next" }),
    { ...parts, reference: { state: "asked" } },
    NOW,
  );
  assert.match(reference.waiting, /word for word/);

  const cancelled = interviewNextStep(iv({ state: "cancelled", reason: "The client moved it." }), parts, NOW);
  assert.match(cancelled.waiting, /The round is kept/);
});
