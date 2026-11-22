/** The lead page's "Before this becomes a role on Positions" list, the audit words and the ISO week (22 Nov). */
import assert from "node:assert/strict";
import test from "node:test";

import { actionInWords } from "@/lib/auditWords";
import { handoverChecklist, problemWithOpening } from "@/lib/requirements";
import { colomboIsoWeek } from "@/lib/weekNumber";

const fields: Record<string, string> = {
  title: "Head of finance", level: "Head", salary: "Rs. 450,000 a month", locations: "Colombo", headcount: "1",
  jdNotes: "Replacing somebody who left in September.",
};

test("checklist agrees with problemWithOpening", () => {
  for (const esaState of [null, "sent", "signed"]) {
    for (const blanks of [[], ["salary"]]) {
      for (const openEarly of [false, true]) {
        const input = { esaState, requirementBlanks: blanks, openEarly, fields };
        const c = handoverChecklist({ ...input, introDone: true });
        assert.equal(c.ready, problemWithOpening(input) === null);
      }
    }
  }
});

test("checklist needs the intro call and ticks each condition", () => {
  const c = handoverChecklist({ introDone: false, esaState: "signed", requirementBlanks: [], openEarly: false, fields });
  assert.equal(c.ready, false);
  assert.deepEqual(c.items.map((i) => i.done), [false, true, true]);
  const d = handoverChecklist({ introDone: true, esaState: "sent", requirementBlanks: ["salary"], openEarly: false, fields });
  assert.equal(d.items[1].done, false);
  assert.equal(d.items[2].done, false);
});

test("audit codes read as words, unknown ones are de-dotted", () => {
  assert.equal(actionInWords("lead.created"), "Lead created");
  assert.equal(actionInWords("lead.somethingNew"), "Lead something new");
});

test("Sat 21 Nov 2026 is ISO week 47, in Colombo time", () => {
  assert.equal(colomboIsoWeek(Date.UTC(2026, 10, 21, 8, 0)), 47);
  assert.equal(colomboIsoWeek(Date.UTC(2026, 10, 22, 19, 0)), 48); // Mon 23 Nov 00:30 Colombo
  assert.equal(colomboIsoWeek(Date.UTC(2026, 0, 1, 5, 0)), 1);
  assert.equal(colomboIsoWeek(Date.UTC(2027, 0, 1, 5, 0)), 53);
});

test("dictation errors say a plain reason", async () => {
  const { dictationProblem } = await import("@/lib/dictation");
  assert.match(dictationProblem("not-allowed"), /blocked for this site/);
  assert.equal(dictationProblem("aborted"), "");
  assert.match(dictationProblem("weird"), /weird/);
});
