/** Where a notification opens: never one of the old list pages that now redirect. */
import assert from "node:assert/strict";
import test from "node:test";

import { hrefForSubject, type LinkDb } from "@/lib/notificationLink";

const db: LinkDb = {
  positions: [{ id: "p1", openingTaId: "smp_o1" }],
  clientSets: [{ id: "s1", openingTaId: "smp_o1" }],
  interviews: [{ id: "i1", openingTaId: "smp_o1", positionId: null }],
  placements: [{ id: "pl1", openingTaId: null, positionId: "p1" }],
  guarantees: [{ id: "g1", openingTaId: "smp_o1" }],
};

test("old list subjects land on the role tab that replaced them", () => {
  assert.equal(hrefForSubject(db, "clientSet", "s1"), "/positions/p1?view=sets");
  assert.equal(hrefForSubject(db, "interview", "i1"), "/positions/p1?view=interviews");
  assert.equal(hrefForSubject(db, "placement", "pl1"), "/positions/p1?view=offer");
  assert.equal(hrefForSubject(db, "guarantee", "g1"), "/positions/p1?view=guarantee");
});

test("a subject with no role page falls back to a real page, not a redirecting one", () => {
  assert.equal(hrefForSubject(db, "clientSet", "gone"), "/positions");
  assert.equal(hrefForSubject(db, "interview", "gone"), "/calendar");
  assert.equal(hrefForSubject(db, "esa", "e1"), "/clients/agreements");
});
