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
      // Our own interview must pass before a CV goes to the client (owner, 16 Nov). An ops lead may switch it off, with a reason.
      { key: "set.requireInternalInterview", value: true, updatedBy: null, updatedAt: null },
      { key: "feedback.chaseDays", value: 1, updatedBy: null, updatedAt: null },
      { key: "feedback.stopAfterSilentDays", value: 4, updatedBy: null, updatedAt: null },
      { key: "feedback.callAfterDays", value: 1, updatedBy: null, updatedAt: null },
      // The owner's two depth rules, as numbers a lead can change (3 Nov).
      { key: "depth.holdAt", value: 5, updatedBy: null, updatedAt: null },
      { key: "depth.searchAgainAt", value: 3, updatedBy: null, updatedAt: null },
      // Who the Monday report goes to. Addresses, separated by commas; the
      // Director's real address is the owner's to put in.
      { key: "report.recipients", value: "", updatedBy: null, updatedAt: null },
      // Interviews (15, Phase 5 step 19 and the owner's notice rule).
      { key: "interview.maxSlotLoops", value: 3, updatedBy: null, updatedAt: null },
      { key: "interview.reportReminderDays", value: 2, updatedBy: null, updatedAt: null },
      { key: "interview.noticeDays", value: 1, updatedBy: null, updatedAt: null },
      { key: "interview.noticeHours", value: 3, updatedBy: null, updatedAt: null },
      { key: "hold.afterDays", value: 14, updatedBy: null, updatedAt: null },
      { key: "hold.reviewDays", value: 30, updatedBy: null, updatedAt: null },
      { key: "invoice.dueDays", value: 30, updatedBy: null, updatedAt: null },
      // The invoice series, and how long before somebody must decide to write
      // an unpaid fee off (15, Phase 6 steps 9 and 14).
      // TopJobs comes down two weeks after it goes live (the owner's rule).
      { key: "ad.days", value: 14, updatedBy: null, updatedAt: null },
      // The AI layer (15, Phase 9). Off until the owner turns it on, a cap in
      // rupees a day, and every task switchable on its own so one bad prompt
      // can be stopped without a deploy.
      { key: "switch.aiEnabled", value: false, updatedBy: null, updatedAt: null },
      { key: "ai.dailyBudget", value: 500, updatedBy: null, updatedAt: null },
      { key: "ai.task.dictate.fields", value: true, updatedBy: null, updatedAt: null },
      { key: "ai.task.inbound.read", value: true, updatedBy: null, updatedAt: null },
      { key: "ai.task.draft.improve", value: true, updatedBy: null, updatedAt: null },
      { key: "ai.task.draft.reply", value: true, updatedBy: null, updatedAt: null },
      { key: "ai.task.summarise", value: true, updatedBy: null, updatedAt: null },
      { key: "ai.task.whatfirst", value: true, updatedBy: null, updatedAt: null },
      { key: "ai.task.ask", value: true, updatedBy: null, updatedAt: null },
      // An unreported hire: three months from the day the set went, and the
      // agreement's 50% surcharge (docs/15 Part B; the ESA says 50%).
      { key: "hire.unreportedMonths", value: 3, updatedBy: null, updatedAt: null },
      { key: "hire.surchargePct", value: 50, updatedBy: null, updatedAt: null },
      { key: "invoice.series", value: "C141", updatedBy: null, updatedAt: null },
      { key: "invoice.writeOffDays", value: 90, updatedBy: null, updatedAt: null },
      // From the agreement itself, which the owner said is the truth (3 Nov):
      // compounded, and nothing on an invoice disputed in good faith. The rate
      // is clause 5.5 of the current ESA: 5% a month (17 Nov; an older draft
      // said 1%).
      { key: "invoice.latePctPerMonth", value: 5, updatedBy: null, updatedAt: null },
      { key: "invoice.lateCompounded", value: true, updatedBy: null, updatedAt: null },
      { key: "guarantee.days", value: 90, updatedBy: null, updatedAt: null },
      { key: "guarantee.warnDay", value: 75, updatedBy: null, updatedAt: null },
      { key: "replacement.workingDays", value: 60, updatedBy: null, updatedAt: null },
      // Clause 6.6 of the current ESA says 25% (17 Nov). An older draft said 50
      // (their reviewer wrote 50, 10 Sep); the owner chose the current document.
      { key: "refund.pct", value: 25, updatedBy: null, updatedAt: null },
      { key: "escalation.leadAfterHours", value: 24, updatedBy: null, updatedAt: null },
      { key: "escalation.directorAfterHours", value: 72, updatedBy: null, updatedAt: null },
      { key: "message.dailyCapPerClient", value: 4, updatedBy: null, updatedAt: null },
      { key: "switch.outreachLive", value: false, updatedBy: null, updatedAt: null },
      { key: "switch.timersEnabled", value: true, updatedBy: null, updatedAt: null },
      { key: "switch.taReadsEnabled", value: false, updatedBy: null, updatedAt: null },
      { key: "switch.taWritesEnabled", value: false, updatedBy: null, updatedAt: null },
      // Teams meetings made in the organiser's Outlook (17 Nov). Off until the
      // Calendars.ReadWrite permission is granted and one test booking works.
      { key: "switch.teamsEnabled", value: false, updatedBy: null, updatedAt: null },
      // Reading a Teams call's transcript to propose the requirement (17 Nov).
      // Off until the transcript permission and the Teams access policy are in.
      { key: "switch.transcriptsEnabled", value: false, updatedBy: null, updatedAt: null },
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
    // No sample meetings: the sample leads are at the point of deciding,
    // which is where a person starts.
    agreements: [],
    meetings: [],
    // No sample clients: one is made the moment an agreement is countersigned.
    clients: [],
    // No sample sets: one arrives when TA says a round is ready.
    clientSets: [],
    holds: [],
    requirements: [],
    positions: [],
    talentPulse: [],
    reports: [],
    interviews: [],
    references: [],
    placements: [],
    invoices: [],
    guarantees: [],
    closeChecklists: [],
    ads: [],
    aiRuns: [],
    chat: [],
    chatThreads: [],
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
        key: "esa.cover",
        channel: "email",
        name: "Agreement, cover email",
        subject: "{{client}} \u00b7 Executive Search Agreement",
        // The owner's own cover (17 Nov, the Valtrix draft), with this client's terms beside each clause.
        body: `Dear {{contact}},

It is a pleasure to welcome your talent request to Career141 Executive Search. With over 20 years of expertise in Executive Search, Career141 has partnered with organizations across 25+ countries and 15+ industries, shaping leadership teams and driving transformative talent strategies. We are delighted to now extend this legacy of trust and global reach to support {{client}}.

Please find enclosed the draft Executive Search Agreement (ESA) for your review and confirmation. Once signed, this will enable us to activate your account and commence the search.

Below are the important clauses of the ESA for your review and knowledge of our process.

See Clause 1.3 - Response Time
See Clause 4.2 - Non-Disclosure of Shared Information
See Clause 5.1 - Consultancy Fee and Payment Terms: {{feeMonths}} month(s) {{feeBasis}} salary of the placed candidate, payable within {{paymentDays}} days of the first working day
See Clause 6.1 - Guarantee and Replacement Clause: one replacement within {{guaranteeDays}} days of the first working day

For the ESA to be valid, we kindly request the inclusion of the company seal, address, and date in the signed agreement. As this is the initial draft, please also let us know if there are any changes to the authorized signatory. If so, we will be pleased to share a revised version reflecting the correct name and designation.

Should you have any questions or require clarification on any aspect of the ESA, please feel free to reach out. Our team will be happy to assist you.

We look forward to formally onboarding {{client}} within the next five working days or sooner, should it be convenient.

Kind regards
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "esa.chase.email.1",
        channel: "email",
        name: "Agreement chase 1, email",
        subject: "{{client}} \u00b7 our agreement",
        body: `Dear {{contact}},

Just a note about the agreement we sent. Could you let us know where it stands?

We can start as soon as it is signed.

Kind regards
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "esa.chase.wa.1",
        channel: "whatsapp",
        name: "Agreement chase 2, WhatsApp",
        subject: "",
        body: "Hello {{contact}}, this is Career 141. Could you let us know where our agreement stands? Happy to answer anything on it.",
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "esa.chase.email.2",
        channel: "email",
        name: "Agreement chase 3, email",
        subject: "{{client}} \u00b7 our agreement",
        body: `Dear {{contact}},

We are holding the search for {{client}} until the agreement is signed. Is there anything in it you would like to go through?

Kind regards
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "esa.chase.wa.2",
        channel: "whatsapp",
        name: "Agreement chase 4, WhatsApp",
        subject: "",
        body: "Hello {{contact}}, following up on our agreement for {{client}}. Shall I send it again, or is there something to discuss?",
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "esa.chase.email.3",
        channel: "email",
        name: "Agreement chase 5, email",
        subject: "{{client}} \u00b7 our agreement",
        body: `Dear {{contact}},

This is our last note about the agreement. If we do not hear from you we will close the file for now, and you are welcome back whenever it suits.

Kind regards
Career 141`,
        approvedForAuto: false,
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
        key: "role.impractical.reply",
        channel: "email",
        name: "A role we cannot fill at that package",
        subject: "{{client}} · the role we discussed",
        body: `Dear {{contact}},

Thank you for your time on the {{position}} role.

Having looked at the market for that package, we do not think we can find you somebody who would both suit the role and accept it, and we would rather say so than take the search and disappoint you.

If the package changes, or if the role changes shape, we would be glad to look again - we will come back to you ourselves in a few months in any case.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "feedback.chase",
        channel: "email",
        name: "Asking a client for their feedback",
        subject: "{{client}} > {{position}} > SET {{setNumber}}",
        body: `Dear {{contact}},

Have you had a chance to look at the CVs we sent? Any feedback, even a line each, lets us carry on in the right direction.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "claim.noted",
        channel: "email",
        name: "A claimed CV, inside the window",
        subject: "{{client}} > {{position}} > SET {{setNumber}}",
        body: `Dear {{contact}},

Thank you for letting us know about {{candidate}}. We have taken them out of this set; the rest of it stands.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "claim.refused",
        channel: "email",
        name: "A claimed CV, after the window",
        subject: "{{client}} > {{position}} > SET {{setNumber}}",
        body: `Dear {{contact}},

Thank you for your note about {{candidate}}. Our agreement gives seven working days from receiving a set to tell us a candidate was already yours, and that period closed on {{closedOn}}, so {{candidate}} stays with us for this role.

We are happy to go through it with you.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "inactive.notice",
        channel: "email",
        name: "Putting a position on hold",
        subject: "{{client}} > {{position}} - on hold",
        body: `Dear {{contact}},

We have not heard back about the CVs for {{position}}, so we are putting the search on hold for now rather than keep sending.

Tell us whenever you are ready and we will start again from where we left off; nothing is lost.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "set.group_post",
        channel: "group_post",
        name: "The set, for the client's WhatsApp group",
        subject: "",
        body: `{{client}} > {{position}} > SET {{setNumber}}

{{cvCount}} CVs are in your email. Any feedback on each one helps us carry on in the right direction.`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "topjobs.order",
        channel: "email",
        name: "Ordering a TopJobs advert",
        subject: "Advert order: {{position}}",
        body: `Dear TopJobs,

Please run the attached advert for our client's {{position}} role.

Applications should come to {{applyAlias}}.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "invoice.surcharge",
        channel: "email",
        name: "The unreported-hire surcharge",
        subject: "{{client}} - invoice {{invoiceNumber}}",
        body: `Dear {{contact}},

Our records show that {{candidate}}, whose CV we sent you on {{sentDate}}, was hired without our being told.

Our agreement provides for a surcharge of {{surchargePct}}% of the fee in that case. The invoice is below.

{{invoice}}

If we have this wrong, tell us and we will withdraw it at once.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "invoice.credit_note",
        channel: "email",
        name: "A credit note",
        subject: "{{client}} - credit note against {{invoiceNumber}}",
        body: `Dear {{contact}},

This is our credit note for {{amount}} against invoice {{invoiceNumber}}.

{{why}}

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "invoice.cover",
        channel: "email",
        name: "Sending an invoice",
        subject: "{{client}} - invoice {{invoiceNumber}}",
        body: `Dear {{contact}},

Our invoice for the placement of {{candidate}} is below. It is payable by {{dueDate}}, thirty days from their first working day.

{{invoice}}

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "invoice.chase",
        channel: "email",
        name: "Chasing an unpaid invoice",
        subject: "Invoice {{invoiceNumber}} - still outstanding",
        body: `Dear all,

Invoice {{invoiceNumber}} is {{daysLate}} days past its due date, and {{amount}} is outstanding.

Our agreement adds 5% a month, compounded, to a late invoice (clause 5.5). If anything on it is in question, tell us and nothing is charged while we sort it out.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "placement.noshow_options",
        channel: "email",
        name: "A candidate who never turned up",
        subject: "{{candidate}} - {{position}}",
        body: `Dear all,

{{candidate}} did not start with you on {{joinDate}}, and we have not been able to change that.

Nothing is invoiced for this placement. Would you like us to find a replacement, or to stop the search? Either way, tell us and we will act on it today.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "interview.slots_request",
        channel: "email",
        name: "Asking the client for interview times",
        subject: "{{candidate}} - interview times",
        body: `Dear {{contact}},

Could you give us two or three times that suit you for {{candidate}} ({{position}})? We will agree one with the candidate and confirm it back to you.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "interview.invite",
        channel: "email",
        name: "The interview invite to the client's people",
        subject: "Interview: {{candidate}}, {{when}}",
        body: `Dear all,

{{candidate}} is confirmed for {{when}}, round {{round}}.

{{whereOrLink}}

The TA has invited the candidate. Anything to change, tell us and we will move it.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "interview.reminder",
        channel: "email",
        name: "The day-before reminder to the client",
        subject: "Tomorrow: {{candidate}}",
        body: `Dear all,

{{candidate}} is with you {{when}}.

{{whereOrLink}}

Kind regards,
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "interview.dropout_notice",
        channel: "email",
        name: "A candidate can no longer attend",
        subject: "{{candidate}} - interview {{when}}",
        body: `Dear all,

{{candidate}} is no longer able to attend {{when}}. We are sorry for the short notice.

We are putting a back-up in front of you and will confirm a new time.

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "interview.client_feedback",
        channel: "email",
        name: "What the candidate said after the interview",
        subject: "{{candidate}} - after the interview",
        body: `Dear all,

We spoke to {{candidate}} after round {{round}}.

{{feedback}}

May we have your own feedback when you have it?

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "reference.relay",
        channel: "email",
        name: "Passing a reference on to the client",
        subject: "{{candidate}} - reference",
        body: `Dear all,

We spoke to the referee for {{candidate}}. This is what was said, as it was said:

{{report}}

Kind regards,
{{opsPerson}}
Career 141`,
        approvedForAuto: false,
        updatedBy: null,
        updatedAt: null,
      },
      {
        key: "report.weekly",
        channel: "email",
        name: "The weekly report to the Director",
        subject: "Career 141 - active positions, week of {{weekOf}}",
        body: `Dear Mr Azeem,

{{report}}

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
        attachmentFileIds: [],
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
        attachmentFileIds: [],
        createdAt: ago(3 * HOUR),
      },
    ],
    inbound: [],
    teamNotes: [],
    vacancies: [],
    applicants: [],
    audit: [],
  };
}
