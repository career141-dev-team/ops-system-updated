import type {
  OpsAd,
  OpsClient,
  OpsClientSet,
  OpsCloseChecklist,
  OpsEsa,
  OpsHold,
  OpsInterview,
  OpsLead,
  OpsPosition,
  OpsRequirement,
  OpsTalentPulseIssue,
} from "@/data/types";
import { nameKey } from "@/lib/leads";

/**
 * The Openings sample (18 Nov, the owner: "dummy data with real values" to test Openings on a laptop).
 *
 * Both sides of one invented desk, with ids that line up: what the stand-in TA System answers (clients, openings,
 * sets, pipelines - `SAMPLE_TA`) and what Ops holds about them (`sampleOpenings`). Every name is invented, every
 * address is @example.test, every number 077 000 ...; no real client or candidate is in here (AGENTS.md rule 6).
 *
 * Every row's id starts with `smp_` (and every TA id with `ta_smp_`), so the sample can be taken out again
 * without touching anything else. Loaded from /dev/ta, on the laptop run only.
 */

export const SAMPLE_PREFIX = "smp_";
const DAY = 86_400_000;

type Candidate = { id: string; name: string; now: string; years: number; preparedCv: boolean };

const C = (n: number, name: string, now: string, years: number, preparedCv = true): Candidate => ({
  id: "ta_smp_a" + n,
  name,
  now,
  years,
  preparedCv,
});

/** The companies, and the HR person each one's sets go to. */
const COMPANIES = [
  { key: "meridian", name: "Meridian Foods", industry: "Food manufacturing", city: "Colombo", hr: "Shanika Perera", hrEmail: "shanika.perera@meridianfoods.example.test" },
  { key: "harbour", name: "Ceylon Harbour Logistics", industry: "Logistics", city: "Colombo 15", hr: "Roshan de Silva", hrEmail: "roshan.desilva@ceylonharbour.example.test" },
  { key: "kelani", name: "Kelani Fabrics", industry: "Textiles", city: "Biyagama", hr: "Nirmala Fonseka", hrEmail: "nirmala.fonseka@kelanifabrics.example.test" },
  { key: "bluewater", name: "Bluewater Hotels", industry: "Hospitality", city: "Bentota", hr: "Anjali Gunawardena", hrEmail: "anjali.g@bluewaterhotels.example.test" },
  { key: "sunrise", name: "Sunrise Ceramics", industry: "Manufacturing", city: "Horana", hr: "Chaminda Ratnayake", hrEmail: "chaminda.r@sunriseceramics.example.test" },
] as const;

/**
 * The openings, one for each state the board and the opening page draw. `stages` is what TA's pipeline says about
 * each candidate; `sets` is what Ops was sent.
 */
const OPENINGS = [
  {
    n: 1, company: "meridian", title: "Finance Manager", salary: "LKR 450,000 – 550,000 a month", level: "Manager · 8+ years",
    brief: "Runs month-end, the audit and a team of four. Must know SAP FI/CO. Reports to the CFO.", stage: "searching", jd: true, linkedIn: true, primaryTa: "ta_u2",
    sets: [
      { n: 1, state: "sent", receivedDaysAgo: 2, people: [C(1, "Kasun Jayasinghe", "Finance Manager, FMCG", 11), C(2, "Ishara Perera", "Senior Accountant, telecoms", 8), C(3, "Ruwan Wickrama", "Finance Lead, apparel", 9), C(4, "Pradeep Kumara", "Accountant, conglomerate", 5), C(5, "Nuwan Senanayake", "Accountant, plantations", 7)] },
      { n: 2, state: "ready", people: [C(6, "Thilini Peiris", "Finance Executive, apparel", 4), C(7, "Ashan Fernando", "Group Accountant, conglomerate", 6), C(8, "Dulani Weerasinghe", "Accountant, retail", 3), C(9, "Sachini Rodrigo", "Management Accountant, FMCG", 5), C(10, "Malith Gamage", "Finance Executive, hotels", 4, false)] },
    ],
    stages: { ta_smp_a1: "sent_to_client", ta_smp_a2: "sent_to_client", ta_smp_a3: "sent_to_client", ta_smp_a4: "sent_to_client", ta_smp_a5: "sent_to_client", ta_smp_a6: "screened", ta_smp_a7: "screened", ta_smp_a8: "screened", ta_smp_a9: "screened", ta_smp_a10: "screened" },
    ad: "live",
  },
  {
    n: 2, company: "meridian", title: "Production Planner", salary: "LKR 220,000 – 260,000 a month", level: "Executive · 4+ years",
    brief: "Plans the two lines week by week with stores and quality. Food or FMCG plant experience.", stage: "handed_over", jd: false, linkedIn: false, primaryTa: "ta_u2",
    sets: [], stages: {}, ad: null,
  },
  {
    n: 3, company: "harbour", title: "Operations Lead", salary: "LKR 380,000 a month, plus vehicle", level: "Senior manager · 10+ years",
    brief: "Leads the yard and the fleet, 60 people over two shifts. Port or 3PL background.", stage: "searching", jd: true, linkedIn: true, primaryTa: "ta_u2",
    sets: [
      { n: 1, state: "sent", receivedDaysAgo: 9, people: [C(11, "Tharindu Silva", "Operations Manager, 3PL", 12), C(12, "Lahiru Bandara", "Yard Manager, port services", 10), C(13, "Amila Karunaratne", "Fleet Manager, distribution", 9), C(14, "Dinuka Herath", "Shift Lead, terminal", 8), C(15, "Nadeesha Ranasinghe", "Logistics Manager, FMCG", 11)] },
    ],
    stages: { ta_smp_a11: "interview", ta_smp_a12: "interview", ta_smp_a13: "client_shortlist", ta_smp_a14: "rejected_by_client", ta_smp_a15: "sent_to_client" },
    ad: "ordered",
  },
  {
    n: 4, company: "kelani", title: "Merchandiser", salary: "LKR 180,000 – 210,000 a month", level: "Executive · 3+ years",
    brief: "Owns two buyer accounts from costing to shipment. Knit or woven, export house experience.", stage: "hold_at_five", jd: true, linkedIn: true, primaryTa: "ta_u2",
    sets: [
      { n: 1, state: "sent", receivedDaysAgo: 16, people: [C(16, "Hasini Wijesekara", "Merchandiser, knit export", 4), C(17, "Priyanka Silva", "Merchandiser, woven", 5), C(18, "Kavindi Jayawardena", "Assistant Merchandiser", 3), C(19, "Sahan Dias", "Merchandiser, sportswear", 6), C(20, "Rashmi Abeysekara", "Merchandiser, lingerie", 4)] },
    ],
    stages: { ta_smp_a16: "client_shortlist", ta_smp_a17: "client_shortlist", ta_smp_a18: "client_shortlist", ta_smp_a19: "client_shortlist", ta_smp_a20: "client_shortlist" },
    ad: "requested",
  },
  {
    // Handed over and waiting for TA: no opening yet, and nobody named for it. "TA creates the opening" on /dev/ta.
    n: 5, company: "bluewater", title: "Front Office Manager", salary: "LKR 240,000 a month, plus service charge", level: "Manager · 6+ years",
    brief: "Runs reception, reservations and guest relations for a 120-room resort.", stage: "handed_over", jd: false, linkedIn: false, primaryTa: null,
    sets: [], stages: {}, ad: null, noOpening: true,
  },
  {
    n: 6, company: "sunrise", title: "Production Engineer", salary: "LKR 300,000 a month", level: "Engineer · 5+ years",
    brief: "Kilns and glazing lines, maintenance planning, a team of twelve.", stage: "closed", jd: true, linkedIn: true, primaryTa: "ta_u2",
    sets: [], stages: {}, ad: "flyer",
  },
] as const;

/* ── What the stand-in TA System answers ─────────────────────────── */

export const SAMPLE_TA = {
  clients: COMPANIES.map((c) => ({
    id: "ta_smp_c_" + c.key,
    name: c.name,
    nameKey: nameKey(c.name),
    industry: c.industry,
    esaSignedAt: Date.UTC(2026, 9, 6),
    status: "active",
    opsOwnerId: null,
    contacts: [{ name: c.hr, email: c.hrEmail, role: "hr", phone: "+94 77 000 " + String(1000 + c.key.length * 37).slice(0, 4) }],
  })),
  openings: OPENINGS.filter((o) => !("noOpening" in o)).map((o) => ({
    id: "ta_smp_j" + o.n,
    title: o.title,
    clientId: "ta_smp_c_" + o.company,
    status: o.stage === "closed" ? "closed" : o.stage === "hold_at_five" ? "on_hold" : "open",
    primaryRecruiterId: o.primaryTa,
    taLeadId: "ta_u1",
    headcount: 1,
    assignedAt: Date.UTC(2026, 9, 20),
  })),
  sets: OPENINGS.flatMap((o) =>
    o.sets.map((s) => ({
      id: "ta_smp_round" + o.n + "_" + s.n,
      setNumber: s.n,
      openingId: "ta_smp_j" + o.n,
      applicationIds: s.people.map((p) => p.id),
      applications: s.people.map((p) => ({ id: p.id, name: p.name, preparedCv: p.preparedCv })),
      dispatch: s.state === "sent" ? "sent" : "ready",
      status: s.state,
      sentAt: null,
      receivedAt: null,
    })),
  ),
  /** Each opening's pipeline, before anything the tester does moves a stage (see src/lib/fakeTaState.ts). */
  pipelines: Object.fromEntries(
    OPENINGS.filter((o) => !("noOpening" in o)).map((o) => [
      "ta_smp_j" + o.n,
      o.sets.flatMap((s) =>
        s.people.map((p) => ({
          id: p.id,
          candidateName: p.name,
          currentStage: (o.stages as Record<string, string>)[p.id] ?? "screened",
          setNumber: s.n,
          backupForApplicationId: null,
        })),
      ),
    ]),
  ) as Record<string, { id: string; candidateName: string; currentStage: string; setNumber: number | null; backupForApplicationId: null }[]>,
  /** Who has a prepared CV, for the stand-in's file answer. */
  cvs: Object.fromEntries(OPENINGS.flatMap((o) => o.sets.flatMap((s) => s.people.map((p) => [p.id, { name: p.name, preparedCv: p.preparedCv }])))) as Record<
    string,
    { name: string; preparedCv: boolean }
  >,
};

/* ── What Ops holds ──────────────────────────────────────────────── */

export interface SampleRows {
  leads: OpsLead[];
  agreements: OpsEsa[];
  clients: OpsClient[];
  requirements: OpsRequirement[];
  positions: OpsPosition[];
  clientSets: OpsClientSet[];
  ads: OpsAd[];
  holds: OpsHold[];
  interviews: OpsInterview[];
  talentPulse: OpsTalentPulseIssue[];
  closeChecklists: OpsCloseChecklist[];
}

/** The Ops rows, owned by `ownerId`, dated around `now`. Pure: the same `now` gives the same rows. */
export function sampleOpenings(now: number, ownerId: string): SampleRows {
  const ago = (days: number) => now - days * DAY;
  const rows: SampleRows = {
    leads: [],
    agreements: [],
    clients: [],
    requirements: [],
    positions: [],
    clientSets: [],
    ads: [],
    holds: [],
    interviews: [],
    talentPulse: [],
    closeChecklists: [],
  };

  for (const c of COMPANIES) {
    const leadId = SAMPLE_PREFIX + "ld_" + c.key;
    const taClientId = "ta_smp_c_" + c.key;
    rows.leads.push({
      id: leadId,
      company: c.name,
      nameKey: nameKey(c.name),
      contactName: c.hr,
      contactEmail: c.hrEmail,
      contactPhone: "077 000 " + String(4100 + c.key.length * 13),
      source: "referral",
      industry: c.industry,
      website: c.key + ".example.test",
      notes: "Sample lead for testing Openings.",
      industryFlagged: false,
      industryBecause: null,
      industryConfirmedBy: null,
      state: "handed_over",
      reason: null,
      doNotInvite: false,
      clientTaId: taClientId,
      ownerId,
      createdBy: ownerId,
      createdAt: ago(40),
      updatedAt: ago(30),
    });
    rows.agreements.push({
      id: SAMPLE_PREFIX + "esa_" + c.key,
      leadId,
      clientTaId: taClientId,
      state: "countersigned",
      version: 1,
      fields: { company: c.name, fee: "one month of gross salary", guarantee: "90 days" },
      draftFileId: null,
      sentAt: ago(36),
      sentMessageId: null,
      chaseStep: 0,
      expiresAt: null,
      signedAt: ago(33),
      signedFileId: null,
      countersignedAt: ago(32),
      countersignedFileId: null,
      reason: null,
      ownerId,
      createdAt: ago(37),
      updatedAt: ago(32),
    });
    rows.clients.push({
      id: SAMPLE_PREFIX + "cl_" + c.key,
      leadId,
      taClientId,
      name: c.name,
      nameKey: nameKey(c.name),
      stage: "active",
      billingName: c.name + " (Pvt) Ltd",
      billingEmail: "accounts@" + c.key + ".example.test",
      billingAddress: "No. 12, Main Street, " + c.city,
      groupName: c.name + " · Career 141",
      contacts: [{ name: c.hr, email: c.hrEmail, phone: "077 000 " + String(4100 + c.key.length * 13), role: "hr" }],
      notes: "",
      reason: null,
      ownerId,
      createdAt: ago(32),
      updatedAt: ago(32),
    });
  }

  for (const o of OPENINGS) {
    const company = COMPANIES.find((c) => c.key === o.company)!;
    const clientId = SAMPLE_PREFIX + "cl_" + o.company;
    const taClientId = "ta_smp_c_" + o.company;
    const openingTaId = "noOpening" in o ? null : "ta_smp_j" + o.n;
    const positionId = SAMPLE_PREFIX + "pos_" + o.n;
    const requirementId = SAMPLE_PREFIX + "req_" + o.n;
    const opened = ago(28 - o.n);

    rows.requirements.push({
      id: requirementId,
      leadId: SAMPLE_PREFIX + "ld_" + o.company,
      clientId,
      clientTaId: taClientId,
      meetingId: null,
      version: 1,
      fields: { title: o.title, level: o.level, salary: o.salary, locations: company.city, headcount: "1", jdNotes: o.brief, reportsTo: "" },
      practical: true,
      reason: null,
      inviteBackAt: null,
      openedAt: opened,
      ownerId,
      createdAt: opened - DAY,
      updatedAt: opened,
    });
    const shortlisted = Object.values(o.stages).filter((s) => ["client_shortlist", "interview", "offer"].includes(s)).length;
    rows.positions.push({
      id: positionId,
      requirementId,
      clientId,
      clientTaId: taClientId,
      openingTaId,
      title: o.title,
      stage: o.stage,
      primaryTaId: o.primaryTa,
      hundredPercentDay: o.primaryTa ? "Tuesday" : null,
      taStatus: openingTaId ? "Searching" : null,
      jdApprovedAt: o.jd ? opened + DAY : null,
      linkedInUrl: o.linkedIn ? "https://www.linkedin.com/jobs/view/" + (4100000000 + o.n) : null,
      linkedInPostedAt: o.linkedIn ? opened + 2 * DAY : null,
      depthStage: o.stage === "hold_at_five" ? "hold_at_five" : shortlisted > 0 ? "follow_up" : null,
      shortlistedTotal: shortlisted || null,
      pendingCount: Object.values(o.stages).filter((s) => s === "client_shortlist").length || null,
      depthCheckedAt: shortlisted ? ago(1) : null,
      handedOverAt: opened,
      closedAt: o.stage === "closed" ? ago(2) : null,
      ownerId,
      createdAt: opened,
      updatedAt: ago(1),
    });

    for (const s of o.sets) {
      const receivedAt = "receivedDaysAgo" in s ? ago(s.receivedDaysAgo) : null;
      const decided = (id: string) => {
        const stage = (o.stages as Record<string, string>)[id];
        return stage === "client_shortlist" || stage === "interview" ? "shortlisted" : stage === "rejected_by_client" ? "rejected" : null;
      };
      rows.clientSets.push({
        id: SAMPLE_PREFIX + "set_" + o.n + "_" + s.n,
        taRoundId: "ta_smp_round" + o.n + "_" + s.n,
        openingTaId: openingTaId ?? "",
        setNumber: s.n,
        clientId,
        clientTaId: taClientId,
        name: company.name.toUpperCase() + " > " + o.title.toUpperCase() + " > SET " + s.n,
        role: o.title,
        state: s.state,
        candidates: s.people.map((p) => ({
          applicationTaId: p.id,
          name: p.name,
          // A sent set kept its CVs when it went; a ready one is fetched by "Read the set and keep the CVs".
          fileId: null,
          problem: p.preparedCv ? null : "TA has no prepared CV for this one yet.",
          decision: s.state === "sent" ? decided(p.id) : null,
          decisionReason: s.state === "sent" && decided(p.id) === "rejected" ? "Not enough fleet experience." : null,
          decidedAt: s.state === "sent" && decided(p.id) ? ago(1) : null,
        })),
        dueAt: s.state === "ready" ? now + 3 * DAY : null,
        sentAt: receivedAt,
        sentMessageId: null,
        sentTo: receivedAt ? [company.hrEmail] : [],
        receivedAt,
        reason: null,
        ownerId,
        createdAt: receivedAt ?? ago(1),
        updatedAt: receivedAt ?? ago(1),
      });
    }

    if (o.ad && openingTaId) {
      const at = ago(6);
      rows.ads.push({
        id: SAMPLE_PREFIX + "ad_" + o.n,
        channel: "topjobs",
        openingTaId,
        positionId,
        clientId,
        title: o.title + " · " + company.name,
        state: o.ad,
        kind: "single",
        cost: 5400,
        flyerFileId: null,
        applyAlias: o.ad === "requested" || o.ad === "flyer" ? null : "jobs+" + o.n + "@career141.example.test",
        orderMessageId: null,
        requestedAt: at,
        orderedAt: o.ad === "ordered" || o.ad === "live" ? at + DAY : null,
        liveAt: o.ad === "live" ? at + 2 * DAY : null,
        closesAt: o.ad === "live" ? at + 16 * DAY : null,
        closedAt: null,
        cvCount: o.ad === "live" ? 3 : null,
        reason: null,
        ownerId,
        createdAt: at,
        updatedAt: at,
      });
    }
  }

  // Kelani's set went 16 days ago with no word since: its silence clock, started on loading, proposes the hold by
  // itself on the first page load - the real path, not a hold row written here.

  // Two interviews for the Operations Lead: one booked for Thursday, one held and waiting on the client.
  const iv = (n: number, app: string, name: string, state: string, at: number | null, attendedAt: number | null) => ({
    id: SAMPLE_PREFIX + "iv_" + n,
    applicationTaId: app,
    openingTaId: "ta_smp_j3",
    positionId: SAMPLE_PREFIX + "pos_3",
    clientId: SAMPLE_PREFIX + "cl_harbour",
    candidateName: name,
    scheduler: "us",
    state,
    round: 1,
    slots: at ? [at] : [],
    slotLoops: 0,
    at,
    format: "in person",
    interviewers: ["roshan.desilva@ceylonharbour.example.test"],
    whereOrLink: "Ceylon Harbour Logistics, Colombo 15",
    interviewTaId: null,
    inviteMessageId: null,
    attendedAt,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    candidateFeedback: attendedAt ? "Liked the team; wants to know the shift pattern." : null,
    reason: null,
    ownerId,
    createdAt: ago(5),
    updatedAt: ago(1),
  });
  rows.interviews.push(iv(1, "ta_smp_a11", "Tharindu Silva", "booked", now + 2 * DAY, null));
  rows.interviews.push(iv(2, "ta_smp_a12", "Lahiru Bandara", "attended", ago(1), ago(1)));

  // Sunrise's opening is closed, its checklist done.
  rows.closeChecklists.push({
    id: SAMPLE_PREFIX + "close_6",
    openingTaId: "ta_smp_j6",
    positionId: SAMPLE_PREFIX + "pos_6",
    clientId: SAMPLE_PREFIX + "cl_sunrise",
    trigger: "client_stopped",
    items: [
      { key: "linkedin", what: "Close the LinkedIn post", whose: "ta", doneAt: ago(2), doneBy: ownerId },
      { key: "topjobs", what: "Close the TopJobs advert", whose: "ops", doneAt: ago(2), doneBy: ownerId },
      { key: "opening", what: "Close the opening in the TA System", whose: "ops", doneAt: ago(2), doneBy: ownerId },
      { key: "lead", what: "Close the lead, if nothing else is open for this client", whose: "ops", doneAt: ago(2), doneBy: ownerId },
      { key: "group", what: "Tell the client's WhatsApp group it is closed", whose: "ops", doneAt: ago(2), doneBy: ownerId },
    ],
    completedAt: ago(2),
    ownerId,
    createdAt: ago(3),
    updatedAt: ago(2),
  });

  return rows;
}
