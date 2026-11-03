/**
 * Calls. No telephony and no AI calling: the only things that can be wrong
 * here are the number and whether anybody wrote down what was said.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { problemWithCall, purposeInWords, telLink, tidyPhone } from "@/lib/calls";

test("the same Sri Lankan number typed five ways is one number", () => {
  for (const typed of ["077 123 4567", "0771234567", "+94 77 123 4567", "94771234567", "(077) 123-4567"]) {
    assert.equal(tidyPhone(typed), "+94771234567", typed);
  }
});

test("a number that is not a number is refused, not guessed at", () => {
  assert.equal(tidyPhone(""), null);
  assert.equal(tidyPhone("ask Rushda"), null);
  assert.equal(tidyPhone("1234"), null);
  assert.equal(telLink("077 123 4567"), "tel:+94771234567");
  assert.equal(telLink("nope"), null);
});

test("a foreign number is kept as it was typed", () => {
  assert.equal(tidyPhone("+971 50 123 4567"), "+971501234567");
});

test("a call is not written down until somebody says what happened", () => {
  const good = { to: "0771234567", spokeTo: "Rushda", outcome: "She will send the signed copy today." };
  assert.equal(problemWithCall(good), null);
  assert.match(problemWithCall({ ...good, to: "x" }) ?? "", /phone number/);
  assert.match(problemWithCall({ ...good, spokeTo: " " }) ?? "", /who you spoke to/);
  assert.match(problemWithCall({ ...good, outcome: "" }) ?? "", /what was said/);
  assert.match(problemWithCall({ ...good, outcome: "ok" }) ?? "", /a little more/);
});

test("the purpose is shown in words, and an unknown one is shown as it is", () => {
  assert.match(purposeInWords("feedback.chase"), /feedback/);
  assert.equal(purposeInWords("something.new"), "something.new");
});
