import assert from "node:assert/strict";
import test from "node:test";

import { seed } from "../src/data/seed";
import { teamNewsView } from "../src/lib/inboxChannels";

test("teamNewsView merges real team notes and milestone audit rows newest first", () => {
  const now = Date.now();
  const db = seed(now);
  db.teamNotes = [
    { id: "tn_1", authorId: "m_owner", body: "Serendib Foods confirmed Round 2.", createdAt: now - 1000 },
  ];
  db.audit = [
    { id: "au_1", at: now - 5000, actorId: "m_lead", action: "esa.signed", subjectType: "esa", subjectId: "esa_1", before: "sent", after: "signed", reason: "Signed by MD" },
    { id: "au_2", at: now - 2000, actorId: "m_lead", action: "setting.changed", subjectType: "setting", subjectId: "k", before: "1", after: "2", reason: "Not a milestone" },
  ];

  const feed = teamNewsView(db);
  assert.equal(feed.length, 2);
  assert.equal(feed[0]!.id, "tn_1");
  assert.equal(feed[0]!.kind, "Note");
  assert.equal(feed[1]!.id, "au_1");
  assert.equal(feed[1]!.kind, "Signed");
});
