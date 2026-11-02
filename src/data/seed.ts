/**
 * Invented sample data for the screens and the tests (2 Nov).
 *
 * Nothing here is real. The names are made up on purpose: no real client,
 * candidate or staff detail belongs in the repository, and the preview runs on
 * this data until real sign-in is in place.
 */

import type { OpsDatabase } from "./types";
import { DAY, HOUR } from "@/lib/calendar";

export function seed(now = Date.now()): OpsDatabase {
  const ago = (ms: number) => now - ms;
  const soon = (ms: number) => now + ms;

  return {
    members: [
      { id: "m_owner", name: "Sample Ops owner", email: "owner@example.test", role: "ops_owner", active: true, taUserId: null },
      { id: "m_lead", name: "Sample Ops lead", email: "lead@example.test", role: "ops_lead", active: true, taUserId: null },
      { id: "m_accounts", name: "Sample Accounts", email: "accounts@example.test", role: "accounts", active: true, taUserId: null },
      { id: "m_dirops", name: "Sample Director of Operations", email: "dirops@example.test", role: "director_ops", active: true, taUserId: null },
    ],
    settings: [
      { key: "esa.sendHours", value: 2, updatedBy: null, updatedAt: null },
      { key: "esa.declineDays", value: 14, updatedBy: null, updatedAt: null },
      { key: "set.minCvs", value: 5, updatedBy: null, updatedAt: null },
      { key: "set.ownershipWorkingDays", value: 7, updatedBy: null, updatedAt: null },
      { key: "feedback.chaseDays", value: 1, updatedBy: null, updatedAt: null },
      { key: "feedback.stopAfterSilentDays", value: 4, updatedBy: null, updatedAt: null },
      { key: "invoice.dueDays", value: 30, updatedBy: null, updatedAt: null },
      { key: "invoice.latePctPerMonth", value: 5, updatedBy: null, updatedAt: null },
      { key: "guarantee.days", value: 90, updatedBy: null, updatedAt: null },
      { key: "guarantee.warnDay", value: 75, updatedBy: null, updatedAt: null },
      { key: "replacement.workingDays", value: 60, updatedBy: null, updatedAt: null },
      { key: "refund.pct", value: 25, updatedBy: null, updatedAt: null },
      { key: "escalation.leadAfterHours", value: 24, updatedBy: null, updatedAt: null },
      { key: "escalation.directorAfterHours", value: 72, updatedBy: null, updatedAt: null },
      { key: "message.dailyCapPerClient", value: 4, updatedBy: null, updatedAt: null },
      { key: "switch.outreachLive", value: false, updatedBy: null, updatedAt: null },
      { key: "switch.timersEnabled", value: true, updatedBy: null, updatedAt: null },
      { key: "switch.taReadsEnabled", value: false, updatedBy: null, updatedAt: null },
      { key: "switch.taWritesEnabled", value: false, updatedBy: null, updatedAt: null },
    ],
    /*
     * The wording we start with. Phase 1 seeds only our own notices and one
     * chase, because the agreement and set wording is the owner’s to write and
     * arrives with the phase that sends it.
     */
    // No sample files: a row with no bytes behind it would be a broken link.
    files: [],
    // Three invented leads, one for each thing a person has to decide about:
    // a new company, a company we already have, and one the industry rule
    // catches. No real company is named anywhere in here.
    leads: [
      {
        id: "ld_new",
        company: "SAMPLE CLIENT B",
        nameKey: "sample client b",
        contactName: "Sample contact",
        contactEmail: "contact@example.test",
        contactPhone: "+94770000001",
        source: "website",
        industry: "Manufacturing",
        website: "www.example.test",
        notes: "Asked for a head of finance through the website form.",
        industryFlagged: false,
        industryBecause: null,
        industryConfirmedBy: null,
        state: "new",
        reason: null,
        doNotInvite: false,
        clientTaId: null,
        ownerId: "m_owner",
        createdBy: null,
        createdAt: ago(2 * HOUR),
        updatedAt: ago(2 * HOUR),
      },
      {
        id: "ld_known",
        company: "SAMPLE CLIENT",
        nameKey: "sample client",
        contactName: "Sample contact",
        contactEmail: "hr@example.test",
        contactPhone: "",
        source: "email",
        industry: "Manufacturing",
        website: "",
        notes: "Came back for a second role.",
        industryFlagged: false,
        industryBecause: null,
        industryConfirmedBy: null,
        state: "new",
        reason: null,
        doNotInvite: false,
        clientTaId: null,
        ownerId: "m_owner",
        createdAt: ago(5 * HOUR),
        createdBy: null,
        updatedAt: ago(5 * HOUR),
      },
      {
        id: "ld_bank",
        company: "SAMPLE LEASING AND FINANCE",
        nameKey: "sample leasing and finance",
        contactName: "Sample contact",
        contactEmail: "careers@example.test",
        contactPhone: "",
        source: "call",
        industry: "Finance",
        website: "",
        notes: "Wants two credit officers.",
        industryFlagged: true,
        industryBecause: "finance",
        industryConfirmedBy: null,
        state: "new",
        reason: null,
        doNotInvite: false,
        clientTaId: null,
        ownerId: "m_lead",
        createdBy: null,
        createdAt: ago(26 * HOUR),
        updatedAt: ago(26 * HOUR),
      },
    ],
    calls: [],
    // Nothing invented here: the baseline is the real last six months, typed
    // in by the Ops team, and a made-up number would be worse than none.
    baseline: [],
    taCalls: [],
    outbox: [],
    events: [],
    templates: [
      {
        key: "task.notice",
        channel: "internal",
        name: "Something needs you",
        subject: "",
        body: "{{taskTitle}} — due {{dueWhen}}.",
        approvedForAuto: true,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "esa.chase.1",
        channel: "email",
        name: "Agreement chase 1",
        subject: "{{client}} · {{position}} — our agreement",
        body: `Dear {{contact}},

We sent our agreement for the {{position}} role on {{date}}. Could you let us know where it stands?

We can start the search as soon as it is signed.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "set.cover",
        channel: "email",
        name: "Sending a CV set",
        subject: "{{client}} > {{position}} > SET {{setNumber}}",
        body: `Dear {{contact}},

{{cvCount}} CVs are attached for the {{position}} role.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
    ],

    holidays: [
      { date: "2026-11-24", name: "Sample holiday" },
      { date: "2026-12-25", name: "Christmas Day" },
    ],
    timers: [
      {
        id: "t_ownership",
        kind: "set.ownership",
        subjectType: "clientSet",
        subjectId: "cs_1",
        startsAt: ago(6 * DAY),
        dueAt: soon(26 * HOUR),
        warnAt: ago(2 * HOUR),
        state: "warned",
        firedAt: null,
        ownerId: "m_owner",
        payload: { label: "Sample Client A, set 2" },
      },
      {
        id: "t_guarantee",
        kind: "guarantee.end",
        subjectType: "placement",
        subjectId: "pl_1",
        startsAt: ago(90 * DAY),
        dueAt: soon(4 * HOUR),
        warnAt: ago(15 * DAY),
        state: "warned",
        firedAt: null,
        ownerId: "m_owner",
        payload: { label: "Sample Client B, Finance manager" },
      },
    ],
    tasks: [
      {
        id: "k_call",
        kind: "call",
        title: "Call Sample Client C about their feedback",
        body: "No feedback on set 1 for two days. Call them, then record what they said.",
        assigneeId: "m_owner",
        dueAt: ago(2 * DAY),
        state: "open",
        subjectType: "clientSet",
        subjectId: "cs_2",
        link: null,
        outcome: null,
        doneBy: null,
        doneAt: null,
        createdAt: ago(2 * DAY),
      },
      {
        id: "k_record",
        title: "Record yesterday's call with Sample Client D",
        kind: "record",
        body: "One line is enough: what they said and what happens next.",
        assigneeId: "m_owner",
        dueAt: soon(6 * HOUR),
        state: "open",
        subjectType: "client",
        subjectId: "cl_4",
        link: null,
        outcome: null,
        doneBy: null,
        doneAt: null,
        createdAt: ago(18 * HOUR),
      },
    ],
    messages: [
      {
        id: "msg_set",
        channel: "email",
        to: ["hr@example.test"],
        subject: "SAMPLE CLIENT A > Head of engineering > set 2",
        body: "Dear Sample contact,\n\nSix CVs are attached for the Head of engineering role.\n\nKind regards,\nCareer 141",
        templateKey: "client.set",
        state: "draft",
        subjectType: "clientSet",
        subjectId: "cs_1",
        approvedBy: null,
        approvedAt: null,
        sentAt: null,
        providerMessageId: null,
        note: null,
        createdAt: ago(1 * HOUR),
      },
      {
        id: "msg_chase",
        channel: "email",
        to: ["md@example.test"],
        subject: "Following up on our agreement",
        body: "Dear Sample contact,\n\nJust a note to follow up on the agreement we sent.\n\nKind regards,\nCareer 141",
        templateKey: "esa.chase2",
        state: "draft",
        subjectType: "esa",
        subjectId: "esa_1",
        approvedBy: null,
        approvedAt: null,
        sentAt: null,
        providerMessageId: null,
        note: null,
        createdAt: ago(3 * HOUR),
      },
    ],
    inbound: [],
    audit: [],
  };
}
