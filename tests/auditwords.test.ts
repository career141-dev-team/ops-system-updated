import assert from "node:assert/strict";
import test from "node:test";

import { actionInWords } from "@/lib/auditWords";

test("audit codes read as words, unknown ones are de-dotted", () => {
  assert.equal(actionInWords("lead.created"), "Lead created");
  assert.equal(actionInWords("lead.somethingNew"), "Lead something new");
});
