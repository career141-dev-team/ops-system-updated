/**
 * The people on an opening (owner, 17 Nov evening): the Primary TA, and more added by the TA lead.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { problemWithTeam, withPeople } from "@/lib/openingTeam";

test("people are added once each, in the order they came, and never twice", () => {
  assert.deepEqual(withPeople([], ["ta2", "ta3"], "ta1"), ["ta2", "ta3"]);
  assert.deepEqual(withPeople(["ta2"], ["ta3", "ta2", "ta4"], "ta1"), ["ta2", "ta3", "ta4"], "more can be added later");
  assert.deepEqual(withPeople(["ta2"], ["ta1", " ", ""], "ta1"), ["ta2"], "the Primary TA is not added again, and blanks are ignored");
});

test("a list with a duplicate, a blank, or the Primary TA in it is refused, and says why", () => {
  assert.equal(problemWithTeam("ta1", ["ta2", "ta3"]), null);
  assert.equal(problemWithTeam(null, []), null, "no one added is fine");
  assert.match(problemWithTeam("ta1", ["ta2", "ta2"]) ?? "", /twice/);
  assert.match(problemWithTeam("ta1", ["ta1", "ta2"]) ?? "", /Primary TA is already on the opening/);
  assert.match(problemWithTeam("ta1", ["ta2", " "]) ?? "", /no id/);
});
