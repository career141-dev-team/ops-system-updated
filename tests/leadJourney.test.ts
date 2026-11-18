/**
 * The lead's progress bar: Enquiry, Intro call, Opening, Agreement, Requirement.
 * The opening and the agreement go out right after the intro call, and the
 * agreement and requirement run side by side; a jumped-over step must stay visible.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { LEAD_STEPS, askedStep, barStates, leadJourney, openingJourney, stepAfter, stepBefore, stepToShow, tailJourney } from "@/lib/leadJourney";

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

test("after the intro call the agreement and the requirement go together, and the opening comes last", () => {
  // The owner's order (17 Nov evening): held, then the ESA goes out, and only then is the intro call done.
  const held = { ...base, introBooked: true, introHeld: true };
  assert.deepEqual(leadJourney(held), ["done", "current", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(leadJourney({ ...held, esaState: "draft" }), ["done", "current", "upcoming", "upcoming", "upcoming"]);
  const talked = { ...held, esaState: "sent" };
  assert.deepEqual(leadJourney(talked), ["done", "done", "current", "current", "upcoming"]);
  // Signed and the requirement complete: now, and only now, the opening is the step.
  assert.deepEqual(
    leadJourney({ ...talked, esaState: "signed", requirementDone: true }),
    ["done", "done", "done", "done", "current"],
  );
  assert.deepEqual(
    leadJourney({ ...talked, esaState: "signed", requirementDone: true, positionExists: true }),
    ["done", "done", "done", "done", "done"],
  );
});

test("agreement signed at once, then the requirement is the only one left, and the opening waits", () => {
  assert.deepEqual(
    leadJourney({ ...base, introHeld: true, esaState: "signed" }),
    ["done", "done", "done", "current", "upcoming"],
  );
});

test("conditions: the requirement meeting is done while the agreement is still being settled", () => {
  assert.deepEqual(
    leadJourney({
      ...base,
      introHeld: true,
      esaState: "negotiating",
      requirementStarted: true,
      requirementDone: true,
    }),
    ["done", "done", "current", "done", "upcoming"],
  );
});

test("the ESA sent at the end of the intro call leaves the agreement and the requirement as the next steps", () => {
  assert.deepEqual(
    leadJourney({ ...base, introHeld: true, esaState: "sent" }),
    ["done", "done", "current", "current", "upcoming"],
  );
});

test("a requirement taken before any intro call marks the intro call skipped", () => {
  assert.deepEqual(
    leadJourney({ ...base, requirementStarted: true }),
    ["done", "skipped", "current", "current", "upcoming"],
  );
});

test("an opening made before the agreement and requirement are done leaves them skipped, unless it was opened early on purpose", () => {
  const made = { ...base, introHeld: true, esaState: "sent", positionExists: true };
  assert.deepEqual(leadJourney(made), ["done", "done", "skipped", "skipped", "done"]);
  assert.deepEqual(leadJourney({ ...made, openEarly: true }), ["done", "done", "current", "current", "done"]);
});

test("a Director's lead skips the intro call by design, so it is not flagged", () => {
  assert.deepEqual(
    leadJourney({ ...base, skipsIntro: true, esaState: "sent" }),
    ["done", "done", "current", "current", "upcoming"],
  );
});

test("a closed lead has no current step", () => {
  assert.deepEqual(
    leadJourney({ ...base, closed: true, introHeld: true, esaState: "expired" }),
    ["done", "done", "upcoming", "upcoming", "upcoming"],
  );
});

test("the page opens on the first step not finished, and a link can ask for another", () => {
  // Dummy Foods in the screenshot: enquiry not checked, but an agreement was drafted.
  const dummyFoods = leadJourney({ ...base, leadState: "new", esaState: "draft" });
  assert.equal(stepToShow(null, dummyFoods), "enquiry");

  assert.equal(stepToShow(null, ["done", "done", "current", "current", "upcoming"]), "agreement");
  assert.equal(stepToShow(null, ["done", "done", "done", "done", "current"]), "opening");
  // Something jumped over still counts as not finished.
  // A gap left behind does not pull the lead back (18 Nov): it opens where the work is.
  assert.equal(stepToShow(null, ["done", "skipped", "done", "current", "current"]), "requirement");
  // Nothing current but something not done (a closed lead): the first not done.
  assert.equal(stepToShow(null, ["done", "skipped", "done", "done", "done"]), "intro");
  // Every step done: the last one.
  assert.equal(stepToShow(null, ["done", "done", "done", "done", "done"]), "opening");
  // Asked for: shown whatever the states say.
  assert.equal(stepToShow("agreement", ["current", "upcoming", "upcoming", "upcoming", "upcoming"]), "agreement");
});

test("old links still land on the right step", () => {
  assert.equal(askedStep("intro", null), "intro");
  assert.equal(askedStep(null, "agreement"), "agreement");
  assert.equal(askedStep(null, "requirement"), "requirement");
  assert.equal(askedStep(null, "decline"), "enquiry");
  assert.equal(askedStep("nonsense", null), null);
  assert.equal(askedStep(undefined, undefined), null);
  // ?step wins over ?view.
  assert.equal(askedStep("opening", "agreement"), "opening");
});

test("the steps run in order, with a back and a next", () => {
  assert.deepEqual(LEAD_STEPS, ["enquiry", "intro", "agreement", "requirement", "opening"]);
  assert.equal(stepAfter("enquiry"), "intro");
  assert.equal(stepAfter("requirement"), "opening");
  assert.equal(stepAfter("opening"), null);
  assert.equal(stepBefore("enquiry"), null);
  assert.equal(stepBefore("agreement"), "intro");
  assert.equal(stepBefore("opening"), "requirement");
});

test("the search, joining, invoice and guarantee steps go green as the opening gets there", () => {
  const none = { openingConfirmed: false, placed: false, joined: false, guarantee: null };
  assert.deepEqual(tailJourney(none), ["upcoming", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(tailJourney({ ...none, openingConfirmed: true }), ["current", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(tailJourney({ ...none, openingConfirmed: true, placed: true }), ["done", "current", "upcoming", "upcoming"]);
  const joined = { openingConfirmed: true, placed: true, joined: true };
  // From the joining day the invoice is the thing to do, whether or not one is raised yet.
  assert.deepEqual(tailJourney({ ...joined, guarantee: null }), ["done", "done", "current", "upcoming"]);
  assert.deepEqual(tailJourney({ ...joined, invoice: "sent", guarantee: "running" }), ["done", "done", "current", "current"]);
  assert.deepEqual(tailJourney({ ...joined, invoice: "paid", guarantee: "running" }), ["done", "done", "done", "current"]);
  assert.deepEqual(tailJourney({ ...joined, invoice: "paid", guarantee: "warned" }), ["done", "done", "done", "current"]);
  assert.deepEqual(tailJourney({ ...joined, invoice: "paid", guarantee: "ended_clean" }), ["done", "done", "done", "done"]);
  assert.deepEqual(tailJourney({ ...joined, invoice: "written_off", guarantee: "ended_clean" }), ["done", "done", "done", "done"]);
});

test("the bar after the opening is one list for every page, and an unsigned agreement stays visible", () => {
  const tail = tailJourney({ openingConfirmed: true, placed: true, joined: true, invoice: "sent", guarantee: "running" });
  const bar = openingJourney({
    leadId: "l1",
    positionId: "p1",
    agreementSigned: false,
    openingConfirmed: true,
    tail,
    placementId: "pl1",
    invoiceId: "i1",
    guaranteeId: "g1",
    viewing: "invoice",
  });
  assert.deepEqual(bar.map((s) => s.label), ["Enquiry", "Intro call", "Agreement", "Requirement", "Opening", "Search & interviews", "Joining", "Invoice", "Guarantee"]);
  assert.equal(bar[2].state, "skipped");
  assert.deepEqual(bar.filter((s) => s.viewing).map((s) => s.label), ["Invoice"]);
  assert.equal(bar[7].href, "/invoices/i1");
  assert.equal(bar[2].href, "/leads/l1?step=agreement");
});

test("details typed on the intro call (a draft agreement) do not mark the call skipped", () => {
  assert.deepEqual(leadJourney({ ...base, introBooked: true, esaState: "draft" }), ["done", "current", "upcoming", "upcoming", "upcoming"]);
  // Sent without the call marked held: the call is still the step to finish.
  assert.deepEqual(leadJourney({ ...base, introBooked: true, esaState: "sent" }), ["done", "current", "upcoming", "upcoming", "upcoming"]);
  // The client answering (changes, or signed) is what starts the agreement stage.
  assert.deepEqual(leadJourney({ ...base, introHeld: true, esaState: "negotiating" }), ["done", "done", "current", "current", "upcoming"]);
});

test("the bar rings the step you are on and warns on an earlier one still open", () => {
  // The owner's screenshot: looking ahead of the step that is still open (the intro call not held yet).
  const states = leadJourney({ ...base, introBooked: true, esaState: "draft" });
  assert.deepEqual(states, ["done", "current", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(barStates(states, 2), ["done", "skipped", "current", "upcoming", "upcoming"]);
  assert.deepEqual(barStates(states, 4), ["done", "skipped", "skipped", "skipped", "current"]);
  // On the step that is already current nothing changes; done steps stay done.
  assert.deepEqual(barStates(states, 1), states);
  assert.deepEqual(barStates(["done", "done", "current", "upcoming", "upcoming"], 3), ["done", "done", "skipped", "current", "upcoming"]);
});

test("an existing client skips the intro call, and a signed one on file skips the agreement too", () => {
  const existing = { ...base, leadState: "requirement", clientTaId: "ta_c1", skipsIntro: true, agreementOnFile: true };
  assert.deepEqual(leadJourney(existing), ["done", "done", "done", "current", "upcoming"]);
  assert.equal(stepToShow(null, leadJourney(existing)), "requirement");
  // Known to us but never signed: the agreement is still to do, the intro call is not.
  const unsigned = { ...base, leadState: "waiting_agreement", clientTaId: "ta_c1", skipsIntro: true };
  assert.deepEqual(leadJourney(unsigned), ["done", "done", "current", "current", "upcoming"]);
});
