import assert from "node:assert/strict";
import test from "node:test";

import { dictationProblem } from "@/lib/dictation";

test("dictation errors say a plain reason", () => {
  assert.match(dictationProblem("not-allowed"), /blocked for this site/);
  assert.equal(dictationProblem("aborted"), "");
  assert.match(dictationProblem("weird"), /weird/);
});
