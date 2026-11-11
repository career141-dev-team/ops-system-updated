/**
 * A question the model left blank (11 Nov): "how many drafts are waiting for
 * approval?" came back from the model as `{}`, and the desk answered with its
 * list of offers instead of the number.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { asQuestion } from "@/lib/agent";

const blank = { intent: "", fields: {}, question: "", notSaid: [] };

test("words that read as a question become one when the model names nothing", () => {
  for (const typed of [
    "how many drafts are waiting for approval?",
    "What is late for me today",
    "which clients have mail waiting",
    "is anything due tomorrow",
    "show me the open positions",
  ]) {
    const got = asQuestion(blank, typed);
    assert.equal(got.intent, "question", typed);
    assert.equal(got.question, typed.trim(), typed);
  }
});

test("an order or a name stays as it was, so the offers still come back", () => {
  assert.equal(asQuestion(blank, "approve the last email").intent, "");
  assert.equal(asQuestion(blank, "Nippon").intent, "");
});

test("what the model did name is never replaced", () => {
  const named = { ...blank, intent: "approveDraft" };
  assert.equal(asQuestion(named, "can you approve the last email?").intent, "approveDraft");
});
