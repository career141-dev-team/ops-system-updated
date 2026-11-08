/**
 * The desk assistant, parts 3 and 4 (8 Nov, docs/31): the rest of the
 * catalogue, the missing-field turn, the day words, and yesterday's line.
 */
import assert from "node:assert/strict";
import test from "node:test";

import type { OpsDatabase, OpsMember } from "@/data/types";
import { AGENT_ACTIONS, answerPending, dayFrom, pendingFrom, pendingMark, resolveIntent, wantsOut, whenFrom, yesterdayInWords } from "@/lib/agent";

// Sunday 8 Nov 2026, 11:30 in Colombo.
const NOW = Date.UTC(2026, 10, 8, 6, 0);
const HOUR = 3_600_000;
const owner = { id: "m_owner", role: "ops_owner", name: "Rushda", email: "r@example.test", active: true } as unknown as OpsMember;
const lead = { id: "m_lead", role: "ops_lead", name: "Asma", email: "a@example.test", active: true } as unknown as OpsMember;

function desk(): OpsDatabase {
  return {
    members: [owner, lead, { id: "m_mkt", role: "marketing", name: "Marketing Person", active: true }],
    clients: [{ id: "cl_1", name: "Nippon Paint Lanka" }, { id: "cl_2", name: "Another Client, Pvt" }],
    leads: [{ id: "lead_1", company: "Lanka Tiles", contactName: "Mr Perera", state: "new" }, { id: "lead_2", company: "Old Co", contactName: "", state: "closed_other" }],
    agreements: [{ id: "esa_1", leadId: "lead_1", state: "sent" }],
    positions: [{ id: "pos_1", clientId: "cl_1", title: "Head of finance", stage: "searching" }, { id: "pos_2", clientId: "cl_2", title: "Accountant", stage: "closed" }],
    clientSets: [
      { id: "cs_1", clientId: "cl_1", setNumber: 1, name: "NIPPON > Head of finance > SET 1", state: "sent", candidates: [{ applicationTaId: "app_a", name: "Amal Perera" }, { applicationTaId: "app_b", name: "Bimal Silva" }] },
      { id: "cs_2", clientId: "cl_1", setNumber: 2, name: "NIPPON > Head of finance > SET 2", state: "ready", candidates: [{ applicationTaId: "app_c", name: "Chamari Fernando" }] },
    ],
    interviews: [{ id: "int_1", clientId: "cl_1", candidateName: "Amal Perera", state: "booked", round: 1 }],
    placements: [{ id: "plc_1", clientId: "cl_1", candidateName: "Bimal Silva", state: "placed" }],
    guarantees: [{ id: "g_1", clientId: "cl_1", candidateName: "Dinesh Kumar", state: "running" }],
    holds: [{ id: "hold_1", clientId: "cl_2", state: "proposed" }],
    ads: [{ id: "ad_1", clientId: "cl_1", title: "Head of finance", state: "live" }],
    reports: [{ id: "rep_1", weekOf: "2026-11-02", state: "built" }],
    closeChecklists: [{ id: "close_1", clientId: "cl_2", positionId: "pos_2", completedAt: null }],
    messages: [], tasks: [], inbound: [], invoices: [],
  } as unknown as OpsDatabase;
}

const say = (intent: string, fields: Record<string, string>) => ({ intent, fields, question: "", notSaid: [] });

test("every record kind is found by its name, and the button says what it is about", () => {
  const db = desk();
  const cases: [string, Record<string, string>, string, string][] = [
    ["start_agreement", { leadId: "lanka tiles" }, "leadId", "lead_1"],
    ["send_agreement", { esaId: "lanka tiles" }, "esaId", "esa_1"],
    ["record_linkedin", { positionId: "head of finance", url: "https://x" }, "positionId", "pos_1"],
    ["review_set", { setId: "nippon set 2" }, "setId", "cs_2"],
    ["ask_slots", { interviewId: "amal", to: "hr@nippon.test" }, "interviewId", "int_1"],
    ["joined", { placementId: "bimal" }, "placementId", "plc_1"],
    ["leaver", { guaranteeId: "dinesh", leftAt: "yesterday", reason: "Went back" }, "guaranteeId", "g_1"],
    ["approve_hold", { holdId: "another client", reason: "silent 14 days" }, "holdId", "hold_1"],
    ["ad_closed", { adId: "head of finance", cvCount: "12" }, "adId", "ad_1"],
    ["approve_report", { reportId: "" }, "reportId", "rep_1"],
    ["complete_close", { checklistId: "accountant" }, "checklistId", "close_1"],
    ["move_client_owner", { clientId: "nippon paint lanka", ownerId: "asma", reason: "holiday" }, "ownerId", "m_lead"],
  ];
  for (const [intent, fields, name, id] of cases) {
    const got = resolveIntent(say(intent, fields), db, lead, NOW);
    assert.equal(got.kind, "proposal", intent + " should propose, got " + JSON.stringify(got));
    if (got.kind === "proposal") {
      assert.equal(got.buttons[0].fields[name], id, intent + " picks " + id);
      assert.ok(got.buttons[0].shows.length > 0, intent + " shows what it will do");
      assert.ok(got.buttons[0].label.length > 5);
    }
  }
});

test("a candidate is found inside the set chosen in the same sentence, and a decision needs the client's words", () => {
  const ok = resolveIntent(say("client_decision", { setId: "nippon set 1", applicationTaId: "bimal", decision: "shortlisted", reason: "Strong on IFRS" }), desk(), owner, NOW);
  assert.equal(ok.kind, "proposal");
  if (ok.kind === "proposal") {
    assert.equal(ok.buttons[0].fields.applicationTaId, "app_b");
    assert.equal(ok.buttons[0].fields.decision, "shortlisted");
  }
  const noWords = resolveIntent(say("client_decision", { setId: "nippon set 1", applicationTaId: "bimal", decision: "rejected" }), desk(), owner, NOW);
  assert.equal(noWords.kind, "ask");
  if (noWords.kind === "ask") assert.equal(noWords.field, "reason");
});

test("two sets at one client without a number is a question, 'the latest' is the newest, and a stranger set is a question", () => {
  const which = resolveIntent(say("send_set", { setId: "nippon" }), desk(), owner, NOW);
  assert.equal(which.kind, "ask");
  if (which.kind === "ask") assert.match(which.said, /SET 1.*SET 2/);
  const latest = resolveIntent(say("send_set", { setId: "the latest nippon set" }), desk(), owner, NOW);
  assert.equal(latest.kind, "proposal");
  if (latest.kind === "proposal") assert.equal(latest.buttons[0].fields.setId, "cs_2");
});

test("the missing-field turn: the question names the field, the next words fill it, and 'never mind' gets out", () => {
  const first = resolveIntent(say("close_enquiry", { leadId: "lanka tiles" }), desk(), owner, NOW);
  assert.equal(first.kind, "ask");
  if (first.kind !== "ask") return;
  assert.equal(first.field, "reason");
  const mark = pendingMark(first.pending, first.field);
  const back = pendingFrom(mark);
  assert.ok(back);
  const answered = answerPending(back!, "They went with another agency");
  const second = resolveIntent(answered, desk(), owner, NOW);
  assert.equal(second.kind, "proposal");
  if (second.kind === "proposal") {
    assert.equal(second.buttons[0].fields.reason, "They went with another agency");
    assert.equal(second.buttons[0].fields.state, "closed_other");
  }
  assert.ok(wantsOut("never mind"));
  assert.ok(wantsOut("Cancel."));
  assert.ok(!wantsOut("They went with another agency"));
  assert.equal(pendingFrom("feed:inbound:x"), null);
});

test("days and times are read strictly: today, tomorrow, a weekday ahead, a date; nothing else is guessed", () => {
  assert.equal(dayFrom("today", NOW), "2026-11-08");
  assert.equal(dayFrom("tomorrow", NOW), "2026-11-09");
  assert.equal(dayFrom("Tuesday", NOW), "2026-11-10");
  assert.equal(dayFrom("12/11", NOW), "2026-11-12");
  assert.equal(dayFrom("2026-11-20", NOW), "2026-11-20");
  assert.equal(dayFrom("soon", NOW), null);
  assert.equal(whenFrom("Tuesday 10:00", NOW), "2026-11-10T10:00");
  assert.equal(whenFrom("tomorrow at 2pm", NOW), "2026-11-09T14:00");
  assert.equal(whenFrom("2026-11-12 09:30", NOW), "2026-11-12T09:30");
  assert.equal(whenFrom("sometime", NOW), null);
  const bad = resolveIntent(say("move_join_date", { placementId: "bimal", joinDate: "soon", reason: "x" }), desk(), owner, NOW);
  assert.equal(bad.kind, "ask");
  if (bad.kind === "ask") assert.match(bad.said, /cannot read "soon"/);
});

test("permissions hold across the catalogue: marketing may run adverts, not the client's decisions; the Director's refund is refuse.decide", () => {
  const mkt = { id: "m_mkt", role: "marketing", name: "M", active: true } as unknown as OpsMember;
  assert.equal(resolveIntent(say("ad_live", { adId: "head of finance", liveAt: "today" }), desk(), mkt, NOW).kind, "proposal");
  assert.equal(resolveIntent(say("client_decision", { setId: "nippon set 1", applicationTaId: "bimal", decision: "rejected", reason: "x" }), desk(), mkt, NOW).kind, "refuse");
  assert.equal(resolveIntent(say("decide_refund", { guaranteeId: "dinesh", reason: "x" }), desk(), owner, NOW).kind, "refuse");
  assert.ok(AGENT_ACTIONS.filter((a) => a.money).every((a) => a.needs === "money.manage" || a.needs === "refund.decide"), "every money intent needs a money permission");
});

test("yesterday in one line, counted from the thread, and nothing when yesterday was quiet", () => {
  const y = NOW - 24 * HOUR;
  const rows = [
    { who: "person", state: "said", actionName: null, at: y },
    { who: "desk", state: "done", actionName: "approveAndSend", at: y + HOUR },
    { who: "desk", state: "done", actionName: "quickAdd", at: y + 2 * HOUR },
    { who: "desk", state: "refused", actionName: null, at: y + 3 * HOUR },
    { who: "feed", state: "done", actionName: "feed:task:x", at: y + 4 * HOUR },
    { who: "desk", state: "done", actionName: "markMailDone", at: NOW - HOUR }, // today, not counted
  ];
  assert.equal(yesterdayInWords(rows, NOW), "Yesterday here: 2 things done, 1 refused, 3 replies.");
  assert.equal(yesterdayInWords([{ who: "desk", state: "done", actionName: "x", at: NOW }], NOW), null);
});
