import assert from "node:assert/strict";
import test from "node:test";

import { groupByDay, teamNewsView, whatsappView } from "@/lib/inboxChannels";
import type { OpsDatabase } from "@/data/types";

const db = {
  inbound: [
    { id: "i1", channel: "whatsapp", readState: "new", from: "x", fromName: "Serendib group", receivedAt: 2, body: " Hiruni ok ", subjectType: "clientSet", subjectId: "s1" },
    { id: "i2", channel: "email", readState: "new", from: "y", fromName: "Y", receivedAt: 3, body: "mail" },
    { id: "i3", channel: "whatsapp", readState: "actioned", from: "z", fromName: "Z", receivedAt: 4, body: "done" },
  ],
  clientSets: [{ id: "s1", name: "A > B > SET 2", openingTaId: "o1" }],
  positions: [{ id: "p1", openingTaId: "o1" }],
  messages: [
    { id: "m1", channel: "whatsapp", state: "draft", to: ["Anjali"], body: "Hello", createdAt: 5 },
    { id: "m2", channel: "whatsapp", state: "sent", to: ["Anjali"], body: "old", createdAt: 6 },
    { id: "m3", channel: "email", state: "draft", to: ["a@b.c"], body: "mail", createdAt: 7 },
  ],
} as unknown as OpsDatabase;

test("whatsapp view keeps only unrecorded WhatsApp replies and unsent WhatsApp drafts", () => {
  const v = whatsappView(db);
  assert.equal(v.replies.length, 1);
  assert.equal(v.replies[0].quote, "Hiruni ok");
  assert.equal(v.replies[0].recordHref, "/positions/p1?view=sets&panel=record-answer&on=s1");
  assert.deepEqual(v.ready.map((r) => r.id), ["m1"]);
});

test("team news is empty without a store, and groups by day", () => {
  assert.deepEqual(teamNewsView(db), []);
  const d = 86_400_000;
  const g = groupByDay([
    { id: "a", kind: "", tone: "good", by: "", at: 10 * d, text: "", about: null, href: null },
    { id: "b", kind: "", tone: "good", by: "", at: 10 * d + 5, text: "", about: null, href: null },
    { id: "c", kind: "", tone: "good", by: "", at: 8 * d, text: "", about: null, href: null },
  ]);
  assert.equal(g.length, 2);
  assert.equal(g[0].items.length, 2);
});
