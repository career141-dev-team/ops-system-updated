import { nameKey } from "@/lib/leads";

/**
 * A stand-in TA System (15, Phase 1 step 3).
 *
 * The TA side of the API is a TA pull request that does not exist yet, and the
 * Ops side cannot wait for it: the screens, the outbox and the events reader
 * all have to be built and shown now. So this answers the same shapes from
 * recorded data, with `OPS_TA_FAKE=on`.
 *
 * Everything in here is obviously invented — SAMPLE CLIENT, nobody real — so a
 * screen reading it can never be mistaken for the live desk. The real API
 * replaces this by switching the flag off; nothing above it changes.
 */

const PEOPLE = [
  { id: "ta_u1", fullName: "SAMPLE TA LEAD", email: "ta.lead@example.test", taRole: "ta_lead", isActive: true },
  { id: "ta_u2", fullName: "SAMPLE TA", email: "ta.one@example.test", taRole: "ta", isActive: true },
  { id: "ta_u3", fullName: "SAMPLE TA TWO", email: "ta.two@example.test", taRole: "ta", isActive: false },
];

const CLIENTS = [
  {
    id: "ta_c1",
    name: "SAMPLE CLIENT",
    // Computed, not typed: the key had been written by hand as "sampleclient"
    // while the TA System's own rule gives "sample client", so a lead for a
    // company we already had came back as new. Found in the browser, 2 Nov.
    nameKey: nameKey("SAMPLE CLIENT"),
    industry: "Manufacturing",
    esaSignedAt: Date.UTC(2026, 9, 1),
    status: "active",
    opsOwnerId: null,
    // A set goes to the people whose role is "hr"; the rest are copied.
    contacts: [
      { name: "SAMPLE HR MANAGER", email: "hr@example.test", role: "hr", phone: "+94 11 000 0000" },
      { name: "SAMPLE FINANCE HEAD", email: "finance@example.test", role: "finance", phone: null },
    ],
  },
];

/**
 * One round of CVs, ready to go to the client (15, Phase 4 step 2).
 *
 * Five, because TA will not let a client set go out with fewer; the names are
 * obviously invented, and each one has a prepared CV the stand-in can hand
 * over as bytes.
 */
const CLIENT_SETS = [
  {
    id: "ta_round1",
    setNumber: 1,
    openingId: "ta_j1",
    applicationIds: ["ta_a1", "ta_a2", "ta_a3", "ta_a4", "ta_a5", "ta_a6"],
    applications: [
      { id: "ta_a1", name: "SAMPLE CANDIDATE ONE", preparedCv: true },
      { id: "ta_a2", name: "SAMPLE CANDIDATE TWO", preparedCv: true },
      { id: "ta_a3", name: "SAMPLE CANDIDATE THREE", preparedCv: true },
      { id: "ta_a4", name: "SAMPLE CANDIDATE FOUR", preparedCv: true },
      { id: "ta_a5", name: "SAMPLE CANDIDATE FIVE", preparedCv: true },
      // One without a prepared CV, because that is the usual case on the real
      // desk: the set still has to be able to go out.
      { id: "ta_a6", name: "SAMPLE CANDIDATE SIX", preparedCv: false },
    ],
    dispatch: "ready",
    status: "ready",
    sentAt: null,
    receivedAt: null,
  },
];

const OPENINGS = [
  {
    id: "ta_j1",
    title: "Head of finance",
    clientId: "ta_c1",
    status: "open",
    primaryRecruiterId: "ta_u2",
    taLeadId: "ta_u1",
    headcount: 1,
    assignedAt: Date.UTC(2026, 9, 20),
  },
];

/** Events the reader can be shown working on, oldest first. */
const EVENTS = [
  { id: "ta_ev_1", type: "opening.created", at: Date.UTC(2026, 9, 20, 4), data: { openingId: "ta_j1", clientId: "ta_c1" } },
  { id: "ta_ev_2", type: "client_set.ready", at: Date.UTC(2026, 9, 28, 9), data: { openingId: "ta_j1", setNumber: 1 } },
  { id: "ta_ev_3", type: "placement.created", at: Date.UTC(2026, 10, 1, 6), data: { openingId: "ta_j1", placementId: "ta_p1" } },
  { id: "ta_ev_4", type: "something.we.do.not.know", at: Date.UTC(2026, 10, 1, 7), data: {} },
];

/**
 * The pipeline of the sample opening (15, Phase 4 step 14).
 *
 * Four shortlisted and two of them still waiting to be interviewed, which is
 * the ordinary middle of a search: not held at five, and not thin enough to
 * send the TA back out. The depth rules can be walked from here in both
 * directions by moving one candidate.
 */
const PIPELINE = {
  applications: [
    { id: "ta_a1", candidateName: "SAMPLE CANDIDATE ONE", currentStage: "client_shortlist", setNumber: 1, backupForApplicationId: null },
    { id: "ta_a2", candidateName: "SAMPLE CANDIDATE TWO", currentStage: "client_shortlist", setNumber: 1, backupForApplicationId: null },
    { id: "ta_a3", candidateName: "SAMPLE CANDIDATE THREE", currentStage: "interview", setNumber: 1, backupForApplicationId: null },
    { id: "ta_a4", candidateName: "SAMPLE CANDIDATE FOUR", currentStage: "offer", setNumber: 1, backupForApplicationId: null },
    { id: "ta_a5", candidateName: "SAMPLE CANDIDATE FIVE", currentStage: "rejected_by_client", setNumber: 1, backupForApplicationId: null },
    { id: "ta_a6", candidateName: "SAMPLE CANDIDATE SIX", currentStage: "follow_up", setNumber: null, backupForApplicationId: null },
  ],
  counts: { client_shortlist: 2, interview: 1, offer: 1, rejected_by_client: 1, follow_up: 1 },
};

/**
 * The sample placement (15, Phase 6 step 3).
 *
 * Everything the money depends on is there, because TA refuses Place without
 * the package and the offer letter since 2 November. The joining day is a
 * fortnight out, so the two reminders and the joining-day check all have
 * somewhere to land.
 */
const PLACEMENT = {
  id: "ta_p1",
  applicationId: "ta_a4",
  openingId: "ta_j1",
  clientId: "ta_c1",
  candidateName: "SAMPLE CANDIDATE FOUR",
  placedSalary: 450_000,
  currency: "LKR",
  salaryBasis: "gross",
  package: "LKR 450,000 a month, plus fuel and a phone allowance.",
  offerLetterFileId: "ta_file_offer_1",
  joinDateMs: Date.now() + 14 * 86_400_000,
  joinConfirmedAt: null,
  fellThroughAt: null,
  fellThroughReason: null,
};

export type FakeAnswer<T> = { ok: true; data: T } | { ok: false; reason: string };

/**
 * A file the stand-in hands over: the smallest thing that is really a PDF.
 *
 * It opens in a reader and says which candidate it stands for, so a set sent
 * in the preview can be looked at without anybody mistaking it for a real CV.
 */
export function fakeFile(path: string): FakeAnswer<{ bytes: Uint8Array; mime: string }> {
  const match = /\/applications\/([^/]+)\/prepared-cv$/.exec(path);
  if (!match) return { ok: false, reason: "The stand-in TA System has no file for " + path + "." };
  // Candidates the stand-in panel invents (ta_dev_...) get a CV too, named after
  // the id; an id ending in "_nocv" is the one without a prepared CV.
  const invented = /^ta_dev_/.test(match[1]);
  const who = invented
    ? { id: match[1], name: "SAMPLE CANDIDATE " + match[1].replace(/^ta_dev_/, "").toUpperCase(), preparedCv: !match[1].endsWith("_nocv") }
    : CLIENT_SETS[0].applications.find((a) => a.id === match[1]);
  if (!who) return { ok: false, reason: "The stand-in has no application " + match[1] + "." };
  if (!who.preparedCv) return { ok: false, reason: "No prepared CV for " + who.name + " yet." };
  const text = "SAMPLE CV - " + who.name + " - invented, for testing only";
  // A PDF has to be assembled by hand here: a line break inside it is part of
  // the format, not of this file.
  const body = "BT /F1 14 Tf 60 760 Td (" + text + ") Tj ET";
  const pdf = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj",
    "4 0 obj<</Length " + body.length + ">>stream",
    body,
    "endstream endobj",
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
    "trailer<</Root 1 0 R>>",
    "%%EOF",
    "",
  ].join("\n");
  return { ok: true, data: { bytes: new TextEncoder().encode(pdf), mime: "application/pdf" } };
}

export function fakeAnswer<T>(path: string, method = "GET"): FakeAnswer<T> {
  const [where, query] = path.split("?");
  const give = (data: unknown) => ({ ok: true as const, data: data as T });

  if (where.endsWith("/people")) return give(PEOPLE);
  if (where.endsWith("/clients")) return give(CLIENTS);
  if (/\/openings\/[^/]+$/.test(where)) return give(OPENINGS[0]);
  if (where.endsWith("/openings")) return give(OPENINGS);
  if (/\/client-sets\/\d+$/.test(where)) {
    const n = Number(where.split("/").pop());
    const found = CLIENT_SETS.find((r) => r.setNumber === n);
    return found ? give(found) : { ok: false, reason: "The stand-in has no set " + n + "." };
  }
  if (where.endsWith("/client-sets")) return give(CLIENT_SETS);
  if (/\/placements\/[^/]+$/.test(where)) {
    return where.endsWith("/ta_p1") ? give(PLACEMENT) : { ok: false, reason: "The stand-in has no placement " + where.split("/").pop() + "." };
  }
  if (where.endsWith("/pipeline")) return give(PIPELINE);
  if (where.endsWith("/events")) {
    // As the live route works (checked against it, 9 Nov): \`after\` is the
    // time of the last event handled, in milliseconds; a cursor that is not
    // a number is refused with a 400; the answer carries \`cursor\`. The 5 Nov
    // notes said the live route took an id - it never did.
    const said = new URLSearchParams(query ?? "").get("after") ?? "";
    if (said !== "" && !/^\d+$/.test(said)) return { ok: false, reason: "The TA System answered 400." };
    const after = said === "" ? 0 : Number(said);
    const events = EVENTS.filter((e) => e.at > after);
    return give({ events, cursor: events.length ? events[events.length - 1].at : after, nextCursor: String(events.length ? events[events.length - 1].at : after) });
  }
  // A write is accepted and nothing is kept. The stand-in cannot pretend to
  // have created an opening, but it must accept the write, or the outbox could
  // never be shown draining before the real API exists.
  if (method !== "GET") return give({ accepted: true, standIn: true });
  return { ok: false, reason: "The stand-in TA System has no answer for " + where + "." };
}
