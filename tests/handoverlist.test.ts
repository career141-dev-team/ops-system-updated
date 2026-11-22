/** The lead page's "Before this becomes a role on Positions" list and the one intro rule (22 Nov). */
import assert from "node:assert/strict";
import test from "node:test";

import { introSatisfied } from "@/lib/leads";
import { handoverChecklist, problemWithOpening } from "@/lib/requirements";

const fields: Record<string, string> = {
  title: "Head of finance", level: "Head", salary: "Rs. 450,000 a month", locations: "Colombo", headcount: "1",
  jdNotes: "Replacing somebody who left in September.",
};
const intro = { meetings: [{ state: "held" }], esa: null, skipsIntro: false };

test("checklist agrees with problemWithOpening", () => {
  for (const esaState of [null, "sent", "signed"]) {
    for (const blanks of [[], ["salary"]]) {
      for (const openEarly of [false, true]) {
        const input = { esaState, requirementBlanks: blanks, openEarly, fields };
        assert.equal(handoverChecklist({ ...input, intro }).ready, problemWithOpening(input) === null);
      }
    }
  }
});

test("introSatisfied matches what the hand-over accepts", () => {
  assert.equal(introSatisfied({ meetings: [], esa: null, skipsIntro: false }), false);
  assert.equal(introSatisfied({ meetings: [{ state: "booked" }], esa: { state: "draft" }, skipsIntro: false }), false);
  assert.equal(introSatisfied({ meetings: [], esa: { state: "sent" }, skipsIntro: false }), true); // agreement has gone out
  assert.equal(introSatisfied({ meetings: [{ state: "held" }], esa: null, skipsIntro: false }), true); // e.g. a held requirement meeting
  assert.equal(introSatisfied({ meetings: [], esa: null, skipsIntro: true }), true);
});

test("checklist needs the intro and ticks each condition", () => {
  const none = { meetings: [], esa: null, skipsIntro: false };
  const c = handoverChecklist({ intro: none, esaState: "signed", requirementBlanks: [], openEarly: false, fields });
  assert.equal(c.ready, false);
  assert.deepEqual(c.items.map((i) => i.done), [false, true, true]);
  const d = handoverChecklist({ intro, esaState: "sent", requirementBlanks: ["salary"], openEarly: false, fields });
  assert.equal(d.items[1].done, false);
  assert.equal(d.items[2].done, false);
});

test("opening early does not claim a signature or a complete requirement", () => {
  const c = handoverChecklist({ intro, esaState: null, requirementBlanks: ["salary"], openEarly: true, fields });
  assert.match(c.items[1].label, /without waiting/);
  assert.match(c.items[2].label, /name and how many/);
  assert.equal(c.ready, true);
  const blank = handoverChecklist({ intro, esaState: null, requirementBlanks: [], openEarly: true, fields: { ...fields, title: "" } });
  assert.equal(blank.items[2].done, false);
});
