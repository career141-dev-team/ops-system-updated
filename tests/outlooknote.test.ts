import assert from "node:assert/strict";
import test from "node:test";

import { outlookNote } from "@/lib/outlookNote";

test("real, fake and no Outlook event", () => {
  assert.equal(outlookNote({ graphEventId: "AAMk1", organiserName: "Nimal" }), "It is also in Nimal's Outlook calendar.");
  assert.equal(outlookNote({ graphEventId: "fake-123" }), "Test mode: no Outlook event was made.");
  assert.equal(outlookNote({}), "No Outlook event was made for this call.");
  assert.equal(outlookNote({ teamsProblem: "Microsoft is not set up" }), "No Outlook event was made for this call: Microsoft is not set up.");
  assert.equal(outlookNote({ teamsProblem: "Blocked." }), "No Outlook event was made for this call: Blocked.");
});
