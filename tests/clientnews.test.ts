/**
 * "What changed on my clients today" (v6 G4): the audit's codes become sentences about a client, and
 * the entries that are not about a client (clocks, tasks, the model) do not appear at all.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { clientNews } from "@/lib/clientNews";
import type { OpsDatabase } from "@/data/types";

const audit = (action: string, at: number, o: Record<string, unknown> = {}) => ({ id: action + at, actorId: null, action, subjectType: "x", subjectId: "s1", before: null, after: null, reason: null, at, ...o });

const db = {
  audit: [
    audit("timer.fired", 5),
    audit("ai.used", 6),
    audit("task.created", 7),
    audit("clientSet.sent", 1, { reason: "Sent SET 2 (5 CVs) to Anjali Mendis." }),
    audit("lead.introCallBooked", 3, { subjectId: "ld1" }),
    audit("clientSet.ready", 2, { subjectId: "set1" }),
  ],
  leads: [{ id: "ld1", company: "Pearl Dental Group" }],
  clientSets: [{ id: "set1", name: "Serendib Foods > Sales Executive > SET 3" }],
  placements: [],
  clients: [{ id: "c1", name: "Serendib Foods" }],
  inbound: [
    { id: "m1", direction: "in", clientId: "c1", leadId: null, from: "a@x", fromName: "Anjali Mendis", subject: "SET 2: our answer", receivedAt: 4 },
    { id: "m2", direction: "out", clientId: "c1", leadId: null, from: "us@x", fromName: "", subject: "ours", receivedAt: 9 },
    { id: "m3", direction: "in", clientId: null, leadId: null, from: "spam@x", fromName: "", subject: "buy", receivedAt: 8 },
  ],
} as unknown as OpsDatabase;

test("only client news, newest first, in plain sentences", () => {
  assert.deepEqual(
    clientNews(db).map((n) => n.text),
    [
      "Anjali Mendis (Serendib Foods) wrote: SET 2: our answer",
      "Intro call booked with Pearl Dental Group.",
      "Serendib Foods: a CV set is ready to send.",
      "Sent SET 2 (5 CVs) to Anjali Mendis.",
    ],
  );
});

test("our own mail and mail from nobody we know are not client news; the limit holds", () => {
  const ids = clientNews(db).map((n) => n.id);
  assert.ok(!ids.includes("mail:m2") && !ids.includes("mail:m3"));
  assert.equal(clientNews(db, 2).length, 2);
});
