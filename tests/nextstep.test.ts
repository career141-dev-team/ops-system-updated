/**
 * "What to do now" (23, sections 2 and 4).
 *
 * The card at the top of a page is only worth having if it is right, so the
 * rule behind it is tested like any other: one step at a time, whose move it
 * is, and what will happen by itself.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { COVERS, NAV, isHere, pageAndSectionFor } from "@/lib/nav";
import {
  CLIENT_TABS,
  INBOX_TABS,
  MONEY_TABS,
  POSITION_TABS,
  REPORT_TABS,
  SETTINGS_TABS,
  clientTabs,
  positionTabs,
  tabFrom,
} from "@/lib/tabs";
import {
  clientNextStep,
  guaranteeNextStep,
  holdNextStep,
  invoiceNextStep,
  interviewNextStep,
  leadNextStep,
  placementNextStep,
  positionNextStep,
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

  // The opening comes last (owner, 17 Nov evening): after the call, the agreement goes first.
  assert.match(leadNextStep(lead({ clientTaId: "ta_c1" }), held, NOW).waiting, /^Start the agreement.*signed and the requirement is complete/);
  assert.match(
    leadNextStep(lead({ clientTaId: "ta_c1" }), { ...held, position: { openingTaId: null, title: "Driver" } }, NOW).waiting,
    /^Start the agreement/,
  );
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
    leadNextStep(lead({ clientTaId: "ta_c1" }), { ...held, esa: esa({ state: "negotiating", version: 2 }) }, NOW).waiting,
    /want changes/,
  );
  // Signed by the client is what the opening waits for: the ladder moves on to the requirement
  // while the Director countersigns in the background.
  assert.match(
    leadNextStep(lead({ clientTaId: "ta_c1" }), { ...held, esa: esa({ state: "signed", signedAt: NOW - DAY }) }, NOW)
      .waiting,
    /requirement meeting/,
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
    billingAddress: "1 Test Road, Colombo 03",
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

test("the top bar's five workspaces and six behind the profile, and every page under one", () => {
  // From twenty-seven (25, section 3), then eight in the sidebar, then the
  // approved Figma top bar (13 Nov). A hold, a set and an advert are faces of
  // a position, so they are reached through it and marked against it.
  const [workspaces, more] = NAV;
  assert.deepEqual(
    workspaces.pages.map((page) => page.href),
    ["/", "/clients", "/positions", "/interviews", "/placements"],
  );
  assert.deepEqual(
    more.pages.map((page) => page.href),
    ["/candidates", "/work", "/mail", "/invoices", "/reports", "/settings"],
  );
  assert.equal(NAV.length, 2, "the bar and the profile, nothing else");
  const entries = NAV.flatMap((section) => section.pages);

  // Every page in the app is under exactly one entry.
  const seen = new Map<string, string[]>();
  for (const page of entries) {
    for (const under of COVERS[page.href] ?? [page.href]) {
      seen.set(under, [...(seen.get(under) ?? []), page.href]);
    }
  }
  for (const [under, owners] of seen) {
    assert.equal(owners.length, 1, under + " is under " + owners.join(" and "));
  }
  for (const href of [
    "/",
    "/work",
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
    assert(seen.has(href), href + " is under no sidebar entry");
  }
});

test("every entry says what it is for", () => {
  for (const section of NAV) {
    for (const page of section.pages) {
      assert.ok(page.about.length > 20, page.href + " has no purpose line");
      assert.ok(!/^The page/i.test(page.about), page.href + " describes itself, not its work");
    }
  }
});

test("work counts on the entry a person would look under", () => {
  const counts = workByPage(
    [
      { link: "/sets/set_1", dueAt: NOW - DAY },
      { link: "/sets", dueAt: NOW + DAY },
      { link: "/invoices/inv_1", dueAt: NOW - DAY },
      { link: null, dueAt: NOW + DAY },
      { link: "/nowhere", dueAt: NOW + DAY },
    ],
    NOW,
  );

  // A set is a face of a position, so it counts against Positions - which is
  // where somebody goes looking for it.
  assert.deepEqual(counts["/positions"], { waiting: 2, late: 1 });
  assert.deepEqual(counts["/sets"], { waiting: 2, late: 1 }, "and against its own page, for its tab");
  // An invoice is Finance's (13 Nov top bar), and Finance's entry is /invoices.
  assert.deepEqual(counts["/invoices"], { waiting: 1, late: 1 });
  // Nothing is ever lost: a task with nowhere to go lands on My Work.
  assert.deepEqual(counts["/"], { waiting: 2, late: 0 });

  assert.equal(workInWords(counts["/invoices"]), "1 thing waiting, 1 late");
  assert.equal(workInWords(counts["/positions"]), "2 things waiting, 1 late");
  assert.equal(workInWords(undefined), "Nothing waiting");
});

test("a path finds the entry it belongs under", () => {
  assert.equal(pageAndSectionFor("/sets/set_1")?.page.href, "/positions");
  assert.equal(pageAndSectionFor("/holds/h1")?.page.href, "/positions");
  assert.equal(pageAndSectionFor("/leads/l1")?.page.href, "/clients");
  assert.equal(pageAndSectionFor("/invoices/i1")?.page.href, "/invoices");
  assert.equal(pageAndSectionFor("/guarantees/g1")?.page.href, "/placements");
  assert.equal(pageAndSectionFor("/interviews/i1")?.page.href, "/interviews");
  assert.equal(pageAndSectionFor("/templates/x")?.page.href, "/settings");
  assert.equal(pageAndSectionFor("/work")?.page.href, "/work");
  assert.equal(pageAndSectionFor("/")?.page.href, "/");
  assert.equal(pageAndSectionFor("/nowhere"), null);

  // And the sidebar marks that entry, not some other one.
  assert.equal(isHere("/sets/set_1", "/positions"), true);
  assert.equal(isHere("/sets/set_1", "/placements"), false);
  assert.equal(isHere("/", "/"), true);
  assert.equal(isHere("/leads", "/"), false, "the day is only the day");
});

test("one tab bar per area, and every tab points somewhere real", () => {
  const bars = [INBOX_TABS, CLIENT_TABS, POSITION_TABS, MONEY_TABS, REPORT_TABS, SETTINGS_TABS];
  for (const bar of bars) {
    assert.ok(bar.length >= 2, "a bar with one tab is not a bar");
    const keys = bar.map((tab) => tab.key);
    assert.equal(new Set(keys).size, keys.length, "two tabs with the same key: " + keys.join(", "));
    for (const tab of bar) {
      assert.ok(tab.href.startsWith("/"), tab.key + " does not point anywhere");
      assert.ok(pageAndSectionFor(tab.href), tab.href + " is under no sidebar entry");
    }
  }

  // A record's own bar: one level, and every tab on the same record.
  const tabs = positionTabs("pos_1");
  assert.equal(tabs[0].href, "/positions/pos_1");
  for (const tab of tabs) assert.ok(tab.href.startsWith("/positions/pos_1"), tab.key + " leaves the record");
  assert.equal(tabFrom(tabs, "sets"), "sets");
  assert.equal(tabFrom(tabs, "nonsense"), "overview", "an unknown tab is the first one, never a blank page");
  assert.equal(tabFrom(clientTabs("c1"), undefined), "overview");
});

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

/* ── Money's three cards (24, step 5) ──────────────────────────── */

const placement = (over = {}) => ({
  state: "placed",
  candidateName: "SAMPLE CANDIDATE",
  monthlySalary: 450_000,
  offerLetterFileRef: "f_offer",
  joinDate: NOW + 6 * DAY,
  joinedAt: null,
  dojHistory: [] as { reason: string }[],
  isReplacementOf: null,
  invoiceId: null,
  noShowChoice: null,
  reason: null,
  ...over,
});
const pParts = { missing: [] as string[], feeSaid: "one month's gross salary", invoiceState: null };

test("a placement says the rule, not only the date", () => {
  // What is missing comes first: accounts cannot raise a fee without it.
  const thin = placementNextStep(placement(), { ...pParts, missing: ["the package", "the offer letter"] }, NOW);
  assert.equal(thin.at, "details");
  assert.match(thin.waiting, /the package and the offer letter/);

  const soon = placementNextStep(placement(), pParts, NOW);
  assert.match(soon.where, /Joining in 6 days/);
  assert.match(soon.clock ?? "", /a week before/);
  assert.match(soon.clock ?? "", /one month's gross salary/);

  // Every move of the joining day is counted, because each needed a reason.
  const moved = placementNextStep(placement({ dojHistory: [{ reason: "visa" }, { reason: "notice" }] }), pParts, NOW);
  assert.match(moved.waiting, /moved 2 times/);

  // Joined, nothing drafted: the fee should already exist.
  const joined = placementNextStep(placement({ state: "joined", joinedAt: NOW - DAY }), pParts, NOW);
  assert.equal(joined.at, "invoice");
  assert.match(joined.waiting, /should have been drafted the day they joined/);

  // A replacement is never billed again - the rule, said on the card.
  const replacement = placementNextStep(
    placement({ state: "joined", joinedAt: NOW - DAY, isReplacementOf: "pl_old" }),
    pParts,
    NOW,
  );
  assert.match(replacement.waiting, /never billed again/);
  assert.match(replacement.clock ?? "", /new ninety days/);

  // A no-show invoices nothing, and the client's choice is theirs to make.
  const noShow = placementNextStep(placement({ state: "no_show" }), pParts, NOW);
  assert.equal(noShow.at, "noshow");
  assert.match(noShow.waiting, /Nothing is invoiced either way/);
  assert.match(
    placementNextStep(placement({ state: "no_show", noShowChoice: "replace" }), pParts, NOW).waiting,
    /nothing was invoiced/,
  );
});

test("an invoice card leads with the rule that costs money", () => {
  const invoice = (over = {}) => ({
    kind: "fee",
    state: "sent",
    disputed: false,
    disputedReason: null,
    sentAt: NOW - 10 * DAY,
    dueAt: NOW + 20 * DAY,
    paidAt: null,
    writtenOffAt: null,
    reason: null,
    ...over,
  });
  const iParts = {
    owedSaid: "LKR 450,000",
    lateChargeSaid: null,
    billingEmail: "finance@example.test",
    writeOffAfterDays: 90,
  };

  // A draft with nowhere to go says so, instead of offering to send it.
  const nowhere = invoiceNextStep(invoice({ state: "draft" }), { ...iParts, billingEmail: "" }, NOW);
  assert.equal(nowhere.at, "client");
  assert.match(nowhere.waiting, /no billing address/);

  const draft = invoiceNextStep(invoice({ state: "draft" }), iParts, NOW);
  assert.match(draft.waiting, /finance@example.test/);
  assert.match(draft.waiting, /draft somebody approves/);

  const owed = invoiceNextStep(invoice(), iParts, NOW);
  assert.match(owed.waiting, /LKR 450,000 is owed, due in 20 days/);
  assert.match(owed.clock ?? "", /the late charge is added each month, compounded/);

  const late = invoiceNextStep(
    invoice({ dueAt: NOW - 12 * DAY }),
    { ...iParts, lateChargeSaid: "LKR 4,500" },
    NOW,
  );
  assert.match(late.where, /Late since 12 days ago/);
  assert.match(late.waiting, /with LKR 4,500 added so far/);
  assert.match(late.clock ?? "", /waits 90 days/);

  // Disputed outranks late, and the charge stops while it stands.
  const disputed = invoiceNextStep(
    invoice({ dueAt: NOW - 12 * DAY, disputed: true, disputedReason: "They say the salary is wrong." }),
    iParts,
    NOW,
  );
  assert.equal(disputed.at, "disputed");
  assert.match(disputed.clock ?? "", /Nothing is charged on a disputed invoice/);

  assert.match(invoiceNextStep(invoice({ state: "paid", paidAt: NOW - DAY }), iParts, NOW).waiting, /every chase stopped/);
});

test("a guarantee is ninety days, and only on a fee fully paid", () => {
  const guarantee = (over = {}) => ({
    state: "running",
    candidateName: "SAMPLE CANDIDATE",
    startsAt: NOW - 30 * DAY,
    endsAt: NOW + 60 * DAY,
    feePaidAt: NOW - 20 * DAY,
    leftAt: null,
    reason: null,
    deadlineAt: null,
    replacedByPlacementId: null,
    refundPct: null,
    ...over,
  });
  const gParts = { warnDay: 75, refundPct: 50, replacementWorkingDays: 60 };

  const running = guaranteeNextStep(guarantee(), gParts, NOW);
  assert.match(running.where, /60 days left/);
  assert.match(running.waiting, /unless they leave/);
  assert.match(running.clock ?? "", /warning on day 75/);

  // The fee is not paid: the card says the guarantee is worth nothing yet.
  const unpaid = guaranteeNextStep(guarantee({ feePaidAt: null }), gParts, NOW);
  assert.equal(unpaid.at, "fee");
  assert.match(unpaid.waiting, /worth nothing/);
  assert.match(unpaid.waiting, /nothing is replaced and nothing is refunded/);

  const replacing = guaranteeNextStep(
    guarantee({ state: "replacing", leftAt: NOW - 2 * DAY, deadlineAt: NOW + 40 * DAY, reason: "Counter-offer." }),
    gParts,
    NOW,
  );
  assert.match(replacing.waiting, /Replacement first/);
  assert.match(replacing.clock ?? "", /60 working days/);
  assert.match(replacing.clock ?? "", /50% refund is the Director's decision, never a clock's/);

  assert.match(guaranteeNextStep(guarantee({ state: "void" }), gParts, NOW).waiting, /never paid in full/);
  assert.match(guaranteeNextStep(guarantee({ state: "ended_clean" }), gParts, NOW).waiting, /close list/);
  assert.match(guaranteeNextStep(guarantee({ state: "replaced" }), gParts, NOW).waiting, /not invoiced again/);
  assert.match(
    guaranteeNextStep(guarantee({ state: "refund_pending", refundPct: 50 }), gParts, NOW).clock ?? "",
    /waits for a person/,
  );
});

/* ── A position: whose move is it? (24, step 6) ────────────────── */

test("a position card answers the only question a client asks", () => {
  const position = (over = {}) => ({
    stage: "searching",
    title: "Head of finance",
    openingTaId: "ta_j1",
    primaryTaId: "ta_p1",
    hundredPercentDay: "2026-11-05",
    jdApprovedAt: NOW - DAY,
    taStatus: "searching",
    linkedInUrl: "https://linkedin.test/jobs/1",
    ...over,
  });
  const parts = { queued: false, depthSaid: null, holdState: null, setsSent: 0 };

  // Ops never invents an opening id: until TA's event comes back it says so.
  const queued = positionNextStep(position({ openingTaId: null, stage: "handed_over" }), { ...parts, queued: true }, NOW);
  assert.equal(queued.at, "queued");
  assert.match(queued.waiting, /the TA System is creating the opening/);
  assert.match(queued.clock ?? "", /retried until it goes through/);

  // Queued nothing, and nothing came back: that is a person's problem.
  const stuck = positionNextStep(position({ openingTaId: null, stage: "handed_over" }), parts, NOW);
  assert.match(stuck.waiting, /Somebody has to look at why/);

  // Ours, and it says which piece is missing.
  assert.match(
    positionNextStep(position({ primaryTaId: null, hundredPercentDay: null }), parts, NOW).waiting,
    /Ours: set the primary TA and the 100% day/,
  );
  assert.match(positionNextStep(position({ hundredPercentDay: null }), parts, NOW).waiting, /set the 100% day/);
  assert.match(positionNextStep(position({ linkedInUrl: null }), parts, NOW).waiting, /not optional/);

  // Theirs, once everything of ours is done.
  const theirs = positionNextStep(position(), parts, NOW);
  assert.match(theirs.waiting, /Theirs: the TA System is searching/);
  assert.match(theirs.where, /TA says searching/);

  // The two holds say different things, because they are different things.
  const quiet = positionNextStep(position(), { ...parts, holdState: "on_hold" }, NOW);
  assert.match(quiet.waiting, /until the client comes back/);
  assert.match(quiet.clock ?? "", /never closes by itself/);

  const five = positionNextStep(position({ stage: "on_hold" }), { ...parts, depthSaid: "Five shortlisted." }, NOW);
  assert.match(five.waiting, /no sixth CV/);
  assert.match(five.clock ?? "", /opens itself back up/);

  assert.match(positionNextStep(position({ stage: "closed" }), parts, NOW).waiting, /the close list has it/);
});

test("a client with nothing of ours open but their mail waiting says so, not 'nothing is open' (9 Nov)", () => {
  const client = { stage: "active", billingEmail: "hr@client.test", groupName: "" } as never;
  const parts = { positions: [], sets: [], owing: [], holds: [] };
  assert.equal(clientNextStep(client, { ...parts, unanswered: 3 }).waiting, "3 emails from them are waiting for an answer.");
  assert.equal(clientNextStep(client, { ...parts, unanswered: 1 }).waiting, "One email from them is waiting for an answer.");
  assert.match(clientNextStep(client, parts).waiting, /Nothing is open for them/);
});

test("an existing client is not sent back to the intro call, and the requirement runs beside a sent agreement", () => {
  const signedBefore = leadNextStep(lead({ state: "requirement", clientTaId: "ta_c1" }), parts(), NOW);
  assert.equal(signedBefore.at, "requirement");
  const unsigned = leadNextStep(lead({ state: "waiting_agreement", clientTaId: "ta_c1" }), parts(), NOW);
  assert.equal(unsigned.at, "agreement");
  // A Director's lead skips the intro call by design.
  assert.equal(leadNextStep({ ...lead({ clientTaId: "ta_c1" }), source: "director" }, parts(), NOW).at, "agreement");
  const held = [{ kind: "intro", state: "held", at: NOW - DAY, rebookCount: 0 }];
  const out = leadNextStep(
    lead({ clientTaId: "ta_c1" }),
    parts({
      meetings: held,
      esa: { state: "sent", version: 1, chaseStep: 0, sentAt: NOW - DAY, expiresAt: NOW + 13 * DAY, signedAt: null },
    }),
    NOW,
  );
  assert.match(out.waiting, /book the requirement meeting/);
});

test("a complete requirement needs no meeting: an existing client's lead goes straight to the hand-over, and after it nothing is asked", () => {
  const complete = { fields: { title: "Driver", level: "Senior", salary: "1" } };
  const existing = lead({ state: "requirement", clientTaId: "ta_c1" });
  // Written down in full, never a meeting: hand it to TA.
  assert.equal(leadNextStep(existing, parts({ requirement: complete }), NOW).at, "opening");
  // Still blank and no meeting: book it, as before.
  assert.match(leadNextStep(existing, parts({ requirement: { fields: { title: "Driver" } } }), NOW).waiting, /Book the requirement meeting/);
  // Handed over (queued for TA): the meeting is not asked for.
  const handedOver = leadNextStep(
    lead({ state: "handed_over", clientTaId: "ta_c1" }),
    parts({ requirement: complete, position: { openingTaId: null, title: "Driver" } }),
    NOW,
  );
  assert.equal(handedOver.at, "opening");
  assert.doesNotMatch(handedOver.waiting, /requirement meeting/);
});
