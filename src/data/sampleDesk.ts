import type {
  OpsCallLog,
  OpsClient,
  OpsClientSet,
  OpsEsa,
  OpsHold,
  OpsInbound,
  OpsInterview,
  OpsLead,
  OpsMeeting,
  OpsMessage,
  OpsPosition,
  OpsReferenceRequest,
  OpsReport,
  OpsRequirement,
  OpsTalentPulseIssue,
  OpsTask,
  ReportRowRecord,
} from "@/data/types";
import { DAY, HOUR, addWorkingDays, nextNineAm } from "@/lib/calendar";
import { nameKey } from "@/lib/leads";
import { reportWeekOf } from "@/lib/reports";

/**
 * The staged desk (19 Nov): the rest of what the screens draw, so that every state has at least one example.
 *
 * The Openings sample (five clients, six openings) and the Placements sample (money) sit beside this one;
 * this adds leads at every step, meetings, agreements in every state, clients at every stage, positions at
 * every stage, sets with every kind of candidate, interviews and references in every state, holds, and the
 * inbox (mail, WhatsApp, drafts, tasks, calls, Talent Pulse, the weekly report). Each example carries its
 * state in its name - "Sample Ceylon Tea (chasing 2)" - so a reviewer can find it. Every id starts `smp_`
 * (TA ids `ta_smp_`), every address is @example.test, every phone 077 000 ...; no real person is in here.
 *
 * Dates are all relative to `now`, in Colombo working days where the rule is a working day. Pure: the same
 * `now`, owner and holidays give the same rows. The loader (`loadOpeningsSample`) starts the matching clocks
 * with the real starters, so due dates come from the real rules.
 */

const P = "smp_";
const OWNER_LEAD = "m_lead";
const ACCOUNTS = "m_accounts";
const DIRECTOR = "m_dirops";

/* ── the invented people ─────────────────────────────────────────── */

const FIRST = ["Kavinda", "Sithara", "Dhanushka", "Nilushi", "Roshan", "Menaka", "Tharaka", "Ayesha", "Buddhika", "Chamari", "Eranga", "Gimhani", "Hiran", "Imesha", "Janith", "Kaushalya", "Lasith", "Madhavi", "Nadun", "Oshini", "Pasindu", "Rukshi", "Supun", "Tilini", "Udara", "Vihanga", "Wasana", "Yashodha", "Zahira", "Amaya", "Binuka", "Charuni", "Dineth", "Esala", "Fazil", "Githmi", "Hasitha", "Ishan", "Jeewan", "Kumudu"];
const LAST = ["Abeywardena", "Balasuriya", "Cooray", "Dassanayake", "Edirisinghe", "Gamlath", "Hettiarachchi", "Illangakoon", "Jayasundara", "Kodikara", "Lokuge", "Munasinghe", "Nanayakkara", "Obeysekera", "Pathirana", "Rajakaruna", "Seneviratne", "Tennakoon", "Udugama", "Vithanage"];
const personName = (i: number) => FIRST[i % FIRST.length] + " " + LAST[(i * 7 + 3 + Math.floor(i / 40)) % LAST.length];

/* ── the companies ───────────────────────────────────────────────── */

type ClientStage = "lead" | "onboarding" | "active" | "dormant" | "closed";

interface Co {
  k: string;
  company: string;
  industry: string;
  city: string;
  hr: string;
  /** Leave the contact's phone blank (a client with no phone). */
  noPhone?: boolean;
}

const co = (k: string, company: string, industry: string, city: string, hr: string, noPhone = false): Co => ({ k, company, industry, city, hr, noPhone });

/** Leads that are not clients yet, one per step of the road (and the ways it ends). */
type MeetingSpec = { kind: "intro" | "requirement"; state: "booked" | "held" | "not_held"; rebook?: number };
type EsaSpec = {
  state: "draft" | "sent" | "chasing" | "negotiating" | "signed" | "declined" | "expired" | "countersigned";
  sentAgo?: number;
  chase?: number;
  signedAgo?: number;
  reason?: string;
};

interface LeadSpec extends Co {
  state: string;
  ago: number;
  reason?: string;
  meeting?: MeetingSpec;
  esa?: EsaSpec;
  client?: { stage: ClientStage; billing?: boolean; reason?: string };
  flagged?: boolean;
  /** The same name as a company we already have: the "possible duplicate" case. */
  duplicateOf?: string;
}

const LEADS: LeadSpec[] = [
  { ...co("spices", "Sample Lanka Spices (new)", "Food", "Matale", "Dilshan Perera"), state: "new", ago: 1 },
  { ...co("dupe", "MERIDIAN FOODS", "Food manufacturing", "Colombo", "Shanika Perera"), state: "new", ago: 0, duplicateOf: "Meridian Foods" },
  { ...co("marine", "Sample Galle Marine (intro booked)", "Marine services", "Galle", "Ruvini Silva"), state: "intro_call", ago: 3, meeting: { kind: "intro", state: "booked" } },
  { ...co("kandytea", "Sample Kandy Tea (intro held)", "Plantations", "Kandy", "Thushara Bandara"), state: "intro_call", ago: 6, meeting: { kind: "intro", state: "held" }, client: { stage: "lead" } },
  { ...co("cement", "Sample Jaffna Cement (intro not held)", "Construction materials", "Jaffna", "Sivakumar Rajan", true), state: "intro_call", ago: 8, meeting: { kind: "intro", state: "not_held", rebook: 1 } },
  { ...co("agdraft", "Sample Lotus Packaging (agreement draft)", "Packaging", "Ja-Ela", "Madushani Perera"), state: "waiting_agreement", ago: 5, esa: { state: "draft" } },
  { ...co("agsent", "Sample Dambulla Veg (agreement sent)", "Agriculture", "Dambulla", "Pradeep Wijesinghe"), state: "waiting_agreement", ago: 6, esa: { state: "sent", sentAgo: 1 } },
  { ...co("chase1", "Sample Hikkaduwa Dive (chasing 1)", "Tourism", "Hikkaduwa", "Nayomi Fernando"), state: "waiting_agreement", ago: 9, esa: { state: "chasing", sentAgo: 4, chase: 1 } },
  { ...co("chase2", "Sample Ceylon Tea (chasing 2)", "Plantations", "Nuwara Eliya", "Kasun Wickremasinghe"), state: "waiting_agreement", ago: 11, esa: { state: "chasing", sentAgo: 7, chase: 2 }, client: { stage: "lead" } },
  { ...co("chase3", "Sample Anuradhapura Rice (chasing 3)", "Food", "Anuradhapura", "Lalith Jayasuriya"), state: "waiting_agreement", ago: 14, esa: { state: "chasing", sentAgo: 10, chase: 3 } },
  { ...co("negot", "Sample Seeduwa Plastics (changes wanted)", "Manufacturing", "Seeduwa", "Ishani Gunaratne"), state: "waiting_agreement", ago: 12, esa: { state: "negotiating", sentAgo: 5, reason: "They want the guarantee at 60 days and payment in 45." } },
  { ...co("signed", "Sample Kalutara Coir (signed)", "Manufacturing", "Kalutara", "Rohan Dias"), state: "waiting_agreement", ago: 13, esa: { state: "signed", sentAgo: 6, signedAgo: 1 } },
  { ...co("declined", "Sample Trinco Fisheries (agreement declined)", "Fisheries", "Trincomalee", "Anwar Hameed"), state: "closed_other", ago: 15, reason: "Declined the agreement: they will use their own recruiters.", esa: { state: "declined", sentAgo: 9, reason: "They will use their own recruiters." } },
  { ...co("expired", "Sample Kurunegala Rubber (agreement expired)", "Rubber", "Kurunegala", "Samanthi Herath"), state: "waiting_agreement", ago: 22, esa: { state: "expired", sentAgo: 16 } },
  { ...co("replied", "Sample Piliyandala Paints (client replied)", "Manufacturing", "Piliyandala", "Chathurika Mendis"), state: "waiting_agreement", ago: 5, esa: { state: "sent", sentAgo: 3 }, client: { stage: "lead" } },
  { ...co("reqbook", "Sample Negombo Seafoods (requirement booked)", "Food", "Negombo", "Ajith Fernando"), state: "requirement", ago: 14, esa: { state: "countersigned", sentAgo: 10, signedAgo: 6 }, meeting: { kind: "requirement", state: "booked" }, client: { stage: "onboarding", billing: false } },
  { ...co("reqheld", "Sample Matara Rubber (requirement held)", "Rubber", "Matara", "Gayathri Jayawardena"), state: "requirement", ago: 16, esa: { state: "countersigned", sentAgo: 12, signedAgo: 8 }, meeting: { kind: "requirement", state: "held" }, client: { stage: "onboarding" } },
  { ...co("reqnot", "Sample Hambantota Salt (requirement not held)", "Manufacturing", "Hambantota", "Mohamed Rizwan"), state: "requirement", ago: 18, esa: { state: "countersigned", sentAgo: 14, signedAgo: 10 }, meeting: { kind: "requirement", state: "not_held", rebook: 2 }, client: { stage: "onboarding" } },
  { ...co("retail", "Sample Pettah Retail", "Retail", "Colombo 11", "Niluka Samarasinghe"), state: "handed_over", ago: 60, esa: { state: "countersigned", sentAgo: 56, signedAgo: 52 }, client: { stage: "active" } },
  { ...co("packaging", "Sample Colombo Packaging", "Packaging", "Ratmalana", "Dhammika Alwis", true), state: "handed_over", ago: 60, esa: { state: "countersigned", sentAgo: 55, signedAgo: 51 }, client: { stage: "active" } },
  { ...co("dormant", "Sample Dormant Hardware (dormant)", "Hardware", "Panadura", "Wimal Jayasekara"), state: "handed_over", ago: 200, esa: { state: "countersigned", sentAgo: 195, signedAgo: 190 }, client: { stage: "dormant", reason: "No opening for 120 days; they said they will call when hiring restarts." } },
  { ...co("closedc", "Sample Closed Printers (closed)", "Printing", "Maharagama", "Prasanna Cooray"), state: "closed_other", ago: 300, reason: "The company wound up.", esa: { state: "countersigned", sentAgo: 295, signedAgo: 290 }, client: { stage: "closed", reason: "The company wound up." } },
  { ...co("bank", "Sample Rathnapura Finance (declined industry)", "Finance", "Rathnapura", "Upul Senanayake"), state: "declined_industry", ago: 10, reason: "Banking and finance are not taken on.", flagged: true },
  { ...co("silent", "Sample Badulla Dairy (closed silent)", "Food", "Badulla", "Kumari Rathnayake"), state: "closed_silent", ago: 30, reason: "Three attempts to rebook the intro call, no reply." },
  { ...co("other", "Sample Ampara Rice (closed other)", "Food", "Ampara", "Faizal Ismail"), state: "closed_other", ago: 25, reason: "They hired through a relative." },
];

/* ── positions, their sets and candidates ────────────────────────── */

interface SetSpec {
  n: number;
  state: "ready" | "reviewing" | "sent" | "withdrawn";
  recv?: number;
  /** Start the receipt clocks on loading (a set that is two weeks old would hold itself on the first page load). */
  clocks?: boolean;
  /** TA's stage for each candidate. */
  st: string[];
  claims?: Record<number, "dropped" | "refused">;
  reason?: string;
}

interface PosSpec {
  k: string;
  n: number;
  cl: string;
  title: string;
  salary: string;
  stage: string;
  depth?: "hold_at_five" | "add_on" | "follow_up";
  jd: boolean;
  sets: SetSpec[];
  hold?: "proposed" | "on_hold" | "lifted";
}

const screened = (n: number) => Array<string>(n).fill("screened");
const POS: PosSpec[] = [
  { k: "s0", n: 101, cl: "retail", title: "Store Manager (no sets yet)", salary: "LKR 190,000 – 230,000 a month", stage: "searching", jd: true, sets: [] },
  {
    k: "s3", n: 102, cl: "retail", title: "Regional Sales Manager (three sets)", salary: "LKR 320,000 a month", stage: "searching", jd: true,
    sets: [
      { n: 1, state: "sent", recv: 20, st: ["client_shortlist", "client_shortlist", "rejected_by_client", "sent_to_client", "sent_to_client"], claims: { 4: "dropped" } },
      { n: 2, state: "withdrawn", st: screened(5), reason: "Pulled back: the brief changed to a Galle base." },
      { n: 3, state: "reviewing", st: screened(5) },
    ],
  },
  {
    k: "addon", n: 103, cl: "retail", title: "Visual Merchandiser (searching again)", salary: "LKR 150,000 a month", stage: "searching", depth: "add_on", jd: true,
    sets: [{ n: 1, state: "sent", recv: 6, clocks: true, st: ["client_shortlist", "client_shortlist", "rejected_by_client", "rejected_by_client", "sent_to_client"] }],
  },
  {
    k: "follow", n: 104, cl: "packaging", title: "Quality Controller (follow up)", salary: "LKR 210,000 a month", stage: "searching", depth: "follow_up", jd: true,
    sets: [{ n: 1, state: "sent", recv: 3, clocks: true, st: ["client_shortlist", "client_shortlist", "client_shortlist", "client_shortlist", "sent_to_client"] }],
  },
  {
    k: "proposed", n: 105, cl: "packaging", title: "Dispatch Coordinator (hold proposed)", salary: "LKR 140,000 a month", stage: "searching", jd: true, hold: "proposed",
    sets: [{ n: 1, state: "sent", recv: 15, st: Array<string>(5).fill("sent_to_client") }],
  },
  {
    k: "onhold", n: 106, cl: "packaging", title: "Warehouse Supervisor (on hold)", salary: "LKR 165,000 a month", stage: "on_hold", jd: true, hold: "on_hold",
    sets: [{ n: 1, state: "sent", recv: 27, st: Array<string>(5).fill("sent_to_client") }],
  },
  {
    k: "lifted", n: 107, cl: "retail", title: "Cashier Lead (hold lifted)", salary: "LKR 120,000 a month", stage: "searching", jd: true, hold: "lifted",
    sets: [{ n: 1, state: "sent", recv: 30, st: ["client_shortlist", "sent_to_client", "sent_to_client", "sent_to_client", "sent_to_client"] }],
  },
  {
    k: "ivp", n: 108, cl: "packaging", title: "Plant Supervisor (every interview state)", salary: "LKR 260,000 a month", stage: "searching", depth: "hold_at_five", jd: true,
    sets: [{ n: 1, state: "sent", recv: 12, clocks: true, st: [...Array<string>(7).fill("interview"), "rejected", ...Array<string>(3).fill("interview")] }],
  },
];

/* Interview candidates are the Plant Supervisor set's: index -> what happened. */
const IV: { idx: number; state: string; round: number; offset?: number; decision?: string; reason?: string; scheduler?: string }[] = [
  { idx: 0, state: "slots", round: 1, scheduler: "client" },
  { idx: 1, state: "agreed", round: 1, offset: 4 },
  { idx: 2, state: "booked", round: 1, offset: 2 },
  { idx: 3, state: "reconfirmed", round: 2, offset: 1 },
  { idx: 4, state: "attended", round: 3, offset: -2 },
  { idx: 5, state: "attended", round: 2, offset: -4, decision: "next" },
  { idx: 6, state: "no_show", round: 1, offset: -3, reason: "Did not turn up and did not answer the phone." },
  { idx: 7, state: "cancelled", round: 1, offset: -1, reason: "The candidate withdrew: accepted another offer." },
];
const REFS: { idx: number; state: string }[] = [
  { idx: 4, state: "requested" },
  { idx: 5, state: "reported" },
  { idx: 8, state: "relayed" },
  { idx: 9, state: "cleared" },
  { idx: 10, state: "dropped" },
];

/* ── What the stand-in TA answers for the staged positions ───────── */

let appN = 200;
const PEOPLE: Record<string, { id: string; name: string; stage: string }[][]> = {};
for (const p of POS) {
  PEOPLE[p.k] = p.sets.map((s) => s.st.map((stage) => ({ id: "ta_smp_a" + ++appN, name: personName(appN), stage })));
}

const CLIENT_KEYS = ["retail", "packaging"] as const;
const coOf = (k: string) => LEADS.find((l) => l.k === k)!;

export const SAMPLE_TA_DESK = {
  clients: CLIENT_KEYS.map((k) => ({
    id: "ta_smp_c_" + k,
    name: coOf(k).company,
    nameKey: nameKey(coOf(k).company),
    industry: coOf(k).industry,
    esaSignedAt: Date.UTC(2026, 9, 10),
    status: "active",
    opsOwnerId: null,
    contacts: [{ name: coOf(k).hr, email: k + "@" + k + ".example.test", role: "hr", phone: "+94 77 000 " + (coOf(k).noPhone ? "" : "3300") }],
  })),
  openings: POS.map((p) => ({
    id: "ta_smp_j" + p.n,
    title: p.title,
    clientId: "ta_smp_c_" + p.cl,
    status: p.stage === "on_hold" ? "on_hold" : "open",
    primaryRecruiterId: "ta_u2",
    taLeadId: "ta_u1",
    headcount: 1,
    assignedAt: Date.UTC(2026, 9, 25),
  })),
  sets: POS.flatMap((p) =>
    p.sets.map((s, i) => ({
      id: "ta_smp_round" + p.n + "_" + s.n,
      setNumber: s.n,
      openingId: "ta_smp_j" + p.n,
      applicationIds: PEOPLE[p.k][i].map((c) => c.id),
      applications: PEOPLE[p.k][i].map((c) => ({ id: c.id, name: c.name, preparedCv: true })),
      dispatch: s.state === "sent" ? "sent" : "ready",
      status: s.state,
      sentAt: null,
      receivedAt: null,
    })),
  ),
  pipelines: Object.fromEntries(
    POS.map((p) => [
      "ta_smp_j" + p.n,
      p.sets.flatMap((s, i) => PEOPLE[p.k][i].map((c) => ({ id: c.id, candidateName: c.name, currentStage: c.stage, setNumber: s.n, backupForApplicationId: null }))),
    ]),
  ) as Record<string, { id: string; candidateName: string; currentStage: string; setNumber: number | null; backupForApplicationId: null }[]>,
  cvs: Object.fromEntries(Object.values(PEOPLE).flat(2).map((c) => [c.id, { name: c.name, preparedCv: true }])) as Record<string, { name: string; preparedCv: boolean }>,
};

/* ── What Ops holds ──────────────────────────────────────────────── */

export interface DeskRows {
  leads: OpsLead[];
  meetings: OpsMeeting[];
  agreements: OpsEsa[];
  clients: OpsClient[];
  requirements: OpsRequirement[];
  positions: OpsPosition[];
  clientSets: OpsClientSet[];
  holds: OpsHold[];
  interviews: OpsInterview[];
  references: OpsReferenceRequest[];
  tasks: OpsTask[];
  messages: OpsMessage[];
  inbound: OpsInbound[];
  calls: OpsCallLog[];
  talentPulse: OpsTalentPulseIssue[];
  reports: OpsReport[];
  /** The staged sent sets whose receipt clocks should run (the others are old on purpose). */
  clockSetIds: string[];
}

/** The staged rows, owned by `ownerId`, dated around `now`. `holidays` are the Colombo holidays as `YYYY-MM-DD`. */
export function sampleDesk(now: number, ownerId: string, holidays: string[] = []): DeskRows {
  const ago = (d: number) => now - d * DAY;
  /** A working-day time in the future, 2pm Colombo (a meeting or an interview). */
  const ahead = (workingDays: number) => nextNineAm(addWorkingDays(now, workingDays, holidays)) + 5 * HOUR;
  const behind = (workingDays: number) => addWorkingDays(now, -workingDays, holidays);
  const rows: DeskRows = {
    leads: [], meetings: [], agreements: [], clients: [], requirements: [], positions: [], clientSets: [], holds: [],
    interviews: [], references: [], tasks: [], messages: [], inbound: [], calls: [], talentPulse: [], reports: [], clockSetIds: [],
  };
  const phone = (c: Co, i: number) => (c.noPhone ? "" : "077 000 " + String(5000 + i * 7));
  const emailOf = (c: Co) => c.hr.toLowerCase().replace(/[^a-z]+/g, ".") + "@" + c.k + ".example.test";

  /* leads, meetings, agreements, clients */
  LEADS.forEach((s, i) => {
    const leadId = P + "ld_" + s.k;
    const taClientId = s.client?.stage === "active" ? "ta_smp_c_" + s.k : null;
    rows.leads.push({
      id: leadId, company: s.company, nameKey: nameKey(s.company), contactName: s.hr, contactEmail: emailOf(s), contactPhone: phone(s, i),
      source: s.k === "dupe" ? "website" : ["referral", "director", "linkedin", "walk_in", "other", "website"][i % 6], industry: s.industry,
      website: s.k + ".example.test",
      notes: s.duplicateOf ? "Staged duplicate-name case: the same name as " + s.duplicateOf + ", which is already a client." : "Staged example: " + s.company + ".",
      industryFlagged: Boolean(s.flagged), industryBecause: s.flagged ? "Banking and finance" : null, industryConfirmedBy: s.flagged ? ownerId : null,
      state: s.state, reason: s.reason ?? null, doNotInvite: s.state === "declined_industry", clientTaId: taClientId,
      ownerId, createdBy: ownerId, createdAt: ago(s.ago), updatedAt: ago(Math.max(0, s.ago - 1)),
    });

    if (s.meeting) {
      const m = s.meeting;
      const at = m.state === "booked" ? ahead(m.kind === "intro" ? 2 : 3) : behind(m.state === "held" ? 2 : 3);
      rows.meetings.push({
        id: P + "mt_" + s.k, leadId, kind: m.kind, at, state: m.state, taLeadId: "ta_u1", rebookCount: m.rebook ?? 0,
        brief: m.state === "held" ? "They need eight people over the next quarter; the first is a plant manager." : "",
        role: m.state === "held" ? "Plant Manager" : "", packageSaid: m.state === "held" ? "LKR 350,000 a month" : "",
        reason: m.state === "not_held" ? "The client did not join and did not answer the phone." : null,
        bookedBy: ownerId, heldAt: m.state === "held" ? at : null, lengthMin: 30, organiserId: ownerId,
        attendees: [{ name: s.hr, email: emailOf(s) }], joinUrl: null, graphEventId: null,
        teamsProblem: "Teams is not connected on this laptop.", createdAt: ago(s.ago), updatedAt: ago(1),
      });
    }

    if (s.esa) {
      const e = s.esa;
      const sentAt = e.sentAgo !== undefined ? ago(e.sentAgo) : null;
      const signedAt = e.signedAgo !== undefined ? ago(e.signedAgo) : null;
      rows.agreements.push({
        id: P + "esa_" + s.k, leadId, clientTaId: taClientId, state: e.state, version: e.state === "negotiating" ? 2 : 1,
        fields: {
          companyName: s.company, signatoryName: s.hr, signatoryEmail: emailOf(s), signatoryPhone: phone(s, i),
          feeMonths: "1", feeBasis: "gross", guaranteeDays: "90", paymentDays: "30", replacementWorkingDays: "60", refundPct: "25",
        },
        draftFileId: null, sentAt, sentMessageId: null, chaseStep: e.chase ?? 0,
        // Two weeks from sending, in calendar days (the rule in src/lib/esa.ts); an expired one has run out.
        expiresAt: sentAt && ["sent", "chasing", "negotiating", "expired"].includes(e.state) ? sentAt + 14 * DAY : null,
        signedAt, signedFileId: null,
        countersignedAt: e.state === "countersigned" && signedAt ? signedAt + DAY : null, countersignedFileId: null,
        reason: e.reason ?? null, ownerId, createdAt: ago(s.ago - 1), updatedAt: ago(Math.min(e.sentAgo ?? 1, 2)),
      });
    }

    if (s.client) {
      const c = s.client;
      const bill = c.billing !== false && c.stage !== "lead";
      rows.clients.push({
        id: P + "cl_" + s.k, leadId, taClientId, name: s.company, nameKey: nameKey(s.company), stage: c.stage,
        billingName: bill ? s.company + " (Pvt) Ltd" : "", billingEmail: bill ? "accounts@" + s.k + ".example.test" : "",
        billingAddress: bill ? "No. 4, Temple Road, " + s.city : "", groupName: bill ? s.company + " · Career 141" : "",
        contacts: [{ name: s.hr, email: emailOf(s), phone: phone(s, i), role: "hr" }],
        notes: c.billing === false ? "Billing details held: the client's accounts team has not given them yet." : "",
        reason: c.reason ?? null, ownerId, createdAt: ago(s.ago - 2), updatedAt: ago(2),
      });
    }
  });

  /* requirements for the three requirement-stage leads (the brief, before there is an opening) */
  for (const k of ["reqbook", "reqheld", "reqnot"]) {
    const s = coOf(k);
    const held = k === "reqheld";
    rows.requirements.push({
      id: P + "req_" + k, leadId: P + "ld_" + k, clientId: P + "cl_" + k, clientTaId: "",
      meetingId: held ? P + "mt_" + k : null, version: 1,
      fields: held ? { title: "Plant Manager", level: "Manager · 10+ years", salary: "LKR 350,000 a month", locations: s.city, headcount: "1", jdNotes: "Runs the rubber sheet plant; 40 people.", reportsTo: "" } : {},
      practical: true, reason: null, inviteBackAt: null, openedAt: null, ownerId, createdAt: ago(3), updatedAt: ago(1),
    });
  }

  /* positions, requirements, sets, holds */
  const holdIds: Record<string, string> = {};
  for (const p of POS) {
    const positionId = P + "pos_" + p.k;
    const requirementId = P + "req_" + p.k;
    const clientId = P + "cl_" + p.cl;
    const taClientId = "ta_smp_c_" + p.cl;
    const c = coOf(p.cl);
    const opened = ago(34);
    const all = PEOPLE[p.k].flat();
    const shortlisted = all.filter((x) => ["client_shortlist", "interview", "offer"].includes(x.stage)).length;
    const pending = all.filter((x) => x.stage === "client_shortlist").length;
    rows.requirements.push({
      id: requirementId, leadId: P + "ld_" + p.cl, clientId, clientTaId: taClientId, meetingId: null, version: 1,
      fields: { title: p.title, level: "Executive", salary: p.salary, locations: c.city, headcount: "1", jdNotes: "Staged position: " + p.title + ".", reportsTo: "" },
      practical: true, reason: null, inviteBackAt: null, openedAt: opened, ownerId, createdAt: opened - DAY, updatedAt: opened,
    });
    rows.positions.push({
      id: positionId, requirementId, clientId, clientTaId: taClientId, openingTaId: "ta_smp_j" + p.n, title: p.title, stage: p.stage,
      primaryTaId: "ta_u2", hundredPercentDay: "Wednesday", taStatus: p.stage === "on_hold" ? "On hold" : "Searching",
      jdApprovedAt: p.jd ? opened + DAY : null, linkedInUrl: "https://www.linkedin.com/jobs/view/" + (4300000000 + p.n), linkedInPostedAt: opened + 2 * DAY,
      depthStage: p.depth ?? null, shortlistedTotal: shortlisted || null, pendingCount: pending || null, depthCheckedAt: shortlisted ? ago(1) : null,
      handedOverAt: opened, closedAt: null, ownerId, createdAt: opened, updatedAt: ago(1),
    });

    p.sets.forEach((s, si) => {
      const received = s.recv !== undefined ? ago(s.recv) : null;
      const setId = P + "set_" + p.n + "_" + s.n;
      const people = PEOPLE[p.k][si];
      const decided = (stage: string) => (["client_shortlist", "interview", "offer"].includes(stage) ? "shortlisted" : stage.startsWith("rejected") ? "rejected" : null);
      rows.clientSets.push({
        id: setId, taRoundId: "ta_smp_round" + p.n + "_" + s.n, openingTaId: "ta_smp_j" + p.n, setNumber: s.n, clientId, clientTaId: taClientId,
        name: c.company.toUpperCase() + " > " + p.title.toUpperCase() + " > SET " + s.n, role: p.title, state: s.state,
        candidates: people.map((x, i) => {
          const claim = s.claims?.[i];
          return {
            applicationTaId: x.id, name: x.name, fileId: null, problem: null,
            claimedAt: claim && received ? received + 2 * DAY : null,
            claimVerdict: claim ?? null,
            claimReason: claim ? "The client says they already had this CV from another agency." : null,
            decision: s.state === "sent" && !claim ? decided(x.stage) : null,
            decisionReason: s.state === "sent" && decided(x.stage) === "rejected" ? "Not enough sector experience." : null,
            decidedAt: s.state === "sent" && !claim && decided(x.stage) ? ago(1) : null,
          };
        }),
        dueAt: s.state === "reviewing" ? now + 3 * DAY : null, sentAt: received, sentMessageId: null, sentTo: received ? [emailOf(c)] : [],
        receivedAt: received, reason: s.reason ?? null, ownerId, createdAt: received ?? ago(2), updatedAt: received ?? ago(1),
      });
      if (s.state === "sent" && s.clocks) rows.clockSetIds.push(setId);
    });

    if (p.hold) {
      const setId = P + "set_" + p.n + "_1";
      const id = P + "hold_" + p.k;
      holdIds[p.k] = id;
      const recv = p.sets[0].recv ?? 15;
      rows.holds.push({
        id, openingTaId: "ta_smp_j" + p.n, setId, clientId, state: p.hold === "lifted" ? "lifted" : p.hold,
        reason: "No word from the client for " + Math.min(recv, 14) + " days after the set.",
        liftedReason: p.hold === "lifted" ? "The client answered and wants the search to go on." : null,
        noticeMessageId: p.hold === "on_hold" ? P + "msg_holdnotice" : null,
        proposedAt: ago(recv - 14 > 0 ? recv - 14 : 1), heldAt: p.hold === "proposed" ? null : ago(Math.max(2, recv - 14)),
        liftedAt: p.hold === "lifted" ? ago(2) : null, reviewAt: p.hold === "on_hold" ? now + 20 * DAY : null,
        ownerId, createdAt: ago(recv - 14 > 0 ? recv - 14 : 1), updatedAt: ago(1),
      });
    }
  }

  /* interviews and references on the Plant Supervisor */
  const ivp = POS.find((p) => p.k === "ivp")!;
  const ivPeople = PEOPLE.ivp[0];
  const packaging = coOf("packaging");
  for (const v of IV) {
    const who = ivPeople[v.idx];
    const at = v.state === "slots" ? null : v.offset! >= 0 ? ahead(v.offset!) : behind(-v.offset!);
    rows.interviews.push({
      id: P + "iv_" + ivp.n + "_" + v.idx, applicationTaId: who.id, openingTaId: "ta_smp_j" + ivp.n, positionId: P + "pos_ivp", clientId: P + "cl_packaging",
      candidateName: who.name, scheduler: v.scheduler ?? "us", state: v.state, round: v.round,
      slots: v.state === "slots" ? [ahead(3), ahead(4), ahead(5)] : at ? [at] : [], slotLoops: v.state === "slots" ? 1 : 0, at,
      format: v.idx % 2 ? "Teams" : "in person", interviewers: [emailOf(packaging)],
      whereOrLink: v.idx % 2 ? "Link in the invite" : "Colombo Packaging, Ratmalana",
      interviewTaId: null, inviteMessageId: null, attendedAt: v.state === "attended" ? at : null,
      decision: v.decision ?? null, decisionReason: v.decision ? "They want a second look at the shift planning." : null, decidedAt: v.decision ? ago(1) : null,
      candidateFeedback: v.state === "attended" ? "Liked the plant; asked about shift allowances." : null,
      reason: v.reason ?? null, ownerId, createdAt: ago(8), updatedAt: ago(1),
    });
  }
  for (const r of REFS) {
    const who = ivPeople[r.idx];
    const reported = ["reported", "relayed", "cleared", "dropped"].includes(r.state);
    rows.references.push({
      id: P + "ref_" + r.state, applicationTaId: who.id, openingTaId: "ta_smp_j" + ivp.n, candidateName: who.name, state: r.state,
      report: reported ? "Spoke to the last manager: reliable, on time, left on good terms." : null,
      requestedAt: ago(5), reportedAt: reported ? ago(3) : null, relayMessageId: ["relayed", "cleared", "dropped"].includes(r.state) ? P + "msg_sent" : null,
      decision: r.state === "cleared" ? "cleared" : r.state === "dropped" ? "dropped" : null,
      reason: r.state === "dropped" ? "The reference raised a doubt about timekeeping; the client dropped the candidate." : null,
      ownerId, createdAt: ago(5), updatedAt: ago(1),
    });
  }

  /* the inbox: mail and WhatsApp, in and out */
  const mailbox = "owner@example.test";
  const mail = (id: string, from: string, name: string, days: number, subject: string, body: string, o: Partial<OpsInbound> = {}): OpsInbound => ({
    id: P + "in_" + id, channel: "email", mailbox, from, fromName: name, receivedAt: ago(days), subject, body, providerId: "smp-in-" + id, inReplyTo: null,
    matchedBy: "none", subjectType: null, subjectId: null, clientId: null, readState: "new", note: "", ...o,
  });
  rows.inbound.push(
    // The client who replied after the agreement went: the chase stops.
    mail("replied", emailOf(coOf("replied")), coOf("replied").hr, 1, "Re: Our agreement with Career 141", "Thank you. We are reading it with our lawyer and will sign by Friday.", {
      matchedBy: "domain", subjectType: "esa", subjectId: P + "esa_replied", clientId: P + "cl_replied",
    }),
    mail("waiting1", "someone@unknown-company.example.test", "Naveen Karunathilake", 0, "Looking for two accountants", "We found you through a friend. Can you help us hire two accountants for our Kandy office?"),
    mail("waiting2", emailOf(coOf("retail")), coOf("retail").hr, 0, "Interview times for the Cashier Lead", "We can do Thursday or Friday afternoon. Please tell the candidates.", { matchedBy: "domain", clientId: P + "cl_retail" }),
    mail("waiting3", emailOf(coOf("packaging")), coOf("packaging").hr, 1, "Re: Plant Supervisor shortlist", "We liked four of the five. Can the TA send two more with shift-pattern experience?", {
      matchedBy: "thread", subjectType: "clientSet", subjectId: P + "set_108_1", clientId: P + "cl_packaging",
    }),
    mail("filed1", emailOf(coOf("retail")), coOf("retail").hr, 3, "Regional Sales Manager: feedback", "Two of the five are strong. We will interview them next week.", {
      matchedBy: "manual", subjectType: "clientSet", subjectId: P + "set_102_1", clientId: P + "cl_retail", readState: "filed", note: "Filed to the Regional Sales Manager set.",
    }),
    mail("filed2", emailOf(coOf("packaging")), coOf("packaging").hr, 5, "Payment advice", "Our accounts will pay the invoice on Friday.", { matchedBy: "domain", clientId: P + "cl_packaging", readState: "filed" }),
    mail("done1", emailOf(coOf("chase3")), coOf("chase3").hr, 4, "Agreement: one question", "Is the guarantee 90 calendar days? (Answered by phone.)", { matchedBy: "domain", subjectType: "esa", subjectId: P + "esa_chase3", readState: "actioned", note: "Answered by phone on the same day." }),
    {
      ...mail("wa1", "", "", 0, "", "Yes we got the CVs. Will tell you tomorrow which ones we like.", { channel: "whatsapp", mailbox: "whatsapp", from: "077 000 3300", fromName: coOf("retail").hr, matchedBy: "domain", clientId: P + "cl_retail" }),
    },
    { ...mail("wa2", "", "", 1, "", "Hello, is the Plant Supervisor interview still on for Thursday?", { channel: "whatsapp", mailbox: "whatsapp", from: "077 000 3301", fromName: packaging.hr }) },
  );

  /* what goes out: drafts, approved, queued, sent, failed, blocked */
  const msg = (id: string, state: OpsMessage["state"], channel: OpsMessage["channel"], to: string[], subject: string, body: string, subj: [string, string] | null, o: Partial<OpsMessage> = {}): OpsMessage => ({
    id: P + "msg_" + id, channel, to, subject, body, templateKey: null, state, subjectType: subj?.[0] ?? null, subjectId: subj?.[1] ?? null,
    approvedBy: ["approved", "queued", "sent", "failed"].includes(state) ? ownerId : null,
    approvedAt: ["approved", "queued", "sent", "failed"].includes(state) ? ago(1) : null, sentAt: state === "sent" ? ago(1) : null,
    providerMessageId: null, note: null, attachmentFileIds: [], createdAt: ago(1), ...o,
  });
  const chase2 = coOf("chase2");
  rows.messages.push(
    msg("draft", "draft", "whatsapp", ["077 000 5056"], "", "Hello Kasun, a quick reminder about our agreement. Anything you would like us to change?", ["esa", P + "esa_chase2"], { templateKey: "esa.chase.wa.1" }),
    msg("draft2", "draft", "email", [emailOf(coOf("agsent"))], "Our agreement", "Dear Pradeep, please find the agreement attached. Read it, sign it and send it back. Thank you.", ["esa", P + "esa_agsent"]),
    msg("approved", "approved", "email", [emailOf(coOf("chase1"))], "A reminder about our agreement", "Dear Nayomi, a gentle reminder about the agreement we sent on Monday.", ["esa", P + "esa_chase1"], { templateKey: "esa.chase.email.1" }),
    msg("queued", "queued", "email", [emailOf(coOf("retail"))], "Candidates for the Regional Sales Manager", "Dear Niluka, five CVs are attached.", ["clientSet", P + "set_102_1"]),
    msg("sent", "sent", "email", [emailOf(coOf("packaging"))], "Reference check: Plant Supervisor candidates", "Dear Dhammika, what the referees told us is below.", ["reference", P + "ref_relayed"]),
    msg("failed", "failed", "email", [emailOf(coOf("expired"))], "Our agreement", "Dear Samanthi, the agreement is attached.", ["esa", P + "esa_expired"], { note: "The mail server refused it: the mailbox is full. Nothing reached them; try another address." }),
    msg("blocked", "blocked", "email", ["someone@real-company.example.test"], "A note about your invoice", "Dear sir, your invoice is overdue.", ["invoice", P + "inv_14"], { note: "Blocked: this address is not on the laptop's list of test recipients, so nothing is sent." }),
    msg("holdnotice", "sent", "email", [emailOf(coOf("packaging"))], "Warehouse Supervisor: on hold", "Dear Dhammika, we have not heard about the shortlist for two weeks, so we are putting the search on hold. Tell us when to start again.", ["hold", P + "hold_onhold"]),
    msg("group", "draft", "group_post", ["Sample Pettah Retail · Career 141"], "", "The Cashier Lead search is back on. Two new CVs are coming on Monday.", ["position", P + "pos_lifted"]),
  );

  /* tasks of every kind and state */
  const task = (id: string, kind: OpsTask["kind"], state: OpsTask["state"], title: string, body: string, who: string, dueDays: number, subj: [string, string] | null, link: string | null, done = false): OpsTask => ({
    id: P + "task_" + id, kind, title, body, assigneeId: who, dueAt: now + dueDays * DAY, state, subjectType: subj?.[0] ?? null, subjectId: subj?.[1] ?? null, link,
    outcome: done ? "Done: the client confirmed by phone." : state === "dismissed" ? "Not needed any more." : null, doneBy: done ? who : null,
    doneAt: done ? ago(1) : null, createdAt: ago(2),
  });
  rows.tasks.push(
    task("approve", "approve", "open", "Approve the WhatsApp chase to Sample Ceylon Tea (chasing 2)", "The second chase is drafted. Read it, then approve it.", ownerId, 0, ["esa", P + "esa_chase2"], "/leads/" + P + "ld_chase2"),
    task("call", "call", "open", "Call Sample Anuradhapura Rice (chasing 3) about the agreement", "Three chases and no signature. A person calls now.", ownerId, -1, ["esa", P + "esa_chase3"], "/leads/" + P + "ld_chase3"),
    task("record", "record", "open", "Record what Sample Matara Rubber said about the role", "The requirement meeting was held; the brief is not in the system yet.", ownerId, 0, ["lead", P + "ld_reqheld"], "/leads/" + P + "ld_reqheld"),
    task("decide", "decide", "open", "Decide the refund for Shehani Liyanage", "The client says she left in the third month. Decide the refund.", DIRECTOR, 1, ["guarantee", P + "g_21"], "/guarantees/" + P + "g_21"),
    task("remind", "remind", "open", "Remind: the Cashier Lead hold was lifted, send the new CVs", "The client wants the search on again.", OWNER_LEAD, 2, ["position", P + "pos_lifted"], "/positions/" + P + "pos_lifted"),
    task("escalation", "escalation", "open", "Nobody has rebooked Sample Jaffna Cement (intro not held)", "The intro call was not held and the client has not answered once.", OWNER_LEAD, -2, ["lead", P + "ld_cement"], "/leads/" + P + "ld_cement"),
    task("check", "check", "open", "Check the part payment on Mahesh Gunasekara's invoice", "Half the fee came in. Check the bank advice and mark it.", ACCOUNTS, 0, ["invoice", P + "inv_15"], "/invoices/" + P + "inv_15"),
    task("check2", "check", "open", "Check whether Sample Kandy Tea (intro held) wants an agreement", "The intro call was held. Decide the next step.", ownerId, 1, ["lead", P + "ld_kandytea"], "/leads/" + P + "ld_kandytea"),
    task("done", "approve", "done", "Approve the agreement for Sample Kalutara Coir (signed)", "Approved and sent.", ownerId, -5, ["esa", P + "esa_signed"], "/leads/" + P + "ld_signed", true),
    task("done2", "record", "done", "Record the Wednesday call with Sample Pettah Retail", "Logged.", ownerId, -3, null, "/clients", true),
    task("dismissed", "remind", "dismissed", "Remind: send flowers to Sample Closed Printers", "Not needed any more.", ownerId, -4, null, null),
    task("snoozed", "call", "snoozed", "Call Sample Hikkaduwa Dive (chasing 1) after the weekend", "They asked for a call on Monday.", ownerId, 3, ["esa", P + "esa_chase1"], "/leads/" + P + "ld_chase1"),
    task("snoozed2", "decide", "snoozed", "Decide whether to write off Janaka Mudalige's invoice", "More than ninety days overdue. Decide after the call.", ACCOUNTS, 4, ["invoice", P + "inv_26"], "/invoices/" + P + "inv_26"),
  );

  /* calls */
  const call = (id: string, to: string, toName: string, purpose: string, spokeTo: string, outcome: string, subj: [string, string], days: number): OpsCallLog => ({
    id: P + "call_" + id, taskId: null, to, toName, purpose, spokeTo, outcome, subjectType: subj[0], subjectId: subj[1], by: ownerId, at: ago(days),
  });
  rows.calls.push(
    call("1", "077 000 5056", chase2.hr, "Ask about the agreement", chase2.hr, "Said they would sign this week.", ["esa", P + "esa_chase2"], 2),
    call("2", "077 000 3300", coOf("retail").hr, "Check in after the set", coOf("retail").hr, "Two candidates liked; interview times to follow.", ["clientSet", P + "set_102_1"], 1),
    call("3", "077 000 5063", coOf("agdraft").hr, "Intro call follow-up", "", "No answer. Left a message.", ["lead", P + "ld_agdraft"], 3),
  );

  /* Talent Pulse and the weekly report */
  const lines = (list: PosSpec[]) =>
    list.map((p) => ({
      positionId: P + "pos_" + p.k, openingTaId: "ta_smp_j" + p.n, title: p.title, client: coOf(p.cl).company,
      note: "Staged line for " + p.title + ".", applyAddress: "jobs+" + p.n + "@career141.example.test",
    }));
  const thisWeek = reportWeekOf(now);
  const lastWeek = reportWeekOf(now - 7 * DAY);
  rows.talentPulse.push(
    { id: P + "tp_posted", weekOf: lastWeek, state: "posted", lines: lines(POS.slice(0, 4)), postedAt: ago(5), postedBy: ownerId, ownerId, createdAt: ago(8), updatedAt: ago(5) },
    { id: P + "tp_ready", weekOf: thisWeek, state: "ready", lines: lines(POS.slice(0, 6)), postedAt: null, postedBy: null, ownerId, createdAt: ago(1), updatedAt: ago(1) },
  );
  const reportRows = (): ReportRowRecord[] =>
    POS.map((p) => {
      const all = PEOPLE[p.k].flat();
      return {
        positionId: P + "pos_" + p.k, openingTaId: "ta_smp_j" + p.n, client: coOf(p.cl).company, title: p.title, primaryTa: "Sample TA", stage: p.stage,
        daysOpen: 34, counts: { screened: all.filter((x) => x.stage === "screened").length, sent_to_client: all.filter((x) => x.stage === "sent_to_client").length },
        shortlisted: all.filter((x) => ["client_shortlist", "interview", "offer"].includes(x.stage)).length, setsSent: p.sets.filter((s) => s.state === "sent").length,
        lastSentAt: p.sets.find((s) => s.recv !== undefined)?.recv !== undefined ? ago(p.sets.find((s) => s.recv !== undefined)!.recv!) : null,
        daysWaitingOnClient: p.sets.find((s) => s.recv !== undefined)?.recv ?? null, decisionsIn: 0, onHold: p.stage === "on_hold", depth: p.depth ?? null, advertised: true,
      };
    });
  rows.reports.push(
    { id: P + "rep_sent", kind: "activePositions", weekOf: lastWeek, state: "sent", rows: reportRows(), note: null, builtAt: ago(8), approvedBy: ownerId, approvedAt: ago(7), messageId: null, sentAt: ago(7), ownerId, createdAt: ago(8), updatedAt: ago(7) },
    { id: P + "rep_review", kind: "activePositions", weekOf: thisWeek, state: "review", rows: reportRows(), note: "Staged: waiting for the TA lead to read it.", builtAt: ago(1), approvedBy: null, approvedAt: null, messageId: null, sentAt: null, ownerId, createdAt: ago(1), updatedAt: ago(1) },
  );
  return rows;
}
