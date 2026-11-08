/**
 * The timeline (7 Nov, UX order 4).
 *
 * Two rules: what belongs to a client or a position, and what each entry
 * says. The audit already has every fact; this is the record read out in
 * order, in words, with nothing added.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase } from "@/data/types";
import { byDay, entryInWords, gather, isRawAction, subjectsOfClient, subjectsOfPosition, timeline } from "@/lib/timeline";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 7, 9, 0);

/** The smallest desk that has one of everything a client owns. */
function desk(): OpsDatabase {
  const db = {
    leads: [{ id: "lead_1", clientTaId: "ta_c1" }, { id: "lead_other", clientTaId: "ta_c9" }],
    meetings: [{ id: "mt_1", leadId: "lead_1" }, { id: "mt_other", leadId: "lead_other" }],
    agreements: [{ id: "esa_1", leadId: "lead_1" }],
    requirements: [{ id: "req_1", leadId: "lead_1" }],
    positions: [
      { id: "pos_1", clientId: "cl_1", openingTaId: "op_1" },
      { id: "pos_other", clientId: "cl_other", openingTaId: "op_9" },
    ],
    clientSets: [{ id: "cs_1", clientId: "cl_1", openingTaId: "op_1", positionId: null }],
    holds: [{ id: "hold_1", clientId: "cl_1", openingTaId: "op_1" }],
    interviews: [{ id: "int_1", clientId: "cl_1", openingTaId: "op_1", positionId: "pos_1" }],
    placements: [{ id: "plc_1", clientId: "cl_1", openingTaId: "op_1", positionId: "pos_1" }],
    invoices: [{ id: "inv_1", clientId: "cl_1", placementId: "plc_1" }, { id: "inv_other", clientId: "cl_other", placementId: null }],
    guarantees: [{ id: "g_1", clientId: "cl_1", openingTaId: "op_1", placementId: "plc_1" }],
    ads: [{ id: "ad_1", clientId: "cl_1", openingTaId: "op_1", positionId: "pos_1" }],
    closeChecklists: [{ id: "close_1", clientId: "cl_1", openingTaId: "op_1", positionId: "pos_1" }],
    audit: [
      { id: "a1", actorId: "m_1", action: "lead.created", subjectType: "lead", subjectId: "lead_1", before: null, after: "the website", reason: null, at: NOW - 10 * DAY },
      { id: "a2", actorId: "m_1", action: "client.created", subjectType: "client", subjectId: "cl_1", before: null, after: null, reason: null, at: NOW - 8 * DAY },
      { id: "a3", actorId: null, action: "timer.fired", subjectType: "timer", subjectId: "t_x", before: "running", after: "fired", reason: null, at: NOW - 7 * DAY },
      { id: "a4", actorId: "m_2", action: "invoice.drafted", subjectType: "invoice", subjectId: "inv_1", before: null, after: null, reason: null, at: NOW - 1 * DAY },
      { id: "a5", actorId: "m_1", action: "hold.proposed", subjectType: "hold", subjectId: "hold_1", before: null, after: null, reason: "no reply for 14 days", at: NOW - DAY + 3_600_000 },
      { id: "a6", actorId: "m_9", action: "invoice.drafted", subjectType: "invoice", subjectId: "inv_other", before: null, after: null, reason: null, at: NOW },
    ],
  };
  return db as unknown as OpsDatabase;
}

const client = { id: "cl_1", leadId: null, taClientId: "ta_c1" };
const position = { id: "pos_1", openingTaId: "op_1" };

test("a client owns its enquiry, its positions, and everything under them - and nothing of another client's", () => {
  const ids = subjectsOfClient(desk(), client);
  for (const id of ["cl_1", "lead_1", "mt_1", "esa_1", "req_1", "pos_1", "cs_1", "hold_1", "int_1", "plc_1", "inv_1", "g_1", "ad_1", "close_1"]) {
    assert.ok(ids.has(id), id + " belongs to the client");
  }
  for (const id of ["lead_other", "mt_other", "pos_other", "inv_other"]) {
    assert.equal(ids.has(id), false, id + " is somebody else's");
  }
});

test("a position owns what the search did for it, and its invoice through its placement", () => {
  const ids = subjectsOfPosition(desk(), position);
  for (const id of ["pos_1", "cs_1", "hold_1", "int_1", "plc_1", "g_1", "ad_1", "close_1", "inv_1"]) {
    assert.ok(ids.has(id), id + " belongs to the position");
  }
  // The client itself and the enquiry are above the position, not under it.
  assert.equal(ids.has("cl_1"), false);
  assert.equal(ids.has("lead_1"), false);
  assert.equal(ids.has("inv_other"), false);
});

test("the timeline is the audit for those subjects, newest first, and the clock's entry is nobody's", () => {
  const db = desk();
  const rows = gather(db, subjectsOfClient(db, client));
  assert.deepEqual(rows.map((r) => r.id), ["a5", "a4", "a2", "a1"], "newest first, the other client's invoice left out, the unrelated clock left out");

  const words = timeline(db, subjectsOfClient(db, client), (who) => (who ? "Person " + who : null));
  assert.equal(words[0].said, "A hold was proposed: no reply for 14 days");
  assert.equal(words[0].by, "Person m_1");
  assert.equal(words[1].said, "The invoice was drafted.");
  assert.equal(words[3].said, "The enquiry came in from the website.");
});

test("every action the desk has ever written has words, or is named as still raw", () => {
  // Every distinct action found in the audit of a desk that had walked the
  // whole flow (7 Nov), plus the ones store.ts and desk.ts write by name. A
  // new action lands in RAW until somebody writes its sentence - a strange
  // line is better than one that lies.
  const WRITTEN = [
    "ad.closed", "ad.flyerReady", "ad.live", "ad.ordered", "ad.requested", "baseline.recorded", "call.logged",
    "client.created", "clientSet.candidateDropped", "clientSet.decision.shortlisted", "clientSet.ready",
    "clientSet.reviewed", "clientSet.sent", "close.completed", "close.itemTicked", "close.opened", "esa.started",
    "file.kept", "guarantee.feePaid", "guarantee.refundDecided", "guarantee.refunded", "guarantee.replacing",
    "guarantee.started", "hold.proposed", "holiday.removed", "holidays.added", "inbound.actioned", "inbound.filed",
    "inbound.recorded", "interview.agreed", "interview.attended", "interview.booked", "interview.candidateOut",
    "interview.decision.selected", "interview.slotsFromClient", "interview.slotsRequested", "interview.started",
    "invoice.drafted", "invoice.paid", "invoice.partlyPaid", "invoice.sent", "lead.created", "meeting.booked",
    "member.added", "message.approved", "message.blocked", "message.drafted", "message.edited", "message.failed",
    "message.sent", "outbox.queued", "placement.dojChanged", "placement.invoiced", "placement.joined",
    "placement.noShow", "placement.noShowChoice.replace", "placement.taken", "position.closed",
    "position.depth.add_on", "position.depth.hold_at_five", "reference.cleared", "reference.relayed",
    "reference.reported", "reference.requested", "report.approved", "report.built", "requirement.saved",
    "setting.changed", "task.created", "task.done", "task.escalated", "template.saved", "timer.cancelled",
    "timer.fired", "timer.started",
  ];
  const RAW = ["baseline.recorded", "holiday.removed", "holidays.added", "member.added", "template.saved"];
  for (const action of WRITTEN) {
    assert.equal(isRawAction(action), RAW.includes(action), action + (RAW.includes(action) ? " should still be raw" : " should have words"));
  }
  const row = { subjectType: "x", before: null, after: null, reason: null };
  assert.equal(entryInWords({ ...row, action: "message.sent" }), "A message was sent.");
  assert.equal(entryInWords({ ...row, action: "timer.fired", subjectType: "timer", before: "running", after: "fired" }), "A clock ran out.");
  assert.equal(entryInWords({ ...row, action: "ai.draft_improve", subjectType: "message" }), "The AI draft improve.");
  // The tail is read where the action carries the answer in its name.
  assert.equal(entryInWords({ ...row, action: "clientSet.decision.shortlisted" }), "The client's decision: shortlisted.");
  assert.equal(entryInWords({ ...row, action: "placement.noShowChoice.replace" }), "After the no-show the client chose to replace.");
  assert.equal(entryInWords({ ...row, action: "close.itemTicked", reason: "opening" }), "A close item was ticked: opening");
});

test("a state move nobody has written words for still reads as one", () => {
  assert.equal(
    entryInWords({ action: "ad.somethingNew", subjectType: "ad", before: "live", after: "closed_early", reason: null }),
    "The advert went from live to closed early.",
  );
});

test("a change with a before and an after says both", () => {
  assert.equal(
    entryInWords({ action: "setting.changed", subjectType: "setting", before: "4", after: "5", reason: "the owner asked" }),
    "A setting was changed: 5.",
  );
  // Unknown but with an after: still readable, still honest about what it was.
  assert.equal(
    entryInWords({ action: "member.added", subjectType: "member", before: null, after: "Rushda, ops_owner", reason: null }),
    "member.added on a person: Rushda, ops_owner.",
  );
});

test("a long history reads as days, newest day first", () => {
  const db = desk();
  const days = byDay(timeline(db, subjectsOfClient(db, client), () => null));
  assert.deepEqual(days.map((d) => d.entries.length), [2, 1, 1], "two things on the newest day, then one, then one");
  assert.ok(days[0].day > days[1].day, "newest day first");
});
