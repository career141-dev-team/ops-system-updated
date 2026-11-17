/**
 * The lead's progress bar: Enquiry, Intro call, Opening, Agreement, Requirement.
 * The opening and the agreement go out right after the intro call, and the
 * agreement and requirement run side by side; a jumped-over step must stay visible.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { leadJourney } from "@/lib/leadJourney";

const base = {
  closed: false,
  leadState: "intro_call",
  clientTaId: null,
  industryFlagged: false,
  industryConfirmedBy: null,
  skipsIntro: false,
  introBooked: false,
  introHeld: false,
  positionExists: false,
  esaState: null,
  requirementStarted: false,
  requirementDone: false,
};

test("a brand-new lead is at the enquiry, and nothing after it is skipped", () => {
  assert.deepEqual(
    leadJourney({ ...base, leadState: "new" }),
    ["current", "upcoming", "upcoming", "upcoming", "upcoming"],
  );
});

test("the intro call is the step to do once the enquiry is checked", () => {
  assert.deepEqual(leadJourney(base), ["done", "current", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(leadJourney({ ...base, introBooked: true }), ["done", "current", "upcoming", "upcoming", "upcoming"]);
});

test("after the intro call the opening is next, and the agreement and requirement follow together", () => {
  const talked = { ...base, introBooked: true, introHeld: true };
  assert.deepEqual(leadJourney(talked), ["done", "done", "current", "upcoming", "upcoming"]);
  // Opening made: the agreement and the requirement are both open now, side by side.
  assert.deepEqual(
    leadJourney({ ...talked, positionExists: true }),
    ["done", "done", "done", "current", "current"],
  );
});

test("agreement signed at once, then the requirement is the only one left", () => {
  assert.deepEqual(
    leadJourney({ ...base, introHeld: true, positionExists: true, esaState: "signed" }),
    ["done", "done", "done", "done", "current"],
  );
});

test("conditions: the requirement meeting is done while the agreement is still being settled", () => {
  assert.deepEqual(
    leadJourney({
      ...base,
      introHeld: true,
      positionExists: true,
      esaState: "negotiating",
      requirementStarted: true,
      requirementDone: true,
    }),
    ["done", "done", "done", "current", "done"],
  );
});

test("an agreement sent before the opening was made leaves the opening skipped, not upcoming", () => {
  assert.deepEqual(
    leadJourney({ ...base, introHeld: true, esaState: "sent" }),
    ["done", "done", "skipped", "current", "current"],
  );
});

test("a requirement taken before any intro call marks the intro call skipped", () => {
  assert.deepEqual(
    leadJourney({ ...base, positionExists: true, requirementStarted: true }),
    ["done", "skipped", "done", "current", "current"],
  );
});

test("a Director's lead skips the intro call by design, so it is not flagged", () => {
  assert.deepEqual(
    leadJourney({ ...base, skipsIntro: true, esaState: "sent" }),
    ["done", "done", "skipped", "current", "current"],
  );
});

test("a closed lead has no current step", () => {
  assert.deepEqual(
    leadJourney({ ...base, closed: true, introHeld: true, esaState: "expired" }),
    ["done", "done", "skipped", "upcoming", "upcoming"],
  );
});
