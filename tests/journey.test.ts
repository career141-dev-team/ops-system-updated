/**
 * The board: where every piece of work is (24, section 12).
 *
 * The stage rules are tested on their own because the board is only worth
 * having if a thing is in the right column. A position in the wrong one is
 * worse than no board: somebody stops looking for it.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  STAGES,
  STAGE_KEYS,
  rowsInStage,
  sittingFor,
  sortForBoard,
  stageOfLead,
  stageOfPosition,
  loopSummary,
  type JourneyRow,
} from "@/lib/journey";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 9, 4, 30);

test("the stages are the journey, in order, each saying what it is", () => {
  assert.deepEqual(STAGE_KEYS, [
    "enquiry",
    "intro",
    "agreement",
    "requirement",
    "in_search",
    "joining",
    "money",
    "guarantee",
    "closed",
  ]);
  for (const stage of STAGES) assert.ok(stage.about.length > 20, stage.key + " does not say what it is");
});

test("a lead's stage, and what outranks what", () => {
  const lead = (over = {}) => ({
    state: "new",
    clientTaId: null,
    industryFlagged: false,
    industryConfirmedBy: null,
    ...over,
  });
  const no = { heldIntro: false, esaState: null };

  // Nothing answered yet.
  assert.equal(stageOfLead(lead(), no), "enquiry");
  // Flagged and unanswered is still the enquiry: nothing else may happen.
  assert.equal(stageOfLead(lead({ clientTaId: "ta_c1", industryFlagged: true }), no), "enquiry");
  // Both questions answered: the call is next.
  assert.equal(
    stageOfLead(lead({ clientTaId: "ta_c1", industryFlagged: true, industryConfirmedBy: "m1" }), no),
    "intro",
  );
  // Held: the agreement is the work now.
  assert.equal(stageOfLead(lead({ clientTaId: "ta_c1" }), { heldIntro: true, esaState: null }), "agreement");

  // The agreement outranks the meeting, whatever the lead's own state says: a
  // lead whose agreement is out is not waiting for a call.
  assert.equal(
    stageOfLead(lead({ state: "new", clientTaId: "ta_c1" }), { heldIntro: false, esaState: "chasing" }),
    "agreement",
  );
  assert.equal(
    stageOfLead(lead({ clientTaId: "ta_c1" }), { heldIntro: true, esaState: "countersigned" }),
    "requirement",
  );

  assert.equal(stageOfLead(lead({ state: "closed_no_reply" }), no), "closed");
  assert.equal(stageOfLead(lead({ state: "declined_industry" }), no), "closed");
});

test("a position's stage is read backwards from the end", () => {
  const position = { stage: "searching", openingTaId: "ta_j1" };
  const none = {
    setWithClient: false,
    liveInterview: false,
    placement: null,
    invoiceOwing: false,
    guaranteeRunning: false,
    closed: false,
  };

  // Searching, a set with the client and an interview are one stage now: they loop.
  assert.equal(stageOfPosition(position, none), "in_search");
  assert.equal(stageOfPosition(position, { ...none, setWithClient: true }), "in_search");
  assert.equal(stageOfPosition(position, { ...none, setWithClient: true, liveInterview: true }), "in_search");

  // Placed but not joined is its own stage: the joining day is the one that
  // matters, and it is nobody's idea of "interviews".
  const placed = { ...none, setWithClient: true, liveInterview: true, placement: { joinedAt: null, state: "placed" } };
  assert.equal(stageOfPosition(position, placed), "joining");

  // Joined, and the fee is still out.
  const joined = { ...placed, placement: { joinedAt: NOW - DAY, state: "joined" }, invoiceOwing: true };
  assert.equal(stageOfPosition(position, joined), "money");

  // Paid: the ninety days are the only thing left running.
  assert.equal(stageOfPosition(position, { ...joined, invoiceOwing: false, guaranteeRunning: true }), "guarantee");

  // Reading forwards would have kept this one in the search loop,
  // because an old set is still sitting there unanswered. It is read
  // backwards from the end for exactly that reason.
  assert.equal(stageOfPosition(position, { ...joined, guaranteeRunning: true }), "guarantee");

  assert.equal(stageOfPosition({ ...position, stage: "closed" }, none), "closed");
  assert.equal(stageOfPosition(position, { ...none, closed: true }), "closed");
});

test("inside a stage: late first, then whatever has sat longest", () => {
  const row = (id: string, over: Partial<JourneyRow> = {}): JourneyRow => ({
    id,
    href: "/positions/" + id,
    title: "A CLIENT · Head of finance",
    under: "Sample Ops lead",
    stage: "in_search",
    waiting: "Waiting on them.",
    since: NOW - DAY,
    ownerId: "m1",
    late: false,
    ...over,
  });

  const sorted = sortForBoard([
    row("a", { since: NOW - 2 * DAY }),
    row("b", { since: NOW - 9 * DAY, late: true }),
    row("c", { since: NOW - 30 * DAY }),
    row("d", { since: NOW - DAY, late: true }),
  ]);
  assert.deepEqual(
    sorted.map((one) => one.id),
    ["b", "d", "c", "a"],
    "late ones first, oldest first within each",
  );

  const mixed = [row("x"), row("y", { stage: "guarantee" })];
  assert.deepEqual(
    rowsInStage(mixed, "guarantee").map((one) => one.id),
    ["y"],
  );
  assert.deepEqual(rowsInStage(mixed, "closed"), []);
});

test("the loop on an opening is counted, and says what is holding it", () => {
  const set = (state: string, decisions: (string | null)[]) => ({
    state,
    candidates: decisions.map((decision) => ({ decision })),
  });

  // Just opened: TA is searching and nothing has gone.
  const fresh = loopSummary({ taStatus: "active", sets: [], interviews: [] });
  assert.equal(fresh.line, "Search active");
  assert.equal(fresh.waitingOn, "ta");

  // A set is out and unanswered: the client owes an answer.
  const waiting = loopSummary({ taStatus: "active", sets: [set("sent", [null, null])], interviews: [] });
  assert.equal(waiting.waitingOn, "client");
  assert.equal(waiting.line, "Search active · 1 set");

  // Two sets, five shortlisted, two interviewed, one to go: the interview holds it.
  const busy = loopSummary({
    taStatus: "active",
    sets: [set("sent", ["shortlisted", "shortlisted", "rejected"]), set("sent", ["shortlisted", "shortlisted", "shortlisted"])],
    interviews: [{ state: "attended" }, { state: "attended" }, { state: "booked" }],
  });
  assert.equal(busy.line, "Search active · 2 sets · 5 shortlisted · 2 interviewed · 1 to interview");
  assert.equal(busy.waitingOn, "interview");

  // On hold is said first, in the same line.
  assert.match(loopSummary({ taStatus: "on_hold", sets: [], interviews: [] }).line, /^On hold/);
});

test("how long it has sat, in words a person reads", () => {
  assert.equal(sittingFor(NOW, NOW), "today");
  assert.equal(sittingFor(NOW - DAY, NOW), "1 day");
  assert.equal(sittingFor(NOW - 5 * DAY, NOW), "5 days");
  assert.equal(sittingFor(NOW - 7 * DAY, NOW), "1 week");
  assert.equal(sittingFor(NOW - 21 * DAY, NOW), "3 weeks");
});
