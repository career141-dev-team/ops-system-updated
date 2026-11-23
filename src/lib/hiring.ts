/**
 * Internal hiring (v6 H1 and H2, 19 Nov): Career141's own vacancies and the people applying.
 *
 * The desk holds vacancies and applicants now (`opsVacancies`, `opsApplicants`), and `hiringView` reads them. The
 * invented `hiringSample` is used only on a laptop run with no real vacancy, to check the layout. Nothing here
 * saves anything: the writes are the actions in app/actions.ts.
 *
 * `hiringView` is the one place that reads the desk; everything below is pure.
 */
import { COLOMBO_OFFSET_MS, DAY } from "@/lib/calendar";
import { dayWord } from "@/lib/calendarBoard";
import { extensionOf, problemWithUpload } from "@/lib/files";

export type ApplicantStage = "new" | "call" | "fits" | "interview" | "decision" | "hired" | "rejected";

/** The columns of the board, left to right, with the words on them. */
export const BOARD_COLUMNS: { stage: ApplicantStage; label: string }[] = [
  { stage: "call", label: "To call" },
  { stage: "fits", label: "Called · fits" },
  { stage: "interview", label: "Interview" },
  { stage: "decision", label: "Decision" },
];

/** The panel a card's button opens, by the column it sits in. */
export const STAGE_ACTION: Partial<Record<ApplicantStage, { label: string; panel: "call" | "book-interview" | "add-result" | "decide" | "reject" }>> = {
  new: { label: "Call", panel: "call" },
  call: { label: "Call", panel: "call" },
  fits: { label: "Book an interview", panel: "book-interview" },
  interview: { label: "Add the result", panel: "add-result" },
  decision: { label: "Decide", panel: "decide" },
};

export interface Applicant {
  id: string;
  name: string;
  source: string;
  phone: string | null;
  stage: ApplicantStage;
  /** When the CV came, or the last step happened: how long they have waited counts from here. */
  since: number;
  /** The one line on the card ("CV came 18 Nov", "No answer 17 Nov · try 2 of 3"). */
  detail: string;
  /** Called and tried so far, of 3. */
  tries?: number;
  /** The kept CV file (22 Nov: hiring had nowhere to put one); null until someone adds it. */
  cvFileId?: string | null;
  /** Why they were rejected and the stage they were in then (23 Nov), so the rejected list can say which kind. */
  rejectReason?: string | null;
  rejectedAtStage?: string | null;
  /** What the later panels draw their messages from; absent until it is known. */
  draft?: { interviewAt?: number; interviewer?: string; place?: string; startDate?: string; salary?: string; replyBy?: string; interviewers?: string };
}

export interface Vacancy {
  id: string;
  title: string;
  places: number;
  filled: number;
  postedAt: number;
  status: "open" | "on_hold";
  /** On hold: since when, who restarts it, and the CVs kept meanwhile. */
  hold?: { since: number; who: string; keptCvs: number };
  applicants: Applicant[];
  /** The 6 things to check on the first call. */
  checks: string[];
  /** Who is free to interview and when, per round, as the team entered it. */
  freeTimes?: { who: string; round: string; times: number[] }[];
}

export interface InternalSlot {
  at: number;
  name: string;
  line: string;
}

export interface HiringView {
  vacancies: Vacancy[];
  slots: InternalSlot[];
  hiredThisMonth: { title: string; at: number }[];
}

export const EMPTY_HIRING: HiringView = { vacancies: [], slots: [], hiredThisMonth: [] };

/**
 * The view of internal hiring (19 Nov).
 *
 * Reads real `db.vacancies` and `db.applicants` when present; falls back to `sample` only when
 * no real vacancies exist yet (so dev preview and existing tests continue working cleanly).
 */
export function hiringView(db: unknown, sample: HiringView | null): HiringView {
  const snap = db as { vacancies?: import("@/data/types").OpsVacancy[]; applicants?: import("@/data/types").OpsApplicant[] } | null;
  if (snap?.vacancies && snap.vacancies.length > 0) {
    const apps = snap.applicants ?? [];
    const vacancies: Vacancy[] = snap.vacancies.map((v) => {
      const mine = apps.filter((a) => a.vacancyId === v.id);
      return {
        id: v.id,
        title: v.title,
        places: v.places,
        filled: v.filled,
        postedAt: v.postedAt,
        status: v.status,
        checks: v.checks,
        applicants: mine.map((a) => ({
          id: a.id,
          name: a.name,
          source: a.source,
          phone: a.phone,
          stage: a.stage,
          since: a.updatedAt,
          detail: a.detail,
          tries: a.tries,
          cvFileId: a.cvFileId,
          rejectReason: a.rejectReason,
          rejectedAtStage: a.rejectedAtStage ?? null,
          draft: {
            interviewAt: a.interviewAt ?? undefined,
            interviewer: a.interviewer ?? undefined,
            place: a.place ?? undefined,
            startDate: a.startDate ?? undefined,
            salary: a.salary ?? undefined,
          },
        })),
      };
    });
    const slots: InternalSlot[] = apps
      .filter((a) => a.stage === "interview" && a.interviewAt)
      .map((a) => {
        const v = snap.vacancies!.find((x) => x.id === a.vacancyId);
        return {
          at: a.interviewAt!,
          name: a.name,
          line: [v?.title, a.place, a.interviewer].filter(Boolean).join(" · "),
          vacancyId: a.vacancyId,
        };
      })
      .sort((a, b) => a.at - b.at);
    const hiredThisMonth = apps
      .filter((a) => a.stage === "hired")
      .map((a) => {
        const v = snap.vacancies!.find((x) => x.id === a.vacancyId);
        return { title: v?.title ?? a.name, at: a.updatedAt };
      });
    return { vacancies, slots, hiredThisMonth };
  }
  return sample ?? EMPTY_HIRING;
}

export function problemWithVacancy(title: string, places: number): string | null {
  if (title.trim().length < 2) return "Write the vacancy title.";
  if (!Number.isInteger(places) || places < 1 || places > 50) return "Places must be a whole number from 1 to 50.";
  return null;
}

export function problemWithApplicant(name: string, source: string): string | null {
  if (name.trim().length < 2) return "Write the applicant's full name.";
  if (!source.trim()) return "Say where this CV came from.";
  return null;
}

/** The most a CV may be (22 Nov). Below the 25 MB the file store allows: a CV is text; a bigger one is a scan. */
export const MAX_CV_BYTES = 10 * 1024 * 1024;

/** A CV is a document the team reads: PDF or Word, within the size above (22 Nov). */
export function problemWithCv(file: { name: string; size: number }): string | null {
  const ext = extensionOf(file.name);
  if (ext && ![".pdf", ".doc", ".docx"].includes(ext)) return "A CV must be a PDF or a Word file.";
  if (file.size > MAX_CV_BYTES) return "That CV is bigger than 10 MB. Save it smaller, or as a PDF, and add it again.";
  return problemWithUpload(file);
}

/** The name can lie; the first bytes cannot: %PDF, PK (docx) or D0CF11E0 (old .doc). */
export function problemWithCvBytes(bytes: Uint8Array): string | null {
  const is = (...b: number[]) => b.every((x, i) => bytes[i] === x);
  return is(0x25, 0x50, 0x44, 0x46) || is(0x50, 0x4b) || is(0xd0, 0xcf, 0x11, 0xe0) ? null : "That file is not a real PDF or Word file. Open it, save it again as a PDF, and add it again.";
}

/** The call result that closes the applicant without an interview (22 Nov, ops team: "can we reject without an interview?"). */
export const CALL_NOT_FIT = "Talked - not a fit";

/** Not a fit rejects, so it needs a reason like every other reject. */
export function problemWithHiringCall(result: string, note: string): string | null {
  if (result === CALL_NOT_FIT && note.trim().length < 4) return "Write the reason in the note before marking not a fit.";
  return null;
}

/**
 * "2026-11-22T10:45" typed on the form is Colombo time (22 Nov). It was read in the server's own
 * zone, so on a UTC server every interview was saved 5h30 late. (The exact "Sun 05:15" the team
 * reported was not reproduced.) NaN when it is not a date.
 */
export function colomboLocalToMs(typed: string): number {
  const t = typed.trim();
  return Date.parse(t + (/T\d\d:\d\d$/.test(t) ? ":00" : "") + "+05:30");
}

export function problemWithHiringDecision(decision: string, reason: string): string | null {
  if (!["hire", "hold", "reject"].includes(decision)) return "Pick Hire, Hold, or Reject.";
  if (decision === "reject" && reason.trim().length < 4) return "Write the reason before rejecting.";
  return null;
}

/**
 * Which kind of rejection it was (23 Nov): somebody turned away before an interview is a screening
 * reject, after it a final reject. A row from before the stage was kept has none, and counts as screening
 * only if it never reached an interview, which is all we can say.
 */
export type RejectKind = "screening" | "final";
export const REJECT_KIND_LABEL: Record<RejectKind, string> = { screening: "Screening reject", final: "Final reject" };

export function rejectKind(atStage: string | null | undefined): RejectKind {
  return atStage === "interview" || atStage === "decision" ? "final" : "screening";
}

/** The rejected people of a vacancy, split by kind, newest first. */
export function rejectedByKind(applicants: Applicant[]): Record<RejectKind, Applicant[]> {
  const out: Record<RejectKind, Applicant[]> = { screening: [], final: [] };
  for (const a of applicants.filter((x) => x.stage === "rejected").sort((x, y) => y.since - x.since)) {
    out[rejectKind(a.rejectedAtStage)].push(a);
  }
  return out;
}

export function countOf(v: Vacancy, stage: ApplicantStage): number {
  return v.applicants.filter((a) => a.stage === stage).length;
}

export function vacancyById(view: HiringView, id: string): Vacancy | null {
  return view.vacancies.find((v) => v.id === id) ?? null;
}

/** The CVs nobody has looked at, the calls to make (new and called-but-no-answer), the rest as they stand. */
export function totals(view: HiringView, now: number) {
  const open = view.vacancies.filter((v) => v.status === "open");
  const all = open.flatMap((v) => v.applicants);
  const toCallList = all.filter((a) => a.stage === "call" || a.stage === "new");
  const oldest = toCallList.length ? Math.max(...toCallList.map((a) => daysSince(a.since, now))) : 0;
  const interviews = all.filter((a) => a.stage === "interview");
  const monthStart = startOfMonth(now);
  const hired = view.hiredThisMonth.filter((h) => h.at >= monthStart).sort((a, b) => b.at - a.at);
  return {
    newCvs: all.filter((a) => a.stage === "new").length,
    newCvVacancies: open.filter((v) => countOf(v, "new") > 0).length,
    toCall: toCallList.length,
    oldestDays: oldest,
    interview: interviews.length,
    decision: all.filter((a) => a.stage === "decision").length,
    hiredThisMonth: hired.length,
    lastHire: hired[0] ?? null,
  };
}

/** Whole Colombo days from `from` to `to`, never negative. */
export function daysSince(from: number, to: number): number {
  const day = (t: number) => Math.floor((t + COLOMBO_OFFSET_MS) / DAY);
  return Math.max(0, day(to) - day(from));
}

function startOfMonth(now: number): number {
  const d = new Date(now + COLOMBO_OFFSET_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - COLOMBO_OFFSET_MS;
}

/** The dark card on the right of the vacancies: the one thing that stands, in a sentence. */
export function whereItStands(view: HiringView, now: number): { headline: string; body: string; open: { id: string; title: string } | null } {
  const t = totals(view, now);
  if (view.vacancies.length === 0) return { headline: "No vacancies yet.", body: "Add a vacancy and the people applying for it will wait here.", open: null };
  const open = view.vacancies.filter((v) => v.status === "open");
  const busiest = [...open].sort((a, b) => countOf(b, "call") + countOf(b, "new") - (countOf(a, "call") + countOf(a, "new")))[0] ?? null;
  const onHold = view.vacancies.filter((v) => v.status === "on_hold");
  const parts: string[] = [];
  if (busiest && t.toCall > 0) parts.push(`${countOf(busiest, "call") + countOf(busiest, "new")} of them applied for ${busiest.title}.`);
  if (t.decision > 0) parts.push(`${t.decision} ${t.decision === 1 ? "decision is" : "decisions are"} waiting for you.`);
  if (onHold.length) parts.push(`${onHold.map((v) => v.title).join(" and ")} ${onHold.length === 1 ? "is" : "are"} on hold.`);
  return {
    headline: t.toCall === 0 ? "Nobody waits for a call." : `${t.toCall} ${t.toCall === 1 ? "person waits" : "people wait"} for a call.`,
    body: parts.join(" "),
    open: busiest ? { id: busiest.id, title: busiest.title } : null,
  };
}

/** The "Why now" lines of a panel, from what is known. Only things that are true are said. */
export function whyNow(v: Vacancy, a: Applicant, now: number): string[] {
  const lines: string[] = [];
  const waited = daysSince(a.since, now);
  if (a.stage === "new" || a.stage === "call") {
    lines.push(`The CV came in on ${dayWord(a.since)}, through ${a.source}`);
    lines.push(a.tries ? `Try ${a.tries} of 3` : "Try 1 of 3. Nobody has called yet");
    if (v.checks.length) lines.push(`The role needs ${v.checks.length} things checked before an interview`);
  } else if (a.stage === "fits") {
    lines.push(`Called on ${dayWord(a.since)} and fits`);
    lines.push(waited === 0 ? "No interview time yet" : `Has waited ${waited} ${waited === 1 ? "day" : "days"} with no interview time yet`);
  } else if (a.stage === "interview") {
    lines.push(`Add this after the interview on ${dayWord(a.since)}`);
    lines.push("Add the result the same day so the next step is not lost");
  } else if (a.stage === "decision") {
    lines.push(`Waiting for a decision for ${waited} ${waited === 1 ? "day" : "days"}`);
  }
  lines.push(`${v.title} has ${v.places} ${v.places === 1 ? "place" : "places"} and ${v.filled === 0 ? "none is" : v.filled + " " + (v.filled === 1 ? "is" : "are")} filled`);
  return lines;
}

/** The words on the first line of a vacancy card: "2 places · 28 applicants · posted 3 Nov". */
export function vacancyLine(v: Vacancy): string {
  const places = `${v.places} ${v.places === 1 ? "place" : "places"}`;
  if (v.status === "on_hold" && v.hold) return `${places} · ${v.hold.keptCvs} CVs kept · on hold since ${dayWord(v.hold.since).slice(4)}`;
  return `${places} · ${v.applicants.length} applicants · posted ${dayWord(v.postedAt).slice(4)}`;
}

/** Drafts the team copies by hand. A draft is only made when every fact in it is known; otherwise null. */
export function inviteMessage(a: Applicant, role: string): string | null {
  const d = a.draft;
  if (!d?.interviewAt || !d.interviewer || !d.place) return null;
  const when = `${dayWord(d.interviewAt)} at ${new Date(d.interviewAt + COLOMBO_OFFSET_MS).toISOString().slice(11, 16)}`;
  return `Hello ${first(a.name)}, we would like to meet you for an interview for ${role}, with ${d.interviewer} on ${when} at ${d.place}. Please reply to confirm. Thank you`;
}

export function rejectMessage(a: Applicant, role: string, afterCall = false): string {
  return `Hello ${first(a.name)}, thank you for ${afterCall ? "speaking with us" : "meeting us"} for ${role}. We will not go further this time. We wish you well. Thank you`;
}

export function offerLetter(a: Applicant, role: string): string | null {
  const d = a.draft;
  if (!d?.startDate || !d.salary || !d.replyBy) return null;
  return `Dear ${first(a.name)}, we are pleased to offer you the post of ${role} at Career141, starting ${d.startDate}, at ${d.salary}. Please sign and return this letter by ${d.replyBy}. Thank you`;
}

export function first(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** The fields the real backend must hold; the screens' forms stay disabled until then. */
export const HIRING_BACKEND_GAPS = "vacancies, applicants, calls, interviews, results and decisions";
